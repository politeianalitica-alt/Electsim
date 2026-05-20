"""Servicio telecom_operators · Sprint 12 · S12.4.

Catálogo operadores telecom ES. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "telecom" / "operators_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


_NUMERIC_KEYS = [
    "market_share_movil_pct", "market_share_fijo_pct",
    "spectrum_900_1800", "spectrum_2100", "spectrum_2600",
    "spectrum_3500", "spectrum_700", "spectrum_26ghz",
]

_KEYS_FULL = [
    "slug", "name", "kind", "parent_group", "country",
    "market_share_movil_pct", "market_share_fijo_pct",
    "annual_revenue_eur_m", "subscribers_movil", "subscribers_fijo",
    "ftth_homes_passed",
    "spectrum_900_1800", "spectrum_2100", "spectrum_2600",
    "spectrum_3500", "spectrum_700", "spectrum_26ghz",
    "website", "description", "payload",
]


def load_operators_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en telecom_operators · idempotente (UPSERT por slug)."""
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
                        INSERT INTO telecom_operators (
                          slug, name, kind, parent_group, country,
                          market_share_movil_pct, market_share_fijo_pct,
                          annual_revenue_eur_m, subscribers_movil, subscribers_fijo,
                          ftth_homes_passed,
                          spectrum_900_1800, spectrum_2100, spectrum_2600,
                          spectrum_3500, spectrum_700, spectrum_26ghz,
                          website, description, payload
                        ) VALUES (
                          :slug, :name, :kind, :parent, :country,
                          :ms_m, :ms_f,
                          :rev, :s_m, :s_f, :ftth,
                          :s900, :s2100, :s2600, :s3500, :s700, :s26,
                          :web, :desc, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          market_share_movil_pct = EXCLUDED.market_share_movil_pct,
                          market_share_fijo_pct = EXCLUDED.market_share_fijo_pct,
                          annual_revenue_eur_m = EXCLUDED.annual_revenue_eur_m,
                          subscribers_movil = EXCLUDED.subscribers_movil,
                          subscribers_fijo = EXCLUDED.subscribers_fijo,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "kind": r["kind"],
                        "parent": r.get("parent_group"),
                        "country": r.get("country", "ES"),
                        "ms_m": r.get("market_share_movil_pct"),
                        "ms_f": r.get("market_share_fijo_pct"),
                        "rev": r.get("annual_revenue_eur_m"),
                        "s_m": r.get("subscribers_movil"),
                        "s_f": r.get("subscribers_fijo"),
                        "ftth": r.get("ftth_homes_passed"),
                        "s900": r.get("spectrum_900_1800"),
                        "s2100": r.get("spectrum_2100"),
                        "s2600": r.get("spectrum_2600"),
                        "s3500": r.get("spectrum_3500"),
                        "s700": r.get("spectrum_700"),
                        "s26": r.get("spectrum_26ghz"),
                        "web": r.get("website"),
                        "desc": r.get("description"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_operators row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("telecom_operators cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_operator(slug: str) -> dict[str, Any] | None:
    """Detalle por slug."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM telecom_operators WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            d = {k: v for k, v in zip(_KEYS_FULL, row)}
            # numerics → float para serialización
            for k in _NUMERIC_KEYS:
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            return d
    except Exception as exc:
        logger.debug("get_operator · %s · %s", slug, exc)
        return None


def list_operators(
    *,
    kind: str | None = None,
    parent_group: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Lista operadores con filtros."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if kind:
        clauses.append("kind = :kind")
        params["kind"] = kind.lower()
    if parent_group:
        clauses.append("parent_group ILIKE :parent")
        params["parent"] = f"%{parent_group}%"
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, kind, parent_group,
               market_share_movil_pct, market_share_fijo_pct,
               annual_revenue_eur_m, subscribers_movil, subscribers_fijo,
               ftth_homes_passed
        FROM telecom_operators
        {where}
        ORDER BY annual_revenue_eur_m DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "kind", "parent_group",
            "market_share_movil_pct", "market_share_fijo_pct",
            "annual_revenue_eur_m", "subscribers_movil", "subscribers_fijo",
            "ftth_homes_passed",
        ]
        out: list[dict[str, Any]] = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            for k in ("market_share_movil_pct", "market_share_fijo_pct"):
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("list_operators · %s", exc)
        return []


def market_share_summary() -> dict[str, Any]:
    """Resumen mercado: top operadores por cuota móvil + fija."""
    engine = _get_engine()
    if engine is None:
        return {"top_movil": [], "top_fijo": [], "error": "no engine"}

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            top_m = conn.execute(text("""
                SELECT slug, name, market_share_movil_pct
                FROM telecom_operators
                WHERE market_share_movil_pct IS NOT NULL
                ORDER BY market_share_movil_pct DESC NULLS LAST
                LIMIT 10
            """)).all()
            top_f = conn.execute(text("""
                SELECT slug, name, market_share_fijo_pct
                FROM telecom_operators
                WHERE market_share_fijo_pct IS NOT NULL
                ORDER BY market_share_fijo_pct DESC NULLS LAST
                LIMIT 10
            """)).all()
        return {
            "top_movil": [
                {"slug": r[0], "name": r[1], "market_share_pct": float(r[2])}
                for r in top_m
            ],
            "top_fijo": [
                {"slug": r[0], "name": r[1], "market_share_pct": float(r[2])}
                for r in top_f
            ],
            "error": None,
        }
    except Exception as exc:
        logger.debug("market_share_summary · %s", exc)
        return {"top_movil": [], "top_fijo": [], "error": str(exc)}
