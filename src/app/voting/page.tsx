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
    const [candidatesLoading, setCandidatesLoading] = useState(true);

    // Get student info from session
    const keycloakId = session?.user?.id;
    const studentName = session?.user?.name;
    const [studentId, setStudentId] = useState<string | null | undefined>(undefined);

    // Fetch studentId from member table
    useEffect(() => {
        if (!keycloakId) return;
        const fetchStudentId = async () => {
            try {
                const res = await fetch(`/api/membership?keycloak_id=${keycloakId}`);
                const data = await res.json();
                // If membership found, get studentId
                if (Array.isArray(data) && data.length > 0 && data[0].studentId) {
                    setStudentId(data[0].studentId);
                } else {
                    setStudentId(null);
                    alert(
                        'Error: No student ID found for your account. Please ensure you have added your student number to your profile on the CS Club website and try again.'
                    );
                }
            } catch {
                setStudentId(null);
                alert(
                    'Error: Unable to fetch your student ID. Please ensure you have added your student number to your profile on the CS Club website and try again.'
                );
            }
        };
        fetchStudentId();
    }, [keycloakId]);

    // Membership and vote status state
    const [isMember, setIsMember] = useState<boolean | null>(null);
    const [hasVoted, setHasVoted] = useState<boolean | null>(null);

    // Fetch election data
    const swrFetcher = async (url: string) => fetch(url).then((res) => res.json());
    const { data: electionsData, isLoading: electionsLoading } = useSWR(
        '/api/elections',
        swrFetcher
    );

    // Membership check
    useEffect(() => {
        if (!keycloakId) return;
        const checkMembership = async () => {
            try {
                const res = await fetch(`/api/membership?keycloak_id=${keycloakId}`);
                const data = await res.json();
                // If membership found and not expired, allow voting
                setIsMember(Array.isArray(data) && data.length > 0);
            } catch {
                setIsMember(false);
            }
        };
        checkMembership();
    }, [keycloakId]);

    // Check if user has already voted for this election
    useEffect(() => {
        if (!studentId || !firstElection?.id) return;
        if (studentId === null) return;
        const checkVoted = async () => {
            try {
                // Query API for ballots for this user and election only
                const res = await fetch(
                    `/api/votes?election_id=${firstElection.id}&student_id=${studentId}`
                );
                const data = await res.json();
                // If any ballot for this student, mark as voted
                const voted = data.voted;
                setHasVoted(voted);
            } catch {
                setHasVoted(false);
            }
        };
        checkVoted();
    }, [studentId, keycloakId, firstElection]);

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
        } else if (hasVoted) {
            setMessage('You have already voted.');
        } else {
            setMessage('');
        }
    }, [firstElection, electionsLoading, isMember, hasVoted]);

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

    // Batch fetch all candidates for all positions using candidate-position-links
    useEffect(() => {
        if (studentId === null) return; // Prevent loading if studentId is missing
        if (!firstElection?.id || positions.length === 0 || hasVoted) return;
        type CandidatePositionLink = {
            candidate: Candidate;
            position_id: string | number;
        };
        type CandidatePositionLinksResponse = {
            candidate_position_links: CandidatePositionLink[];
        };
        const fetchAllCandidatesAndLinks = async () => {
            // Only show skeleton if there are positions to fetch for
            if (!positions.length) return;
            setCandidatesLoading(true);
            try {
                const posIds = positions.map((p) => p.id);
                const data = (await fetcher.post.mutate('/candidate-position-links', {
                    arg: { position_ids: posIds },
                })) as CandidatePositionLinksResponse;
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
                        grouped[posId].push(candidate);
                    }
                }
                setCandidates(grouped);
            } finally {
                // Only hide skeletons if positions are loaded
                if (positions.length) setCandidatesLoading(false);
            }
        };
        fetchAllCandidatesAndLinks();
    }, [firstElection, positions, hasVoted]);

    // Handle form submit
    const handleSubmit = async () => {
        if (!studentId || !studentName) {
            alert('Error: No student ID or name found. Please log in again.');
            return;
        }
        if (hasVoted) {
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
        id: -(i + 1), // negative numbers to avoid collision with real ids
        name: 'Loading...',
    }));

    const isLoadingStudentId = typeof studentId === 'undefined';
    const isLoadingAll =
        isLoadingStudentId || (studentId !== null && positions.length === 0 && candidatesLoading);

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
            ) : hasVoted ? (
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">You have already voted.</p>
                </div>
            ) : (
                <>
                    <h1 className="mb-8 text-center text-3xl font-bold">Voting</h1>
                    {positions.map((position) => (
                        <PositionSection
                            key={position.id}
                            position={position}
                            candidates={candidates}
                            setCandidates={setCandidates}
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
                            <div className="mb-8 mt-8 flex justify-center">
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
