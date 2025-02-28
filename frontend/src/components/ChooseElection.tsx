import { Button } from '@heroui/react';
import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';

interface ChooseElectionProps {
	setSliderValue: React.Dispatch<React.SetStateAction<number>>;
	selectedElection: {
		id: number;
		name: string;
		nomination_start: Date;
		nomination_end: Date;
		voting_start: Date;
		voting_end: Date;
		status: number;
	} | null;
	setSelectedElection: React.Dispatch<
		React.SetStateAction<{
			id: number;
			name: string;
			nomination_start: Date;
			nomination_end: Date;
			voting_start: Date;
			voting_end: Date;
			status: number;
		} | null>
	>;
}

export default function ChooseElection({
	setSliderValue,
	selectedElection,
	setSelectedElection,
}: ChooseElectionProps) {
	const [elections, setElections] = useState<
		{
			id: number;
			name: string;
			nomination_start: Date;
			nomination_end: Date;
			voting_start: Date;
			voting_end: Date;
			status: number;
		}[]
	>([]);

	const fetchedElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			setElections(data.elections);
		},
	});

	const handleSelectExistingElection = async () => {
		try {
			await fetchedElections.trigger();
			console.log(elections);
		} catch (error) {
			console.error('Error fetching elections:', error);
		}
	};

	const handleContinue = () => {
		if (selectedElection) {
			setSliderValue(selectedElection.status + 2);
		}
	};

	return (
		<div>
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="mx-4 flex-shrink text-lg font-bold">
					Choose Election
				</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>
			<div className="mb-4 flex justify-center gap-4">
				<Button color="primary" onPress={() => setSliderValue(1)}>
					Create New Election
				</Button>
				<Button color="primary" onPress={handleSelectExistingElection}>
					Select Existing Election
				</Button>
			</div>

			{elections && (
				<div>
					<div className="flex flex-col gap-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{elections.map((election) => (
								<div
									key={election.id}
									className={`cursor-pointer rounded-xl p-4 ${
										selectedElection?.id === election.id
											? 'bg-blue-200'
											: 'bg-gray-200'
									}`}
									onClick={() => setSelectedElection(election)}
								>
									<h3>{election.name}</h3>
									<p>
										Status:{' '}
										{(() => {
											switch (election.status) {
												case 0:
													return 'PreRelease';
												case 1:
													return 'Nominations';
												case 2:
													return 'NominationsClosed';
												case 3:
													return 'Voting';
												case 4:
													return 'VotingClosed';
												case 5:
													return 'ResultsReleased';
												default:
													return 'Unknown';
											}
										})()}
									</p>
								</div>
							))}
						</div>
					</div>
					{selectedElection && (
						<div className="mt-4 flex justify-center">
							<Button
								color="primary"
								onPress={handleContinue}
								isDisabled={!selectedElection}
							>
								Continue
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
