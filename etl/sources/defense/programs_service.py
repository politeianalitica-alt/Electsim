"""Servicio defense_programs · Sprint 11 · S11.4.

Carga + consulta del catálogo de programas de defensa. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "defense" / "programs_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


_KEYS_FULL = [
    "slug", "name", "domain", "kind", "lead_country", "consortium",
    "framework", "prime_contractor", "status", "start_date", "planned_end_date",
    "budget_committed_eur", "budget_executed_eur",
    "units_planned", "units_delivered",
    "next_milestone", "next_milestone_date",
    "description", "url_oficial", "payload",
]


def load_programs_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en defense_programs · idempotente (UPSERT por slug)."""
    path = Path(json_path) if json_path else _SEED_PATH
    if not path.exists():
        return {"loaded": 0, "errors": 0, "path": str(path), "error": "seed no encontrado"}

    engine = _get_engine()
    if engine is None:
        return {"loaded": 0, "errors": 0, "path": str(path), "error": "no engine"}

    from sqlalchemy import text
    rows = json.loads(path.read_text(encoding="utf-8"))
    loaded = errors = 0

    try:
        with engine.begin() as conn:
            for r in rows:
                try:
                    conn.execute(text("""
                        INSERT INTO defense_programs (
                          slug, name, domain, kind, lead_country, consortium,
                          framework, prime_contractor, status,
                          start_date, planned_end_date,
                          budget_committed_eur, budget_executed_eur,
                          units_planned, units_delivered,
                          next_milestone, next_milestone_date,
                          description, url_oficial, payload
                        ) VALUES (
                          :slug, :name, :domain, :kind, :lead, :cons,
                          :framework, :contractor, :status,
                          :start, :planned,
                          :b_c, :b_e, :u_p, :u_d,
                          :ms, :ms_date,
                          :desc, :url, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          status = EXCLUDED.status,
                          budget_committed_eur = EXCLUDED.budget_committed_eur,
                          budget_executed_eur = EXCLUDED.budget_executed_eur,
                          units_delivered = EXCLUDED.units_delivered,
                          next_milestone = EXCLUDED.next_milestone,
                          next_milestone_date = EXCLUDED.next_milestone_date,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "domain": r["domain"],
                        "kind": r["kind"],
                        "lead": r["lead_country"],
                        "cons": r.get("consortium"),
                        "framework": r.get("framework"),
                        "contractor": r.get("prime_contractor"),
                        "status": r.get("status", "produccion"),
                        "start": r.get("start_date"),
                        "planned": r.get("planned_end_date"),
                        "b_c": r.get("budget_committed_eur"),
                        "b_e": r.get("budget_executed_eur"),
                        "u_p": r.get("units_planned"),
                        "u_d": r.get("units_delivered"),
                        "ms": r.get("next_milestone"),
                        "ms_date": r.get("next_milestone_date"),
                        "desc": r.get("description"),
                        "url": r.get("url_oficial"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_programs row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("defense_programs cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_program(slug: str) -> dict[str, Any] | None:
    """Detalle por slug · None si no existe."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM defense_programs WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            return {k: v for k, v in zip(_KEYS_FULL, row)}
    except Exception as exc:
        logger.debug("get_program · %s · %s", slug, exc)
        return None


def list_programs(
    *,
    domain: str | None = None,
    kind: str | None = None,
    status: str | None = None,
    framework: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista programas con filtros."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if domain:
        clauses.append("domain = :domain")
        params["domain"] = domain.lower()
    if kind:
        clauses.append("kind = :kind")
        params["kind"] = kind.lower()
    if status:
        clauses.append("status = :status")
        params["status"] = status.lower()
    if framework:
        clauses.append("framework = :framework")
        params["framework"] = framework
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, domain, kind, lead_country, framework,
               prime_contractor, status, planned_end_date,
               budget_committed_eur, units_planned, units_delivered,
               next_milestone, next_milestone_date
        FROM defense_programs
        {where}
        ORDER BY budget_committed_eur DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "domain", "kind", "lead_country", "framework",
            "prime_contractor", "status", "planned_end_date",
            "budget_committed_eur", "units_planned", "units_delivered",
            "next_milestone", "next_milestone_date",
        ]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_programs · %s", exc)
        return []


def upcoming_milestones(days_ahead: int = 180) -> list[dict[str, Any]]:
    """Próximos hitos de programas con next_milestone_date ≤ today + N días."""
    engine = _get_engine()
    if engine is None:
        return []

    from datetime import timedelta
    today = date.today()
    horizon = today + timedelta(days=days_ahead)

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, name, domain, kind, prime_contractor, status,
                       next_milestone, next_milestone_date, budget_committed_eur
                FROM defense_programs
                WHERE next_milestone_date IS NOT NULL
                  AND next_milestone_date BETWEEN :today AND :horizon
                  AND status NOT IN ('retiro', 'cancelado')
                ORDER BY next_milestone_date ASC
            """), {"today": today, "horizon": horizon}).all()
        keys = [
            "slug", "name", "domain", "kind", "prime_contractor", "status",
            "next_milestone", "next_milestone_date", "budget_committed_eur",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            ms = r[7]
            d["days_until"] = (ms - today).days if ms else None
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("upcoming_milestones · %s", exc)
        return []
