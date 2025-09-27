import { Button } from '@heroui/react';

import { useOidc } from './../oidc';

export default function WelcomePage() {
	const { isUserLoggedIn } = useOidc();
	return (
		<div className="flex min-h-screen flex-col items-center justify-center">
			<img src="/favicon.svg" alt="MyVote Logo" className="mb-4 h-24 w-24" />
			<h1 className="mb-4 text-4xl font-bold">Welcome to MyVote</h1>
			<p className="mb-8 text-lg">
				The Computer Science Club's new voting system!
			</p>
			{isUserLoggedIn ? <LoggedInAuthButton /> : <NotLoggedInAuthButton />}
		</div>
	);
}

const LoggedInAuthButton = () => {
	const { logout } = useOidc({ assert: 'user logged in' });

	return (
		<div className="flex items-center gap-2">
			<Button
				color="primary"
				size="lg"
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
		<Button color="primary" size="lg" onPress={() => login()}>
			Login
		</Button>
	);
};
