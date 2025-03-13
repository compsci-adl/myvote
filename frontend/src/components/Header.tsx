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
import { useOidc } from './../oidc';

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
	const { isUserLoggedIn, initializationError } = useOidc();

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
				{isUserLoggedIn && (
					<ButtonGroup>
						<Button
							className={clsx({ 'bg-primary': selectedTab === TabType.Voting })}
							onPress={() => setSelectedTab(TabType.Voting)}
						>
							Voting
						</Button>
						<Button
							className={clsx({
								'bg-primary': selectedTab === TabType.Candidates,
							})}
							onPress={() => {
								setFocusedUsers([]);
								setSelectedTab(TabType.Candidates);
							}}
						>
							Candidates
						</Button>
						<Button
							className={clsx({ 'bg-primary': selectedTab === TabType.Admin })}
							onPress={() => setSelectedTab(TabType.Admin)}
						>
							Admin
						</Button>
					</ButtonGroup>
				)}
			</NavbarContent>
			<NavbarContent justify="end">
				{initializationError && (
					<span className="text-red-500">
						{initializationError.isAuthServerLikelyDown
							? 'Keycloak server is down'
							: `Auth Error: ${initializationError.message}`}
					</span>
				)}

				<NavbarItem>
					<Tooltip content="Toggle Dark Mode" size="sm">
						<Button {...HEADER_BUTTON_PROPS} onPress={toggleIsDarkMode}>
							{isDarkMode ? '🌚' : '🌞'}
						</Button>
					</Tooltip>
				</NavbarItem>
			</NavbarContent>
		</Navbar>
	);
};
