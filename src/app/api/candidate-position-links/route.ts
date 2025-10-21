import { eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { db } from '@/db/index';
import { candidatePositionLinks, candidates } from '@/db/schema';
import { SERVER_CACHE_TTL } from '@/lib/cache-config';
import { serverCache, serverCacheKeys } from '@/lib/server-cache';
import { isMember } from '@/utils/is-member';

export async function GET(req: NextRequest) {
    // Expect /api/candidate-position-links?position_id=... or ?position_ids=p1,p2,p3
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
    const position_ids_str = searchParams.get('position_ids');

    if (position_ids_str) {
        // Batch query: position_ids=p1,p2,p3
        const positionIds: string[] = position_ids_str
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        if (!positionIds.length) {
            return NextResponse.json({ error: 'No position_ids provided' }, { status: 400 });
        }
        if (!positionIds.every((id) => typeof id === 'string' && id.length > 2)) {
            return NextResponse.json({ error: 'Invalid position_ids' }, { status: 400 });
        }

        // Check cache first
        const cacheKey = serverCacheKeys.candidatePositionLinks(positionIds);
        const cachedResult = serverCache.get(cacheKey);
        if (cachedResult) {
            return NextResponse.json(
                { candidate_position_links: cachedResult },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'private, max-age=600',
                        'Content-Type': 'application/json',
                    },
                }
            );
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
                .select({
                    id: candidates.id,
                    name: candidates.name,
                    statement: candidates.statement,
                })
                .from(candidates)
                .where(inArray(candidates.id, candidateIds));
        }
        // Map candidates by id for quick lookup
        const candidateMap = new Map<string, Record<string, unknown>>();
        for (const cand of candidatesList) {
            const candidate = cand as { id: string; name: string; statement: string };
            candidateMap.set(String(candidate.id), {
                id: candidate.id,
                name: candidate.name,
                statement: candidate.statement,
            });
        }

        // Build response
        const allLinks = links
            .filter((link) => link.candidate_id && candidateMap.has(String(link.candidate_id)))
            .map((link) => ({
                candidate_id: link.candidate_id,
                position_id: link.position_id,
                candidate: candidateMap.get(String(link.candidate_id)),
            }));

        // Cache the result
        serverCache.set(cacheKey, allLinks, SERVER_CACHE_TTL.CANDIDATE_POSITION_LINKS);

        return NextResponse.json(
            { candidate_position_links: allLinks },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'private, max-age=600',
                    'Content-Type': 'application/json',
                },
            }
        );
    } else if (position_id) {
        // Single position
        if (
            !position_id ||
            typeof position_id !== 'string' ||
            position_id.length < 3 ||
            !/^[a-zA-Z0-9_-]+$/.test(position_id)
        ) {
            return NextResponse.json({ error: 'Invalid or missing position_id' }, { status: 400 });
        }

        // Check cache first for single position
        const cacheKey = serverCacheKeys.candidatePositionLinks([position_id]);
        const cachedResult = serverCache.get(cacheKey);
        if (cachedResult) {
            return NextResponse.json(
                { candidate_position_links: cachedResult },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'private, max-age=600',
                        'Content-Type': 'application/json',
                    },
                }
            );
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
                    .select({
                        id: candidates.id,
                        name: candidates.name,
                        statement: candidates.statement,
                    })
                    .from(candidates)
                    .where(eq(candidates.id, String(link.candidate_id)));
                if (candidate && candidate.length > 0) {
                    candidatesForLinks.push({
                        candidate_id: link.candidate_id,
                        position_id: link.position_id,
                        candidate: {
                            id: candidate[0].id,
                            name: candidate[0].name,
                            statement: candidate[0].statement,
                        },
                    });
                }
            }

            // Cache the result
            serverCache.set(
                cacheKey,
                candidatesForLinks,
                SERVER_CACHE_TTL.CANDIDATE_POSITION_LINKS
            );

            return NextResponse.json(
                { candidate_position_links: candidatesForLinks },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'private, max-age=600',
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (err) {
            console.error('Candidate-position-links GET error:', err);
            return NextResponse.json({ error: 'Server error' }, { status: 500 });
        }
    } else {
        return NextResponse.json({ error: 'Missing position_id or position_ids' }, { status: 400 });
    }
}

export async function POST(req: NextRequest) {
    // Insert single candidate-position-link
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
