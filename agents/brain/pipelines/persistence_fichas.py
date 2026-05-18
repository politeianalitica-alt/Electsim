"""
Persistencia de fichas territoriales y de político.

Esquema:
  brain_fichas_territoriales (id PK, tipo, content_json, completeness, created_at)
  brain_fichas_politicos     (id PK, nombre, qid, content_json, completeness, created_at)

Si no hay BD → JSONL append-only en data/processed/brain_enrichment/
Si la ficha existe y completeness es mayor o igual, actualiza (UPSERT).
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_OUT_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "processed" / "brain_enrichment"

_DDL = {
    "brain_fichas_territoriales": """
        CREATE TABLE IF NOT EXISTS brain_fichas_territoriales (
            id            TEXT PRIMARY KEY,
            tipo          TEXT,
            nombre        TEXT,
            ccaa          TEXT,
            content_json  TEXT,
            completeness  REAL,
            n_bloques_ok  INT,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """,
    "brain_fichas_politicos": """
        CREATE TABLE IF NOT EXISTS brain_fichas_politicos (
            id            TEXT PRIMARY KEY,
            qid           TEXT,
            nombre        TEXT,
            partido       TEXT,
            cargo_actual  TEXT,
            content_json  TEXT,
            completeness  REAL,
            score_influencia REAL,
            n_bloques_ok  INT,
            created_at    TIMESTAMPTZ DEFAULT NOW(),
            updated_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """,
}


def _ensure_outdir() -> Path:
    _OUT_DIR.mkdir(parents=True, exist_ok=True)
    return _OUT_DIR


def _append_jsonl(filename: str, row: dict[str, Any]) -> Path:
    out = _ensure_outdir() / filename
    with out.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
    return out


def _get_engine_or_none():
    if not os.environ.get("DATABASE_URL"):
        return None
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def _ensure_table(engine, name: str) -> bool:
    try:
        from sqlalchemy import text
        ddl = _DDL.get(name)
        if not ddl:
            return False
        with engine.begin() as conn:
            conn.execute(text(ddl))
        return True
    except Exception as exc:
        logger.debug("ensure_table %s falló: %s", name, exc)
        return False


# ─────────────────────────────────────────────────────────────────
# Persisters
# ─────────────────────────────────────────────────────────────────

def persist_ficha_territorial(ficha_dict: dict[str, Any]) -> dict[str, Any]:
    summary = {"written_db": False, "written_jsonl": False, "error": None}
    fname = "fichas_territoriales.jsonl"
    try:
        _append_jsonl(fname, ficha_dict)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"

    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_fichas_territoriales"):
        return summary

    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO brain_fichas_territoriales
                        (id, tipo, nombre, ccaa, content_json,
                         completeness, n_bloques_ok)
                    VALUES (:id, :tipo, :nombre, :ccaa, :content,
                            :comp, :n_ok)
                    ON CONFLICT (id) DO UPDATE SET
                        content_json = EXCLUDED.content_json,
                        nombre = EXCLUDED.nombre,
                        ccaa = EXCLUDED.ccaa,
                        completeness = EXCLUDED.completeness,
                        n_bloques_ok = EXCLUDED.n_bloques_ok,
                        updated_at = NOW()
                """),
                {
                    "id": str(ficha_dict.get("id", "")),
                    "tipo": str(ficha_dict.get("tipo", "")),
                    "nombre": str(ficha_dict.get("nombre", "")),
                    "ccaa": str((ficha_dict.get("hero") or {}).get("ccaa", "")),
                    "content": json.dumps(ficha_dict, ensure_ascii=False, default=str),
                    "comp": float(ficha_dict.get("completeness") or 0.0),
                    "n_ok": len(ficha_dict.get("bloques_ok") or []),
                },
            )
        summary["written_db"] = True
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


