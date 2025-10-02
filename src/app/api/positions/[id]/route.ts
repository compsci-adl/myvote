import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { positions } from '@/db/schema';

export async function GET(req: NextRequest) {
    // /api/positions/[id] - get positions by election id
    // Extract election id from URL
    const urlParts = req.url.split('/');
    const election_id = urlParts[urlParts.length - 1];
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const data = await db.select().from(positions).where(eq(positions.election_id, election_id));
    if (!data || data.length === 0) {
        return NextResponse.json({ error: 'No positions found for election' }, { status: 404 });
    }
    return NextResponse.json(data, { status: 200 });
}
