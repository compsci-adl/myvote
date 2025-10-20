'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';

interface OpenVotingProps {
    electionId: string;
    setSliderValue: React.Dispatch<React.SetStateAction<number>>;
}

export default function OpenVoting({ electionId, setSliderValue }: OpenVotingProps) {
    const [status, setStatus] = useState({ text: '', type: '' });

    const updateElectionStatus = useSWRMutation(
        `elections/${electionId}`,
        (url) => fetcher.patch.mutate(url, { arg: { status: 3 } }),
        {
            onError: () => {
                setStatus({
                    text: 'Failed to update election status. Please try again.',
                    type: 'error',
                });
            },
            onSuccess: () => {
                setStatus({
                    text: 'Election status updated successfully!',
                    type: 'success',
                });
                setTimeout(() => {
                    setSliderValue(5);
                }, 3000);
            },
        }
    );

    const handleContinue = async () => {
        setStatus({ text: '', type: '' });
        updateElectionStatus.trigger();
    };

    return (
        <div className="mt-8">
            <h1>Once you are ready to open voting, click the button below to open voting.</h1>
            <div className="mt-8 flex justify-center">
                <Button color="primary" onPress={handleContinue}>
                    Continue
                </Button>
            </div>
            {status.text && (
                <div
                    className={`mt-4 text-center ${status.type === 'error' ? 'text-red-500' : 'text-green-500'}`}
                >
                    {status.text}
                </div>
            )}
        </div>
    );
}
