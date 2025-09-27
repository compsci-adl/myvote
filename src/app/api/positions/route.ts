import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { positions } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/positions?election_id=...
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Query positions from sqlite db using drizzle
    const data = await db.select().from(positions).where(eq(positions.election_id, election_id));
    return NextResponse.json({ positions: data }, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Expect /api/positions?election_id=...
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    // Ensure required fields and generate id if missing
    const id = body.id ?? crypto.randomUUID();
    const { name, vacancies, description, executive } = body;
    if (!name || vacancies == null || !description || executive == null) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const [position] = await db
        .insert(positions)
        .values({
            id,
            name,
            vacancies,
            description,
            executive,
            election_id: election_id,
        })
        .returning();
    return NextResponse.json(position, { status: 201 });
}
