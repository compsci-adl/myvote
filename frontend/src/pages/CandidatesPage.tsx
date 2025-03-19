import { Accordion, AccordionItem } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { setRefs } from '../constants/refs';
import { useMount } from '../hooks/use-mount';
import { fetcher } from '../lib/fetcher';
import { useFocusedUsers } from '../stores';
import type { Candidate } from '../types/candidate';

export default function CandidatesPage() {
	const { focusedUsers } = useFocusedUsers();
	const r = useRef(new Map());
	setRefs(r);

	interface Position {
		id: string;
		name: string;
	}

	const [firstElection, setFirstElection] = useState<{
		id?: number;
		status?: number;
	}>({});
	const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});
	const [positions, setPositions] = useState<Record<string, Position>>({}); // Store positions by string ID
	const [message, setMessage] = useState('');
	const [candidateLinks, setCandidateLinks] = useState<
		{ candidate_id: string }[]
	>([]);

	const fetchElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			const election = data.elections?.[0];
			if (election) {
				setFirstElection(election);
			} else {
				setMessage('No elections available.');
			}
		},
	});

	const fetchPositions = useSWRMutation(
		firstElection.id ? `positions/${firstElection.id}` : null,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				const positionMap = data.positions.reduce(
					(acc: Record<string, Position>, pos: Position) => {
						acc[pos.id] = pos;
						return acc;
					},
					{},
				);
				setPositions(positionMap);
			},
		},
	);

	const fetchCandidates = useSWRMutation(
		firstElection.id ? `candidates/${firstElection.id}` : null,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				if (data.candidates) {
					setCandidates((prev) => ({
						...prev,
						[firstElection.id as number]: data.candidates,
					}));
				}
			},
		},
	);

	const fetchCandidateLinks = useSWRMutation(
		`candidate_position_links/${firstElection.id}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => setCandidateLinks(data.candidate_position_links),
		},
	);

	useMount(() => {
		fetchElections.trigger();
	});

	useEffect(() => {
		if (!firstElection.id) return;

		if (firstElection.status && firstElection.status < 3) {
			setMessage("Voting hasn't opened yet.");
		} else if (firstElection.status && firstElection.status > 3) {
			setMessage('Voting has closed.');
		} else {
			setMessage('');
			if (
				!candidates[firstElection.id] ||
				candidates[firstElection.id].length === 0
			) {
				fetchCandidates.trigger();
			}
			if (Object.keys(positions).length === 0) {
				fetchPositions.trigger();
			}
			if (candidateLinks.length === 0) {
				fetchCandidateLinks.trigger();
			}
		}
	}, [
		firstElection,
		fetchCandidates,
		fetchPositions,
		fetchCandidateLinks,
		candidates,
		positions,
		candidateLinks,
	]);

	return (
		<div className="flex items-center justify-center">
			{message ? (
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-center text-xl">{message}</p>
				</div>
			) : (
				<Accordion defaultExpandedKeys={focusedUsers}>
					{(candidates[firstElection.id] ?? []).map((c) => {
						console.log(candidateLinks);
						console.log(c);
						// Inside your CandidatesPage component

						// Get positions for the candidate (loop through the candidateLinks and map to positions)
						const candidatePositions = candidateLinks
							.filter((link) => link.candidate_id === c.id) // Filter links where the candidate is nominated
							.map((link) => {
								// Get the position ID from the link
								const positionId = link.position_id;
								// Check if the position exists in the positions map
								const position = positions[positionId];
								// Debugging: Log the position ID and the position name
								console.log(
									`Position ID: ${positionId} | Position: ${position ? position.name : 'Unknown Position'}`,
								);
								// Return the position name, or 'Unknown Position' if it doesn't exist
								return position ? position.name : 'Unknown Position';
							});

						// Debugging: Log the positions for the candidate
						console.log(
							`Candidate: ${c.name} | Nominated Positions: ${candidatePositions}`,
						);

						return (
							<AccordionItem
								id={c.id.toString()}
								key={c.id}
								title={c.name}
								aria-label={c.name}
								subtitle={candidatePositions?.join(', ') || 'No positions'}
							>
								<p
									ref={(el) => {
										if (el) r.current.set(c.id, el);
									}}
								>
									{c.statement}
								</p>
							</AccordionItem>
						);
					})}
				</Accordion>
			)}
		</div>
	);
}
