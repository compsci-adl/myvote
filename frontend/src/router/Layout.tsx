import { Outlet } from '@tanstack/react-router';

import { Footer } from '../components/Footer';
import { Header } from '../components/Header';

export function Layout() {
	return (
		<>
			<Header />
			<div className="mx-4 my-2 md:mx-8 md:my-4">
				<Outlet />
			</div>
			<Footer />
		</>
	);
}
