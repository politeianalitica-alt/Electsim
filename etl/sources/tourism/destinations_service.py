"""Servicio tourism_destinations · Sprint 15 · S15.4.

Catálogo destinos turísticos ES. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "tourism" / "destinations_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


_NUMERIC_KEYS = [
    "yoy_visitors_pct", "adr_eur", "rev_par_eur",
    "vivienda_turistica_per_1000", "tasa_turistica_eur",
]

_KEYS_FULL = [
    "slug", "name", "kind", "ccaa", "province", "ine_code", "population",
    "visitors_2024_k", "pernoctaciones_2024_k", "yoy_visitors_pct",
    "adr_eur", "rev_par_eur",
    "vivienda_turistica_count", "vivienda_turistica_per_1000",
    "regulacion_pisos_turisticos", "presion_turistica",
    "tasa_turistica_eur", "notes", "payload",
]


def load_destinations_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON · idempotente (UPSERT por slug)."""
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
                        INSERT INTO tourism_destinations (
                          slug, name, kind, ccaa, province, ine_code, population,
                          visitors_2024_k, pernoctaciones_2024_k, yoy_visitors_pct,
                          adr_eur, rev_par_eur,
                          vivienda_turistica_count, vivienda_turistica_per_1000,
                          regulacion_pisos_turisticos, presion_turistica,
                          tasa_turistica_eur, notes, payload
                        ) VALUES (
                          :slug, :name, :kind, :ccaa, :prov, :ine, :pop,
                          :v, :pern, :yoy, :adr, :rp,
                          :vt_c, :vt_p, :reg, :pres, :tasa,
                          :notes, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          visitors_2024_k = EXCLUDED.visitors_2024_k,
                          pernoctaciones_2024_k = EXCLUDED.pernoctaciones_2024_k,
                          yoy_visitors_pct = EXCLUDED.yoy_visitors_pct,
                          adr_eur = EXCLUDED.adr_eur,
                          rev_par_eur = EXCLUDED.rev_par_eur,
                          regulacion_pisos_turisticos = EXCLUDED.regulacion_pisos_turisticos,
                          presion_turistica = EXCLUDED.presion_turistica,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "kind": r["kind"],
                        "ccaa": r["ccaa"],
                        "prov": r.get("province"),
                        "ine": r.get("ine_code"),
                        "pop": r.get("population"),
                        "v": r.get("visitors_2024_k"),
                        "pern": r.get("pernoctaciones_2024_k"),
                        "yoy": r.get("yoy_visitors_pct"),
                        "adr": r.get("adr_eur"),
                        "rp": r.get("rev_par_eur"),
                        "vt_c": r.get("vivienda_turistica_count"),
                        "vt_p": r.get("vivienda_turistica_per_1000"),
                        "reg": r.get("regulacion_pisos_turisticos", "permisivo"),
                        "pres": r.get("presion_turistica", "medio"),
                        "tasa": r.get("tasa_turistica_eur"),
                        "notes": r.get("notes"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_destinations row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("tourism_destinations cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_destination(slug: str) -> dict[str, Any] | None:
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM tourism_destinations WHERE slug = :slug
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
        logger.debug("get_destination · %s · %s", slug, exc)
        return None


def list_destinations(
    *,
    ccaa: str | None = None,
    kind: str | None = None,
    presion_min: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if ccaa:
        clauses.append("ccaa ILIKE :ccaa")
        params["ccaa"] = f"%{ccaa}%"
    if kind:
        clauses.append("kind = :kind")
        params["kind"] = kind.lower()
    if presion_min:
        order = {"bajo": 1, "medio": 2, "alto": 3, "critico": 4}
        threshold = order.get(presion_min.lower(), 2)
        clauses.append(
            "CASE presion_turistica "
            "WHEN 'bajo' THEN 1 WHEN 'medio' THEN 2 "
            "WHEN 'alto' THEN 3 WHEN 'critico' THEN 4 END >= :pres_th"
        )
        params["pres_th"] = threshold

    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, kind, ccaa, population,
               visitors_2024_k, pernoctaciones_2024_k, yoy_visitors_pct,
               adr_eur, rev_par_eur, regulacion_pisos_turisticos,
               presion_turistica, tasa_turistica_eur
        FROM tourism_destinations
        {where}
        ORDER BY visitors_2024_k DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "kind", "ccaa", "population",
            "visitors_2024_k", "pernoctaciones_2024_k", "yoy_visitors_pct",
            "adr_eur", "rev_par_eur", "regulacion_pisos_turisticos",
            "presion_turistica", "tasa_turistica_eur",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            for k in ("yoy_visitors_pct", "adr_eur", "rev_par_eur", "tasa_turistica_eur"):
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("list_destinations · %s", exc)
        return []


def pressure_alerts() -> list[dict[str, Any]]:
    """Destinos en presión 'alto' o 'critico' · panel alertas saturación."""
    engine = _get_engine()
    if engine is None:
        return []

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT slug, name, ccaa, kind, presion_turistica,
                       visitors_2024_k, yoy_visitors_pct,
                       vivienda_turistica_per_1000,
                       regulacion_pisos_turisticos,
                       tasa_turistica_eur, notes
                FROM tourism_destinations
                WHERE presion_turistica IN ('alto', 'critico')
                ORDER BY
                  CASE presion_turistica WHEN 'critico' THEN 1 ELSE 2 END,
                  visitors_2024_k DESC NULLS LAST
            """)).all()
        keys = [
            "slug", "name", "ccaa", "kind", "presion_turistica",
            "visitors_2024_k", "yoy_visitors_pct",
            "vivienda_turistica_per_1000",
            "regulacion_pisos_turisticos",
            "tasa_turistica_eur", "notes",
        ]
        out = []
        for r in rows:
            d = {k: v for k, v in zip(keys, r)}
            for k in ("yoy_visitors_pct", "vivienda_turistica_per_1000", "tasa_turistica_eur"):
                if d.get(k) is not None:
                    try:
                        d[k] = float(d[k])
                    except Exception:
                        pass
            out.append(d)
        return out
    except Exception as exc:
        logger.debug("pressure_alerts · %s", exc)
        return []
