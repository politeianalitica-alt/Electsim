"""
Router /intelligence — capa de inteligencia tipo Palantir Foundry AIP.

Endpoints:
  GET  /intelligence/signals          — senales activas del sistema
  GET  /intelligence/personas         — personas publicas con scores
  GET  /intelligence/personas/{id}/grafo  — grafo de relaciones
  GET  /intelligence/propensity/swing-districts
  GET  /intelligence/propensity/oportunidades/{partido}
  POST /intelligence/propensity/scenario
  GET  /intelligence/legislation/impact
  GET  /intelligence/risk-index       — Political Risk Index compuesto
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timedelta
from typing import Optional

import psycopg
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from psycopg.rows import dict_row

from config.settings import get_settings

router = APIRouter(prefix="/intelligence", tags=["intelligence"])
_settings = get_settings()


def _dsn() -> str:
    raw = _settings.database_url_raw
    return re.sub(r"postgresql\+\w+://", "postgresql://", raw)


def _conn():
    return psycopg.connect(_dsn(), row_factory=dict_row)


# ------------------------------------------------------------------
# Signals
# ------------------------------------------------------------------

@router.get("/signals")
def get_signals(
    urgencia_min: int = Query(1, ge=1, le=5),
    tipo: Optional[str] = None,
    limit: int = Query(50, le=200),
    since_minutes: int = Query(120),
):
    """Senales activas del sistema (alimenta el Command Center)."""
    since = datetime.now() - timedelta(minutes=since_minutes)
    conditions = ["urgencia >= %s", "created_at >= %s", "activa = TRUE"]
    params: list = [urgencia_min, since]

    if tipo:
        conditions.append("tipo = %s")
        params.append(tipo)

    where = " AND ".join(conditions)
    try:
        with _conn() as conn:
            rows = conn.execute(
                f"""
                SELECT id::text, tipo, urgencia, titulo, resumen,
                       modulo_origen, created_at
                FROM signal_politeia
                WHERE {where}
                ORDER BY urgencia DESC, created_at DESC
                LIMIT %s
                """,
                params + [limit],
            ).fetchall()
    except Exception:
        # Tabla no existe aún — devolver vacío para que el frontend use su mock
        return []

    result = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        result.append(d)
    return result


# ------------------------------------------------------------------
# Personas
# ------------------------------------------------------------------

@router.get("/personas")
def list_personas(
    tipo: Optional[str] = None,
    partido: Optional[str] = None,
    ambito: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=200),
    order_by: str = Query("score_influencia"),
):
    """Personas publicas ordenadas por influencia, riesgo o sentimiento."""
    valid_order = {
        "score_influencia", "score_riesgo",
        "sentimiento_actual", "nombre_completo", "updated_at",
    }
    if order_by not in valid_order:
        order_by = "score_influencia"

    conditions = ["activo = TRUE"]
    params: list = []
    if tipo:
        conditions.append("tipo = %s")
        params.append(tipo)
    if partido:
        conditions.append("partido ILIKE %s")
        params.append(f"%{partido}%")
    if ambito:
        conditions.append("ambito = %s")
        params.append(ambito)
    if search:
        conditions.append("nombre_completo ILIKE %s")
        params.append(f"%{search}%")

    where = " AND ".join(conditions)
    with _conn() as conn:
        rows = conn.execute(
            f"""
            SELECT id::text, nombre_completo, tipo, partido, cargo_actual, ambito,
                   COALESCE(score_influencia, 0) AS score_influencia,
                   COALESCE(score_riesgo, 0)     AS score_riesgo,
                   COALESCE(sentimiento_actual, 0) AS sentimiento_actual,
                   tendencia_sentimiento, foto_url
            FROM persona_publica
            WHERE {where}
            ORDER BY {order_by} DESC NULLS LAST
            LIMIT %s
            """,
            params + [limit],
        ).fetchall()
    return [dict(r) for r in rows]


@router.get("/personas/{persona_id}/grafo")
def get_persona_grafo(persona_id: str, depth: int = Query(2, le=3)):
    """
    Grafo de relaciones centrado en una persona.
    Formato: {nodes: [...], edges: [...]} compatible con sigma.js / D3.
    """
    nodes: list[dict] = []
    edges: list[dict] = []
    node_ids: set = set()
    edge_ids: set = set()

    def _fetch(entity_id: str, current_depth: int) -> None:
        if current_depth > depth or entity_id in node_ids:
            return
        node_ids.add(entity_id)

        with _conn() as conn:
            rels = conn.execute(
                """
                SELECT elemento_a_id, elemento_a_tipo, tipo_relacion,
                       elemento_b_id, elemento_b_tipo, peso
                FROM relacion_politeia
                WHERE (elemento_a_id = %s OR elemento_b_id = %s)
                  AND activa = TRUE
                LIMIT 50
                """,
                (entity_id, entity_id),
            ).fetchall()

        for r in rels:
            eid = f"{r['elemento_a_id']}-{r['tipo_relacion']}-{r['elemento_b_id']}"
            if eid not in edge_ids:
                edge_ids.add(eid)
                edges.append({
                    "id":     eid,
                    "source": r["elemento_a_id"],
                    "target": r["elemento_b_id"],
                    "label":  r["tipo_relacion"],
                    "weight": float(r["peso"] or 1.0),
                })
            for nid, ntype in [
                (r["elemento_a_id"], r["elemento_a_tipo"]),
                (r["elemento_b_id"], r["elemento_b_tipo"]),
            ]:
                if nid not in node_ids:
                    nodes.append({"id": nid, "type": ntype})
                if nid != entity_id:
                    _fetch(nid, current_depth + 1)

    _fetch(persona_id, 0)
    return {"nodes": nodes, "edges": edges, "root": persona_id}


# ------------------------------------------------------------------
# Propensity
# ------------------------------------------------------------------

@router.get("/propensity/swing-districts")
def swing_districts(
    partido_a: str = Query("pp"),
    partido_b: str = Query("psoe"),
    n: int = Query(100, le=500),
):
    """Secciones mas competitivas entre dos partidos."""
    from agents.intelligence.propensity_engine import PropensityEngine
    engine = PropensityEngine()
    engine._load_models()
    df = engine.get_swing_sections(partido_a, partido_b, n)
    return df.to_dict(orient="records")


@router.get("/propensity/oportunidades/{partido}")
def oportunidades(
    partido: str,
    umbral: float = Query(0.05, ge=0.01, le=0.20),
    ccaa: Optional[str] = None,
):
    """
    Zonas con mayor ROI de campana para el partido dado.
    Equivalente al producto estrella de NationBuilder para consultores electorales.
    """
    from agents.intelligence.propensity_engine import PropensityEngine
    engine = PropensityEngine()
    engine._load_models()
    df = engine.get_strategic_opportunities(partido, umbral)
    if ccaa:
        df = df[df["ccaa"] == ccaa]
    return {
        "partido":    partido,
        "n_secciones": len(df),
        "secciones":  df.head(200).to_dict(orient="records"),
    }


@router.post("/propensity/scenario")
def simulate_scenario(
    ccaa: Optional[str] = None,
    feature_overrides: Optional[dict] = None,
):
    """Simulacion de escenario: que pasa si el paro sube 2pp en Andalucia."""
    from agents.intelligence.propensity_engine import PropensityEngine
    engine = PropensityEngine()
    engine._load_models()
    df = engine.predict_scenario(ccaa=ccaa, feature_overrides=feature_overrides or {})
    return {
        "scenario": feature_overrides,
        "ccaa":     ccaa,
        "results":  df.head(1000).to_dict(orient="records"),
    }


# ------------------------------------------------------------------
# Legislacion con impacto cruzado
# ------------------------------------------------------------------

@router.get("/legislation/impact")
def legislation_impact(
    level: Optional[str] = None,
    category: Optional[str] = None,
    min_relevance: int = Query(6, ge=1, le=10),
    limit: int = Query(50, le=200),
    days_back: int = Query(30),
):
    """Normas legislativas con mayor impacto (ontologia completa)."""
    since = datetime.now() - timedelta(days=days_back)
    conditions = ["ai_relevance >= %s", "published_at >= %s"]
    params: list = [min_relevance, since]

    if level:
        conditions.append("level = %s")
        params.append(level)
    if category:
        conditions.append("ai_category = %s")
        params.append(category)

    where = " AND ".join(conditions)
    with _conn() as conn:
        rows = conn.execute(
            f"""
            SELECT id AS legislation_id, title AS titulo,
                   level AS nivel, region,
                   ai_category, ai_impact_level, ai_relevance,
                   ai_sectors AS sectores_afectados,
                   published_at,
                   COALESCE(map_lat, 0)   AS map_lat,
                   COALESCE(map_lon, 0)   AS map_lon,
                   COALESCE(map_place, '') AS map_place
            FROM legislation
            WHERE {where}
            ORDER BY ai_relevance DESC, published_at DESC
            LIMIT %s
            """,
            params + [limit],
        ).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        if isinstance(d.get("published_at"), datetime):
            d["published_at"] = d["published_at"].isoformat()
        result.append(d)
    return result


# ------------------------------------------------------------------
# Political Risk Index
# ------------------------------------------------------------------

@router.get("/risk-index")
def risk_index():
    """
    Calcula el Political Risk Index de Espana en tiempo real.
    Composite score 0-100 de 5 dimensiones.
    Equivalente al ACLED Political Instability Score aplicado a Espana.
    """
    with _conn() as conn:
        n_criticas = (conn.execute(
            """
            SELECT COUNT(*) FROM signal_politeia
            WHERE created_at >= NOW() - INTERVAL '24 hours'
              AND urgencia >= 4
            """
        ).fetchone() or [0])[0] or 0

        n_leyes_impacto = (conn.execute(
            """
            SELECT COUNT(*) FROM legislation
            WHERE published_at >= NOW() - INTERVAL '7 days'
              AND ai_impact_level = 'high'
            """
        ).fetchone() or [0])[0] or 0

        sent_row = conn.execute(
            """
            SELECT AVG(sentimiento_actual) FROM persona_publica
            WHERE activo = TRUE AND tipo = 'politico'
            """
        ).fetchone()
        sent_medio = float((sent_row or [None])[0] or 0.0)

        n_pendientes = (conn.execute(
            """
            SELECT COUNT(*) FROM legislation
            WHERE status = 'pending'
              AND published_at >= NOW() - INTERVAL '30 days'
            """
        ).fetchone() or [0])[0] or 0

    score = (
        min(float(n_criticas) * 5.0, 30.0)
        + min(float(n_leyes_impacto) * 3.0, 20.0)
        + (1.0 - max(float(sent_medio), -1.0)) * 10.0
        + min(float(n_pendientes) * 0.5, 15.0)
        + 15.0  # base estructural
    )
    score = round(min(max(score, 0.0), 100.0), 1)
    nivel = "alto" if score > 65 else "medio" if score > 35 else "bajo"

    return {
        "score": score,
        "nivel": nivel,
        "componentes": {
            "senales_criticas_24h":   int(n_criticas),
            "leyes_alto_impacto_7d":  int(n_leyes_impacto),
            "sentimiento_politicos":  round(sent_medio, 3),
            "iniciativas_pendientes": int(n_pendientes),
        },
        "timestamp": datetime.now().isoformat(),
    }
