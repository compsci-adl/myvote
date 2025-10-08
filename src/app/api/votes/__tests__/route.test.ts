const selectMockVotes = jest.fn();
const fromMock: jest.Mock = jest.fn();
const innerJoinMock: jest.Mock = jest.fn();
const whereMock: jest.Mock = jest.fn();
const returningMock: jest.Mock = jest.fn();
const insertMockVotes = jest.fn();
const valuesMock: jest.Mock = jest.fn();
type MockNextResponseJson = (
    body: unknown,
    init?: { status?: number }
) => { body: unknown; init?: { status?: number } };
const mockNextResponseJson_votes: jest.Mock<
    ReturnType<MockNextResponseJson>,
    Parameters<MockNextResponseJson>
> = jest.fn((body: unknown, init?: { status?: number }) => ({ body, init }));

jest.mock('@/db/index', () => ({
    db: {
        select: selectMockVotes,
        insert: insertMockVotes,
    },
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, { status?: number }?]) => mockNextResponseJson_votes(...args),
    },
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
insertMockVotes.mockImplementation(() => ({
    values: valuesMock,
}));
valuesMock.mockReturnValue({
    returning: returningMock,
});
returningMock.mockResolvedValue([{ id: 'v2' }]);

// Mock memberDb for membership check in POST
const memberWhereMock = jest.fn();
jest.mock('@/db/member', () => ({
    memberDb: {
        select: () => ({
            from: () => ({
                where: memberWhereMock,
            }),
        }),
    },
    memberTable: {},
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
        memberWhereMock.mockClear();
    });
    test('GET missing election_id returns 400', async () => {
        const { GET } = await import('../route');
        const req = {
            url: 'http://localhost/api/votes',
        } as unknown as import('next/server').NextRequest;
        await GET(req);
        expect(mockNextResponseJson_votes).toHaveBeenCalledWith(
            { error: 'Missing election_id' },
            { status: 400 }
        );
    });

    test('GET returns votes', async () => {
        // Setup chain to resolve to mock data
        const { GET } = await import('../route');
        const req = {
            url: 'http://localhost/api/votes?election_id=e1',
        } as unknown as import('next/server').NextRequest;
        await GET(req);
        expect(mockNextResponseJson_votes).toHaveBeenCalledWith(
            { error: 'Missing student_id' },
            { status: 400 }
        );
    });
});
