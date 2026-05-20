"""Tools de compliance para el Brain · Sprint 4 · S4.6.

> **Sprint 4 · S4.6** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 4`)

Politeia ya tiene el endpoint `/api/v1/compliance/screen` (Sprint 4 · S4.5).
Lo que faltaba: exponer las capacidades de compliance al Brain como tools
registradas, para que el copiloto pueda invocarlas en conversación.

Tools nuevas:
  - compliance_screen(name, country, schema)       · screening end-to-end
  - opensanctions_search(query, dataset)            · busqueda directa OS
  - party_position(slug, year)                       · ideología de partido
  - party_distance(p1, p2)                           · cercanía ideológica
  - search_laws_semantic(query, jurisdiction, rank)  · búsqueda corpus legal
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# Compliance screening · pipeline completo
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("compliance_screen")
def compliance_screen(
    name: str,
    country: str = "ES",
    schema_kind: str = "Person",
    threshold: float = 0.6,
) -> dict[str, Any]:
    """Screening de cumplimiento end-to-end · OpenSanctions + BDNS + entities.

    Combina 3 fuentes en una sola llamada:
      - Sanciones internacionales (OFAC, UE, ONU, FATF) via OpenSanctions
      - PEP (Politically Exposed Persons)
      - Subvenciones públicas recibidas (BDNS · si beneficiario)
      - Vínculos con actores políticos (entities ontology Politeia)

    Args:
      name: nombre canonico
      country: ISO alpha-2 (ES, FR, DE...)
      schema_kind: 'Person', 'Company', 'Organization', 'LegalEntity'
      threshold: score mínimo OpenSanctions (0-1)

    Returns:
      {
        "risk_score": 0-100,
        "risk_level": "HIGH" | "MEDIUM" | "LOW" | "CLEAR",
        "sources": [...],
        "summary": {...},
        "partial": bool,
      }
    """
    try:
        from api.routers.compliance import screen_entity, ComplianceScreenRequest
    except ImportError as exc:
        return {"error": str(exc), "risk_score": 0, "risk_level": "CLEAR"}

    try:
        req = ComplianceScreenRequest(
            name=name,
            country=country,
            schema_kind=schema_kind,
            threshold=threshold,
        )
        response = screen_entity(req)
        return response.model_dump()
    except Exception as exc:
        return {"error": str(exc), "risk_score": 0, "risk_level": "CLEAR"}


# ────────────────────────────────────────────────────────────────────
# OpenSanctions · búsqueda directa
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("opensanctions_search")
def opensanctions_search(
    query: str,
    dataset: str = "default",
    limit: int = 5,
    countries: list[str] | None = None,
) -> dict[str, Any]:
    """Búsqueda directa en OpenSanctions (250+ listas + PEP).

    Args:
      query: nombre o texto a buscar
      dataset: 'default' (todo) | 'sanctions' | 'peps'
      limit: max resultados
      countries: filtro países ISO alpha-2 (ej ['es', 'fr'])

    Returns:
      Lista de entidades con score · vacía si endpoint no disponible.
    """
    try:
        from etl.sources.osint.opensanctions_client import get_opensanctions_client
        client = get_opensanctions_client()
        result = client.search(
            query=query,
            dataset=dataset,
            limit=limit,
            countries=countries,
        )
        return {
            "query": query,
            "dataset": dataset,
            "n_results": len(result.get("results", [])),
            "total": result.get("total", 0),
            "results": result.get("results", []),
            "error": result.get("error"),
        }
    except Exception as exc:
        return {"error": str(exc), "query": query, "n_results": 0, "results": []}


# ────────────────────────────────────────────────────────────────────
# Party positions (Manifesto Project)
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("party_position")
def party_position(
    party_slug: str,
    country: str = "ESP",
    year: int | None = None,
) -> dict[str, Any]:
    """Posición ideológica de un partido en los ejes Manifesto Project.

    Args:
      party_slug: 'psoe', 'pp', 'vox', 'sumar', 'podemos', 'junts', 'erc', 'pnv', etc.
      country: ISO alpha-3 (ESP default)
      year: año de la elección, None=más reciente

    Returns:
      Dict con rile, planeco, markeco, welfare, eu_pos, eu_neg, environment,
      traditional_morality, law_order. O {error: ...} si no existe.
    """
    try:
        from etl.sources.spain.party_positions import get_party_position
        result = get_party_position(party_slug, country=country, year=year)
        if result is None:
            return {"error": f"Partido '{party_slug}' no encontrado", "party_slug": party_slug}
        return result
    except Exception as exc:
        return {"error": str(exc), "party_slug": party_slug}


@ToolRegistry.register("party_distance")
def party_distance(
    party1: str,
    party2: str,
    country: str = "ESP",
    year: int | None = None,
) -> dict[str, Any]:
    """Distancia ideológica euclídea normalizada entre dos partidos.

    Args:
      party1 / party2: slugs (ej 'psoe', 'pp', 'vox')
      country: ISO alpha-3
      year: año

    Returns:
      {"party1": ..., "party2": ..., "distance": float, "interpretation": str}
      distance = 0: posiciones idénticas
      distance > 0: cuanto mayor, más alejados ideológicamente
    """
    try:
        from etl.sources.spain.party_positions import get_party_distance
        dist = get_party_distance(party1, party2, country=country, year=year)
        if dist is None:
            return {
                "error": f"Distancia no calculable · uno de los partidos no existe",
                "party1": party1, "party2": party2,
            }
        # Interpretación cualitativa
        if dist < 5:
            interp = "Muy cercanos"
        elif dist < 15:
            interp = "Cercanos"
        elif dist < 30:
            interp = "Distantes"
        else:
            interp = "Polos opuestos"
        return {
            "party1": party1,
            "party2": party2,
            "distance": dist,
            "interpretation": interp,
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "party1": party1, "party2": party2}


# ────────────────────────────────────────────────────────────────────
# Búsqueda semántica en corpus legal
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("search_laws_semantic")
def search_laws_semantic(
    query: str,
    jurisdiction: str | None = None,
    rank: str | None = None,
    n_results: int = 5,
) -> dict[str, Any]:
    """Búsqueda semántica en corpus legalize-es (todo el derecho ES indexado).

    Args:
      query: texto libre (ej. 'derecho de huelga', 'protección de datos')
      jurisdiction: 'es', 'es-cm', 'es-an', 'es-ca' (Cataluña)... None=todas
      rank: 'ley', 'rdley', 'rdleg', 'decreto', 'orden'... None=todos
      n_results: max resultados

    Returns:
      Lista de leyes relevantes con snippet + score + URL al BOE.
    """
    try:
        from etl.sources.legislative.legalize_es_indexer import search_laws
        results = search_laws(
            query=query,
            n_results=n_results,
            jurisdiction=jurisdiction,
            rank=rank,
        )
        return {
            "query": query,
            "jurisdiction": jurisdiction or "todas",
            "rank": rank or "todos",
            "n_results": len(results),
            "laws": results,
            "error": None,
        }
    except Exception as exc:
        return {"error": str(exc), "query": query, "n_results": 0, "laws": []}


__all__ = [
    "compliance_screen",
    "opensanctions_search",
    "party_position",
    "party_distance",
    "search_laws_semantic",
]
