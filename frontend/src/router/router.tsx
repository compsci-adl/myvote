import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
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
			router.navigate({ to: '/' });
		}
	},
	component: lazy(() => import('./../pages/WelcomePage')),
});
const protectedRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: 'protected',
	beforeLoad: async () => {
		if (!oidc.isUserLoggedIn) {
			router.navigate({ to: '/' });
		} else {
			await enforceLogin();
		}
	},
	component: lazy(() => import('./../pages/WelcomePage')),
});

const routeTree = rootRoute.addChildren([indexRoute, protectedRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}