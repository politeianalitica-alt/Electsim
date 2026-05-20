"""Tests P2 · AIS client (fallback synth sin AISSTREAM_API_KEY)."""
from __future__ import annotations

import pytest

from etl.sources.ports.ais_client import (
    _haversine_km,
    get_vessel_position,
    get_vessel_track,
    get_vessels_near,
    is_realtime_available,
    synth_positions_around,
)


def test_haversine_known_distance():
    # Madrid-Barcelona ≈ 504km
    d = _haversine_km(40.4168, -3.7038, 41.3851, 2.1734)
    assert 480 < d < 530


def test_is_realtime_available_false_without_env(monkeypatch):
    monkeypatch.delenv("AISSTREAM_API_KEY", raising=False)
    assert is_realtime_available() is False


def test_synth_positions_around_returns_n_within_radius():
    out = synth_positions_around("algeciras", n=15, radius_nm=10.0)
    assert len(out) == 15
    for p in out:
        assert p["near_port_slug"] == "algeciras"
        assert p["distance_nm"] <= 10.0
        # Schema
        assert "imo" in p and "lat" in p and "lon" in p and "sog" in p
        assert "nav_status" in p
    # Ordenado por distancia ascendente
    distances = [p["distance_nm"] for p in out]
    assert distances == sorted(distances)


def test_synth_positions_around_deterministic_per_day():
    """Misma fecha → mismos buques en mismo orden."""
    a = synth_positions_around("singapore", n=8)
    b = synth_positions_around("singapore", n=8)
    assert [p["imo"] for p in a] == [p["imo"] for p in b]


def test_synth_positions_around_unknown_port_returns_empty():
    assert synth_positions_around("does_not_exist") == []


def test_get_vessels_near_fallback_synth():
    """Sin BD ni AISstream, debe devolver sintético del puerto."""
    items = get_vessels_near("valencia", limit=10)
    assert len(items) == 10
    assert all(item["near_port_slug"] == "valencia" for item in items)


def test_get_vessel_position_known_imo():
    pos = get_vessel_position("IMO9525338")  # EVER GIVEN del seed
    assert pos is not None
    assert pos["imo"] == "IMO9525338"
    assert pos["name"] == "EVER GIVEN"
    # Tiene lat/lon (synth fallback)
    assert pos.get("lat") is not None
    assert pos.get("lon") is not None


def test_get_vessel_position_unknown_imo():
    assert get_vessel_position("IMO0000000") is None


def test_get_vessel_track_returns_points():
    track = get_vessel_track("IMO9525338", hours=24, max_points=24)
    assert len(track) > 0
    # Schema básico
    for p in track:
        assert "ts" in p and "lat" in p and "lon" in p
    # Cronológico ascendente
    ts_list = [p["ts"] for p in track]
    assert ts_list == sorted(ts_list)


def test_get_vessel_track_unknown_imo_returns_empty():
    assert get_vessel_track("IMO0000000") == []
