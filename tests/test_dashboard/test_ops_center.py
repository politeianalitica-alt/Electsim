from __future__ import annotations

from dashboard.services import ops_center


def test_status_for_age_rules():
    assert ops_center._status_for_age(age_horas=1, total_rows=10, sla_horas=6) == "ok"
    assert ops_center._status_for_age(age_horas=12, total_rows=10, sla_horas=6) == "warning"
    assert ops_center._status_for_age(age_horas=30, total_rows=10, sla_horas=6) == "critical"
    assert ops_center._status_for_age(age_horas=None, total_rows=10, sla_horas=6) == "warning"
    assert ops_center._status_for_age(age_horas=1, total_rows=0, sla_horas=6) == "critical"


def test_load_slos_returns_configured_datasets():
    slos = ops_center._load_slos()
    assert isinstance(slos, list)
    assert len(slos) > 0
    assert {"fase", "nombre", "tabla", "fecha_cols", "sla_horas"}.issubset(set(slos[0].keys()))
