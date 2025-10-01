/* eslint-disable @typescript-eslint/no-explicit-any */

const mockNextResponseJson_results = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [any, any?]) => mockNextResponseJson_results(...args),
    },
}));

// Drizzle chainable mocks for select/from/innerJoin/where
const selectMockResults = jest.fn();
const fromMockResults = jest.fn();
const innerJoinMockResults = jest.fn();
const whereMockResults = jest.fn();

// Chain: db.select().from().innerJoin().where() => resolves to []
selectMockResults.mockReturnValue({ from: fromMockResults });
fromMockResults.mockReturnValue({ innerJoin: innerJoinMockResults });
innerJoinMockResults.mockReturnValue({ where: whereMockResults });
whereMockResults.mockResolvedValue([]);

jest.mock('@/db/index', () => ({
    db: {
        select: selectMockResults,
    },
}));

describe('results route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_results.mockClear();
        selectMockResults.mockClear();
        fromMockResults.mockClear();
        innerJoinMockResults.mockClear();
        whereMockResults.mockClear();
    });

    test('GET missing election_id returns 400', async () => {
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/results' } as any;
        await GET(req);
        expect(mockNextResponseJson_results).toHaveBeenCalledWith(
            { error: 'Missing election_id' },
            { status: 400 }
        );
    });

    test('GET returns results', async () => {
        const data = [{ id: 'r1' }];
        whereMockResults.mockResolvedValueOnce(data);
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/results?election_id=e1' } as any;
        await GET(req);
        expect(mockNextResponseJson_results).toHaveBeenCalledWith(data, { status: 200 });
    });
});
