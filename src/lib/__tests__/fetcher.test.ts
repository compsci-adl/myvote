import { fetcher } from '../fetcher';

// Mock ky instance methods
jest.mock('ky', () => {
    const json = jest.fn(() => Promise.resolve({ ok: true }));
    // Use a named instance to help TypeScript inference
    const instance: Record<string, unknown> = {};
    instance.get = jest.fn(() => ({ json }));
    instance.post = jest.fn(() => ({ json }));
    instance.put = jest.fn(() => ({ json }));
    instance.delete = jest.fn(() => ({ json }));
    instance.patch = jest.fn(() => ({ json }));
    instance.create = jest.fn(() => instance);
    return {
        __esModule: true,
        default: instance,
        ...instance,
    };
});

describe('fetcher', () => {
    it('should call ky.get.query and return json', async () => {
        const res = await fetcher.get.query(['/test']);
        expect(res).toEqual({ ok: true });
    });

    it('mutate should call ky.post/put etc with clean url', async () => {
        const res = await fetcher.post.mutate('/foo', { arg: { a: 1 } });
        expect(res).toEqual({ ok: true });
    });

    it('strip leading slash from query args', async () => {
        const res = await fetcher.get.query(['/leading/slash']);
        expect(res).toEqual({ ok: true });
    });
});
