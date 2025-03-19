import { useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { fetcher } from '../lib/fetcher';
import { useMount } from './../hooks/use-mount';

interface ResultsProps {
	electionId: number;
}

export default function Results({ electionId }: ResultsProps) {
	const [results, setResults] = useState<any[]>([]);

	// Fetch election results
	const fetchResults = useSWRMutation(
		`results/${electionId}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				console.log(data.results);
				setResults(data.results);
			},
		},
	);

	useMount(() => {
		fetchResults.trigger();
	});

	return (
		<div className="mt-8">
			<h1 className="mb-4 text-2xl font-bold">Election Results</h1>

			{results.length === 0 && <p>No results found.</p>}

			{results.map((position) => (
				<div
					key={position.position_id}
					className="mb-6 rounded-lg border p-4 shadow-md"
				>
					<h2 className="text-xl font-semibold">{position.position_name}</h2>

					<h3 className="mt-2 font-medium text-green-600">Winner(s):</h3>
					<ul className="list-disc pl-5">
						{position.winners.map((winner) => (
							<li key={winner.id} className="font-semibold">
								{winner.name}
							</li>
						))}
					</ul>

					<h3 className="mt-4 font-medium text-gray-700">All Candidates:</h3>
					<table className="mt-2 w-full border-collapse border border-gray-300">
						<thead>
							<tr className="bg-gray-200">
								<th className="border p-2">Ranking</th>
								<th className="border p-2">Candidate</th>
								<th className="border p-2">Votes</th>
								<th className="border p-2">Preference Count</th>
							</tr>
						</thead>
						<tbody>
							{position.candidates.map((candidate) => (
								<tr key={candidate.id} className="text-center">
									<td className="border p-2">{candidate.ranking}</td>
									<td className="border p-2">{candidate.name}</td>
									<td className="border p-2">{candidate.votes}</td>
									<td className="border p-2">{candidate.preferences_count}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
}
