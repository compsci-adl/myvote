import ky, { ResponsePromise } from 'ky';

const kyInstance = ky.create({
    prefixUrl: '/api/',
});

const METHODS = ['get', 'post', 'put', 'delete', 'patch'] as const;
type Methods = (typeof METHODS)[number];

type Fetcher = {
    [Method in Methods]: {
        query: (args: Parameters<(typeof kyInstance)[Method]>) => Promise<unknown>;
        mutate: (url: string, { arg }: { arg: unknown }) => Promise<unknown>;
    };
};

export const fetcher = METHODS.reduce(
    (acc, method) => ({
        ...acc,
        [method]: {
            query: async (args: unknown[]) => {
                // Remove leading slash from first arg if using prefixUrl
                if (typeof args[0] === 'string' && args[0].startsWith('/')) {
                    args[0] = args[0].slice(1);
                }
                // Type assertion for kyInstance[method]
                const methodFn = kyInstance[method] as (...args: unknown[]) => ResponsePromise;
                return await methodFn(...args).json();
            },
            mutate: async (url: string, { arg }: { arg: unknown }) => {
                // Remove leading slash from url if using prefixUrl
                const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
                return await kyInstance[method](cleanUrl, { json: arg }).json();
            },
        },
    }),
    {} as Fetcher
);
