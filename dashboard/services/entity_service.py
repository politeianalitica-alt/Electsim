"""
Servicio de inteligencia de entidades — capa de acceso al dashboard.

Este modulo es el punto de entrada unico para que TODAS las paginas
del dashboard accedan a los datos generados por el pipeline de
resolucion de identidades (Bloques 1-2-3).

Funciones disponibles para paginas del dashboard:
  get_entity_activity_24h()     — actividad de entidades ultimas 24h
  get_entity_profile(qid)       — perfil enriquecido de una entidad
  get_entity_mentions(qid, ...)  — menciones con filtros
  get_top_entities(...)          — ranking de entidades por menciones
  get_anomaly_alerts(...)        — alertas activas de anomalias
  get_entity_relations(qid, ...) — grafo de relaciones desde/hacia entidad
  get_co_mentioned_entities(...) — co-menciones mas frecuentes
  get_latest_briefing()          — ultimo briefing automatico generado
  get_review_queue()             — cola de revision pendiente (para admin)
  search_entity(query)           — busqueda fuzzy por nombre o alias

Todas las funciones cachean con @st.cache_data (TTL configurable)
y devuelven DataFrames o dicts listos para Plotly / st.dataframe.

Dependencias de BD: entities_canonical, entity_mentions, raw_mentions,
  entity_aliases, resolution_review_queue, entity_graph_edges (fallback),
  entity_anomaly_alerts, client_briefings.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

import pandas as pd

log = logging.getLogger(__name__)

_DB_URL = os.environ.get("DATABASE_URL", "")

# TTL de cache en segundos
_CACHE_TTL_ACTIVITY  = 300    # 5 min — actividad cambia frecuentemente
_CACHE_TTL_PROFILES  = 600    # 10 min
_CACHE_TTL_ALERTS    = 180    # 3 min — alertas requieren frescura
_CACHE_TTL_GRAPH     = 900    # 15 min
_CACHE_TTL_BRIEFINGS = 1800   # 30 min


# ---------------------------------------------------------------------------
# Conexion
# ---------------------------------------------------------------------------

def _conn():
    """Conexion psycopg v3 de corta duracion."""
    import psycopg  # type: ignore
    return psycopg.connect(_DB_URL)


def _tables_exist() -> bool:
    """Verifica que las tablas del pipeline existan."""
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COUNT(*) FROM information_schema.tables
                    WHERE table_name IN ('entities_canonical', 'entity_mentions', 'raw_mentions')
                    """
                )
                count = cur.fetchone()[0]
                return count >= 3
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Actividad 24h
# ---------------------------------------------------------------------------

def get_entity_activity_24h(limit: int = 50) -> pd.DataFrame:
    """
    Devuelve un DataFrame con la actividad de entidades en las ultimas 24h.

    Columnas: qid, nombre_oficial, tipo, cargo_actual,
              mention_count, avg_sentiment, last_seen_at, tone_primary
    """
    if not _tables_exist():
        return pd.DataFrame()

    try:
        sql = """
        SELECT
            ec.qid,
            ec.nombre_oficial,
            ec.tipo,
            ec.cargo_actual,
            COUNT(em.id)       AS mention_count,
            AVG(em.sentiment)  AS avg_sentiment,
            MAX(em.published_at) AS last_seen_at,
            (ec.perfil_json->>'tone_primary') AS tone_primary
        FROM entity_mentions em
        JOIN entities_canonical ec ON ec.qid = em.qid
        WHERE em.published_at >= NOW() - INTERVAL '24 hours'
        GROUP BY ec.qid, ec.nombre_oficial, ec.tipo, ec.cargo_actual, ec.perfil_json
        ORDER BY mention_count DESC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            df = pd.read_sql(sql, conn, params={"limit": limit})
        return df
    except Exception as exc:
        log.warning("get_entity_activity_24h error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Perfil de entidad
# ---------------------------------------------------------------------------

def get_entity_profile(qid: str) -> dict[str, Any]:
    """
    Devuelve el perfil completo de una entidad.

    Incluye: datos basicos + perfil_json (enriquecimiento Bloque 3).
    """
    if not _tables_exist():
        return {}

    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        qid, nombre_oficial, tipo, cargo_actual,
                        partido_qid, pais, perfil_json,
                        created_at, updated_at
                    FROM entities_canonical
                    WHERE qid = %s
                    """,
                    (qid,),
                )
                row = cur.fetchone()
        if row is None:
            return {}
        return {
            "qid":            row[0],
            "nombre_oficial": row[1],
            "tipo":           row[2],
            "cargo_actual":   row[3],
            "partido_qid":    row[4],
            "pais":           row[5],
            "perfil_json":    row[6] or {},
            "created_at":     row[7],
            "updated_at":     row[8],
        }
    except Exception as exc:
        log.warning("get_entity_profile error para %s: %s", qid, exc)
        return {}


