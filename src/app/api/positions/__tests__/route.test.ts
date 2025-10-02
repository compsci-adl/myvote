/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe('positions route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_positions.mockClear();
        selectMock_positions.mockClear();
        insertMock_positions.mockClear();
    });

    test('GET missing election_id returns 400', async () => {
        const route = await import('../route');
        const req = { url: 'http://localhost/api/positions' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(
            { error: 'Missing election_id' },
            { status: 400 }
        );
    });

    test('GET returns positions', async () => {
        const data = [{ id: 'p1', name: 'Position 1' }];
        selectMock_positions.mockImplementation(async () => data);
        const route = await import('../route');
        const req = { url: 'http://localhost/api/positions?election_id=e1' } as any;
        await route.GET(req);
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(
            { positions: data },
            { status: 200 }
        );
    });

    test('POST inserts position', async () => {
        const returned = [{ id: 'p2', name: 'New' }];
        insertMock_positions.mockImplementation(() => ({
            values: () => ({ returning: () => Promise.resolve(returned) }),
        }));
        const route = await import('../route');
        const req = {
            url: 'http://localhost/api/positions?election_id=e1',
            json: async () => ({ name: 'New', vacancies: 1, description: 'd', executive: false }),
        } as any;
        await route.POST(req);
        expect(insertMock_positions).toHaveBeenCalled();
        expect(mockNextResponseJson_positions).toHaveBeenCalledWith(returned[0], { status: 201 });
    });
});
