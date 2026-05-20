"""Servicio housing_markets · Sprint 13 · S13.4.

Catálogo mercados de vivienda ES. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "housing" / "markets_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


_NUMERIC_KEYS = [
    "precio_m2_venta_eur", "precio_alquiler_eur_mes",
    "yoy_precio_venta_pct", "yoy_precio_alquiler_pct",
    "esfuerzo_hogares_pct",
]

_KEYS_FULL = [
    "slug", "name", "scope", "ccaa", "province", "ine_code", "population",
    "precio_m2_venta_eur", "precio_alquiler_eur_mes",
    "yoy_precio_venta_pct", "yoy_precio_alquiler_pct",
    "esfuerzo_hogares_pct", "stock_alquiler_aprox",
    "zona_mercado_tensionado", "fecha_declaracion_zmt",
    "notes", "payload",
]


def load_markets_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en housing_markets · idempotente (UPSERT por slug)."""
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
                        INSERT INTO housing_markets (
                          slug, name, scope, ccaa, province, ine_code, population,
                          precio_m2_venta_eur, precio_alquiler_eur_mes,
                          yoy_precio_venta_pct, yoy_precio_alquiler_pct,
                          esfuerzo_hogares_pct, stock_alquiler_aprox,
                          zona_mercado_tensionado, fecha_declaracion_zmt,
                          notes, payload
                        ) VALUES (
                          :slug, :name, :scope, :ccaa, :prov, :ine, :pop,
                          :p_v, :p_a, :y_v, :y_a, :esf, :stock,
                          :zmt, :z_date, :notes, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          precio_m2_venta_eur = EXCLUDED.precio_m2_venta_eur,
                          precio_alquiler_eur_mes = EXCLUDED.precio_alquiler_eur_mes,
                          yoy_precio_venta_pct = EXCLUDED.yoy_precio_venta_pct,
                          yoy_precio_alquiler_pct = EXCLUDED.yoy_precio_alquiler_pct,
                          zona_mercado_tensionado = EXCLUDED.zona_mercado_tensionado,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "scope": r["scope"],
                        "ccaa": r["ccaa"],
                        "prov": r.get("province"),
                        "ine": r.get("ine_code"),
                        "pop": r.get("population"),
                        "p_v": r.get("precio_m2_venta_eur"),
                        "p_a": r.get("precio_alquiler_eur_mes"),
                        "y_v": r.get("yoy_precio_venta_pct"),
                        "y_a": r.get("yoy_precio_alquiler_pct"),
                        "esf": r.get("esfuerzo_hogares_pct"),
                        "stock": r.get("stock_alquiler_aprox"),
                        "zmt": bool(r.get("zona_mercado_tensionado", False)),
                        "z_date": r.get("fecha_declaracion_zmt"),
                        "notes": r.get("notes"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_markets row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("housing_markets cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_market(slug: str) -> dict[str, Any] | None:
    """Detalle por slug."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM housing_markets WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            d = {k: v for k, v in zip(_KEYS_FULL, row)}
            for k in _NUMERIC_KEYS:
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            return d
    except Exception as exc:
        logger.debug("get_market · %s · %s", slug, exc)
        return None


def list_markets(
    *,
    ccaa: str | None = None,
    scope: str | None = None,
    zmt_only: bool = False,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Lista mercados con filtros."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if ccaa:
        clauses.append("ccaa ILIKE :ccaa")
        params["ccaa"] = f"%{ccaa}%"
    if scope:
        clauses.append("scope = :scope")
        params["scope"] = scope.lower()
    if zmt_only:
        clauses.append("zona_mercado_tensionado = true")
    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, scope, ccaa, province, population,
               precio_m2_venta_eur, precio_alquiler_eur_mes,
               yoy_precio_venta_pct, yoy_precio_alquiler_pct,
               esfuerzo_hogares_pct, zona_mercado_tensionado
        FROM housing_markets
        {where}
        ORDER BY precio_m2_venta_eur DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "scope", "ccaa", "province", "population",
            "precio_m2_venta_eur", "precio_alquiler_eur_mes",
            "yoy_precio_venta_pct", "yoy_precio_alquiler_pct",
            "esfuerzo_hogares_pct", "zona_mercado_tensionado",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            for k in (
                "precio_m2_venta_eur", "precio_alquiler_eur_mes",
                "yoy_precio_venta_pct", "yoy_precio_alquiler_pct",
                "esfuerzo_hogares_pct",
            ):
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("list_markets · %s", exc)
        return []


def tension_alerts(
    *,
    min_yoy_alquiler_pct: float = 8.0,
    min_esfuerzo_pct: float = 35.0,
) -> list[dict[str, Any]]:
    """Mercados con tensión alta (alquiler subiendo + esfuerzo elevado)."""
    engine = _get_engine()
    if engine is None:
        return []

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, name, ccaa, scope,
                       precio_alquiler_eur_mes, yoy_precio_alquiler_pct,
                       esfuerzo_hogares_pct, zona_mercado_tensionado, notes
                FROM housing_markets
                WHERE yoy_precio_alquiler_pct IS NOT NULL
                  AND yoy_precio_alquiler_pct >= :min_yoy
                  AND COALESCE(esfuerzo_hogares_pct, 0) >= :min_esf
                ORDER BY yoy_precio_alquiler_pct DESC NULLS LAST
            """), {"min_yoy": min_yoy_alquiler_pct, "min_esf": min_esfuerzo_pct}).all()
        keys = [
            "slug", "name", "ccaa", "scope",
            "precio_alquiler_eur_mes", "yoy_precio_alquiler_pct",
            "esfuerzo_hogares_pct", "zona_mercado_tensionado", "notes",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            for k in ("precio_alquiler_eur_mes", "yoy_precio_alquiler_pct", "esfuerzo_hogares_pct"):
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("tension_alerts · %s", exc)
        return []
