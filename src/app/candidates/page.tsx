'use client';

import { Accordion, AccordionItem } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { setRefs } from '@/constants/refs';
import { useMount } from '@/hooks/use-mount';
import { fetcher } from '@/lib/fetcher';
import type { Candidate } from '@/types/candidate';
import type { Position } from '@/types/position';

// Store for focused users
const useFocusedUsers = () => ({ focusedUsers: [] });

export default function CandidatesPage() {
    const { focusedUsers } = useFocusedUsers();
    const r = useRef(new Map());
    useEffect(() => {
        setRefs(r);
    }, []);

    const [firstElection, setFirstElection] = useState<{
        id?: number;
        status?: number;
    }>({});
    const [candidates, setCandidates] = useState<
        Record<string, Candidate & { positions: string[] }>
    >({});
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    // Elections API returns array of elections
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

    // Cache for requests to avoid loops
    // const requestedKeys = useRef<{ positions?: string; candidates?: string; links?: string }>({});

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
            Promise.resolve().then(() => setPositions(positionMap));
        }
    }, [positionsData]);

    // Fetch all candidates and their positions for the election
    useEffect(() => {
        Promise.resolve().then(() => {
            setLoading(true);
            const fetchAllCandidatesAndLinks = async () => {
                if (!firstElection.id || !positions || Object.keys(positions).length === 0) {
                    setCandidates({});
                    return;
                }
            const posIds = Object.keys(positions);
            type CandidatePositionLink = {
                candidate: Candidate;
                position_id: string;
            };
            type CandidatePositionLinksResponse = {
                candidate_position_links: CandidatePositionLink[];
            };

            const data = (await fetcher.get.query([
                'candidate-position-links',
                {
                    searchParams: { position_ids: posIds.join(',') },
                },
            ])) as CandidatePositionLinksResponse;
            const candidateMap: Record<string, Candidate & { positions: string[] }> = {};
            if (
                data &&
                typeof data === 'object' &&
                'candidate_position_links' in data &&
                Array.isArray(data.candidate_position_links)
            ) {
                for (const link of data.candidate_position_links) {
                    const candidate = link.candidate;
                    const posId = link.position_id;
                    if (!candidate) continue;
                    if (!candidateMap[candidate.id]) {
                        candidateMap[candidate.id] = {
                            ...candidate,
                            positions: [posId],
                        };
                    } else {
                        if (posId && !candidateMap[candidate.id].positions.includes(posId)) {
                            candidateMap[candidate.id].positions.push(posId);
                        }
                    }
                }
            }
            setCandidates(candidateMap);
            setLoading(false);
            };
            fetchAllCandidatesAndLinks();
        });
    }, [firstElection.id, positions]);

    useMount(() => {
        fetchElections.trigger();
    });

    useEffect(() => {
        if (!firstElection.id) return;
        if (firstElection.status && firstElection.status < 3) {
            Promise.resolve().then(() => setMessage("Voting hasn't opened yet."));
        } else if (firstElection.status && firstElection.status > 3) {
            Promise.resolve().then(() => setMessage('Voting has closed.'));
        } else {
            Promise.resolve().then(() => setMessage(''));
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
                ) : loading ? (
                    <div className="w-full max-w-4xl">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="py-6 border-b-gray-300 border-b-1">
                                <div className="flex flex-row items-center gap-4 animate-pulse">
                                    <div className="flex-1">
                                        <div className="h-7 w-56 bg-gray-200 rounded mb-1"></div>
                                        <div className="h-5 w-40 bg-gray-100 rounded"></div>
                                    </div>
                                    <div className="w-6 h-6 bg-gray-200 ml-2"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Accordion defaultExpandedKeys={focusedUsers} className="w-full max-w-4xl">
                        {Object.values(candidates)
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((c) => {
                                const candidatePositions = c.positions
                                    .map((pid) => positions[pid])
                                    .filter(Boolean);
                                return (
                                    <AccordionItem
                                        id={c.id.toString()}
                                        key={c.id}
                                        title={c.name}
                                        aria-label={c.name}
                                        subtitle={
                                            candidatePositions.length > 0 ? (
                                                <>
                                                    {candidatePositions.map((pos, idx) => (
                                                        <span
                                                            key={pos.id}
                                                            className={
                                                                'executive' in pos && pos.executive
                                                                    ? 'text-orange-700'
                                                                    : ''
                                                            }
                                                        >
                                                            {pos.name}
                                                            {idx < candidatePositions.length - 1
                                                                ? ', '
                                                                : ''}
                                                        </span>
                                                    ))}
                                                </>
                                            ) : (
                                                'No positions'
                                            )
                                        }
                                    >
                                        <div
                                            ref={(el) => {
                                                if (el) r.current.set(c.id, el);
                                            }}
                                        >
                                            <p className="whitespace-pre-line">
                                                {c.statement.replace(/^-\s*/gm, '• ')}
                                            </p>
                                        </div>
                                    </AccordionItem>
                                );
                            })}
                    </Accordion>
                )}
            </div>
        </div>
    );
}
