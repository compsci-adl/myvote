import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { SERVER_CACHE_TTL } from '@/lib/cache-config';
import { serverCache, serverCacheKeys } from '@/lib/server-cache';

export async function GET(req: NextRequest) {
    // Expect /api/membership?keycloak_id=...
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const keycloak_id = searchParams.get('keycloak_id');
    if (
        !keycloak_id ||
        typeof keycloak_id !== 'string' ||
        keycloak_id.length < 3 ||
        !/^[a-zA-Z0-9_-]+$/.test(keycloak_id)
    ) {
        return NextResponse.json({ error: 'Invalid or missing keycloak_id' }, { status: 400 });
    }
    try {
        // Check cache first
        const cacheKey = serverCacheKeys.membership(keycloak_id);
        const cachedMember = serverCache.get(cacheKey);
        if (cachedMember) {
            return NextResponse.json(cachedMember, {
                status: 200,
                headers: {
                    'Cache-Control': 'private, max-age=60',
                    'Content-Type': 'application/json',
                },
            });
        }

        const { memberDb, memberTable } = await import('@/db/member');
        const data = await memberDb
            .select()
            .from(memberTable)
            .where(eq(memberTable.keycloakId, keycloak_id));
        if (Array.isArray(data) && data.length > 0) {
            const memberInfo = data.map(({ id, keycloakId, studentId }) => ({
                id,
                keycloakId,
                studentId,
            }));

            // Cache the result with shorter TTL since membership can change
            serverCache.set(cacheKey, memberInfo, SERVER_CACHE_TTL.MEMBERSHIP);

            return NextResponse.json(memberInfo, {
                status: 200,
                headers: {
                    'Cache-Control': 'private, max-age=60',
                    'Content-Type': 'application/json',
                },
            });
        } else {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
    } catch (err) {
        console.error('Membership API error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
