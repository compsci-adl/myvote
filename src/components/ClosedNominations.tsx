interface Position {
    id: string;
    name: string;
}

type PositionsApiResponse = { positions: Position[] } | Position[];
('use client');

import { Button, Input } from '@heroui/react';
import Papa from 'papaparse';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';

import { usePositions } from './usePositions';

interface ClosedNominationsProps {
    electionId: number;
    setSliderValue: React.Dispatch<React.SetStateAction<number>>;
}

interface Nomination {
    name: string;
    statement: string;
    roles: string;
}

export default function ClosedNominations({ electionId, setSliderValue }: ClosedNominationsProps) {
    const [nominations, setNominations] = useState<Nomination[]>([]);
    const [status, setStatus] = useState({ text: '', type: '' });

    function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target?.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        Papa.parse(file, {
            header: true,
            complete: (results: { data: unknown[] }) => {
                const parsedNominations = results.data.map((row) => {
                    if (
                        typeof row === 'object' &&
                        row !== null &&
                        'Name' in row &&
                        'Statement' in row &&
                        'Roles' in row
                    ) {
                        return {
                            name: (row as { Name: string }).Name,
                            statement: (row as { Statement: string }).Statement,
                            roles: (row as { Roles: string }).Roles,
                        };
                    }
                    return { name: '', statement: '', roles: '' };
                });
                setNominations(parsedNominations);
            },
            error: (error: unknown) => {
                if (error instanceof Error) {
                    console.error('Error parsing CSV:', error.message);
                } else {
                    console.error('Error parsing CSV:', error);
                }
            },
        });
    }

    const updateElectionStatus = useSWRMutation(
        `elections/${electionId}`,
        (url) => fetcher.patch.mutate(url, { arg: { status: 2 } }),
        {
            onError: () => {
                const errorMessage = 'Failed to update election status. Please try again.';
                setStatus({
                    text: errorMessage,
                    type: 'error',
                });
            },
            onSuccess: () => {
                setStatus({
                    text: 'Election status updated successfully!',
                    type: 'success',
                });
                setTimeout(() => {
                    setSliderValue(4);
                }, 3000);
            },
        }
    );

    const { data: positionsData } = usePositions(electionId);
    const handleContinue = async () => {
        setStatus({ text: '', type: '' });
        // Client-side validation: ensure every candidate has at least one nomination
        const invalidCandidates = nominations.filter((n) => !n.roles || n.roles.trim() === '');
        if (invalidCandidates.length > 0) {
            setStatus({
                text: 'All candidates must have at least one nomination/role before continuing.',
                type: 'error',
            });
            return;
        }

        // Transform nominations: parse roles into nominations array
        const candidatesWithNominations = nominations.map((n) => ({
            ...n,
            nominations: n.roles
                ? n.roles
                      .split(',')
                      .map((role) => role.trim())
                      .filter((role) => role)
                : [],
        }));

        // Send all candidates to backend in a single array, as required by API
        let createdCandidates;
        try {
            createdCandidates = await fetcher.post.mutate(`candidates/${electionId}`, {
                arg: candidatesWithNominations,
            });
        } catch {
            setStatus({
                text: 'Failed to create candidates. Please try again.',
                type: 'error',
            });
            return;
        }

        if (
            !Array.isArray(createdCandidates) ||
            createdCandidates.length !== candidatesWithNominations.length
        ) {
            setStatus({
                text: 'Candidate creation failed or returned unexpected result.',
                type: 'error',
            });
            return;
        }

        // Fetch positions for this election
        // positionsData is expected to be { positions: Position[] } or just Position[]
        let positions: Position[] = [];
        if (Array.isArray(positionsData)) {
            positions = positionsData as Position[];
        } else if (
            positionsData &&
            typeof positionsData === 'object' &&
            'positions' in positionsData &&
            Array.isArray((positionsData as { positions: unknown }).positions)
        ) {
            positions = (positionsData as { positions: Position[] }).positions;
        }
        if (!positions.length) {
            setStatus({
                text: 'No positions found for this election.',
                type: 'error',
            });
            return;
        }

        // For each candidate, create candidate-position-links for each nominated role
        for (let i = 0; i < createdCandidates.length; i++) {
            const candidate = createdCandidates[i];
            const nomination = candidatesWithNominations[i];
            if (!candidate || !candidate.id) {
                setStatus({
                    text: `Candidate ID missing for ${nomination.name}.`,
                    type: 'error',
                });
                return;
            }
            for (const roleName of nomination.nominations) {
                const position = positions.find(
                    (p) => p.name.trim().toLowerCase() === roleName.trim().toLowerCase()
                );
                if (!position) {
                    setStatus({
                        text: `Position "${roleName}" not found for candidate ${nomination.name}.`,
                        type: 'error',
                    });
                    return;
                }
                try {
                    await fetcher.post.mutate('candidate-position-links', {
                        arg: { candidate_id: candidate.id, position_id: position.id },
                    });
                } catch {
                    setStatus({
                        text: `Failed to link candidate ${nomination.name} to position ${roleName}.`,
                        type: 'error',
                    });
                    return;
                }
            }
        }

        // Only update election status after all validation and candidate creation logic
        updateElectionStatus.trigger();
    };

    return (
        <div className="mt-8">
            <h1>
                Once the Google Forms is closed, please download the file as a CSV file and upload
                it here. Once uploaded, check the displayed nominations to see if there are any
                errors. If there are no issues, continue to the next stage.
            </h1>
            <Input
                type="file"
                label="Upload CSV"
                accept=".csv"
                className="mt-4"
                onChange={handleFileUpload}
            />
            {nominations.length > 0 && (
                <h2 className="mt-6 text-center text-xl font-semibold">Nominations</h2>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {nominations.map((nomination, index) => (
                    <div key={index} className="flex flex-col gap-4 rounded-xl bg-gray-200 p-4">
                        <p>
                            <strong>Name:</strong> {nomination.name}
                        </p>
                        <p>
                            <strong>Roles:</strong> {nomination.roles}
                        </p>
                        <p>
                            <strong>Statement:</strong> {nomination.statement}
                        </p>
                    </div>
                ))}
            </div>
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
