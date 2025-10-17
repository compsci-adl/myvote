import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { positions } from '@/db/schema';
import { isMember } from '@/utils/is-member';

export async function GET(req: NextRequest) {
    // Expect /api/positions?election_id=...
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (
        !election_id ||
        typeof election_id !== 'string' ||
        election_id.length < 3 ||
        !/^[a-zA-Z0-9_-]+$/.test(election_id)
    ) {
        return NextResponse.json({ error: 'Invalid or missing election_id' }, { status: 400 });
    }
    try {
        // Query positions from sqlite db using drizzle
        const data = await db
            .select()
            .from(positions)
            .where(eq(positions.election_id, election_id));
        // Only return minimal position info
        const positionInfo = data.map(({ id, name, description, vacancies, executive }) => ({
            id,
            name,
            description,
            vacancies,
            executive,
        }));
        return NextResponse.json({ positions: positionInfo }, { status: 200 });
    } catch (err) {
        console.error('Positions GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Expect /api/positions?election_id=...
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (
        !election_id ||
        typeof election_id !== 'string' ||
        election_id.length < 3 ||
        !/^[a-zA-Z0-9_-]+$/.test(election_id)
    ) {
        return NextResponse.json({ error: 'Invalid or missing election_id' }, { status: 400 });
    }
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    // Ensure required fields and generate id if missing
    const id =
        body.id && typeof body.id === 'string' && body.id.length > 3
            ? body.id
            : crypto.randomUUID();
    const { name, vacancies, description, executive } = body;
    if (
        !name ||
        typeof name !== 'string' ||
        name.length < 2 ||
        vacancies == null ||
        typeof vacancies !== 'number' ||
        !description ||
        typeof description !== 'string' ||
        executive == null ||
        typeof executive !== 'boolean'
    ) {
        return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }
    try {
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
        const positionInfo = {
            id: position.id,
            name: position.name,
            vacancies: position.vacancies,
            executive: position.executive,
        };
        return NextResponse.json(positionInfo, { status: 201 });
    } catch (err) {
        console.error('Positions POST error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
