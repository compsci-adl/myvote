import { NextUIProvider } from '@nextui-org/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';

import { App } from './App.tsx';
import { Error } from './components/Error.tsx';
import './index.css';

// import { mountStoreDevtool } from 'simple-zustand-devtools';

// Zustand
if (import.meta.env.DEV) {
	// mountStoreDevtool('Courses', useEnrolledCourses);
}
createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<ErrorBoundary FallbackComponent={Error}>
			<NextUIProvider>
				<App />
			</NextUIProvider>
		</ErrorBoundary>
	</StrictMode>,
);
