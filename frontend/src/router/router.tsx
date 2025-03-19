import {
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router';
import { lazy } from 'react';

import { fetcher } from '../lib/fetcher';
import { enforceLogin, getOidc } from './../oidc';
import { Layout } from './Layout';

const oidc = await getOidc();
const rootRoute = createRootRoute({ component: Layout });

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	beforeLoad: async () => {
		if (oidc.isUserLoggedIn) {
			const keycloakId = oidc.getTokens().decodedIdToken.sub;

			// Fetch membership status
			try {
				const response = await fetcher.get.query([`membership/${keycloakId}`]);

				if (response.status === 'Paid member') {
					// Check if local storage needs to be updated
					const existingStudentId = localStorage.getItem('student_id');
					const existingFullName = localStorage.getItem('full_name');

					if (
						existingStudentId !== response.student_id ||
						existingFullName !== response.full_name
					) {
						localStorage.setItem('student_id', response.student_id);
						localStorage.setItem('full_name', response.full_name);
					}

					// Redirect to voting page
					router.navigate({ to: '/voting' });
				} else if (response.status === 'Unpaid member') {
					alert(
						'Please pay for your membership on the CS Club Website first. Then logout and login again.',
					);
				} else {
					alert(
						'Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.',
					);
				}
			} catch (error) {
				alert(
					'Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.',
				);
			}
		}
	},
	component: lazy(() => import('./../pages/WelcomePage')),
});

const protectedBeforeLoad = async () => {
	if (!oidc.isUserLoggedIn) {
		router.navigate({ to: '/' });
	} else if (oidc.isUserLoggedIn) {
		const keycloakId = oidc.getTokens().decodedIdToken.sub;

		// Fetch membership status
		try {
			// const response = await fetcher.get.query([`membership/${keycloakId}`]);
			const response = await fetcher.get.query([
				`membership/c37fc37e-f49f-4850-91f3-343c6f34c3cf`,
			]);

			if (response.status === 'Paid member') {
				return;
			} else if (response.status === 'Unpaid member') {
				alert(
					'Please pay for your membership on the CS Club Website first. Then logout and login again.',
				);
				router.navigate({ to: '/' });
			} else {
				alert(
					'Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.',
				);
				router.navigate({ to: '/' });
			}
		} catch (error) {
			alert(
				'Please create an account on the CS Club Website first and pay for your membership. Then logout and login again.',
			);
			router.navigate({ to: '/' });
		}
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
