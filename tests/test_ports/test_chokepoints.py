"""Tests P4 · chokepoints risk scoring."""
from __future__ import annotations

import pytest

from etl.sources.ports.chokepoints import (
    CHOKEPOINTS,
    _classify_level,
    _point_in_bbox,
    all_chokepoints_risk,
    compute_risk_score,
    get_chokepoint,
    list_chokepoints,
)


def test_chokepoints_catalog_has_6():
    assert len(CHOKEPOINTS) == 6
    assert set(CHOKEPOINTS.keys()) == {
        "suez", "ormuz", "bosporus", "malacca", "panama", "bab_el_mandeb",
    }


def test_every_chokepoint_has_required_fields():
    required = {"slug", "name", "bbox", "countries_iso3", "traffic_volume_pct",
                "alt_routes", "score_base", "typical_disruptions"}
    for slug, cp in CHOKEPOINTS.items():
        assert required <= set(cp.keys())
        # bbox bien formado
        assert len(cp["bbox"]) == 2 and len(cp["bbox"][0]) == 2
        assert cp["bbox"][0][0] <= cp["bbox"][1][0]
        assert cp["bbox"][0][1] <= cp["bbox"][1][1]
        # score_base razonable
        assert 0 <= cp["score_base"] <= 100
        assert 0 < cp["traffic_volume_pct"] < 100
        assert isinstance(cp["countries_iso3"], list) and cp["countries_iso3"]


def test_point_in_bbox_suez():
    suez_center = (30.5, 32.5)
    bbox = CHOKEPOINTS["suez"]["bbox"]
    assert _point_in_bbox(*suez_center, bbox) is True
    # Madrid no en bbox
    assert _point_in_bbox(40.4, -3.7, bbox) is False


def test_compute_risk_score_returns_payload():
    res = compute_risk_score("ormuz", days=30)
    assert res["slug"] == "ormuz"
    assert "risk_score" in res
    assert 0 <= res["risk_score"] <= 100
    assert res["level"] in ("critico", "alto", "medio", "bajo", "minimo")
    assert "recent_events" in res
    assert "event_boost" in res
    # ormuz base 55 → risk >= 55
    assert res["risk_score"] >= 55


def test_compute_risk_score_unknown():
    assert "error" in compute_risk_score("nonexistent")


def test_compute_risk_score_bab_el_mandeb_critical():
    """Bab-el-Mandeb tiene score_base=70 + eventos sintéticos → alto/crítico."""
    res = compute_risk_score("bab_el_mandeb")
    assert res["risk_score"] >= 70
    assert res["level"] in ("alto", "critico")


def test_classify_level_thresholds():
    assert _classify_level(85) == "critico"
    assert _classify_level(65) == "alto"
    assert _classify_level(45) == "medio"
    assert _classify_level(25) == "bajo"
    assert _classify_level(10) == "minimo"


def test_all_chokepoints_risk_returns_sorted_desc():
    res = all_chokepoints_risk(days=15)
    assert res["n_items"] == 6
    scores = [it["risk_score"] for it in res["items"]]
    assert scores == sorted(scores, reverse=True)
    assert res["global_max_risk"] == scores[0]


def test_list_chokepoints():
    items = list_chokepoints()
    assert len(items) == 6


def test_get_chokepoint_known():
    assert get_chokepoint("suez")["name"] == "Canal de Suez"
    assert get_chokepoint("SUEZ")["slug"] == "suez"
    assert get_chokepoint("nonexistent") is None
