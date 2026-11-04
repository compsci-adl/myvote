import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { db } from '@/db/index';
import {
    ballots,
    candidatePositionLinks,
    candidates,
    positions,
} from '@/db/schema';
import type { PositionResult } from '@/types/position-result';
import { hareclarkWithTallies } from '@/utils/hareclark';
import { compareResultPositions } from '@/utils/position-order';

const confirmationSchema = z.object({
    confirmedPositions: z.array(z.string()),
    manualOverrides: z.record(z.string(), z.array(z.string())),
});
type Confirmation = z.infer<typeof confirmationSchema>;

class InvalidConfirmation extends Error {}

function parseConfirmation(body: unknown): Confirmation {
    const parsed = confirmationSchema.safeParse(body);
    if (!parsed.success) {
        throw new InvalidConfirmation(
            'Expected confirmedPositions and manualOverrides.',
        );
    }
    const { confirmedPositions } = parsed.data;
    if (new Set(confirmedPositions).size !== confirmedPositions.length) {
        throw new InvalidConfirmation('Duplicate confirmed position IDs.');
    }
    const manualOverrides: Record<string, string[]> = Object.create(null);
    for (const [positionId, selection] of Object.entries(
        parsed.data.manualOverrides,
    )) {
        if (
            !confirmedPositions.includes(positionId) ||
            new Set(selection).size !== selection.length
        ) {
            throw new InvalidConfirmation(
                'Invalid manual override for a confirmed position.',
            );
        }
        manualOverrides[positionId] = selection;
    }
    return { confirmedPositions, manualOverrides };
}

