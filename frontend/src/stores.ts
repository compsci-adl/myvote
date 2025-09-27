import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// import { candidates } from './data/candidates';
// import { positions } from './data/positions';
import type { Candidate } from './types/candidate';
import { TabType } from './types/tab';

type SelectedTabProps = {
	selectedTab: TabType;
	setSelectedTab: (selectedTab: TabType) => void;
};
export const useSelectedTab = create<SelectedTabProps>((set) => ({
	selectedTab: TabType.Voting,
	setSelectedTab: (selectedTab: TabType) => set({ selectedTab }),
}));

type FocusedUsersProps = {
	focusedUsers: string[];
	setFocusedUsers: (focusedUsers: string[]) => void;
};
export const useFocusedUsers = create<FocusedUsersProps>((set) => ({
	focusedUsers: [],
	setFocusedUsers: (focusedUsers: string[]) => set({ focusedUsers }),
}));

type CandidateProps = {
	candidates: Candidate[][];
	setCandidates: (candidates: Candidate[][]) => void;
};

function shuffleArray(array: Candidate[]) {
	for (let i = array.length - 1; i >= 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

// export const useCandidateStore = create(
// 	persist<CandidateProps>(
// 		(set) => ({
// 			candidates: positions.map((p) => {
// 				const r = candidates.filter((c) => c.nominations.includes(p.id));
// 				shuffleArray(r);
// 				return r;
// 			}),
// 			setCandidates: (candidates: Candidate[][]) => set({ candidates }),
// 		}),
// 		{ name: 'vote-storage' },
// 	),
// );
