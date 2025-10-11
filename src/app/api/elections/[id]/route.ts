import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { elections, ElectionStatus } from '@/db/schema';
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
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const body = await req.json();
    // Only allow updating name and status
    const update: { name?: string; status?: ElectionStatus } = {};
    if (body.name) update.name = body.name;
    if (body.status !== undefined) {
        const allowed: ElectionStatus[] = [
            'PreRelease',
            'Nominations',
            'NominationsClosed',
            'Voting',
            'VotingClosed',
            'ResultsReleased',
        ];
        let statusValue = body.status;
        if (typeof statusValue === 'number') {
            // Map number to status string
            if (statusValue >= 0 && statusValue < allowed.length) {
                statusValue = allowed[statusValue];
            } else {
                return NextResponse.json(
                    { error: `Invalid status value: ${body.status}` },
                    { status: 400 }
                );
            }
        } else if (typeof statusValue === 'string') {
            statusValue = statusValue.trim();
        }
        if (allowed.includes(statusValue)) {
            update.status = statusValue as ElectionStatus;
        } else {
            return NextResponse.json(
                { error: `Invalid status value: ${body.status}` },
                { status: 400 }
            );
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

export async function GET(req: NextRequest) {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User information missing.' }, { status: 400 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    // GET /api/elections/[id] - fetch election by id
    const urlParts = req.url.split('/');
    const id = urlParts[urlParts.length - 1];
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const [election] = await db.select().from(elections).where(eq(elections.id, id));
    if (!election) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(election, { status: 200 });
}
