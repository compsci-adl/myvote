import { and, eq, gt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { memberDb, memberTable } from '@/db/member';
import { ballots, positions, voters } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/votes?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    // Query ballots joined to positions, filter by election_id
    const data = await db
        .select({
            ballot: ballots,
            position: positions,
        })
        .from(ballots)
        .innerJoin(positions, eq(ballots.position, positions.id))
        .where(eq(positions.election_id, election_id));
    return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Expect /api/votes?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();

    // Membership check: require valid keycloak_id and active membership (from memberDb)
    if (!body.keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id in request.' }, { status: 400 });
    }
    const member = await memberDb
        .select()
        .from(memberTable)
        .where(
            and(
                eq(memberTable.keycloakId, body.keycloak_id),
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
    // Use the studentId from the member record for the voter table
    const realStudentId = member.studentId;
    if (!realStudentId) {
        return NextResponse.json(
            { error: 'No student ID found for this member.' },
            { status: 400 }
        );
    }

    // Check if a ballot already exists for this voter, election, and position
    const existingVoterRecord = await db
        .select()
        .from(voters)
        .where(eq(voters.student_id, realStudentId))
        .then((rows) => rows.find((v) => v.election === election_id));
    if (existingVoterRecord) {
        const existingBallot = await db
            .select()
            .from(ballots)
            .where(eq(ballots.voter_id, existingVoterRecord.id))
            .then((rows) => rows.find((b) => b.position === body.position));
        if (existingBallot) {
            return NextResponse.json(
                { error: 'You have already voted for this position.' },
                { status: 409 }
            );
        }
    }

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
                election: election_id,
                student_id: realStudentId,
                name: body.name,
            })
            .returning();
        // Handle both array and ResultSet
        voter = Array.isArray(inserted) ? inserted[0] : inserted;
    }

    // Generate a UUID for ballot id if not provided
    const ballotId = body.id ?? crypto.randomUUID();

    // Insert ballot into sqlite db using drizzle
    if (!voter) {
        return NextResponse.json({ error: 'Failed to create or find voter' }, { status: 500 });
    }
    const vote = await db
        .insert(ballots)
        .values({
            id: ballotId,
            voter_id: voter.id,
            position: body.position,
            preferences: body.preferences,
            // submitted will default
        })
        .returning();
    return NextResponse.json(vote, { status: 201 });
}
