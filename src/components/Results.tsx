'use client';

import { Button, Card, CardBody, CardHeader } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import type { CandidateResult } from '@/types/candidate-result';
import type { Election } from '@/types/election';
import type { PositionResult } from '@/types/position-result';
import type { Voter } from '@/types/voter';
import type { Winner } from '@/types/winner';

import { fetcher } from '../lib/fetcher';

interface ResultsProps {
    electionId: string;
}

export default function Results({ electionId }: ResultsProps) {
    const [results, setResults] = useState<PositionResult[]>([]);
    const [winnerSelections, setWinnerSelections] = useState<Record<string, string>>({}); // candidateId -> positionId
    const [finalised, setFinalised] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [manualOverrides, setManualOverrides] = useState<Record<string, string[]>>({});
    const [exclusions, setExclusions] = useState<Record<string, string[]>>({});

    // Fetch election results
    type ApiResult = { results: PositionResult[] };
    const { data, isValidating } = useSWR<ApiResult>(
        [`results/${electionId}`, null],
        ([url]) => fetcher.get.query([url]) as Promise<ApiResult>
    );

    // Fetch elections to get election name
    const { data: electionsData } = useSWR<Election[]>(
        [`elections`],
        ([url]: [string]) => fetcher.get.query([url]) as Promise<Election[]>
    );

    const election = electionsData?.find((e) => e.id === electionId);
    const electionName = election?.name || 'election';

    // Always update results when data changes
    useEffect(() => {
        if (data && data.results) {
            Promise.resolve().then(() => setResults(data.results));
        }
    }, [data]);

    // Find candidates who are winners in multiple positions
    const multiWinners = useMemo(() => {
        const winnerMap: Record<
            string,
            {
                name: string;
                positions: string[];
                positionNames: string[];
                soloCandidatePositions: string[];
                soloCandidatePositionNames: string[];
            }
        > = {};
        for (const pos of results) {
            for (const winner of pos.winners) {
                if (!winnerMap[winner.id]) {
                    winnerMap[winner.id] = {
                        name: winner.name,
                        positions: [],
                        positionNames: [],
                        soloCandidatePositions: [],
                        soloCandidatePositionNames: [],
                    };
                }
                if (pos.candidates.length === 1) {
                    winnerMap[winner.id].soloCandidatePositions.push(pos.position_id);
                    winnerMap[winner.id].soloCandidatePositionNames.push(pos.position_name);
                } else {
                    winnerMap[winner.id].positions.push(pos.position_id);
                    winnerMap[winner.id].positionNames.push(pos.position_name);
                }
            }
        }
        return Object.entries(winnerMap)
            .filter(([, v]) => v.positions.length + v.soloCandidatePositions.length > 1)
            .map(([id, v]) => ({
                id,
                name: v.name,
                positions: v.positions,
                positionNames: v.positionNames,
                soloCandidatePositions: v.soloCandidatePositions,
                soloCandidatePositionNames: v.soloCandidatePositionNames,
            }));
    }, [results]);

    // If results change, and there are still multiple-position winners, reset finalised state
    useEffect(() => {
        if (multiWinners.length > 0) {
            Promise.resolve().then(() => setFinalised(false));
        }
    }, [multiWinners.length]);

    // Auto-select if only one available option for multi-winners
    useEffect(() => {
        let hasChanges = false;
        const newSelections = { ...winnerSelections };
        for (const mw of multiWinners) {
            if (newSelections[mw.id]) continue;
            const options = [
                ...mw.positions.map((pid) => {
                    const pos = results.find((p) => p.position_id === pid);
                    const tempSelections = { ...winnerSelections, [mw.id]: pid };
                    const projWinners = pos
                        ? pos.winners.filter((w: Winner) => {
                              const mw2 = multiWinners.find((m) => m.id === w.id);
                              if (mw2) {
                                  return tempSelections[w.id] === pos.position_id;
                              }
                              return true;
                          })
                        : [];
                    const isOverCapacity = pos && projWinners.length > pos.vacancies;
                    return { pid, disabled: isOverCapacity };
                }),
                ...mw.soloCandidatePositions.map((pid) => ({ pid, disabled: false })),
            ];
            const availableOptions = options.filter((o) => !o.disabled);
            if (availableOptions.length === 1) {
                newSelections[mw.id] = availableOptions[0].pid;
                hasChanges = true;
            }
        }
        if (hasChanges) {
            Promise.resolve().then(() => setWinnerSelections(newSelections));
        }
    }, [multiWinners, results, winnerSelections]);

    // Compute warnings for unfilled roles
    useEffect(() => {
        if (
            Object.keys(winnerSelections).length === multiWinners.length &&
            multiWinners.length > 0
        ) {
            const exclusions: Record<string, string[]> = {};
            const manualOverrides: Record<string, string[]> = {};
            for (const mw of multiWinners) {
                const keepPos = winnerSelections[mw.id];
                const isSolo = mw.soloCandidatePositions.includes(keepPos);
                if (isSolo) {
                    if (!manualOverrides[keepPos]) manualOverrides[keepPos] = [];
                    manualOverrides[keepPos].push(mw.id);
                }
                for (const pos of results) {
                    if (pos.position_id !== keepPos) {
                        if (!exclusions[pos.position_id]) exclusions[pos.position_id] = [];
                        exclusions[pos.position_id].push(mw.id);
                    }
                }
            }
            const newWarnings: string[] = [];
            for (const pos of results) {
                const excluded = exclusions[pos.position_id] || [];
                const manual = manualOverrides[pos.position_id] || [];
                const finalWinners = [
                    ...pos.winners.filter((w: Winner) => !excluded.includes(w.id)),
                    ...manual.map((id) => ({ id, name: '' })), // dummy winner object
                ];
                if (
                    finalWinners.length < pos.vacancies &&
                    pos.candidates.filter((c: CandidateResult) => !excluded.includes(c.id))
                        .length === 0
                ) {
                    newWarnings.push(
                        `${pos.position_name} would have ${finalWinners.length} winner(s) but needs ${pos.vacancies}`
                    );
                }
            }
            Promise.resolve().then(() => setWarnings(newWarnings));
        } else {
            Promise.resolve().then(() => setWarnings([]));
        }
    }, [winnerSelections, multiWinners, results]);

    // Compute unfilled roles warnings
    const unfilledWarnings = useMemo(() => {
        const warns: string[] = [];
        for (const pos of results) {
            if (pos.winners.length < pos.vacancies) {
                warns.push(
                    `${pos.position_name} has ${pos.winners.length} winner(s) but needs ${pos.vacancies}`
                );
            }
        }
        return warns;
    }, [results]);

    // Combined warnings
    const allWarnings = useMemo(() => {
        return [...warnings, ...unfilledWarnings];
    }, [warnings, unfilledWarnings]);

    // Map of candidate ID to their winning position names
    const candidateWinningPositions = useMemo(() => {
        const map: Record<string, string[]> = {};
        for (const pos of results) {
            for (const winner of pos.winners) {
                if (!map[winner.id]) map[winner.id] = [];
                map[winner.id].push(pos.position_name);
            }
        }
        return map;
    }, [results]);

    // Export results to CSV
    const exportToCSV = () => {
        const csvRows: string[][] = [];
        csvRows.push(['Position', 'Candidate', 'Is Winner', 'Hare-Clark Points', 'Borda Points']);
        for (const pos of results) {
            const winnerIds = new Set(pos.winners.map((w: Winner) => w.id));
            for (const cand of pos.candidates) {
                csvRows.push([
                    pos.position_name,
                    cand.name || cand.id,
                    winnerIds.has(cand.id) ? 'Yes' : 'No',
                    cand.total_points.toString(),
                    cand.borda_points.toString(),
                ]);
            }
        }
        const csvContent = csvRows
            .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${electionName} Results.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Export voters to CSV
    const exportVotersToCSV = async () => {
        try {
            const resp = (await fetcher.get.query([`voters/${electionId}`])) as { voters: Voter[] };
            const voters = resp.voters || [];
            const csvRows: string[][] = [];
            csvRows.push(['Name', 'Student ID']);
            for (const voter of voters) {
                csvRows.push([voter.name || '', voter.student_id]);
            }
            const csvContent = csvRows
                .map((row) => row.map((field) => `"${field.replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${electionName} Voters.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting voters:', error);
            alert('Failed to export voters. Please try again.');
        }
    };

    // Sort positions: exec first in specific order, then managers alphabetically, then others alphabetically
    const sortedResults = useMemo(() => {
        const execOrder = [
            'President',
            'Vice-President',
            'Treasurer',
            'Secretary',
            'Partnerships & Sponsorships Manager',
        ];
        return [...results].sort((a, b) => {
            const aIsExec = execOrder.includes(a.position_name);
            const bIsExec = execOrder.includes(b.position_name);
            if (aIsExec && bIsExec) {
                return execOrder.indexOf(a.position_name) - execOrder.indexOf(b.position_name);
            }
            if (aIsExec) return -1;
            if (bIsExec) return 1;
            const aIsManager = a.position_name.includes('Manager');
            const bIsManager = b.position_name.includes('Manager');
            if (aIsManager && bIsManager) {
                return a.position_name.localeCompare(b.position_name);
            }
            if (aIsManager) return -1;
            if (bIsManager) return 1;
            return a.position_name.localeCompare(b.position_name);
        });
    }, [results]);

    // Remove a candidate from all but the selected position and re-run results
    const handleConfirmSelections = async () => {
        // Build a map of exclusions: for each position, which candidate(s) to exclude
        const exclusions: Record<string, string[]> = {};
        const manualOverrides: Record<string, string[]> = {};
        for (const mw of multiWinners) {
            const keepPos = winnerSelections[mw.id];
            const isSolo = mw.soloCandidatePositions.includes(keepPos);
            if (isSolo) {
                // For solo candidate positions, set as manual winner
                if (!manualOverrides[keepPos]) manualOverrides[keepPos] = [];
                manualOverrides[keepPos].push(mw.id);
            }
            for (const pos of results) {
                if (pos.position_id !== keepPos) {
                    if (!exclusions[pos.position_id]) exclusions[pos.position_id] = [];
                    exclusions[pos.position_id].push(mw.id);
                }
            }
        }
        setExclusions(exclusions);
        const apiUrl = `results/${electionId}`;
        const resp = (await fetcher.post.query([
            apiUrl,
            { json: { exclusions, manualOverrides } },
        ])) as ApiResult;
        setResults(resp.results);
        setWinnerSelections({}); // Reset selections for next round if needed
    };

    return (
        <div className="mt-8">
            <h1 className="mb-4 text-2xl font-bold">Election Results</h1>

            {results.length === 0 && !isValidating && <p>No results found.</p>}

            {multiWinners.length > 0 && !finalised && (
                <Card className="mb-6 bg-gray-200 dark:bg-gray-800">
                    <CardHeader>
                        <h2 className="text-lg font-semibold">Multiple Position Winners</h2>
                    </CardHeader>
                    <CardBody>
                        <p className="mb-2">
                            The following candidates have won more than one position. Please select
                            which position each will accept:
                        </p>
                        {multiWinners.map((mw) => {
                            const options = [
                                ...mw.positions.map((pid, idx) => {
                                    const pos = results.find((p) => p.position_id === pid);
                                    const tempSelections = { ...winnerSelections, [mw.id]: pid };
                                    const projWinners = pos
                                        ? pos.winners.filter((w: Winner) => {
                                              const mw2 = multiWinners.find((m) => m.id === w.id);
                                              if (mw2) {
                                                  return tempSelections[w.id] === pos.position_id;
                                              }
                                              return true;
                                          })
                                        : [];
                                    const isOverCapacity =
                                        pos && projWinners.length > pos.vacancies;
                                    const isAtCapacity =
                                        pos &&
                                        projWinners.length >= pos.vacancies &&
                                        !projWinners.some((w: Winner) => w.id === mw.id);
                                    const label = isOverCapacity
                                        ? `${mw.positionNames[idx]} (Full)`
                                        : isAtCapacity
                                          ? `${mw.positionNames[idx]} (At Capacity)`
                                          : mw.positionNames[idx];
                                    return { pid, label, disabled: isOverCapacity };
                                }),
                                ...mw.soloCandidatePositions.map((pid, idx) => ({
                                    pid,
                                    label: `${mw.soloCandidatePositionNames[idx]} (Only Candidate)`,
                                    disabled: false,
                                })),
                            ];
                            return (
                                <div key={mw.id} className="mb-2">
                                    <span className="font-bold">{mw.name}</span>:
                                    <select
                                        className="ml-2 rounded p-1 bg-gray-50 dark:bg-gray-700 dark:border-gray-600"
                                        value={winnerSelections[mw.id] || ''}
                                        onChange={(e) =>
                                            setWinnerSelections((prev) => ({
                                                ...prev,
                                                [mw.id]: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">Select position</option>
                                        {options.map((opt) => (
                                            <option
                                                key={opt.pid}
                                                value={opt.pid}
                                                disabled={opt.disabled}
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        })}
                        <Button
                            className="mt-2"
                            color="primary"
                            isDisabled={multiWinners.some((mw) => !winnerSelections[mw.id])}
                            onPress={handleConfirmSelections}
                        >
                            Confirm Selections
                        </Button>
                    </CardBody>
                </Card>
            )}

            {allWarnings.length > 0 && (
                <Card className="mb-6 border-red-200 dark:border-red-800 bg-gray-200 dark:bg-gray-800">
                    <CardHeader>
                        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                            Warnings
                        </h2>
                    </CardHeader>
                    <CardBody>
                        <ul className="list-disc pl-5">
                            {allWarnings.map((warning, idx) => (
                                <li key={idx} className="text-red-700 dark:text-red-300">
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </CardBody>
                </Card>
            )}

            {sortedResults.map((position) => {
                return (
                    <Card key={position.position_id} className="mb-6 bg-gray-200 dark:bg-gray-800">
                        <CardHeader>
                            <h2 className="text-xl font-semibold">{position.position_name}</h2>
                        </CardHeader>
                        <CardBody>
                            <h3
                                className={`font-medium ${
                                    position.winners.length !== position.vacancies
                                        ? 'text-orange-600 dark:text-orange-400'
                                        : 'text-green-600 dark:text-green-400'
                                }`}
                            >
                                Winner(s) ({position.winners.length}/{position.vacancies}):
                            </h3>
                            {position.winners.length > 0 ? (
                                <ul className="list-disc pl-5">
                                    {position.winners.map((winner: Winner) => (
                                        <li key={winner.id} className="font-semibold">
                                            {winner.name || winner.id}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="pl-5 italic text-gray-500">No winner(s)</div>
                            )}
                            {(() => {
                                if (position.winners.length > position.vacancies) {
                                    return (
                                        <div className="text-orange-600 dark:text-orange-400 mt-1">
                                            (Tie occurred)
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            <h3 className="mt-4 font-medium text-gray-700 dark:text-gray-200">
                                All Candidates:
                            </h3>
                            <table className="mt-2 w-full border-collapse border border-gray-300 dark:border-gray-700">
                                <thead>
                                    <tr className="bg-primary">
                                        <th className="border border-gray-300 dark:border-gray-700 p-2">
                                            Ranking
                                        </th>
                                        <th className="border border-gray-300 dark:border-gray-700 p-2">
                                            Candidate
                                        </th>
                                        <th className="border border-gray-300 dark:border-gray-700 p-2">
                                            Hare-Clark Points
                                        </th>
                                        <th className="border border-gray-300 dark:border-gray-700 p-2">
                                            Borda Points
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {position.candidates
                                        .sort((a: CandidateResult, b: CandidateResult) => {
                                            if (b.total_points !== a.total_points) {
                                                return b.total_points - a.total_points;
                                            }
                                            if (b.borda_points !== a.borda_points) {
                                                return b.borda_points - a.borda_points;
                                            }
                                            return (a.name || a.id).localeCompare(b.name || b.id);
                                        })
                                        .map((candidate: CandidateResult) => (
                                            <tr
                                                key={candidate.id}
                                                className="text-center bg-gray-50 dark:bg-gray-700"
                                            >
                                                <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                    {candidate.ranking}
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                    {candidate.name || candidate.id}
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                    {typeof candidate.total_points === 'number'
                                                        ? candidate.total_points
                                                        : ''}
                                                </td>
                                                <td className="border border-gray-300 dark:border-gray-700 p-2">
                                                    {typeof candidate.borda_points === 'number'
                                                        ? candidate.borda_points
                                                        : ''}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>

                            <div className="mt-4">
                                <Button
                                    color="primary"
                                    size="sm"
                                    onPress={() =>
                                        setManualOverrides((prev) => ({
                                            ...prev,
                                            [position.position_id]:
                                                prev[position.position_id] || [],
                                        }))
                                    }
                                >
                                    Manual Override
                                </Button>
                                {manualOverrides[position.position_id] && (
                                    <div className="mt-2 p-4 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
                                        <p>Select up to {position.vacancies} winners:</p>
                                        {position.candidates.map((cand: CandidateResult) => {
                                            const winningPos =
                                                candidateWinningPositions[cand.id] || [];
                                            const label =
                                                winningPos.length > 0
                                                    ? `${cand.name || cand.id} (already winner for ${winningPos.join(
                                                          ', '
                                                      )})`
                                                    : cand.name || cand.id;
                                            return (
                                                <label key={cand.id} className="block">
                                                    <input
                                                        type="checkbox"
                                                        className="mr-2"
                                                        checked={
                                                            manualOverrides[
                                                                position.position_id
                                                            ]?.includes(cand.id) ?? false
                                                        }
                                                        onChange={(e) => {
                                                            const selected =
                                                                manualOverrides[
                                                                    position.position_id
                                                                ] || [];
                                                            if (e.target.checked) {
                                                                if (
                                                                    selected.length <
                                                                    position.vacancies
                                                                ) {
                                                                    setManualOverrides((prev) => ({
                                                                        ...prev,
                                                                        [position.position_id]: [
                                                                            ...selected,
                                                                            cand.id,
                                                                        ],
                                                                    }));
                                                                }
                                                            } else {
                                                                setManualOverrides((prev) => ({
                                                                    ...prev,
                                                                    [position.position_id]:
                                                                        selected.filter(
                                                                            (id) => id !== cand.id
                                                                        ),
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    {label}
                                                </label>
                                            );
                                        })}
                                        <Button
                                            className="mt-2"
                                            color="primary"
                                            size="sm"
                                            onPress={async () => {
                                                // Build exclusions for manually overridden candidates to ensure only 1 position per person
                                                const additionalExclusions: Record<
                                                    string,
                                                    string[]
                                                > = {};
                                                for (const [posId, winners] of Object.entries(
                                                    manualOverrides
                                                )) {
                                                    for (const winnerId of winners) {
                                                        for (const otherPos of results) {
                                                            if (otherPos.position_id !== posId) {
                                                                if (
                                                                    !additionalExclusions[
                                                                        otherPos.position_id
                                                                    ]
                                                                ) {
                                                                    additionalExclusions[
                                                                        otherPos.position_id
                                                                    ] = [];
                                                                }
                                                                additionalExclusions[
                                                                    otherPos.position_id
                                                                ].push(winnerId);
                                                            }
                                                        }
                                                    }
                                                }
                                                const allExclusions = {
                                                    ...exclusions,
                                                    ...additionalExclusions,
                                                };
                                                const apiUrl = `results/${electionId}`;
                                                const resp = (await fetcher.post.query([
                                                    apiUrl,
                                                    {
                                                        json: {
                                                            manualOverrides,
                                                            exclusions: allExclusions,
                                                        },
                                                    },
                                                ])) as ApiResult;
                                                setResults(resp.results);
                                                setExclusions(allExclusions); // Update exclusions to include manual ones
                                            }}
                                        >
                                            Apply Manual Winners
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardBody>
                    </Card>
                );
            })}

            <div className="mt-8 text-center space-x-4">
                <Button color="primary" onPress={exportToCSV}>
                    Export Results to CSV
                </Button>
                <Button color="primary" onPress={exportVotersToCSV}>
                    Export Voters to CSV
                </Button>
            </div>
        </div>
    );
}
