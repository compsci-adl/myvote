import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { ballots, positions } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/results?election_id=...
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Query ballots joined to positions, filter by election_id
    const data = await db
        .select({
            ballot: ballots,
            position: positions,
        })
        .from(ballots)
        .innerJoin(positions, eq(ballots.position, positions.id))
        .where(eq(positions.election_id, election_id));
    return NextResponse.json(data, { status: 200 });
}
