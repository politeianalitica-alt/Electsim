"""
tests/integration/test_dashboard_services_real_db.py

Verifica que los dashboard services funcionan contra DB real
y reportan modo correcto (real/fallback/unavailable).
"""
from __future__ import annotations

import pytest


@pytest.mark.integration
class TestDashboardServicesMode:
    def test_health_report_structure(self, skip_if_no_db):
        from core.health import get_full_health_report
        report = get_full_health_report()
        assert report["database"]["ok"] is True
        assert "modules" in report
        assert isinstance(report["modules"], dict)

    def test_health_report_modules_have_valid_mode(self, skip_if_no_db):
        from core.health import get_full_health_report
        report = get_full_health_report()
        valid_modes = {"real", "unavailable", "error"}
        for mod, mode in report["modules"].items():
            assert mode in valid_modes, f"Módulo {mod} tiene modo inválido: {mode}"

    def test_check_required_tables_when_db_connected(self, skip_if_no_db):
        from core.health import check_required_tables
        result = check_required_tables(["crm_contacts", "content_assets"])
        # Si las tablas existen, ok=True; si no existen, ok=False pero no crash
        assert "ok" in result
        assert "missing" in result
        assert isinstance(result["missing"], list)
