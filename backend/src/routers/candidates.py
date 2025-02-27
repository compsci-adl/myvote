from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select

from src.db import get_async_session
from src.models import Candidate
from src.utils.snowflake import generate_new_id

router = APIRouter(tags=["Candidates"])


class NominateRequest(BaseModel):
    name: str
    statement: str | None
    avatar: str | None


@router.get("/candidates/{election_id}")
async def get_candidates(election_id: int, session=Depends(get_async_session)):
    query = select(Candidate).where(Candidate.election == election_id)
    result = await session.execute(query)
    result = result.scalars().all()

    return {"candidates": result}


@router.post("/candidates/{election_id}")
async def create_candidate(
    election_id: int, request: NominateRequest, session=Depends(get_async_session)
):
    candidate = Candidate(
        id=await generate_new_id(),
        election=election_id,
        name=request.name,
        statement=request.statement,
    )
    session.add(candidate)
    await session.commit()
    await session.refresh(candidate)

    return {"candidate": candidate}
