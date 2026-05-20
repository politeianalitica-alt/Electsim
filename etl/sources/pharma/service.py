"""Servicio pharma_signals · Sprint 8 · S8.3.

Carga + consulta de señales farmacéuticas (shortages, recalls, EPAR,
referrals, genericization, pricing). Falla cerrado sin BD: devuelve
[] / None / {error: 'no engine'}.
"""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "pharma" / "signals_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def load_signals_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en pharma_signals · idempotente (UPSERT por slug)."""
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
                        INSERT INTO pharma_signals (
                          slug, source, signal_kind, product_name, active_principle,
                          lab_holder, atc_code, severity, status,
                          detected_at, resolved_at, description, url_oficial, payload
                        ) VALUES (
                          :slug, :source, :kind, :product, :active,
                          :lab, :atc, :sev, :status,
                          :detected, :resolved, :desc, :url, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          status = EXCLUDED.status,
                          severity = EXCLUDED.severity,
                          resolved_at = EXCLUDED.resolved_at,
                          description = EXCLUDED.description,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "source": r["source"],
                        "kind": r["signal_kind"],
                        "product": r["product_name"],
                        "active": r.get("active_principle"),
                        "lab": r.get("lab_holder"),
                        "atc": r.get("atc_code"),
                        "sev": r.get("severity", "medium"),
                        "status": r.get("status", "active"),
                        "detected": r["detected_at"],
                        "resolved": r.get("resolved_at"),
                        "desc": r.get("description"),
                        "url": r.get("url_oficial"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_signals row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("pharma_signals cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_signal(slug: str) -> dict[str, Any] | None:
    """Detalle completo de una señal · None si no existe."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text("""
                SELECT slug, source, signal_kind, product_name, active_principle,
                       lab_holder, atc_code, severity, status,
                       detected_at, resolved_at, description, url_oficial, payload
                FROM pharma_signals
                WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            keys = [
                "slug", "source", "signal_kind", "product_name", "active_principle",
                "lab_holder", "atc_code", "severity", "status",
                "detected_at", "resolved_at", "description", "url_oficial", "payload",
            ]
            return {k: v for k, v in zip(keys, row)}
    except Exception as exc:
        logger.debug("get_signal · %s · %s", slug, exc)
        return None


def list_signals(
    *,
    source: str | None = None,
    signal_kind: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista señales con filtros opcionales."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if source:
        clauses.append("source = :source")
        params["source"] = source.lower()
    if signal_kind:
        clauses.append("signal_kind = :kind")
        params["kind"] = signal_kind.lower()
    if status:
        clauses.append("status = :status")
        params["status"] = status.lower()
    if severity:
        clauses.append("severity = :severity")
        params["severity"] = severity.lower()

    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, source, signal_kind, product_name, active_principle,
               lab_holder, severity, status, detected_at, resolved_at,
               description, url_oficial
        FROM pharma_signals
        {where}
        ORDER BY
          CASE severity
            WHEN 'critical' THEN 1
            WHEN 'high'     THEN 2
            WHEN 'medium'   THEN 3
            WHEN 'info'     THEN 4
          END,
          detected_at DESC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "source", "signal_kind", "product_name", "active_principle",
            "lab_holder", "severity", "status", "detected_at", "resolved_at",
            "description", "url_oficial",
        ]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_signals · %s", exc)
        return []


def active_signals(severity_min: str = "medium") -> list[dict[str, Any]]:
    """Señales activas con severidad >= umbral (panel alertas farma)."""
    engine = _get_engine()
    if engine is None:
        return []

    order = {"info": 4, "medium": 3, "high": 2, "critical": 1}
    threshold = order.get(severity_min.lower(), 3)

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, source, signal_kind, product_name, active_principle,
                       lab_holder, severity, status, detected_at, description, url_oficial
                FROM pharma_signals
                WHERE status IN ('active', 'monitoring')
                  AND CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'high'     THEN 2
                        WHEN 'medium'   THEN 3
                        WHEN 'info'     THEN 4
                      END <= :threshold
                ORDER BY
                  CASE severity
                    WHEN 'critical' THEN 1
                    WHEN 'high'     THEN 2
                    WHEN 'medium'   THEN 3
                    WHEN 'info'     THEN 4
                  END,
                  detected_at DESC
            """), {"threshold": threshold}).all()
        keys = [
            "slug", "source", "signal_kind", "product_name", "active_principle",
            "lab_holder", "severity", "status", "detected_at", "description", "url_oficial",
        ]
        today = date.today()
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            det = r[8]
            d["days_active"] = (today - det).days if det else None
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("active_signals · %s", exc)
        return []
