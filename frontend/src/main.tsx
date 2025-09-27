import { HeroUIProvider } from '@heroui/react';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { Error } from './components/Error.tsx';
import './index.css';
import { OidcProvider } from './oidc';
import { router } from './router/router';

// import { mountStoreDevtool } from 'simple-zustand-devtools';

// Zustand
if (import.meta.env.DEV) {
	// mountStoreDevtool('Courses', useEnrolledCourses);
}
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary FallbackComponent={Error}>
			<OidcProvider>
				<HeroUIProvider>
					<RouterProvider router={router} />
				</HeroUIProvider>
			</OidcProvider>
		</ErrorBoundary>
	</StrictMode>,
);
