from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from src.db import engine
from src.models import Election, ElectionStatus
from src.routers import positions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown of the app."""

    # Code here is executed before app started, we can set things up or whatever

    # TEMP: Create the election
    async with AsyncSession(engine) as session:
        election = await session.execute(select(Election))
        election = election.scalars().first()
        if election is None:
            n = datetime.now(timezone.utc)
            election = Election(
                id=0,
                name="Test Election",
                nomination_end=n,
                nomination_start=n,
                voting_end=n,
                voting_start=n,
                status=ElectionStatus.PreRelease,
            )
            session.add(election)
            await session.commit()

    yield

    # Code here is executed when the app is dying, use to clean things up


# Create the FastAPI app, and pass the lifespan context manager.
app = FastAPI(title="Votes API", lifespan=lifespan)

app.include_router(positions.router)
