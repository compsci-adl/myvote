'use client';

import { Button } from '@heroui/react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Suspense } from 'react';

function AuthErrorContent() {
    const searchParams = useSearchParams();
    const error = searchParams.get('error');

    const getErrorMessage = (error: string | null) => {
        switch (error) {
            case 'Configuration':
                return 'There is a problem with the server configuration.';
            case 'AccessDenied':
                return 'Access denied. You do not have permission to sign in.';
            case 'Verification':
                return 'The verification token has expired or has already been used.';
            default:
                return 'An authentication error occurred.';
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <img src="/favicon.svg" alt="MyVote Logo" className="mb-4 h-24 w-24" />
            <h1 className="mb-4 text-4xl font-bold">Authentication Error</h1>
            <p className="mb-8 text-lg text-center max-w-md">{getErrorMessage(error)}</p>
            <Button color="primary" size="lg" onPress={() => signIn('keycloak')}>
                Try Again
            </Button>
        </div>
    );
}

export default function AuthError() {
    return (
        <Suspense fallback={null}>
            <AuthErrorContent />
        </Suspense>
    );
}
