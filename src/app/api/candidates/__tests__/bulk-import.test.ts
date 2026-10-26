const mockNextResponseJson_candidateImport = jest.fn((body: unknown, init?: unknown) => ({
    body,
    init,
}));
const mockSelectWhere_candidateImport = jest.fn();
const mockTransaction_candidateImport = jest.fn();
const mockTxInsert_candidateImport = jest.fn();
const mockInsertValues_candidateImport = jest.fn();

jest.mock('next/server', () => ({
    NextResponse: {
        json: (...args: [unknown, unknown?]) => mockNextResponseJson_candidateImport(...args),
    },
}));

jest.mock('@/auth', () => ({
    auth: async () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/db/index', () => ({
    db: {
        select: () => ({
            from: () => ({
                where: (...args: unknown[]) => mockSelectWhere_candidateImport(...args),
            }),
        }),
        transaction: (...args: unknown[]) => mockTransaction_candidateImport(...args),
    },
}));

describe('bulk candidate import route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_candidateImport.mockClear();
        mockSelectWhere_candidateImport.mockReset();
        mockTransaction_candidateImport.mockReset();
        mockTxInsert_candidateImport.mockReset();
        mockInsertValues_candidateImport.mockReset();
        mockSelectWhere_candidateImport.mockResolvedValue([{ id: 'p1', name: 'President' }]);
        mockTransaction_candidateImport.mockImplementation(async (callback) =>
            callback({ insert: mockTxInsert_candidateImport })
        );
        mockTxInsert_candidateImport.mockImplementation(() => ({
            values: (rows: Record<string, unknown>[]) => {
                mockInsertValues_candidateImport(rows);
                return {
                    onConflictDoUpdate: () => ({
                        returning: async () =>
                            rows.map((row) => ({
                                ...row,
                                id: row.id === undefined ? 'candidate-1' : row.id,
                            })),
                    }),
                    onConflictDoNothing: async () => rows,
                };
            },
        }));
    });

    test('creates candidates and their position links in one transaction', async () => {
        const { POST } = await import('../[id]/route');
        const req = {
            url: 'http://localhost/api/candidates/election-1',
            json: async () => [
                {
                    name: 'Candidate One',
                    statement: 'Statement',
                    nominations: ['President'],
                },
            ],
        } as never;

        await POST(req);

        expect(mockTransaction_candidateImport).toHaveBeenCalledTimes(1);
        expect(mockTxInsert_candidateImport).toHaveBeenCalledTimes(2);
        expect(mockInsertValues_candidateImport).toHaveBeenNthCalledWith(
            2,
            [expect.objectContaining({ position_id: 'p1' })]
        );
        expect(mockNextResponseJson_candidateImport).toHaveBeenCalledWith(
            [expect.objectContaining({ name: 'Candidate One' })],
            { status: 201 }
        );
    });

    test('rejects nominations for positions outside the election', async () => {
        mockSelectWhere_candidateImport.mockResolvedValue([]);
        const { POST } = await import('../[id]/route');
        const req = {
            url: 'http://localhost/api/candidates/election-1',
            json: async () => [{ name: 'Candidate One', nominations: ['President'] }],
        } as never;

        await POST(req);

        expect(mockTransaction_candidateImport).not.toHaveBeenCalled();
        expect(mockNextResponseJson_candidateImport).toHaveBeenCalledWith(
            { error: 'Position "President" was not found for this election' },
            { status: 400 }
        );
    });
});
