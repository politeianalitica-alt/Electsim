"""
Block 2 — FastAPI endpoints para Actores, Organizaciones y Señales.

/api/v1/actors    — personas públicas monitorizadas
/api/v1/actors/organizaciones — organizaciones
/api/v1/actors/signals — señales activas del sistema
/api/v1/actors/relaciones — grafo de relaciones
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db

router = APIRouter(prefix="/api/v1/actors", tags=["actors"])


# ──────────────────────────────────────────────────────────────────────
# Personas públicas
# ──────────────────────────────────────────────────────────────────────
@router.get("")
async def list_actors(
    partido:  str = Query(None),
    tipo:     str = Query(None, description="politico | empresario | diplomatico | experto"),
    ambito:   str = Query(None, description="nacional | autonomico | europeo | municipal"),
    q:        str = Query(None, description="búsqueda por nombre"),
    activo:   bool = Query(True),
    limit:    int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista actores políticos con scores de influencia y sentimiento."""
    filters = ["activo = :activo"]
    params: dict[str, Any] = {"activo": activo, "limit": limit}

    if partido:
        filters.append("partido ILIKE :partido")
        params["partido"] = f"%{partido}%"
    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if ambito:
        filters.append("ambito = :ambito")
        params["ambito"] = ambito
    if q:
        filters.append("nombre_norm ILIKE :q OR nombre_completo ILIKE :q")
        params["q"] = f"%{q}%"

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT id::text AS id, nombre_completo, tipo, activo,
               cargo_actual, partido, circunscripcion, ambito,
               foto_url, wikidata_id,
               score_influencia, score_riesgo,
               sentimiento_actual, tendencia_sentimiento,
               ultima_mencion_media,
               created_at, updated_at
        FROM persona_publica
        WHERE {where}
        ORDER BY score_influencia DESC, nombre_completo ASC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


