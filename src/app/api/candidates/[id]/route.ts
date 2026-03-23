import { sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { candidates } from '@/db/schema';


export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // POST /api/candidates/[election_id] - add candidates for election
    const urlParts = req.url.split('/');
    const election_id = urlParts[urlParts.length - 1];
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Body must be an array of candidates' }, { status: 400 });
    }
    // Batch insert/upsert for performance and reliability
    const BATCH_SIZE = 20;
    const allResults = [];
    try {
        for (let i = 0; i < body.length; i += BATCH_SIZE) {
            const batch = body
                .slice(i, i + BATCH_SIZE)
                .filter((candidate) => candidate && candidate.name);
            if (batch.length === 0) continue;

            // Process each candidate individually to handle insert/update
            for (const candidate of batch) {
                try {
                    // Try to find existing candidate by name and election
                    const { eq } = await import('drizzle-orm');
                    const existing = await db
                        .select()
                        .from(candidates)
                        .where(
                            sql`name = ${candidate.name} AND election = ${election_id}`
                        )
                        .limit(1);

                    if (existing && existing.length > 0) {
                        // Update existing candidate's statement
                        const updated = await db
                            .update(candidates)
                            .set({
                                statement: candidate.statement || existing[0].statement,
                            })
                            .where(sql`name = ${candidate.name} AND election = ${election_id}`)
                            .returning();
                        allResults.push(updated[0] || existing[0]);
                    } else {
                        // Create new candidate
                        const inserted = await db
                            .insert(candidates)
                            .values({
                                id: crypto.randomUUID(),
                                election: election_id,
                                name: candidate.name,
                                statement: candidate.statement,
                            })
                            .returning();
                        allResults.push(...inserted);
                    }
                } catch (err) {
                    // If error is due to unique constraint, fetch and return existing
                    if (String(err).includes('UNIQUE')) {
                        const { eq } = await import('drizzle-orm');
                        const existing = await db
                            .select()
                            .from(candidates)
                            .where(
                                sql`name = ${candidate.name} AND election = ${election_id}`
                            )
                            .limit(1);
                        if (existing && existing.length > 0) {
                            allResults.push(existing[0]);
                        }
                    } else {
                        throw err;
                    }
                }
            }
        }
        return NextResponse.json(allResults, { status: 201 });
    } catch (err) {
        console.error('Failed to insert candidates:', err);
        return NextResponse.json(
            { error: 'Failed to insert candidates', details: String(err) },
            { status: 500 }
        );
    }
}
