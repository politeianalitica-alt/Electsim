"""Servicio social_orgs · Sprint 9 · S9.4.

Catálogo del Tercer Sector. Falla cerrado sin BD.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "social" / "orgs_seed.json"


def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def load_orgs_seed(json_path: str | None = None) -> dict[str, Any]:
    """Carga seed JSON en social_orgs · idempotente (UPSERT por slug)."""
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
                        INSERT INTO social_orgs (
                          slug, name, legal_form, scope, country, nif,
                          eu_transparency_id, sector, annual_budget_eur,
                          year_founded, irpf_07, publica_utilidad,
                          website, description, payload
                        ) VALUES (
                          :slug, :name, :form, :scope, :country, :nif,
                          :eu_id, :sector, :budget,
                          :year, :irpf, :util,
                          :web, :desc, CAST(:payload AS JSONB)
                        )
                        ON CONFLICT (slug) DO UPDATE SET
                          name = EXCLUDED.name,
                          annual_budget_eur = EXCLUDED.annual_budget_eur,
                          irpf_07 = EXCLUDED.irpf_07,
                          publica_utilidad = EXCLUDED.publica_utilidad,
                          updated_at = NOW()
                    """), {
                        "slug": r["slug"],
                        "name": r["name"],
                        "form": r.get("legal_form", "ngo"),
                        "scope": r.get("scope", "national"),
                        "country": r.get("country", "ES"),
                        "nif": r.get("nif"),
                        "eu_id": r.get("eu_transparency_id"),
                        "sector": r.get("sector"),
                        "budget": r.get("annual_budget_eur"),
                        "year": r.get("year_founded"),
                        "irpf": bool(r.get("irpf_07", False)),
                        "util": bool(r.get("publica_utilidad", False)),
                        "web": r.get("website"),
                        "desc": r.get("description"),
                        "payload": json.dumps(r.get("payload") or {}),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("load_orgs row · %s · %s", r.get("slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("social_orgs cargado · %d (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


_KEYS_FULL = [
    "slug", "name", "legal_form", "scope", "country", "nif",
    "eu_transparency_id", "sector", "annual_budget_eur",
    "year_founded", "irpf_07", "publica_utilidad",
    "website", "description", "payload",
]


def get_org(slug: str) -> dict[str, Any] | None:
    """Detalle por slug · None si no existe."""
    engine = _get_engine()
    if engine is None or not slug:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM social_orgs WHERE slug = :slug
            """), {"slug": slug.lower()}).first()
            if row is None:
                return None
            return {k: v for k, v in zip(_KEYS_FULL, row)}
    except Exception as exc:
        logger.debug("get_org · %s · %s", slug, exc)
        return None


def get_org_by_nif(nif: str) -> dict[str, Any] | None:
    """Búsqueda por NIF — clave de cruce con BDNS."""
    engine = _get_engine()
    if engine is None or not nif:
        return None
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            row = conn.execute(text(f"""
                SELECT {", ".join(_KEYS_FULL)}
                FROM social_orgs WHERE nif = :nif
            """), {"nif": nif.strip().upper()}).first()
            if row is None:
                return None
            return {k: v for k, v in zip(_KEYS_FULL, row)}
    except Exception as exc:
        logger.debug("get_org_by_nif · %s · %s", nif, exc)
        return None


def list_orgs(
    *,
    sector: str | None = None,
    legal_form: str | None = None,
    irpf_07_only: bool = False,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Lista organizaciones tercer sector con filtros."""
    engine = _get_engine()
    if engine is None:
        return []

    clauses: list[str] = []
    params: dict[str, Any] = {"limit": limit}
    if sector:
        clauses.append("sector = :sector")
        params["sector"] = sector.lower()
    if legal_form:
        clauses.append("legal_form = :form")
        params["form"] = legal_form.lower()
    if irpf_07_only:
        clauses.append("irpf_07 = true")

    where = "WHERE " + " AND ".join(clauses) if clauses else ""

    from sqlalchemy import text
    sql = f"""
        SELECT slug, name, legal_form, scope, country, nif,
               sector, annual_budget_eur, irpf_07, publica_utilidad,
               website
        FROM social_orgs
        {where}
        ORDER BY annual_budget_eur DESC NULLS LAST, name ASC
        LIMIT :limit
    """
    try:
        with engine.begin() as conn:
            rows = conn.execute(text(sql), params).all()
        keys = [
            "slug", "name", "legal_form", "scope", "country", "nif",
            "sector", "annual_budget_eur", "irpf_07", "publica_utilidad",
            "website",
        ]
        return [{k: v for k, v in zip(keys, r)} for r in rows]
    except Exception as exc:
        logger.debug("list_orgs · %s", exc)
        return []
