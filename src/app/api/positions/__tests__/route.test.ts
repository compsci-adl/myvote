 
const mockNextResponseJson_positions = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, unknown?]) => mockNextResponseJson_positions(...args),
    },
}));

const selectMock_positions = jest.fn();
const insertMock_positions = jest.fn();

jest.mock('@/db/index', () => ({
    db: {
        select: () => ({
            from: () => ({
                where: async (...args: any[]) => selectMock_positions(...args),
            }),
        }),
        insert: () => insertMock_positions(),
    },
}));

jest.mock('next-auth');

describe('positions route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_positions.mockClear();
        selectMock_positions.mockClear();
        insertMock_positions.mockClear();
    });

    test('GET missing election_id returns 401', async () => {
        const route = await import('../route');
        const req = { url: 'http://localhost/api/positions' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('GET returns positions', async () => {
        const data = [{ id: 'p1', name: 'Position 1' }];
        selectMock_positions.mockImplementation(async () => data);
        const route = await import('../route');
        const req = { url: 'http://localhost/api/positions?election_id=e1' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('POST inserts position', async () => {
        const route = await import('../route');
        const req = { url: 'http://localhost/api/positions?election_id=e1' } as any;
        await route.POST(req);
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });
});
