"""Brain tools sector Telecom · Sprint 12 · S12.5.

> **Sprint 12 · S12.5** (`docs/ROADMAP_GITS_AMIGOS.md §12 Sprint 12 · Telecom`)

Expone al Brain:
  - CNMC news (filtrado a telecom)
  - BEREC news (regulador UE)
  - Catálogo subastas espectro ES (700/3.5/26/1500/900-1800)
  - telecom_operators tracker

Tools:
  - cnmc_telecom_news(limit, only_telecom)
  - berec_news(limit)
  - spectrum_auctions_list(band, status, year)
  - spectrum_auction(slug)
  - operator_spectrum(operator_name)
  - telecom_operator(slug)
  - list_telecom_operators(kind, parent_group)
  - telecom_market_summary()
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# CNMC + BEREC
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("cnmc_telecom_news")
def cnmc_telecom_news(limit: int = 25, only_telecom: bool = True) -> dict[str, Any]:
    """Últimas notas CNMC filtradas a sector telecom."""
    try:
        from etl.sources.telecom.cnmc import get_cnmc_telecom_client
        client = get_cnmc_telecom_client()
        items = client.fetch_news()
        if only_telecom:
            items = client.filter_telecom(items)
        items = items[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"only_telecom": only_telecom, "n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("berec_news")
def berec_news(limit: int = 25) -> dict[str, Any]:
    """Últimas decisiones / news BEREC (regulador UE comunicaciones)."""
    try:
        from etl.sources.telecom.berec import get_berec_client
        client = get_berec_client()
        items = client.fetch_news()[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Espectro
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("spectrum_auctions_list")
def spectrum_auctions_list(
    band: str | None = None,
    status: str | None = None,
    year: int | None = None,
) -> dict[str, Any]:
    """Lista subastas de espectro ES con filtros."""
    try:
        from etl.sources.telecom.spectrum import list_spectrum_auctions
        items = list_spectrum_auctions(band=band, status=status, year=year)
        return {
            "n_items": len(items),
            "items": items,
            "filters": {"band": band, "status": status, "year": year},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("spectrum_auction")
def spectrum_auction(slug: str) -> dict[str, Any]:
    """Detalle de una subasta de espectro.

    Slugs: auction_700mhz_2020, auction_3_5ghz_2018, auction_26ghz_2022,
    auction_1500mhz_2021, auction_900_1800mhz_2024, auction_6ghz_2025_planned.
    """
    try:
        from etl.sources.telecom.spectrum import get_spectrum_auction
        item = get_spectrum_auction(slug)
        if item is None:
            return {"error": f"Subasta '{slug}' no encontrada", "slug": slug}
        return {**item, "error": None}
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("operator_spectrum")
def operator_spectrum(operator_name: str) -> dict[str, Any]:
    """Histórico de espectro adjudicado a un operador.

    Acepta nombre comercial: 'Movistar', 'Orange', 'Vodafone', 'MásMóvil'.
    """
    try:
        from etl.sources.telecom.spectrum import operator_spectrum_summary
        res = operator_spectrum_summary(operator_name)
        res["error"] = None
        return res
    except Exception as exc:
        return {"operator": operator_name, "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# telecom_operators · tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("telecom_operator")
def telecom_operator(slug: str) -> dict[str, Any]:
    """Detalle de un operador telecom.

    Slugs en seed: movistar, masorange, vodafone_es_zegona, digi_es,
    yoigo, o2_es, lowi, pepephone, simyo, avatel, adamo, cellnex.
    """
    try:
        from etl.sources.telecom.operators_service import get_operator
        row = get_operator(slug)
        if row is None:
            return {"error": f"Operador '{slug}' no encontrado", "slug": slug}
        # Total espectro MHz · suma simple para visión global
        total_mhz = 0.0
        for k in (
            "spectrum_900_1800", "spectrum_2100", "spectrum_2600",
            "spectrum_3500", "spectrum_700", "spectrum_26ghz",
        ):
            v = row.get(k)
            if v is not None:
                try:
                    total_mhz += float(v)
                except (TypeError, ValueError):
                    pass
        row["total_spectrum_mhz"] = round(total_mhz, 2) if total_mhz else None
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_telecom_operators")
def list_telecom_operators(
    kind: str | None = None,
    parent_group: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista operadores telecom con filtros.

    Args:
      kind: 'incumbente', 'mvno', 'omv', 'mayorista', 'tower', 'isp',
            'satelital', 'submarino'.
      parent_group: ILIKE match.
    """
    try:
        from etl.sources.telecom.operators_service import list_operators
        rows = list_operators(kind=kind, parent_group=parent_group, limit=limit)
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {"kind": kind, "parent_group": parent_group},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("telecom_market_summary")
def telecom_market_summary() -> dict[str, Any]:
    """Resumen mercado · top operadores por cuota móvil y fija."""
    try:
        from etl.sources.telecom.operators_service import market_share_summary
        return market_share_summary()
    except Exception as exc:
        return {"top_movil": [], "top_fijo": [], "error": str(exc)}


__all__ = [
    "cnmc_telecom_news",
    "berec_news",
    "spectrum_auctions_list",
    "spectrum_auction",
    "operator_spectrum",
    "telecom_operator",
    "list_telecom_operators",
    "telecom_market_summary",
]
