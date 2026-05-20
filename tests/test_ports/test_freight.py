"""Tests P4 · freight_rates + snapshot_all."""
from __future__ import annotations

import pytest

from etl.sources.ports.freight_rates import (
    FREIGHT_INDICES,
    _classify_signal,
    get_index,
    get_price,
    list_freight_indices,
    snapshot_all,
)


def test_freight_catalog_has_6_indices():
    assert len(FREIGHT_INDICES) == 6
    assert {"baltic_dry", "freightos_baltic", "baltic_dirty_tankers"}.issubset(
        FREIGHT_INDICES.keys()
    )


def test_every_index_has_required_fields():
    required = {"slug", "name", "category", "unit", "exchange", "base_level"}
    for slug, idx in FREIGHT_INDICES.items():
        assert required <= set(idx.keys())
        assert idx["base_level"] > 0
        assert idx["category"].startswith("freight_")


def test_get_index_known_and_unknown():
    assert get_index("baltic_dry")["name"] == "Baltic Dry Index (BDI)"
    assert get_index("nonexistent") is None


def test_get_price_returns_synthetic_series():
    res = get_price("baltic_dry", range_="3mo")
    assert res["slug"] == "baltic_dry"
    assert len(res["ohlc"]) == 90
    assert res["last_price"] is not None
    assert res["data_source"] == "synthetic"
    # OHLC valid
    for c in res["ohlc"]:
        assert c["low"] <= c["close"] <= c["high"]
        assert c["low"] <= c["open"] <= c["high"]


def test_get_price_unknown():
    assert "error" in get_price("nonexistent")


def test_get_price_deterministic_same_day():
    a = get_price("baltic_capesize", range_="1mo")
    b = get_price("baltic_capesize", range_="1mo")
    assert a["ohlc"] == b["ohlc"]


def test_snapshot_all_returns_all_indices():
    res = snapshot_all()
    assert res["n_items"] == 6
    for item in res["items"]:
        assert "last_price" in item
        assert "change_24h_pct" in item
        assert "change_7d_pct" in item
        assert "signal" in item
        assert item["signal"] in (
            "fuerte_subida", "subida", "estable", "bajada", "fuerte_bajada",
        )


def test_classify_signal_thresholds():
    assert _classify_signal(10) == "fuerte_subida"
    assert _classify_signal(5) == "subida"
    assert _classify_signal(0) == "estable"
    assert _classify_signal(-5) == "bajada"
    assert _classify_signal(-10) == "fuerte_bajada"


def test_list_freight_indices_count():
    assert len(list_freight_indices()) == 6
