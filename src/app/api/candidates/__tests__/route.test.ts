/* eslint-disable @typescript-eslint/no-explicit-any */
const mockNextResponseJson_candidates = jest.fn((body: any, init?: any) => ({ body, init }));

jest.mock('next/server', () => ({
    NextResponse: { json: (...args: [any, any?]) => mockNextResponseJson_candidates(...args) },
}));

const selectMock_candidates = jest.fn();
const insertMock_candidates = jest.fn();

jest.mock('@/db/index', () => ({
    db: {
        select: () => selectMock_candidates(),
        insert: () => insertMock_candidates(),
    },
}));

describe('candidates route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_candidates.mockClear();
        selectMock_candidates.mockClear();
        insertMock_candidates.mockClear();
    });

    test('GET missing election_id returns 400', async () => {
        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/candidates' } as any;
        await GET(req);
        expect(mockNextResponseJson_candidates).toHaveBeenCalledWith(
            { error: 'Missing election_id' },
            { status: 400 }
        );
    });

    test('GET returns candidates with nominations', async () => {
        const candidateRows = [{ id: 'c1', name: 'A' }];
        const positionRows = [{ id: 'p1' }];
        const links = [{ candidate_id: 'c1', position_id: 'p1' }];

        // select called for candidates and positions and links
        let call = 0;
        selectMock_candidates.mockImplementation(() => ({
            from: () => ({
                where: async () => {
                    call++;
                    if (call === 1) return candidateRows;
                    if (call === 2) return positionRows;
                    return links;
                },
            }),
        }));

        const { GET } = await import('../route');
        const req = { url: 'http://localhost/api/candidates?election_id=e1' } as any;
        await GET(req);

        expect(mockNextResponseJson_candidates).toHaveBeenCalled();
        const calledWith = mockNextResponseJson_candidates.mock.calls[0][0];
        expect(Array.isArray(calledWith)).toBe(true);
        expect(calledWith[0].nominations).toEqual(['p1']);
    });

    test('POST inserts candidates and links', async () => {
        const returnedCandidate = [{ id: 'c2', name: 'B' }];
        insertMock_candidates.mockImplementation(() => ({
            values: () => ({ returning: () => Promise.resolve(returnedCandidate) }),
        }));

        const { POST } = await import('../route');
        const req = {
            url: 'http://localhost/api/candidates?election_id=e1',
            json: async () => [{ name: 'B', nominations: ['p1'] }],
        } as any;
        await POST(req);

        expect(insertMock_candidates).toHaveBeenCalled();
        expect(mockNextResponseJson_candidates).toHaveBeenCalled();
    });
    // removed unused _args
});
