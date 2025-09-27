import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/index';
import { voters } from '@/db/schema';

export async function GET(req: NextRequest) {
    // Expect /api/membership?keycloak_id=...
    const { searchParams } = new URL(req.url);
    const keycloak_id = searchParams.get('keycloak_id');
    if (!keycloak_id) {
        return NextResponse.json({ error: 'Missing keycloak_id' }, { status: 400 });
    }
    // Query membership from sqlite db using drizzle
    const data = await db.select().from(voters).where(eq(voters.id, keycloak_id));
    return NextResponse.json(data, { status: 200 });
}
