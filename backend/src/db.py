from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from .config import config

# Create an async engine to connect to Turso
engine = create_async_engine(config.db_url, echo=True, future=True)

# Create sessionmaker for async session handling
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncSession:
    """
    Returns an async session for the database.
    """
    async with SessionLocal() as session:
        yield session
