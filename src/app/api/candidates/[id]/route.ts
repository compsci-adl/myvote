import { eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { candidatePositionLinks, candidates, positions } from '@/db/schema';
import { serverCache } from '@/lib/server-cache';

const CHUNK_SIZE = 100;

interface CandidateInput {
    name: string;
    statement: string | null;
    nominations: Set<string>;
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const election_id = new URL(req.url).pathname.split('/').filter(Boolean).pop();
    if (!election_id || !/^[a-zA-Z0-9_-]+$/.test(election_id)) {
        return NextResponse.json({ error: 'Missing or invalid election_id' }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Body must be an array of candidates' }, { status: 400 });
    }

    const byName = new Map<string, CandidateInput>();
    for (const candidate of body) {
        if (
            !candidate ||
            typeof candidate.name !== 'string' ||
            candidate.name.trim().length === 0
        ) {
            continue;
        }

        const name = candidate.name.trim();
        const existing = byName.get(name) ?? {
            name,
            statement: null,
            nominations: new Set<string>(),
        };
        if (typeof candidate.statement === 'string' && candidate.statement.trim()) {
            existing.statement = candidate.statement;
        }
        if (Array.isArray(candidate.nominations)) {
            for (const role of candidate.nominations) {
                if (typeof role === 'string' && role.trim()) {
                    existing.nominations.add(role.trim());
                }
            }
        }
        byName.set(name, existing);
    }
    const rows = [...byName.values()];

    try {
        const electionPositions = await db
            .select({ id: positions.id, name: positions.name })
            .from(positions)
            .where(eq(positions.election, election_id));
        const positionIdsByName = new Map<string, string[]>();
        for (const position of electionPositions) {
            const key = position.name.trim().toLowerCase();
            positionIdsByName.set(key, [...(positionIdsByName.get(key) ?? []), position.id]);
        }

        const positionByRole = new Map<string, string>();
        for (const candidate of rows) {
            for (const role of candidate.nominations) {
                const matches = positionIdsByName.get(role.toLowerCase()) ?? [];
                if (matches.length !== 1) {
                    return NextResponse.json(
                        {
                            error:
                                matches.length === 0
                                    ? `Position "${role}" was not found for this election`
                                    : `Position "${role}" is ambiguous for this election`,
                        },
                        { status: 400 }
                    );
                }
                positionByRole.set(role.toLowerCase(), matches[0]);
            }
        }

        const savedCandidates = await db.transaction(async (tx) => {
            const results = [];
            for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
                const chunk = rows.slice(i, i + CHUNK_SIZE).map((candidate) => ({
                    id: crypto.randomUUID(),
                    election: election_id,
                    name: candidate.name,
                    statement: candidate.statement,
                }));
                const saved = await tx
                    .insert(candidates)
                    .values(chunk)
                    .onConflictDoUpdate({
                        target: [candidates.name, candidates.election],
                        set: {
                            statement: sql`coalesce(excluded.statement, ${candidates.statement})`,
                        },
                    })
                    .returning();
                results.push(...saved);
            }

            const candidateIdsByName = new Map(
                results.map((candidate) => [candidate.name, candidate.id])
            );
            const links = rows.flatMap((candidate) => {
                const candidateId = candidateIdsByName.get(candidate.name);
                if (!candidateId) {
                    throw new Error(`Candidate ID missing after insert for ${candidate.name}`);
                }
                return [...candidate.nominations].map((role) => {
                    const positionId = positionByRole.get(role.toLowerCase());
                    if (!positionId) {
                        throw new Error(`Position ID missing after validation for "${role}"`);
                    }
                    return { candidate_id: candidateId, position_id: positionId };
                });
            });
            for (let i = 0; i < links.length; i += CHUNK_SIZE) {
                await tx
                    .insert(candidatePositionLinks)
                    .values(links.slice(i, i + CHUNK_SIZE))
                    .onConflictDoNothing();
            }
            return results;
        });

        if (rows.some((candidate) => candidate.nominations.size > 0)) {
            serverCache.clearPattern(/^candidate-position-links:/);
        }
        return NextResponse.json(savedCandidates, { status: 201 });
    } catch (err) {
        console.error('Failed to insert candidates:', err);
        return NextResponse.json({ error: 'Failed to insert candidates' }, { status: 500 });
    }
}
