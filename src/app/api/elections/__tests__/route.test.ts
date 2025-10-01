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

describe('elections route', () => {
    beforeEach(() => {
        jest.resetModules();
        mockNextResponseJson_elections.mockClear();
        selectMock_elections.mockClear();
        insertMock_elections.mockClear();
        updateMock_elections.mockClear();
    });

    test('GET returns elections', async () => {
        const data = [{ id: 'e1', name: 'Election 1' }];
        selectMock_elections.mockImplementation(() => ({ from: async () => data }));
        const route = await import('../route');
        await route.GET();
        expect(selectMock_elections).toHaveBeenCalled();
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(data, { status: 200 });
    });

    test('POST missing name returns 400', async () => {
        const route = await import('../route');
        const req = { json: async () => ({}) } as any;
        await route.POST(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'Missing name' },
            { status: 400 }
        );
    });

    test('POST inserts and returns 201', async () => {
        const returned = [{ id: 'e2', name: 'New' }];
        insertMock_elections.mockImplementation(() => ({
            values: () => ({ returning: () => Promise.resolve(returned) }),
        }));
        const route = await import('../route');
        const req = { json: async () => ({ name: 'New' }) } as any;
        await route.POST(req);
        expect(insertMock_elections).toHaveBeenCalled();
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(returned[0], {
            status: 201,
        });
    });

    test('PATCH missing id returns 400', async () => {
        const route = await import('../route');
        const req = {
            url: 'http://localhost/api/elections/',
            json: async () => ({ name: 'x' }),
        } as any;
        await route.PATCH(req);
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(
            { error: 'Missing id' },
            { status: 400 }
        );
    });

    test('PATCH updates and returns 200', async () => {
        const updated = [{ id: 'e3', name: 'Updated' }];
        updateMock_elections.mockImplementation(() => ({
            set: () => ({ where: () => ({ returning: () => Promise.resolve(updated) }) }),
        }));
        const route = await import('../route');
        const req = {
            url: 'http://localhost/api/elections/e3',
            json: async () => ({ name: 'Updated' }),
        } as any;
        await route.PATCH(req);
        expect(updateMock_elections).toHaveBeenCalled();
        expect(mockNextResponseJson_elections).toHaveBeenCalledWith(updated[0], {
            status: 200,
        });
    });
});
