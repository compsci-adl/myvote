'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import { fetcher } from '../lib/fetcher';

interface ResultsProps {
    electionId: string;
}

interface Candidate {
    id: string;
    name: string;
    ranking: number;
    total_points: number;
}

interface Winner {
    id: string;
    name: string;
    ranking: number;
}

interface Position {
    position_id: string;
    position_name: string;
    winners: Winner[];
    candidates: Candidate[];
    vacancies: number;
}
export default function Results({ electionId }: ResultsProps) {
    const [results, setResults] = useState<Position[]>([]);
    const [winnerSelections, setWinnerSelections] = useState<Record<string, string>>({}); // candidateId -> positionId
    const [finalized, setFinalized] = useState(false);
    const [warnings, setWarnings] = useState<string[]>([]);

    // Fetch election results
    type ApiResult = { results: Position[] };
    const { data, isValidating } = useSWR<ApiResult>(
        [`results/${electionId}`, null],
        ([url]) => fetcher.get.query([url]) as Promise<ApiResult>
    );

    // Always update results when data changes
    useEffect(() => {
        if (data && data.results) setResults(data.results);
    }, [data]);

    // Find candidates who are winners in multiple positions
    const multiWinners = useMemo(() => {
        const winnerMap: Record<
            string,
            { name: string; positions: string[]; positionNames: string[] }
        > = {};
        for (const pos of results) {
            for (const winner of pos.winners) {
                if (!winnerMap[winner.id]) {
                    winnerMap[winner.id] = { name: winner.name, positions: [], positionNames: [] };
                }
                winnerMap[winner.id].positions.push(pos.position_id);
                winnerMap[winner.id].positionNames.push(pos.position_name);
            }
        }
        return Object.entries(winnerMap)
            .filter(([, v]) => v.positions.length > 1)
            .map(([id, v]) => ({
                id,
                name: v.name,
                positions: v.positions,
                positionNames: v.positionNames,
            }));
    }, [results]);

    // If results change, and there are still multiple-position winners, reset finalised state
    useEffect(() => {
        if (multiWinners.length > 0) {
            setFinalized(false);
        }
    }, [multiWinners.length]);

    // Compute warnings for unfilled roles
    useEffect(() => {
        if (
            Object.keys(winnerSelections).length === multiWinners.length &&
            multiWinners.length > 0
        ) {
            const exclusions: Record<string, string[]> = {};
            for (const mw of multiWinners) {
                const keepPos = winnerSelections[mw.id];
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
                const finalWinners = pos.winners.filter((w) => !excluded.includes(w.id));
                if (finalWinners.length < pos.vacancies) {
                    newWarnings.push(
                        `${pos.position_name} would have ${finalWinners.length} winner(s) but needs ${pos.vacancies}`
                    );
                }
            }
            setWarnings(newWarnings);
        } else {
            setWarnings([]);
        }
    }, [winnerSelections, multiWinners, results]);

    // Remove a candidate from all but the selected position and re-run results
    const handleConfirmSelections = async () => {
        // Build a map of exclusions: for each position, which candidate(s) to exclude
        const exclusions: Record<string, string[]> = {};
        for (const mw of multiWinners) {
            const keepPos = winnerSelections[mw.id];
            for (const pos of results) {
                if (pos.position_id !== keepPos) {
                    if (!exclusions[pos.position_id]) exclusions[pos.position_id] = [];
                    exclusions[pos.position_id].push(mw.id);
                }
            }
        }
        const apiUrl = `results/${electionId}`;
        const resp = (await fetcher.post.query([apiUrl, { json: { exclusions } }])) as ApiResult;
        setResults(resp.results);
        setWinnerSelections({}); // Reset selections for next round if needed
    };

    return (
        <div className="mt-8">
            <h1 className="mb-4 text-2xl font-bold">Election Results</h1>

            {results.length === 0 && !isValidating && <p>No results found.</p>}

            {multiWinners.length > 0 && !finalized && (
                <div className="mb-6 p-4 border rounded bg-yellow-50 dark:bg-yellow-900/30 dark:border-yellow-700/50">
                    <h2 className="text-lg font-semibold mb-2">Multiple Position Winners</h2>
                    <p className="mb-2">
                        The following candidates have won more than one position. Please select
                        which position each will accept:
                    </p>
                    {multiWinners.map((mw) => (
                        <div key={mw.id} className="mb-2">
                            <span className="font-bold">{mw.name}</span>:
                            <select
                                className="ml-2 border rounded p-1"
                                value={winnerSelections[mw.id] || ''}
                                onChange={(e) =>
                                    setWinnerSelections((prev) => ({
                                        ...prev,
                                        [mw.id]: e.target.value,
                                    }))
                                }
                            >
                                <option value="">Select position</option>
                                {mw.positions.map((pid, idx) => {
                                    const pos = results.find((p) => p.position_id === pid);
                                    const tempSelections = { ...winnerSelections, [mw.id]: pid };
                                    const projWinners = pos
                                        ? pos.winners.filter((w) => {
                                              const mw2 = multiWinners.find((m) => m.id === w.id);
                                              if (mw2) {
                                                  return tempSelections[w.id] === pos.position_id;
                                              }
                                              return true;
                                          })
                                        : [];
                                    const isOverCapacity = pos && projWinners.length > pos.vacancies;
                                    const isAtCapacity =
                                        pos &&
                                        projWinners.length >= pos.vacancies &&
                                        !projWinners.some((w) => w.id === mw.id);
                                    const label = isOverCapacity
                                        ? '(Over Capacity)'
                                        : isAtCapacity
                                          ? '(At Capacity)'
                                          : '';
                                    return (
                                        <option key={pid} value={pid} disabled={isOverCapacity}>
                                            {`${mw.positionNames[idx]} ${label}`}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>
                    ))}
                    <button
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                        disabled={multiWinners.some((mw) => !winnerSelections[mw.id])}
                        onClick={handleConfirmSelections}
                    >
                        Confirm Selections
                    </button>
                </div>
            )}

            {warnings.length > 0 && (
                <div className="mb-6 p-4 border rounded bg-red-50 dark:bg-red-900/30 dark:border-red-700/50">
                    <h2 className="text-lg font-semibold mb-2 text-red-600 dark:text-red-400">
                        Warning: Unfilled Roles
                    </h2>
                    <ul className="list-disc pl-5">
                        {warnings.map((warning, idx) => (
                            <li key={idx} className="text-red-700 dark:text-red-300">
                                {warning}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {results.map((position) => {
                return (
                    <div
                        key={position.position_id}
                        className="mb-6 rounded-lg border p-4 shadow-md dark:bg-gray-900 dark:border-gray-700"
                    >
                        <h2 className="text-xl font-semibold dark:text-white">
                            {position.position_name}
                        </h2>

                        <h3 className="mt-2 font-medium text-green-600 dark:text-green-400">
                            Winner(s):
                        </h3>
                        {position.winners.length > 0 ? (
                            <ul className="list-disc pl-5">
                                {position.winners.map((winner) => (
                                    <li key={winner.id} className="font-semibold">
                                        {winner.name || winner.id}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="pl-5 italic text-gray-500">No winner(s)</div>
                        )}

                        <h3 className="mt-4 font-medium text-gray-700 dark:text-gray-200">
                            All Candidates:
                        </h3>
                        <table className="mt-2 w-full border-collapse border border-gray-300 dark:border-gray-700">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-900">
                                    <th className="border p-2">Ranking</th>
                                    <th className="border p-2">Candidate</th>
                                    <th className="border p-2">Total Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {position.candidates
                                    .sort((a, b) => a.ranking - b.ranking)
                                    .map((candidate) => (
                                        <tr key={candidate.id} className="text-center">
                                            <td className="border p-2">{candidate.ranking}</td>
                                            <td className="border p-2">
                                                {candidate.name || candidate.id}
                                            </td>
                                            <td className="border p-2">
                                                {typeof candidate.total_points === 'number'
                                                    ? candidate.total_points
                                                    : ''}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
}
