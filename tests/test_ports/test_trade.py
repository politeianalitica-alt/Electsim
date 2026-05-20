"""Tests P3 · comtrade + comext clients · seed demo + cache."""
from __future__ import annotations

import pytest

from etl.sources.ports.comext_client import (
    ISO2_TO_ISO3,
    ISO3_TO_ISO2,
    _to_iso2,
    _to_iso3,
    bilateral_eu,
    spain_flows,
)
from etl.sources.ports.comtrade_client import (
    bilateral_trade,
    is_real_api_available,
    top_partners,
)


# ─────────────────────────────────────────────────────────────────
# ISO helpers
# ─────────────────────────────────────────────────────────────────

def test_iso2_iso3_roundtrip():
    assert _to_iso3("ES") == "ESP"
    assert _to_iso3("DE") == "DEU"
    assert _to_iso2("ESP") == "ES"
    assert _to_iso2("CHN") == "CN"
    # Idempotente
    assert _to_iso3("ESP") == "ESP"
    assert _to_iso2("ES") == "ES"


def test_iso_maps_consistent():
    for iso2, iso3 in ISO2_TO_ISO3.items():
        assert ISO3_TO_ISO2[iso3] == iso2


# ─────────────────────────────────────────────────────────────────
# Comtrade · seed demo
# ─────────────────────────────────────────────────────────────────

def test_is_real_api_available_false_without_key(monkeypatch):
    monkeypatch.delenv("COMTRADE_API_KEY", raising=False)
    assert is_real_api_available() is False


def test_bilateral_trade_es_fr_export():
    res = bilateral_trade("ESP", "FRA", period_ym="2024-12", flow_kind="export")
    assert res["ok"] is True
    assert res["n_items"] >= 1
    item = res["items"][0]
    assert item["reporter_iso"] == "ESP"
    assert item["partner_iso"] == "FRA"
    assert item["flow_kind"] == "export"
    assert item["value_usd"] > 0


def test_bilateral_trade_es_cn_with_hs():
    res = bilateral_trade("ESP", "CHN", hs_code="27", period_ym="2024-12", flow_kind="import")
    assert res["ok"] is True
    assert res["n_items"] == 1
    assert res["items"][0]["hs_code"] == "27"


def test_bilateral_trade_unknown_partner_returns_empty_ok():
    res = bilateral_trade("ESP", "XYZ", period_ym="2024-12")
    assert res["ok"] is True
    assert res["n_items"] == 0
    assert res["source"] == "no_data"


def test_top_partners_export_spain_returns_sorted():
    res = top_partners("ESP", period_ym="2024-12", flow_kind="export", limit=5)
    assert res["ok"] is True
    assert len(res["items"]) <= 5
    values = [it["value_usd"] for it in res["items"]]
    # Ordenado descendente
    assert values == sorted(values, reverse=True)
    # FRA debe estar en top 3 (mayor export español)
    top3_partners = [it["partner_iso"] for it in res["items"][:3]]
    assert "FRA" in top3_partners


# ─────────────────────────────────────────────────────────────────
# Comext · seed demo
# ─────────────────────────────────────────────────────────────────

def test_spain_flows_returns_seed():
    res = spain_flows(period_ym="2024-12")
    assert res["ok"] is True
    assert res["n_items"] > 0
    assert res["reporter_iso"] == "ESP"
    # Todos los items son ESP como reporter (en ISO-3)
    assert all(item["reporter_iso"] == "ESP" for item in res["items"])


def test_spain_flows_filter_by_hs():
    res = spain_flows(hs_code="87", period_ym="2024-12", flow_kind="export")
    assert res["ok"] is True
    assert all(item["hs_code"] == "87" for item in res["items"])
    assert all(item["flow_kind"] == "export" for item in res["items"])


def test_bilateral_eu_es_de_export_vehicles():
    res = bilateral_eu("ES", "DE", hs_code="87", period_ym="2024-12", flow_kind="export")
    assert res["ok"] is True
    assert res["n_items"] >= 1
    item = res["items"][0]
    assert item["reporter_iso"] == "ESP"
    assert item["partner_iso"] == "DEU"
    assert item["hs_code"] == "87"


def test_bilateral_eu_accepts_iso2_and_iso3():
    # Mismo resultado con ISO-2 o ISO-3
    a = bilateral_eu("ES", "DE", hs_code="87", period_ym="2024-12", flow_kind="export")
    b = bilateral_eu("ESP", "DEU", hs_code="87", period_ym="2024-12", flow_kind="export")
    assert a["n_items"] == b["n_items"]


def test_bilateral_eu_unknown_partner_empty():
    res = bilateral_eu("ES", "XX", period_ym="2024-12")
    assert res["ok"] is True
    assert res["n_items"] == 0
