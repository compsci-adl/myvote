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
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { PositionSection } from '@/components/PositionSection';
import { useCandidatePositionLinksMultiple } from '@/components/useCandidatePositionLinks';
import { useVotes } from '@/components/useVotes';
import { SWR_CONFIG } from '@/lib/cache-config';
import { fetcher } from '@/lib/fetcher';
import type { Candidate } from '@/types/candidate';
import type { Position } from '@/types/position';

export default function VotingPage() {
    const { data: session } = useSession();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [firstElection, setFirstElection] = useState<{ id: number; status: number } | null>(null);
    const [positions, setPositions] = useState<Position[]>([]);
    const [message, setMessage] = useState('');
    const [statusMessage, setStatusMessage] = useState<string>('');
    const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
    const [candidatesLoading, setCandidatesLoading] = useState(true);

    // Update localStorage when voting order changes
    const setCandidatesWithStorage = useCallback<
        React.Dispatch<React.SetStateAction<Record<string, Candidate[]>>>
    >(
        (action) => {
            setCandidates((prevCandidates) => {
                const newCandidates =
                    typeof action === 'function' ? action(prevCandidates) : action;
                if (firstElection?.id) {
                    const key = `MV.voteOrder_${firstElection.id}`;
                    const orders: Record<string, string[]> = {};
                    for (const posId in newCandidates) {
                        orders[posId] = newCandidates[posId].map((c) => c.id);
                    }
                    localStorage.setItem(key, JSON.stringify(orders));
                }
                return newCandidates;
            });
        },
        [firstElection?.id]
    );

    // Get student info from session
    const keycloakId = session?.user?.id;
    const studentName = session?.user?.name;
    const [studentId, setStudentId] = useState<string | null | undefined>(undefined);

    // Shared SWR fetcher
    const swrFetcher = async (url: string) => fetch(url).then((res) => res.json());

    // Fetch membership info using hook
    const { data: membershipData } = useSWR(
        keycloakId ? `/api/membership?keycloak_id=${keycloakId}` : null,
        swrFetcher,
        SWR_CONFIG
    );

    // Get student info from session
    useEffect(() => {
        if (membershipData && Array.isArray(membershipData) && membershipData.length > 0) {
            if (membershipData[0].studentId) {
                setStudentId(membershipData[0].studentId);
            } else {
                setStudentId(null);
                alert(
                    'Error: No student ID found for your account. Please ensure you have added your student number to your profile on the CS Club website and try again.'
                );
            }
        } else if (membershipData && membershipData.error) {
            setStudentId(null);
            alert(
                'Error: Unable to fetch your student ID. Please ensure you have added your student number to your profile on the CS Club website and try again.'
            );
        }
    }, [membershipData]);

    // Membership and vote status state
    const [isMember, setIsMember] = useState<boolean | null>(null);
    const [hasVoted, setHasVoted] = useState<boolean | null>(null);

    // Fetch election data with proper SWR caching
    const { data: electionsData, isLoading: electionsLoading } = useSWR(
        '/api/elections',
        swrFetcher,
        SWR_CONFIG
    );

    // Update isMember based on membershipData
    useEffect(() => {
        if (membershipData && Array.isArray(membershipData) && membershipData.length > 0) {
            setIsMember(true);
        } else {
            setIsMember(false);
        }
    }, [membershipData]);

    // Check if user has already voted for this election using hook
    const { data: votesData } = useVotes(firstElection?.id, studentId);

    useEffect(() => {
        if (votesData && typeof votesData === 'object' && 'voted' in votesData) {
            setHasVoted((votesData as { voted: boolean }).voted);
        }
    }, [votesData]);

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

    // Fetch positions for the first election, but only if studentId is present
    const { data: positionsData } = useSWR(
        firstElection && firstElection.id && studentId
            ? `/api/positions?election_id=${firstElection.id}`
            : null,
        swrFetcher
    );
    useEffect(() => {
        if (studentId === null) return;
        if (positionsData && Array.isArray(positionsData.positions)) {
            setPositions(positionsData.positions);
        }
        if (!positionsData) {
            setCandidatesLoading(true);
        }
    }, [positionsData, studentId]);

    useEffect(() => {
        setCandidatesLoading(true);
    }, []);

    // Determine if user can edit vote (while status is Voting)
    const canEditVote =
        hasVoted &&
        firstElection &&
        ((typeof firstElection.status === 'string' &&
            String(firstElection.status).toLowerCase() === 'voting') ||
            firstElection.status === 3);
    useEffect(() => {
        if (electionsLoading) return;
        if (!firstElection) {
            setMessage('No open elections available.');
        } else if (firstElection.status < 3) {
            setMessage("Voting hasn't opened yet.");
        } else if (firstElection.status > 3) {
            setMessage('Voting has closed.');
        } else if (isMember === false) {
            setMessage('You must be a paid CS club member to vote.');
        } else if (hasVoted && !canEditVote) {
            setMessage('You have already voted.');
        } else {
            setMessage('');
        }
    }, [firstElection, electionsLoading, isMember, hasVoted, canEditVote]);

    // Handle submit vote
    const submitVote = useSWRMutation(
        firstElection && firstElection.id ? `/votes?election_id=${firstElection.id}` : null,
        fetcher.post.mutate,
        {
            onSuccess: () => {
                setStatusMessage('Vote submitted successfully!');
                setTimeout(() => setStatusMessage(''), 5000);
                setHasVoted(true);
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
                        setHasVoted(true);
                        setMessage('You have already voted.');
                    } else if (
                        (error as { response: { status: number } }).response.status === 403
                    ) {
                        setStatusMessage('You must be a paid CS club member to vote.');
                        setIsMember(false);
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

    // Batch fetch all candidates for all positions using hook
    const positionIds = positions.map((p) => p.id);
    const { data: candidateLinksData, isLoading: candidatesIsLoading } =
        useCandidatePositionLinksMultiple(positions.length > 0 ? positionIds : undefined);

    useEffect(() => {
        if (studentId === null) return; // Prevent loading if studentId is missing
        if (!firstElection?.id || positions.length === 0) return;

        // If still loading candidate data, show skeleton
        if (!candidateLinksData || candidatesIsLoading) {
            setCandidatesLoading(true);
            return;
        }

        type CandidatePositionLink = {
            candidate: Candidate;
            position_id: string | number;
        };
        type CandidatePositionLinksResponse = {
            candidate_position_links: CandidatePositionLink[];
        };

        try {
            const data = candidateLinksData as CandidatePositionLinksResponse;
            const grouped: Record<string, Candidate[]> = {};
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
                    if (!grouped[posId]) {
                        grouped[posId] = [];
                    }
                    const pos = positions.find((p) => String(p.id) === String(posId));
                    grouped[posId].push({ ...candidate, executive: pos?.executive });
                }
            }
            // Shuffle candidates for each position or use saved order
            const shuffled: Record<string, Candidate[]> = {};
            const key = `MV.voteOrder_${firstElection.id}`;
            const savedOrders = localStorage.getItem(key);
            const orders: Record<string, string[]> = savedOrders ? JSON.parse(savedOrders) : {};
            const updated = { ...orders };
            for (const posId in grouped) {
                if (orders[posId]) {
                    shuffled[posId] = [...grouped[posId]].sort(
                        (a, b) => orders[posId].indexOf(a.id) - orders[posId].indexOf(b.id)
                    );
                } else {
                    const randomized = [...grouped[posId]].sort(() => Math.random() - 0.5);
                    shuffled[posId] = randomized;
                    updated[posId] = randomized.map((c) => c.id);
                }
            }
            if (Object.keys(updated).length > Object.keys(orders).length) {
                localStorage.setItem(key, JSON.stringify(updated));
            }
            setCandidatesWithStorage(shuffled);
        } finally {
            // Only hide skeletons if positions are loaded
            if (positions.length) setCandidatesLoading(false);
        }
    }, [
        firstElection,
        positions,
        studentId,
        candidateLinksData,
        candidatesIsLoading,
        setCandidatesWithStorage,
    ]);

    // Handle form submit
    const handleSubmit = async () => {
        if (!studentId || !studentName) {
            alert('Error: No student ID or name found. Please log in again.');
            return;
        }
        if (hasVoted && !canEditVote) {
            setStatusMessage('You have already voted.');
            return;
        }
        if (isMember === false) {
            setStatusMessage('You must be a paid CS club member to vote.');
            return;
        }

        // Prepare vote data using candidates data
        const voteData = Object.keys(candidates).map((positionId) => ({
            position: positionId,
            preferences: (candidates[positionId] ?? []).map((candidate) => candidate.id),
        }));

        // Submit all ballots in a single batch request
        const batchVotes = voteData.map((vote) => ({
            student_id: studentId,
            keycloak_id: keycloakId, // Ensure keycloak_id is sent for membership check
            election: firstElection ? firstElection.id : undefined,
            name: studentName,
            position: vote.position,
            preferences: vote.preferences,
        }));
        await submitVote.trigger(batchVotes);
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
    // Show placeholder position sections if loading and no positions yet
    const placeholderPositions = Array.from({ length: 3 }).map((_, i) => ({
        id: String(-(i + 1)), // negative string ids to avoid collision with real ids
        name: 'Loading...',
    }));

    const isLoadingStudentId = typeof studentId === 'undefined';
    const isLoadingAll =
        isLoadingStudentId ||
        (studentId !== null &&
            positions.length === 0 &&
            candidatesLoading &&
            firstElection !== null);

    return (
        <div className="container mx-auto px-4 py-8">
            {isLoadingAll ? (
                <>
                    <h1 className="mb-8 text-center text-3xl font-bold">Voting</h1>
                    {placeholderPositions.map((position) => (
                        <PositionSection
                            key={position.id}
                            position={position}
                            candidates={{}}
                            setCandidates={() => {}}
                            loading={true}
                        />
                    ))}
                    <Divider />
                    <div className="mb-8 mt-8 flex justify-center">
                        <div className="rounded-2xl bg-primary w-30 h-16 flex items-center justify-center animate-pulse">
                            <div className="w-16 h-6 bg-orange-300 rounded"></div>
                        </div>
                    </div>
                </>
            ) : studentId === null ? (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-6 rounded text-center max-w-xl">
                        <h2 className="text-2xl font-bold mb-2">Student ID Not Found</h2>
                        <p className="mb-2">
                            We could not find your student number in your CS Club profile. Voting is
                            unavailable.
                        </p>
                        <p className="mb-2">
                            Please log in to the CS Club website and add your student number to your
                            profile, then try again.
                        </p>
                        <p>If you believe this is an error, please contact a committee member.</p>
                    </div>
                </div>
            ) : message ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">{message}</p>
                </div>
            ) : isElectionClosed ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">Election closed.</p>
                </div>
            ) : hasVoted && !canEditVote ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">You have already voted.</p>
                </div>
            ) : hasVoted && canEditVote ? (
                <>
                    <h1 className="mb-8 text-center text-3xl font-bold">Edit Your Vote</h1>
                    <div className="mb-4 text-center text-lg">
                        You have already voted, but you can change your vote while voting is open.
                    </div>
                    {positions.some((p) => p.executive) && (
                        <h2 className="mt-8 mb-4 text-2xl font-bold text-orange-700 text-center">
                            Executive Positions
                        </h2>
                    )}
                    {positions
                        .filter((p) => p.executive)
                        .map((position) => (
                            <PositionSection
                                key={position.id}
                                position={position}
                                candidates={candidates}
                                setCandidates={setCandidatesWithStorage}
                                loading={candidatesLoading}
                            />
                        ))}
                    {positions.some((p) => !p.executive) && (
                        <h2 className="mt-8 mb-4 text-2xl font-bold text-center">
                            Non-Executive Positions
                        </h2>
                    )}
                    {positions
                        .filter((p) => !p.executive)
                        .map((position) => (
                            <PositionSection
                                key={position.id}
                                position={position}
                                candidates={candidates}
                                setCandidates={setCandidatesWithStorage}
                                loading={candidatesLoading}
                            />
                        ))}
                    <Divider />
                    <div className="mt-8 flex justify-center">
                        <Button
                            onPress={onOpen}
                            className="bg-primary px-8 py-6 text-lg font-semibold"
                        >
                            Edit Vote
                        </Button>
                    </div>
                    <Modal size="md" isOpen={isOpen} onClose={onClose}>
                        <ModalContent>
                            <ModalHeader>Confirm Vote Change</ModalHeader>
                            <ModalBody>
                                <p>
                                    Are you sure you want to change your vote? This will overwrite
                                    your previous choices. You can continue to edit your vote while
                                    voting is open.
                                </p>
                            </ModalBody>
                            <Divider />
                            <ModalFooter className="justify-center">
                                <Button onPress={handleSubmit}>Confirm Change</Button>
                            </ModalFooter>
                        </ModalContent>
                    </Modal>
                    {statusMessage && (
                        <div className="status-message text-center mt-4">
                            <p>{statusMessage}</p>
                        </div>
                    )}
                </>
            ) : (
                <>
                    <h1 className="mb-8 text-center text-3xl font-bold">Voting</h1>
                    {positions.map((position) => (
                        <PositionSection
                            key={position.id}
                            position={position}
                            candidates={candidates}
                            setCandidates={setCandidatesWithStorage}
                            loading={candidatesLoading}
                        />
                    ))}
                    <Divider />
                    {candidatesLoading ? (
                        <div className="mb-8 mt-8 flex justify-center">
                            <div className="rounded-2xl bg-primary w-30 h-16 flex items-center justify-center animate-pulse">
                                <div className="w-16 h-6 bg-orange-300 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        positions.length > 0 && (
                            <div className="mt-8 flex justify-center">
                                <Button onPress={onOpen} className="bg-primary p-7 text-xl">
                                    Submit
                                </Button>
                            </div>
                        )
                    )}
                    <Modal size="md" isOpen={isOpen} onClose={onClose}>
                        <ModalContent>
                            <ModalHeader>Are You Sure You Want to Submit?</ModalHeader>
                            <ModalBody>
                                <p>
                                    Are you sure you want to submit? You can change your vote while
                                    voting is open, but once voting closes, your choices are final.
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
