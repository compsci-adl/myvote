'use client';

import { Button } from '@heroui/react';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../../lib/fetcher';
import type { ElectionStatus } from '../../types/election-status';
import ElectionInfo from './ElectionInfo';
import Positions from './Positions';
import { electionSchema } from './schemas';

interface ElectionSetupProps {
    setSliderValue: (value: number) => void;
    setSelectedElection: React.Dispatch<
        React.SetStateAction<{
            id: number;
            name: string;
            status: ElectionStatus;
        } | null>
    >;
}

const ElectionSetup = ({ setSliderValue, setSelectedElection }: ElectionSetupProps) => {
    const [electionName, setElectionName] = useState('');

    const [errors, setErrors] = useState<{
        electionName?: string;
        positions?: Record<
            number,
            {
                name?: string;
                description?: string;
                vacancies?: string;
                executive?: string;
            }
        >;
    }>({});

    const [positions, setPositions] = useState<
        {
            name: string;
            vacancies: number;
            description: string;
            executive: boolean;
        }[]
    >([{ name: '', vacancies: 1, description: '', executive: false }]);

    const [status, setStatus] = useState({ text: '', type: '' });
    const save = useSWRMutation('elections', fetcher.post.mutate, {
        onError: (error) => {
            const errorMessage =
                error.response?.status === 409
                    ? 'Election with that name already exists.'
                    : 'Failed to create election. Please try again.';
            setStatus({
                text: errorMessage,
                type: 'error',
            });
        },
        onSuccess: async (resp) => {
            setStatus({ text: 'Election created successfully!', type: 'success' });
            setSelectedElection(resp as { id: number; name: string; status: ElectionStatus });
            // POST each position to /api/positions
            for (const pos of positions) {
                await fetcher.post.mutate(`/positions?election_id=${(resp as { id: number }).id}`, {
                    arg: pos,
                });
            }
            setTimeout(() => {
                setSliderValue(2);
            }, 3000);
        },
    });

    const addPosition = () => {
        setPositions([...positions, { name: '', vacancies: 1, description: '', executive: false }]);
    };

    const updatePosition = (
        index: number,
        updatedPosition: {
            name: string;
            vacancies: number;
            description: string;
            executive: boolean;
        }
    ) => {
        setPositions((prevPositions) =>
            prevPositions.map((position, i) => (i === index ? updatedPosition : position))
        );
    };

    const removePosition = (index: number) => {
        setPositions((prevPositions) => prevPositions.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        setStatus({ text: '', type: '' });

        const data = {
            name: electionName,
            positions,
        };

        const result = electionSchema.safeParse(data);

        if (!result.success) {
            const zodErrors: typeof errors = {};
            (
                result.error.issues as Array<{
                    path: (string | number)[];
                    message: string;
                }>
            ).forEach((err) => {
                const [first, index, field] = err.path;
                if (first === 'positions' && typeof index === 'number' && field) {
                    zodErrors.positions = zodErrors.positions || {};
                    zodErrors.positions[index] = zodErrors.positions[index] || {};
                    zodErrors.positions[index][
                        field as keyof (typeof zodErrors.positions)[number]
                    ] = err.message;
                } else {
                    zodErrors[first as keyof typeof zodErrors] = err.message;
                }
            });

            // Check if election name is empty
            if (!data.name) {
                zodErrors.electionName = 'Election name is required';
            }

            setErrors(zodErrors);
            return;
        }

        // Check logical constraints for dates
        const logicalErrors: typeof errors = {};

        // If any logical errors exist, set them and return
        if (Object.keys(logicalErrors).length > 0) {
            setErrors(logicalErrors);
            return;
        }

        // Trigger save if validation passes
        save.trigger(data);
    };

    return (
        <div>
            <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="mx-4 flex-shrink text-lg font-bold">Election Setup</span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>
            <h2 className="mb-4 text-lg font-semibold">Election Info</h2>
            <ElectionInfo
                electionName={electionName}
                setElectionName={setElectionName}
                errors={errors}
            />
            <div className="h-8"></div>
            <Positions
                addPosition={addPosition}
                positions={positions}
                updatePosition={updatePosition}
                removePosition={removePosition}
                errors={errors.positions}
                onCsvImport={setPositions}
            />
            <div className="flex justify-center">
                <Button color="primary" className="mt-4" onPress={handleSubmit}>
                    Create Election
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
};

export default ElectionSetup;
