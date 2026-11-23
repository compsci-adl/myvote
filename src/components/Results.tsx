'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { useRef, useState } from 'react';
import useSWR from 'swr';

import type { Election } from '@/types/election';
import type { PositionResult } from '@/types/position-result';
import type { Voter } from '@/types/voter';

import { fetcher } from '../lib/fetcher';

interface ResultsProps {
    electionId: string;
}

type ApiResult = { results: PositionResult[] };

export default function Results({ electionId }: ResultsProps) {
    return <ElectionResults key={electionId} electionId={electionId} />;
}

function ElectionResults({ electionId }: ResultsProps) {
    const [recount, setRecount] = useState<ApiResult | null>(null);
    const [confirmedPositions, setConfirmedPositions] = useState<string[]>([]);
    const [manualOverrides, setManualOverrides] = useState<
        Record<string, string[]>
    >({});
    const [manualSelection, setManualSelection] = useState<string[] | null>(
        null,
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    const {
        data,
        error: loadError,
        isLoading,
    } = useSWR<ApiResult>(
        [`results/${electionId}`],
        ([url]) => fetcher.get.query([url]) as Promise<ApiResult>,
    );
    const { data: elections } = useSWR<Election[]>(
        ['elections'],
        ([url]) => fetcher.get.query([url]) as Promise<Election[]>,
    );
    const electionName =
        elections?.find((e) => e.id === electionId)?.name || 'election';
    const results = (recount ?? data)?.results ?? [];
    const current = results[confirmedPositions.length];
    const complete =
        results.length > 0 && confirmedPositions.length === results.length;

    const confirmPosition = async () => {
        if (!current || inFlight.current) return;
        inFlight.current = true;
        setSubmitting(true);
        setError('');
        const nextConfirmed = [...confirmedPositions, current.position_id];
        const nextOverrides =
            manualSelection === null
                ? manualOverrides
                : {
                      ...manualOverrides,
                      [current.position_id]: manualSelection,
                  };
        try {
            const response = (await fetcher.post.query([
                `results/${electionId}`,
                {
                    json: {
                        confirmedPositions: nextConfirmed,
                        manualOverrides: nextOverrides,
                    },
                },
            ])) as ApiResult;
            setRecount(response);
            setConfirmedPositions(nextConfirmed);
            setManualOverrides(nextOverrides);
            setManualSelection(null);
        } catch {
            setError(
                'Could not confirm this position. No confirmations were changed. Please try again.',
            );
        } finally {
            inFlight.current = false;
            setSubmitting(false);
        }
    };

    const downloadCSV = (rows: string[][], filename: string) => {
        const content = rows
            .map((row) =>
                row.map((field) => `"${field.replace(/"/g, '""')}"`).join(','),
            )
            .join('\n');
        const url = URL.createObjectURL(
            new Blob([content], { type: 'text/csv;charset=utf-8;' }),
        );
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
    };

    const exportResults = () => {
        const rows = [
            [
                'Position',
                'Candidate',
                'Is Winner',
                'Hare-Clark Points',
                'Borda Points',
            ],
        ];
        for (const position of results) {
            const winners = new Set(
                position.winners.map((winner) => winner.id),
            );
            for (const candidate of position.candidates) {
                rows.push([
                    position.position_name,
                    candidate.name || candidate.id,
                    winners.has(candidate.id) ? 'Yes' : 'No',
                    String(candidate.total_points),
                    String(candidate.borda_points),
                ]);
            }
        }
        downloadCSV(rows, `${electionName} Results.csv`);
    };

    const exportVoters = async () => {
        try {
            const response = (await fetcher.get.query([
                `voters/${electionId}`,
            ])) as { voters: Voter[] };
            downloadCSV(
                [
                    ['Name', 'Student ID'],
                    ...response.voters.map((voter) => [
                        voter.name || '',
                        voter.student_id,
                    ]),
                ],
                `${electionName} Voters.csv`,
            );
        } catch {
            setError('Could not export voters. Please try again.');
        }
    };

    return (
        <div className="mt-8">
            <h1 className="mb-4 text-2xl font-bold">Election Results</h1>
            <p className="mb-4">
                Confirm positions in order, one at a time. Confirmed winners are
                removed from later positions, which are recounted using
                Hare-Clark. Later results are provisional.
            </p>
            <p className="mb-4" role="status">
                {complete
                    ? 'All positions confirmed.'
                    : `${confirmedPositions.length} of ${results.length} positions confirmed.`}
            </p>
            <p className="mb-4 text-sm">
                Confirmations last for this session only. Leaving or reloading
                this page resets them.
            </p>
            {isLoading && !recount && <p>Loading results…</p>}
            {loadError && !recount && (
                <p role="alert">Could not load results.</p>
            )}
            {!isLoading && !loadError && results.length === 0 && (
                <p>No results found.</p>
            )}
            {error && (
                <p className="mb-4 text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            )}

            {results.map((position, index) => {
                const confirmed = index < confirmedPositions.length;
                const active = index === confirmedPositions.length;
                const tied = position.winners.length > position.vacancies;
                const winners =
                    active && manualSelection !== null
                        ? position.candidates.filter((candidate) =>
                              manualSelection.includes(candidate.id),
                          )
                        : position.winners;
                return (
                    <Card
                        key={position.position_id}
                        className="mb-6 bg-gray-200 dark:bg-gray-800"
                    >
                        <CardHeader>
                            <h2 className="text-xl font-semibold">
                                {position.position_name} —{' '}
                                {confirmed
                                    ? 'Confirmed'
                                    : active
                                      ? 'Awaiting confirmation'
                                      : 'Provisional'}
                            </h2>
                        </CardHeader>
                        <CardBody>
                            <h3 className="font-medium">
                                Winner(s) ({winners.length}/{position.vacancies}
                                ):
                            </h3>
                            {winners.length > 0 ? (
                                <ul className="list-disc pl-5">
                                    {winners.map((winner) => (
                                        <li key={winner.id}>
                                            {winner.name || winner.id}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No winner(s)</p>
                            )}
                            {winners.length < position.vacancies && (
                                <p className="mt-2 text-orange-600 dark:text-orange-400">
                                    This position has unfilled vacancies.
                                </p>
                            )}
                            {active && tied && manualSelection === null && (
                                <p className="mt-2" role="alert">
                                    A tie exceeds the available vacancies.
                                    Resolve it with a manual override before
                                    confirming.
                                </p>
                            )}
                            <h3 className="mt-4 font-medium">
                                All Candidates:
                            </h3>
                            <table className="mt-2 w-full border-collapse border border-gray-300 dark:border-gray-700">
                                <thead>
                                    <tr className="bg-primary">
                                        {[
                                            'Ranking',
                                            'Candidate',
                                            'Hare-Clark Points',
                                            'Borda Points',
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                className="border border-gray-300 dark:border-gray-700 p-2"
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {position.candidates.map((candidate) => (
                                        <tr
                                            key={candidate.id}
                                            className="text-center bg-gray-50 dark:bg-gray-700"
                                        >
                                            <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                {candidate.ranking}
                                            </td>
                                            <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                {candidate.name || candidate.id}
                                                {candidate.excluded
                                                    ? ' (confirmed in an earlier position)'
                                                    : ''}
                                            </td>
                                            <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                {candidate.total_points}
                                            </td>
                                            <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                {candidate.borda_points}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {active && (
                                <div className="mt-4">
                                    <Button
                                        size="sm"
                                        isDisabled={submitting}
                                        onPress={() =>
                                            setManualSelection(
                                                manualSelection === null
                                                    ? []
                                                    : null,
                                            )
                                        }
                                    >
                                        {manualSelection === null
                                            ? 'Manual Override'
                                            : 'Cancel Manual Override'}
                                    </Button>
                                    {manualSelection !== null && (
                                        <fieldset
                                            className="mt-2"
                                            disabled={submitting}
                                        >
                                            <legend>
                                                Select up to{' '}
                                                {position.vacancies} winners
                                                (none leaves the position
                                                vacant):
                                            </legend>
                                            {position.candidates
                                                .filter(
                                                    (candidate) =>
                                                        !candidate.excluded,
                                                )
                                                .map((candidate) => (
                                                    <label
                                                        key={candidate.id}
                                                        className="block"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="mr-2"
                                                            checked={manualSelection.includes(
                                                                candidate.id,
                                                            )}
                                                            disabled={
                                                                !manualSelection.includes(
                                                                    candidate.id,
                                                                ) &&
                                                                manualSelection.length >=
                                                                    position.vacancies
                                                            }
                                                            onChange={(event) =>
                                                                setManualSelection(
                                                                    event.target
                                                                        .checked
                                                                        ? [
                                                                              ...manualSelection,
                                                                              candidate.id,
                                                                          ]
                                                                        : manualSelection.filter(
                                                                              (
                                                                                  id,
                                                                              ) =>
                                                                                  id !==
                                                                                  candidate.id,
                                                                          ),
                                                                )
                                                            }
                                                        />
                                                        {candidate.name ||
                                                            candidate.id}
                                                    </label>
                                                ))}
                                        </fieldset>
                                    )}
                                    <Button
                                        className="mt-4 ml-2"
                                        color="primary"
                                        isLoading={submitting}
                                        isDisabled={
                                            submitting ||
                                            (tied && manualSelection === null)
                                        }
                                        onPress={confirmPosition}
                                    >
                                        Confirm {position.position_name}
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                );
            })}
            <div className="mt-8 text-center space-x-4">
                <Button
                    color="primary"
                    isDisabled={!complete || submitting}
                    onPress={exportResults}
                >
                    Export Results to CSV
                </Button>
                <Button color="primary" onPress={exportVoters}>
                    Export Voters to CSV
                </Button>
            </div>
        </div>
    );
}
