import { Button } from '@heroui/react';
import { now, getLocalTimeZone } from '@internationalized/date';
import type { ZonedDateTime } from '@internationalized/date';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../../lib/fetcher';
import ElectionInfo from './ElectionInfo';
import Positions from './Positions';
import { electionSchema } from './schemas';

export const ElectionSetup = () => {
	const [electionName, setElectionName] = useState('');
	const [nominationStartDate, setNominationStartDate] = useState(
		now(getLocalTimeZone()),
	);
	const [nominationEndDate, setNominationEndDate] = useState(
		now(getLocalTimeZone()).add({ weeks: 1 }),
	);
	const [votingStartDate, setVotingStartDate] = useState(
		now(getLocalTimeZone()).add({ days: 10 }),
	);
	const [votingEndDate, setVotingEndDate] = useState(
		now(getLocalTimeZone()).add({ days: 10, hours: 2 }),
	);

	const [errors, setErrors] = useState<{
		electionName?: string;
		nominationStartDate?: string;
		nominationEndDate?: string;
		votingStartDate?: string;
		votingEndDate?: string;
		positions?: Record<
			number,
			{
				name?: string;
				description?: string;
				vacancies?: string;
				executive?: string;
			}
		>;
	}>({});

	const [positions, setPositions] = useState<
		{
			name: string;
			vacancies: number;
			description: string;
			executive: boolean;
		}[]
	>([{ name: '', vacancies: 1, description: '', executive: false }]);

	const [status, setStatus] = useState({ text: '', type: '' });
	const save = useSWRMutation('elections', fetcher.post.mutate, {
		onError: (error) => {
			const errorMessage =
				error.response?.status === 409
					? 'Election with that name already exists.'
					: 'Failed to create election. Please try again.';
			setStatus({
				text: errorMessage,
				type: 'error',
			});
		},
		onSuccess: () => {
			setStatus({ text: 'Election created successfully!', type: 'success' });
		},
	});

	const addPosition = () => {
		setPositions([
			...positions,
			{ name: '', vacancies: 1, description: '', executive: false },
		]);
	};

	const updatePosition = (
		index: number,
		updatedPosition: {
			name: string;
			vacancies: number;
			description: string;
			executive: boolean;
		},
	) => {
		setPositions((prevPositions) =>
			prevPositions.map((position, i) =>
				i === index ? updatedPosition : position,
			),
		);
	};

	const removePosition = (index: number) => {
		setPositions((prevPositions) =>
			prevPositions.filter((_, i) => i !== index),
		);
	};

	const handleSubmit = () => {
		setStatus({ text: '', type: '' });
		const formatDate = (date: ZonedDateTime) => {
			return new Date(
				date.year,
				date.month - 1,
				date.day,
				date.hour,
				date.minute,
				date.second,
			);
		};

		const data = {
			name: electionName,
			nomination_start: formatDate(nominationStartDate),
			nomination_end: formatDate(nominationEndDate),
			voting_start: formatDate(votingStartDate),
			voting_end: formatDate(votingEndDate),
			positions,
		};

		const result = electionSchema.safeParse(data);

		if (!result.success) {
			const zodErrors: typeof errors = {};
			result.error.errors.forEach((err) => {
				const [first, index, field] = err.path;
				if (first === 'positions' && typeof index === 'number' && field) {
					zodErrors.positions = zodErrors.positions || {};
					zodErrors.positions[index] = zodErrors.positions[index] || {};
					zodErrors.positions[index][
						field as keyof (typeof zodErrors.positions)[number]
					] = err.message;
				} else {
					zodErrors[first as keyof typeof zodErrors] = err.message;
				}
			});

			// Check if election name is empty
			if (!data.name) {
				zodErrors.electionName = 'Election name is required';
			}

			setErrors(zodErrors);
			return;
		}

		// Check logical constraints for dates
		const logicalErrors: typeof errors = {};

		if (nominationStartDate.compare(now(getLocalTimeZone())) <= 0) {
			logicalErrors.nominationStartDate =
				'Nomination start date must be in the future';
		}

		if (nominationEndDate.compare(nominationStartDate) <= 0) {
			logicalErrors.nominationEndDate =
				'Nomination end date must be after nomination start date';
		}

		if (votingStartDate.compare(nominationEndDate) <= 0) {
			logicalErrors.votingStartDate =
				'Voting start date must be after nomination end date';
		}

		if (votingEndDate.compare(votingStartDate) <= 0) {
			logicalErrors.votingEndDate =
				'Voting end date must be after voting start date';
		}

		// If any logical errors exist, set them and return
		if (Object.keys(logicalErrors).length > 0) {
			setErrors(logicalErrors);
			return;
		}

		// Trigger save if validation passes
		save.trigger(data);
	};

	return (
		<div>
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="mx-4 flex-shrink text-lg font-bold">
					Election Setup
				</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>
			<h2 className="mb-4 text-lg font-semibold">Election Info</h2>
			<ElectionInfo
				electionName={electionName}
				setElectionName={setElectionName}
				errors={errors}
				nominationStartDate={nominationStartDate}
				setNominationStartDate={setNominationStartDate}
				nominationEndDate={nominationEndDate}
				setNominationEndDate={setNominationEndDate}
				votingStartDate={votingStartDate}
				setVotingStartDate={setVotingStartDate}
				votingEndDate={votingEndDate}
				setVotingEndDate={setVotingEndDate}
			/>
			<div className="h-8"></div>
			<Positions
				addPosition={addPosition}
				positions={positions}
				updatePosition={updatePosition}
				removePosition={removePosition}
				errors={errors.positions}
			/>
			<div className="flex justify-center">
				<Button color="primary" className="mt-4" onPress={handleSubmit}>
					Create Election
				</Button>
			</div>
			{status.text && (
				<div
					className={`mt-4 text-center ${status.type === 'error' ? 'text-red-500' : 'text-green-500'}`}
				>
					{status.text}
				</div>
			)}
		</div>
	);
};
