import { eq } from 'drizzle-orm';
export async function PATCH(req: NextRequest) {
    // PATCH /api/elections/[id] - update election by id
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const body = await req.json();
    // Only allow updating name and status
    const update: { name?: string; status?: (typeof elections._.status)['enum'][number] } = {};
    if (body.name) update.name = body.name;
    if (body.status) {
        const allowed = [
            'PreRelease',
            'Nominations',
            'NominationsClosed',
            'Voting',
            'VotingClosed',
            'ResultsReleased',
        ];
        if (allowed.includes(body.status)) {
            update.status = body.status;
        } else {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }
    }
    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const [election] = await db
        .update(elections)
        .set(update)
        .where(eq(elections.id, id))
        .returning();
    if (!election) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(election, { status: 200 });
}

import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { elections } from '@/db/schema';

export async function GET() {
    // Proxy GET /elections to backend
    // Query elections from sqlite db using drizzle
    const data = await db.select().from(elections);
    return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Proxy POST /elections to backend
    const body = await req.json();
    // Ensure id and status are provided
    const id = body.id ?? crypto.randomUUID();
    const status = body.status ?? 'PreRelease';
    const name = body.name;
    if (!name) {
        return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }
    const [election] = await db
        .insert(elections)
        .values({
            id,
            name,
            status,
        })
        .returning();
    return NextResponse.json(election, { status: 201 });
}
