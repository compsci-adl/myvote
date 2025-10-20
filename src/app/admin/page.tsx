'use client';

import {
    Button,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Slider,
    useDisclosure,
} from '@heroui/react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import ChooseElection from '@/components/ChooseElection';
import ClosedNominations from '@/components/ClosedNominations';
import CloseVoting from '@/components/CloseVoting';
import ElectionSetup from '@/components/ElectionSetup/ElectionSetup';
import OpenNominations from '@/components/OpenNominations';
import OpenVoting from '@/components/OpenVoting';
import Results from '@/components/Results';
import { setRefs } from '@/constants/refs';
import type { ElectionStatus } from '@/db/schema';
import type { Election } from '@/types/election';

export default function AdminPage() {
    const { data: session } = useSession();
    const r = useRef(new Map());
    setRefs(r);

    const [sliderValue, setSliderValue] = useState(0);
    const [modalMessage, setModalMessage] = useState('');
    const [actionToConfirm, setActionToConfirm] = useState<() => void>(() => {});
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const [selectedElection, setSelectedElection] = useState<Election | null>(null);

    const pathname = usePathname();

    useEffect(() => {
        // If route is /admin/elections/[id]/setup or similar, fetch election
        const match = pathname.match(/\/admin\/elections\/(.+?)(?:\/|$)/);
        const electionId = match ? match[1] : null;
        if (electionId) {
            fetch(`/api/elections/${electionId}`)
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                    if (data) {
                        setSelectedElection({
                            id: data.id,
                            name: data.name,
                            status: data.status as ElectionStatus,
                        });
                        // Set slider based on status
                        switch (data.status) {
                            case 'PreRelease':
                                setSliderValue(2);
                                break;
                            case 'Nominations':
                                setSliderValue(3);
                                break;
                            case 'NominationsClosed':
                                setSliderValue(4);
                                break;
                            case 'Voting':
                                setSliderValue(5);
                                break;
                            case 'VotingClosed':
                                setSliderValue(6);
                                break;
                            case 'ResultsReleased':
                                setSliderValue(7);
                                break;
                            default:
                                setSliderValue(1);
                        }
                    }
                });
        }
    }, [pathname]);
    // Check if user is admin
    const isAdmin = () => {
        if (!session?.accessToken) return false;
        try {
            const decodedToken = JSON.parse(atob(session.accessToken.split('.')[1]));
            return decodedToken?.realm_access?.roles.includes('myvote-admin');
        } catch {
            return false;
        }
    };

    const handlePreviousStage = () => {
        setModalMessage('Information for this stage will be lost. Do you want to proceed?');
        setActionToConfirm(() => () => {
            setSliderValue((prevValue) => Math.max(prevValue - 1, 0));
        });
        onOpen();
    };

    const handleNextStage = () => {
        setModalMessage(
            'Make sure you confirm all the information you entered is correct. Do you want to proceed?'
        );
        setActionToConfirm(() => () => {
            setSliderValue((prevValue) => Math.min(prevValue + 1, 6));
        });
        onOpen();
    };

    const handleConfirm = () => {
        actionToConfirm();
        onOpenChange();
    };

    const handleCancel = () => {
        onOpenChange();
    };

    // Show loading spinner while session is loading
    const { status } = useSession();
    if (status === 'loading') {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">Loading...</p>
                </div>
            </div>
        );
    }
    // Check if user has admin access after session is loaded
    if (!isAdmin()) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex min-h-screen items-center justify-center">
                    <p className="text-center text-xl">Access denied. Admin privileges required.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="mb-8 text-center text-3xl font-bold">Admin Panel</h1>

            <div className="relative flex items-center py-5">
                <div className="flex-grow border-t border-gray-400"></div>
                <span className="mx-4 flex-shrink text-lg font-bold">Election Status</span>
                <div className="flex-grow border-t border-gray-400"></div>
            </div>

            <div>
                <Slider
                    value={sliderValue}
                    defaultValue={0}
                    minValue={0}
                    maxValue={6}
                    step={1}
                    marks={[
                        { value: 0, label: 'New/Existing Election' },
                        { value: 1, label: 'Election Setup' },
                        { value: 2, label: 'Open Nominations' },
                        { value: 3, label: 'Close Nominations' },
                        { value: 4, label: 'Open Voting' },
                        { value: 5, label: 'Close Voting' },
                        { value: 6, label: 'Release Results' },
                    ]}
                    hideThumb={true}
                    className="mx-auto mb-16 hidden w-[60rem] md:block"
                />
                <div className="mb-6 block text-center md:hidden">
                    <h2 className="text-md font-semibold">
                        Current Stage:{' '}
                        <span className="text-primary">
                            {
                                [
                                    'New/Existing Election',
                                    'Election Setup',
                                    'Open Nominations',
                                    'Close Nominations',
                                    'Open Voting',
                                    'Close Voting',
                                    'Release Results',
                                ][sliderValue]
                            }
                        </span>
                    </h2>
                </div>

                <div className="flex justify-center gap-4">
                    <Button
                        color="primary"
                        onPress={handlePreviousStage}
                        isDisabled={sliderValue === 0}
                    >
                        Previous Stage
                    </Button>
                    <Button
                        color="primary"
                        onPress={handleNextStage}
                        isDisabled={sliderValue === 6}
                    >
                        Next Stage
                    </Button>
                </div>
            </div>

            {sliderValue === 0 && (
                <ChooseElection
                    setSliderValue={setSliderValue}
                    selectedElection={selectedElection}
                    setSelectedElection={setSelectedElection}
                />
            )}
            {sliderValue === 1 && (
                <ElectionSetup
                    setSliderValue={setSliderValue}
                    setSelectedElection={setSelectedElection}
                />
            )}
            {sliderValue === 2 && selectedElection && (
                <OpenNominations electionId={selectedElection.id} setSliderValue={setSliderValue} />
            )}
            {sliderValue === 3 && selectedElection && (
                <ClosedNominations
                    electionId={selectedElection.id}
                    setSliderValue={setSliderValue}
                />
            )}
            {sliderValue === 4 && selectedElection && (
                <OpenVoting setSliderValue={setSliderValue} electionId={selectedElection.id} />
            )}
            {sliderValue === 5 && selectedElection && (
                <CloseVoting setSliderValue={setSliderValue} electionId={selectedElection.id} />
            )}
            {sliderValue === 6 && selectedElection && <Results electionId={selectedElection.id} />}

            <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
                <ModalContent>
                    {() => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Are you sure?</ModalHeader>
                            <ModalBody>
                                <p>{modalMessage}</p>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="secondary" onPress={handleCancel}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={handleConfirm}>
                                    Confirm
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
