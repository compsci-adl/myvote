import {
	Button,
	ButtonGroup,
	Navbar,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	Tooltip,
} from '@heroui/react';
import clsx from 'clsx';

import { useFocusedUsers, useSelectedTab } from '../stores';
import { TabType } from '../types/tab';
import { useDarkMode } from '../utils/dark-mode';

const HEADER_BUTTON_PROPS = {
	size: 'sm',
	isIconOnly: true,
	variant: 'flat',
	color: 'primary',
	className: 'text-xl',
} as const;

export const Header = () => {
	const { isDarkMode, toggleIsDarkMode } = useDarkMode();
	const { selectedTab, setSelectedTab } = useSelectedTab();
	const { setFocusedUsers } = useFocusedUsers();

	return (
		<Navbar
			isBordered
			maxWidth="xl"
			position="static"
			classNames={{ wrapper: 'px-4' }}
		>
			<NavbarBrand>
				<img src="/favicon.svg" alt="Logo" className="mr-2 w-6" />
				<h1 className="font-bold text-inherit">MyVote</h1>
			</NavbarBrand>
			<NavbarContent justify="center">
				<ButtonGroup>
					<Button
						className={clsx({
							'bg-primary': selectedTab === TabType.Voting,
						})}
						onClick={() => {
							if (selectedTab !== TabType.Voting)
								setSelectedTab(TabType.Voting);
						}}
					>
						Voting
					</Button>
					<Button
						className={clsx({
							'bg-primary': selectedTab === TabType.Candidates,
						})}
						onClick={() => {
							if (selectedTab !== TabType.Candidates) {
								setFocusedUsers([]);
								setSelectedTab(TabType.Candidates);
							}
						}}
					>
						Candidates
					</Button>
				</ButtonGroup>
			</NavbarContent>
			<NavbarContent justify="end">
				<NavbarItem>
					<Tooltip content="Toggle Dark Mode" size="sm">
						<Button {...HEADER_BUTTON_PROPS} onClick={toggleIsDarkMode}>
							{isDarkMode ? '🌚' : '🌞'}
						</Button>
					</Tooltip>
				</NavbarItem>
			</NavbarContent>
		</Navbar>
	);
};
