import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { elections, electionStatusEnum } from '@/db/schema';
import { isAdmin } from '@/utils/is-admin';
import { isMember } from '@/utils/is-member';

export async function PATCH(req: NextRequest) {
    // PATCH /api/elections/[id] - update election by id
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
    }
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];
    if (!id || typeof id !== 'string' || id.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return NextResponse.json({ error: 'Invalid or missing id' }, { status: 400 });
    }
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    // Only allow updating name and status
    const update: { name?: string; status?: (typeof electionStatusEnum)[number] } = {};
    if (body.name && typeof body.name === 'string' && body.name.length > 1) update.name = body.name;
    if (body.status) {
        if (electionStatusEnum.includes(body.status)) {
            update.status = body.status;
        } else {
            return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
        }
    }
    if (Object.keys(update).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    try {
        const [election] = await db
            .update(elections)
            .set(update)
            .where(eq(elections.id, id))
            .returning();
        if (!election) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }
        const electionInfo = { id: election.id, name: election.name, status: election.status };
        return NextResponse.json(electionInfo, { status: 200 });
    } catch (err) {
        console.error('Elections PATCH error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function GET() {
    // Proxy GET /elections to backend
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    // Query elections from sqlite db using drizzle
    try {
        const data = await db.select().from(elections);
        const electionInfo = data.map(({ id, name, status }) => ({ id, name, status }));
        return NextResponse.json(electionInfo, { status: 200 });
    } catch (err) {
        console.error('Elections GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Proxy POST /elections to backend
    // Authenticate and check admin role
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

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
