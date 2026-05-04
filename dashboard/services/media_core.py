"""
Servicio dashboard — Core Medios & Narrativa.

Capa de acceso a datos para D7_Medios.py y agents/tools/media_tools.py.
Nunca importa el ETL directamente — todo a través de SQL seguro.

Convenciones:
  - Todas las funciones retornan DataFrame o dict vacío si no hay BD.
  - _safe_read_sql absorbe cualquier excepción de BD.
  - Los campos se normalizan a nombres legacy para compatibilidad con D7.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# ── Helper seguro de SQL ──────────────────────────────────────────────────────

def _get_engine() -> Any:
    """Obtiene el engine SQLAlchemy (lazy)."""
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        try:
            from database import get_engine  # type: ignore
            return get_engine()
        except Exception:
            return None


def _safe_read_sql(query: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve DataFrame. Retorna vacío si falla."""
    try:
        from sqlalchemy import text as sa_text
        engine = _get_engine()
        if engine is None:
            return pd.DataFrame()
        with engine.connect() as conn:
            result = conn.execute(sa_text(query), params or {})
            rows = result.fetchall()
            cols = list(result.keys())
            return pd.DataFrame(rows, columns=cols)
    except Exception as exc:
        logger.debug("_safe_read_sql error: %s", exc)
        return pd.DataFrame()


# ── Funciones públicas ────────────────────────────────────────────────────────