# ---------------------------------------------------------------------------
# Menciones de entidad
# ---------------------------------------------------------------------------

def get_entity_mentions(
    qid: str,
    hours: int = 24,
    limit: int = 100,
) -> pd.DataFrame:
    """
    Devuelve las menciones de una entidad en las ultimas N horas.

    Columnas: article_url, published_at, context_window,
              sentiment, tone, resolution_method, resolution_score
    """
    if not _tables_exist():
        return pd.DataFrame()

    try:
        sql = """
        SELECT
            em.article_url,
            em.published_at,
            em.context_window,
            em.sentiment,
            em.tone,
            em.resolution_method,
            em.resolution_score,
            rm.source_media
        FROM entity_mentions em
        LEFT JOIN raw_mentions rm ON rm.id = em.raw_mention_id
        WHERE em.qid = %(qid)s
          AND em.published_at >= NOW() - INTERVAL '%(hours)s hours'
        ORDER BY em.published_at DESC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            df = pd.read_sql(sql, conn, params={"qid": qid, "hours": hours, "limit": limit})
        return df
    except Exception as exc:
        log.warning("get_entity_mentions error para %s: %s", qid, exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Ranking de entidades
# ---------------------------------------------------------------------------

def get_top_entities(
    tipo: Optional[str] = None,
    hours: int = 24,
    limit: int = 20,
) -> pd.DataFrame:
    """
    Ranking de entidades por numero de menciones.

    Args:
      tipo:   'Persona' | 'Partido' | 'Institucion' | None (todos)
      hours:  ventana temporal en horas
      limit:  numero de resultados

    Columnas: rank, qid, nombre_oficial, tipo, mention_count, avg_sentiment
    """
    if not _tables_exist():
        return pd.DataFrame()

    tipo_filter = "AND ec.tipo = %(tipo)s" if tipo else ""
    sql = f"""
    SELECT
        ROW_NUMBER() OVER (ORDER BY COUNT(em.id) DESC) AS rank,
        ec.qid,
        ec.nombre_oficial,
        ec.tipo,
        ec.cargo_actual,
        COUNT(em.id)       AS mention_count,
        AVG(em.sentiment)  AS avg_sentiment,
        (ec.perfil_json->>'tone_primary') AS tone_primary
    FROM entity_mentions em
    JOIN entities_canonical ec ON ec.qid = em.qid
    WHERE em.published_at >= NOW() - INTERVAL '%(hours)s hours'
    {tipo_filter}
    GROUP BY ec.qid, ec.nombre_oficial, ec.tipo, ec.cargo_actual, ec.perfil_json
    ORDER BY mention_count DESC
    LIMIT %(limit)s
    """
    try:
        params: dict = {"hours": hours, "limit": limit}
        if tipo:
            params["tipo"] = tipo
        with _conn() as conn:
            df = pd.read_sql(sql, conn, params=params)
        return df
    except Exception as exc:
        log.warning("get_top_entities error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Alertas de anomalias
# ---------------------------------------------------------------------------

def get_anomaly_alerts(
    hours: int = 48,
    limit: int = 20,
) -> pd.DataFrame:
    """
    Devuelve las alertas de anomalias activas.

    Columnas: qid, nombre_oficial, alert_type, z_score,
              value_current, value_baseline, hypothesis, generated_at
    """
    try:
        sql = """
        SELECT
            qid, nombre_oficial, alert_type, z_score,
            value_current, value_baseline, hypothesis, generated_at
        FROM entity_anomaly_alerts
        WHERE generated_at >= NOW() - INTERVAL '%(hours)s hours'
          AND activa = TRUE
        ORDER BY ABS(z_score) DESC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            df = pd.read_sql(sql, conn, params={"hours": hours, "limit": limit})
        return df
    except Exception as exc:
        log.debug("get_anomaly_alerts: %s (tabla puede no existir aun)", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Relaciones (grafo)
# ---------------------------------------------------------------------------

def get_entity_relations(
    qid: str,
    hours: int = 168,   # 7 dias
    limit: int = 50,
) -> pd.DataFrame:
    """
    Devuelve las relaciones del grafo de poder para una entidad.
    Intenta Neo4j primero; fallback a entity_graph_edges en PostgreSQL.

    Columnas: source_qid, target_qid, rel_type, peso, sentimiento,
              ultimo_at, ultimo_url
    """
    # Intentar Neo4j
    neo4j_df = _get_relations_neo4j(qid, limit)
    if neo4j_df is not None and not neo4j_df.empty:
        return neo4j_df

    # Fallback PostgreSQL
    return _get_relations_postgres(qid, hours, limit)


def _get_relations_neo4j(qid: str, limit: int) -> Optional[pd.DataFrame]:
    """Obtiene relaciones desde Neo4j."""
    try:
        from neo4j import GraphDatabase  # type: ignore
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_pass = os.getenv("NEO4J_PASSWORD", "password")

        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_pass))
        driver.verify_connectivity()

        records = []
        with driver.session() as session:
            result = session.run(
                """
                MATCH (a:Entidad {qid: $qid})-[r:RELACION]-(b:Entidad)
                RETURN a.qid AS source_qid, b.qid AS target_qid,
                       r.tipo AS rel_type, r.peso AS peso,
                       r.sentimiento AS sentimiento,
                       r.ultimo_at AS ultimo_at, r.ultimo_articulo AS ultimo_url
                ORDER BY r.peso DESC
                LIMIT $limit
                """,
                qid=qid, limit=limit,
            )
            records = [dict(r) for r in result]
        driver.close()
        return pd.DataFrame(records) if records else pd.DataFrame()
    except Exception:
        return None


