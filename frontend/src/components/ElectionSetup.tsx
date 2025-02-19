import { Button, Input, DatePicker } from '@heroui/react';
import { now, getLocalTimeZone, ZonedDateTime } from '@internationalized/date';
import { useState } from 'react';
import { z } from 'zod';

export const electionSchema = z.object({
	electionName: z.string().min(1),
	nominationStartDate: z.date(),
	nominationEndDate: z.date(),
	votingStartDate: z.date(),
	votingEndDate: z.date(),
});

export const ElectionSetup = () => {
	const [electionName, setElectionName] = useState('');
	const [nominationStartDate, setNominationStartDate] = useState(
		now(getLocalTimeZone()),
	);
	const [nominationEndDate, setNominationEndDate] = useState(
		now(getLocalTimeZone()),
	);
	const [votingStartDate, setVotingStartDate] = useState(
		now(getLocalTimeZone()),
	);
	const [votingEndDate, setVotingEndDate] = useState(now(getLocalTimeZone()));

	const [errors, setErrors] = useState<{ electionName?: string }>({});

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
			electionName,
			nominationStartDate: formatDate(nominationStartDate),
			nominationEndDate: formatDate(nominationEndDate),
			votingStartDate: formatDate(votingStartDate),
			votingEndDate: formatDate(votingEndDate),
		};

		const result = electionSchema.safeParse(data);

		if (!result.success) {
			const fieldErrors = result.error.format();
			setErrors({
				electionName: fieldErrors.electionName?._errors[0],
			});
			return;
		}

		console.log('Election Setup data:', data);
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
