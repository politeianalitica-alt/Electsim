import os
from functools import lru_cache

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )


def query(sql: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query parametrizada y devuelve DataFrame."""
    engine = get_engine()
    with engine.connect() as conn:
        return pd.read_sql(text(sql), conn, params=params or {})


def execute(sql: str, params: dict | None = None) -> None:
    """Ejecuta una sentencia DML (INSERT/UPDATE/DELETE)."""
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(text(sql), params or {})
