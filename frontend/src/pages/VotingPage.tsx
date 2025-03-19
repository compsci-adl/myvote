import { Button, Divider, Modal, ModalHeader, ModalBody, useDisclosure, ModalContent, ModalFooter } from '@heroui/react';
import { useState, useEffect } from 'react';
import useSWRMutation from 'swr/mutation';



import { PositionSection } from '../components/PositionSection';
import { fetcher } from '../lib/fetcher';
import type { Candidate } from '../types/candidate';
import { useMount } from '../utils/mount';


export default function VotingPage() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	interface Position {
		id: string;
		name: string;
	}

	const [firstElection, setFirstElection] = useState<any>([]);
	const [positions, setPositions] = useState<Position[]>([]);
	const [message, setMessage] = useState('');
	const [positionVotes, setPositionVotes] = useState<any[]>([]); // Track votes for positions
	const [statusMessage, setStatusMessage] = useState<string>('');
	const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});

	// Fetch election data
	const fetchElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			const firstElection = data.elections?.[0];
			if (firstElection) {
				setFirstElection(firstElection);
			}
		},
	});

	// Fetch positions for the first election
	const fetchPositions = useSWRMutation(
		`positions/${firstElection.id}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				setPositions(data.positions);
			},
		},
	);

	// Fetch election and positions when the component mounts
	useMount(() => {
		fetchElections.trigger();
	});

	useEffect(() => {
		if (!firstElection) {
			setMessage('No elections available.');
		} else {
			if (firstElection.status < 3) {
				setMessage("Voting hasn't opened yet.");
			} else if (firstElection.status > 3) {
				setMessage('Voting has closed.');
			} else {
				setMessage('');
				if (!positions || positions.length === 0) {
					fetchPositions.trigger();
				}
			}
		}
	}, [firstElection, fetchPositions, positions]);

	// Handle submit vote
	const submitVote = useSWRMutation(
		`votes/${firstElection.id}`,
		fetcher.post.mutate,
		{
			onSuccess: (data) => {
				setStatusMessage('Vote submitted successfully!');
				setTimeout(() => setStatusMessage(''), 5000);
			},
			onError: (error) => {
				setStatusMessage('Error submitting vote. Please try again.');
				setTimeout(() => setStatusMessage(''), 5000);
			},
		},
	);

	// Handle form submit
	const handleSubmit = async () => {
		const randomStudentId = Math.floor(1000000 + Math.random() * 9000000); // Random 7-digit student ID
		const randomName = `Student ${randomStudentId}`; // Random student name

		console.log(candidates);

		// Prepare vote data using candidates data
		const voteData = Object.keys(candidates).map((positionId) => ({
			position: positionId,
			preferences: candidates[positionId].map((candidate) => candidate.id),
		}));

		const voteRequest = {
			student_id: randomStudentId,
			election: firstElection.id,
			name: randomName,
			votes: voteData,
		};

		console.log(voteRequest);

		// Trigger the vote submission with the formatted request
		submitVote.trigger(voteRequest);
		onClose();
	};

	return (
		<>
			{message ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-center text-xl">{message}</p>
				</div>
			) : (
				<>
					{positions.map((position, index) => (
						<PositionSection
							key={index}
							position={position}
							onSelectVote={(selectedCandidates) =>
								setPositionVotes((prev) => [
									...prev,
									{ position_id: position.id, selectedCandidates },
								])
							}
							candidates={candidates}
							setCandidates={setCandidates}
						/>
					))}
					<Divider />
					<div className="flex justify-center">
						<Button onPress={onOpen} className="bg-primary p-7 text-3xl">
							Submit
						</Button>
					</div>
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
		</>
	);
}