"""Brain tools sector Inmobiliario · Sprint 13 · S13.5.

> **Sprint 13 · S13.5** (`docs/ROADMAP_GITS_AMIGOS.md §13 Sprint 13 · Inmobiliario`)

Expone al Brain:
  - Catastro OVC · consulta inmuebles por RC, coordenadas o dirección
  - Registradores · serie nacional compraventas + hipotecas
  - INE vivienda · IPV (general/usada/nueva)
  - housing_markets tracker (ZMT + tensión)

Tools:
  - catastro_consulta_rc(referencia_catastral)
  - catastro_consulta_coordenadas(lat, lon)
  - registradores_compraventas(start, end)
  - registradores_hipotecas(start, end)
  - registradores_ultimo_resumen()
  - ine_vivienda_serie(serie='general'|'usada'|'nueva', last_n)
  - housing_market(slug)
  - list_housing_markets(ccaa, scope, zmt_only)
  - housing_tension_alerts(min_yoy_alquiler_pct, min_esfuerzo_pct)
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# Catastro
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("catastro_consulta_rc")
def catastro_consulta_rc(referencia_catastral: str) -> dict[str, Any]:
    """Consulta inmueble en Sede Electrónica del Catastro por Referencia Catastral.

    Args:
      referencia_catastral: RC de 14 o 20 caracteres.
    """
    try:
        from etl.sources.housing.catastro import get_catastro_client
        return get_catastro_client().consulta_rc(referencia_catastral)
    except Exception as exc:
        return {"error": str(exc), "rc": referencia_catastral}


@ToolRegistry.register("catastro_consulta_coordenadas")
def catastro_consulta_coordenadas(lat: float, lon: float) -> dict[str, Any]:
    """Localiza inmueble en Catastro por coordenadas (lat, lon EPSG:4326)."""
    try:
        from etl.sources.housing.catastro import get_catastro_client
        return get_catastro_client().consulta_coordenadas(lat, lon)
    except Exception as exc:
        return {"error": str(exc), "lat": lat, "lon": lon}


# ────────────────────────────────────────────────────────────────────
# Registradores
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("registradores_compraventas")
def registradores_compraventas(
    start: str | None = None,
    end: str | None = None,
) -> dict[str, Any]:
    """Serie trimestral nacional de compraventas de vivienda (Registradores).

    Args:
      start / end: 'YYYYQn' inclusivos (ej. '2024Q1', '2025Q4').
    """
    try:
        from etl.sources.housing.registradores import serie_compraventas
        return serie_compraventas(start=start, end=end)
    except Exception as exc:
        return {"data": [], "error": str(exc)}


@ToolRegistry.register("registradores_hipotecas")
def registradores_hipotecas(
    start: str | None = None,
    end: str | None = None,
) -> dict[str, Any]:
    """Serie trimestral nacional de hipotecas constituidas sobre vivienda."""
    try:
        from etl.sources.housing.registradores import serie_hipotecas
        return serie_hipotecas(start=start, end=end)
    except Exception as exc:
        return {"data": [], "error": str(exc)}


@ToolRegistry.register("registradores_ultimo_resumen")
def registradores_ultimo_resumen() -> dict[str, Any]:
    """Resumen último trimestre con variación interanual."""
    try:
        from etl.sources.housing.registradores import resumen_ultimo_trimestre
        return resumen_ultimo_trimestre()
    except Exception as exc:
        return {"error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# INE vivienda
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("ine_vivienda_serie")
def ine_vivienda_serie(serie: str = "general", last_n: int = 20) -> dict[str, Any]:
    """Serie IPV (Índice Precio Vivienda) INE.

    Args:
      serie: 'general' | 'usada' | 'nueva'.
      last_n: últimos N trimestres.
    """
    try:
        from etl.sources.housing.ine_vivienda import get_ine_vivienda_client, IPV_SERIES
        if serie not in IPV_SERIES:
            return {
                "serie": serie, "data": [],
                "error": f"serie '{serie}' no válida · usa {sorted(IPV_SERIES)}",
            }
        client = get_ine_vivienda_client()
        return client.get_serie(IPV_SERIES[serie]["code"], last_n=last_n)
    except Exception as exc:
        return {"serie": serie, "data": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# housing_markets · tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("housing_market")
def housing_market(slug: str) -> dict[str, Any]:
    """Detalle de un mercado de vivienda.

    Slugs en seed: madrid_centro, madrid_salamanca, barcelona_eixample,
    barcelona_ciutat_vella, palma_mallorca, ibiza_ciudad, malaga_capital,
    valencia_capital, san_sebastian, bilbao_capital, sevilla_capital,
    zaragoza_capital, girona_capital, santander_capital.
    """
    try:
        from etl.sources.housing.markets_service import get_market
        row = get_market(slug)
        if row is None:
            return {"error": f"Mercado '{slug}' no encontrado", "slug": slug}
        v = row.get("fecha_declaracion_zmt")
        if v is not None and hasattr(v, "isoformat"):
            row["fecha_declaracion_zmt"] = v.isoformat()
        # Ratio precio venta vs alquiler anual (proxy PER inmobiliario)
        p_v = row.get("precio_m2_venta_eur")
        p_a = row.get("precio_alquiler_eur_mes")
        if p_v and p_a and p_a > 0:
            # asumiendo 100 m² medios
            row["per_aprox"] = round((p_v * 100) / (p_a * 12), 1)
        else:
            row["per_aprox"] = None
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_housing_markets")
def list_housing_markets(
    ccaa: str | None = None,
    scope: str | None = None,
    zmt_only: bool = False,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista mercados de vivienda con filtros.

    Args:
      ccaa: ILIKE sobre nombre CCAA (ej. 'Madrid', 'Cataluña').
      scope: 'distrito', 'municipio', 'comarca', 'provincia', 'ccaa'.
      zmt_only: True → solo declarados ZMT.
    """
    try:
        from etl.sources.housing.markets_service import list_markets
        rows = list_markets(ccaa=ccaa, scope=scope, zmt_only=zmt_only, limit=limit)
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {"ccaa": ccaa, "scope": scope, "zmt_only": zmt_only},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("housing_tension_alerts")
def housing_tension_alerts(
    min_yoy_alquiler_pct: float = 8.0,
    min_esfuerzo_pct: float = 35.0,
) -> dict[str, Any]:
    """Mercados con tensión alta (alquiler ≥ X% YoY + esfuerzo ≥ Y%).

    Caso de uso: alertas tempranas para administraciones / gabinete vivienda.
    """
    try:
        from etl.sources.housing.markets_service import tension_alerts
        rows = tension_alerts(
            min_yoy_alquiler_pct=min_yoy_alquiler_pct,
            min_esfuerzo_pct=min_esfuerzo_pct,
        )
        return {
            "min_yoy_alquiler_pct": min_yoy_alquiler_pct,
            "min_esfuerzo_pct": min_esfuerzo_pct,
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {
            "n_items": 0, "items": [], "error": str(exc),
        }


__all__ = [
    "catastro_consulta_rc",
    "catastro_consulta_coordenadas",
    "registradores_compraventas",
    "registradores_hipotecas",
    "registradores_ultimo_resumen",
    "ine_vivienda_serie",
    "housing_market",
    "list_housing_markets",
    "housing_tension_alerts",
]
