import { Button, Card, CardBody, CardFooter, Divider } from '@heroui/react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState, useRef, memo, useEffect } from 'react';
import useSWRMutation from 'swr/mutation';
import { create } from 'zustand';

import { refs } from '../constants/refs';
import { fetcher } from '../lib/fetcher';
import { useFocusedUsers, useSelectedTab } from '../stores';
import type { Candidate } from '../types/candidate';
import type { Position } from '../types/position';
import { TabType } from '../types/tab';
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
		set({ isDragging: true, candidate: candidate });
	},
	stop: () => set({ isDragging: false, candidate: null }),
}));

type CandidateIndividual = Candidate & { position: Position };

type CandidateCardProps = {
	i: number;
	c: CandidateIndividual;
	candidates: Candidate[][];
	setCandidates: (candidates: Candidate[][]) => void;
};

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
			<div ref={ref}>
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
				</Card>
			</div>
		</motion.div>
	);
});

export const PositionSection = (props: { position: Position }) => {
	const [candidates, setCandidates] = useState<Candidate[][]>([]);
	const [positions, setPositions] = useState([]);
	const [candidateLinks, setCandidateLinks] = useState<
		{ candidate_id: string }[]
	>([]);
	const [electionId, setElectionId] = useState('');

	const fetchElections = useSWRMutation('elections', fetcher.get.mutate, {
		onSuccess: (data) => {
			const firstElection = data.elections?.[0];

			if (firstElection) {
				setElectionId(firstElection.id);
			}
		},
	});

	const fetchCandidates = useSWRMutation(
		`candidates/${electionId}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => {
				setCandidates(data.candidates);
			},
			onError: (error) => {
				console.error('Error fetching candidates:', error);
			},
		},
	);

	const fetchPositions = useSWRMutation(
		`positions/${electionId}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => setPositions(data.positions),
		},
	);

	const fetchCandidateLinks = useSWRMutation(
		`candidate_position_links/${electionId}`,
		fetcher.get.mutate,
		{
			onSuccess: (data) => setCandidateLinks(data.candidate_position_links),
		},
	);

	useEffect(() => {
		if (electionId) {
			// Fetch the necessary data only if it hasn't been fetched yet
			if (!candidateLinks || candidateLinks.length === 0) {
				fetchCandidateLinks.trigger();
			} else if (!candidates || candidates.length === 0) {
				fetchCandidates.trigger();
			} else if (!positions || positions.length === 0) {
				fetchPositions.trigger();
			} else {
				const parsedCandidates = candidates.map((candidateGroup) => {
					if (candidateGroup && typeof candidateGroup === 'object') {
						// Filter candidateLinks to get only the links that match the candidate's ID
						const nominations = candidateLinks.filter(
							(link) => Number(link.candidate_id) === Number(candidateGroup.id),
						);

						// console.log('Candidate Group:', candidateGroup);
						// console.log('Nominations:', nominations);

						// console.log('Candidate Group ID:', candidateGroup.id);

						// Log candidate_ids from candidateLinks
						// candidateLinks.forEach((link) => {
						// 	console.log('Candidate ID:', String(link.candidate_id));
						// });

						return [
							{
								name: candidateGroup.name,
								id: candidateGroup.id,
								statement: candidateGroup.statement,
								nominations: nominations.map(
									(nomination) => nomination.position_id,
								),
							},
						];
					}
					return []; // Return empty array if it's not an array or object
				});

				if (
					parsedCandidates.every((group) =>
						group.every(
							(candidate) =>
								candidate.name &&
								candidate.id &&
								candidate.statement &&
								candidate.nominations,
						),
					)
				) {
					// console.log('Parsed Candidates:', parsedCandidates);
					setCandidates(parsedCandidates);
				}
			}
		}
	}, [
		electionId,
		fetchCandidates,
		candidates,
		fetchPositions,
		fetchCandidateLinks,
		candidateLinks,
		positions,
	]);

	useMount(() => {
		fetchElections.trigger();
	});

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
				{/* Render candidates once they're fetched */}
				{Array.isArray(candidates) &&
					candidates.length > 0 &&
					candidates.map(
						(candidateGroup, i) =>
							Array.isArray(candidateGroup) &&
							candidateGroup.map((c) => (
								<CandidateCard
									i={i}
									candidates={candidates}
									setCandidates={setCandidates}
									key={c.id}
									c={{ ...c, position: props.position }}
								/>
							)),
					)}
			</div>
		</>
	);
};
