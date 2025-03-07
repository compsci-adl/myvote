# https://github.com/tinnamchoi/hare-clark-cpp
from collections import defaultdict
from dataclasses import dataclass

# TODO Make a voting algorithm ABC so we can try different formats


@dataclass
class WeightedBallot:
    ballot: list[int]
    weight: float


def _process_candidate(
    candidate: int,
    unavailable_candidates: set[int],
    wballots: list[WeightedBallot],
    votes: defaultdict[int, float],
    transfer_value: float = 1,
):
    unavailable_candidates.add(candidate)
    votes[candidate] = -1
    for wballot in wballots:
        if wballot.ballot and wballot.ballot[-1] == candidate:
            wballot.weight *= transfer_value
            while wballot.ballot and wballot.ballot[-1] in unavailable_candidates:
                wballot.ballot.pop()
            if wballot.ballot:
                votes[wballot.ballot[-1]] += wballot.weight


def hareclark(
    candidates: list[int], ballots: list[list[int]], number_of_vacancies: int = 1
) -> list[int]:
    for ballot in ballots:
        ballot.reverse()
    elected_candidates = []
    unavailable_candidates = set()
    quota = len(ballots) / (number_of_vacancies + 1) + 1

    ballots_with_weights = [WeightedBallot(b, 1) for b in ballots]
    votes = defaultdict(float)
    for wballot in ballots_with_weights:
        if wballot.ballot:
            votes[wballot.ballot[-1]] += wballot.weight

    while number_of_vacancies < len(candidates) - len(unavailable_candidates):
        winner = -1
        loser = -1
        for cand in candidates:
            if cand in unavailable_candidates:
                continue
            if winner == -1 or votes[cand] >= votes[winner]:
                winner = cand
            if loser == -1 or votes[cand] < votes[loser]:
                loser = cand

        if votes[winner] == votes[loser]:
            print("Warning! There is a tie!")
            break

        if votes[winner] > quota:
            surplus = votes[winner] - quota
            transfer_value = surplus / votes[winner]
            _process_candidate(
                winner,
                unavailable_candidates,
                ballots_with_weights,
                votes,
                transfer_value,
            )
            elected_candidates.append(winner)
            votes[winner] = -2
            number_of_vacancies -= 1
        else:
            _process_candidate(
                loser, unavailable_candidates, ballots_with_weights, votes
            )
            votes[loser] = -1

    if number_of_vacancies:
        for cand in candidates:
            if cand not in unavailable_candidates:
                elected_candidates.append(cand)
    return elected_candidates
