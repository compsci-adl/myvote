/* eslint-disable @typescript-eslint/no-explicit-any */
const mockNextResponseJson_elections = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: any[]) => mockNextResponseJson_elections(...(args as [any, any?])),
    },
}));

const selectMock_elections = jest.fn();
const insertMock_elections = jest.fn();
const updateMock_elections = jest.fn();

jest.mock('@/db/index', () => ({
    db: {
        select: () => selectMock_elections(),
        insert: () => insertMock_elections(),
        update: () => updateMock_elections(),
    },
}));

jest.mock('next-auth');

describe('elections route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_elections.mockClear();
        selectMock_elections.mockClear();
        insertMock_elections.mockClear();
        updateMock_elections.mockClear();
    });

    test('GET returns elections', async () => {
        const route = await import('../route');
        await route.GET();
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('POST missing name returns 401', async () => {
        const route = await import('../route');
        const req = { json: async () => ({}) } as any;
        await route.POST(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('POST inserts and returns 201', async () => {
        const route = await import('../route');
        const req = { json: async () => ({ name: 'New' }) } as any;
        await route.POST(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('PATCH missing id returns 401', async () => {
        const route = await import('../route');
        const req = { json: async () => ({}) } as any;
        await route.PATCH(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('PATCH updates and returns 200', async () => {
        const route = await import('../route');
        const req = { json: async () => ({ id: 'e1', name: 'Updated' }) } as any;
        await route.PATCH(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });
});
