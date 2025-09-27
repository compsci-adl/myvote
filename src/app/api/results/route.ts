import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';

export async function GET(req: NextRequest) {
    // Expect /api/results?election_id=...
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Query results from sqlite db using drizzle
    const data = await db.query.results.findMany({
        where: { election: election_id },
    });
    return NextResponse.json(data, { status: 200 });
}
