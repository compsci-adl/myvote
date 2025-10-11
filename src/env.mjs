import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const isDev = process.env.NODE_ENV === 'development';

export const env = createEnv({
    server: {
        NEXTAUTH_URL: z.url().min(1).optional(),
        AUTH_SECRET: z.string().min(1).optional(),
        KEYCLOAK_CLIENT_ID: z.string().min(1).optional(),
        KEYCLOAK_CLIENT_SECRET: z.string().min(1).optional(),
        KEYCLOAK_ISSUER: z.url().min(1).optional(),
        DATABASE_URL: z.string().min(1),
        DATABASE_AUTH_TOKEN: isDev ? z.string().optional() : z.string().min(1),
        MEMBER_DATABASE_URL: z.string().min(1).optional(),
        MEMBER_DATABASE_AUTH_TOKEN: z.string().optional(),
        NEXT_PUBLIC_FEEDBACK_FORM_URL: z.string().url().min(1).optional(),
    },
    experimental__runtimeEnv: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
        KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
        KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
        KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
        MEMBER_DATABASE_URL: process.env.MEMBER_DATABASE_URL,
        MEMBER_DATABASE_AUTH_TOKEN: process.env.MEMBER_DATABASE_AUTH_TOKEN,
        NEXT_PUBLIC_FEEDBACK_FORM_URL: process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL,
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION,
});
