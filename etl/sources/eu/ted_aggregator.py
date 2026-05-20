"""TED aggregator · capa analítica · Sprint 10 · S10.1.

> **Sprint 10 · S10.1** (`docs/ROADMAP_GITS_AMIGOS.md · Sprint 10 · Infraestructuras`)

El cliente TED (Sprint 3 · S3.2) ofrece búsquedas planas de notices. Esta
capa añade agregaciones específicas para sector infraestructuras:

  - top_adjudicatarios(country, sector, fecha_desde) · ranking constructoras
  - ranking_por_pais(sector, year) · spend distribution UE
  - serie_temporal_cpv(cpv_code, year_from, year_to) · evolución mensual

Falla cerrado: si TED no responde → estructuras vacías + error explícito.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


def _amount(raw: dict[str, Any]) -> float:
    for k in (
        "total-value", "totalValue",
        "estimated-total-value", "estimatedTotalValue",
        "value-amount", "valueAmount",
    ):
        v = raw.get(k)
        if v is None:
            continue
        # TED a veces devuelve {amount: 1234, currency: 'EUR'}
        if isinstance(v, dict):
            v = v.get("amount")
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return 0.0


def _winner(raw: dict[str, Any]) -> dict[str, str]:
    """Adjudicatario de un Contract Award Notice (CAN)."""
    for k in ("winner", "contractor", "awarded-to", "awardedTo"):
        v = raw.get(k)
        if isinstance(v, dict):
            name = v.get("name") or v.get("nationalRegistrationNumber") or ""
            nif = v.get("nationalRegistrationNumber") or ""
            if name:
                return {"name": str(name).strip(), "id": str(nif).strip()}
    # Fallback · winner-name plano
    name = raw.get("winner-name") or raw.get("winnerName") or ""
    return {"name": str(name).strip(), "id": ""}


def _country(raw: dict[str, Any]) -> str:
    for k in ("country", "buyer-country", "buyerCountry", "place-of-performance"):
        v = raw.get(k)
        if isinstance(v, dict):
            v = v.get("country") or v.get("code")
        if v:
            return str(v).upper()[:3]
    return ""


def _date(raw: dict[str, Any]) -> str:
    for k in ("publication-date", "publicationDate", "date-publication"):
        v = raw.get(k)
        if v:
            return str(v)[:10]
    return ""


# ────────────────────────────────────────────────────────────────────
# Top adjudicatarios
# ────────────────────────────────────────────────────────────────────

def top_adjudicatarios(
    *,
    country: str = "ESP",
    sector: str = "infraestructuras",
    date_from: str | None = None,
    date_to: str | None = None,
    max_pages: int = 3,
    top_n: int = 20,
) -> dict[str, Any]:
    """Ranking de adjudicatarios de licitaciones TED por importe.

    Args:
      country: ISO alpha-3 (default ESP).
      sector: clave de CPV_BY_SECTOR (default 'infraestructuras' → CPV 45+71).
      date_from / date_to: 'YYYY-MM-DD'.
      max_pages: páginas TED (50 por página).
      top_n: tamaño del ranking.

    Returns:
      {
        "n_notices": int,
        "valor_total": float,
        "currency": "EUR",
        "top": [{name, id, total, n_contracts}],
        "error": str | None
      }
    """
    try:
        from etl.sources.eu.ted import get_ted_client, CPV_BY_SECTOR
    except Exception as exc:
        return {"n_notices": 0, "valor_total": 0.0, "top": [], "error": str(exc)}

    client = get_ted_client()
    if getattr(client, "_session", None) is None:
        return {
            "n_notices": 0, "valor_total": 0.0, "top": [],
            "error": "TED · requests no disponible",
        }

    cpv_codes = CPV_BY_SECTOR.get(sector)
    if cpv_codes is None and sector:
        return {
            "n_notices": 0, "valor_total": 0.0, "top": [],
            "error": f"sector '{sector}' no en CPV_BY_SECTOR",
        }

    aggregator: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"name": "", "id": "", "total": 0.0, "n_contracts": 0}
    )
    n_notices = 0
    valor_total = 0.0

    for page in range(1, max_pages + 1):
        data = client.search_notices(
            country=country,
            date_from=date_from,
            date_to=date_to,
            cpv_codes=cpv_codes,
            notice_types=["CAN"],  # Contract Award Notices
            page=page,
            page_size=50,
        ) or {}
        notices = data.get("notices") or []
        if not notices:
            break
        for raw in notices:
            w = _winner(raw)
            key = w["id"] or w["name"] or "?"
            if not w["name"]:
                continue
            amt = _amount(raw)
            agg = aggregator[key]
            agg["name"] = w["name"] or agg["name"]
            agg["id"] = w["id"] or agg["id"]
            agg["total"] += amt
            agg["n_contracts"] += 1
            n_notices += 1
            valor_total += amt

    top = sorted(aggregator.values(), key=lambda x: x["total"], reverse=True)[:top_n]
    return {
        "n_notices": n_notices,
        "valor_total": round(valor_total, 2),
        "currency": "EUR",
        "top": [{**r, "total": round(r["total"], 2)} for r in top],
        "filters": {
            "country": country, "sector": sector,
            "date_from": date_from, "date_to": date_to,
        },
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Ranking por país
# ────────────────────────────────────────────────────────────────────

def ranking_por_pais(
    *,
    sector: str = "infraestructuras",
    date_from: str | None = None,
    date_to: str | None = None,
    max_pages: int = 5,
    top_n: int = 15,
) -> dict[str, Any]:
    """Ranking spend de licitaciones por país (UE-27)."""
    try:
        from etl.sources.eu.ted import get_ted_client, CPV_BY_SECTOR
    except Exception as exc:
        return {"top": [], "error": str(exc)}

    client = get_ted_client()
    if getattr(client, "_session", None) is None:
        return {"top": [], "error": "TED · requests no disponible"}

    cpv_codes = CPV_BY_SECTOR.get(sector)
    if cpv_codes is None and sector:
        return {"top": [], "error": f"sector '{sector}' no en CPV_BY_SECTOR"}

    aggregator: dict[str, dict[str, float]] = defaultdict(
        lambda: {"country": "", "total": 0.0, "n_notices": 0}
    )

    for page in range(1, max_pages + 1):
        data = client.search_notices(
            country="",  # sin filtro · obtenemos UE entera
            date_from=date_from, date_to=date_to,
            cpv_codes=cpv_codes,
            notice_types=["CAN"],
            page=page, page_size=50,
        ) or {}
        notices = data.get("notices") or []
        if not notices:
            break
        for raw in notices:
            c = _country(raw)
            if not c:
                continue
            amt = _amount(raw)
            agg = aggregator[c]
            agg["country"] = c
            agg["total"] += amt
            agg["n_notices"] += 1

    top = sorted(aggregator.values(), key=lambda x: x["total"], reverse=True)[:top_n]
    return {
        "n_countries": len(aggregator),
        "top": [{**r, "total": round(r["total"], 2)} for r in top],
        "filters": {"sector": sector, "date_from": date_from, "date_to": date_to},
        "error": None,
    }


# ────────────────────────────────────────────────────────────────────
# Serie temporal mensual de un CPV
# ────────────────────────────────────────────────────────────────────

def serie_temporal_cpv(
    cpv_code: str,
    *,
    country: str = "ESP",
    date_from: str | None = None,
    date_to: str | None = None,
    max_pages: int = 5,
) -> dict[str, Any]:
    """Evolución mensual de licitaciones para un CPV específico."""
    try:
        from etl.sources.eu.ted import get_ted_client
    except Exception as exc:
        return {"cpv": cpv_code, "series": {}, "error": str(exc)}

    client = get_ted_client()
    if getattr(client, "_session", None) is None:
        return {"cpv": cpv_code, "series": {}, "error": "TED · requests no disponible"}

    series: dict[str, float] = defaultdict(float)
    n_notices = 0

    for page in range(1, max_pages + 1):
        data = client.search_notices(
            country=country,
            date_from=date_from, date_to=date_to,
            cpv_codes=[cpv_code],
            page=page, page_size=50,
        ) or {}
        notices = data.get("notices") or []
        if not notices:
            break
        for raw in notices:
            d = _date(raw)
            if not d:
                continue
            month = d[:7]  # YYYY-MM
            amt = _amount(raw)
            series[month] += amt
            n_notices += 1

    return {
        "cpv": cpv_code,
        "country": country,
        "n_notices": n_notices,
        "series": {k: round(v, 2) for k, v in sorted(series.items())},
        "error": None,
    }


__all__ = [
    "top_adjudicatarios",
    "ranking_por_pais",
    "serie_temporal_cpv",
]
