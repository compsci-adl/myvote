'use client';

import { Accordion, AccordionItem } from '@heroui/react';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { setRefs } from '@/constants/refs';
import { useMount } from '@/hooks/use-mount';
import { fetcher } from '@/lib/fetcher';
import type { Candidate } from '@/types/candidate';

// Create a simple store for focused users since we don't have the original store
const useFocusedUsers = () => ({ focusedUsers: [] });

export default function CandidatesPage() {
    // const { data: session } = useSession();
    const { focusedUsers } = useFocusedUsers();
    const r = useRef(new Map());
    setRefs(r);

    interface Position {
        id: string;
        name: string;
    }

    interface CandidateLink {
        candidate_id: string;
        position_id: string;
    }

    const [firstElection, setFirstElection] = useState<{
        id?: number;
        status?: number;
    }>({});
    const [candidates, setCandidates] = useState<
        Record<string, Candidate & { positions: string[] }>
    >({});
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [message, setMessage] = useState('');

    // Elections API returns array of elections
    const fetchElections = useSWRMutation('/elections', fetcher.get.mutate, {
        onSuccess: (data) => {
            const votingElection = (data || []).find(
                (e: { id: string; status: string }) => e.status === 'Voting'
            );
            if (votingElection) {
                setFirstElection(votingElection);
            } else {
                setMessage('No open elections available.');
            }
        },
    });

    // Cache for requests to avoid loops
    const requestedKeys = useRef<{ positions?: string; candidates?: string; links?: string }>({});

    // Fetch all positions for the election
    const { data: positionsData } = useSWR(
        firstElection.id ? `/api/positions?election_id=${firstElection.id}` : null,
        (url) => fetch(url).then((res) => res.json())
    );
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
        }
    }, [positionsData]);

    // Fetch all candidates and their positions for the election
    useEffect(() => {
        const fetchAllCandidatesAndLinks = async () => {
            if (!firstElection.id || Object.keys(positions).length === 0) return;
            // Aggregate candidates and their positions
            const candidateMap: Record<string, Candidate & { positions: string[] }> = {};
            for (const posId of Object.keys(positions)) {
                const res = await fetch(`/api/candidate-position-links?position_id=${posId}`);
                const data = await res.json();
                if (Array.isArray(data.candidate_position_links)) {
                    for (const link of data.candidate_position_links) {
                        const candidate = link.candidate;
                        if (!candidate) continue;
                        if (!candidateMap[candidate.id]) {
                            candidateMap[candidate.id] = {
                                ...candidate,
                                positions: [positions[posId].name],
                            };
                        } else {
                            candidateMap[candidate.id].positions.push(positions[posId].name);
                        }
                    }
                }
            }
            setCandidates(candidateMap);
        };
        fetchAllCandidatesAndLinks();
    }, [firstElection.id, positions]);

    useMount(() => {
        fetchElections.trigger();
    });

    useEffect(() => {
        if (!firstElection.id) return;
        if (firstElection.status && firstElection.status < 3) {
            setMessage("Voting hasn't opened yet.");
        } else if (firstElection.status && firstElection.status > 3) {
            setMessage('Voting has closed.');
        } else {
            setMessage('');
        }
    }, [firstElection]);

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="mb-8 text-center text-3xl font-bold">Candidates</h1>
            <div className="flex items-center justify-center">
                {message ? (
                    <div className="flex min-h-screen items-center justify-center">
                        <p className="text-center text-xl">{message}</p>
                    </div>
                ) : (
                    <Accordion defaultExpandedKeys={focusedUsers} className="w-full max-w-4xl">
                        {Object.values(candidates).map((c) => (
                            <AccordionItem
                                id={c.id.toString()}
                                key={c.id}
                                title={c.name}
                                aria-label={c.name}
                                subtitle={c.positions?.join(', ') || 'No positions'}
                            >
                                <p
                                    ref={(el) => {
                                        if (el) r.current.set(c.id, el);
                                    }}
                                >
                                    {c.statement}
                                </p>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
