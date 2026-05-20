"""Tests P1 · router /api/v1/ports endpoints stub.

Verifica:
  - GET /catalog devuelve >=40 puertos con shape correcto
  - GET /catalog?country=ES filtra
  - GET /catalog/vessels devuelve >=50 vessels
  - GET /snapshot-all devuelve items con KPIs sintéticos consistentes
  - GET /{port_slug} 200 para conocidos, 404 para desconocidos
  - Endpoints diferidos devuelven 501 explícito (no 500 ni 200)
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client():
    from api.main import app
    return TestClient(app)


def test_catalog_endpoint_returns_ports(client: TestClient):
    r = client.get("/api/v1/ports/catalog")
    assert r.status_code == 200
    data = r.json()
    assert data["n_items"] >= 40
    assert len(data["items"]) == data["n_items"]
    # cada item con campos clave
    p0 = data["items"][0]
    for k in ("slug", "unlocode", "name", "country_iso", "lat", "lon", "type", "region"):
        assert k in p0


def test_catalog_filter_country(client: TestClient):
    r = client.get("/api/v1/ports/catalog?country=ES")
    assert r.status_code == 200
    data = r.json()
    assert all(p["country_iso"] == "ES" for p in data["items"])
    assert data["n_items"] >= 6


def test_catalog_vessels_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/catalog/vessels")
    assert r.status_code == 200
    data = r.json()
    assert data["n_items"] >= 50
    v0 = data["items"][0]
    assert v0["imo"].startswith("IMO")


def test_snapshot_all_returns_synthetic_kpis(client: TestClient):
    r = client.get("/api/v1/ports/snapshot-all?limit=10")
    assert r.status_code == 200
    data = r.json()
    assert data["n_items"] <= 10
    assert data["data_source"] == "synthetic"
    for item in data["items"]:
        assert "vessels_anchored" in item
        assert "arrivals_24h" in item
        assert "congestion_pct" in item
        assert 5 <= item["vessels_anchored"] <= 85
        assert 10 <= item["congestion_pct"] <= 60


def test_snapshot_kpis_are_deterministic(client: TestClient):
    """Llamadas sucesivas deben devolver los mismos KPIs (hash-based)."""
    r1 = client.get("/api/v1/ports/snapshot-all?limit=3").json()
    r2 = client.get("/api/v1/ports/snapshot-all?limit=3").json()
    for a, b in zip(r1["items"], r2["items"]):
        assert a["vessels_anchored"] == b["vessels_anchored"]
        assert a["arrivals_24h"] == b["arrivals_24h"]


def test_port_overview_known(client: TestClient):
    r = client.get("/api/v1/ports/algeciras")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "algeciras"
    assert data["country_iso"] == "ES"
    assert "kpis_24h" in data
    assert "vessels_anchored" in data["kpis_24h"]


def test_port_overview_unknown_returns_404(client: TestClient):
    r = client.get("/api/v1/ports/does_not_exist_xyz")
    assert r.status_code == 404


# Todos los endpoints diferidos ya implementados en P2-P5 · sin 501s pendientes.


# ─────────────────────────────────────────────────────────────────
# Endpoints P2 ahora implementados
# ─────────────────────────────────────────────────────────────────

def test_port_vessels_returns_list(client: TestClient):
    r = client.get("/api/v1/ports/algeciras/vessels?limit=15")
    assert r.status_code == 200
    data = r.json()
    assert data["port_slug"] == "algeciras"
    assert data["n_vessels"] == len(data["items"])
    assert data["n_vessels"] == 15


def test_port_calls_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/valencia/calls?days_back=3&limit=20")
    assert r.status_code == 200
    data = r.json()
    assert data["port_slug"] == "valencia"
    assert data["days_back"] == 3
    assert len(data["items"]) > 0


def test_port_congestion_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/rotterdam/congestion?days=14")
    assert r.status_code == 200
    data = r.json()
    assert data["port_slug"] == "rotterdam"
    assert len(data["series"]) == 14


def test_vessel_lookup_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/vessels/IMO9525338")
    assert r.status_code == 200
    data = r.json()
    assert data["imo"] == "IMO9525338"
    assert data["name"] == "EVER GIVEN"


def test_vessel_lookup_unknown(client: TestClient):
    r = client.get("/api/v1/ports/vessels/IMO0000000")
    assert r.status_code == 404


def test_vessel_track_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/vessels/IMO9525338/track?hours=12&max_points=12")
    assert r.status_code == 200
    data = r.json()
    assert data["imo"] == "IMO9525338"
    assert data["hours"] == 12
    assert data["n_points"] > 0


# ─────────────────────────────────────────────────────────────────
# Endpoints P3 (comercio declarado)
# ─────────────────────────────────────────────────────────────────

def test_trade_bilateral_auto_route_comext_for_eu(client: TestClient):
    r = client.get("/api/v1/ports/trade/bilateral?reporter=ES&partner=DE&period=2024-12")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["use_source"] == "comext"  # ambos UE
    assert data["n_items"] >= 1


def test_trade_bilateral_routes_comtrade_for_non_eu(client: TestClient):
    r = client.get("/api/v1/ports/trade/bilateral?reporter=ESP&partner=CHN&period=2024-12&flow=import")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["use_source"] == "comtrade"


def test_trade_spain_flows_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/trade/spain-flows?period=2024-12")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["reporter_iso"] == "ESP"
    assert data["n_items"] > 0


def test_trade_top_partners_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/trade/top-partners?reporter=ESP&flow=export&limit=5")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert len(data["items"]) <= 5


# ─────────────────────────────────────────────────────────────────
# Endpoints P4 (freight + chokepoints)
# ─────────────────────────────────────────────────────────────────

def test_freight_snapshot_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/freight/snapshot")
    assert r.status_code == 200
    data = r.json()
    assert data["n_items"] == 6
    assert all("signal" in item for item in data["items"])


def test_freight_price_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/freight/baltic_dry/price?range=3mo")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "baltic_dry"
    assert len(data["ohlc"]) == 90


def test_freight_price_unknown_404(client: TestClient):
    r = client.get("/api/v1/ports/freight/nonexistent/price")
    assert r.status_code == 404


def test_chokepoints_list_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/chokepoints")
    assert r.status_code == 200
    data = r.json()
    assert data["n_items"] == 6
    # Ordenado por risk desc
    scores = [it["risk_score"] for it in data["items"]]
    assert scores == sorted(scores, reverse=True)


def test_chokepoint_detail_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/chokepoints/suez?days=15")
    assert r.status_code == 200
    data = r.json()
    assert data["slug"] == "suez"
    assert "recent_events" in data
    assert "risk_score" in data


def test_chokepoint_detail_unknown_404(client: TestClient):
    r = client.get("/api/v1/ports/chokepoints/nonexistent")
    assert r.status_code == 404


def test_vessel_screen_endpoint(client: TestClient):
    r = client.get("/api/v1/ports/vessels/IMO9525338/screen")
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["vessel_name"] == "EVER GIVEN"
    assert "checks" in data


def test_vessel_screen_unknown_404(client: TestClient):
    r = client.get("/api/v1/ports/vessels/IMO0000000/screen")
    assert r.status_code == 404


def test_sanctions_batch_screen_endpoint(client: TestClient):
    r = client.post(
        "/api/v1/ports/sanctions/screen",
        json={"vessels": ["IMO9525338"], "operators": ["Sovcomflot"]},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["summary"]["n_vessels_checked"] == 1
    assert data["summary"]["n_operators_checked"] == 1