def cargar_media_items_recientes(
    limit: int = 100,
    hours: int = 24,
    source_filter: str | None = None,
    topic_filter: str | None = None,
) -> pd.DataFrame:
    """
    Retorna artículos recientes desde media_items.

    Returns:
        DataFrame con: id, source, source_region, title, url, published_at,
        summary, sentiment_label, sentiment_score, topics, narrative_cluster_id.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    query = """
        SELECT
            id, source, source_region, source_country,
            source_lat, source_lon,
            title, url, published_at, author, summary,
            sentiment_label, sentiment_score, emotion_label, toxicity_score,
            actors, parties, topics, narrative_cluster_id, impact_level,
            fetched_at
        FROM media_items
        WHERE fetched_at >= :cutoff
        {source_clause}
        {topic_clause}
        ORDER BY fetched_at DESC
        LIMIT :limit
    """
    source_clause = "AND source = :source" if source_filter else ""
    topic_clause = "AND :topic = ANY(topics)" if topic_filter else ""
    query = query.format(source_clause=source_clause, topic_clause=topic_clause)

    params: dict[str, Any] = {"cutoff": cutoff, "limit": limit}
    if source_filter:
        params["source"] = source_filter
    if topic_filter:
        params["topic"] = topic_filter

    return _safe_read_sql(query, params)


def cargar_kpis_medios() -> dict[str, Any]:
    """
    Retorna KPIs del módulo de medios.

    Returns:
        dict con: hay_datos, articulos_hoy, articulos_24h, fuentes_activas,
                  narrativas_activas, toxicidad_media, sentimiento_medio.
    """
    base: dict[str, Any] = {
        "hay_datos": False,
        "articulos_hoy": 0,
        "articulos_24h": 0,
        "fuentes_activas": 0,
        "narrativas_activas": 0,
        "toxicidad_media": 0.0,
        "sentimiento_medio": 0.0,
    }
    try:
        cutoff_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        cutoff_hoy = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

        df = _safe_read_sql("""
            SELECT
                COUNT(*) FILTER (WHERE fetched_at >= :cutoff_hoy) AS articulos_hoy,
                COUNT(*) FILTER (WHERE fetched_at >= :cutoff_24h) AS articulos_24h,
                COUNT(DISTINCT source) FILTER (WHERE fetched_at >= :cutoff_24h) AS fuentes_activas,
                COUNT(DISTINCT narrative_cluster_id) FILTER (
                    WHERE fetched_at >= :cutoff_24h AND narrative_cluster_id IS NOT NULL
                ) AS narrativas_activas,
                AVG(toxicity_score) FILTER (WHERE fetched_at >= :cutoff_24h) AS toxicidad_media,
                AVG(sentiment_score) FILTER (WHERE fetched_at >= :cutoff_24h) AS sentimiento_medio
            FROM media_items
        """, {"cutoff_24h": cutoff_24h, "cutoff_hoy": cutoff_hoy})

        if not df.empty:
            r = df.iloc[0]
            base.update({
                "hay_datos": (r.get("articulos_24h") or 0) > 0,
                "articulos_hoy": int(r.get("articulos_hoy") or 0),
                "articulos_24h": int(r.get("articulos_24h") or 0),
                "fuentes_activas": int(r.get("fuentes_activas") or 0),
                "narrativas_activas": int(r.get("narrativas_activas") or 0),
                "toxicidad_media": round(float(r.get("toxicidad_media") or 0), 3),
                "sentimiento_medio": round(float(r.get("sentimiento_medio") or 0), 3),
            })
    except Exception as exc:
        logger.debug("cargar_kpis_medios error: %s", exc)
    return base


def cargar_narrativas_activas(
    hours: int = 48,
    limit: int = 15,
    min_volume: int = 1,
) -> pd.DataFrame:
    """
    Retorna narrativas activas con volumen y sentimiento.

    Returns:
        DataFrame con: cluster_id, nombre, marco, tension, volume,
        sentiment_avg, risk_level, growth_rate.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    df = _safe_read_sql("""
        SELECT
            mi.narrative_cluster_id AS cluster_id,
            COUNT(*) AS volume,
            AVG(mi.sentiment_score) AS sentiment_avg,
            MAX(mi.fetched_at) AS last_seen
        FROM media_items mi
        WHERE mi.fetched_at >= :cutoff
          AND mi.narrative_cluster_id IS NOT NULL
        GROUP BY mi.narrative_cluster_id
        HAVING COUNT(*) >= :min_volume
        ORDER BY volume DESC
        LIMIT :limit
    """, {"cutoff": cutoff, "min_volume": min_volume, "limit": limit})

    if df.empty:
        return df

    # Enriquecer con metadatos de fingerprints (sin BD extra)
    try:
        from etl.sources.media.narrative_clusterer import NARRATIVA_FINGERPRINTS
        fp_map = {fp["id"]: fp for fp in NARRATIVA_FINGERPRINTS}
        df["nombre"] = df["cluster_id"].map(lambda cid: fp_map.get(cid, {}).get("nombre", cid))
        df["marco"] = df["cluster_id"].map(lambda cid: fp_map.get(cid, {}).get("marco", ""))
        df["tension"] = df["cluster_id"].map(lambda cid: fp_map.get(cid, {}).get("tension", "baja"))
    except Exception:
        df["nombre"] = df["cluster_id"]
        df["marco"] = ""
        df["tension"] = "baja"

    return df


def cargar_actor_sentiment(
    actor_name: str,
    hours: int = 168,
) -> pd.DataFrame:
    """
    Retorna evolución temporal del sentimiento para un actor.

    Returns:
        DataFrame con: published_at, sentiment_score, title, source.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    return _safe_read_sql("""
        SELECT mi.published_at, mi.sentiment_score, mi.title, mi.source
        FROM media_items mi
        JOIN media_actor_mentions mam ON mam.content_hash = mi.content_hash
        WHERE mam.actor_name = :actor
          AND mi.published_at >= :cutoff
        ORDER BY mi.published_at ASC
        LIMIT 200
    """, {"actor": actor_name, "cutoff": cutoff})


def cargar_mapa_fuentes(hours: int = 24) -> pd.DataFrame:
    """
    Retorna datos geográficos de las fuentes activas para el mapa.

    Returns:
        DataFrame con: source, source_lat, source_lon, source_country,
        source_region, n_articles, avg_sentiment.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    return _safe_read_sql("""
        SELECT
            source,
            source_lat,
            source_lon,
            source_country,
            source_region,
            COUNT(*) AS n_articles,
            AVG(sentiment_score) AS avg_sentiment,
            MAX(fetched_at) AS last_fetched
        FROM media_items
        WHERE fetched_at >= :cutoff
          AND source_lat IS NOT NULL
        GROUP BY source, source_lat, source_lon, source_country, source_region
        ORDER BY n_articles DESC
    """, {"cutoff": cutoff})


