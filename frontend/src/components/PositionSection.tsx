import { Button, Card, CardBody, CardFooter, Divider } from '@heroui/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState, useRef, memo } from 'react';
import { create } from 'zustand';

import { refs } from '../constants/refs';
import { useCandidateStore, useFocusedUsers, useSelectedTab } from '../stores';
import type { Candidate } from '../types/candidate';
import type { Position } from '../types/position';
import { TabType } from '../types/tab';
import { useDND } from '../utils/dnd';

type DraggingCandidateState = {
	isDragging: boolean;
	candidate: CandidateIndividual | null;
	start: (candidate: CandidateIndividual) => void;
	stop: () => void;
};
const useDraggingCandidate = create<DraggingCandidateState>((set) => ({
	isDragging: false,
	candidate: null,
	start: (candidate) => {
		set({ isDragging: true, candidate: candidate });
	},
	stop: () => set({ isDragging: false, candidate: null }),
}));

// We need the position for some additional checks (one candidate can have multiple cards across positions)
type CandidateIndividual = Candidate & { position: Position };

type CandidateCardProps = {
	i: number;
	c: CandidateIndividual;
	candidates: Candidate[][];
	setCandidates: (candidates: Candidate[][]) => void;
};
// We can memoize the component to save some time when rerendering (skip rendering if props arent changed)
const CandidateCard = memo((props: CandidateCardProps) => {
	const { setFocusedUsers } = useFocusedUsers();
	const { setSelectedTab } = useSelectedTab();
	const ref = useRef(null);
	const draggingCandidate = useDraggingCandidate();
	const [isDraggedOver, setIsDraggedOver] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	useDND(
		ref,
		{
			onDragStart: () => {
				setIsDragging(true);
				draggingCandidate.start(props.c);
			},
			onDrop: () => {
				setIsDragging(false);
			},
		},
		{
			onDragEnter: () => {
				const dc = useDraggingCandidate.getState();
				if (
					dc.candidate !== props.c &&
					dc.candidate?.position === props.c.position
				)
					setIsDraggedOver(true);
			},
			onDragLeave: () => {
				setIsDraggedOver(false);
			},
			canDrop: () => {
				const dc = useDraggingCandidate.getState();
				return dc.candidate?.position === props.c.position;
			},
			onDrop: () => {
				setIsDraggedOver(false);
				const dc = useDraggingCandidate.getState();
				const resAll = [...props.candidates];
				const res = [...props.candidates[props.c.position.id]];
				const id1 = props.candidates[props.c.position.id].findIndex(
					(x) => x.id === dc.candidate?.id,
				);
				res.splice(id1, 1);
				const id2 = props.candidates[props.c.position.id].findIndex(
					(x) => x.id === props.c.id,
				);
				res.splice(id2, 0, dc.candidate as Candidate);
				// res[id1] = props.c as Candidate;
				// res[id2] = dc.candidate as Candidate;
				resAll[props.c.position.id] = res;
				props.setCandidates(resAll);
			},
		},
		[props.candidates],
	);
	return (
		<motion.div
			transition={{
				type: 'spring',
				damping: 30,
				stiffness: 300,
			}}
			layout
			key={props.c.id}
		>
			<div 
				ref={ref}
			>
				{/* TODO: change useDND hook so y cord is known */}
				<Card
					className={clsx(
						isDraggedOver && 'translate-x-3',
						isDraggedOver && 'rotate-1',
						'm-3 bg-primary-100 p-3',
						isDragging && 'opacity-50',
					)}
				>
					{props.i === 0 ? (
						<p>🥇</p>
					) : props.i === 1 ? (
						<p>🥈</p>
					) : props.i === 2 ? (
						<p>🥉</p>
					) : props.i < 6 ? (
						<p>{props.i + 1}</p>
					) : (
						<></>
					)}
					<CardBody className="text-center">
						<h6>{props.c.name}</h6>
					</CardBody>
					<Divider />
					<CardFooter className="justify-center">
						<Button
							size="sm"
							isIconOnly={true}
							variant="flat"
							color="primary"
							className="text-xl"
							onClick={() => {
								// Update focused user to this one
								setFocusedUsers([props.c.id.toString()]);

								// Change tab and reset to top
								setSelectedTab(TabType.Candidates);
								window.scrollTo(0, 0);

								// Set timeout to scroll to our desired location
								// TODO: seek feedback on this implementation, and whether 'smooth' or 'instant' is better.
								setTimeout(
									() =>
										refs?.current
											.get(props.c.id)
											?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
									0,
								);
							}}
						>
							📝
						</Button>
					</CardFooter>
				</Card>
			</div>
		</motion.div>
	);
});

export const PositionSection = (props: { position: Position }) => {
	const { candidates, setCandidates } = useCandidateStore();
	return (
		<>
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="mx-4 flex-shrink text-lg font-bold">
					{props.position.name}
				</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(100px,250px))] items-center justify-center">
				{candidates[props.position.id].map((c, i) => (
					<CandidateCard
						i={i}
						candidates={candidates}
						setCandidates={setCandidates}
						key={c.id}
						c={{ ...c, position: props.position }}
					/>
				))}
			</div>
		</>
	);
};
