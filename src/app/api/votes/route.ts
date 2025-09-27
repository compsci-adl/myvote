import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';

export async function GET(req: NextRequest) {
    // Expect /api/votes?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Query votes from sqlite db using drizzle
    const data = await db.query.votes.findMany({
        where: { election: election_id },
    });
    return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Expect /api/votes?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    // Insert vote into sqlite db using drizzle
    const vote = await db
        .insertInto('votes')
        .values({
            ...body,
            election: election_id,
        })
        .returning();
    return NextResponse.json(vote, { status: 201 });
}
