from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.db import get_async_session
from src.models import Ballot, Position, Voter
from src.utils.snowflake import generate_new_id

router = APIRouter(tags=["Votes"])


# GET route to retrieve all the votes in a specific election
@router.get("/votes/{election_id}")
async def get_votes(
    election_id: str, session: AsyncSession = Depends(get_async_session)
):
    """Get all votes cast in a given election."""
    result = await session.execute(
        select(Ballot).join(Position).where(Position.election_id == election_id)
    )
    result = result.scalars().all()
    return {"votes": result}


# Pydantic model for vote preferences (each position)
class PositionVote(BaseModel):
    position: int
    preferences: list[int]

    class Config:
        orm_mode = True


# Pydantic model for the VoteRequest
class VoteRequest(BaseModel):
    student_id: int
    election: str
    name: str
    votes: list[
        PositionVote
    ]  # List of position votes, each containing a position and preferences

    class Config:
        orm_mode = True


@router.post("/votes/{election_id}")
async def register_voter_and_vote(
    election_id: str,
    req: VoteRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """Register a new voter and automatically create a ballot for them."""

    # Check if the student already exists as a voter in this election
    voter_query = select(Voter).where(
        Voter.student_id == req.student_id, Voter.election == election_id
    )
    voter_result = await session.execute(voter_query)
    existing_voter = voter_result.scalar()

    if existing_voter:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Voter already exists for this election.",
        )

    # Create a new voter
    voter = Voter(
        id=await generate_new_id(),
        election=election_id,
        student_id=req.student_id,
        name=req.name,
    )
    session.add(voter)

    # Create a ballot for each position that the voter is voting for
    ballots = []
    for position_vote in req.votes:
        # Check if the position exists for the given election
        position_query = select(Position).where(
            Position.election_id == election_id,
            Position.id == position_vote.position,
        )
        position_result = await session.execute(position_query)
        position = position_result.scalar()

        if not position:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Position with ID {position_vote.position} not found for the election.",
            )

        # Create a new ballot for the position
        ballot = Ballot(
            id=await generate_new_id(),
            voter_id=voter.id,
            position=position.id,
            preferences=position_vote.preferences,
        )
        ballots.append(ballot)

    # Add the ballots to session and commit
    session.add_all(ballots)
    await session.commit()

    return {
        "message": "Voter registered and vote submitted successfully",
        "voter": voter,
        "ballots": ballots,
    }
