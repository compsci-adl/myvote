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

import { PositionSection } from '../components/PositionSection';
import { positions } from '../data/positions';

export default function VotingPage() {
	const { isOpen, onOpen, onClose } = useDisclosure();
	return (
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
							Are you sure you want to submit? You can only submit once, and you
							will not be able to edit or undo your votes.
						</p>
					</ModalBody>
					<Divider />
					<ModalFooter className="justify-center">
						<Button>Submit</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		</>
	);
}
