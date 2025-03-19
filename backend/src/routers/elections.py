from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.db import get_async_session
from src.models import Election, ElectionStatus, Position
from src.utils.snowflake import generate_new_id

router = APIRouter(tags=["Elections"])


class CreatePositionRequest(BaseModel):
    name: str
    vacancies: int
    description: str
    executive: bool


class CreateElectionRequest(BaseModel):
    name: str
    nomination_start: datetime
    nomination_end: datetime
    voting_start: datetime
    voting_end: datetime
    positions: list[CreatePositionRequest]


class UpdateElectionRequest(BaseModel):
    name: str | None = None
    nomination_start: datetime | None = None
    nomination_end: datetime | None = None
    voting_start: datetime | None = None
    voting_end: datetime | None = None
    positions: list[CreatePositionRequest] | None = None
    status: ElectionStatus | None = None


@router.get("/elections")
async def get_elections(session: AsyncSession = Depends(get_async_session)):
    """Get all elections."""

    result = await session.execute(select(Election))
    result = result.scalars().all()
    return {"elections": result}


@router.post("/elections")
async def create_election(
    req: CreateElectionRequest,
    session: AsyncSession = Depends(get_async_session),
) -> Election:
    conflict_query = select(Election).where(Election.name == req.name)
    conflict_result = await session.execute(conflict_query)
    conflict_result = conflict_result.scalar()

    if conflict_result is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Election with that name already exists.",
        )

    election = Election(
        id=str(await generate_new_id()),
        name=req.name,
        nomination_start=req.nomination_start,
        nomination_end=req.nomination_end,
        voting_start=req.voting_start,
        voting_end=req.voting_end,
        status=ElectionStatus.PreRelease,
    )
    session.add(election)

    for position_req in req.positions:
        conflict_query = select(Position).where(
            Position.name == position_req.name, Position.election_id == election.id
        )
        conflict_result = await session.execute(conflict_query)
        conflict_result = conflict_result.scalar()

        if conflict_result is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Position with name {position_req.name} already exists.",
            )

        position = Position(
            id=str(await generate_new_id()),
            election_id=election.id,
            name=position_req.name,
            vacancies=position_req.vacancies,
            description=position_req.description,
            executive=position_req.executive,
        )
        session.add(position)

    await session.commit()
    await session.refresh(election)

    return election


@router.patch("/elections/{election_id}")
async def update_election(
    election_id: str,
    req: UpdateElectionRequest,
    session: AsyncSession = Depends(get_async_session),
) -> Election:
    election_query = select(Election).where(Election.id == election_id)
    election_result = await session.execute(election_query)
    election = election_result.scalar()

    if election is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Election not found.",
        )

    update_fields = {
        "name": req.name,
        "nomination_start": req.nomination_start,
        "nomination_end": req.nomination_end,
        "voting_start": req.voting_start,
        "voting_end": req.voting_end,
        "status": req.status,
    }

    for field, value in update_fields.items():
        if value is not None:
            setattr(election, field, value)

    if req.positions is not None:
        for position_req in req.positions:
            position_query = select(Position).where(
                Position.name == position_req.name, Position.election_id == election.id
            )
            position_result = await session.execute(position_query)
            position = position_result.scalar()

            if position is None:
                position = Position(
                    election_id=election.id,
                    name=position_req.name,
                    vacancies=position_req.vacancies,
                    description=position_req.description,
                    executive=position_req.executive,
                )
                session.add(position)
            else:
                position.vacancies = position_req.vacancies
                position.description = position_req.description
                position.executive = position_req.executive

    await session.commit()
    await session.refresh(election)

    return election
