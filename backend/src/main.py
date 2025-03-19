import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel

from src.db import engine
from src.routers import candidates, elections, membership, positions, votes

# Configure CORS for local development and production
ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
    "https://myvote.csclub.org.au",
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown of the app."""
    # Code here is executed before app starts, we can set things up or whatever

    # Check if the database file exists
    db_path = "database.db"
    if not os.path.exists(db_path):
        # Create the database and tables if it doesn't exist
        async with engine.begin() as conn:
            await conn.run_sync(SQLModel.metadata.create_all)
    yield

    # Code here is executed when the app is dying, use to clean things up


# Create the FastAPI app, and pass the lifespan context manager
app = FastAPI(title="Votes API", lifespan=lifespan)


# Middleware setup for CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(positions.router)
app.include_router(candidates.router)
app.include_router(elections.router)
app.include_router(votes.router)
app.include_router(membership.router)
