import { and, eq, gt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { memberDb, memberTable } from '@/db/member';
import { ballots, elections, voters } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/votes?election_id=123&student_id=abc
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    const student_id = searchParams.get('student_id');
    if (
        !election_id ||
        typeof election_id !== 'string' ||
        election_id.length < 3 ||
        !/^[a-zA-Z0-9_-]+$/.test(election_id)
    ) {
        return NextResponse.json({ error: 'Invalid or missing election_id' }, { status: 400 });
    }
    if (!student_id || typeof student_id !== 'string' || student_id.length < 3) {
        return NextResponse.json({ error: 'Invalid or missing student_id' }, { status: 400 });
    }
    try {
        // Look up actual student number from member table
        const member = await memberDb
            .select()
            .from(memberTable)
            .where(eq(memberTable.studentId, student_id))
            .then((rows) => rows[0]);
        if (!member) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
        // Find voter record for this student and election
        const voter = await db
            .select()
            .from(voters)
            .where(and(eq(voters.student_id, student_id), eq(voters.election, election_id)))
            .then((rows) => rows[0]);
        if (!voter) {
            return NextResponse.json(
                { voted: false, ballots: [] },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'private, max-age=0',
                        'Content-Type': 'application/json',
                    },
                }
            );
        }
        // Find ballots for this voter
        const ballotsForVoter = await db
            .select()
            .from(ballots)
            .where(eq(ballots.voter_id, voter.id));
        const voted = ballotsForVoter.length > 0;
        return NextResponse.json(
            { voted },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'private, max-age=0',
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (err) {
        console.error('Votes GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Expect /api/votes?election_id=123
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    // Fetch election info for status check
    const electionData = await db.select().from(elections).where(eq(elections.id, election_id));
    const election = Array.isArray(electionData) ? electionData[0] : electionData;
    if (!election) {
        return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }
    if (election.status !== 'Voting') {
        return NextResponse.json({ error: 'Voting is closed.' }, { status: 403 });
    }
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    // Batch voting logic
    const votesArray = Array.isArray(body) ? body : [body];
    if (votesArray.length === 0) {
        return NextResponse.json({ error: 'No votes provided' }, { status: 400 });
    }
    // Membership check: require valid keycloak_id and active membership (from memberDb)
    const keycloak_id = votesArray[0]?.keycloak_id;
    if (!keycloak_id || typeof keycloak_id !== 'string' || keycloak_id.length < 3) {
        return NextResponse.json(
            { error: 'Missing or invalid keycloak_id in request.' },
            { status: 400 }
        );
    }
    try {
        const member = await memberDb
            .select()
            .from(memberTable)
            .where(
                and(
                    eq(memberTable.keycloakId, keycloak_id),
                    gt(memberTable.membershipExpiresAt, new Date())
                )
            )
            .then((rows) => rows[0]);
        if (!member) {
            return NextResponse.json(
                { error: 'You must be a paid CS club member to vote.' },
                { status: 403 }
            );
        }
        // Use the studentId and name from the member record for the voter table
        const realStudentId = member.studentId?.trim();
        const firstName = member.firstName?.trim();
        const lastName = member.lastName?.trim();
        const realName = [firstName, lastName].filter(Boolean).join(' ');
        if (!realStudentId || realStudentId.length < 1 || !realName || realName.length < 1) {
            return NextResponse.json(
                { error: 'No student ID or name found for this member.' },
                { status: 400 }
            );
        }
        // Ensure voter exists or create
        let voter = await db
            .select()
            .from(voters)
            .where(eq(voters.student_id, realStudentId))
            .then((rows) => rows.find((v) => v.election === election_id));
        if (!voter) {
            // Generate a UUID for voter id
            const uuid = crypto.randomUUID();
            const inserted = await db
                .insert(voters)
                .values({
                    id: uuid,
                    student_id: realStudentId,
                    election: election_id,
                    name: realName,
                })
                .returning();
            voter = Array.isArray(inserted) ? inserted[0] : inserted;
        }
        if (!voter) {
            return NextResponse.json({ error: 'Failed to create or find voter' }, { status: 500 });
        }
        // Delete previous ballots for this voter (if any)
        await db.delete(ballots).where(eq(ballots.voter_id, voter.id));

        // Validate and prepare all votes for batch insert
        const validVotes = [];
        const errors = [];
        for (const voteData of votesArray) {
            if (
                !voteData.position ||
                typeof voteData.position !== 'string' ||
                voteData.position.length < 3 ||
                !Array.isArray(voteData.preferences)
            ) {
                errors.push({ error: 'Invalid vote data', vote: voteData });
                continue;
            }
            validVotes.push({
                id: crypto.randomUUID(),
                voter_id: voter.id,
                position: voteData.position,
                preferences: voteData.preferences,
            });
        }

        // Batch insert all valid votes at once
        let insertedVotes: Array<{ id: string; position: string }> = [];
        if (validVotes.length > 0) {
            insertedVotes = await db
                .insert(ballots)
                .values(validVotes)
                .returning()
                .then((results) =>
                    results.map((vote) => ({ id: vote.id, position: vote.position }))
                );
        }

        // Combine results with any errors
        const allResults = [...insertedVotes, ...errors];
        return NextResponse.json(allResults, { status: 201 });
    } catch (err) {
        console.error('Votes POST error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
