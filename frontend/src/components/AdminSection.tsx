import {
	Button,
	Slider,
	Modal,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalFooter,
	useDisclosure,
} from '@heroui/react';
import { useRef, useState } from 'react';

import { setRefs } from '../constants/refs';
import ChooseElection from './ChooseElection';
import ClosedNominations from './ClosedNominations';
import { ElectionSetup } from './ElectionSetup/ElectionSetup';
import OpenNominations from './OpenNominations';

export const AdminSection = () => {
	const r = useRef(new Map());
	setRefs(r);

	const [sliderValue, setSliderValue] = useState(0);
	const [modalMessage, setModalMessage] = useState('');
	const [actionToConfirm, setActionToConfirm] = useState<() => void>(() => {});
	const { isOpen, onOpen, onOpenChange } = useDisclosure();

	const [selectedElection, setSelectedElection] = useState<{
		id: number;
		name: string;
		nomination_start: Date;
		nomination_end: Date;
		voting_start: Date;
		voting_end: Date;
		status: number;
	} | null>(null);

	const handlePreviousStage = () => {
		setModalMessage(
			'Information for this stage will be lost. Do you want to proceed?',
		);
		setActionToConfirm(() => () => {
			setSliderValue((prevValue) => Math.max(prevValue - 1, 0));
		});
		onOpen();
	};

	const handleNextStage = () => {
		setModalMessage(
			'Make sure you confirm all the information you entered is correct. Do you want to proceed?',
		);
		setActionToConfirm(() => () => {
			setSliderValue((prevValue) => Math.min(prevValue + 1, 4));
		});
		onOpen();
	};

	const handleConfirm = () => {
		actionToConfirm();
		onOpenChange();
	};

	const handleCancel = () => {
		onOpenChange();
	};

	return (
		<div className="mx-2">
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="mx-4 flex-shrink text-lg font-bold">
					Election Status
				</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>

			<div>
				<Slider
					value={sliderValue}
					defaultValue={0}
					minValue={0}
					maxValue={6}
					step={1}
					marks={[
						{ value: 0, label: 'New/Existing Election' },
						{ value: 1, label: 'Election Setup' },
						{ value: 2, label: 'Nominations Opened' },
						{ value: 3, label: 'Nominations Closed' },
						{ value: 4, label: 'Voting Opened' },
						{ value: 5, label: 'Voting Closed' },
						{ value: 6, label: 'Results Released' },
					]}
					hideThumb={true}
					className="mx-auto mb-16 hidden w-[50rem] md:block"
				/>
				<div className="mb-6 block text-center md:hidden">
					<h2 className="text-md font-semibold">
						Current Stage:{' '}
						<span className="text-primary">
							{
								[
									'New/Existing Election',
									'Election Setup',
									'Nominations Opened',
									'Nominations Closed',
									'Voting Opened',
									'Voting Closed',
									'Results Released',
								][sliderValue]
							}
						</span>
					</h2>
				</div>

				<div className="flex justify-center gap-4">
					<Button
						color="primary"
						onPress={handlePreviousStage}
						isDisabled={sliderValue === 0}
					>
						Previous Stage
					</Button>
					<Button
						color="primary"
						onPress={handleNextStage}
						isDisabled={sliderValue === 4}
					>
						Next Stage
					</Button>
				</div>
			</div>
			{sliderValue === 0 && (
				<ChooseElection
					setSliderValue={setSliderValue}
					selectedElection={selectedElection}
					setSelectedElection={setSelectedElection}
				></ChooseElection>
			)}
			{sliderValue === 1 && (
				<ElectionSetup
					setSliderValue={setSliderValue}
					setSelectedElection={setSelectedElection}
				/>
			)}
			{sliderValue === 2 && selectedElection && (
				<OpenNominations
					electionId={selectedElection?.id}
					setSliderValue={setSliderValue}
				/>
			)}
			{sliderValue === 3 && selectedElection && (
				<ClosedNominations
					setSliderValue={setSliderValue}
					electionId={selectedElection.id}
				/>
			)}
			{sliderValue === 4 && <div>Voting Opened Content</div>}
			{sliderValue === 5 && <div>Voting Closed Content</div>}
			{sliderValue === 6 && <div>Results Released Content</div>}
			<Modal isOpen={isOpen} onOpenChange={onOpenChange}>
				<ModalContent>
					{() => (
						<>
							<ModalHeader className="flex flex-col gap-1">
								Are you sure?
							</ModalHeader>
							<ModalBody>
								<p>{modalMessage}</p>
							</ModalBody>
							<ModalFooter>
								<Button color="secondary" onPress={handleCancel}>
									Cancel
								</Button>
								<Button color="primary" onPress={handleConfirm}>
									Confirm
								</Button>
							</ModalFooter>
						</>
					)}
				</ModalContent>
			</Modal>
		</div>
	);
};
