import { Accordion, AccordionItem } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import useSWRMutation from 'swr/mutation';

import { setRefs } from '../constants/refs';
// import { candidates } from '../data/candidates';
import { positions } from '../data/positions';
import { fetcher } from '../lib/fetcher';
import { useFocusedUsers } from '../stores';

export default function CandidatesPage() {
	const { focusedUsers } = useFocusedUsers();
	const r = useRef(new Map());
	setRefs(r);

	interface Election {
		status: number;
	}

	const [elections, setElections] = useState<Election[]>([]);
	const [message, setMessage] = useState('');

	const { trigger } = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			setElections(data.elections);
		},
	});

	useEffect(() => {
		trigger();
	}, [trigger]);

	useEffect(() => {
		if (elections.length === 0) {
			setMessage('No elections available.');
		} else {
			const firstElection = elections[0];
			if (firstElection.status < 3) {
				setMessage("Voting hasn't opened yet.");
			} else if (firstElection.status > 3) {
				setMessage('Voting has closed.');
			} else {
				setMessage('');
			}
		}
	}, [elections]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			{message ? (
				<p className="text-center text-xl">{message}</p>
			) : (
				// <Accordion defaultExpandedKeys={focusedUsers}>
				// 	{candidates.map((c) => (
				// 		<AccordionItem
				// 			id={c.id.toString()}
				// 			key={c.id}
				// 			title={c.name}
				// 			aria-label={c.name}
				// 			subtitle={c.nominations.map((i) => positions[i].name).join(', ')}
				// 		>
				// 			<p
				// 				ref={(el) => {
				// 					if (el) r.current.set(c.id, el);
				// 				}}
				// 			>
				// 				{c.statement}
				// 			</p>
				// 		</AccordionItem>
				// 	))}
				// </Accordion>
				<p>Test</p>
			)}
		</div>
	);
}
