from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.db import get_async_session
from src.hareclark import hareclark
from src.models import Ballot, Candidate, Position

router = APIRouter(tags=["Results"])


@router.get("/results/{election_id}")
async def get_results(
    election_id: str, session: AsyncSession = Depends(get_async_session)
):
    """Calculate and return election results with position names, candidate names, vote counts, and rankings."""

    # Fetch ballots for the given election_id
    ballots_query = await session.execute(
        select(Ballot, Position)
        .join(Position)
        .where(Position.election_id == election_id)
    )
    ballots_data = ballots_query.all()

    if not ballots_data:
        raise HTTPException(
            status_code=404, detail="No ballots found for this election."
        )

    # Organize ballots by position
    positions = {}
    candidates_per_position = defaultdict(set)
    ballots_per_position = defaultdict(list)

    for ballot, position in ballots_data:
        positions[position.id] = position.name  # Store position names
        ballots_per_position[position.id].append(ballot.preferences)
        candidates_per_position[position.id].update(ballot.preferences)

    results = []

    # Compute results for each position
    for position_id, ballots in ballots_per_position.items():
        candidates = list(candidates_per_position[position_id])
        winners = hareclark(
            candidates, ballots, number_of_vacancies=1
        )  # Assuming 1 winner per position

        # Fetch winner names
        winners_query = await session.execute(
            select(Candidate).where(Candidate.id.in_(winners))
        )
        winners_data = winners_query.scalars().all()

        # Compute vote counts and rankings
        votes = defaultdict(int)
        for ballot in ballots:
            for preference in ballot:
                votes[preference] += 1

        # Sort candidates by votes
        sorted_candidates = sorted(
            [(candidate_id, votes[candidate_id]) for candidate_id in candidates],
            key=lambda x: x[1],
            reverse=True,
        )

        # Get preferences count for each candidate
        candidates_preferences = defaultdict(int)
        for ballot in ballots:
            for preference in ballot:
                candidates_preferences[preference] += 1

        # Compile result
        result = {
            "position_id": position_id,
            "position_name": positions[position_id],
            "winners": [
                {"id": winner.id, "name": winner.name} for winner in winners_data
            ],
            "candidates": [
                {
                    "id": candidate_id,
                    "name": (
                        await session.execute(
                            select(Candidate).where(Candidate.id == candidate_id)
                        )
                    )
                    .scalars()
                    .first()
                    .name,
                    "votes": votes.get(candidate_id, 0),
                    "preferences_count": candidates_preferences.get(candidate_id, 0),
                    "ranking": rank + 1,
                }
                for rank, (candidate_id, _) in enumerate(sorted_candidates)
            ],
        }

        results.append(result)

    return {"election_id": election_id, "results": results}
