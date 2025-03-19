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
    """Calculate and return election results with position names and candidate names."""

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

        results.append(
            {
                "position_id": position_id,
                "position_name": positions[position_id],
                "winners": [
                    {"id": winner.id, "name": winner.name} for winner in winners_data
                ],
            }
        )

    return {"election_id": election_id, "results": results}
