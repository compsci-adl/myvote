import libsql_experimental as libsql
from dotenv import dotenv_values
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Field, SQLModel

# Load environment variables from .env file
TURSO_DATABASE_URL = dotenv_values().get("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = dotenv_values().get("TURSO_AUTH_TOKEN")


# Establish a connection to the Turso database using libsql_experimental
def get_db_connection():
    # Establish a fresh connection
    conn = libsql.connect(TURSO_DATABASE_URL, auth_token=TURSO_AUTH_TOKEN)
    return conn


# Initialize connection
conn = get_db_connection()


# Dependency to get sync session from Turso
def get_session_turso():
    # No need to explicitly close the connection, just yield it for the query
    yield conn


# Define your User model (assuming it's already defined somewhere)
class User(SQLModel, table=True):
    keycloak_id: str = Field(primary_key=True)
    membership_equal_at: str


# Pydantic model for response
class MembershipStatus(BaseModel):
    status: str


# Create a router to manage membership checks
router = APIRouter(tags=["Membership"])


# Pydantic model to handle auth token extraction
class AuthToken(BaseModel):
    auth_token: str


# Function to handle connection expiration and reconnect
def check_connection():
    try:
        # Check if connection is still alive
        conn.execute("SELECT 1")
    except Exception as e:
        # If connection fails, reconnect
        print(f"Connection expired, reconnecting... {str(e)}")
        return get_db_connection()  # Reconnect and return a new connection
    return conn


# GET route for checking club membership status from Turso
@router.get("/membership/{keycloak_id}", response_model=MembershipStatus)
def check_membership(
    keycloak_id: str,
    conn: libsql.Connection = Depends(get_session_turso),
):
    try:
        # Recheck the connection status before using it
        conn = check_connection()

        # Prepare the raw SQL query as a string
        sql_query = f"SELECT * FROM members WHERE keycloak_id = '{keycloak_id}'"

        # Execute the raw SQL query
        result = conn.execute(sql_query)

        # Fetch the first result (if any)
        user = result.fetchall()

        if user:
            user = user[0]
            if user[13] == 1767225600:
                return MembershipStatus(status="Paid member")
            else:
                return MembershipStatus(status="Unpaid member")
        else:
            raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error querying the database: {str(e)}"
        )
