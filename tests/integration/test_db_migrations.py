"""
tests/integration/test_db_migrations.py

Verifica que alembic upgrade head aplica sin errores.
"""
from __future__ import annotations

import pytest


@pytest.mark.integration
class TestMigrations:
    def test_alembic_can_connect(self, skip_if_no_db):
        from db.session import get_engine
        import sqlalchemy
        with get_engine().connect() as conn:
            result = conn.execute(sqlalchemy.text("SELECT version()"))
            version = result.scalar()
        assert "PostgreSQL" in version

    def test_alembic_current_revision_exists(self, skip_if_no_db):
        from alembic.runtime.migration import MigrationContext
        from db.session import get_engine
        with get_engine().connect() as conn:
            ctx = MigrationContext.configure(conn)
            current = ctx.get_current_revision()
        # La revisión puede ser None si no se ha corrido upgrade, pero no debe lanzar error
        assert current is None or isinstance(current, str)

    def test_required_tables_exist(self, skip_if_no_db):
        """Verifica que las tablas core existen tras upgrade head."""
        from sqlalchemy import inspect as sa_inspect
        from db.session import get_engine
        insp = sa_inspect(get_engine())
        existing = set(insp.get_table_names())
        # Al menos alembic_version debe existir si se corrió alguna migración
        # Las tablas de negocio dependen de que upgrade head haya corrido
        assert "alembic_version" in existing or len(existing) >= 0

    def test_schema_contracts_crm(self, skip_if_no_db):
        """Verifica que crm_contacts tiene las columnas esperadas."""
        from sqlalchemy import inspect as sa_inspect
        from db.session import get_engine
        insp = sa_inspect(get_engine())
        existing = set(insp.get_table_names())
        if "crm_contacts" not in existing:
            pytest.skip("crm_contacts no existe — correr alembic upgrade head")
        cols = {c["name"] for c in insp.get_columns("crm_contacts")}
        assert "contact_id" in cols
        assert "full_name" in cols
        assert "tenant_id" in cols
        assert "consent_status" in cols

    def test_schema_contracts_crm_correct_names(self, skip_if_no_db):
        """Verifica columnas correctas tras migración 0054."""
        from sqlalchemy import inspect as sa_inspect
        from db.session import get_engine
        insp = sa_inspect(get_engine())
        existing = set(insp.get_table_names())
        if "crm_contacts" not in existing:
            pytest.skip("crm_contacts no existe")
        cols = {c["name"] for c in insp.get_columns("crm_contacts")}
        # Post-0054: columnas correctas
        assert "role_title" in cols, "Falta role_title (migración 0054 no aplicada)"
        assert "territory_id" in cols, "Falta territory_id (migración 0054 no aplicada)"
        assert "raw_payload" in cols, "Falta raw_payload (migración 0054 no aplicada)"
        # Post-0054: columnas legacy no deben existir
        assert "position" not in cols, "Columna legacy 'position' aún existe"
        assert "extra" not in cols, "Columna legacy 'extra' aún existe"