async function authorize() {
    const session = await auth();
    if (!session?.user || !session.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let isAdmin = false;
    try {
        const decodedToken = JSON.parse(
            atob(session.accessToken.split('.')[1]),
        );
        isAdmin =
            decodedToken?.realm_access?.roles?.includes('myvote-admin') ===
            true;
    } catch {
        isAdmin = false;
    }
    return isAdmin
        ? null
        : NextResponse.json(
              { error: 'Admin privileges required.' },
              { status: 403 },
          );
}

async function calculateResults(
    electionId: string,
    confirmation: Confirmation,
) {
    const [allPositions, allCandidates, allLinks, ballotRows] =
        await Promise.all([
            db
                .select()
                .from(positions)
                .where(eq(positions.election, electionId)),
            db
                .select()
                .from(candidates)
                .where(eq(candidates.election, electionId)),
            db.select().from(candidatePositionLinks),
            db
                .select({ ballot: ballots, position: positions })
                .from(ballots)
                .innerJoin(positions, eq(ballots.position, positions.id))
                .where(eq(positions.election, electionId)),
        ]);
    const orderedPositions = allPositions
        .map((position) => ({
            position_id: position.id,
            position_name: position.name,
            executive: position.executive,
            vacancies: position.vacancies,
        }))
        .sort(compareResultPositions);
    const { confirmedPositions, manualOverrides } = confirmation;
    if (
        confirmedPositions.some(
            (id, index) => orderedPositions[index]?.position_id !== id,
        )
    ) {
        throw new InvalidConfirmation(
            'Confirmed positions must be an ordered prefix of the results.',
        );
    }

    const candidatesById = new Map(
        allCandidates.map((candidate) => [candidate.id, candidate]),
    );
    const nomineesByPosition = new Map<string, Set<string>>();
    for (const link of allLinks) {
        if (!candidatesById.has(link.candidate_id)) continue;
        let nominees = nomineesByPosition.get(link.position_id);
        if (!nominees) {
            nominees = new Set();
            nomineesByPosition.set(link.position_id, nominees);
        }
        nominees.add(link.candidate_id);
    }
    const ballotsByPosition = new Map<string, string[][]>();
    for (const { ballot } of ballotRows) {
        const nominees = nomineesByPosition.get(ballot.position);
        const preferences = Array.isArray(ballot.preferences)
            ? ballot.preferences.filter(
                  (id): id is string =>
                      typeof id === 'string' && nominees?.has(id) === true,
              )
            : [];
        let positionBallots = ballotsByPosition.get(ballot.position);
        if (!positionBallots) {
            positionBallots = [];
            ballotsByPosition.set(ballot.position, positionBallots);
        }
        positionBallots.push(preferences);
    }

    const confirmedWinners = new Set<string>();
    const results: PositionResult[] = [];
    for (const [index, position] of orderedPositions.entries()) {
        const nominees =
            nomineesByPosition.get(position.position_id) ?? new Set<string>();
        const positionCandidates = [...nominees]
            .sort((a, b) => a.localeCompare(b))
            .map((id) => candidatesById.get(id)!);
        const originalBallots =
            ballotsByPosition.get(position.position_id) ?? [];
        // Each replay starts with original preferences. Hare-Clark reverses its input arrays.
        const eligibleBallots = originalBallots
            .map((ballot) => ballot.filter((id) => !confirmedWinners.has(id)))
            .filter((ballot) => ballot.length > 0);
        const supportedIds = new Set(eligibleBallots.flat());
        const eligibleIds = positionCandidates
            .filter((candidate) => supportedIds.has(candidate.id))
            .map((candidate) => candidate.id);
        const { elected, tallies } =
            position.vacancies > 0 && eligibleIds.length > 0
                ? hareclarkWithTallies(
                      eligibleIds,
                      eligibleBallots,
                      position.vacancies,
                  )
                : { elected: [], tallies: {} as Record<string, number> };
        const manual = Object.prototype.hasOwnProperty.call(
            manualOverrides,
            position.position_id,
        )
            ? manualOverrides[position.position_id]
            : undefined;
        if (
            manual !== undefined &&
            (manual.length > position.vacancies ||
                manual.some(
                    (id) => !nominees.has(id) || confirmedWinners.has(id),
                ))
        ) {
            throw new InvalidConfirmation(
                `Invalid manual winners for ${position.position_name}.`,
            );
        }
        // An explicit empty override leaves the office vacant; an absent one uses Hare-Clark.
        const winnerIds = manual ?? elected;
        const isConfirmed = index < confirmedPositions.length;
        if (isConfirmed && winnerIds.length > position.vacancies) {
            throw new InvalidConfirmation(
                `Resolve the tied winners for ${position.position_name} before confirming.`,
            );
        }
        const winnerOrder = new Map(winnerIds.map((id, rank) => [id, rank]));
        const bordaScores = new Map<string, number>();
        for (const ballot of originalBallots) {
            for (const [rank, id] of ballot.entries()) {
                bordaScores.set(
                    id,
                    (bordaScores.get(id) ?? 0) + ballot.length - rank,
                );
            }
        }
        positionCandidates.sort((a, b) => {
            const aWinner = winnerOrder.get(a.id);
            const bWinner = winnerOrder.get(b.id);
            if (aWinner !== undefined || bWinner !== undefined) {
                return (aWinner ?? Infinity) - (bWinner ?? Infinity);
            }
            return (
                Number(confirmedWinners.has(a.id)) -
                    Number(confirmedWinners.has(b.id)) ||
                (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0) ||
                (bordaScores.get(b.id) ?? 0) - (bordaScores.get(a.id) ?? 0) ||
                a.name.localeCompare(b.name) ||
                a.id.localeCompare(b.id)
            );
        });
        const resultCandidates = positionCandidates.map((candidate, rank) => ({
            id: candidate.id,
            name: candidate.name,
            ranking: rank + 1,
            total_points: tallies[candidate.id] ?? 0,
            borda_points: bordaScores.get(candidate.id) ?? 0,
            excluded: confirmedWinners.has(candidate.id),
        }));
        results.push({
            ...position,
            candidates: resultCandidates,
            winners: resultCandidates.filter((candidate) =>
                winnerOrder.has(candidate.id),
            ),
        });
        // Provisional officeholders never disqualify nominees in subsequent offices.
        if (isConfirmed) {
            for (const id of winnerIds) confirmedWinners.add(id);
        }
    }
    return results;
}

async function respond(req: NextRequest, confirm: boolean) {
    const unauthorized = await authorize();
    if (unauthorized) return unauthorized;

    const match = new URL(req.url).pathname.match(
        /\/api\/results\/([^/]+)\/?$/,
    );
    if (!match) {
        return NextResponse.json(
            { error: 'Missing election_id' },
            { status: 400 },
        );
    }
    try {
        let confirmation: Confirmation = {
            confirmedPositions: [],
            manualOverrides: {},
        };
        if (confirm) {
            let body: unknown;
            try {
                body = await req.json();
            } catch {
                throw new InvalidConfirmation('Invalid JSON body.');
            }
            confirmation = parseConfirmation(body);
        }
        const results = await calculateResults(match[1], confirmation);
        return NextResponse.json({ results }, { status: 200 });
    } catch (error) {
        if (error instanceof InvalidConfirmation) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
    }
}

export async function GET(req: NextRequest) {
    return respond(req, false);
}

export async function POST(req: NextRequest) {
    return respond(req, true);
}
