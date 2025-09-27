from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Field, Session, SQLModel, create_engine

# Define SQLite database file
DATABASE_URL = "sqlite:///./dump.sqlite"

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


# Dependency to get session
def get_session():
    with Session(engine) as session:
        yield session


# Define the User model (assuming structure from `dump.sql`)
class User(SQLModel, table=True):
    keycloak_id: str = Field(primary_key=True)
    membership_equal_at: int
    student_id: str
    first_name: str
    last_name: str


# Pydantic model for response
class MembershipStatus(BaseModel):
    status: str
    student_id: str
    full_name: str


# Create a router for membership checks
router = APIRouter(tags=["Membership"])


# GET route for checking club membership status
@router.get("/membership/{keycloak_id}", response_model=MembershipStatus)
def check_membership(keycloak_id: str, session: Session = Depends(get_session)):
    try:
        # Query user by keycloak_id
        user = session.exec(
            "SELECT * FROM members WHERE keycloak_id = ?", (keycloak_id,)
        ).fetchone()

        if user:
            student_id = user[7][1:]
            full_name = f"{user[4]} {user[5]}"
            membership_status = (
                "Paid member" if user[13] == 1767225600 else "Unpaid member"
            )

            return MembershipStatus(
                status=membership_status,
                student_id=student_id,
                full_name=full_name,
            )
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")
