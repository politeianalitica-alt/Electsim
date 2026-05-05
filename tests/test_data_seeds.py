from __future__ import annotations

import pytest

from data_seeds import (
    ACTORS,
    ECONOMIC_SERIES,
    HISTORICAL_NARRATIVES,
    KEY_EVENTS,
    LEGISLATIVE_INITIATIVES,
    PARTIES,
    SOCIAL_INDICATORS,
    get_all_seeds,
)


def test_actors_count() -> None:
    assert len(ACTORS) >= 40


def test_actors_required_fields() -> None:
    required = {"id", "name", "party", "current_role"}
    for actor in ACTORS:
        assert required.issubset(actor.keys()), f"missing fields in {actor.get('id')}"


def test_parties_count() -> None:
    assert len(PARTIES) == 12


def test_parties_required_fields() -> None:
    for party in PARTIES:
        assert "color" in party
        assert "ideology" in party
        assert "founded_year" in party
        assert isinstance(party["ideology"], list) and len(party["ideology"]) > 0


def test_narratives_count() -> None:
    assert len(HISTORICAL_NARRATIVES) == 30


def test_narratives_required_fields() -> None:
    valid_lifecycle = {"emergence", "peak", "decline", "dormant", "reactivated"}
    for n in HISTORICAL_NARRATIVES:
        assert "frame_label" in n
        assert "lifecycle" in n
        assert n["lifecycle"] in valid_lifecycle


def test_legislative_count() -> None:
    assert len(LEGISLATIVE_INITIATIVES) >= 50


def test_economic_keys() -> None:
    expected = {
        "ipc",
        "ipc_subyacente",
        "paro_rate",
        "paro_juvenil",
        "salario_medio",
        "indice_consumo_minorista",
        "indice_produccion_industrial",
        "gdp_growth_yoy",
        "gdp_growth_qoq",
        "deuda_publica_pib",
        "deficit_publico",
        "balanza_comercial",
        "prima_riesgo",
        "ibex35_close",
        "mortgage_rate_avg",
        "energy_prices_index",
        "vivienda_precio_m2",
        "alquiler_precio_m2",
        "llegadas_turistas",
        "gasto_turistico_mm",
    }
    assert set(ECONOMIC_SERIES.keys()) == expected


def test_economic_series_length() -> None:
    for key, series in ECONOMIC_SERIES.items():
        assert len(series) == 96, f"{key} has {len(series)} points, expected 96"


def test_ipc_reasonable_range() -> None:
    for entry in ECONOMIC_SERIES["ipc"]:
        assert -2.5 <= entry["value"] <= 12.0, f"IPC out of range: {entry}"


def test_social_has_approval_government() -> None:
    assert "approval_government" in SOCIAL_INDICATORS
    assert len(SOCIAL_INDICATORS["approval_government"]) == 96


def test_key_events_count() -> None:
    assert len(KEY_EVENTS) >= 60


def test_key_events_sorted_by_date() -> None:
    dates = [e["date"] for e in KEY_EVENTS]
    assert dates == sorted(dates)


def test_get_all_seeds_keys() -> None:
    seeds = get_all_seeds()
    assert set(seeds.keys()) == {
        "actors",
        "parties",
        "narratives",
        "legislative",
        "economic",
        "social",
        "events",
    }


def test_no_duplicate_actor_ids() -> None:
    ids = [a["id"] for a in ACTORS]
    assert len(ids) == len(set(ids)), "duplicated actor ids"


def test_no_duplicate_party_ids() -> None:
    ids = [p["id"] for p in PARTIES]
    assert len(ids) == len(set(ids)), "duplicated party ids"


def test_actor_party_matches_existing_party() -> None:
    party_ids = {p["id"] for p in PARTIES}
    for actor in ACTORS:
        assert actor["party"] in party_ids, f"{actor['id']} -> unknown party {actor['party']}"


def test_actor_allies_rivals_refer_to_existing_actors() -> None:
    actor_ids = {a["id"] for a in ACTORS}
    for actor in ACTORS:
        for ally in actor.get("allies", []):
            base = ally.split(" ")[0]
            if "(" in base or base == "":
                continue
            if base not in actor_ids:
                # allow free-form historical references; only enforce when no parenthetical context
                if "(" not in ally:
                    pytest.fail(f"{actor['id']} ally {ally} not in actor list")
        for rival in actor.get("rivals", []):
            base = rival.split(" ")[0]
            if "(" in rival:
                continue
            if base not in actor_ids:
                pytest.fail(f"{actor['id']} rival {rival} not in actor list")


def test_narrative_related_narratives_valid() -> None:
    narrative_ids = {n["id"] for n in HISTORICAL_NARRATIVES}
    for n in HISTORICAL_NARRATIVES:
        for related in n.get("related_narratives", []):
            assert related in narrative_ids, f"{n['id']} -> unknown narrative {related}"


def test_economic_series_values_are_floats() -> None:
    for key, series in ECONOMIC_SERIES.items():
        for entry in series:
            assert isinstance(entry["value"], float), f"{key} non-float value: {entry}"
