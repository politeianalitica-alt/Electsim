"""Brain tools sector Defensa · Sprint 11 · S11.5.

> **Sprint 11 · S11.5** (`docs/ROADMAP_GITS_AMIGOS.md §11 Sprint 11 · Defensa`)

Expone al Brain:
  - NATO news (RSS oficial)
  - EDA news + catálogo programas PESCO/EDF
  - Defensa.gob (BOD + notas prensa MINISDEF + INTA)
  - defense_programs tracker

Tools:
  - nato_news(query, limit)
  - eda_news(limit)
  - eda_program(slug)
  - eda_list_programs()
  - defensa_gob_feed(feed, limit)
  - defense_program(slug)
  - list_defense_programs(domain, kind, status, framework)
  - defense_upcoming_milestones(days_ahead)
"""
from __future__ import annotations

import logging
from typing import Any

from agents.tools import ToolRegistry

logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────────────
# NATO
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("nato_news")
def nato_news(query: str | None = None, limit: int = 25) -> dict[str, Any]:
    """Últimas noticias oficiales NATO (feed RSS).

    Args:
      query: filtro case-insensitive en title/description.
      limit: máximo items.
    """
    try:
        from etl.sources.defense.nato import get_nato_client
        client = get_nato_client()
        items = client.fetch_news()
        if query:
            items = client.search(query, items)
        items = items[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {
            "query": query,
            "n_items": len(items),
            "items": items,
            "error": None,
        }
    except Exception as exc:
        return {"query": query, "n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# EDA
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("eda_news")
def eda_news(limit: int = 25) -> dict[str, Any]:
    """Últimas noticias EDA."""
    try:
        from etl.sources.defense.eda import get_eda_client
        client = get_eda_client()
        items = client.fetch_news()[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("eda_list_programs")
def eda_list_programs() -> dict[str, Any]:
    """Catálogo estático de programas PESCO/EDF/OCCAR relevantes para España."""
    try:
        from etl.sources.defense.eda import get_eda_client
        client = get_eda_client()
        items = client.list_programs()
        return {"n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("eda_program")
def eda_program(slug: str) -> dict[str, Any]:
    """Detalle de un programa EDA por slug.

    Slugs disponibles: pesco_euro_male, pesco_strategic_c2,
    edf_fcas, edf_eurodrone.
    """
    try:
        from etl.sources.defense.eda import get_eda_client
        client = get_eda_client()
        prog = client.get_program(slug)
        if prog is None:
            return {"error": f"Programa EDA '{slug}' no encontrado", "slug": slug}
        prog["error"] = None
        return prog
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


# ────────────────────────────────────────────────────────────────────
# Defensa.gob
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("defensa_gob_feed")
def defensa_gob_feed(feed: str = "minisdef_prensa", limit: int = 25) -> dict[str, Any]:
    """Feed oficial del Ministerio de Defensa.

    Args:
      feed: 'bod' | 'minisdef_prensa' | 'inta'.
      limit: máximo items.
    """
    valid = {"bod", "minisdef_prensa", "inta"}
    if feed not in valid:
        return {
            "feed": feed, "n_items": 0, "items": [],
            "error": f"feed '{feed}' no válido · usa {sorted(valid)}",
        }
    try:
        from etl.sources.defense.defensa_gob import get_defensa_gob_client
        client = get_defensa_gob_client()
        if feed == "bod":
            items = client.fetch_bod()
        elif feed == "inta":
            items = client.fetch_inta()
        else:
            items = client.fetch_notas_prensa()
        items = items[:max(1, limit)]
        for it in items:
            pd = it.get("pub_date")
            if pd is not None and hasattr(pd, "isoformat"):
                it["pub_date"] = pd.isoformat()
        return {"feed": feed, "n_items": len(items), "items": items, "error": None}
    except Exception as exc:
        return {"feed": feed, "n_items": 0, "items": [], "error": str(exc)}


# ────────────────────────────────────────────────────────────────────
# defense_programs · tracker
# ────────────────────────────────────────────────────────────────────

@ToolRegistry.register("defense_program")
def defense_program(slug: str) -> dict[str, Any]:
    """Detalle de un programa de defensa.

    Slugs en seed: f110_navantia, s80_submarino, fcas_ngws, eurodrone,
    eurofighter_t4, vcr_dragón, leopard_2e_mod, spainsat_ng, paz_2,
    halcon_iron_dome_samp_t_ng, nh90_caiman, iris2.
    """
    try:
        from etl.sources.defense.programs_service import get_program
        row = get_program(slug)
        if row is None:
            return {"error": f"Programa '{slug}' no encontrado", "slug": slug}
        for k in ("start_date", "planned_end_date", "next_milestone_date"):
            v = row.get(k)
            if v is not None and hasattr(v, "isoformat"):
                row[k] = v.isoformat()
        # Métricas derivadas
        u_p = row.get("units_planned") or 0
        u_d = row.get("units_delivered") or 0
        row["pct_delivered"] = round(u_d / u_p * 100, 1) if u_p else None
        b_c = row.get("budget_committed_eur") or 0
        b_e = row.get("budget_executed_eur") or 0
        row["pct_executed"] = round(b_e / b_c * 100, 1) if b_c else None
        row["error"] = None
        return row
    except Exception as exc:
        return {"error": str(exc), "slug": slug}


@ToolRegistry.register("list_defense_programs")
def list_defense_programs(
    domain: str | None = None,
    kind: str | None = None,
    status: str | None = None,
    framework: str | None = None,
    limit: int = 50,
) -> dict[str, Any]:
    """Lista programas defensa con filtros.

    Args:
      domain: 'aire', 'tierra', 'mar', 'espacio', 'ciber', 'multi'.
      kind: 'aeronave', 'buque', 'submarino', 'vehiculo', 'misil', 'satelite'...
      status: 'planificacion', 'rfp', 'firma', 'desarrollo', 'produccion',
              'entrega', 'operacion', 'retiro', 'cancelado'.
      framework: 'PESCO', 'EDF', 'OCCAR', 'NATO', 'bilateral', 'nacional'.
    """
    try:
        from etl.sources.defense.programs_service import list_programs
        rows = list_programs(
            domain=domain, kind=kind, status=status,
            framework=framework, limit=limit,
        )
        for r in rows:
            for k in ("planned_end_date", "next_milestone_date"):
                v = r.get(k)
                if v is not None and hasattr(v, "isoformat"):
                    r[k] = v.isoformat()
        return {
            "n_items": len(rows),
            "items": rows,
            "filters": {
                "domain": domain, "kind": kind,
                "status": status, "framework": framework,
            },
            "error": None,
        }
    except Exception as exc:
        return {"n_items": 0, "items": [], "error": str(exc)}


@ToolRegistry.register("defense_upcoming_milestones")
def defense_upcoming_milestones(days_ahead: int = 180) -> dict[str, Any]:
    """Próximos hitos de programas defensa en ventana de N días."""
    try:
        from etl.sources.defense.programs_service import upcoming_milestones
        rows = upcoming_milestones(days_ahead=days_ahead)
        for r in rows:
            v = r.get("next_milestone_date")
            if v is not None and hasattr(v, "isoformat"):
                r["next_milestone_date"] = v.isoformat()
        return {
            "days_ahead": days_ahead,
            "n_items": len(rows),
            "items": rows,
            "error": None,
        }
    except Exception as exc:
        return {
            "days_ahead": days_ahead,
            "n_items": 0, "items": [], "error": str(exc),
        }


__all__ = [
    "nato_news",
    "eda_news",
    "eda_list_programs",
    "eda_program",
    "defensa_gob_feed",
    "defense_program",
    "list_defense_programs",
    "defense_upcoming_milestones",
]
