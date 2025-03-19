from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.db import get_async_session
from src.models import Position
from src.utils.snowflake import generate_new_id

router = APIRouter(tags=["Positions"])


# TODO: Should only auth users be able to view these or everyone?
@router.get("/positions/{election_id}")
async def get_positions(
    election_id: int, session: AsyncSession = Depends(get_async_session)
):
    """Get all positions with vacancies in a given election."""

    result = await session.execute(
        select(Position).where(Position.election_id == election_id)
    )
    result = result.scalars().all()
    return {"positions": result}


class CreatePositionRequest(BaseModel):
    name: str
    vacancies: int = 1
    description: str
    executive: bool = False


# TODO: Authenticated as administrator
@router.post("/positions/{election_id}")
async def create_position(
    election_id: int,
    req: CreatePositionRequest,
    session: AsyncSession = Depends(get_async_session),
) -> Position:
    conflict_query = select(Position).where(Position.name == req.name)
    conflict_result = await session.execute(conflict_query)
    conflict_result = conflict_result.scalar()

    if conflict_result is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Position with that name already exists.",
        )

    position = Position(
        id=await generate_new_id(), election=election_id, **req.__dict__
    )
    session.add(position)
    await session.commit()
    # await session.refresh(position)

    return position


# TODO: Authenticated as administrator
# @router.delete("/positions/{election_id}/{position_id}")
# async def delete_position(
#     election_id: int,
#     position_id: int,
#     session: AsyncSession = Depends(get_async_session),
# ):
#     # election_id is not needed but kept for api route consistency
#     query = select(Position).where(Position.id == position_id)
#     result = await session.execute(query)
#     if result is None:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="No position with that ID exists.",
#         )
#     await session.delete(result.one())
#     await session.commit()

#     # TODO: Standardise messaging for when no data needs to be returned?
#     return {"message": "Position successfully deleted."}


class PositionPatch(BaseModel):
    name: str | None = None
    vacancies: int | None = None
    description: str | None = None
    executive: bool | None = None


# TODO: Admin auth
# @router.patch("/positions/{election_id}/{position_id}")
# async def update_position(
#     election_id: int,
#     position_id: int,
#     req: PositionPatch,
#     session: AsyncSession = Depends(get_async_session),
# ):
#     position = await session.execute(select(Position).where(Position.id == position_id))
#     if position is None:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="No position with that ID exists.",
#         )
#     position = position.one()
#     if req.name is not None:
#         position.name = req.name
#     if req.vacancies is not None:
#         position.vacancies = req.vacancies
#     if req.description is not None:
#         position.description = req.description
#     if req.executive is not None:
#         position.executive = req.executive

#     session.add(position)
#     await session.commit()

#     return position
