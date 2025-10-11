import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { candidatePositionLinks, candidates } from '@/db/schema';
import { isMember } from '@/utils/is-member';

export async function GET(req: NextRequest) {
    // Expect /api/candidate-position-links?position_id=...
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const position_id = searchParams.get('position_id');
    if (
        !position_id ||
        typeof position_id !== 'string' ||
        position_id.length < 3 ||
        !/^[a-zA-Z0-9_-]+$/.test(position_id)
    ) {
        return NextResponse.json({ error: 'Invalid or missing position_id' }, { status: 400 });
    }
    try {
        // Get all candidate-position-links for this position
        const links = await db
            .select()
            .from(candidatePositionLinks)
            .where(eq(candidatePositionLinks.position_id, position_id));

        // For each link, get the candidate info
        const candidatesForLinks = [];
        for (const link of links) {
            if (!link.candidate_id) continue;
            const candidate = await db
                .select()
                .from(candidates)
                .where(eq(candidates.id, String(link.candidate_id)));
            if (candidate && candidate.length > 0) {
                candidatesForLinks.push({
                    candidate_id: link.candidate_id,
                    position_id: link.position_id,
                    candidate: {
                        id: candidate[0].id,
                        name: candidate[0].name,
                    },
                });
            }
        }
        return NextResponse.json({ candidate_position_links: candidatesForLinks }, { status: 200 });
    } catch (err) {
        console.error('Candidate-position-links GET error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    // Accepts either a single object (insert) or a batch query for position_ids
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'User not authenticated.' }, { status: 401 });
    }
    const member = await isMember(session.user.id);
    if (!member) {
        return NextResponse.json({ error: 'Paid CS Club membership required.' }, { status: 403 });
    }
    let body;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Batch query: { position_ids: string[] }
    if (body && Array.isArray(body.position_ids)) {
        const positionIds: string[] = body.position_ids;
        if (!positionIds.length) {
            return NextResponse.json({ error: 'No position_ids provided' }, { status: 400 });
        }
        if (!positionIds.every((id) => typeof id === 'string' && id.length > 2)) {
            return NextResponse.json({ error: 'Invalid position_ids' }, { status: 400 });
        }
        // Fetch all links for all positions in one go
        const links = await db
            .select()
            .from(candidatePositionLinks)
            .where(inArray(candidatePositionLinks.position_id, positionIds));

        // Collect all unique candidate IDs
        const candidateIds = Array.from(
            new Set(links.map((l) => String(l.candidate_id)).filter(Boolean))
        );

        // Fetch all candidates in one query
        let candidatesList: unknown[] = [];
        if (candidateIds.length > 0) {
            candidatesList = await db
                .select()
                .from(candidates)
                .where(inArray(candidates.id, candidateIds));
        }
        // Map candidates by id for quick lookup
        const candidateMap = new Map<string, Record<string, unknown>>();
        for (const cand of candidatesList) {
            const candidate = cand as { id: string; name: string };
            candidateMap.set(String(candidate.id), { id: candidate.id, name: candidate.name });
        }

        // Build response
        const allLinks = links
            .filter((link) => link.candidate_id && candidateMap.has(String(link.candidate_id)))
            .map((link) => ({
                candidate_id: link.candidate_id,
                position_id: link.position_id,
                candidate: candidateMap.get(String(link.candidate_id)),
            }));

        return NextResponse.json({ candidate_position_links: allLinks }, { status: 200 });
    }

    // Default: insert single candidate-position-link
    // Insert candidate-position-link into sqlite db using drizzle
    try {
        if (
            !body.candidate_id ||
            typeof body.candidate_id !== 'string' ||
            body.candidate_id.length < 3 ||
            !body.position_id ||
            typeof body.position_id !== 'string' ||
            body.position_id.length < 3
        ) {
            return NextResponse.json(
                { error: 'Missing or invalid candidate_id or position_id' },
                { status: 400 }
            );
        }
        const insertResult = await db
            .insert(candidatePositionLinks)
            .values({
                candidate_id: body.candidate_id,
                position_id: body.position_id,
            })
            .returning();

        const link = Array.isArray(insertResult) ? insertResult[0] : insertResult;
        if (!link) {
            return NextResponse.json(
                { error: 'Failed to create candidate-position-link' },
                { status: 500 }
            );
        }
        return NextResponse.json(link, { status: 201 });
    } catch (error) {
        console.error('Candidate-position-links POST error:', error);
        return NextResponse.json(
            {
                error: 'Error creating candidate-position-link',
                details: error instanceof Error ? error.message : error,
            },
            { status: 500 }
        );
    }
}
