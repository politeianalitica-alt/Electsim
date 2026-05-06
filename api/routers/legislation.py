"""
Block 4 — FastAPI endpoints para Monitor Legislativo.

Provee acceso a: legislación reciente, normas en tramitación,
impacto sectorial, búsqueda semántica y KPIs del dashboard.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

router = APIRouter(prefix="/api/v1/legislation", tags=["legislation"])


# ──────────────────────────────────────────────────────────────────────
# Listado con filtros
# ──────────────────────────────────────────────────────────────────────
@router.get("/")
async def list_legislation(
    fuente:       str   = Query(None, description="BOE | EUR-LEX | CCAA"),
    tipo:         str   = Query(None, description="ley | real_decreto | directiva_ue ..."),
    estado:       str   = Query(None),
    sector:       str   = Query(None, description="sector afectado"),
    min_urgencia: float = Query(0.0, ge=0.0, le=10.0),
    dias:         int   = Query(30, ge=1, le=365),
    limit:        int   = Query(30, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista legislación reciente con filtros opcionales."""
    filters = [
        "fecha_publicacion >= NOW() - :dias * INTERVAL '1 day'",
        "score_urgencia_cliente >= :min_urgencia",
    ]
    params: dict[str, Any] = {
        "dias": dias,
        "min_urgencia": min_urgencia,
        "limit": limit,
    }

    if fuente:
        filters.append("fuente ILIKE :fuente")
        params["fuente"] = f"%{fuente}%"
    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if estado:
        filters.append("estado = :estado")
        params["estado"] = estado
    if sector:
        filters.append("sectores_afectados::text ILIKE :sector")
        params["sector"] = f"%{sector}%"

    where = " AND ".join(filters)
    q = text(f"""
        SELECT id, tipo, titulo_corto, fuente, departamento, ccaa,
               estado, rango, numero_boe, numero_eur_lex,
               resumen_ejecutivo, temas, sectores_afectados,
               score_impacto_economico, score_impacto_empresas,
               score_urgencia_cliente,
               fecha_publicacion, fecha_entrada_vigor,
               grupos_favor, grupos_contra,
               votos_favor, votos_contra, url_fuente
        FROM legislation
        WHERE {where}
        ORDER BY score_urgencia_cliente DESC, fecha_publicacion DESC
        LIMIT :limit
    """)
    r = await db.execute(q, params)
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Detalle de norma
# ──────────────────────────────────────────────────────────────────────
@router.get("/{leg_id}")
async def get_legislation_detail(
    leg_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle completo con historial de estados y enmiendas."""
    q = text("""
        SELECT l.*,
            (
                SELECT json_agg(json_build_object(
                    'estado_nuevo',  h.estado_nuevo,
                    'fecha',         h.fecha,
                    'descripcion',   h.descripcion,
                    'votos_favor',   h.votos_favor,
                    'votos_contra',  h.votos_contra,
                    'grupos_favor',  h.grupos_favor
                ) ORDER BY h.fecha ASC)
                FROM legislation_estado_historia h
                WHERE h.legislation_id = l.id
            ) AS historial
        FROM legislation l
        WHERE l.id = :id
    """)
    r = await db.execute(q, {"id": leg_id})
    row = r.mappings().fetchone()
    return dict(row) if row else {}


# ──────────────────────────────────────────────────────────────────────
# Normas en tramitación
# ──────────────────────────────────────────────────────────────────────
@router.get("/tramite/activas")
async def get_normas_en_tramite(
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Normas actualmente en tramitación parlamentaria."""
    from apps.workers.connectors.parliamentary_tracker import fetch_normas_en_tramite
    return await fetch_normas_en_tramite(db)


# ──────────────────────────────────────────────────────────────────────
# Impacto sectorial
# ──────────────────────────────────────────────────────────────────────
@router.get("/sectores/impacto")
async def get_impacto_por_sector(
    dias: int = Query(90, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Agrega impacto legislativo por sector económico."""
    q = text("""
        SELECT
            s->>'sector'              AS sector,
            COUNT(*)                  AS n_normas,
            AVG((s->>'peso')::float)  AS peso_medio,
            AVG(score_impacto_empresas) AS impacto_empresas,
            AVG(score_urgencia_cliente) AS urgencia_media,
            MAX(fecha_publicacion)    AS ultima_norma
        FROM legislation,
             jsonb_array_elements(sectores_afectados) AS s
        WHERE fecha_publicacion >= NOW() - :dias * INTERVAL '1 day'
          AND sectores_afectados != '[]'::jsonb
        GROUP BY sector
        ORDER BY n_normas DESC, urgencia_media DESC
        LIMIT 30
    """)
    r = await db.execute(q, {"dias": dias})
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Búsqueda semántica
# ──────────────────────────────────────────────────────────────────────
@router.get("/buscar/semantico")
async def buscar_legislacion_semantico(
    q:     str = Query(..., min_length=3),
    top_k: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Búsqueda semántica sobre legislación mediante similitud vectorial."""
    try:
        import httpx
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post("http://localhost:11434/api/embeddings", json={
                "model": "nomic-embed-text",
                "prompt": q,
            })
            vec = r.json().get("embedding", [])
    except Exception:
        vec = []

    if not vec:
        # Fallback a búsqueda textual
        r2 = await db.execute(text("""
            SELECT id, tipo, titulo_corto, fuente, resumen_ejecutivo,
                   temas, sectores_afectados, score_urgencia_cliente,
                   fecha_publicacion, url_fuente
            FROM legislation
            WHERE titulo ILIKE :q OR resumen_ejecutivo ILIKE :q
            ORDER BY score_urgencia_cliente DESC
            LIMIT :k
        """), {"q": f"%{q}%", "k": top_k})
        return [dict(row) for row in r2.mappings()]

    query = text("""
        SELECT id, tipo, titulo_corto, fuente, resumen_ejecutivo,
               temas, sectores_afectados, score_urgencia_cliente,
               fecha_publicacion, url_fuente,
               1 - (embedding <=> :vec::vector) AS similitud
        FROM legislation
        WHERE embedding IS NOT NULL
          AND fecha_publicacion >= NOW() - INTERVAL '1 year'
        ORDER BY embedding <=> :vec::vector
        LIMIT :k
    """)
    r3 = await db.execute(query, {"vec": str(vec), "k": top_k})
    return [dict(row) for row in r3.mappings()]


# ──────────────────────────────────────────────────────────────────────
# KPIs del dashboard
# ──────────────────────────────────────────────────────────────────────
@router.get("/estadisticas/dashboard")
async def get_estadisticas_legislativas(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """KPIs consolidados para el panel legislativo."""
    q = text("""
        SELECT
            COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE)                  AS hoy,
            COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 7)              AS semana,
            COUNT(*) FILTER (WHERE fecha_publicacion >= CURRENT_DATE - 30)             AS mes,
            COUNT(*) FILTER (WHERE fuente = 'BOE')                                     AS n_boe,
            COUNT(*) FILTER (WHERE fuente = 'EUR-LEX')                                 AS n_eurlex,
            COUNT(*) FILTER (WHERE fuente LIKE 'CCAA%')                                AS n_ccaa,
            COUNT(*) FILTER (WHERE estado NOT IN ('publicado','rechazado','retirado'))  AS en_tramite,
            COUNT(*) FILTER (WHERE score_urgencia_cliente >= 7)                        AS alta_urgencia,
            AVG(score_impacto_economico) FILTER (
                WHERE fecha_publicacion >= CURRENT_DATE - 30)                           AS impacto_eco_medio,
            AVG(score_impacto_empresas) FILTER (
                WHERE fecha_publicacion >= CURRENT_DATE - 30)                           AS impacto_emp_medio
        FROM legislation
    """)
    r = await db.execute(q)
    row = r.mappings().fetchone()
    return dict(row) if row else {}


# ──────────────────────────────────────────────────────────────────────
# Trigger manual de ingesta (desarrollo)
# ──────────────────────────────────────────────────────────────────────
@router.post("/ingest/trigger")
async def trigger_legislation_ingestion(
    fuente: str = Query("boe", description="boe | eurlex | ccaa | all"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dispara manualmente la ingesta de una fuente legislativa."""
    from apps.workers.pipelines.ingestion_pipeline import (
        run_boe_ingestion, run_eurlex_ingestion, run_ccaa_ingestion,
    )
    if fuente == "boe":
        return await run_boe_ingestion(db)
    elif fuente == "eurlex":
        return await run_eurlex_ingestion(db, days=3)
    elif fuente == "ccaa":
        return await run_ccaa_ingestion(db)
    elif fuente == "all":
        boe  = await run_boe_ingestion(db)
        eur  = await run_eurlex_ingestion(db, days=3)
        ccaa = await run_ccaa_ingestion(db)
        return {"boe": boe, "eurlex": eur, "ccaa": ccaa}
    return {"error": f"Fuente desconocida: {fuente}"}
