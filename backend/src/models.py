import enum
from datetime import datetime, timezone

from sqlmodel import JSON, Column, Enum, Field, Relationship, SQLModel


class ElectionStatus(enum.Enum):
    PreRelease = 0
    Nominations = 1
    NominationsClosed = 2
    Voting = 3
    VotingClosed = 4
    ResultsReleased = 5


class Election(SQLModel, table=True):
    id: str = Field(default=None, primary_key=True)
    name: str
    nomination_start: datetime
    nomination_end: datetime
    voting_start: datetime
    voting_end: datetime
    status: ElectionStatus = Field(sa_column=Column(Enum(ElectionStatus)))


class Voter(SQLModel, table=True):
    id: str = Field(primary_key=True)
    election: int = Field(foreign_key="election.id")
    student_id: int  # The numbers only, 7 digits
    name: str
    votes: list["Ballot"] = Relationship(back_populates="voter")


class CandidatePositionLink(SQLModel, table=True):
    candidate_id: str = Field(foreign_key="candidate.id", primary_key=True)
    position_id: str = Field(foreign_key="position.id", primary_key=True)


# TODO: Candidates should have pictures of themselves
# Might be a pain with file hosting and everthing, could maybe just use S3?
class Candidate(SQLModel, table=True):
    id: str = Field(primary_key=True)
    election: int = Field(foreign_key="election.id")
    name: str
    statement: str | None
    avatar: str | None
    nominations: list["Position"] = Relationship(
        back_populates="nominees", link_model=CandidatePositionLink
    )


class Position(SQLModel, table=True):
    id: str = Field(primary_key=True)
    election_id: int = Field(foreign_key="election.id")
    name: str
    vacancies: int
    description: str
    executive: bool
    nominees: list[Candidate] = Relationship(
        back_populates="nominations", link_model=CandidatePositionLink
    )


class Ballot(SQLModel, table=True):
    id: str = Field(primary_key=True)
    voter_id: int = Field(foreign_key="voter.id")
    voter: Voter = Relationship(back_populates="votes")
    position: int = Field(foreign_key="position.id")
    preferences: list[int] = Field(sa_column=Column(JSON))
    submitted: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Something about eligibility and auth perhaps?
