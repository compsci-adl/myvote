import { useEffect, useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';

interface OpenNominationsProps {
	electionId: number;
}

export default function OpenNominations({ electionId }: OpenNominationsProps) {
	const [positions, setPositions] = useState<Record<
		number,
		{
			name?: string;
			description?: string;
			vacancies?: string;
			executive?: string;
		}
	> | null>(null);

	const fetchedPositions = useSWRMutation(
		`elections/${electionId}/positions`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				setPositions(data.positions);
				console.log(data.positions);
			},
		},
	);

	useEffect(() => {
		console.log('electionId: ', electionId);
		fetchedPositions.trigger();
	}, []);

	return (
		<div className="mt-8">
			<h1>
				Please create a Google Forms for nominations with the following
				positions and once created and sent out, continue to the next stage. If
				any position information is incorrect, please return to the previous
				stage to edit the information.
			</h1>
			<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				{positions &&
					Object.values(positions).map((position, index) => (
						<div
							key={index}
							className="flex flex-col gap-4 rounded-xl bg-gray-200 p-4"
						>
							<span className="flex gap-2">
								<h2 className="text-l font-bold">Position Name:</h2>
								<p>{position.name}</p>
							</span>
							<span className="flex gap-2">
								<h3 className="text-l font-bold">Description:</h3>
								<p>{position.description}</p>
							</span>
							<span className="flex gap-2">
								<h3 className="text-l font-bold">Executive:</h3>
								<p>{position.executive ? 'Yes' : 'No'}</p>
							</span>
							<span className="flex gap-2">
								<h3 className="text-l font-bold">Vacancies:</h3>
								<p>{position.vacancies}</p>
							</span>
						</div>
					))}
			</div>
		</div>
	);
}
