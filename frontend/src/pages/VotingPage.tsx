import {
	Button,
	Divider,
	Modal,
	ModalHeader,
	ModalBody,
	useDisclosure,
	ModalContent,
	ModalFooter,
} from '@heroui/react';
import { useState, useEffect } from 'react';
import useSWRMutation from 'swr/mutation';

import { PositionSection } from '../components/PositionSection';
import { fetcher } from '../lib/fetcher';
import { useMount } from '../utils/mount';

export default function VotingPage() {
	const { isOpen, onOpen, onClose } = useDisclosure();

	interface Position {
		id: number;
		name: string;
	}

	const [firstElection, setFirstElection] = useState([]);
	const [positions, setPositions] = useState<Position[]>([]);
	const [message, setMessage] = useState('');

	const fetchElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			const firstElection = data.elections?.[0];

			if (firstElection) {
				setFirstElection(firstElection);
			}
		},
	});

	const fetchPositions = useSWRMutation(
		`positions/${firstElection.id}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				setPositions(data.positions);
			},
		},
	);

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
	}, [firstElection, fetchPositions]);

	return (
		<>
			{message ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-center text-xl">{message}</p>
				</div>
			) : (
				<>
					{positions.map((p, i) => (
						<PositionSection key={i} position={p} />
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
								<Button>Submit</Button>
							</ModalFooter>
						</ModalContent>
					</Modal>
				</>
			)}
		</>
	);
}
