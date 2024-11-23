from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.routers import candidates


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown of the app."""

    # Code here is executed before app started, we can set things up or whatever

    yield

    # Code here is executed when the app is dying, use to clean things up


# Create the FastAPI app, and pass the lifespan context manager.
app = FastAPI(title="Votes API", lifespan=lifespan)

app.include_router(candidates.router)
