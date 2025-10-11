import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { ballots, positions } from '@/db/schema';
import { isAdmin } from '@/utils/is-admin';
import { isMember } from '@/utils/is-member';

export async function GET(req: NextRequest) {
    // Expect /api/results?election_id=...
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    if (!isAdmin(session)) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
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
        // Query ballots joined to positions, filter by election_id
        const data = await db
            .select({
                ballot: ballots,
                position: positions,
            })
            .from(ballots)
            .innerJoin(positions, eq(ballots.position, positions.id))
            .where(eq(positions.election_id, election_id));
        // Only return minimal result info
        const safeData = data.map(({ ballot, position }) => ({
            ballot_id: ballot.id,
            position_id: position.id,
            preferences: ballot.preferences,
        }));
        return NextResponse.json(safeData, { status: 200 });
    } catch (err) {
        console.error('Results GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
