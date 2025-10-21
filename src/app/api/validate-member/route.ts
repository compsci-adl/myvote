import { and, eq, gt } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const keycloak_id = searchParams.get('keycloak_id');
    if (!keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id' }, { status: 400 });
    }
    const { memberDb, memberTable } = await import('@/db/member');
    const now = new Date();
    const member = await memberDb
        .select()
        .from(memberTable)
        .where(
            and(eq(memberTable.keycloakId, keycloak_id), gt(memberTable.membershipExpiresAt, now))
        )
        .then((rows) => rows[0]);
    if (!member) {
        return NextResponse.json(
            { error: 'You must be a paid CS club member to vote.' },
            { status: 403 }
        );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
}