def persist_ficha_politico(ficha_dict: dict[str, Any]) -> dict[str, Any]:
    summary = {"written_db": False, "written_jsonl": False, "error": None}
    fname = "fichas_politicos.jsonl"
    try:
        _append_jsonl(fname, ficha_dict)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"

    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_fichas_politicos"):
        return summary

    hero = ficha_dict.get("hero") or {}
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO brain_fichas_politicos
                        (id, qid, nombre, partido, cargo_actual,
                         content_json, completeness, score_influencia, n_bloques_ok)
                    VALUES (:id, :qid, :nombre, :partido, :cargo,
                            :content, :comp, :score, :n_ok)
                    ON CONFLICT (id) DO UPDATE SET
                        content_json = EXCLUDED.content_json,
                        partido = EXCLUDED.partido,
                        cargo_actual = EXCLUDED.cargo_actual,
                        completeness = EXCLUDED.completeness,
                        score_influencia = EXCLUDED.score_influencia,
                        n_bloques_ok = EXCLUDED.n_bloques_ok,
                        updated_at = NOW()
                """),
                {
                    "id": str(ficha_dict.get("id", "")),
                    "qid": str(hero.get("wikidata_id", "")),
                    "nombre": str(ficha_dict.get("nombre", "")),
                    "partido": str(hero.get("partido", "")),
                    "cargo": str(hero.get("cargo_actual", "")),
                    "content": json.dumps(ficha_dict, ensure_ascii=False, default=str),
                    "comp": float(ficha_dict.get("completeness") or 0.0),
                    "score": float(hero.get("score_influencia") or 0.0),
                    "n_ok": len(ficha_dict.get("bloques_ok") or []),
                },
            )
        summary["written_db"] = True
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


# ─────────────────────────────────────────────────────────────────
# Readers (lectura cacheada para los endpoints)
# ─────────────────────────────────────────────────────────────────

def read_ficha_territorial(ficha_id: str) -> dict[str, Any] | None:
    """Lee ficha por id (cod_ine o slug ccaa). BD primero, JSONL fallback."""
    if not ficha_id:
        return None
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                row = conn.execute(
                    text("SELECT content_json FROM brain_fichas_territoriales "
                         "WHERE id = :id LIMIT 1"),
                    {"id": str(ficha_id)},
                ).fetchone()
                if row and row[0]:
                    try:
                        return json.loads(row[0])
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("read_ficha_territorial BD falló: %s", exc)
    # Fallback JSONL: leemos todas las filas y nos quedamos con la última con ese id
    p = _OUT_DIR / "fichas_territoriales.jsonl"
    if p.exists():
        try:
            ultima = None
            with p.open("r", encoding="utf-8") as f:
                for line in f:
                    try:
                        row = json.loads(line)
                    except (ValueError, TypeError):
                        continue
                    if str(row.get("id")) == str(ficha_id):
                        ultima = row
            return ultima
        except Exception:
            return None
    return None


def read_ficha_politico(ficha_id: str) -> dict[str, Any] | None:
    """Lee ficha por id (qid o slug)."""
    if not ficha_id:
        return None
    engine = _get_engine_or_none()
    if engine is not None:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                row = conn.execute(
                    text("SELECT content_json FROM brain_fichas_politicos "
                         "WHERE id = :id OR qid = :id LIMIT 1"),
                    {"id": str(ficha_id)},
                ).fetchone()
                if row and row[0]:
                    try:
                        return json.loads(row[0])
                    except (ValueError, TypeError):
                        pass
        except Exception as exc:
            logger.debug("read_ficha_politico BD falló: %s", exc)
    p = _OUT_DIR / "fichas_politicos.jsonl"
    if p.exists():
        try:
            ultima = None
            with p.open("r", encoding="utf-8") as f:
                for line in f:
                    try:
                        row = json.loads(line)
                    except (ValueError, TypeError):
                        continue
                    if str(row.get("id")) == str(ficha_id):
                        ultima = row
            return ultima
        except Exception:
            return None
    return None
