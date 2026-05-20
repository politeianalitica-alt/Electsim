"""Tests para etl.sources.commodities.rule_templates.

Verifica:
  - list_templates() devuelve los 5 templates iniciales
  - apply_template('contango_basic', ...) produce rule_definition válido
  - apply_template falla con mensaje claro si faltan slots
  - apply_template falla si params fuera de rango
  - Todos los templates pasan validate_rule del rule_engine
  - Los builders generan estructuras AND/OR coherentes
"""
from __future__ import annotations

import pytest

from etl.sources.commodities.rule_templates import (
    TEMPLATES,
    apply_template,
    get_template,
    list_templates,
)
from etl.sources.commodities.rule_engine import validate_rule


# ─────────────────────────────────────────────────────────────────
# Catálogo / metadata
# ─────────────────────────────────────────────────────────────────

def test_list_templates_returns_initial_set():
    items = list_templates()
    ids = {t["id"] for t in items}
    # Los 5 templates documentados deben existir
    assert {
        "contango_basic",
        "rsi_extremes",
        "correlation_break",
        "weekly_volatility",
        "pair_spread",
    }.issubset(ids)


def test_each_template_has_required_metadata():
    for t in list_templates():
        assert t["id"]
        assert t["name"]
        assert t["description"]
        assert isinstance(t["slots"], list)
        assert isinstance(t["params"], list)
        # Cada param tiene rangos numéricos consistentes
        for p in t["params"]:
            assert p["min"] <= p["default"] <= p["max"]


def test_get_template_unknown_returns_none():
    assert get_template("does_not_exist") is None


# ─────────────────────────────────────────────────────────────────
# apply_template · happy paths
# ─────────────────────────────────────────────────────────────────

def test_apply_contango_basic_produces_valid_rule():
    res = apply_template(
        "contango_basic",
        slots={"front": "wheat_cbot", "back": "wheat_milling_euronext"},
        params={"margin_pct": 4.0, "period_days": 5},
    )
    assert res["ok"] is True
    rd = res["rule_definition"]
    assert rd["logic"] == "AND"
    assert len(rd["conditions"]) == 2
    assert rd["conditions"][0]["slug"] == "wheat_cbot"
    assert rd["conditions"][0]["op"] == "change_pct_gte"
    assert rd["conditions"][0]["value"] == 4.0
    assert rd["conditions"][0]["period_days"] == 5
    # Sanity check con el validator real
    validate_rule(rd)


def test_apply_rsi_extremes_uses_or_logic():
    res = apply_template(
        "rsi_extremes",
        slots={"primary": "crude_brent"},
        params={"upper": 75, "lower": 25},
    )
    assert res["ok"] is True
    rd = res["rule_definition"]
    assert rd["logic"] == "OR"
    ops = sorted(c["op"] for c in rd["conditions"])
    assert ops == ["rsi_gt", "rsi_lt"]


def test_apply_correlation_break_signs_correct():
    """El follower debe tener value negativo (caída)."""
    res = apply_template(
        "correlation_break",
        slots={"leader": "wheat_cbot", "follower": "corn_cbot"},
        params={"up_pct": 5, "down_pct": 3, "period_days": 7},
    )
    assert res["ok"] is True
    rd = res["rule_definition"]
    follower_cond = next(c for c in rd["conditions"] if c["slug"] == "corn_cbot")
    assert follower_cond["op"] == "change_pct_lte"
    assert follower_cond["value"] < 0  # caída → valor negativo


def test_apply_weekly_volatility_or_logic():
    res = apply_template(
        "weekly_volatility",
        slots={"primary": "sugar_ny"},
        params={"threshold_pct": 6},
    )
    assert res["ok"] is True
    assert res["rule_definition"]["logic"] == "OR"
    values = [c["value"] for c in res["rule_definition"]["conditions"]]
    # Uno positivo (sube) y otro negativo (baja) con misma magnitud
    assert sorted(values) == [-6.0, 6.0]


def test_apply_pair_spread_uses_and_logic():
    res = apply_template(
        "pair_spread",
        slots={"a": "soybean_oil_cbot", "b": "palm_oil_klu"},
        params={"a_up_pct": 4, "b_down_pct": 3},
    )
    assert res["ok"] is True
    assert res["rule_definition"]["logic"] == "AND"


# ─────────────────────────────────────────────────────────────────
# apply_template · error paths
# ─────────────────────────────────────────────────────────────────

def test_apply_unknown_template_returns_error():
    res = apply_template("nope", slots={}, params={})
    assert res["ok"] is False
    assert "no existe" in res["error"]


def test_apply_missing_slot_returns_error():
    res = apply_template(
        "contango_basic",
        slots={"front": "wheat_cbot"},  # falta 'back'
        params={},
    )
    assert res["ok"] is False
    assert "back" in res["error"]


def test_apply_param_out_of_range_returns_error():
    res = apply_template(
        "rsi_extremes",
        slots={"primary": "crude_brent"},
        params={"upper": 999, "lower": 30},  # 999 > max 90
    )
    assert res["ok"] is False
    assert "upper" in res["error"]
    assert "rango" in res["error"]


def test_apply_default_params_when_not_provided():
    res = apply_template(
        "weekly_volatility",
        slots={"primary": "olive_oil_es"},
        params=None,
    )
    assert res["ok"] is True


# ─────────────────────────────────────────────────────────────────
# Todos los templates · smoke
# ─────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("tid", list(TEMPLATES.keys()))
def test_every_template_builds_with_defaults_and_validates(tid: str):
    """Cada template con slots dummy y params=defaults debe producir rule válido."""
    tmpl = TEMPLATES[tid]
    slots = {s.key: f"slug_{s.key}" for s in tmpl.slots}
    res = apply_template(tid, slots=slots, params=None)
    assert res["ok"] is True, f"template {tid}: {res.get('error')}"
    validate_rule(res["rule_definition"])
    # rule_name no vacío
    assert res["rule_name"]
