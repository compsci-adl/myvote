import { Outlet } from '@tanstack/react-router';

import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

export function Layout() {
	return (
		<>
			<Header />
			<Outlet />
			<Footer />
		</>
	);
}
