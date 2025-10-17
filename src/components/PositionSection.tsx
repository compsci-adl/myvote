'use client';

import type { DragStartEvent } from '@dnd-kit/core';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardBody } from '@heroui/react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import React, { memo } from 'react';

import type { Candidate } from '../types/candidate';
import type { Position } from '../types/position';

type CandidateIndividual = Candidate & { position: Position };

const CandidateCard = memo(({ i, c }: { i: number; c: CandidateIndividual }) => {
    const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({ id: c.id });
    return (
        <motion.div transition={{ type: 'spring', damping: 30, stiffness: 300 }} layout key={c.id}>
            <div ref={setNodeRef} {...attributes} {...listeners} style={{ touchAction: 'none' }}>
                <Card
                    className={clsx(
                        isOver && 'translate-x-3',
                        isOver && 'rotate-1',
                        'm-3 p-3 select-none',
                        c.position.executive ? 'bg-orange-100 border-orange-500' : 'bg-primary-100',
                        isDragging && (c.position.executive ? 'bg-orange-200' : 'bg-blue-200'),
                        isDragging && 'opacity-50'
                    )}
                    style={{
                        touchAction: 'none',
                        borderColor: c.position.executive ? '#f97316' : undefined,
                    }}
                >
                    {i === 0 ? (
                        <p
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'none',
                            }}
                        >
                            🥇
                        </p>
                    ) : i === 1 ? (
                        <p
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'none',
                            }}
                        >
                            🥈
                        </p>
                    ) : i === 2 ? (
                        <p
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'none',
                            }}
                        >
                            🥉
                        </p>
                    ) : (
                        <p
                            style={{
                                userSelect: 'none',
                                WebkitUserSelect: 'none',
                                touchAction: 'none',
                            }}
                        >
                            {i + 1}
                        </p>
                    )}
                    <CardBody className="text-center">
                        <h6 style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>{c.name}</h6>
                    </CardBody>
                </Card>
            </div>
        </motion.div>
    );
});
CandidateCard.displayName = 'CandidateCard';

export const PositionSection = ({
    position,
    candidates,
    setCandidates,
    loading = false,
}: {
    position: Position;
    candidates: Record<string, Candidate[]>;
    setCandidates: React.Dispatch<React.SetStateAction<Record<string, Candidate[]>>>;
    loading?: boolean;
}) => {
    // Use candidates passed from parent, do not refetch here
    const showSkeletons = loading;
    const showCandidates =
        !loading && candidates[String(position.id)] && candidates[String(position.id)].length > 0;

    const isTouchDevice =
        typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    const pointerSensor = useSensor(PointerSensor);
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 100,
            tolerance: 5,
        },
    });
    const sensors = useSensors(...(isTouchDevice ? [touchSensor] : [pointerSensor]));

    const [activeId, setActiveId] = React.useState<string | null>(null);

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id.toString());
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveId(null);
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const positionId = String(position.id);
        const items = candidates[positionId] || [];
        const oldIndex = items.findIndex((x) => x.id === active.id);
        const newIndex = items.findIndex((x) => x.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;
        const newItems = arrayMove(items, oldIndex, newIndex);
        setCandidates({ ...candidates, [positionId]: newItems });
    }

    return (
        <>
            <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-400"></div>
                <span
                    className={clsx(
                        'mx-4 flex-shrink text-lg font-bold',
                        position.executive && 'text-orange-700'
                    )}
                >
                    {position.name}
                </span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={showCandidates ? candidates[String(position.id)].map((c) => c.id) : []}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,250px))] items-center justify-center">
                        {showSkeletons
                            ? Array.from({ length: 4 }).map((_, i) => (
                                  <div
                                      key={i}
                                      className="m-3 bg-primary-100 p-3 rounded-2xl flex flex-col items-start justify-center min-h-[100px] min-w-[220px] shadow animate-pulse"
                                  >
                                      <div className="text-lg font-semibold text-gray-400 mb-2">
                                          {i + 1}
                                      </div>
                                      <div className="w-32 h-6 bg-gray-200 dark:bg-gray-900 rounded mt-2 mx-auto self-center"></div>
                                  </div>
                              ))
                            : showCandidates
                              ? candidates[String(position.id)].map((c, i) => (
                                    <CandidateCard key={c.id} i={i} c={{ ...c, position }} />
                                ))
                              : null}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId
                        ? (() => {
                              const draggedList = candidates[String(position.id)] || [];
                              const draggedIndex = draggedList.findIndex((c) => c.id === activeId);
                              const dragged = draggedList[draggedIndex];
                              if (!dragged) return null;
                              let numberOrMedal;
                              if (draggedIndex === 0) numberOrMedal = '🥇';
                              else if (draggedIndex === 1) numberOrMedal = '🥈';
                              else if (draggedIndex === 2) numberOrMedal = '🥉';
                              else numberOrMedal = draggedIndex + 1;
                              return (
                                  <Card
                                      className={clsx(
                                          'm-3 p-3 select-none',
                                          dragged?.executive ? 'bg-orange-100' : 'bg-primary-100'
                                      )}
                                      style={{
                                          userSelect: 'none',
                                          WebkitUserSelect: 'none',
                                          borderRadius: '1rem',
                                          minWidth: 220,
                                          minHeight: 100,
                                          borderColor: dragged?.executive ? '#f97316' : undefined,
                                      }}
                                  >
                                      <div style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
                                          {numberOrMedal}
                                      </div>
                                      <CardBody
                                          className="text-center"
                                          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                                      >
                                          <h6
                                              style={{
                                                  userSelect: 'none',
                                                  WebkitUserSelect: 'none',
                                              }}
                                          >
                                              {dragged.name}
                                          </h6>
                                      </CardBody>
                                  </Card>
                              );
                          })()
                        : null}
                </DragOverlay>
            </DndContext>
        </>
    );
};
