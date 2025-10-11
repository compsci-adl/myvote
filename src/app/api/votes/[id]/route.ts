import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { ballots, positions } from '@/db/schema';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
    // Expect /api/votes/[id] where id is the election_id
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: election_id } = await context.params;
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    // Validate that the position belongs to the election
    const pos = await db
        .select()
        .from(positions)
        .where(eq(positions.id, body.position))
        .then((rows) => rows[0]);
    if (!pos || pos.election_id !== election_id) {
        return NextResponse.json(
            { error: 'Position does not belong to election' },
            { status: 400 }
        );
    }
    // Insert ballot into sqlite db using drizzle
    const vote = await db
        .insert(ballots)
        .values({
            ...body,
        })
        .returning();
    return NextResponse.json(vote, { status: 201 });
}
