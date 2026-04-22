from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

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
        raise RuntimeError(
            "DATABASE_URL no definida. Copia .env.example a .env y ajusta la conexión, "
            "o exporta DATABASE_URL antes de ejecutar dashboard/API/Alembic."
        )
    return url


def _validate_env_consistency(database_url: str) -> None:
    """
    Sanity-check en modo local: si POSTGRES_USER/PASSWORD están definidos,
    deben ser coherentes con DATABASE_URL cuando apunta a localhost.
    """
    try:
        parsed = urlparse(database_url.replace("+psycopg", ""))
    except Exception:
        return
    host = (parsed.hostname or "").strip().lower()
    if host not in {"localhost", "127.0.0.1", "::1"}:
        return

    env_user = (os.getenv("POSTGRES_USER", "") or "").strip()
    env_pwd = (os.getenv("POSTGRES_PASSWORD", "") or "").strip()
    url_user = (parsed.username or "").strip()
    url_pwd = (parsed.password or "").strip()

    if env_user and url_user and env_user != url_user:
        raise RuntimeError(
            f"Inconsistencia DB local: POSTGRES_USER='{env_user}' pero DATABASE_URL usa usuario '{url_user}'. "
            "Alinea ambas variables."
        )
    if env_pwd and url_pwd and env_pwd != url_pwd:
        raise RuntimeError(
            "Inconsistencia DB local: POSTGRES_PASSWORD no coincide con la contraseña en DATABASE_URL. "
            "Alinea ambas variables."
        )


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        database_url = _database_url()
        _validate_env_consistency(database_url)
        _engine = create_engine(
            database_url,
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
