from fastapi import APIRouter, Depends
from sqlmodel import select

from src.db import get_async_session
from src.models import Candidate

router = APIRouter(tags=["Candidates"])


@router.get("/election/{election_id}/candidates")
async def list_candidates(election_id: int, session=Depends(get_async_session)):
    query = select(Candidate).where(Candidate.election == election_id)
    result = await session.execute(query)
    result = result.scalars()

    return {"candidates": result}


# def NominateRequest(BaseModel):


# @router.post("/election/{election_id}/candidates")
# async def nominate()
