"""Servicio commodity_recipes + snapshots · Sprint 14 · S14.5.

Falla cerrado sin BD: devuelve [] / None / {error: 'no engine'}.
"""
from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "commodities" / "recipes_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def load_recipes_seed(json_path: str | None = None) -> dict[str, Any]:
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
                        INSERT INTO commodity_recipes (
                          slug, name, sector, ingredients, currency,
                          owner_user_id, notes, payload
                        ) VALUES (
                          :slug, :name, :sector,
                          CAST(:ingredients AS JSONB), :currency,
                          NULL, :notes, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          ingredients = EXCLUDED.ingredients,
                          notes = EXCLUDED.notes,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "sector": r.get("sector"),
                        "ingredients": json.dumps(r.get("ingredients") or []),
                        "currency": r.get("currency", "EUR"),
                        "notes": r.get("notes"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_recipes row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("commodity_recipes cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


def get_recipe(slug: str) -> dict[str, Any] | None:
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text("""
                SELECT slug, name, sector, ingredients, currency, notes
                FROM commodity_recipes WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            keys = ["slug", "name", "sector", "ingredients", "currency", "notes"]
            d = {k: v for k, v in zip(keys, row)}
            # ingredients viene como dict/list JSONB · garantizamos list
            if isinstance(d.get("ingredients"), str):
                try:
                    d["ingredients"] = json.loads(d["ingredients"])
                except Exception:
                    d["ingredients"] = []
            return d
    except Exception as exc:
        logger.debug("get_recipe · %s · %s", slug, exc)
        return None


def list_recipes(sector: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    from sqlalchemy import text
    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if sector:
        clauses.append("sector = :sector")
        params["sector"] = sector.lower()
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(f"""
                SELECT slug, name, sector, currency, notes
                FROM commodity_recipes
                {where}
                ORDER BY name ASC
                LIMIT :limit
            """), params).all()
        keys = ["slug", "name", "sector", "currency", "notes"]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_recipes · %s", exc)
        return []


def snapshot_price(
    slug: str,
    last_price: float,
    *,
    currency: str | None = None,
    change_pct: float | None = None,
    source: str = "yahoo",
    snapshot_date_: date | None = None,
) -> dict[str, Any]:
    """Inserta o actualiza un snapshot diario."""
    engine = _get_engine()
    if engine is None:
        return {"snapshot": False, "error": "no engine"}
    sd = snapshot_date_ or date.today()
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO commodity_price_snapshots (
                  slug, snapshot_date, last_price, currency, change_pct, source
                ) VALUES (:slug, :sd, :p, :cur, :ch, :src)
                ON CONFLICT (slug, snapshot_date) DO UPDATE SET
                  last_price = EXCLUDED.last_price,
                  change_pct = EXCLUDED.change_pct,
                  source = EXCLUDED.source
            """), {
                "slug": slug.lower(),
                "sd": sd,
                "p": last_price,
                "cur": currency,
                "ch": change_pct,
                "src": source,
            })
        return {"snapshot": True, "slug": slug, "date": sd.isoformat(), "error": None}
    except Exception as exc:
        return {"snapshot": False, "slug": slug, "error": str(exc)}


def get_snapshot_series(slug: str, last_n: int = 30) -> list[dict[str, Any]]:
    engine = _get_engine()
    if engine is None:
        return []
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT snapshot_date, last_price, currency, change_pct, source
                FROM commodity_price_snapshots
                WHERE slug = :slug
                ORDER BY snapshot_date DESC
                LIMIT :limit
            """), {"slug": slug.lower(), "limit": last_n}).all()
        out = []
        for r in rows:
            out.append({
                "date": r[0].isoformat() if hasattr(r[0], "isoformat") else r[0],
                "last_price": float(r[1]) if r[1] is not None else None,
                "currency": r[2],
                "change_pct": float(r[3]) if r[3] is not None else None,
                "source": r[4],
            })
        return out
    except Exception as exc:
        logger.debug("get_snapshot_series · %s · %s", slug, exc)
        return []


__all__ = [
    "load_recipes_seed",
    "get_recipe",
    "list_recipes",
    "snapshot_price",
    "get_snapshot_series",
]
