from typing import Any, AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from .config import config

# the db engine used for transactions
engine = create_async_engine(config.db_url, echo=True, future=True)


async def get_async_session() -> AsyncGenerator[AsyncSession, Any]:
    """
    Returns an async session for the database.
    """
    async with AsyncSession(engine) as session:
        yield session


# def do_migration_with_conn(conn: Connection):
#     """
#     Takes a synchronous connection and runs migrations with Alembic.
#     Called by run_migrations_online.
#     """

#     ctx = context.configure(
#         target_metadata=SQLModel.metadata,
#         connection=conn,
#     )

#     with ctx.begin_transaction():
#         ctx.run_migrations()


# async def run_migrations():
#     """
#     Runs migrations for the database using the default engine.
#     """

#     async with engine.connect() as conn:
#         await conn.run_sync(do_migration_with_conn)


# def run_migrations_offline():
#     '''
#     Run migrations in offline mode with Alembic.
#     Alembic will take care of the connection and transaction management.
#     '''

#     context.configure(
#         target_metadata=SQLModel.metadata,
#         url=config.db_url,
#     )

#     with context.begin_transaction():
#         context.run_migrations()
