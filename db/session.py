from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_ROOT / ".env")

_engine: Engine | None = None
_session_factory: sessionmaker | None = None


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL no definida")
    return url


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(
            _database_url(),
            future=True,
            pool_pre_ping=True,
            pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
            max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
            pool_timeout=30,
            pool_recycle=1800,
        )
    return _engine


def get_session_factory() -> sessionmaker:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            future=True,
        )
    return _session_factory


class _LazySessionLocal:
    """Proxy callable compatible con el patrón SessionLocal()."""

    def __call__(self) -> Session:
        return get_session_factory()()


SessionLocal = _LazySessionLocal()


@contextmanager
def get_session() -> Any:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_raw_conn():
    """Conexión DB-API raw tomada del pool de SQLAlchemy (psycopg v3)."""
    return get_engine().raw_connection()
