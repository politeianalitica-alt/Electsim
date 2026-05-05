"""
Fixtures compartidos para tests de integración.
"""
from __future__ import annotations

import os
import pytest


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "integration: tests que requieren PostgreSQL real"
    )


@pytest.fixture(scope="session")
def db_available() -> bool:
    """True si hay conexión a PostgreSQL."""
    try:
        from db.session import get_engine
        import sqlalchemy
        with get_engine().connect() as conn:
            conn.execute(sqlalchemy.text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.fixture(scope="session")
def skip_if_no_db(db_available):
    if not db_available:
        pytest.skip("PostgreSQL no disponible — tests de integración omitidos")
