import { CandidatesSection } from './components/CandidatesSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { VotingSection } from './components/VotingSection';
import { useSelectedTab } from './stores';
import { TabType } from './types/tab';

export const App = () => {
	const { selectedTab } = useSelectedTab();
	return (
		<>
			<Header />
			<main className="mx-auto max-w-screen-xl space-y-4 px-2 py-4">
				{selectedTab === TabType.Voting ? (
					<VotingSection />
				) : (
					<CandidatesSection />
				)}
				<Footer />
			</main>
		</>
	);
};
