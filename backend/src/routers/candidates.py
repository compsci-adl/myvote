from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from src.db import get_async_session
from src.models import Candidate, CandidatePositionLink, Position
from src.utils.snowflake import generate_new_id

router = APIRouter(tags=["Candidates"])


class NominateRequest(BaseModel):
    name: str
    statement: str
    roles: str


@router.get("/candidates/{election_id}")
async def get_candidates(election_id: int, session=Depends(get_async_session)):
    query = select(Candidate).where(Candidate.election == election_id)
    result = await session.execute(query)
    result = result.scalars().all()

    return {"candidates": result}


@router.post("/candidates/{election_id}")
async def create_candidates(
    election_id: int,
    requests: list[NominateRequest],
    session=Depends(get_async_session),
):
    candidates = []
    for request in requests:
        # Check if candidate with same name and statement already exists
        existing_candidate_query = select(Candidate).where(
            Candidate.election == election_id,
            Candidate.name == request.name,
            Candidate.statement == request.statement,
        )
        existing_candidate_result = await session.execute(existing_candidate_query)
        existing_candidate = existing_candidate_result.scalar_one_or_none()
        if existing_candidate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Candidate with name '{request.name}' and statement already exists.",
            )

        candidate = Candidate(
            id=await generate_new_id(),
            election=election_id,
            name=request.name,
            statement=request.statement,
        )
        session.add(candidate)
        candidates.append(candidate)
        roles = request.roles.split(",")
        for role in roles:
            position_query = select(Position).where(
                Position.name == role.strip(), Position.election_id == election_id
            )
            position_result = await session.execute(position_query)
            position = position_result.scalar_one_or_none()
            if not position:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Position '{role.strip()}' does not exist.",
                )
            position_link = CandidatePositionLink(
                candidate_id=candidate.id, position_id=position.id
            )
            session.add(position_link)
    await session.commit()
    for candidate in candidates:
        await session.refresh(candidate)

    return {"candidates": candidates}
