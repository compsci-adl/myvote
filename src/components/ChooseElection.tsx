'use client';

import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ElectionStatus } from '@/db/schema';
import type { Election } from '@/types/election';

interface ChooseElectionProps {
    setSliderValue: React.Dispatch<React.SetStateAction<number>>;
    selectedElection: Election | null;
    setSelectedElection: React.Dispatch<React.SetStateAction<Election | null>>;
}

export default function ChooseElection({
    setSliderValue,
    selectedElection,
    setSelectedElection,
}: ChooseElectionProps) {
    const router = useRouter();
    const [elections, setElections] = useState<Election[]>([]);
    const [noElections, setNoElections] = useState(false);

    // Fetch elections from API
    const handleSelectExistingElection = async () => {
        try {
            const res = await fetch('/api/elections');
            if (!res.ok) throw new Error('Failed to fetch elections');
            const data = await res.json();
            setElections(data);
            setNoElections(Array.isArray(data) && data.length === 0);
        } catch (error) {
            setNoElections(true);
            console.error('Error fetching elections:', error);
        }
    };

    const handleContinue = async () => {
        if (!selectedElection) return;
        // Always navigate to setup page for selected election
        router.push(`/admin/elections/${selectedElection.id}/setup`);
    };

    const getStatusText = (status: ElectionStatus | string): string => {
        // Accepts both enum and string
        if (typeof status === 'string') {
            const allowed = [
                'PreRelease',
                'Nominations',
                'NominationsClosed',
                'Voting',
                'VotingClosed',
                'ResultsReleased',
            ];
            if (allowed.includes(status)) return status;
            return 'Unknown';
        }
        switch (status) {
            case 'PreRelease':
                return 'PreRelease';
            case 'Nominations':
                return 'Nominations';
            case 'NominationsClosed':
                return 'NominationsClosed';
            case 'Voting':
                return 'Voting';
            case 'VotingClosed':
                return 'VotingClosed';
            case 'ResultsReleased':
                return 'ResultsReleased';
            default:
                return 'Unknown';
        }
    };

    return (
        <div>
            <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="mx-4 flex-shrink text-lg font-bold">Choose Election</span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>
            <div className="mb-4 flex justify-center gap-4">
                <Button color="primary" onPress={() => setSliderValue(1)}>
                    Create New Election
                </Button>
                <Button color="primary" onPress={handleSelectExistingElection}>
                    Select Existing Election
                </Button>
            </div>

            {noElections && (
                <div className="text-center text-lg text-gray-500 mt-4">No elections found.</div>
            )}
            {elections && elections.length > 0 && (
                <div>
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {elections.map((election) => (
                                <div
                                    key={election.id}
                                    className={`cursor-pointer rounded-xl p-4 ${
                                        selectedElection?.id === election.id
                                            ? 'bg-blue-200 dark:bg-blue-400'
                                            : 'bg-gray-200 dark:bg-gray-900'
                                    }`}
                                    onClick={() => setSelectedElection(election)}
                                >
                                    <h3>{election.name}</h3>
                                    <p>Status: {getStatusText(election.status)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {selectedElection && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                color="primary"
                                onPress={handleContinue}
                                isDisabled={!selectedElection}
                            >
                                Continue
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