def _get_relations_postgres(qid: str, hours: int, limit: int) -> pd.DataFrame:
    """Obtiene relaciones desde entity_graph_edges (fallback)."""
    try:
        sql = """
        SELECT source_qid, target_qid, rel_type, peso, sentimiento,
               ultimo_at, ultimo_url
        FROM entity_graph_edges
        WHERE source_qid = %(qid)s OR target_qid = %(qid)s
        ORDER BY peso DESC, ultimo_at DESC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            return pd.read_sql(sql, conn, params={"qid": qid, "limit": limit})
    except Exception as exc:
        log.debug("get_entity_relations postgres fallback error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Co-menciones
# ---------------------------------------------------------------------------

def get_co_mentioned_entities(
    qid: str,
    hours: int = 24,
    limit: int = 10,
) -> pd.DataFrame:
    """
    Devuelve las entidades mas frecuentemente co-mencionadas con qid.

    Columnas: co_qid, nombre_oficial, tipo, co_count
    """
    if not _tables_exist():
        return pd.DataFrame()

    try:
        sql = """
        SELECT
            sub.co_qid,
            ec.nombre_oficial,
            ec.tipo,
            COUNT(*) AS co_count
        FROM (
            SELECT jsonb_array_elements_text(co_entities) AS co_qid
            FROM entity_mentions
            WHERE qid = %(qid)s
              AND published_at >= NOW() - INTERVAL '%(hours)s hours'
              AND co_entities IS NOT NULL
              AND co_entities != '[]'::jsonb
        ) sub
        JOIN entities_canonical ec ON ec.qid = sub.co_qid
        WHERE sub.co_qid != %(qid)s
        GROUP BY sub.co_qid, ec.nombre_oficial, ec.tipo
        ORDER BY co_count DESC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            return pd.read_sql(sql, conn, params={"qid": qid, "hours": hours, "limit": limit})
    except Exception as exc:
        log.warning("get_co_mentioned_entities error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Ultimo briefing
# ---------------------------------------------------------------------------

def get_latest_briefing() -> dict[str, Any]:
    """
    Devuelve el ultimo briefing automatico generado.
    Keys: titulo, periodo, contenido_md, resumen_ejecutivo, generated_at
    """
    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT titulo, periodo, contenido_md, resumen_ejecutivo, generated_at
                    FROM client_briefings
                    ORDER BY generated_at DESC
                    LIMIT 1
                    """
                )
                row = cur.fetchone()
        if row is None:
            return {}
        return {
            "titulo":             row[0],
            "periodo":            row[1],
            "contenido_md":       row[2],
            "resumen_ejecutivo":  row[3],
            "generated_at":       row[4],
        }
    except Exception as exc:
        log.debug("get_latest_briefing: %s", exc)
        return {}


# ---------------------------------------------------------------------------
# Cola de revision (para paginas admin)
# ---------------------------------------------------------------------------

def get_review_queue(limit: int = 50) -> pd.DataFrame:
    """
    Devuelve las menciones pendientes de revision humana.

    Columnas: id, surface_text, context_window, candidates,
              max_score, created_at, article_url, source_media
    """
    try:
        sql = """
        SELECT
            rrq.id,
            rrq.surface_text,
            rrq.context_window,
            rrq.candidates,
            rrq.max_score,
            rrq.created_at,
            rm.article_url,
            rm.source_media
        FROM resolution_review_queue rrq
        JOIN raw_mentions rm ON rm.id = rrq.raw_mention_id
        WHERE rrq.status = 'pending'
        ORDER BY rrq.max_score ASC, rrq.created_at ASC
        LIMIT %(limit)s
        """
        with _conn() as conn:
            return pd.read_sql(sql, conn, params={"limit": limit})
    except Exception as exc:
        log.debug("get_review_queue error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Busqueda fuzzy de entidades
# ---------------------------------------------------------------------------

def search_entity(query: str, limit: int = 10) -> pd.DataFrame:
    """
    Busqueda fuzzy por nombre o alias usando pg_trgm similarity.

    Columnas: qid, nombre_oficial, tipo, cargo_actual, similarity
    """
    if not query or len(query) < 2:
        return pd.DataFrame()

    try:
        sql = """
        SELECT DISTINCT
            ec.qid,
            ec.nombre_oficial,
            ec.tipo,
            ec.cargo_actual,
            similarity(ea.alias_norm, %(query)s) AS sim_score
        FROM entity_aliases ea
        JOIN entities_canonical ec ON ec.id = ea.entity_id
        WHERE ea.alias_norm %% %(query)s
           OR ec.nombre_oficial ILIKE %(like_query)s
        ORDER BY sim_score DESC, ec.nombre_oficial
        LIMIT %(limit)s
        """
        with _conn() as conn:
            return pd.read_sql(
                sql, conn,
                params={
                    "query": query.lower(),
                    "like_query": f"%{query}%",
                    "limit": limit,
                },
            )
    except Exception as exc:
        log.debug("search_entity error: %s", exc)
        # Fallback: busqueda exacta sin trigrama
        try:
            sql_simple = """
            SELECT qid, nombre_oficial, tipo, cargo_actual, 1.0 AS sim_score
            FROM entities_canonical
            WHERE nombre_oficial ILIKE %(like_query)s
            LIMIT %(limit)s
            """
            with _conn() as conn:
                return pd.read_sql(sql_simple, conn, params={"like_query": f"%{query}%", "limit": limit})
        except Exception:
            return pd.DataFrame()


# ---------------------------------------------------------------------------
# Serie temporal de menciones (para graficos de tendencia)
# ---------------------------------------------------------------------------

def get_mention_timeseries(
    qid: str,
    days: int = 14,
    granularity: str = "day",
) -> pd.DataFrame:
    """
    Serie temporal de menciones y sentimiento medio para una entidad.

    Args:
      qid:          QID de la entidad
      days:         ventana historica en dias
      granularity:  'hour' | 'day'

    Columnas: periodo, mention_count, avg_sentiment
    """
    if not _tables_exist():
        return pd.DataFrame()

    trunc = "hour" if granularity == "hour" else "day"
    try:
        sql = f"""
        SELECT
            DATE_TRUNC('{trunc}', published_at) AS periodo,
            COUNT(*) AS mention_count,
            AVG(sentiment) AS avg_sentiment
        FROM entity_mentions
        WHERE qid = %(qid)s
          AND published_at >= NOW() - INTERVAL '%(days)s days'
        GROUP BY periodo
        ORDER BY periodo
        """
        with _conn() as conn:
            return pd.read_sql(sql, conn, params={"qid": qid, "days": days})
    except Exception as exc:
        log.warning("get_mention_timeseries error: %s", exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Estadisticas globales del pipeline (para el Command Center / D0)
# ---------------------------------------------------------------------------

def get_pipeline_stats() -> dict[str, Any]:
    """
    Devuelve estadisticas del estado del pipeline de resolucion.

    Util para el Command Center y para debugging.
    """
    stats: dict[str, Any] = {
        "entities_canonical": 0,
        "raw_mentions_total": 0,
        "raw_mentions_resolved": 0,
        "raw_mentions_pending": 0,
        "entity_mentions_total": 0,
        "review_queue_pending": 0,
        "anomaly_alerts_active": 0,
        "briefings_total": 0,
        "pipeline_available": False,
    }

    if not _tables_exist():
        return stats

    try:
        with _conn() as conn:
            with conn.cursor() as cur:
                queries = {
                    "entities_canonical":   "SELECT COUNT(*) FROM entities_canonical",
                    "raw_mentions_total":   "SELECT COUNT(*) FROM raw_mentions",
                    "raw_mentions_resolved":"SELECT COUNT(*) FROM raw_mentions WHERE resolved_qid IS NOT NULL",
                    "raw_mentions_pending": "SELECT COUNT(*) FROM raw_mentions WHERE processed = FALSE",
                    "entity_mentions_total":"SELECT COUNT(*) FROM entity_mentions",
                }
                for key, sql in queries.items():
                    try:
                        cur.execute(sql)
                        stats[key] = cur.fetchone()[0]
                    except Exception:
                        pass

                # Tablas opcionales (pueden no existir aun)
                for key, sql in {
                    "review_queue_pending":  "SELECT COUNT(*) FROM resolution_review_queue WHERE status='pending'",
                    "anomaly_alerts_active": "SELECT COUNT(*) FROM entity_anomaly_alerts WHERE activa=TRUE",
                    "briefings_total":       "SELECT COUNT(*) FROM client_briefings",
                }.items():
                    try:
                        cur.execute(sql)
                        stats[key] = cur.fetchone()[0]
                    except Exception:
                        stats[key] = 0

        stats["pipeline_available"] = True
    except Exception as exc:
        log.warning("get_pipeline_stats error: %s", exc)

    return stats


# ---------------------------------------------------------------------------
# Trigger manual del pipeline completo (desde dashboard)
# ---------------------------------------------------------------------------

def run_full_pipeline(
    max_articles: int = 200,
    seed_aliases: bool = True,
) -> dict[str, Any]:
    """
    Ejecuta Bloque 1 + Bloque 2 + Bloque 3 en secuencia.
    Disenado para ser invocado desde el dashboard con un boton.

    Returns:
      Diccionario con estadisticas de cada bloque.
    """
    result: dict[str, Any] = {
        "bloque_1": {},
        "bloque_2": {},
        "bloque_3": {},
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        from agents.entity_resolution.pipeline import run_extraction
        result["bloque_1"] = run_extraction(
            max_articles=max_articles,
            seed_aliases=seed_aliases,
        )
    except Exception as exc:
        log.error("Error en Bloque 1: %s", exc)
        result["bloque_1"] = {"error": str(exc)}

    try:
        from agents.resolution.pipeline import run_resolution
        result["bloque_2"] = run_resolution()
    except Exception as exc:
        log.error("Error en Bloque 2: %s", exc)
        result["bloque_2"] = {"error": str(exc)}

    try:
        from agents.enrichment.pipeline import run_enrichment
        result["bloque_3"] = run_enrichment()
    except Exception as exc:
        log.error("Error en Bloque 3: %s", exc)
        result["bloque_3"] = {"error": str(exc)}

    result["finished_at"] = datetime.now(timezone.utc).isoformat()
    return result
