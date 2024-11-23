import { Accordion, AccordionItem } from '@nextui-org/react';
import { useRef } from 'react';

import { setRefs } from '../constants/refs';
import { candidates } from '../data/candidates';
import { positions } from '../data/positions';
import { useFocusedUsers } from '../stores';

export const CandidatesSection = () => {
	const { focusedUsers } = useFocusedUsers();
	const r = useRef(new Map());
	setRefs(r);
	return (
		<Accordion defaultExpandedKeys={focusedUsers}>
			{candidates.map((c) => (
				<AccordionItem
					id={c.id.toString()}
					key={c.id}
					title={c.name}
					aria-label={c.name}
					subtitle={c.nominations.map((i) => positions[i].name).join(', ')}
				>
					<p
						ref={(el) => {
							if (el) r.current.set(c.id, el);
						}}
					>
						{c.statement}
					</p>
				</AccordionItem>
			))}
		</Accordion>
	);
};
