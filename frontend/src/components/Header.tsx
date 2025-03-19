import {
	Button,
	ButtonGroup,
	Navbar,
	NavbarBrand,
	NavbarContent,
	NavbarItem,
	Tooltip,
} from '@heroui/react';
import { useRouter, useMatchRoute } from '@tanstack/react-router';
import clsx from 'clsx';

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
	const { isUserLoggedIn, initializationError, tokens } = useOidc();
	const router = useRouter();
	const matchRoute = useMatchRoute();

	const isActive = (path: string) => !!matchRoute({ to: path, fuzzy: false });

	const isAdmin = () => {
		if (!tokens) return false;
		try {
			const decodedToken = JSON.parse(atob(tokens.accessToken.split('.')[1]));
			return decodedToken?.realm_access?.roles.includes('restricted-access');
		} catch {
			return false;
		}
	};

	return (
		<div className="flex h-full flex-col">
			<Navbar maxWidth="xl" position="static" classNames={{ wrapper: 'px-4' }}>
				<NavbarBrand>
					<img src="/favicon.svg" alt="Logo" className="mr-2 w-6" />
					<h1 className="font-bold text-inherit">MyVote</h1>
				</NavbarBrand>

				<NavbarContent justify="end" className="flex items-center gap-4">
					{initializationError && (
						<span className="text-red-500">
							{initializationError.isAuthServerLikelyDown
								? 'Auth server is down'
								: `Auth Error: ${initializationError.message}`}
						</span>
					)}

					{isUserLoggedIn ? <LoggedInAuthButton /> : <NotLoggedInAuthButton />}

					<NavbarItem>
						<Tooltip content="Toggle Dark Mode" size="sm">
							<Button {...HEADER_BUTTON_PROPS} onPress={toggleIsDarkMode}>
								{isDarkMode ? '🌚' : '🌞'}
							</Button>
						</Tooltip>
					</NavbarItem>
				</NavbarContent>
			</Navbar>

			<Navbar
				isBordered
				maxWidth="xl"
				position="static"
				classNames={{ wrapper: 'px-4' }}
			>
				<NavbarContent justify="center" className="w-full">
					{isUserLoggedIn && (
						<ButtonGroup className="mx-auto">
							<Button
								className={clsx({ 'bg-primary': isActive('/voting') })}
								onPress={() => router.navigate({ to: '/voting' })}
							>
								Voting
							</Button>
							<Button
								className={clsx({ 'bg-primary': isActive('/candidates') })}
								onPress={() => router.navigate({ to: '/candidates' })}
							>
								Candidates
							</Button>
							{isAdmin() && (
								<Button
									className={clsx({ 'bg-primary': isActive('/admin') })}
									onPress={() => router.navigate({ to: '/admin' })}
								>
									Admin
								</Button>
							)}
						</ButtonGroup>
					)}
				</NavbarContent>
			</Navbar>
		</div>
	);
};

const LoggedInAuthButton = () => {
	const { logout } = useOidc({ assert: 'user logged in' });

	return (
		<div className="flex items-center gap-2">
			<Button
				color="primary"
				size="md"
				onPress={() => logout({ redirectTo: 'home' })}
			>
				Logout
			</Button>
		</div>
	);
};

const NotLoggedInAuthButton = () => {
	const { login } = useOidc({ assert: 'user not logged in' });

	return (
		<Button color="primary" size="md" onPress={() => login()}>
			Login
		</Button>
	);
};
