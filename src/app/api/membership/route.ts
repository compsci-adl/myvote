import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Expect /api/membership?keycloak_id=...
    const { searchParams } = new URL(req.url);
    const keycloak_id = searchParams.get('keycloak_id');
    if (!keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id' }, { status: 400 });
    }
    const { memberDb, memberTable } = await import('@/db/member');
    const data = await memberDb
        .select()
        .from(memberTable)
        .where(eq(memberTable.keycloakId, keycloak_id));
    return NextResponse.json(data, { status: 200 });
}
