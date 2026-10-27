const mockJson_bulkImport = jest.fn((body: unknown, init?: unknown) => ({ body, init }));
const mockPositionQuery_bulkImport = jest.fn();
const mockTransaction_bulkImport = jest.fn();
const mockTxInsert_bulkImport = jest.fn();
const mockValues_bulkImport = jest.fn();
const mockClearPattern_bulkImport = jest.fn();

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, unknown?]) => mockJson_bulkImport(...args),
    },
}));

jest.mock('@/auth', () => ({
    auth: async () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/db/index', () => ({
    db: {
        select: () => ({
            from: () => ({
                where: (...args: unknown[]) => mockPositionQuery_bulkImport(...args),
            }),
        }),
        transaction: (...args: unknown[]) => mockTransaction_bulkImport(...args),
    },
}));

jest.mock('@/lib/server-cache', () => ({
    serverCache: { clearPattern: (...args: unknown[]) => mockClearPattern_bulkImport(...args) },
}));

describe('bulk candidate import route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockJson_bulkImport.mockClear();
        mockPositionQuery_bulkImport.mockReset();
        mockTransaction_bulkImport.mockReset();
        mockTxInsert_bulkImport.mockReset();
        mockValues_bulkImport.mockReset();
        mockClearPattern_bulkImport.mockReset();

        mockPositionQuery_bulkImport.mockResolvedValue([
            { id: 'position-1', name: 'President' },
            { id: 'position-2', name: 'Secretary' },
        ]);
        mockTransaction_bulkImport.mockImplementation(async (callback) =>
            callback({ insert: mockTxInsert_bulkImport })
        );
        mockTxInsert_bulkImport.mockImplementation(() => ({
            values: (rows: Record<string, unknown>[]) => {
                mockValues_bulkImport(rows);
                return {
                    onConflictDoUpdate: () => ({
                        returning: async () => rows,
                    }),
                    onConflictDoNothing: async () => [],
                };
            },
        }));
    });

    test('inserts candidates and position links together in one transaction', async () => {
        const { POST } = await import('../[id]/route');
        const req = {
            url: 'http://localhost/api/candidates/election-1',
            json: async () => [
                { name: 'Candidate One', statement: 'Statement', nominations: ['President'] },
            ],
        } as never;

        await POST(req);

        expect(mockTransaction_bulkImport).toHaveBeenCalledTimes(1);
        expect(mockValues_bulkImport).toHaveBeenCalledTimes(2);
        const [candidate] = mockValues_bulkImport.mock.calls[0][0];
        expect(mockValues_bulkImport.mock.calls[1][0]).toEqual([
            { candidate_id: candidate.id, position_id: 'position-1' },
        ]);
        expect(mockClearPattern_bulkImport).toHaveBeenCalledWith(
            /^candidate-position-links:/
        );
        expect(mockJson_bulkImport).toHaveBeenCalledWith([candidate], { status: 201 });
    });

    test('merges nominations from duplicate candidate rows', async () => {
        const { POST } = await import('../[id]/route');
        const req = {
            url: 'http://localhost/api/candidates/election-1',
            json: async () => [
                { name: 'Candidate One', nominations: ['President'] },
                { name: 'Candidate One', nominations: ['Secretary'] },
            ],
        } as never;

        await POST(req);

        expect(mockValues_bulkImport).toHaveBeenCalledTimes(2);
        const [candidate] = mockValues_bulkImport.mock.calls[0][0];
        expect(mockValues_bulkImport.mock.calls[1][0]).toEqual(
            expect.arrayContaining([
                { candidate_id: candidate.id, position_id: 'position-1' },
                { candidate_id: candidate.id, position_id: 'position-2' },
            ])
        );
    });

    test('rejects nominations for positions outside the election', async () => {
        mockPositionQuery_bulkImport.mockResolvedValue([]);
        const { POST } = await import('../[id]/route');
        const req = {
            url: 'http://localhost/api/candidates/election-1',
            json: async () => [{ name: 'Candidate One', nominations: ['President'] }],
        } as never;

        await POST(req);

        expect(mockTransaction_bulkImport).not.toHaveBeenCalled();
        expect(mockJson_bulkImport).toHaveBeenCalledWith(
            { error: 'Position "President" was not found for this election' },
            { status: 400 }
        );
    });
});
