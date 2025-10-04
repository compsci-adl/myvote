import { and, eq, gt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { memberDb, memberTable } from '@/db/member';
import { ballots, positions, voters } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/votes?election_id=123&student_id=abc
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    const student_id = searchParams.get('student_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    if (!student_id) {
        return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
    }
    // Query ballots joined to positions and voters, filter by election_id and student_id
    const data = await db
        .select({
            ballot: ballots,
            position: positions,
        })
        .from(ballots)
        .innerJoin(positions, eq(ballots.position, positions.id))
        .innerJoin(voters, eq(ballots.voter_id, voters.id))
        .where(and(eq(positions.election_id, election_id), eq(voters.student_id, student_id)));
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

    // Batch voting logic
    const votesArray = Array.isArray(body) ? body : [body];
    if (votesArray.length === 0) {
        return NextResponse.json({ error: 'No votes provided' }, { status: 400 });
    }

    // Membership check: require valid keycloak_id and active membership (from memberDb)
    const keycloak_id = votesArray[0]?.keycloak_id;
    if (!keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id in request.' }, { status: 400 });
    }
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
    const realStudentId = member.studentId;
    const realName = member.firstName + ' ' + member.lastName;
    if (!realStudentId || !realName) {
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

    // Batch insert votes in groups of 20
    const batchSize = 20;
    const insertedVotes = [];
    for (let i = 0; i < votesArray.length; i += batchSize) {
        const batch = votesArray.slice(i, i + batchSize);
        for (const voteData of batch) {
            // Check if already voted for this position
            const existingBallot = await db
                .select()
                .from(ballots)
                .where(eq(ballots.voter_id, voter.id))
                .then((rows) => rows.find((b) => b.position === voteData.position));
            if (existingBallot) {
                insertedVotes.push({
                    error: 'Already voted for this position',
                    position: voteData.position,
                });
                continue;
            }
            const ballotId = crypto.randomUUID();
            const [vote] = await db
                .insert(ballots)
                .values({
                    id: ballotId,
                    voter_id: voter.id,
                    position: voteData.position,
                    preferences: voteData.preferences,
                })
                .returning();
            insertedVotes.push(vote);
        }
    }
    return NextResponse.json(insertedVotes, { status: 201 });
}
