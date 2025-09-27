import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { candidatePositionLinks, candidates } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/candidate-position-links?position_id=...
    const { searchParams } = new URL(req.url);
    const position_id = searchParams.get('position_id');
    if (!position_id) {
        return NextResponse.json({ error: 'Missing position_id' }, { status: 400 });
    }
    // Get all candidate-position-links for this position
    const links = await db
        .select()
        .from(candidatePositionLinks)
        .where(eq(candidatePositionLinks.position_id, position_id));
    
    console.log('[DEBUG] /api/candidate-position-links links:', links);

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
                candidate: candidate[0],
            });
        }
    }
    return NextResponse.json({ candidate_position_links: candidatesForLinks }, { status: 200 });
}

export async function POST(req: NextRequest) {
    // Expect /api/candidate-position-links
    const body = await req.json();
    // Insert candidate-position-link into sqlite db using drizzle
    const [link] = await db
        .insert(candidatePositionLinks)
        .values({
            ...body,
        })
        .returning();
    return NextResponse.json(link, { status: 201 });
}
