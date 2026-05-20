"""Brain tools sector Turismo · Sprint 15 · S15.5.

> **Sprint 15 · S15.5** (`docs/ROADMAP_GITS_AMIGOS.md §15 Sprint 15 · Turismo`)

Expone al Brain:
  - INE Turismo · FRONTUR / ETR / EGATUR via TEMPUS3
  - Eurostat tourism · series harmonizadas UE
  - AENA tráfico pax + cruceros (estáticos consolidados)
  - tourism_destinations tracker (saturación + ZMT + regulación VT)

Tools:
  - ine_turismo_serie(indicator, last_n)
  - eurostat_tourism(indicator, geo, last_n)
  - aena_top_airports(top_n)
  - aena_airport(slug)
  - cruise_ports()
  - tourism_destination(slug)
  - list_tourism_destinations(ccaa, kind, presion_min)
  - tourism_pressure_alerts()
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# INE Turismo
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("ine_turismo_serie")
def ine_turismo_serie(indicator: str = "llegadas_internacional", last_n: int = 24) -> dict[str, Any]:
    """Serie INE turismo · FRONTUR / ETR / EGATUR.

    Args:
      indicator: 'llegadas_internacional', 'pernoctaciones_hotelero',
                 'gasto_turistico', 'gasto_medio_diario',
                 'ocupacion_plazas_pct', 'viajeros_residentes'.
      last_n: últimos N periodos.
    """
    try:
        from etl.sources.tourism.ine_turismo import get_ine_turismo_client
        return get_ine_turismo_client().get_indicador(indicator, last_n=last_n)
    except Exception as exc:
        return {"indicator": indicator, "data": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Eurostat tourism
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("eurostat_tourism")
def eurostat_tourism(
    indicator: str = "noches_total",
    geo: str = "ES",
    last_n: int = 24,
) -> dict[str, Any]:
    """Indicador Eurostat tourism.

    Indicadores: 'noches_total', 'llegadas_alojamientos',
                 'capacidad_alojamientos', 'viajes_motivo'.
    """
    try:
        from etl.sources.tourism.eurostat_tourism import get_eurostat_tourism_client
        return get_eurostat_tourism_client().get_indicator(indicator, geo=geo, last_n=last_n)
    except Exception as exc:
        return {"indicator": indicator, "data": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# AENA + cruceros
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("aena_top_airports")
def aena_top_airports(top_n: int = 10) -> dict[str, Any]:
    """Top aeropuertos ES por tráfico de pasajeros 2024."""
    try:
        from etl.sources.tourism.aena_puertos import list_aena_traffic
        items = list_aena_traffic(top_n=top_n)
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("aena_airport")
def aena_airport(slug: str) -> dict[str, Any]:
    """Detalle aeropuerto AENA (madrid_barajas, barcelona_prat, palma_mallorca, etc.)."""
    try:
        from etl.sources.tourism.aena_puertos import get_aena_airport
        item = get_aena_airport(slug)
        if item is None:
            return {"error": f"aeropuerto '{slug}' no encontrado", "slug": slug}
        return {**item, "error": None}
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("cruise_ports")
def cruise_ports() -> dict[str, Any]:
    """Top puertos de crucero ES 2024 (Barcelona, Palma, Tenerife, Málaga, Las Palmas)."""
    try:
        from etl.sources.tourism.aena_puertos import list_cruise_ports
        items = list_cruise_ports()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# tourism_destinations · tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("tourism_destination")
def tourism_destination(slug: str) -> dict[str, Any]:
    """Detalle de un destino turístico.

    Slugs en seed: barcelona_ciudad, palma_mallorca, madrid_capital,
    ibiza, tenerife_sur, san_sebastian, sevilla_capital, valencia_capital,
    malaga_capital, granada_capital, girona_capital, santander_capital,
    lanzarote_isla, menorca_isla.
    """
    try:
        from etl.sources.tourism.destinations_service import get_destination
        row = get_destination(slug)
        if row is None:
            return {"error": f"Destino '{slug}' no encontrado", "slug": slug}
        # Métrica derivada: ratio visitantes / población (intensidad)
        v = row.get("visitors_2024_k") or 0
        p = row.get("population") or 0
        row["ratio_visitantes_residentes"] = (
            round(v * 1000 / p, 1) if p > 0 else None
        )
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_tourism_destinations")
def list_tourism_destinations(
    ccaa: str | None = None,
    kind: str | None = None,
    presion_min: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista destinos turísticos con filtros.

    Args:
      ccaa: ILIKE match.
      kind: 'urbano' | 'costa' | 'rural' | 'cultural' | 'mixto' | 'isla'.
      presion_min: 'bajo' | 'medio' | 'alto' | 'critico' (umbral inclusivo).
    """
    try:
        from etl.sources.tourism.destinations_service import list_destinations
        rows = list_destinations(
            ccaa=ccaa, kind=kind, presion_min=presion_min, limit=limit,
        )
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {"ccaa": ccaa, "kind": kind, "presion_min": presion_min},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("tourism_pressure_alerts")
def tourism_pressure_alerts() -> dict[str, Any]:
    """Destinos en presión alto/crítico · panel alertas saturación.

    Caso de uso: monitor para gabinete municipal/autonómico cara a
    decisiones de moratoria VT + tasa turística.
    """
    try:
        from etl.sources.tourism.destinations_service import pressure_alerts
        rows = pressure_alerts()
        return {
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


__all__ = [
    "ine_turismo_serie",
    "eurostat_tourism",
    "aena_top_airports",
    "aena_airport",
    "cruise_ports",
    "tourism_destination",
    "list_tourism_destinations",
    "tourism_pressure_alerts",
]