@router.get("/top")
async def get_top_actors(
    n:     int  = Query(10, ge=1, le=50),
    campo: str  = Query("influencia", description="influencia | riesgo"),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Top N actores por score de influencia o riesgo."""
    col = "score_influencia" if campo == "influencia" else "score_riesgo"
    r = await db.execute(text(f"""
        SELECT id::text AS id, nombre_completo, partido, cargo_actual,
               score_influencia, score_riesgo,
               sentimiento_actual, tendencia_sentimiento, foto_url
        FROM persona_publica
        WHERE activo = true
        ORDER BY {col} DESC NULLS LAST
        LIMIT :n
    """), {"n": n})
    return [dict(row) for row in r.mappings()]


@router.get("/{actor_id}")
async def get_actor_detail(
    actor_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Detalle completo de un actor con menciones recientes y relaciones."""
    r = await db.execute(text("""
        SELECT id::text AS id, nombre_completo, tipo, activo,
               cargo_actual, partido, circunscripcion, ambito,
               pais_origen, fecha_nac, foto_url,
               wikidata_id, congreso_id, opensanctions_id,
               score_influencia, score_riesgo,
               sentimiento_actual, tendencia_sentimiento,
               ultima_mencion_media, created_at, updated_at
        FROM persona_publica
        WHERE id = :id
    """), {"id": actor_id})
    row = r.mappings().fetchone()
    if not row:
        return {}

    result = dict(row)

    # Relaciones
    r2 = await db.execute(text("""
        SELECT
            rp.tipo_relacion,
            rp.peso,
            rp.elemento_b_id,
            rp.elemento_b_tipo,
            CASE rp.elemento_b_tipo
                WHEN 'persona'
                    THEN (SELECT nombre_completo FROM persona_publica WHERE id::text = rp.elemento_b_id)
                WHEN 'organizacion'
                    THEN (SELECT nombre FROM organizacion WHERE id::text = rp.elemento_b_id)
                ELSE rp.elemento_b_id
            END AS nombre_entidad_b
        FROM relacion_politeia rp
        WHERE rp.elemento_a_id = :id AND rp.activa = true
        ORDER BY rp.peso DESC
        LIMIT 20
    """), {"id": actor_id})
    result["relaciones"] = [dict(r) for r in r2.mappings()]

    # Posts sociales recientes con mención
    r3 = await db.execute(text("""
        SELECT platform, url, texto, sentiment, n_views, publicado_en
        FROM social_post
        WHERE texto_norm ILIKE '%' || (
            SELECT nombre_norm FROM persona_publica WHERE id = :id
        ) || '%'
        ORDER BY publicado_en DESC
        LIMIT 5
    """), {"id": actor_id})
    result["menciones_recientes"] = [dict(r) for r in r3.mappings()]

    # Señales activas que involucran este actor
    r4 = await db.execute(text("""
        SELECT id::text, tipo, urgencia, titulo, resumen, created_at
        FROM signal_politeia
        WHERE :id = ANY(personas)
          AND activa = true
        ORDER BY urgencia DESC, created_at DESC
        LIMIT 5
    """), {"id": actor_id})
    result["señales_activas"] = [dict(r) for r in r4.mappings()]

    return result


# ──────────────────────────────────────────────────────────────────────
# Organizaciones
# ──────────────────────────────────────────────────────────────────────
@router.get("/organizaciones/lista")
async def list_organizaciones(
    tipo:    str = Query(None, description="partido | empresa | ministerio | think_tank | medio"),
    sector:  str = Query(None),
    ibex35:  bool = Query(None),
    q:       str = Query(None),
    limit:   int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Lista organizaciones con score de influencia."""
    filters = ["activa = true"]
    params: dict[str, Any] = {"limit": limit}

    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if sector:
        filters.append("sector ILIKE :sector")
        params["sector"] = f"%{sector}%"
    if ibex35 is not None:
        filters.append("ibex35 = :ibex35")
        params["ibex35"] = ibex35
    if q:
        filters.append("nombre ILIKE :q")
        params["q"] = f"%{q}%"

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT id::text AS id, nombre, tipo, cif, pais,
               sector, ibex35, sede_ccaa,
               score_influencia, n_personas_clave,
               facturacion_m, empleados,
               created_at, updated_at
        FROM organizacion
        WHERE {where}
        ORDER BY score_influencia DESC, nombre ASC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


# ──────────────────────────────────────────────────────────────────────
# Señales del sistema
# ──────────────────────────────────────────────────────────────────────
@router.get("/signals/activas")
async def get_active_signals(
    tipo:     str = Query(None),
    urgencia: int = Query(None, ge=1, le=5, description="mínima urgencia"),
    leida:    bool = Query(False),
    limit:    int = Query(30, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Señales activas del motor de inteligencia."""
    filters = ["activa = true"]
    params: dict[str, Any] = {"limit": limit}

    if tipo:
        filters.append("tipo = :tipo")
        params["tipo"] = tipo
    if urgencia:
        filters.append("urgencia >= :urgencia")
        params["urgencia"] = urgencia
    if not leida:
        filters.append("leida = false")

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT id::text AS id, tipo, urgencia, titulo, resumen,
               personas, orgs, modulo_origen, url_fuente,
               leida, activa, created_at
        FROM signal_politeia
        WHERE {where}
        ORDER BY urgencia DESC, created_at DESC
        LIMIT :limit
    """), params)
    return [dict(row) for row in r.mappings()]


@router.post("/signals/{signal_id}/marcar-leida")
async def mark_signal_read(
    signal_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Marca una señal como leída."""
    await db.execute(
        text("UPDATE signal_politeia SET leida = true WHERE id = :id"),
        {"id": signal_id},
    )
    await db.commit()
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────
# Grafo de relaciones
# ──────────────────────────────────────────────────────────────────────
@router.get("/grafo/relaciones")
async def get_relationship_graph(
    tipo_relacion: str = Query(None, description="coocurrencia | miembro | alianza | oposicion"),
    min_peso:      float = Query(1.0),
    limit:         int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Retorna grafo (nodos + aristas) para visualización de red de actores."""
    filters = ["activa = true", "peso >= :min_peso"]
    params: dict[str, Any] = {"min_peso": min_peso, "limit": limit}

    if tipo_relacion:
        filters.append("tipo_relacion = :tipo")
        params["tipo"] = tipo_relacion

    where = " AND ".join(filters)
    r = await db.execute(text(f"""
        SELECT elemento_a_id, elemento_a_tipo, tipo_relacion,
               elemento_b_id, elemento_b_tipo, peso
        FROM relacion_politeia
        WHERE {where}
        ORDER BY peso DESC
        LIMIT :limit
    """), params)
    edges = [dict(row) for row in r.mappings()]

    # Collect unique node IDs per type
    node_ids: dict[str, set] = {"persona": set(), "organizacion": set()}
    for e in edges:
        for side in ("a", "b"):
            nid = e[f"elemento_{side}_id"]
            ntype = e[f"elemento_{side}_tipo"]
            if ntype in node_ids:
                node_ids[ntype].add(nid)

    nodes: list[dict] = []

    if node_ids["persona"]:
        ids_str = ", ".join(f"'{i}'" for i in node_ids["persona"])
        r2 = await db.execute(text(f"""
            SELECT id::text AS id, nombre_completo AS label,
                   partido, score_influencia, 'persona' AS tipo
            FROM persona_publica
            WHERE id::text IN ({ids_str})
        """))
        nodes.extend(dict(row) for row in r2.mappings())

    if node_ids["organizacion"]:
        ids_str = ", ".join(f"'{i}'" for i in node_ids["organizacion"])
        r3 = await db.execute(text(f"""
            SELECT id::text AS id, nombre AS label,
                   tipo AS subtipo, score_influencia, 'organizacion' AS tipo
            FROM organizacion
            WHERE id::text IN ({ids_str})
        """))
        nodes.extend(dict(row) for row in r3.mappings())

    return {"nodes": nodes, "edges": edges}


# ──────────────────────────────────────────────────────────────────────
# KPIs del dashboard
# ──────────────────────────────────────────────────────────────────────
@router.get("/estadisticas/dashboard")
async def get_actors_dashboard(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """KPIs consolidados para el panel de actores."""
    r = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE activo = true)                    AS actores_activos,
            COUNT(*) FILTER (WHERE score_riesgo >= 7 AND activo)     AS actores_riesgo_alto,
            COUNT(*) FILTER (WHERE sentimiento_actual < -0.5)        AS con_sentimiento_negativo,
            COUNT(*) FILTER (WHERE tendencia_sentimiento = 'bajando') AS tendencia_bajando,
            AVG(score_influencia) FILTER (WHERE activo = true)        AS influencia_media,
            COUNT(DISTINCT partido) FILTER (WHERE activo = true)      AS n_partidos
        FROM persona_publica
    """))
    pp_kpis = dict(r.mappings().fetchone() or {})

    r2 = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE activa = true AND leida = false)  AS señales_sin_leer,
            COUNT(*) FILTER (WHERE urgencia >= 4 AND activa = true)  AS señales_criticas,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS señales_hoy
        FROM signal_politeia
    """))
    sig_kpis = dict(r2.mappings().fetchone() or {})

    r3 = await db.execute(text("""
        SELECT COUNT(*) AS n_orgs,
               COUNT(*) FILTER (WHERE ibex35 = true) AS n_ibex35
        FROM organizacion
        WHERE activa = true
    """))
    org_kpis = dict(r3.mappings().fetchone() or {})

    return {**pp_kpis, **sig_kpis, **org_kpis}


# ──────────────────────────────────────────────────────────────────────
# Trigger manual del signal engine
# ──────────────────────────────────────────────────────────────────────
@router.post("/signals/run-engine")
async def trigger_signal_engine(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Dispara manualmente el motor de señales."""
    from apps.workers.connectors.signal_engine import run_signal_engine
    return await run_signal_engine(db)
