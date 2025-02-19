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

	const [errors, setErrors] = useState<{ electionName?: string }>({});

	const save = useSWRMutation('elections', fetcher.post.mutate, {
		onError: () => {
			console.error('Failed to create election');
		},
		onSuccess: () => {
			console.log('Election created successfully');
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
			const fieldErrors = result.error.format();
			setErrors({
				electionName: fieldErrors.name?._errors[0],
			});
			return;
		}
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
					/>
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={nominationEndDate}
						label="Nomination End Date"
						onChange={(date) => date && setNominationEndDate(date)}
					/>
				</div>
				<div className="flex w-full items-end gap-3">
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={votingStartDate}
						label="Voting Start Date"
						onChange={(date) => date && setVotingStartDate(date)}
					/>
					<DatePicker
						hideTimeZone
						showMonthAndYearPickers
						defaultValue={votingEndDate}
						label="Voting End Date"
						onChange={(date) => date && setVotingEndDate(date)}
					/>
				</div>
				<div className="flex justify-center">
					<Button color="primary" className="mt-4" onClick={handleSubmit}>
						Create Election
					</Button>
				</div>
			</div>
		</div>
	);
};
