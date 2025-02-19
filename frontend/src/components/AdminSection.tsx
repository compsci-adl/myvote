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
import { ElectionSetup } from './ElectionSetup';

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
		<div>
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
					maxValue={4}
					step={1}
					marks={[
						{ value: 0, label: 'Election Setup' },
						{ value: 1, label: 'Positions Setup' },
						{ value: 2, label: 'Candidates Setup' },
						{ value: 3, label: 'Start Voting' },
						{ value: 4, label: 'Finish Voting' },
					]}
					hideThumb={true}
					className="mx-auto mb-16 w-[50rem]"
				/>
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

			{sliderValue === 0 && <ElectionSetup></ElectionSetup>}
			{sliderValue === 1 && <div>Positions Setup Content</div>}
			{sliderValue === 2 && <div>Candidates Setup Content</div>}
			{sliderValue === 3 && <div>Start Voting Content</div>}
			{sliderValue === 4 && <div>Finish Voting Content</div>}
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
