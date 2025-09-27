'use client';

import { Code } from '@heroui/react';
import { useEffect } from 'react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export const Error = ({ error }: ErrorProps) => {
    const errorMessage = String(error);

    useEffect(() => {
        // Clear local data to reset the app
        localStorage.clear();
    }, []);

    return (
        <div className="mx-2 flex h-dvh flex-col items-center justify-center gap-2">
            <h1 className="text-4xl">Oops... Something went wrong!</h1>
            <p>
                We're sorry, but we need to clear all saved data for this website (including all
                in-progress voting).
            </p>
            <Code size="lg" className="max-w-full overflow-x-auto p-2">
                <span className="font-bold">Error Message:</span> <br />
                {errorMessage}
            </Code>
        </div>
    );
};
