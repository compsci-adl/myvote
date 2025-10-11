import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';

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
            return NextResponse.json(memberInfo, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
    } catch (err) {
        console.error('Membership API error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
