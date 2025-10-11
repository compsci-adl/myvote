'use client';

import { Code } from '@heroui/react';
import { useEffect } from 'react';

export const Error = () => {
    const errorMessage =
        'An unexpected error occurred. Please try again or contact a committee member.';

    useEffect(() => {
        // Clear local data to reset the app
        if (window && window.localStorage) {
            // Clear only app-specific keys
            Object.keys(localStorage).forEach((key) => {
                if (key.startsWith('myvote_')) {
                    localStorage.removeItem(key);
                }
            });
        }
    }, []);

    return (
        <div className="mx-2 flex h-dvh flex-col items-center justify-center gap-2">
            <h1 className="text-4xl">Oops... Something went wrong!</h1>
            <p>
                We&apos;re sorry, but we need to clear all saved data for this website (including
                all in-progress voting).
            </p>
            <Code size="lg" className="max-w-full overflow-x-auto p-2">
                <span className="font-bold">Error Message:</span> <br />
                {errorMessage}
            </Code>
        </div>
    );
};
