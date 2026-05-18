"""
Persistence Helper · escribe los outputs de los pipelines a BD si están
disponibles, y SIEMPRE escribe un JSONL sidecar como respaldo.

Tablas usadas (creadas si no existen, idempotente · upsert por id natural):
  · brain_territory_profiles   — fichas de municipios/CCAA
  · brain_actor_dossiers       — dossieres de actor
  · brain_issue_dossiers       — dossieres de issue
  · brain_actor_graph_edges    — edges del grafo
  · brain_actor_proposals      — candidatos descubiertos (review queue)

Si DATABASE_URL no está configurada o el esquema no existe, todos los métodos
escriben SOLO al JSONL y devuelven False sin levantar excepción.

Cero acoplamiento a frameworks: solo SQLAlchemy core (sin Alembic, sin ORM).
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


def _ensure_outdir() -> Path:
    _OUT_DIR.mkdir(parents=True, exist_ok=True)
    return _OUT_DIR


def _append_jsonl(filename: str, row: dict[str, Any]) -> Path:
    out = _ensure_outdir() / filename
    with out.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False, default=str) + "\n")
    return out


# ─────────────────────────────────────────────────────────────────
# Engine helper (sin crashear si no hay BD)
# ─────────────────────────────────────────────────────────────────

def _get_engine_or_none():
    if not os.environ.get("DATABASE_URL"):
        return None
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("engine unavailable: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────
# DDL ligero · CREATE TABLE IF NOT EXISTS
# ─────────────────────────────────────────────────────────────────

_DDL = {
    "brain_territory_profiles": """
        CREATE TABLE IF NOT EXISTS brain_territory_profiles (
            id           SERIAL PRIMARY KEY,
            tipo         TEXT,
            nombre       TEXT,
            ccaa         TEXT,
            provincia    TEXT,
            url_wikipedia TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(tipo, nombre, ccaa)
        )
    """,
    "brain_actor_dossiers": """
        CREATE TABLE IF NOT EXISTS brain_actor_dossiers (
            id           SERIAL PRIMARY KEY,
            actor_name   TEXT,
            depth        TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    """,
    "brain_issue_dossiers": """
        CREATE TABLE IF NOT EXISTS brain_issue_dossiers (
            id           SERIAL PRIMARY KEY,
            issue_name   TEXT,
            depth        TEXT,
            content_json TEXT,
            confidence   REAL,
            completeness REAL,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
    """,
    "brain_actor_graph_edges": """
        CREATE TABLE IF NOT EXISTS brain_actor_graph_edges (
            id            SERIAL PRIMARY KEY,
            actor_from    TEXT,
            actor_to      TEXT,
            actor_from_name TEXT,
            actor_to_name TEXT,
            relation_type TEXT,
            valence       REAL,
            strength      REAL,
            directionality TEXT,
            date_iso      TEXT,
            source        TEXT,
            evidence_text TEXT,
            confidence    REAL,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """,
    "brain_actor_proposals": """
        CREATE TABLE IF NOT EXISTS brain_actor_proposals (
            id                  SERIAL PRIMARY KEY,
            surface_canonical   TEXT UNIQUE,
            proposed_name       TEXT,
            proposed_actor_id   TEXT,
            mention_count       INTEGER,
            wiki_found          BOOLEAN,
            wiki_url            TEXT,
            is_political_figure BOOLEAN,
            suggested_role      TEXT,
            suggested_party     TEXT,
            confidence          REAL,
            content_json        TEXT,
            reviewed            BOOLEAN DEFAULT FALSE,
            approved            BOOLEAN DEFAULT FALSE,
            created_at          TIMESTAMPTZ DEFAULT NOW()
        )
    """,
}


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
# Writers (cada uno: BD + JSONL sidecar)
# ─────────────────────────────────────────────────────────────────

def persist_territory_profile(profile_dict: dict[str, Any]) -> dict[str, Any]:
    """Persiste un TerritorialProfile. Devuelve resumen de qué se hizo."""
    summary = {"written_db": False, "written_jsonl": False, "error": None}
    fname = f"territory_profiles_{datetime.utcnow():%Y%m%d}.jsonl"
    try:
        _append_jsonl(fname, profile_dict)
        summary["written_jsonl"] = True
        summary["jsonl_path"] = str(_OUT_DIR / fname)
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"

    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_territory_profiles"):
        return summary
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO brain_territory_profiles
                        (tipo, nombre, ccaa, provincia, url_wikipedia, content_json, confidence, completeness)
                    VALUES (:tipo, :nombre, :ccaa, :provincia, :url, :content, :conf, :comp)
                    ON CONFLICT (tipo, nombre, ccaa) DO UPDATE
                        SET content_json = EXCLUDED.content_json,
                            url_wikipedia = EXCLUDED.url_wikipedia,
                            confidence = EXCLUDED.confidence,
                            completeness = EXCLUDED.completeness,
                            created_at = NOW()
                """),
                {
                    "tipo": profile_dict.get("tipo"),
                    "nombre": profile_dict.get("nombre"),
                    "ccaa": profile_dict.get("ccaa") or "",
                    "provincia": profile_dict.get("provincia") or "",
                    "url": profile_dict.get("url_wikipedia") or "",
                    "content": json.dumps(profile_dict, ensure_ascii=False, default=str),
                    "conf": float(profile_dict.get("confidence") or 0.0),
                    "comp": float(profile_dict.get("completeness_score") or 0.0),
                },
            )
        summary["written_db"] = True
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


def persist_actor_dossier(dossier_dict: dict[str, Any]) -> dict[str, Any]:
    summary = {"written_db": False, "written_jsonl": False, "error": None}
    fname = f"actor_dossiers_{datetime.utcnow():%Y%m%d}.jsonl"
    try:
        _append_jsonl(fname, dossier_dict)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"

    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_actor_dossiers"):
        return summary
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO brain_actor_dossiers
                        (actor_name, depth, content_json, confidence, completeness)
                    VALUES (:name, :depth, :content, :conf, :comp)
                """),
                {
                    "name": dossier_dict.get("subject"),
                    "depth": dossier_dict.get("depth"),
                    "content": json.dumps(dossier_dict, ensure_ascii=False, default=str),
                    "conf": float(dossier_dict.get("confidence") or 0.0),
                    "comp": float(dossier_dict.get("completeness_score") or 0.0),
                },
            )
        summary["written_db"] = True
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


def persist_issue_dossier(dossier_dict: dict[str, Any]) -> dict[str, Any]:
    summary = {"written_db": False, "written_jsonl": False, "error": None}
    fname = f"issue_dossiers_{datetime.utcnow():%Y%m%d}.jsonl"
    try:
        _append_jsonl(fname, dossier_dict)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"
    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_issue_dossiers"):
        return summary
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO brain_issue_dossiers
                        (issue_name, depth, content_json, confidence, completeness)
                    VALUES (:name, :depth, :content, :conf, :comp)
                """),
                {
                    "name": dossier_dict.get("subject"),
                    "depth": dossier_dict.get("depth"),
                    "content": json.dumps(dossier_dict, ensure_ascii=False, default=str),
                    "conf": float(dossier_dict.get("confidence") or 0.0),
                    "comp": float(dossier_dict.get("completeness_score") or 0.0),
                },
            )
        summary["written_db"] = True
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


