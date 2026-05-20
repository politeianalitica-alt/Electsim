"""Brain tools sector Banca & Seguros · Sprint 7 · S7.4.

> **Sprint 7 · S7.4** (`docs/ROADMAP_GITS_AMIGOS.md §7 Sprint 7 · Banca`)

Expone capacidades de Sprint 7 al Brain como tools registradas para que el
copiloto pueda consultar hechos relevantes CNMV, series macro BdE y el
tracker de obligaciones regulatorias (DORA, Basel IV, AI Act, MiCA...).

Tools:
  - cnmv_hechos_relevantes(limit)         · feed RSS hechos relevantes
  - bde_indicador(codigo, last_n)         · serie macro BdE
  - regulatory_obligation(slug)           · detalle obligación regulatoria
  - list_regulatory_obligations(sector)   · lista filtrada
  - upcoming_compliance_deadlines(days)   · alertas plazo próximo
  - dora_compliance_status()              · estado DORA (shortcut)

Falla cerrado: cualquier excepción devuelve {"error": str, ...vacío}.
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# CNMV · hechos relevantes
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("cnmv_hechos_relevantes")
def cnmv_hechos_relevantes(limit: int = 20) -> dict[str, Any]:
    """Últimos hechos relevantes publicados por CNMV.

    Args:
      limit: máximo de items a devolver (default 20).

    Returns:
      {
        "n_items": int,
        "items": [{id, title, link, pub_date, company, ...}],
        "error": str | None,
      }
    """
    try:
        from etl.sources.spain.cnmv import get_cnmv_client
        client = get_cnmv_client()
        items = client.fetch_hechos_relevantes()
        items = items[:max(1, limit)]
        # Serializar fechas
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        logger.debug("cnmv_hechos_relevantes · %s", exc)
        return {"n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# BdE · serie macro
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("bde_indicador")
def bde_indicador(codigo: str, last_n: int = 12) -> dict[str, Any]:
    """Descarga serie estadística del Banco de España (RSS oficial).

    Códigos comunes:
      - BE_N_BPI_D_ESIA       · Euribor 1 mes
      - BE_N_BPI_D_ESIA12     · Euribor 12 meses
      - BE_N_BOND_D_ESPANA10  · Bono España 10Y (prima riesgo)
      - BE_N_FLO_M_DEUDA_PGSOE · Deuda pública total

    Args:
      codigo: código serie BdE.
      last_n: últimos N valores (default 12).

    Returns:
      {"codigo": str, "n_obs": int, "ultimo_valor": float | None, "values": [...]}
    """
    try:
        from etl.sources.bde_api_v2 import fetch_bde_serie
        rows = fetch_bde_serie(codigo)
        if not rows:
            return {"codigo": codigo, "n_obs": 0, "values": [], "error": "sin datos"}
        rows_sorted = sorted(rows, key=lambda r: r["fecha"], reverse=True)
        rows_top = rows_sorted[:max(1, last_n)]
        out = [
            {"fecha": r["fecha"].isoformat() if hasattr(r["fecha"], "isoformat") else r["fecha"],
             "valor": r["valor"]}
            for r in rows_top
        ]
        return {
            "codigo": codigo,
            "n_obs": len(out),
            "ultimo_valor": out[0]["valor"] if out else None,
            "values": out,
            "error": None,
        }
    except Exception as exc:
        logger.debug("bde_indicador · %s · %s", codigo, exc)
        return {"codigo": codigo, "n_obs": 0, "values": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# Regulatory obligations tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("regulatory_obligation")
def regulatory_obligation(slug: str) -> dict[str, Any]:
    """Detalle completo de una obligación regulatoria por slug.

    Slugs disponibles en seed: dora, basel_iv, mica, psd3, solvencia_ii_review,
    ai_act, dma, dsa, nis2, csrd, ley_vivienda_2023, fit_for_55.

    Returns:
      Dict con título, sector, jurisdicción, regulador, fechas, status,
      severidad, summary, url oficial. {error: ...} si no existe.
    """
    try:
        from etl.sources.regulatory import get_obligation
        row = get_obligation(slug)
        if row is None:
            return {"error": f"Obligación '{slug}' no encontrada", "slug": slug}
        # Serializar fechas
        for k in ("publication_date", "entry_into_force", "compliance_deadline"):
            v = row.get(k)
            if v is not None and hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_regulatory_obligations")
def list_regulatory_obligations(
    sector: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista obligaciones regulatorias con filtros.

    Args:
      sector: 'banca', 'telecom', 'energia', 'vivienda', 'cross'.
      status: 'open', 'in_progress', 'completed', 'deprecated'.
      severity: 'info', 'medium', 'high', 'critical'.
      limit: máximo a devolver.

    Returns:
      {"n_items": int, "items": [...]}
    """
    try:
        from etl.sources.regulatory import list_obligations
        rows = list_obligations(
            sector=sector, status=status, severity=severity, limit=limit,
        )
        for r in rows:
            v = r.get("compliance_deadline")
            if v is not None and hasattr(v, "isoformat"):
                r["compliance_deadline"] = v.isoformat()
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {"sector": sector, "status": status, "severity": severity},
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("upcoming_compliance_deadlines")
def upcoming_compliance_deadlines(days_ahead: int = 90) -> dict[str, Any]:
    """Obligaciones con plazo en los próximos N días (alertas dashboard).

    Args:
      days_ahead: ventana en días (default 90).

    Returns:
      {"days_ahead": int, "n_items": int, "items": [..., days_left]}
    """
    try:
        from etl.sources.regulatory import upcoming_deadlines
        rows = upcoming_deadlines(days_ahead=days_ahead)
        for r in rows:
            v = r.get("compliance_deadline")
            if v is not None and hasattr(v, "isoformat"):
                r["compliance_deadline"] = v.isoformat()
        return {
            "days_ahead": days_ahead,
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {"days_ahead": days_ahead, "n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("dora_compliance_status")
def dora_compliance_status() -> dict[str, Any]:
    """Shortcut · estado DORA (Digital Operational Resilience Act).

    DORA es la obligación crítica del sector banca con deadline 17-ene-2025.
    Aplicable a entidades de crédito, ESIs, aseguradoras, fondos.

    Returns:
      Detalle obligación + days_left calculado.
    """
    try:
        from datetime import date
        from etl.sources.regulatory import get_obligation
        row = get_obligation("dora")
        if row is None:
            return {"error": "DORA no cargada en BD · ejecuta load_obligations_seed()"}
        deadline = row.get("compliance_deadline")
        if deadline is not None and hasattr(deadline, "isoformat"):
            days_left = (deadline - date.today()).days
            row["compliance_deadline"] = deadline.isoformat()
            row["days_left"] = days_left
            row["alert_level"] = (
                "vencido" if days_left < 0
                else "critico" if days_left < 30
                else "alto" if days_left < 90
                else "informativo"
            )
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc)}


__all__ = [
    "cnmv_hechos_relevantes",
    "bde_indicador",
    "regulatory_obligation",
    "list_regulatory_obligations",
    "upcoming_compliance_deadlines",
    "dora_compliance_status",
]
