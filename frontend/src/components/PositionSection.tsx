import { Card, CardBody } from '@heroui/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState, useRef, memo, useEffect } from 'react';
import useSWRMutation from 'swr/mutation';
import { create } from 'zustand';

import { fetcher } from '../lib/fetcher';
import type { Candidate } from '../types/candidate';
import type { Position } from '../types/position';
import { useDND } from '../utils/dnd';
import { useMount } from './../hooks/use-mount';

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
		set({ isDragging: true, candidate });
	},
	stop: () => set({ isDragging: false, candidate: null }),
}));

type CandidateIndividual = Candidate & { position: Position };

type CandidateCardProps = {
	i: number;
	c: CandidateIndividual;
	candidates: Record<number, Candidate[]>;
	setCandidates: (candidates: Record<number, Candidate[]>) => void;
};

const CandidateCard = memo(
	({ i, c, candidates, setCandidates }: CandidateCardProps) => {
		const ref = useRef<HTMLDivElement>(null);
		const draggingCandidate = useDraggingCandidate();
		const [isDraggedOver, setIsDraggedOver] = useState(false);
		const [isDragging, setIsDragging] = useState(false);

		useDND(
			ref,
			{
				onDragStart: () => {
					setIsDragging(true);
					draggingCandidate.start(c);
				},
				onDrop: () => {
					setIsDragging(false);
				},
			},
			{
				onDragEnter: () => {
					const dc = useDraggingCandidate.getState();
					if (
						dc.candidate &&
						dc.candidate.id !== c.id &&
						dc.candidate.position.id === c.position.id
					) {
						setIsDraggedOver(true);
					}
				},
				onDragLeave: () => {
					setIsDraggedOver(false);
				},
				canDrop: () => {
					const dc = useDraggingCandidate.getState();
					return dc.candidate?.position.id === c.position.id;
				},
				onDrop: () => {
					setIsDraggedOver(false);
					const dc = useDraggingCandidate.getState();
					if (!dc.candidate) return;

					const positionId = c.position.id;
					if (!candidates[positionId]) return;

					const updatedCandidates = { ...candidates };
					const res = [...(updatedCandidates[positionId] || [])];

					const draggedIndex = res.findIndex((x) => x.id === dc.candidate?.id);
					const targetIndex = res.findIndex((x) => x.id === c.id);

					if (draggedIndex !== -1 && targetIndex !== -1) {
						const [movedCandidate] = res.splice(draggedIndex, 1);
						res.splice(targetIndex, 0, movedCandidate);
					}

					updatedCandidates[positionId] = res;
					setCandidates(updatedCandidates);
				},
			},
			[candidates],
		);

		return (
			<motion.div
				transition={{
					type: 'spring',
					damping: 30,
					stiffness: 300,
				}}
				layout
				key={c.id}
			>
				<div ref={ref}>
					<Card
						className={clsx(
							isDraggedOver && 'translate-x-3',
							isDraggedOver && 'rotate-1',
							'm-3 bg-primary-100 p-3',
							isDragging && 'opacity-50',
						)}
					>
						{i === 0 ? (
							<p>🥇</p>
						) : i === 1 ? (
							<p>🥈</p>
						) : i === 2 ? (
							<p>🥉</p>
						) : (
							<p>{i + 1}</p>
						)}
						<CardBody className="text-center">
							<h6>{c.name}</h6>
						</CardBody>
					</Card>
				</div>
			</motion.div>
		);
	},
);

export const PositionSection = ({ position }: { position: Position }) => {
	const [candidates, setCandidates] = useState<Record<number, Candidate[]>>({});
	const [electionId, setElectionId] = useState<string | null>(null);

	const fetchElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			const firstElection = data.elections?.[0];
			if (firstElection) {
				setElectionId(firstElection.id);
			}
		},
	});

	const fetchCandidates = useSWRMutation(
		electionId ? `candidates/${electionId}` : null,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				if (Array.isArray(data.candidates)) {
					setCandidates((prev) => ({
						...prev,
						[position.id]: data.candidates,
					}));
				}
			},
			onError: (error) => console.error('Error fetching candidates:', error),
		},
	);

	useMount(() => {
		fetchElections.trigger();
	});

	useEffect(() => {
		if (electionId) {
			fetchCandidates.trigger();
		}
	}, [electionId, fetchCandidates]);

	return (
		<>
			<div className="relative flex items-center py-5">
				<div className="flex-grow border-t border-gray-400"></div>
				<span className="mx-4 flex-shrink text-lg font-bold">
					{position.name}
				</span>
				<div className="flex-grow border-t border-gray-400"></div>
			</div>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(100px,250px))] items-center justify-center">
				{candidates[position.id] && candidates[position.id].length > 0 ? (
					candidates[position.id].map((c, i) => (
						<CandidateCard
							key={c.id}
							i={i}
							c={{ ...c, position }}
							candidates={candidates}
							setCandidates={setCandidates}
						/>
					))
				) : (
					<p className="text-center">No candidates available</p>
				)}
			</div>
		</>
	);
};
