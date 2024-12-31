from __future__ import annotations

from enum import Enum

from sqlmodel import Field, SQLModel


class ElectionStatus(Enum):
    PreRelease = 0
    Nominations = 1
    NominationsClosed = 2
    Voting = 3
    VotingClosed = 4
    ResultsReleased = 5


class Election(SQLModel, table=True):
    id: int = Field(primary_key=True)
    name: str
    status: ElectionStatus


class Voter(SQLModel, table=True):
    id: int = Field(primary_key=True)
    election: Election
    student_id: int  # The numbers only, 7 digits
    name: str
    votes: dict[Position, Candidate]


class Candidate(SQLModel, table=True):
    id: int = Field(primary_key=True)
    election: Election
    name: str
    statement: str | None
    avatar: str | None
    nominations: list[Position]


class Position(SQLModel, table=True):
    id: int = Field(primary_key=True)
    election: Election
    name: str
    description: str


# Something about eligibility and auth perhaps?
