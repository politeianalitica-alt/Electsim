"""Tests del módulo Sectorial Intel · taxonomía + builder + router.

Cubre los 9 sectores y verifica que la API devuelve estructuras
compatibles con `apps/visual-oscar/types/sectores.ts`.
"""
from __future__ import annotations

import pytest


# ─── Taxonomía ───────────────────────────────────────────────────────

def test_taxonomia_tiene_9_sectores():
    from agents.brain.pipelines.data_sources.sector_taxonomy import (
        SECTOR_TAXONOMY, list_sector_ids,
    )
    ids = list_sector_ids()
    assert len(ids) == 9, f"Esperados 9 sectores, obtenidos {len(ids)}: {ids}"
    expected = {
        "agro", "banca", "defensa", "energia", "farma",
        "infraestructuras", "telecom", "turismo", "vivienda",
    }
    assert set(ids) == expected
    # Todos deben tener los campos requeridos
    for sid in ids:
        sec = SECTOR_TAXONOMY[sid]
        assert sec["id"] == sid
        assert sec["name"]
        assert sec["keywords"], f"{sid} sin keywords"
        assert sec["risk_dominio"]
        assert sec["color_primary"]
        assert sec["ministry"]


def test_match_text_to_sectors():
    from agents.brain.pipelines.data_sources.sector_taxonomy import match_text_to_sectors
    # Texto inequívoco → energia
    assert "energia" in match_text_to_sectors("subasta de renovables 2026 Iberdrola")
    # Vivienda + banca (hipoteca toca ambos en banca)
    matched = match_text_to_sectors("Ley de vivienda y subrogación de hipoteca")
    assert "vivienda" in matched
    # Texto sin keywords → vacío
    assert match_text_to_sectors("foo bar baz") == []


def test_get_sector_y_keywords():
    from agents.brain.pipelines.data_sources.sector_taxonomy import (
        get_sector, sector_keywords, sector_cpv_prefixes,
    )
    sec = get_sector("defensa")
    assert sec is not None
    assert sec["name_short"] == "Defensa"
    assert "otan" in sector_keywords("defensa")
    assert "35000000" in sector_cpv_prefixes("defensa")  # CPV defensa
    assert get_sector("inexistente") is None


# ─── Builder ─────────────────────────────────────────────────────────

def test_build_sector_report_estructura():
    from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
    report = build_sector_report("vivienda")
    # Campos obligatorios del SectorReport
    for key in (
        "sector_id", "generado_en", "score", "kpis",
        "actores", "eventos_recientes", "iniciativas_legislativas_ids",
        "alertas",
    ):
        assert key in report, f"falta {key}"
    # Score con campos requeridos
    assert "score_riesgo" in report["score"]
    assert "score_actividad_legislativa" in report["score"]
    assert "score_volatilidad" in report["score"]
    assert report["score"]["nivel"] in {"critico", "alto", "medio", "bajo"}
    assert report["score"]["tendencia"] in {"subida", "bajada", "estable", "sin_datos"}


def test_build_sector_report_sector_invalido():
    from agents.brain.pipelines.sectorial_intel_builder import build_sector_report
    with pytest.raises(ValueError):
        build_sector_report("sector_que_no_existe")


def test_build_signals_devuelve_lista_tipada():
    from agents.brain.pipelines.sectorial_intel_builder import build_signals_for_sector
    signals = build_signals_for_sector("agro", days=7, limit=5)
    assert isinstance(signals, list)
    for s in signals[:5]:
        assert "id" in s
        assert "dominio" in s
        assert "titulo" in s
        assert "score" in s
        assert 0 <= int(s["score"]) <= 100
        assert s["nivel"] in {"critico", "alto", "medio", "bajo"}


def test_build_sectores_index_cubre_todos_los_sectores():
    from agents.brain.pipelines.sectorial_intel_builder import build_sectores_index
    from agents.brain.pipelines.data_sources.sector_taxonomy import list_sector_ids
    idx = build_sectores_index()
    assert "sectores" in idx
    assert "generado_en" in idx
    sids_devueltos = {s["id"] for s in idx["sectores"]}
    assert sids_devueltos == set(list_sector_ids())
    for s in idx["sectores"]:
        assert "score" in s
        assert isinstance(s["alertas_count"], int)


# ─── Router (smoke) ──────────────────────────────────────────────────

def test_router_paths_registrados():
    """El router debe exponer las rutas que el proxy Next.js espera."""
    from api.routers import sectores
    routes = {r.path for r in sectores.router.routes}
    expected_paths = {
        "/api/v1/sectores/index",
        "/api/v1/sectores/{sector_id}",
        "/api/v1/sectores/{sector_id}/kpis",
        "/api/v1/sectores/{sector_id}/actores",
        "/api/v1/sectores/{sector_id}/eventos",
        "/api/v1/sectores/{sector_id}/signals",
        "/api/v1/sectores/taxonomy/list",
        "/api/v1/sectores/taxonomy/{sector_id}",
        "/api/v1/sectores/match/text",
    }
    missing = expected_paths - routes
    assert not missing, f"rutas faltantes: {missing}"
