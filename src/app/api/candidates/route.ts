import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { candidatePositionLinks, candidates, positions } from '@/db/schema';
import { isMember } from '@/utils/is-member';

export async function GET(req: NextRequest) {
    // Expect /api/candidates?election_id=123
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
        // Query candidates from sqlite db using drizzle
        const candidateRows = await db
            .select()
            .from(candidates)
            .where(eq(candidates.election, election_id));
        // Query candidate-position-links for this election
        const positionRows = await db
            .select()
            .from(positions)
            .where(eq(positions.election_id, election_id));
        const positionIds = positionRows.map((p) => p.id);
        // Get all links for these positions
        const links =
            positionIds.length > 0
                ? await db
                      .select()
                      .from(candidatePositionLinks)
                      .where(inArray(candidatePositionLinks.position_id, positionIds))
                : [];
        // Build nominations array for each candidate
        const candidateMap: Record<string, string[]> = {};
        links.forEach((link) => {
            if (typeof link.candidate_id === 'string' && link.candidate_id) {
                if (!candidateMap[link.candidate_id]) candidateMap[link.candidate_id] = [];
                if (typeof link.position_id === 'string') {
                    candidateMap[link.candidate_id].push(link.position_id);
                }
            }
        });
        // Attach nominations to each candidate
        const data = candidateRows.map((c) => ({
            id: c.id,
            name: c.name,
            nominations: candidateMap[c.id] || [],
        }));
        return NextResponse.json(data, { status: 200 });
    } catch (err) {
        console.error('Candidates GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Expect /api/candidates?election_id=123
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
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Body must be an array of candidates' }, { status: 400 });
    }
    const insertedCandidates = [];
    for (const candidateData of body) {
        // Validate candidateData
        if (
            !candidateData.name ||
            typeof candidateData.name !== 'string' ||
            candidateData.name.length < 2
        ) {
            insertedCandidates.push({ error: 'Invalid candidate name', candidate: candidateData });
            continue;
        }
        // Insert candidate into sqlite db using drizzle
        const candidateId =
            candidateData.id && typeof candidateData.id === 'string' && candidateData.id.length > 3
                ? candidateData.id
                : crypto.randomUUID();
        const [candidate] = await db
            .insert(candidates)
            .values({
                id: candidateId,
                name: candidateData.name,
                election: election_id,
            })
            .returning();
        insertedCandidates.push({ id: candidate.id, name: candidate.name });
        // Insert candidate-position-link rows for nominations
        if (Array.isArray(candidateData.nominations) && candidateData.nominations.length > 0) {
            const linksToInsert = candidateData.nominations
                .filter(
                    (position_id: string) =>
                        typeof position_id === 'string' && position_id.length > 2
                )
                .map((position_id: string) => ({
                    candidate_id: candidate.id,
                    position_id,
                }));
            if (linksToInsert.length > 0) {
                await db.insert(candidatePositionLinks).values(linksToInsert);
            }
        }
    }
    return NextResponse.json(insertedCandidates, { status: 201 });
}
