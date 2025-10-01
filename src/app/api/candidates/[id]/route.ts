// import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { candidates } from '@/db/schema';

export async function POST(req: NextRequest) {
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
    // Insert each candidate
    const results = [];
    for (const candidate of body) {
        if (!candidate.name) continue;
        const id = crypto.randomUUID();
        const { name, statement } = candidate;
        results.push(
            await db
                .insert(candidates)
                .values({
                    id,
                    election: election_id,
                    name,
                    statement,
                })
                .returning()
        );
    }
    return NextResponse.json(results.flat(), { status: 201 });
}
