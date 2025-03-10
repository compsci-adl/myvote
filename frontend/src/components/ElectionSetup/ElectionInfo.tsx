import { DatePicker, Input } from '@heroui/react';
import type { ZonedDateTime } from '@internationalized/date';
import React from 'react';

interface ElectionInfoProps {
	electionName: string;
	setElectionName: React.Dispatch<React.SetStateAction<string>>;
	errors: {
		electionName?: string;
		nominationStartDate?: string;
		nominationEndDate?: string;
		votingStartDate?: string;
		votingEndDate?: string;
	};
	nominationStartDate: ZonedDateTime;
	setNominationStartDate: (date: ZonedDateTime) => void;
	nominationEndDate: ZonedDateTime;
	setNominationEndDate: (date: ZonedDateTime) => void;
	votingStartDate: ZonedDateTime;
	setVotingStartDate: (date: ZonedDateTime) => void;
	votingEndDate: ZonedDateTime;
	setVotingEndDate: (date: ZonedDateTime) => void;
}

export default function ElectionInfo({
	electionName,
	setElectionName,
	errors,
	nominationStartDate,
	setNominationStartDate,
	nominationEndDate,
	setNominationEndDate,
	votingStartDate,
	setVotingStartDate,
	votingEndDate,
	setVotingEndDate,
}: ElectionInfoProps) {
	return (
		<div className="flex flex-col gap-4">
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
		</div>
	);
}
