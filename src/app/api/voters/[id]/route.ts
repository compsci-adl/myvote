import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { ballots, voters } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/voters/[id] where id is the election_id

    const session = await auth();
    if (!session?.user || !session.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let isAdmin = false;
    try {
        const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
        isAdmin = decodedToken?.realm_access?.roles?.includes('myvote-admin');
    } catch {
        isAdmin = false;
    }
    if (!isAdmin) {
        return NextResponse.json({ error: 'Admin privileges required.' }, { status: 403 });
    }
    const { pathname } = new URL(req.url);
    // pathname: /api/voters/[id]
    const match = pathname.match(/\/api\/voters\/(.+)$/);
    const election_id = match ? match[1] : null;
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }

    // Get all voters for this election who have voted
    const allVoters = await db.select().from(voters).where(eq(voters.election, election_id));

    // Get all voter IDs who have submitted ballots
    const votersWithBallots = await db
        .select({ voter_id: ballots.voter_id })
        .from(ballots)
        .innerJoin(voters, eq(ballots.voter_id, voters.id))
        .where(eq(voters.election, election_id));

    const votedVoterIds = new Set(votersWithBallots.map((b) => b.voter_id));

    // Filter voters who have voted
    const votedVoters = allVoters.filter((voter) => votedVoterIds.has(voter.id));

    // Format the response
    const formattedVoters = votedVoters.map((voter) => ({
        name: voter.name,
        student_id: voter.student_id,
    }));

    return NextResponse.json({ voters: formattedVoters }, { status: 200 });
}
