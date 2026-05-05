"""
db/connection.py — Alias canónico para compatibilidad.

Todos los módulos que hagan:
    from db.connection import get_db_connection
funcionarán apuntando a db.session.get_raw_conn.
"""
from __future__ import annotations

from db.session import get_raw_conn


def get_db_connection():
    """Devuelve una conexión DB-API raw del pool de SQLAlchemy."""
    return get_raw_conn()
