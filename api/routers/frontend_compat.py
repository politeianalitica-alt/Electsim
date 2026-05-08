"""Compatibility endpoints consumed by the Next.js frontend.

This router bridges the production-ish API layout (`/api/v1/...`) and older
Streamlit-derived services to the simpler `/api/...` contract used by apps/web.
Every endpoint degrades to local fixtures instead of breaking the online UI.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

ROOT = Path(__file__).resolve().parents[2]
ACTORS_FIXTURE = ROOT / "dashboard" / "data" / "actors_graph.json"

router = APIRouter(prefix="/api", tags=["frontend-compat"])


def _load_actor_fixture() -> dict[str, Any]:
    try:
        return json.loads(ACTORS_FIXTURE.read_text(encoding="utf-8"))
    except Exception:
        return {"actores": {}, "relaciones": []}


def _fixture_actor(raw: dict[str, Any]) -> dict[str, Any]:
    poder = float(raw.get("poder") or 5)
    org = str(raw.get("org") or raw.get("partido") or "")
    return {
        "id": str(raw.get("id") or raw.get("nombre") or ""),
        "nombre_completo": str(raw.get("nombre") or raw.get("nombre_completo") or "Actor"),
        "tipo": str(raw.get("tipo") or "politico"),
        "activo": True,
        "cargo_actual": raw.get("rol") or raw.get("cargo_actual"),
        "partido": org,
        "circunscripcion": raw.get("region") or raw.get("circunscripcion"),
        "ambito": raw.get("region") or raw.get("ambito") or "Nacional",
        "foto_url": raw.get("foto_url"),
        "wikidata_id": raw.get("wikidata_id"),
        "score_influencia": min(100.0, poder * 10.0),
        "score_riesgo": max(1.0, min(10.0, 11.0 - poder)),
        "sentimiento_actual": 0.0,
        "tendencia_sentimiento": "estable",
        "ultima_mencion_media": raw.get("fecha_enriquecido"),
        "descripcion": raw.get("descripcion") or raw.get("wikipedia_extracto"),
        "wikipedia_url": raw.get("wikipedia_url"),
    }


def _fixture_actors(
    *,
    partido: str | None = None,
    search: str | None = None,
    limit: int = 50,
    campo: str = "influencia",
) -> list[dict[str, Any]]:
    data = _load_actor_fixture()
    actors = [_fixture_actor(v) for v in (data.get("actores") or {}).values()]
    if partido:
        p = partido.lower()
        actors = [a for a in actors if p in str(a.get("partido") or "").lower()]
    if search:
        q = search.lower()
        actors = [a for a in actors if q in str(a.get("nombre_completo") or "").lower()]
    order_key = "score_riesgo" if campo == "riesgo" else "score_influencia"
    actors.sort(key=lambda row: float(row.get(order_key) or 0), reverse=True)
    return actors[:limit]


def _fixture_graph() -> dict[str, Any]:
    data = _load_actor_fixture()
    actors = {k: _fixture_actor(v) for k, v in (data.get("actores") or {}).items()}
    nodes = [
        {
            "id": actor["id"],
            "label": actor["nombre_completo"],
            "tipo": actor["tipo"],
            "partido": actor.get("partido"),
            "score_influencia": actor.get("score_influencia"),
        }
        for actor in actors.values()
    ]
    edges = [
        {
            "elemento_a_id": rel.get("from"),
            "elemento_b_id": rel.get("to"),
            "source": rel.get("from"),
            "target": rel.get("to"),
            "tipo_relacion": rel.get("tipo"),
            "label": rel.get("label"),
            "peso": rel.get("fuerza") or 1,
        }
        for rel in data.get("relaciones", [])
    ]
    return {"nodes": nodes, "edges": edges, "mode": "fixture"}


@router.get("/actors")
async def actors_alias(
    partido: str | None = Query(None),
    tipo: str | None = Query(None),
    ambito: str | None = Query(None),
    search: str | None = Query(None),
    q: str | None = Query(None),
    campo: str = Query("influencia"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    filters = ["activo = true"]
    params: dict[str, Any] = {"limit": limit}
    term = search or q
    if partido:
        filters.append("partido ILIKE :partido")
        params["partido"] = f"%{partido}%"
    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if ambito:
        filters.append("ambito = :ambito")
        params["ambito"] = ambito
    if term:
        filters.append("(nombre_norm ILIKE :q OR nombre_completo ILIKE :q)")
        params["q"] = f"%{term}%"
    order_col = "score_riesgo" if campo == "riesgo" else "score_influencia"
    where = " AND ".join(filters)
    try:
        result = await db.execute(
            text(
                f"""
                SELECT id::text AS id, nombre_completo, tipo, activo,
                       cargo_actual, partido, circunscripcion, ambito,
                       foto_url, wikidata_id,
                       COALESCE(score_influencia, 0) AS score_influencia,
                       COALESCE(score_riesgo, 0) AS score_riesgo,
                       COALESCE(sentimiento_actual, 0) AS sentimiento_actual,
                       COALESCE(tendencia_sentimiento, 'estable') AS tendencia_sentimiento,
                       ultima_mencion_media, created_at, updated_at
                FROM persona_publica
                WHERE {where}
                ORDER BY {order_col} DESC NULLS LAST, nombre_completo ASC
                LIMIT :limit
                """
            ),
            params,
        )
        rows = [dict(row) for row in result.mappings()]
        return rows or _fixture_actors(partido=partido, search=term, limit=limit, campo=campo)
    except Exception:
        return _fixture_actors(partido=partido, search=term, limit=limit, campo=campo)


@router.get("/actors/dashboard")
async def actors_dashboard_alias(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await db.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE activo = true) AS actores_activos,
                    COUNT(*) FILTER (WHERE score_riesgo >= 7 AND activo = true) AS actores_riesgo_alto,
                    COUNT(*) FILTER (WHERE sentimiento_actual < -0.5) AS con_sentimiento_negativo,
                    COUNT(*) FILTER (WHERE tendencia_sentimiento = 'bajando') AS tendencia_bajando,
                    AVG(score_influencia) FILTER (WHERE activo = true) AS influencia_media,
                    COUNT(DISTINCT partido) FILTER (WHERE activo = true) AS n_partidos
                FROM persona_publica
                """
            )
        )
        data = dict(result.mappings().fetchone() or {})
        sig = await db.execute(
            text(
                """
                SELECT
                    COUNT(*) FILTER (WHERE activa = true AND leida = false) AS señales_sin_leer,
                    COUNT(*) FILTER (WHERE urgencia >= 4 AND activa = true) AS señales_criticas,
                    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS señales_hoy
                FROM signal_politeia
                """
            )
        )
        data.update(dict(sig.mappings().fetchone() or {}))
        return data
    except Exception:
        actors = _fixture_actors(limit=200)
        return {
            "actores_activos": len(actors),
            "actores_riesgo_alto": len([a for a in actors if float(a.get("score_riesgo") or 0) >= 7]),
            "señales_sin_leer": 0,
            "señales_criticas": 0,
            "señales_hoy": 0,
            "influencia_media": round(sum(float(a.get("score_influencia") or 0) for a in actors) / max(1, len(actors)), 2),
            "n_partidos": len({a.get("partido") for a in actors if a.get("partido")}),
            "mode": "fixture",
        }


