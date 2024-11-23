from dataclasses import dataclass
from os import getenv


@dataclass
class Config:
    db_url: str = getenv("DB_URL") or "sqlite+aiosqlite:///database.db"

    # snowflake id settings
    worker_id: int = int(getenv("WORKER_ID", "1"))
    data_center_id: int = int(getenv("DATA_CENTER_ID", "1"))


config = Config()
