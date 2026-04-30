"""
Tests de la dependencia FastAPI de mercado y los endpoints /market/*.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from config.market_loader import invalidate_market_cache


@pytest.fixture(autouse=True)
def clear_cache():
    invalidate_market_cache()
    yield
    invalidate_market_cache()


@pytest.fixture
def client():
    """TestClient con ELECTSIM_DEV_MODE=true para evitar autenticacion."""
    os.environ["ELECTSIM_DEV_MODE"] = "true"
    from api.main import app
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    # no limpiamos ELECTSIM_DEV_MODE para no afectar otros tests


# ---------------------------------------------------------------------------
# Resolucion del mercado via env var
# ---------------------------------------------------------------------------

class TestMarketViaEnv:
    def test_health_with_spain_env(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get("/market/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["market_code"] == "spain"
        assert data["ok"] is True
        assert isinstance(data["parties"], list)
        assert len(data["parties"]) > 0

    def test_info_with_spain_env(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get("/market/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["market_code"] == "spain"
        assert data["parties_count"] >= 4
        assert data["ingestion_sources_count"] >= 3
        assert "EUR" in data["currency"]

    def test_parties_list_with_spain_env(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get("/market/parties")
        assert resp.status_code == 200
        parties = resp.json()
        assert isinstance(parties, list)
        slugs = [p["slug"] for p in parties]
        assert "pp" in slugs
        assert "psoe" in slugs
        for p in parties:
            assert "color_hex" in p
            assert "ideology_axes" in p

    def test_sources_list_with_spain_env(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get("/market/sources")
        assert resp.status_code == 200
        sources = resp.json()
        assert isinstance(sources, list)
        ids = [s["id"] for s in sources]
        assert "boe" in ids


# ---------------------------------------------------------------------------
# Resolucion del mercado via cabecera X-Market-Code
# ---------------------------------------------------------------------------

class TestMarketViaHeader:
    def test_header_overrides_env(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get(
            "/market/health",
            headers={"X-Market-Code": "demo-eu"},
        )
        assert resp.status_code == 200
        assert resp.json()["market_code"] == "demo-eu"

    def test_demo_eu_header(self, client, monkeypatch):
        monkeypatch.delenv("ELECTSIM_DEFAULT_MARKET", raising=False)
        invalidate_market_cache()
        resp = client.get(
            "/market/info",
            headers={"X-Market-Code": "demo-eu"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["market_code"] == "demo-eu"

    def test_unknown_market_returns_400(self, client):
        resp = client.get(
            "/market/health",
            headers={"X-Market-Code": "mercado_inexistente"},
        )
        assert resp.status_code == 400

    def test_header_case_normalized(self, client, monkeypatch):
        """El codigo de mercado se normaliza a minusculas."""
        monkeypatch.setenv("ELECTSIM_DEFAULT_MARKET", "spain")
        invalidate_market_cache()
        resp = client.get(
            "/market/health",
            headers={"X-Market-Code": "SPAIN"},
        )
        assert resp.status_code == 200
        assert resp.json()["market_code"] == "spain"


# ---------------------------------------------------------------------------
# Endpoint /market/available
# ---------------------------------------------------------------------------

class TestAvailableMarkets:
    def test_returns_list(self, client):
        resp = client.get("/market/available")
        assert resp.status_code == 200
        markets = resp.json()
        assert isinstance(markets, list)
        assert "spain" in markets
        assert "demo-eu" in markets

    def test_no_underscore_prefixed(self, client):
        resp = client.get("/market/available")
        assert resp.status_code == 200
        for m in resp.json():
            assert not m.startswith("_")


# ---------------------------------------------------------------------------
# Dev mode fallback
# ---------------------------------------------------------------------------

class TestDevModeFallback:
    def test_dev_mode_falls_back_to_spain(self, client, monkeypatch):
        monkeypatch.setenv("ELECTSIM_DEV_MODE", "true")
        monkeypatch.delenv("ELECTSIM_DEFAULT_MARKET", raising=False)
        invalidate_market_cache()
        resp = client.get("/market/health")
        assert resp.status_code == 200
        assert resp.json()["market_code"] == "spain"