@router.get("/actors/graph")
async def actors_graph_alias(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await db.execute(
            text(
                """
                SELECT elemento_a_id, elemento_a_tipo, tipo_relacion,
                       elemento_b_id, elemento_b_tipo, peso
                FROM relacion_politeia
                WHERE activa = true
                ORDER BY peso DESC
                LIMIT 250
                """
            )
        )
        edges = [dict(row) for row in result.mappings()]
        if not edges:
            return _fixture_graph()
        ids = sorted(
            {
                str(edge[key])
                for edge in edges
                for key in ("elemento_a_id", "elemento_b_id")
                if edge.get(key)
            }
        )
        nodes: list[dict[str, Any]] = []
        if ids:
            node_rows = await db.execute(
                text(
                    """
                    SELECT id::text AS id, nombre_completo AS label,
                           partido, score_influencia, 'persona' AS tipo
                    FROM persona_publica
                    WHERE id::text = ANY(:ids)
                    """
                ),
                {"ids": ids},
            )
            nodes = [dict(row) for row in node_rows.mappings()]
        return {"nodes": nodes, "edges": edges, "mode": "real"}
    except Exception:
        return _fixture_graph()


@router.get("/actors/{actor_id}")
async def actor_detail_alias(actor_id: str, db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await db.execute(
            text(
                """
                SELECT id::text AS id, nombre_completo, tipo, activo,
                       cargo_actual, partido, circunscripcion, ambito,
                       pais_origen, fecha_nac, foto_url, wikidata_id,
                       score_influencia, score_riesgo, sentimiento_actual,
                       tendencia_sentimiento, ultima_mencion_media,
                       created_at, updated_at
                FROM persona_publica
                WHERE id::text = :id
                """
            ),
            {"id": actor_id},
        )
        actor = dict(result.mappings().fetchone() or {})
        if actor:
            return actor
    except Exception:
        pass
    data = _load_actor_fixture().get("actores") or {}
    raw = data.get(actor_id)
    return _fixture_actor(raw) if raw else {}


@router.post("/brain/test")
def brain_test(payload: dict[str, Any]) -> dict[str, Any]:
    prompt = str(payload.get("prompt") or "")
    task_type = str(payload.get("task_type") or "qna")
    started = datetime.now(timezone.utc)
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        answer = engine.ollama_chat(
            "Eres Politeia Brain. Responde en espanol, de forma operativa y breve.",
            prompt,
            temperature=0.2,
            max_tokens=500,
        )
        return {
            "ok": True,
            "mode": "real" if engine.is_ollama_available() else "fallback",
            "task_type": task_type,
            "answer": answer,
            "model": engine.resolve_ollama_model(),
            "latency_ms": int((datetime.now(timezone.utc) - started).total_seconds() * 1000),
        }
    except Exception as exc:
        return {"ok": False, "mode": "error", "task_type": task_type, "answer": "", "error": str(exc)}


@router.post("/brain/embed-test")
def brain_embed_test(payload: dict[str, Any]) -> dict[str, Any]:
    text_value = str(payload.get("text") or "")
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        vector = engine.embed([text_value])[0] if text_value else []
        return {
            "ok": bool(vector),
            "mode": "real",
            "embedding_backend": engine.embedding_backend,
            "embedding_model": engine.embedding_model_name,
            "dimensions": len(vector),
            "sample": vector[:8],
        }
    except Exception as exc:
        return {"ok": False, "mode": "error", "error": str(exc), "dimensions": 0, "sample": []}


@router.post("/workflows/{workflow_id}/start")
def workflow_start_alias(workflow_id: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "ok": True,
        "workflow_id": workflow_id,
        "run_id": f"run_{workflow_id}_{int(datetime.now(timezone.utc).timestamp())}",
        "status": "started",
        "input": payload or {},
        "mode": "local-orchestrated",
    }