def buscar_media_items(
    query: str,
    limit: int = 20,
    hours: int = 168,
) -> pd.DataFrame:
    """
    Búsqueda full-text en title, summary y topics de artículos recientes.

    Returns:
        DataFrame con: id, source, title, url, published_at,
        sentiment_label, narrative_cluster_id.
    """
    if not query or not query.strip():
        return pd.DataFrame()
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    q = f"%{query.lower()}%"
    return _safe_read_sql("""
        SELECT id, source, title, url, published_at,
               sentiment_label, sentiment_score, narrative_cluster_id, fetched_at
        FROM media_items
        WHERE fetched_at >= :cutoff
          AND (LOWER(title) LIKE :q OR LOWER(summary) LIKE :q)
        ORDER BY fetched_at DESC
        LIMIT :limit
    """, {"cutoff": cutoff, "q": q, "limit": limit})


def cargar_alertas_medios(hours: int = 24) -> pd.DataFrame:
    """
    Retorna artículos con toxicidad alta o narrativa de tensión alta.

    Returns:
        DataFrame con: source, title, url, toxicity_score,
        narrative_cluster_id, fetched_at.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    return _safe_read_sql("""
        SELECT source, title, url, toxicity_score,
               sentiment_score, narrative_cluster_id, fetched_at
        FROM media_items
        WHERE fetched_at >= :cutoff
          AND (toxicity_score >= 0.6
               OR narrative_cluster_id IN ('corrupcion', 'inmigracion', 'independentismo', 'polarizacion'))
        ORDER BY toxicity_score DESC NULLS LAST, fetched_at DESC
        LIMIT 50
    """, {"cutoff": cutoff})


def cargar_timeline_narrativa(
    cluster_id: str,
    days: int = 7,
) -> pd.DataFrame:
    """
    Retorna evolución diaria de volumen para un cluster narrativo.

    Returns:
        DataFrame con: fecha, n_articulos, avg_sentiment.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    return _safe_read_sql("""
        SELECT
            DATE(published_at AT TIME ZONE 'Europe/Madrid') AS fecha,
            COUNT(*) AS n_articulos,
            AVG(sentiment_score) AS avg_sentiment
        FROM media_items
        WHERE narrative_cluster_id = :cluster_id
          AND published_at >= :cutoff
        GROUP BY 1
        ORDER BY 1 ASC
    """, {"cluster_id": cluster_id, "cutoff": cutoff})


def cargar_top_actores_medios(hours: int = 48, limit: int = 20) -> pd.DataFrame:
    """
    Retorna los actores más mencionados en medios en las últimas N horas.

    Returns:
        DataFrame con: actor_name, actor_type, total_mentions, n_articles, avg_confidence.
    """
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    return _safe_read_sql("""
        SELECT
            mam.actor_name,
            mam.actor_type,
            SUM(mam.mention_count) AS total_mentions,
            COUNT(DISTINCT mam.content_hash) AS n_articles,
            AVG(mam.confidence) AS avg_confidence
        FROM media_actor_mentions mam
        JOIN media_items mi ON mi.content_hash = mam.content_hash
        WHERE mi.fetched_at >= :cutoff
        GROUP BY mam.actor_name, mam.actor_type
        ORDER BY total_mentions DESC
        LIMIT :limit
    """, {"cutoff": cutoff, "limit": limit})
