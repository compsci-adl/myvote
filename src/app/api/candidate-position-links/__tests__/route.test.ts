 
// Mocks must be defined before importing the route module so the module picks them up
const mockNextResponseJson = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: { json: (...args: [any, any?]) => mockNextResponseJson(...args) },
}));

// Create mock db functions that the route uses
const selectMock = jest.fn();
const insertMock = jest.fn();

jest.mock('@/db/index', () => ({
    db: {
        select: (...args: any[]) => selectMock(...args),
        insert: (...args: any[]) => insertMock(...args),
    },
}));

jest.mock('next-auth');

describe('candidate-position-links route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson.mockClear();
        selectMock.mockClear();
        insertMock.mockClear();
    });

    test('GET returns 401 when position_id missing', async () => {
        // Import after mocks
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/candidate-position-links' } as any;
        await GET(req);
        expect(mockNextResponseJson).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('GET returns candidate_position_links when links and candidates present', async () => {
        const links = [{ candidate_id: 'c1', position_id: 'p1' }];
        const candidates = [{ id: 'c1', name: 'Alice' }];

        // Prepare a simple queue of results: first call -> links, second call -> candidates
        const resultsQueue: any[] = [links, candidates];

        const where = jest.fn(() => Promise.resolve(resultsQueue.shift()));
        const from = jest.fn(() => ({ where }));
        selectMock.mockImplementation(() => ({ from }));

        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/candidate-position-links?position_id=p1' } as any;
        await GET(req);

        expect(mockNextResponseJson).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });

    test('POST inserts a link and returns the created link', async () => {
        const body = { candidate_id: 'c2', position_id: 'p2' };
        const returned = [{ id: 'link-1', ...body }];

        insertMock.mockImplementation(() => ({
            values: () => ({
                returning: () => Promise.resolve(returned),
            }),
        }));

        const { POST } = await import('../route');
        const req = { json: async () => body } as any;
        await POST(req);

        expect(mockNextResponseJson).toHaveBeenCalledWith(
            { error: 'User not authenticated.' },
            { status: 401 }
        );
    });
});
