/* eslint-disable @typescript-eslint/no-explicit-any */
const mockNextResponseJson_membership = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, unknown?]) => mockNextResponseJson_membership(...args),
    },
}));

const selectMock_membership = jest.fn();
const memberTable = { keycloakId: 'keycloakId' };
jest.mock('@/db/member', () => ({
    memberDb: {
        select: () => ({
            from: () => ({
                where: async (...args: any[]) => selectMock_membership(...args),
            }),
        }),
    },
    memberTable,
}));

describe('membership route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_membership.mockClear();
        selectMock_membership.mockClear();
    });

    test('GET missing keycloak_id returns 400', async () => {
        const route = await import('../route');
        const req = { url: 'http://localhost/api/membership' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_membership).toHaveBeenCalledWith(
            { error: 'Missing keycloak_id' },
            { status: 400 }
        );
    });

    test('GET returns voter rows', async () => {
        // Simulate not found (empty array)
        selectMock_membership.mockImplementation(async () => []);
        const route = await import('../route');
        const req = { url: 'http://localhost/api/membership?keycloak_id=k1' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_membership).toHaveBeenCalledWith(
            { error: 'Member not found' },
            { status: 404 }
        );
    });
});
