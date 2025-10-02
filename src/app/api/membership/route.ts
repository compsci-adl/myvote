import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Expect /api/membership?keycloak_id=...
    const { searchParams } = new URL(req.url);
    const keycloak_id = searchParams.get('keycloak_id');
    if (!keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id' }, { status: 400 });
    }
    try {
        const { memberDb, memberTable } = await import('@/db/member');
        const data = await memberDb
            .select()
            .from(memberTable)
            .where(eq(memberTable.keycloakId, keycloak_id));
        if (Array.isArray(data) && data.length > 0) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
