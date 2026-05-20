"""Brain tools Agro · Sprint 14 · S14.6.

> **Sprint 14 · S14.6** (`docs/ROADMAP_GITS_AMIGOS.md §14 Sprint 14 · Agro`)

Expone al Brain:
  - FEGA · datos abiertos PAC España (beneficiarios + agregaciones)
  - EU CAP · indicadores Eurostat agricultura
  - MAPA · notas oficiales + ENESA Plan Anual
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


@ToolRegistry.register("fega_descargar_csv")
def fega_descargar_csv(url: str, top_n: int = 20) -> dict[str, Any]:
    """Descarga CSV FEGA + agrega beneficiarios.

    Args:
      url: URL del CSV anual de beneficiarios (datos abiertos FEGA).
      top_n: tamaño ranking.
    """
    try:
        from etl.sources.agro.fega import get_fega_client
        client = get_fega_client()
        rows = client.fetch_csv(url)
        if not rows:
            return {"n_rows": 0, "top": [], "error": "sin filas o error de red"}
        return client.aggregate_top_beneficiarios(rows, top_n=top_n)
    except Exception as exc:
        return {"n_rows": 0, "top": [], "error": str(exc)}


@ToolRegistry.register("eu_cap_indicator")
def eu_cap_indicator(
    indicator: str,
    geo: str = "ES",
    last_n_years: int = 10,
) -> dict[str, Any]:
    """Indicador Eurostat de Política Agraria Común (PAC).

    Indicadores predefinidos:
      - agricultural_income · renta agraria
      - agricultural_output · producción rama agraria
      - farm_structure · estructura explotaciones
      - land_use · superficie cultivada
      - agricultural_prices · índice precios productos agrarios

    También acepta código Eurostat directo (ej. 'apri_pi15_outm').
    """
    try:
        from etl.sources.agro.eu_cap import get_eu_cap_client
        return get_eu_cap_client().get_indicator(
            indicator, geo=geo, last_n_years=last_n_years,
        )
    except Exception as exc:
        return {"indicator": indicator, "data": [], "error": str(exc)}


@ToolRegistry.register("mapa_news")
def mapa_news(limit: int = 25) -> dict[str, Any]:
    """Últimas notas MAPA (Ministerio Agricultura) vía RSS."""
    try:
        from etl.sources.agro.mapa_enesa import get_mapa_enesa_client
        client = get_mapa_enesa_client()
        items = client.fetch_mapa_news()[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("enesa_plan")
def enesa_plan(year: int = 2024) -> dict[str, Any]:
    """Plan ENESA · Seguros Agrarios Combinados (anual)."""
    try:
        from etl.sources.agro.mapa_enesa import get_mapa_enesa_client
        return get_mapa_enesa_client().get_enesa_plan(year=year)
    except Exception as exc:
        return {"year": year, "error": str(exc)}


__all__ = [
    "fega_descargar_csv",
    "eu_cap_indicator",
    "mapa_news",
    "enesa_plan",
]
