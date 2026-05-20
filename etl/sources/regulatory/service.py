"""Servicio regulatory_obligations · Sprint 7 · S7.3.

Carga + consulta de obligaciones regulatorias (DORA, Basel IV, AI Act, etc).
Falla cerrado sin BD: devuelve [] / None / {error: 'no engine'}.
"""
from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "regulatory" / "obligations_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def load_obligations_seed(json_path: str | None = None) -> dict[str, int]:
    """Carga seed JSON en tabla regulatory_obligations · idempotente (UPSERT por slug).

    Returns:
      {"loaded": int, "errors": int, "path": str}
    """
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
                        INSERT INTO regulatory_obligations (
                          slug, title, sector, jurisdiction, regulator,
                          publication_date, entry_into_force, compliance_deadline,
                          severity, status, summary, url_oficial, payload
                        ) VALUES (
                          :slug, :title, :sector, :jurisdiction, :regulator,
                          :pub, :eif, :deadline, :sev, :status, :summary,
                          :url, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          title = EXCLUDED.title,
                          sector = EXCLUDED.sector,
                          summary = EXCLUDED.summary,
                          status = EXCLUDED.status,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "title": r["title"],
                        "sector": r["sector"],
                        "jurisdiction": r["jurisdiction"],
                        "regulator": r.get("regulator"),
                        "pub": r.get("publication_date"),
                        "eif": r.get("entry_into_force"),
                        "deadline": r.get("compliance_deadline"),
                        "sev": r.get("severity", "medium"),
                        "status": r.get("status", "open"),
                        "summary": r.get("summary"),
                        "url": r.get("url_oficial"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_obligations row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("regulatory_obligations cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_obligation(slug: str) -> dict[str, Any] | None:
    """Devuelve detalle completo de una obligación · None si no existe."""
    engine = _get_engine()
    if engine is None or not slug:
        return None

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text("""
                SELECT slug, title, sector, jurisdiction, regulator,
                       publication_date, entry_into_force, compliance_deadline,
                       severity, status, summary, url_oficial, payload
                FROM regulatory_obligations
                WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            keys = [
                "slug", "title", "sector", "jurisdiction", "regulator",
                "publication_date", "entry_into_force", "compliance_deadline",
                "severity", "status", "summary", "url_oficial", "payload",
            ]
            return {k: v for k, v in zip(keys, row)}
    except Exception as exc:
        logger.debug("get_obligation · %s · %s", slug, exc)
        return None


def list_obligations(
    *,
    sector: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista obligaciones con filtros opcionales."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if sector:
        clauses.append("sector = :sector")
        params["sector"] = sector.lower()
    if status:
        clauses.append("status = :status")
        params["status"] = status.lower()
    if severity:
        clauses.append("severity = :severity")
        params["severity"] = severity.lower()

    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, title, sector, jurisdiction, regulator,
               compliance_deadline, severity, status, summary, url_oficial
        FROM regulatory_obligations
        {where}
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high'     THEN 2
            WHEN 'medium'   THEN 3
            WHEN 'info'     THEN 4
          END,
          compliance_deadline NULLS LAST
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "title", "sector", "jurisdiction", "regulator",
            "compliance_deadline", "severity", "status", "summary", "url_oficial",
        ]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_obligations · %s", exc)
        return []


def upcoming_deadlines(days_ahead: int = 90) -> list[dict[str, Any]]:
    """Obligaciones con deadline en los próximos N días.

    Útil para tablero de alertas regulatorias del cliente.
    """
    engine = _get_engine()
    if engine is None:
        return []

    today = date.today()
    horizon = today + timedelta(days=days_ahead)

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, title, sector, severity, status,
                       compliance_deadline, summary, url_oficial
                FROM regulatory_obligations
                WHERE compliance_deadline IS NOT NULL
                  AND compliance_deadline BETWEEN :today AND :horizon
                  AND status != 'completed'
                ORDER BY compliance_deadline ASC, severity ASC
            """), {"today": today, "horizon": horizon}).all()
        keys = [
            "slug", "title", "sector", "severity", "status",
            "compliance_deadline", "summary", "url_oficial",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            d["days_left"] = (r[5] - today).days if r[5] else None
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("upcoming_deadlines · %s", exc)
        return []
