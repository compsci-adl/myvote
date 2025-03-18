import {
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router';
import { lazy } from 'react';

import { enforceLogin, getOidc } from './../oidc';
import { Layout } from './Layout';

const oidc = await getOidc();
const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: async () => {
		if (oidc.isUserLoggedIn) {
			router.navigate({ to: '/voting' });
		}
	},
	component: lazy(() => import('./../pages/WelcomePage')),
});

const protectedBeforeLoad = async () => {
	if (!oidc.isUserLoggedIn) {
		router.navigate({ to: '/' });
	} else {
		await enforceLogin();
	}
};

const votingRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'voting',
	beforeLoad: protectedBeforeLoad,
	component: lazy(() => import('./../pages/VotingPage')),
});

const candidatesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'candidates',
	beforeLoad: protectedBeforeLoad,
	component: lazy(() => import('./../pages/CandidatesPage')),
});

const isAdmin = () => {
	if (!oidc.isUserLoggedIn) return false;
	try {
		const accessToken = oidc.getTokens().accessToken;
		if (!accessToken) return false;

		const decodedToken = JSON.parse(atob(accessToken.split('.')[1]));
		return decodedToken?.realm_access?.roles.includes('restricted-access');
	} catch {
		return false;
	}
};

const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'admin',
	beforeLoad: async () => {
		if (!oidc.isUserLoggedIn) {
			router.navigate({ to: '/' });
		} else if (!isAdmin()) {
			router.navigate({ to: '/voting' });
		} else {
			await enforceLogin();
		}
	},
	component: lazy(() => import('./../pages/AdminPage')),
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	votingRoute,
	candidatesRoute,
	adminRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
