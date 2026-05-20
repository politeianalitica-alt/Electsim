"""Servicio infra_projects · Sprint 10 · S10.4.

Catálogo de grandes proyectos de infraestructura ES. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "infra" / "projects_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


_KEYS_FULL = [
    "slug", "name", "kind", "owner_organism", "main_contractor", "region",
    "status", "start_date", "planned_end_date", "original_end_date",
    "budget_initial_eur", "budget_current_eur", "executed_eur",
    "delay_months", "funding_source", "description", "url_oficial", "payload",
]


def load_projects_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en infra_projects · idempotente (UPSERT por slug)."""
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
                        INSERT INTO infra_projects (
                          slug, name, kind, owner_organism, main_contractor,
                          region, status, start_date, planned_end_date,
                          original_end_date, budget_initial_eur, budget_current_eur,
                          executed_eur, delay_months, funding_source,
                          description, url_oficial, payload
                        ) VALUES (
                          :slug, :name, :kind, :owner, :contractor,
                          :region, :status, :start, :planned,
                          :original, :b_init, :b_curr,
                          :exec, :delay, :funding,
                          :desc, :url, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          status = EXCLUDED.status,
                          planned_end_date = EXCLUDED.planned_end_date,
                          budget_current_eur = EXCLUDED.budget_current_eur,
                          delay_months = EXCLUDED.delay_months,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "kind": r["kind"],
                        "owner": r["owner_organism"],
                        "contractor": r.get("main_contractor"),
                        "region": r.get("region"),
                        "status": r.get("status", "en_obras"),
                        "start": r.get("start_date"),
                        "planned": r.get("planned_end_date"),
                        "original": r.get("original_end_date"),
                        "b_init": r.get("budget_initial_eur"),
                        "b_curr": r.get("budget_current_eur"),
                        "exec": r.get("executed_eur"),
                        "delay": r.get("delay_months"),
                        "funding": r.get("funding_source"),
                        "desc": r.get("description"),
                        "url": r.get("url_oficial"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_projects row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("infra_projects cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_project(slug: str) -> dict[str, Any] | None:
    """Detalle por slug · None si no existe."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM infra_projects WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            return {k: v for k, v in zip(_KEYS_FULL, row)}
    except Exception as exc:
        logger.debug("get_project · %s · %s", slug, exc)
        return None


def list_projects(
    *,
    kind: str | None = None,
    status: str | None = None,
    owner: str | None = None,
    region: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista proyectos con filtros."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if kind:
        clauses.append("kind = :kind")
        params["kind"] = kind.lower()
    if status:
        clauses.append("status = :status")
        params["status"] = status.lower()
    if owner:
        clauses.append("owner_organism ILIKE :owner")
        params["owner"] = f"%{owner}%"
    if region:
        clauses.append("region ILIKE :region")
        params["region"] = f"%{region}%"
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, kind, owner_organism, region, status,
               planned_end_date, budget_initial_eur, budget_current_eur,
               delay_months, funding_source
        FROM infra_projects
        {where}
        ORDER BY budget_current_eur DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "kind", "owner_organism", "region", "status",
            "planned_end_date", "budget_initial_eur", "budget_current_eur",
            "delay_months", "funding_source",
        ]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_projects · %s", exc)
        return []


def delayed_projects(min_delay_months: int = 12) -> list[dict[str, Any]]:
    """Proyectos con retraso ≥ N meses (panel alertas infraestructura)."""
    engine = _get_engine()
    if engine is None:
        return []

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, name, kind, owner_organism, region, status,
                       planned_end_date, original_end_date,
                       budget_initial_eur, budget_current_eur,
                       delay_months, description
                FROM infra_projects
                WHERE delay_months IS NOT NULL
                  AND delay_months >= :min_delay
                  AND status NOT IN ('completado', 'cancelado')
                ORDER BY delay_months DESC, budget_current_eur DESC NULLS LAST
            """), {"min_delay": min_delay_months}).all()
        keys = [
            "slug", "name", "kind", "owner_organism", "region", "status",
            "planned_end_date", "original_end_date",
            "budget_initial_eur", "budget_current_eur",
            "delay_months", "description",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            b_init = r[8]
            b_curr = r[9]
            if b_init and b_curr and b_init > 0:
                d["sobrecoste_pct"] = round((b_curr - b_init) / b_init * 100, 1)
            else:
                d["sobrecoste_pct"] = None
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("delayed_projects · %s", exc)
        return []
