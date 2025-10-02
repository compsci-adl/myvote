// TypeScript translation of hareclark.py (Hare-Clark STV)
// Based on: https://github.com/tinnamchoi/hare-clark-cpp

interface WeightedBallot {
    ballot: string[];
    weight: number;
}

function _process_candidate(
    candidate: string,
    unavailable_candidates: Set<string>,
    wballots: WeightedBallot[],
    votes: Map<string, number>,
    transfer_value = 1
) {
    unavailable_candidates.add(candidate);
    votes.set(candidate, -1);
    for (const wballot of wballots) {
        if (wballot.ballot.length && wballot.ballot[wballot.ballot.length - 1] === candidate) {
            wballot.weight *= transfer_value;
            while (
                wballot.ballot.length &&
                unavailable_candidates.has(wballot.ballot[wballot.ballot.length - 1])
            ) {
                wballot.ballot.pop();
            }
            if (wballot.ballot.length) {
                const last = wballot.ballot[wballot.ballot.length - 1];
                votes.set(last, (votes.get(last) || 0) + wballot.weight);
            }
        }
    }
}

export function hareclark(
    candidates: string[],
    ballots: string[][],
    number_of_vacancies: number = 1
): string[] {
    // Reverse ballots in-place
    for (const ballot of ballots) {
        ballot.reverse();
    }
    const elected_candidates: string[] = [];
    const unavailable_candidates = new Set<string>();
    const quota = ballots.length / (number_of_vacancies + 1) + 1;

    const ballots_with_weights: WeightedBallot[] = ballots.map((b) => ({
        ballot: [...b],
        weight: 1,
    }));
    const votes = new Map<string, number>();
    for (const wballot of ballots_with_weights) {
        if (wballot.ballot.length) {
            const last = wballot.ballot[wballot.ballot.length - 1];
            votes.set(last, (votes.get(last) || 0) + wballot.weight);
        }
    }

    while (number_of_vacancies > 0 && candidates.length - unavailable_candidates.size > 0) {
        let winner: string | null = null;
        let loser: string | null = null;
        for (const cand of candidates) {
            if (unavailable_candidates.has(cand)) continue;
            if (winner === null || (votes.get(cand) || 0) >= (votes.get(winner) || 0)) {
                winner = cand;
            }
            if (loser === null || (votes.get(cand) || 0) < (votes.get(loser) || 0)) {
                loser = cand;
            }
        }
        if (winner === null || loser === null) break;
        if ((votes.get(winner) || 0) === (votes.get(loser) || 0)) {
            console.warn('Warning! There is a tie!');
            break;
        }
        if ((votes.get(winner) || 0) > quota) {
            const surplus = (votes.get(winner) || 0) - quota;
            const transfer_value = surplus / (votes.get(winner) || 1);
            _process_candidate(
                winner,
                unavailable_candidates,
                ballots_with_weights,
                votes,
                transfer_value
            );
            elected_candidates.push(winner);
            votes.set(winner, -2);
            number_of_vacancies -= 1;
        } else {
            _process_candidate(loser, unavailable_candidates, ballots_with_weights, votes);
            votes.set(loser, -1);
        }
    }
    if (number_of_vacancies) {
        for (const cand of candidates) {
            if (!unavailable_candidates.has(cand)) {
                elected_candidates.push(cand);
            }
        }
    }
    // console.log('Full count results:');
    // console.log('Votes:', votes);
    // console.log('Elected candidates:', elected_candidates);
    // console.log('Unavailable candidates:', unavailable_candidates);
    // console.log('Ballots with weights:', ballots_with_weights);
    // console.log('Quota:', quota);
    return elected_candidates;
}
