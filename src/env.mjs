import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const isDev = process.env.NODE_ENV === 'development';

export const env = createEnv({
    server: {
        AUTH_KEYCLOAK_ID: z.string().min(1).optional(),
        AUTH_KEYCLOAK_SECRET: z.string().min(1).optional(),
        AUTH_REALM: z.string().min(1).optional(),
        DATABASE_URL: z.string().min(1),
        DATABASE_AUTH_TOKEN: isDev ? z.string().optional() : z.string().min(1),
    },
    client: {
        NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI: z.string().url().min(1).optional(),
        NEXT_PUBLIC_CONTAINER_KEYCLOAK_ENDPOINT: z.string().url().min(1).optional(),
        NEXT_PUBLIC_LOCAL_KEYCLOAK_URL: z.string().url().min(1).optional(),
    },
    experimental__runtimeEnv: {
        NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI: process.env.NEXT_PUBLIC_KEYCLOAK_REDIRECT_URI,
        NEXT_PUBLIC_CONTAINER_KEYCLOAK_ENDPOINT:
            process.env.NEXT_PUBLIC_CONTAINER_KEYCLOAK_ENDPOINT,
        NEXT_PUBLIC_LOCAL_KEYCLOAK_URL: process.env.NEXT_PUBLIC_LOCAL_KEYCLOAK_URL,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION,
});
