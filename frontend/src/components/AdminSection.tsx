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
import { ElectionSetup } from './ElectionSetup/ElectionSetup';

export const AdminSection = () => {
	const r = useRef(new Map());
	setRefs(r);

	const [sliderValue, setSliderValue] = useState(0);
	const [modalMessage, setModalMessage] = useState('');
	const [actionToConfirm, setActionToConfirm] = useState<() => void>(() => {});
	const { isOpen, onOpen, onOpenChange } = useDisclosure();

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
					maxValue={5}
					step={1}
					marks={[
						{ value: 0, label: 'Election Setup' },
						{ value: 1, label: 'Nominations Opened' },
						{ value: 2, label: 'Nominations Closed' },
						{ value: 3, label: 'Voting Opened' },
						{ value: 4, label: 'Voting Closed' },
						{ value: 5, label: 'Results Released' },
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

			{sliderValue === 0 && <ElectionSetup setSliderValue={setSliderValue} />}
			{sliderValue === 1 && <div>Nominations Opened Content</div>}
			{sliderValue === 2 && <div>Nominations Closed Content</div>}
			{sliderValue === 3 && <div>Voting Opened Content</div>}
			{sliderValue === 4 && <div>Voting Closed Content</div>}
			{sliderValue === 5 && <div>Results Released Content</div>}
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
