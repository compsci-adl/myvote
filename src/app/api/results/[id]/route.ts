import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { ballots, candidatePositionLinks, candidates, positions } from '@/db/schema';
import { hareclarkWithTallies } from '@/utils/hareclark';

interface ResultCandidate {
    id: string;
    name: string;
    ranking: number;
    preferences_count: number;
    borda_points: number;
}
interface ResultPosition {
    position_id: string;
    position_name: string;
    winners: ResultCandidate[];
    candidates: ResultCandidate[];
    vacancies: number;
}

export async function GET(req: NextRequest) {
    // Expect /api/results/[id] where id is the election_id

    const session = await auth();
    if (!session?.user || !session.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let isAdmin = false;
    try {
        const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
        isAdmin = decodedToken?.realm_access?.roles?.includes('myvote-admin');
    } catch {
        isAdmin = false;
    }
    if (!isAdmin) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
    }
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
            // Elect top vacancies candidates as winners
            const elected = posCandidates.slice(0, pos.vacancies);
            pos.winners = elected.map((cand, idx) => ({
                id: cand.id,
                name: cand.name,
                ranking: idx + 1,
                preferences_count: 0,
                borda_points: 0,
            }));
            pos.candidates = posCandidates.map((cand, idx) => ({
                id: cand.id,
                name: cand.name,
                ranking: idx + 1,
                preferences_count: 0,
                borda_points: 0,
            }));
            continue;
        }
        // Always use hareclarkWithTallies with string IDs and ballots
        const candidateIds = posCandidates.map((c) => String(c.id));
        const ballots = pos.ballots.map((ballot) => ballot.map((cid) => String(cid)));
        const { elected, tallies } = hareclarkWithTallies(candidateIds, ballots, pos.vacancies);
        // Compute Borda scores
        const bordaScores: Record<string, number> = {};
        for (const ballot of pos.ballots) {
            for (let i = 0; i < ballot.length; i++) {
                const cid = ballot[i];
                bordaScores[cid] = (bordaScores[cid] || 0) + (ballot.length - i);
            }
        }
        // Winners first, then non-winners by Hare-Clark tallies desc, then name
        const winnerSet = new Set(elected.map((cid: string) => String(cid)));
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
                    // Sort by Hare-Clark tallies desc, then Borda desc, then name
                    const hcDiff = (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0);
                    if (hcDiff !== 0) return hcDiff;
                    const bordaDiff = (bordaScores[b.id] ?? 0) - (bordaScores[a.id] ?? 0);
                    if (bordaDiff !== 0) return bordaDiff;
                    return a.name.localeCompare(b.name);
                }),
        ];
        pos.candidates = sortedCandidates.map((cand, idx: number) => ({
            id: String(cand.id),
            name: cand.name,
            ranking: idx + 1,
            preferences_count: 0,
            total_points: tallies[cand.id] ?? 0,
            borda_points: bordaScores[cand.id] || 0,
        }));
        // Winners array (for UI)
        pos.winners = elected.map((cid: string, idx: number) => {
            const cidStr = String(cid);
            const cand = posCandidates.find((c) => String(c.id) === cidStr);
            return {
                id: cand ? String(cand.id) : cidStr,
                name: cand ? cand.name : cidStr,
                ranking: pos.candidates.find((c) => c.id === cidStr)?.ranking ?? idx + 1,
                preferences_count: 0,
                borda_points: bordaScores[cidStr] || 0,
            };
        });
        // Attach Hare-Clark tallies for debug
        // @ts-expect-error: attach for debug only
        pos.hareclarkTallies = tallies;
    }

    // Remove ballots, candidateIds from output
    const results: ResultPosition[] = Object.values(grouped).map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ ballots, candidateIds, ...rest }) => rest
    );
    return NextResponse.json({ results }, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Accept exclusions in the body: { exclusions: { [position_id]: string[] } }
    const { pathname } = new URL(req.url);
    const match = pathname.match(/\/api\/results\/(.+)$/);
    const election_id = match ? match[1] : null;
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    const exclusions: Record<string, string[]> = body.exclusions || {};
    const manualOverrides: Record<string, string[]> = body.manualOverrides || {};

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

    // Helper to run Hare-Clark for all positions with current exclusions
    function runAllHareClark(
        groupedObj: typeof grouped,
        exclusionsObj: Record<string, string[]>,
        manualOverridesObj: Record<string, string[]>
    ) {
        for (const pos of Object.values(groupedObj)) {
            let posCandidates = allCandidates.filter((cand) => pos.candidateIds.includes(cand.id));
            const excluded = exclusionsObj[pos.position_id] || [];
            posCandidates = posCandidates.filter((cand) => !excluded.includes(cand.id));
            if (posCandidates.length === 0) {
                pos.winners = [];
                pos.candidates = [];
                continue;
            }
            const manual = manualOverridesObj[pos.position_id];
            if (manual && manual.length > 0) {
                // Manual override: still compute points, but set winners manually
                if (pos.ballots.length === 0) {
                    // No points
                    const winnerCands = manual
                        .map((id) => posCandidates.find((c) => c.id === id))
                        .filter(Boolean) as typeof posCandidates;
                    pos.winners = winnerCands.map((cand, idx) => ({
                        id: cand.id,
                        name: cand.name,
                        ranking: idx + 1,
                        preferences_count: 0,
                        borda_points: 0,
                    }));
                    const sortedCandidates = [
                        ...winnerCands,
                        ...posCandidates
                            .filter((c) => !manual.includes(c.id))
                            .sort((a, b) => a.name.localeCompare(b.name)),
                    ];
                    pos.candidates = sortedCandidates.map((cand, idx: number) => ({
                        id: cand.id,
                        name: cand.name,
                        ranking: idx + 1,
                        preferences_count: 0,
                        total_points: 0,
                        borda_points: 0,
                    }));
                    continue;
                }
                const candidateIds = posCandidates.map((c) => String(c.id));
                const ballots = pos.ballots.map((ballot) =>
                    ballot.filter((cid) => !excluded.includes(cid)).map((cid) => String(cid))
                );
                const { tallies } = hareclarkWithTallies(candidateIds, ballots, pos.vacancies);
                const bordaScores: Record<string, number> = {};
                for (const ballot of pos.ballots) {
                    for (let i = 0; i < ballot.length; i++) {
                        const cid = ballot[i];
                        bordaScores[cid] = (bordaScores[cid] || 0) + (ballot.length - i);
                    }
                }
                // Manual winners
                const winnerCands = manual
                    .map((id) => posCandidates.find((c) => c.id === id))
                    .filter(Boolean) as typeof posCandidates;
                pos.winners = winnerCands.map((cand, idx) => ({
                    id: cand.id,
                    name: cand.name,
                    ranking: idx + 1,
                    preferences_count: 0,
                    borda_points: bordaScores[cand.id] || 0,
                }));
                const sortedCandidates = [
                    ...winnerCands,
                    ...posCandidates
                        .filter((c) => !manual.includes(c.id))
                        .sort((a, b) => {
                            // Sort by Hare-Clark tallies desc, then Borda desc, then name
                            const hcDiff = (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0);
                            if (hcDiff !== 0) return hcDiff;
                            const bordaDiff = (bordaScores[b.id] ?? 0) - (bordaScores[a.id] ?? 0);
                            if (bordaDiff !== 0) return bordaDiff;
                            return a.name.localeCompare(b.name);
                        }),
                ];
                pos.candidates = sortedCandidates.map((cand, idx: number) => ({
                    id: String(cand.id),
                    name: cand.name,
                    ranking: idx + 1,
                    preferences_count: 0,
                    total_points: tallies[cand.id] ?? 0,
                    borda_points: bordaScores[cand.id] || 0,
                }));
                // @ts-expect-error: attach for debug only
                pos.hareclarkTallies = tallies;
                continue;
            }
            if (pos.ballots.length === 0) {
                // Elect top vacancies candidates as winners
                const elected = posCandidates.slice(0, pos.vacancies);
                pos.winners = elected.map((cand, idx) => ({
                    id: cand.id,
                    name: cand.name,
                    ranking: idx + 1,
                    preferences_count: 0,
                    borda_points: 0,
                }));
                pos.candidates = posCandidates.map((cand, idx) => ({
                    id: cand.id,
                    name: cand.name,
                    ranking: idx + 1,
                    preferences_count: 0,
                    total_points: 0,
                    borda_points: 0,
                }));
                continue;
            }
            const candidateIds = posCandidates.map((c) => String(c.id));
            const ballots = pos.ballots.map((ballot) =>
                ballot.filter((cid) => !excluded.includes(cid)).map((cid) => String(cid))
            );
            const { elected, tallies } = hareclarkWithTallies(candidateIds, ballots, pos.vacancies);
            const bordaScores: Record<string, number> = {};
            for (const ballot of pos.ballots) {
                for (let i = 0; i < ballot.length; i++) {
                    const cid = ballot[i];
                    bordaScores[cid] = (bordaScores[cid] || 0) + (ballot.length - i);
                }
            }
            const winnerSet = new Set(elected.map((cid: string) => String(cid)));
            const sortedCandidates = [
                ...posCandidates
                    .filter((c) => winnerSet.has(String(c.id)))
                    .sort((a, b) => {
                        return elected.indexOf(String(a.id)) - elected.indexOf(String(b.id));
                    }),
                ...posCandidates
                    .filter((c) => !winnerSet.has(String(c.id)))
                    .sort((a, b) => {
                        // Sort by Hare-Clark tallies desc, then Borda desc, then name
                        const hcDiff = (tallies[b.id] ?? 0) - (tallies[a.id] ?? 0);
                        if (hcDiff !== 0) return hcDiff;
                        const bordaDiff = (bordaScores[b.id] ?? 0) - (bordaScores[a.id] ?? 0);
                        if (bordaDiff !== 0) return bordaDiff;
                        return a.name.localeCompare(b.name);
                    }),
            ];
            pos.candidates = sortedCandidates.map((cand, idx: number) => ({
                id: String(cand.id),
                name: cand.name,
                ranking: idx + 1,
                preferences_count: 0,
                total_points: tallies[cand.id] ?? 0,
                borda_points: bordaScores[cand.id] || 0,
            }));
            pos.winners = elected.map((cid: string, idx: number) => {
                const cidStr = String(cid);
                const cand = posCandidates.find((c) => String(c.id) === cidStr);
                return {
                    id: cand ? String(cand.id) : cidStr,
                    name: cand ? cand.name : cidStr,
                    ranking: pos.candidates.find((c) => c.id === cidStr)?.ranking ?? idx + 1,
                    preferences_count: 0,
                    borda_points: bordaScores[cidStr] || 0,
                };
            });
            // @ts-expect-error: attach for debug only
            pos.hareclarkTallies = tallies;
        }
    }

    // Iteratively enforce that no candidate is a winner in more than one position
    let changed = true;
    let maxLoops = 10; // prevent infinite loop
    while (changed && maxLoops-- > 0) {
        runAllHareClark(grouped, exclusions, manualOverrides);
        // Find candidates who are winners in multiple positions
        const winnerMap: Record<string, string[]> = {};
        for (const pos of Object.values(grouped)) {
            for (const winner of pos.winners) {
                if (!winnerMap[winner.id]) winnerMap[winner.id] = [];
                winnerMap[winner.id].push(pos.position_id);
            }
        }
        // Find any candidate who is a winner in more than one position
        const multiWinners = Object.entries(winnerMap).filter(([, posIds]) => posIds.length > 1);
        if (multiWinners.length === 0) {
            changed = false;
            break;
        }
        // For each such candidate, keep them only in the first position, exclude from others
        for (const [candId, posIds] of multiWinners) {
            // Keep in the first position, exclude from the rest
            for (let i = 1; i < posIds.length; ++i) {
                if (!exclusions[posIds[i]]) exclusions[posIds[i]] = [];
                if (!exclusions[posIds[i]].includes(candId)) exclusions[posIds[i]].push(candId);
            }
        }
    }

    // Remove ballots, candidateIds from output
    const results: ResultPosition[] = Object.values(grouped).map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ ballots, candidateIds, ...rest }) => rest
    );
    return NextResponse.json({ results }, { status: 200 });
}
