'use client';

import { Button } from '@heroui/react';
import { signIn } from 'next-auth/react';

export default function SignIn() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <img src="/favicon.svg" alt="MyVote Logo" className="mb-4 h-24 w-24" />
            <h1 className="mb-4 text-4xl font-bold">Sign In to MyVote</h1>
            <p className="mb-8 text-lg text-center">
                Please sign in with your Computer Science Club account to access the voting system.
            </p>
            <Button
                color="primary"
                size="lg"
                onPress={() => signIn('keycloak', { callbackUrl: '/voting' })}
            >
                Sign In with Keycloak
            </Button>
        </div>
    );
}
