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
    // Batch insert for performance and reliability
    const BATCH_SIZE = 20;
    const allResults = [];
    try {
        for (let i = 0; i < body.length; i += BATCH_SIZE) {
            const batch = body
                .slice(i, i + BATCH_SIZE)
                .filter((candidate) => candidate && candidate.name)
                .map((candidate) => ({
                    id: crypto.randomUUID(),
                    election: election_id,
                    name: candidate.name,
                    statement: candidate.statement,
                }));
            if (batch.length === 0) continue;
            const inserted = await db.insert(candidates).values(batch).returning();
            allResults.push(...inserted);
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
