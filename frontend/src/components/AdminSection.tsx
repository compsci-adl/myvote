import { Accordion, AccordionItem } from '@heroui/react';
import { useRef } from 'react';

import { setRefs } from '../constants/refs';
import { useFocusedUsers } from '../stores';

export const AdminSection = () => {
	const { focusedUsers } = useFocusedUsers();
	const r = useRef(new Map());
	setRefs(r);

	return (
		<div>
			<Accordion defaultExpandedKeys={focusedUsers}>
				<AccordionItem key="election-status" title="Election Status">
					<div>Content for Election Status</div>
				</AccordionItem>
				<AccordionItem key="positions" title="Positions">
					<div>Content for Positions</div>
				</AccordionItem>
				<AccordionItem key="candidates" title="Candidates">
					<div>Content for Candidates</div>
				</AccordionItem>
			</Accordion>
		</div>
	);
};
