"""Tests P2 · port_intel · congestion, port_calls, snapshot."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from etl.sources.ports.port_intel import (
    _infer_cargo,
    port_calls,
    port_congestion,
    port_snapshot,
)


def test_infer_cargo_table():
    assert _infer_cargo("container") == "containers"
    assert _infer_cargo("tanker") == "crude_or_products"
    assert _infer_cargo("bulk") == "dry_bulk_commodities"
    assert _infer_cargo("lng") == "lng"
    assert _infer_cargo("unknown_type") == "general_cargo"


def test_port_congestion_returns_series():
    out = port_congestion("algeciras", days=14)
    assert out["port_slug"] == "algeciras"
    assert out["days"] == 14
    assert len(out["series"]) == 14
    assert "data_source" in out
    for d in out["series"]:
        assert "date" in d and "vessels_anchored" in d
        assert d["vessels_anchored"] >= 0
    assert "current" in out


def test_port_congestion_unknown_port():
    out = port_congestion("does_not_exist", days=7)
    assert "error" in out
    assert out["series"] == []


def test_port_congestion_deterministic():
    a = port_congestion("rotterdam", days=7)
    b = port_congestion("rotterdam", days=7)
    assert a["series"] == b["series"]


def test_port_calls_returns_synthetic_list():
    calls = port_calls("singapore", days_back=3, limit=20)
    assert len(calls) > 0
    assert len(calls) <= 20
    # Cronológico descendente
    ts_list = [c["arrival_ts"] for c in calls]
    assert ts_list == sorted(ts_list, reverse=True)
    # Schema
    for c in calls:
        assert "imo" in c and "arrival_ts" in c and "operator" in c
        assert c.get("cargo_inferred") is not None


def test_port_calls_unknown_port_empty():
    assert port_calls("does_not_exist") == []


def test_port_snapshot_returns_rich_payload():
    snap = port_snapshot("algeciras")
    assert snap["slug"] == "algeciras"
    assert "vessels_in_area" in snap
    assert "vessels_anchored" in snap
    assert "vessels_moored" in snap
    assert "top_operators" in snap
    assert "cargo_mix" in snap
    assert "congestion_current" in snap
    assert isinstance(snap["top_operators"], list)
    # Cargo mix porcentajes suman ~100
    if snap["cargo_mix"]:
        total_pct = sum(c["pct"] for c in snap["cargo_mix"])
        assert 99 <= total_pct <= 101


def test_port_snapshot_unknown_port():
    snap = port_snapshot("does_not_exist")
    assert "error" in snap
