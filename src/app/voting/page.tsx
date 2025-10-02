'use client';

import {
    Button,
    Divider,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    useDisclosure,
} from '@heroui/react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { PositionSection } from '@/components/PositionSection';
import { fetcher } from '@/lib/fetcher';
import type { Candidate } from '@/types/candidate';

export default function VotingPage() {
    const { data: session } = useSession();
    const { isOpen, onOpen, onClose } = useDisclosure();

    interface Position {
        id: number;
        name: string;
    }

    const [firstElection, setFirstElection] = useState<{ id: number; status: number } | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [message, setMessage] = useState('');
    // Removed unused positionVotes state
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});

    // Get student info from session instead of localStorage
    const studentId = session?.user?.id; // This will be the Keycloak ID
    const studentName = session?.user?.name;
    const hasVoted =
        typeof window !== 'undefined' ? localStorage.getItem('hasVoted') === 'true' : false;

    // Fetch election data
    const swrFetcher = async (url: string) => fetch(url).then((res) => res.json());
    const { data: electionsData, isLoading: electionsLoading } = useSWR(
        '/api/elections',
        swrFetcher
    );
    useEffect(() => {
        if (electionsData && electionsData.length > 0) {
            const votingElection = electionsData.find(
                (e: { status: string | number }) => e.status === 'Voting' || e.status === 3
            );
            if (votingElection) {
                setFirstElection(votingElection);
            } else {
                setFirstElection(null);
            }
        }
    }, [electionsData]);

    // Fetch positions for the first election
    const { data: positionsData } = useSWR(
        firstElection && firstElection.id ? `/api/positions?election_id=${firstElection.id}` : null,
        swrFetcher
    );
    useEffect(() => {
        if (positionsData && Array.isArray(positionsData.positions)) {
            setPositions(positionsData.positions);
        }
    }, [positionsData]);

    useEffect(() => {
        if (electionsLoading) return;
        if (!firstElection) {
            setMessage('No elections available.');
        } else if (firstElection.status < 3) {
            setMessage("Voting hasn't opened yet.");
        } else if (firstElection.status > 3) {
            setMessage('Voting has closed.');
        } else {
            setMessage('');
        }
    }, [firstElection, electionsLoading]);

    // Handle submit vote
    const submitVote = useSWRMutation(
        firstElection && firstElection.id ? `/votes?election_id=${firstElection.id}` : null,
        fetcher.post.mutate,
        {
            onSuccess: () => {
                setStatusMessage('Vote submitted successfully!');
                setTimeout(() => setStatusMessage(''), 5000);
                localStorage.setItem('hasVoted', 'true');
            },
            onError: (error: unknown) => {
                if (
                    typeof error === 'object' &&
                    error !== null &&
                    'response' in error &&
                    typeof (error as { response?: { status?: number } }).response?.status ===
                        'number'
                ) {
                    if ((error as { response: { status: number } }).response.status === 409) {
                        setStatusMessage('You have already voted.');
                    } else {
                        setStatusMessage('Error submitting vote. Please try again.');
                    }
                } else {
                    setStatusMessage('Error submitting vote. Please try again.');
                }
                setTimeout(() => setStatusMessage(''), 5000);
            },
        }
    );

    // Fetch candidates for each position using candidate-position-links
    useEffect(() => {
        if (!firstElection?.id || positions.length === 0) return;
        const fetchCandidatesForPositions = async () => {
            const grouped: Record<string, Candidate[]> = {};
            for (const position of positions) {
                const res = await fetch(`/api/candidate-position-links?position_id=${position.id}`);
                const data = await res.json();
                if (Array.isArray(data.candidate_position_links)) {
                    grouped[position.id] = data.candidate_position_links.map(
                        (link: {
                            candidate_id: string;
                            position_id: number;
                            candidate: {
                                id: string;
                                name: string;
                                statement?: string;
                                nominations?: string[];
                            };
                        }) => ({
                            id: link.candidate?.id || link.candidate_id,
                            name: link.candidate?.name || '',
                            statement: link.candidate?.statement || '',
                            nominations: link.candidate?.nominations || [],
                        })
                    );
                }
            }
            setCandidates(grouped);
        };
        fetchCandidatesForPositions();
    }, [firstElection, positions]);

    // Handle form submit
    const handleSubmit = async () => {
        if (!studentId || !studentName) {
            alert('Error: No student ID or name found. Please log in again.');
            return;
        }

        // Prepare vote data using candidates data
        const voteData = Object.keys(candidates).map((positionId) => ({
            position: positionId,
            preferences: (candidates[positionId] ?? []).map((candidate) => candidate.id),
        }));

        // Submit each ballot individually as required by backend
        for (const vote of voteData) {
            const voteRequest = {
                student_id: studentId,
                keycloak_id: studentId, // Ensure keycloak_id is sent for membership check
                election: firstElection ? firstElection.id : undefined,
                name: studentName,
                position: vote.position,
                preferences: vote.preferences,
            };
            await submitVote.trigger(voteRequest);
        }
        onClose();
    };

    const statusMap: Record<string, number> = {
        VotingClosed: 4,
        ResultsReleased: 5,
    };
    const statusVal = firstElection?.status;
    const statusNum =
        typeof statusVal === 'number'
            ? statusVal
            : statusVal && statusVal in statusMap
              ? statusMap[statusVal]
              : Number(statusVal);
    const isElectionClosed = statusNum === 4 || statusNum === 5;
    return (
        <div className="container mx-auto px-4 py-8">
            {message ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">{message}</p>
                </div>
            ) : isElectionClosed ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">Election closed.</p>
                </div>
            ) : hasVoted ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">You have already voted.</p>
                </div>
            ) : (
                <>
                    <h1 className="mb-8 text-center text-3xl font-bold">Voting</h1>
                    {positions.map((position, index) => (
                        <PositionSection
                            key={index}
                            position={position}
                            candidates={candidates}
                            setCandidates={setCandidates}
                        />
                    ))}
                    <Divider />
                    {positions.length > 0 && (
                        <div className="mb-8 mt-8 flex justify-center">
                            <Button onPress={onOpen} className="bg-primary p-7 text-xl">
                                Submit
                            </Button>
                        </div>
                    )}
                    <Modal size="md" isOpen={isOpen} onClose={onClose}>
                        <ModalContent>
                            <ModalHeader>Are You Sure You Want to Submit?</ModalHeader>
                            <ModalBody>
                                <p>
                                    Are you sure you want to submit? You can only submit once, and
                                    you will not be able to edit or undo your votes.
                                </p>
                            </ModalBody>
                            <Divider />
                            <ModalFooter className="justify-center">
                                <Button onPress={handleSubmit}>Submit</Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>

                    {statusMessage && (
                        <div className="status-message">
                            <p>{statusMessage}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