def persist_graph_edges(edges: list[dict[str, Any]]) -> dict[str, Any]:
    summary = {"written_db": 0, "written_jsonl": False, "error": None}
    if not edges:
        return summary
    fname = f"graph_edges_{datetime.utcnow():%Y%m%d}.jsonl"
    try:
        for e in edges:
            _append_jsonl(fname, e)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"
    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_actor_graph_edges"):
        return summary
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for e in edges:
                conn.execute(
                    text("""
                        INSERT INTO brain_actor_graph_edges
                            (actor_from, actor_to, actor_from_name, actor_to_name,
                             relation_type, valence, strength, directionality,
                             date_iso, source, evidence_text, confidence)
                        VALUES (:af, :at, :afn, :atn, :rt, :v, :s, :d, :di, :src, :ev, :cf)
                    """),
                    {
                        "af": e.get("actor_from"),
                        "at": e.get("actor_to"),
                        "afn": e.get("actor_from_name"),
                        "atn": e.get("actor_to_name"),
                        "rt": e.get("relation_type"),
                        "v": float(e.get("valence") or 0.0),
                        "s": float(e.get("strength") or 0.0),
                        "d": e.get("directionality") or "bidirectional",
                        "di": e.get("date_iso") or "",
                        "src": e.get("source") or "",
                        "ev": (e.get("evidence_text") or "")[:1000],
                        "cf": float(e.get("confidence") or 0.0),
                    },
                )
                summary["written_db"] += 1
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary


def persist_actor_proposals(proposals: list[dict[str, Any]]) -> dict[str, Any]:
    summary = {"written_db": 0, "written_jsonl": False, "error": None}
    if not proposals:
        return summary
    fname = f"actor_proposals_{datetime.utcnow():%Y%m%d}.jsonl"
    try:
        for p in proposals:
            _append_jsonl(fname, p)
        summary["written_jsonl"] = True
    except Exception as exc:
        summary["error"] = f"jsonl: {exc}"
    engine = _get_engine_or_none()
    if engine is None or not _ensure_table(engine, "brain_actor_proposals"):
        return summary
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            for p in proposals:
                conn.execute(
                    text("""
                        INSERT INTO brain_actor_proposals
                            (surface_canonical, proposed_name, proposed_actor_id,
                             mention_count, wiki_found, wiki_url, is_political_figure,
                             suggested_role, suggested_party, confidence, content_json)
                        VALUES (:sc, :pn, :pi, :mc, :wf, :wu, :ipf, :sr, :sp, :cf, :cj)
                        ON CONFLICT (surface_canonical) DO UPDATE
                            SET mention_count = EXCLUDED.mention_count,
                                wiki_found = EXCLUDED.wiki_found,
                                wiki_url = EXCLUDED.wiki_url,
                                is_political_figure = EXCLUDED.is_political_figure,
                                suggested_role = EXCLUDED.suggested_role,
                                suggested_party = EXCLUDED.suggested_party,
                                confidence = EXCLUDED.confidence,
                                content_json = EXCLUDED.content_json,
                                created_at = NOW()
                    """),
                    {
                        "sc": p.get("surface_canonical"),
                        "pn": p.get("proposed_name"),
                        "pi": p.get("proposed_actor_id"),
                        "mc": int(p.get("mention_count") or 0),
                        "wf": bool(p.get("wiki_found")),
                        "wu": p.get("wiki_url") or "",
                        "ipf": bool(p.get("is_political_figure")),
                        "sr": p.get("suggested_role") or "",
                        "sp": p.get("suggested_party") or "",
                        "cf": float(p.get("confidence") or 0.0),
                        "cj": json.dumps(p, ensure_ascii=False, default=str),
                    },
                )
                summary["written_db"] += 1
    except Exception as exc:
        summary["error"] = f"db: {exc}"
    return summary
