"""Tests P5 · sanctions_maritime wrapper + brain tools."""
from __future__ import annotations

import pytest

from etl.sources.ports.sanctions_maritime import (
    screen_batch,
    screen_operator,
    screen_vessel,
)


# ─────────────────────────────────────────────────────────────────
# sanctions_maritime · degradación cerrada
# ─────────────────────────────────────────────────────────────────

def test_screen_vessel_known_imo_returns_ok():
    """Aunque compliance no esté instalado, el wrapper devuelve ok=True con score 0."""
    res = screen_vessel("IMO9525338")
    assert res["ok"] is True
    assert res["vessel_name"] == "EVER GIVEN"
    assert "checks" in res
    assert len(res["checks"]) >= 1
    assert "risk_score" in res
    assert 0 <= res["risk_score"] <= 100
    assert res["risk_level"] in ("CLEAR", "LOW", "MEDIUM", "HIGH")


def test_screen_vessel_unknown_imo():
    res = screen_vessel("IMO0000000")
    assert res["ok"] is False
    assert "no existe" in res["error"]


def test_screen_operator_returns_payload():
    res = screen_operator("Maersk Line")
    assert res["ok"] is True
    assert res["operator"] == "Maersk Line"
    assert "risk_score" in res
    assert res["risk_level"] in ("CLEAR", "LOW", "MEDIUM", "HIGH")


def test_screen_batch_mixed():
    res = screen_batch(
        vessels=["IMO9525338", "IMO9811000"],
        operators=["Sovcomflot"],
    )
    assert res["ok"] is True
    assert res["summary"]["n_vessels_checked"] == 2
    assert res["summary"]["n_operators_checked"] == 1
    assert "any_hit" in res["summary"]


def test_screen_batch_empty():
    res = screen_batch()
    assert res["ok"] is True
    assert res["summary"]["n_vessels_checked"] == 0
    assert res["summary"]["n_operators_checked"] == 0
    assert res["summary"]["any_hit"] is False


# ─────────────────────────────────────────────────────────────────
# Brain tools · registro y ejecución básica
# ─────────────────────────────────────────────────────────────────

def test_all_ports_tools_registered():
    """Las 9 tools del módulo deben aparecer en ToolRegistry."""
    # Import desencadena el registro vía decorators
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    expected = {
        "port_catalog", "port_snapshot", "port_calls",
        "vessel_lookup", "vessel_screen",
        "bilateral_trade", "spain_trade_briefing",
        "freight_snapshot", "chokepoint_risk",
    }
    registered = set(ToolRegistry.list_tools().keys())
    missing = expected - registered
    assert not missing, f"tools no registradas: {missing}"


def test_port_catalog_tool_returns_items():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("port_catalog")
    res = fn(country="ES")
    assert res["n_items"] >= 6
    assert all(p["country_iso"] == "ES" for p in res["items"])


def test_port_snapshot_tool():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("port_snapshot")
    res = fn("algeciras")
    assert res["slug"] == "algeciras"
    assert "vessels_in_area" in res


def test_vessel_lookup_tool():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("vessel_lookup")
    res = fn("IMO9525338")
    assert res["imo"] == "IMO9525338"
    assert res["name"] == "EVER GIVEN"


def test_vessel_screen_tool():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("vessel_screen")
    res = fn("IMO9525338")
    assert res["ok"] is True


def test_bilateral_trade_tool_eu_routes_to_comext():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("bilateral_trade")
    res = fn("ESP", "DEU", hs_code="87", period_ym="2024-12", flow_kind="export")
    assert res["n_items"] >= 1


def test_spain_trade_briefing_tool():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("spain_trade_briefing")
    res = fn(period_ym="2024-12")
    assert res["ok"] is True
    assert "top_export_partners" in res
    assert "top_import_partners" in res
    assert "top_hs_chapters" in res


def test_freight_snapshot_tool():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("freight_snapshot")
    res = fn()
    assert res["n_items"] == 6


def test_chokepoint_risk_tool_all():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("chokepoint_risk")
    res = fn()  # sin slug → todos
    assert res["n_items"] == 6


def test_chokepoint_risk_tool_single():
    import agents.tools.ports_tools  # noqa: F401
    from agents.tools import ToolRegistry
    fn = ToolRegistry.get("chokepoint_risk")
    res = fn("suez")
    assert res["slug"] == "suez"
    assert "risk_score" in res
