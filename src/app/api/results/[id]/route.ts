import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { ballots, candidates, positions } from '@/db/schema';

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

    // Group by position, include vacancies
    const grouped: Record<string, ResultPosition & { vacancies: number }> = {};
    for (const row of data) {
        const posId = row.position.id as string;
        if (!grouped[posId]) {
            grouped[posId] = {
                position_id: posId,
                position_name: row.position.name,
                winners: [],
                candidates: [],
                vacancies: row.position.vacancies,
            };
        }
        // Parse preferences (array of candidate ids)
        const preferences: string[] = Array.isArray(row.ballot.preferences)
            ? row.ballot.preferences
            : [];
        preferences.forEach((candidateId, idx) => {
            const candidateObj = allCandidates.find((cand) => cand.id === candidateId);
            const candidateName = candidateObj ? candidateObj.name : candidateId;
            const existing = grouped[posId].candidates.find((c) => c.id === candidateId);
            if (!existing) {
                grouped[posId].candidates.push({
                    id: candidateId,
                    name: candidateName,
                    ranking: idx + 1,
                    preferences_count: 1,
                });
            } else {
                existing.preferences_count += 1;
            }
        });
    }
    // Compute winners (top N by preference_count, N = vacancies)
    for (const pos of Object.values(grouped)) {
        if (pos.candidates.length > 0) {
            // Sort by preference_count desc, then by name for tie-breaker
            const sorted = [...pos.candidates].sort((a, b) => {
                if (b.preferences_count !== a.preferences_count) {
                    return b.preferences_count - a.preferences_count;
                }
                return a.name.localeCompare(b.name);
            });
            pos.winners = sorted.slice(0, pos.vacancies);
        } else {
            pos.winners = [];
        }
    }
    // Remove vacancies from output
    const results: ResultPosition[] = Object.values(grouped).map(({ vacancies, ...rest }) => rest);
    return NextResponse.json({ results }, { status: 200 });
}
