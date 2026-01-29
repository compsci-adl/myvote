 
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
jest.mock('next-auth');

describe('membership route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_membership.mockClear();
        selectMock_membership.mockClear();
    });

    test('GET missing keycloak_id returns 401', async () => {
        const route = await import('../route');
        const req = { url: 'http://localhost/api/membership' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_membership).toHaveBeenCalledWith(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    });

    test('GET returns voter rows', async () => {
        selectMock_membership.mockImplementation(async () => []);
        const route = await import('../route');
        const req = { url: 'http://localhost/api/membership?keycloak_id=k1' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_membership).toHaveBeenCalledWith(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    });
});
