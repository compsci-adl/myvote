/* eslint-disable @typescript-eslint/no-explicit-any */
const mockNextResponseJson_votes = jest.fn((body: any, init?: any) => ({ body, init }));
// Drizzle chainable mocks for select/insert
const selectMockVotes = jest.fn();
const fromMock: jest.Mock = jest.fn();
const innerJoinMock: jest.Mock = jest.fn();
const whereMock: jest.Mock = jest.fn();
const returningMock: jest.Mock = jest.fn();
const insertMockVotes = jest.fn();
const valuesMock: jest.Mock = jest.fn();

jest.mock('next/server', () => ({
    NextResponse: { json: (...args: [any, any?]) => mockNextResponseJson_votes(...args) },
}));

// Chain: db.select().from().innerJoin().where() => resolves to []
selectMockVotes.mockImplementation((...args) => {
    if (args.length === 0) {
        // POST: .select().from(positions) => { where: ... }
        return { from: () => ({ where: whereMock }) };
    }
    // GET: .select({...}).from(ballots) => { innerJoin: ... }
    return { from: () => ({ innerJoin: innerJoinMock }) };
});
fromMock.mockImplementation((table) => {
    if (table && table.toString && table.toString().includes('positions')) {
        // POST: .from(positions) => { where: ... }
        return { where: whereMock };
    }
    // GET: .from(ballots) => { innerJoin: ... }
    return { innerJoin: innerJoinMock };
});
innerJoinMock.mockReturnValue({
    where: whereMock,
});
// whereMock: for GET, resolves to []; for POST, resolves to mock data
whereMock.mockResolvedValue([]);

// Chain: db.insert().values().returning() => resolves to [{ id: 'v2' }]
insertMockVotes.mockReturnValue({
    values: valuesMock,
});
valuesMock.mockReturnValue({
    returning: returningMock,
});
returningMock.mockResolvedValue([{ id: 'v2' }]);

jest.mock('@/db/index', () => ({
    db: {
        select: selectMockVotes,
        insert: insertMockVotes,
    },
}));

describe('votes route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_votes.mockClear();
        selectMockVotes.mockClear();
        fromMock.mockClear();
        innerJoinMock.mockClear();
        whereMock.mockClear();
        insertMockVotes.mockClear();
        valuesMock.mockClear();
        returningMock.mockClear();
    });
    test('GET missing election_id returns 400', async () => {
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/votes' } as any;
        await GET(req);
        expect(mockNextResponseJson_votes).toHaveBeenCalledWith(
            { error: 'Missing election_id' },
            { status: 400 }
        );
    });

    test('GET returns votes', async () => {
        // Setup chain to resolve to mock data
        const data = [{ id: 'v1' }];
        whereMock.mockResolvedValueOnce(data);
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/votes?election_id=e1' } as any;
        await GET(req);
        expect(mockNextResponseJson_votes).toHaveBeenCalledWith(data, { status: 200 });
    });
    test('POST inserts vote', async () => {
        // Setup select chain for position check: .where().then(...)
        whereMock.mockResolvedValueOnce([{ id: 'p1', election_id: 'e1' }]);
        // Setup insert chain for ballot insert
        returningMock.mockResolvedValueOnce([{ id: 'v2' }]);
        const { POST } = await import('../route');
        const req = {
            url: 'http://localhost/api/votes?election_id=e1',
            json: async () => ({ choice: 'x', position: 'p1' }),
        } as any;
        await POST(req);
        expect(insertMockVotes).toHaveBeenCalled();
        expect(valuesMock).toHaveBeenCalled();
        expect(returningMock).toHaveBeenCalled();
        expect(mockNextResponseJson_votes).toHaveBeenCalledWith([{ id: 'v2' }], { status: 201 });
    });
});
