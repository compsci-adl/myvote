import { Button, Input, DatePicker } from '@heroui/react';
import { now, getLocalTimeZone } from '@internationalized/date';
import type { ZonedDateTime } from '@internationalized/date';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';
import { z } from 'zod';

import { fetcher } from '../lib/fetcher';

export const electionSchema = z.object({
	name: z.string().min(1),
	nomination_start: z.date(),
	nomination_end: z.date(),
	voting_start: z.date(),
	voting_end: z.date(),
});

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
	}>({});

	const [status, setStatus] = useState({ text: '', type: '' });
	const save = useSWRMutation('elections', fetcher.post.mutate, {
		onError: () => {
			setStatus({
				text: 'Failed to create election. Please try again.',
				type: 'error',
			});
		},
		onSuccess: () => {
			setStatus({ text: 'Election created successfully!', type: 'success' });
		},
	});

	const handleSubmit = () => {
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
			status: 0,
		};

		const result = electionSchema.safeParse(data);

		if (!result.success) {
			setErrors({
				electionName: "Election name can't be empty",
			});
			return;
		}

		if (nominationStartDate.compare(now(getLocalTimeZone())) <= 0) {
			setErrors({
				nominationStartDate: 'Nomination start date must be in the future',
			});
			return;
		}

		if (nominationEndDate.compare(nominationStartDate) <= 0) {
			setErrors({
				nominationEndDate:
					'Nomination end date must be after nomination start date',
			});
			return;
		}

		if (votingStartDate.compare(nominationEndDate) <= 0) {
			setErrors({
				votingStartDate: 'Voting start date must be after nomination end date',
			});
			return;
		}

		if (votingEndDate.compare(votingStartDate) <= 0) {
			setErrors({
				votingEndDate: 'Voting end date must be after voting start date',
			});
			return;
		}
		if (Object.keys(errors).length > 0) {
			save.trigger(data);
		}
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
			<div className="space-y-4">
				<div className="flex flex-col gap-2">
					<Input
						label="Election Name"
						placeholder="Enter election name"
						type="text"
						value={electionName}
						onChange={(e) => setElectionName(e.target.value)}
						errorMessage="Election name is required"
						isInvalid={!!errors.electionName}
					/>
				</div>
				<div className="flex w-full items-end gap-3">
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={nominationStartDate}
						label="Nomination Start Date"
						onChange={(date) => date && setNominationStartDate(date)}
						errorMessage={errors.nominationStartDate}
						isInvalid={!!errors.nominationStartDate}
					/>
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={nominationEndDate}
						label="Nomination End Date"
						onChange={(date) => date && setNominationEndDate(date)}
						errorMessage={errors.nominationEndDate}
						isInvalid={!!errors.nominationEndDate}
					/>
				</div>
				<div className="flex w-full items-end gap-3">
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={votingStartDate}
						label="Voting Start Date"
						onChange={(date) => date && setVotingStartDate(date)}
						errorMessage={errors.votingStartDate}
						isInvalid={!!errors.votingStartDate}
					/>
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={votingEndDate}
						label="Voting End Date"
						onChange={(date) => date && setVotingEndDate(date)}
						errorMessage={errors.votingEndDate}
						isInvalid={!!errors.votingEndDate}
					/>
				</div>
				<div className="flex justify-center">
					<Button color="primary" className="mt-4" onClick={handleSubmit}>
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
		</div>
	);
};
