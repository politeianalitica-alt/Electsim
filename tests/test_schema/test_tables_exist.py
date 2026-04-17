import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


@pytest.mark.integration
def test_core_tables_exist():
    url = os.getenv("DATABASE_URL")
    if not url:
        pytest.skip("DATABASE_URL no definida")
    try:
        engine = create_engine(url)
        with engine.connect() as conn:
            r = conn.execute(
                text(
                    "SELECT COUNT(*) FROM information_schema.tables "
                    "WHERE table_schema = 'public' AND table_name = 'comunidades_autonomas'"
                )
            )
            assert r.scalar() == 1
    except OperationalError:
        pytest.skip("No hay conexión a PostgreSQL")
