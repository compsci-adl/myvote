import { eq } from 'drizzle-orm';

import { memberDb, memberTable } from '@/db/member';

export async function isMember(keycloakId: string | undefined): Promise<boolean> {
    if (!keycloakId) return false;
    const member = await memberDb
        .select()
        .from(memberTable)
        .where(eq(memberTable.keycloakId, keycloakId))
        .then((rows) => rows[0]);
    return !!(
        member &&
        member.membershipExpiresAt !== null &&
        member.membershipExpiresAt.getTime() > Date.now()
    );
}
