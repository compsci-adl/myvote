/* eslint-disable @typescript-eslint/no-explicit-any */
const mockNextResponseJson_membership = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, unknown?]) => mockNextResponseJson_membership(...args),
    },
}));

const selectMock_membership = jest.fn();

jest.mock('@/db/index', () => ({
    db: {
        select: () => ({
            from: () => ({
                where: async (...args: any[]) => selectMock_membership(...args),
            }),
        }),
    },
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
        const data = [{ id: 'v1', name: 'Voter' }];
        selectMock_membership.mockImplementation(async () => data);
        const route = await import('../route');
        const req = { url: 'http://localhost/api/membership?keycloak_id=k1' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_membership).toHaveBeenCalledWith(data, { status: 200 });
    });
});
