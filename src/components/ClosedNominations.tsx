'use client';

import { Button, Input } from '@heroui/react';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';

import { usePositions } from './usePositions';

interface Position {
    id: string;
    name: string;
}

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
    const [nonExecNominations, setNonExecNominations] = useState<Nomination[]>([]);
    const [execNominations, setExecNominations] = useState<Nomination[]>([]);
    const [mergedNominations, setMergedNominations] = useState<Nomination[]>([]);
    const [status, setStatus] = useState({ text: '', type: '' });

    useEffect(() => {
        const map = new Map<string, Nomination>();
        [...nonExecNominations, ...execNominations].forEach((nom) => {
            if (map.has(nom.name)) {
                const existing = map.get(nom.name)!;
                const existingRoles = existing.roles.split(', ').filter((r) => r);
                const newRoles = nom.roles.split(', ').filter((r) => r);
                const combinedRoles = Array.from(new Set([...existingRoles, ...newRoles])).join(', ');
                const combinedStatement = existing.statement === nom.statement ? nom.statement : [existing.statement, nom.statement].filter((s) => s).join('\n\n');
                map.set(nom.name, {
                    name: nom.name,
                    roles: combinedRoles,
                    statement: combinedStatement,
                });
            } else {
                map.set(nom.name, nom);
            }
        });
        setMergedNominations(Array.from(map.values()));
    }, [nonExecNominations, execNominations]);

    function handleNonExecUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target?.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        Papa.parse(file, {
            header: true,
            complete: (results: { data: unknown[] }) => {
                const parsedNominations = results.data
                    .map((row) => {
                        if (
                            typeof row === 'object' &&
                            row !== null &&
                            'First Name' in row &&
                            'Last Name' in row &&
                            'What committee positions are you nominating for?' in row &&
                            'Tell us a bit about yourself and why you are nominating for a committee position!' in row
                        ) {
                            const rowData = row as Record<string, string>;
                            const firstName = rowData['First Name'];
                            const lastName = rowData['Last Name'];
                            const rolesRaw = rowData['What committee positions are you nominating for?'];
                            const roles = rolesRaw.split(',').map(r => r.trim().replace(/\s*\*$/, '')).filter(r => r).join(', ');
                            const statement = rowData['Tell us a bit about yourself and why you are nominating for a committee position!'];
                            return {
                                name: `${firstName} ${lastName}`,
                                statement: statement,
                                roles: roles,
                            };
                        }
                        return null;
                    })
                    .filter((n): n is Nomination => n !== null);
                setNonExecNominations(parsedNominations);
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

    function handleExecUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target?.files?.[0];
        if (!file) {
            console.error('No file selected');
            return;
        }

        Papa.parse(file, {
            header: true,
            complete: (results: { data: unknown[] }) => {
                const parsedNominations = results.data
                    .map((row) => {
                        if (
                            typeof row === 'object' &&
                            row !== null &&
                            'First Name' in row &&
                            'Last Name' in row &&
                            'What executive positions are you nominating for?' in row &&
                            'Tell us a bit about yourself and why you are nominating for an executive committee position!' in row
                        ) {
                            const rowData = row as Record<string, string>;
                            const firstName = rowData['First Name'];
                            const lastName = rowData['Last Name'];
                            const rolesRaw = rowData['What executive positions are you nominating for?'];
                            const roles = rolesRaw.split(',').map(r => r.trim().replace(/\s*\*$/, '')).filter(r => r).join(', ');
                            const statement = rowData['Tell us a bit about yourself and why you are nominating for an executive committee position!'];
                            return {
                                name: `${firstName} ${lastName}`,
                                statement: statement,
                                roles: roles,
                            };
                        }
                        return null;
                    })
                    .filter((n): n is Nomination => n !== null);
                setExecNominations(parsedNominations);
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
        const invalidCandidates = mergedNominations.filter((n) => !n.roles || n.roles.trim() === '');
        if (invalidCandidates.length > 0) {
            setStatus({
                text: 'All candidates must have at least one nomination/role before continuing.',
                type: 'error',
            });
            return;
        }

        // Transform nominations: parse roles into nominations array
        const candidatesWithNominations = mergedNominations.map((n) => ({
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
                Once the Google Forms are closed, please download the non-exec and exec nomination
                files as CSV files and upload them here. Once uploaded, check the displayed
                nominations to see if there are any errors. If there are no issues, continue to the
                next stage.
            </h1>
            <div className="mt-4 flex gap-4">
                <Input
                    type="file"
                    label="Upload Non-Exec CSV"
                    accept=".csv"
                    onChange={handleNonExecUpload}
                />
                <Input
                    type="file"
                    label="Upload Exec CSV"
                    accept=".csv"
                    onChange={handleExecUpload}
                />
            </div>
            {mergedNominations.length > 0 && (
                <h2 className="mt-6 text-center text-xl font-semibold">Nominations</h2>
            )}
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {mergedNominations.map((nomination, index) => (
                    <div
                        key={index}
                        className="flex flex-col gap-4 rounded-xl bg-gray-200 dark:bg-gray-900 p-4"
                    >
                        <p>
                            <strong>Name:</strong> {nomination.name}
                        </p>
                        <p>
                            <strong>Roles:</strong> {nomination.roles}
                        </p>
                        <p>
                            <strong>Statement:</strong>
                        </p>
                        <p className="whitespace-pre-line">
                            {nomination.statement.replace(/^-\s*/gm, '• ')}
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
