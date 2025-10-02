import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { ballots, candidatePositionLinks, candidates, positions } from '@/db/schema';
import { hareclark } from '@/utils/hareclark';

interface ResultCandidate {
    id: string;
    name: string;
    ranking: number;
    preferences_count: number;
}

interface ResultPosition {
    position_id: string;
    position_name: string;
    winners: ResultCandidate[];
    candidates: ResultCandidate[];
}

export async function GET(req: NextRequest) {
    // Expect /api/results/[id] where id is the election_id
    const { pathname } = new URL(req.url);
    // pathname: /api/results/[id]
    const match = pathname.match(/\/api\/results\/(.+)$/);
    const election_id = match ? match[1] : null;
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Get all ballots for this election, joined with positions
    const data = await db
        .select({
            ballot: ballots,
            position: positions,
        })
        .from(ballots)
        .innerJoin(positions, eq(ballots.position, positions.id))
        .where(eq(positions.election_id, election_id));

    // Get all candidates for this election
    const allCandidates = await db
        .select()
        .from(candidates)
        .where(eq(candidates.election, election_id));

    // Get all candidate-position links for this election
    const allLinks = await db.select().from(candidatePositionLinks);

    // Group ballots by position
    const grouped: Record<
        string,
        ResultPosition & { vacancies: number; ballots: string[][]; candidateIds: string[] }
    > = {};
    for (const row of data) {
        const posId = row.position.id as string;
        if (!grouped[posId]) {
            // Only include candidates who have nominated for this position
            const posCandidateIds = allLinks
                .filter((link) => link.position_id === posId)
                .map((link) => link.candidate_id);
            const posCandidates = allCandidates.filter((cand) => posCandidateIds.includes(cand.id));
            grouped[posId] = {
                position_id: posId,
                position_name: row.position.name,
                winners: [],
                candidates: [],
                vacancies: row.position.vacancies,
                ballots: [],
                candidateIds: posCandidates.map((c) => c.id),
            };
        }
        // Parse preferences (array of candidate ids)
        const preferences: string[] = Array.isArray(row.ballot.preferences)
            ? row.ballot.preferences
            : [];
        grouped[posId].ballots.push(preferences);
    }

    // For each position, run Hare-Clarke STV
    for (const pos of Object.values(grouped)) {
        // Only include candidates who are actually running for this position
        const posCandidates = allCandidates.filter((cand) => pos.candidateIds.includes(cand.id));
        // If no candidates, skip
        if (posCandidates.length === 0) {
            pos.winners = [];
            pos.candidates = [];
            continue;
        }
        // If no ballots, elect no one
        if (pos.ballots.length === 0) {
            pos.winners = [];
            pos.candidates = posCandidates.map((cand, idx) => ({
                id: cand.id,
                name: cand.name,
                ranking: idx + 1,
                preferences_count: 0,
            }));
            continue;
        }
        // Always use hareclark with string IDs and ballots
        const candidateIds = posCandidates.map((c) => String(c.id));
        const ballots = pos.ballots.map((ballot) => ballot.map((cid) => String(cid)));
        const elected = hareclark(candidateIds, ballots, pos.vacancies);
        // Borda count (raw points) for each candidate
        const bordaPoints: Record<string, number> = {};
        for (const cand of posCandidates) bordaPoints[cand.id] = 0;
        for (const ballot of pos.ballots) {
            const n = ballot.length;
            for (let i = 0; i < ballot.length; ++i) {
                const cid = ballot[i];
                if (bordaPoints[cid] !== undefined) {
                    bordaPoints[cid] += n - i;
                }
            }
        }
        // Winners first, then non-winners by Borda points desc, then name
        const winnerSet = new Set(elected.map((cid) => String(cid)));
        const sortedCandidates = [
            ...posCandidates
                .filter((c) => winnerSet.has(String(c.id)))
                .sort((a, b) => {
                    // Sort by winner order
                    return elected.indexOf(String(a.id)) - elected.indexOf(String(b.id));
                }),
            ...posCandidates
                .filter((c) => !winnerSet.has(String(c.id)))
                .sort((a, b) => {
                    // Sort by Borda points desc, then name
                    const diff = (bordaPoints[b.id] ?? 0) - (bordaPoints[a.id] ?? 0);
                    if (diff !== 0) return diff;
                    return a.name.localeCompare(b.name);
                }),
        ];
        pos.candidates = sortedCandidates.map((cand, idx) => ({
            id: String(cand.id),
            name: cand.name,
            ranking: idx + 1,
            preferences_count: 0,
            total_points: bordaPoints[cand.id] ?? 0,
        }));
        // Winners array (for UI)
        pos.winners = elected.map((cid, idx) => {
            const cidStr = String(cid);
            const cand = posCandidates.find((c) => String(c.id) === cidStr);
            return {
                id: cand ? String(cand.id) : cidStr,
                name: cand ? cand.name : cidStr,
                ranking: pos.candidates.find((c) => c.id === cidStr)?.ranking ?? idx + 1,
                preferences_count: 0,
            };
        });
        // Attach Borda points for debug
        // @ts-expect-error: attach for debug only
        pos.bordaPoints = bordaPoints;
    }

    // Remove vacancies, ballots, candidateIds from output
    const results: ResultPosition[] = Object.values(grouped).map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ vacancies, ballots, candidateIds, ...rest }) => rest
    );
    return NextResponse.json({ results }, { status: 200 });
}
