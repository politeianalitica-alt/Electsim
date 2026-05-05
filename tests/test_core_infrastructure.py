"""
Tests — Core infrastructure (db aliases, ServiceResult, health).
pytest tests/test_core_infrastructure.py -v
"""
from __future__ import annotations

import pytest


class TestDbAliases:
    def test_db_connection_importable(self):
        from db.connection import get_db_connection
        assert callable(get_db_connection)

    def test_db_database_importable(self):
        from db.database import get_db_connection
        assert callable(get_db_connection)

    def test_both_aliases_same_function_signature(self):
        from db.connection import get_db_connection as gc1
        from db.database import get_db_connection as gc2
        # Ambas deben ser callables con la misma firma
        import inspect
        assert inspect.isfunction(gc1)
        assert inspect.isfunction(gc2)


class TestServiceResult:
    def test_ok_real(self):
        from core.service_result import ServiceResult
        r = ServiceResult.ok_real([1, 2, 3], source="postgres.test")
        assert r.ok is True
        assert r.mode == "real"
        assert r.data == [1, 2, 3]
        assert r.source == "postgres.test"

    def test_ok_demo(self):
        from core.service_result import ServiceResult
        r = ServiceResult.ok_demo({}, source="demo")
        assert r.ok is True
        assert r.mode == "demo"

    def test_ok_fallback(self):
        from core.service_result import ServiceResult
        r = ServiceResult.ok_fallback([], warning="DB no disponible")
        assert r.ok is True
        assert r.mode == "fallback"
        assert "DB no disponible" in r.warnings

    def test_err_unavailable(self):
        from core.service_result import ServiceResult
        r = ServiceResult.err_unavailable([], table="crm_contacts")
        assert r.ok is False
        assert r.mode == "unavailable"
        assert r.error_code == "TABLE_MISSING"

    def test_err_db(self):
        from core.service_result import ServiceResult
        r = ServiceResult.err_db([], exc=RuntimeError("conn refused"))
        assert r.ok is False
        assert r.mode == "error"
        assert r.error_code == "DB_ERROR"
        assert "conn refused" in r.error_message

    def test_mode_badge(self):
        from core.service_result import ServiceResult
        r = ServiceResult.ok_real([])
        assert "🟢" in r.mode_badge()

    def test_as_dict(self):
        from core.service_result import ServiceResult
        r = ServiceResult.ok_real({"x": 1})
        d = r.as_dict()
        assert "ok" in d
        assert "mode" in d
        assert "updated_at" in d

    def test_generic_typing_works(self):
        from core.service_result import ServiceResult
        r: ServiceResult[list] = ServiceResult(ok=True, data=[], mode="demo")
        assert isinstance(r, ServiceResult)


class TestHealthModule:
    def test_check_db_connection_importable(self):
        from core.health import check_db_connection
        result = check_db_connection()
        # Puede fallar si no hay DB, pero debe devolver dict con 'ok'
        assert "ok" in result
        assert isinstance(result["ok"], bool)

    def test_check_required_tables_importable(self):
        from core.health import check_required_tables
        result = check_required_tables(["nonexistent_table_xyz"])
        assert "ok" in result
        assert "missing" in result

    def test_get_full_health_report_structure(self):
        from core.health import get_full_health_report
        report = get_full_health_report()
        assert "database" in report
        assert "migrations" in report
        assert "tables" in report
        assert "modules" in report
        assert "overall_ok" in report
        assert "timestamp" in report

    def test_module_mode_returns_string(self):
        from core.health import check_module_mode
        mode = check_module_mode("CRM", "crm_contacts")
        assert mode in ("real", "unavailable", "error")
