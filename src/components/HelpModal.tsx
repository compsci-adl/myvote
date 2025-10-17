'use client';
import {
    Button,
    Card,
    CardBody,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Tab,
    Tabs,
} from '@heroui/react';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { useHelpModal } from '../helpers/help-modal';
import { useMount } from '../utils/mount';
import { prefetchImages } from '../utils/prefetch-image';

export const HelpModal = () => {
    const STEPS = [
        {
            content:
                "Welcome to MyVote, the CS Club's voting system for committee elections! This tutorial will guide you through the voting process.",
            image: {
                path: '/help/welcome.webp',
                alt: 'Website preview',
            },
        },
        {
            content:
                'Step 1: Log in using your CS Club account (ensure you have paid for your membership).',
            image: {
                path: '/help/login.webp',
                alt: 'Login screen',
            },
        },
        {
            content: 'Step 2: Have a look at the available positions for this election.',
            image: { path: '/help/positions.webp', alt: 'Positions page' },
        },
        {
            content: 'Step 3: Have a look at the available candidates for this election.',
            image: {
                path: '/help/candidates.webp',
                alt: 'Candidates page',
            },
        },
        {
            content:
                'Step 4: Place your vote by clicking/dragging on candidates and ordering them on preference',
            image: { path: '/help/move-cards.webp', alt: 'Vote placement' },
        },
        {
            content:
                'Step 5: Submit your vote by clicking on the submit button and confirming your choices.',
            image: {
                path: '/help/submit-vote.webp',
                alt: 'Submit vote',
            },
        },
        {
            content:
                'Step 6: If you want to edit your vote, you can follow the same process and submit your updated vote before the election ends.',
            image: {
                path: '/help/edit-vote.webp',
                alt: 'Edit vote',
            },
        },
    ];

    useMount(() => {
        const imagePaths = STEPS.map((step) => step.image.path);
        prefetchImages(imagePaths);
    });

    const helpModal = useHelpModal();

    const [direction, setDirection] = useState(true);
    const [stepIndexKey, setStepIndexKey] = useState('0');
    const stepIndex = Number(stepIndexKey);
    const setStepIndex = (index: number) => {
        setDirection(index >= stepIndex);
        setStepIndexKey(String(index));
    };
    const slideVariants = {
        enter: (direction: boolean) => ({
            x: direction ? '100%' : '-100%',
        }),
        center: { x: 0 },
        exit: (direction: boolean) => ({
            x: direction ? '-100%' : '100%',
        }),
    };

    useEffect(() => {
        if (!helpModal.isOpen) {
            setStepIndex(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [helpModal.isOpen]);

    const step = STEPS[stepIndex];

    return (
        <Modal
            size="3xl"
            isOpen={helpModal.isOpen}
            onClose={helpModal.close}
            scrollBehavior="inside"
        >
            <ModalContent>
                <ModalHeader>How to use MyVote</ModalHeader>
                <ModalBody>
                    {/* FIXME: Tabs are missing animation when controlled */}
                    <Tabs
                        aria-label="Help Steps"
                        selectedKey={stepIndexKey}
                        onSelectionChange={(step) => setStepIndex(Number(step))}
                        className="self-center"
                        variant="underlined"
                    >
                        {STEPS.map((_, i) => (
                            <Tab key={i} title={i + 1} />
                        ))}
                    </Tabs>
                    <div className="relative h-[38rem] w-full overflow-x-hidden">
                        <AnimatePresence initial={false} custom={direction}>
                            <motion.div
                                key={stepIndexKey}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ ease: 'easeInOut', duration: 0.3 }}
                                className="absolute h-full w-full p-4 mobile:p-1"
                            >
                                <Card className="h-full p-2 mobile:p-1">
                                    <CardBody className="gap-2">
                                        <div className="text-lg mobile:text-sm">{step.content}</div>
                                        <div className="flex grow items-center justify-center">
                                            <img
                                                alt={step.image.alt}
                                                src={step.image.path}
                                                className="max-h-[28rem]"
                                            />
                                        </div>
                                    </CardBody>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </ModalBody>
                <ModalFooter className="justify-between">
                    <Button
                        color="primary"
                        onClick={() => setStepIndex(stepIndex - 1)}
                        className={clsx('invisible', stepIndex > 0 && 'visible')}
                    >
                        Previous
                    </Button>
                    {stepIndex < STEPS.length - 1 ? (
                        <Button
                            className="self-end"
                            color="primary"
                            onClick={() => setStepIndex(stepIndex + 1)}
                        >
                            Next
                        </Button>
                    ) : (
                        <Button color="primary" onClick={helpModal.close}>
                            Get Started
                        </Button>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
