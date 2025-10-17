'use client';

import { Accordion, AccordionItem } from '@heroui/react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '@/lib/fetcher';
import type { Position } from '@/types/position';

export default function PositionsPage() {
    const [firstElection, setFirstElection] = useState<{ id?: number; status?: number }>({});
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    // Fetch elections and get the first with Voting status
    const fetchElections = useSWRMutation('/elections', fetcher.get.mutate, {
        onSuccess: (data) => {
            const votingElection = Array.isArray(data)
                ? data.find((e: { id: string; status: string }) => e.status === 'Voting')
                : undefined;
            if (votingElection) {
                setFirstElection(votingElection);
            } else {
                setMessage('No open elections available.');
            }
        },
    });

    // Fetch all positions for the election
    const { data: positionsData } = useSWR(
        firstElection.id ? `/api/positions?election_id=${firstElection.id}` : null,
        (url) => fetch(url).then((res) => res.json())
    );

    useEffect(() => {
        fetchElections.trigger();
    }, []);

    useEffect(() => {
        if (positionsData && Array.isArray(positionsData.positions)) {
            const positionMap = positionsData.positions.reduce(
                (acc: Record<string, Position>, pos: Position) => {
                    acc[pos.id] = pos;
                    return acc;
                },
                {}
            );
            setPositions(positionMap);
            setLoading(false);
        } else if (positionsData && positionsData.message) {
            setMessage(positionsData.message);
            setLoading(false);
        }
    }, [positionsData]);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="mb-8 text-center text-3xl font-bold">Positions</h1>
            <div className="flex items-center justify-center">
                {message ? (
                    <div className="flex min-h-screen items-center justify-center">
                        <p className="text-center text-xl">{message}</p>
                    </div>
                ) : loading ? (
                    <div className="w-full max-w-4xl">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="py-6 border-b-gray-300 border-b-1">
                                <div className="flex flex-row items-center gap-4 animate-pulse">
                                    <div className="flex-1">
                                        <div className="h-7 w-56 bg-gray-200 rounded mb-1"></div>
                                        <div className="h-5 w-40 bg-gray-100 rounded"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Accordion className="w-full max-w-4xl">
                        {Object.values(positions)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((pos) => (
                                <AccordionItem
                                    id={pos.id.toString()}
                                    key={pos.id}
                                    title={
                                        <span className={pos.executive ? 'text-orange-700' : ''}>
                                            {pos.name}
                                        </span>
                                    }
                                    aria-label={pos.name}
                                    subtitle={pos.executive ? 'Executive Position' : ''}
                                >
                                    <p>{pos.description}</p>
                                </AccordionItem>
                            ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
