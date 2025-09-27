'use client';

import { Accordion, AccordionItem } from '@heroui/react';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { setRefs } from '@/constants/refs';
import { useMount } from '@/hooks/use-mount';
import { fetcher } from '@/lib/fetcher';
import type { Candidate } from '@/types/candidate';

// Create a simple store for focused users since we don't have the original store
const useFocusedUsers = () => ({ focusedUsers: [] });

export default function CandidatesPage() {
    const { data: session } = useSession();
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
    const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [message, setMessage] = useState('');
    const [candidateLinks, setCandidateLinks] = useState<CandidateLink[]>([]);

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

    // Positions API expects ?election_id=...
    const fetchPositions = useSWRMutation(
        firstElection.id ? `/positions?election_id=${firstElection.id}` : null,
        fetcher.get.mutate,
        {
            onSuccess: (data) => {
                // API returns array of positions
                const key = `/positions?election_id=${firstElection.id}`;
                if (requestedKeys.current.positions === key) return;
                requestedKeys.current.positions = key;
                const positionMap = (data || []).reduce(
                    (acc: Record<string, Position>, pos: Position) => {
                        acc[pos.id] = pos;
                        return acc;
                    },
                    {}
                );
                setPositions(positionMap);
            },
        }
    );

    // Candidates API expects ?election_id=...
    const fetchCandidates = useSWRMutation(
        firstElection.id ? `/candidates?election_id=${firstElection.id}` : null,
        fetcher.get.mutate,
        {
            onSuccess: (data) => {
                const key = `/candidates?election_id=${firstElection.id}`;
                if (requestedKeys.current.candidates === key) return;
                requestedKeys.current.candidates = key;
                if (Array.isArray(data)) {
                    setCandidates((prev) => ({
                        ...prev,
                        [firstElection.id as number]: data,
                    }));
                }
            },
        }
    );

    // Candidate position links API expects ?position_id=...
    const fetchCandidateLinks = useSWRMutation(
        firstElection.id ? `/candidate-position-links?position_id=${firstElection.id}` : null,
        fetcher.get.mutate,
        {
            onSuccess: (data) => {
                const key = `/candidate-position-links?position_id=${firstElection.id}`;
                if (requestedKeys.current.links === key) return;
                requestedKeys.current.links = key;
                setCandidateLinks(data.candidate_position_links || []);
            },
        }
    );

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
            if (!candidates[firstElection.id] || candidates[firstElection.id].length === 0) {
                fetchCandidates.trigger();
            }
            if (Object.keys(positions).length === 0) {
                fetchPositions.trigger();
            }
            if (candidateLinks.length === 0) {
                fetchCandidateLinks.trigger();
            }
        }
    }, [
        firstElection,
        fetchCandidates,
        fetchPositions,
        fetchCandidateLinks,
        candidates,
        positions,
        candidateLinks,
    ]);

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
                        {(candidates[firstElection.id as number] ?? []).map((c) => {
                            // Get positions for the candidate (loop through the candidateLinks and map to positions)
                            const candidatePositions = candidateLinks
                                .filter((link) => link.candidate_id === c.id.toString()) // Filter links where the candidate is nominated
                                .map((link) => {
                                    // Get the position ID from the link
                                    const positionId = link.position_id;
                                    // Check if the position exists in the positions map
                                    const position = positions[positionId];
                                    return position ? position.name : 'Unknown Position';
                                });

                            return (
                                <AccordionItem
                                    id={c.id.toString()}
                                    key={c.id}
                                    title={c.name}
                                    aria-label={c.name}
                                    subtitle={candidatePositions?.join(', ') || 'No positions'}
                                >
                                    <p
                                        ref={(el) => {
                                            if (el) r.current.set(c.id, el);
                                        }}
                                    >
                                        {c.statement}
                                    </p>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
