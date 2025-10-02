import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { candidatePositionLinks, candidates, positions } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/candidates?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
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
        ...c,
        nominations: candidateMap[c.id] || [],
    }));
    return NextResponse.json(data, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Expect /api/candidates?election_id=123
    const { searchParams } = new URL(req.url);
    const election_id = searchParams.get('election_id');
    if (!election_id) {
        return NextResponse.json({ error: 'Missing election_id' }, { status: 400 });
    }
    const body = await req.json();
    if (!Array.isArray(body)) {
        return NextResponse.json({ error: 'Body must be an array of candidates' }, { status: 400 });
    }
    const insertedCandidates = [];
    for (const candidateData of body) {
        // Insert candidate into sqlite db using drizzle
        const [candidate] = await db
            .insert(candidates)
            .values({
                ...candidateData,
                election: election_id,
            })
            .returning();
        insertedCandidates.push(candidate);

        // Insert candidate-position-link rows for nominations
        if (Array.isArray(candidateData.nominations) && candidateData.nominations.length > 0) {
            const linksToInsert = candidateData.nominations.map((position_id: string) => ({
                candidate_id: candidate.id,
                position_id,
            }));
            await db.insert(candidatePositionLinks).values(linksToInsert);
        }
    }
    return NextResponse.json(insertedCandidates, { status: 201 });
}
