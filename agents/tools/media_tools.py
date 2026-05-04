"""
Tools de medios & narrativa para Politeia Brain / agentes IA.

Puente entre el Core de Medios y el sistema de agentes.
Cada función devuelve datos normalizados listos para consumo LLM.

Conecta con:
    dashboard.services.media_core   (datos BD)
    etl.sources.media.*             (enriquecimiento en tiempo real)
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def search_media_items(
    query: str,
    limit: int = 10,
    hours: int = 168,
) -> list[dict[str, Any]]:
    """
    Busca artículos de medios por texto libre.

    Args:
        query: texto a buscar en título y resumen.
        limit: máximo de resultados.
        hours: ventana temporal (por defecto 7 días).

    Returns:
        list[dict] con: source, title, url, published_at,
        sentiment_label, narrative_cluster_id.
    """
    try:
        from dashboard.services.media_core import buscar_media_items
        df = buscar_media_items(query, limit=limit, hours=hours)
        if df.empty:
            return []
        return df.fillna("").to_dict("records")
    except Exception as exc:
        logger.warning("search_media_items: %s", exc)
        return []


def get_recent_narratives(
    hours: int = 48,
    limit: int = 12,
    min_volume: int = 2,
) -> list[dict[str, Any]]:
    """
    Retorna las narrativas activas con mayor cobertura mediática.

    Args:
        hours: ventana temporal.
        limit: máximo de narrativas.
        min_volume: volumen mínimo de artículos.

    Returns:
        list[dict] con: cluster_id, nombre, marco, tension,
        volume, sentiment_avg, last_seen.
    """
    try:
        from dashboard.services.media_core import cargar_narrativas_activas
        df = cargar_narrativas_activas(hours=hours, limit=limit, min_volume=min_volume)
        if df.empty:
            return []
        return df.fillna("").to_dict("records")
    except Exception as exc:
        logger.warning("get_recent_narratives: %s", exc)
        return []


def get_actor_media_profile(
    actor_name: str,
    hours: int = 168,
) -> dict[str, Any]:
    """
    Retorna el perfil mediático de un actor: cobertura, sentimiento y narrativas.

    Args:
        actor_name: nombre canónico del actor.
        hours: ventana temporal (por defecto 7 días).

    Returns:
        dict con: actor_name, n_articles, avg_sentiment,
        sentiment_trend (list), narratives (list).
    """
    try:
        from dashboard.services.media_core import cargar_actor_sentiment
        df = cargar_actor_sentiment(actor_name, hours=hours)
        if df.empty:
            return {"actor_name": actor_name, "n_articles": 0, "avg_sentiment": None, "sentiment_trend": [], "narratives": []}

        avg_sent = float(df["sentiment_score"].mean()) if "sentiment_score" in df.columns else None
        trend = [
            {"fecha": str(r.get("published_at", ""))[:10], "score": r.get("sentiment_score")}
            for _, r in df.iterrows()
        ]
        return {
            "actor_name": actor_name,
            "n_articles": len(df),
            "avg_sentiment": round(avg_sent, 3) if avg_sent is not None else None,
            "sentiment_trend": trend[-30:],  # últimas 30 apariciones
            "narratives": [],  # enriquecer en v2
        }
    except Exception as exc:
        logger.warning("get_actor_media_profile: %s", exc)
        return {"actor_name": actor_name, "n_articles": 0, "avg_sentiment": None, "sentiment_trend": [], "narratives": []}


def summarize_narrative(cluster_id: str) -> str:
    """
    Genera un resumen Markdown de una narrativa activa.

    Args:
        cluster_id: ID del cluster (ej. 'crisis_economica').

    Returns:
        str con resumen Markdown o mensaje de error.
    """
    try:
        from etl.sources.media.narrative_clusterer import NARRATIVA_FINGERPRINTS
        fp_map = {fp["id"]: fp for fp in NARRATIVA_FINGERPRINTS}

        if cluster_id not in fp_map:
            return f"_Narrativa '{cluster_id}' no encontrada._"

        fp = fp_map[cluster_id]

        # Artículos recientes de este cluster
        from dashboard.services.media_core import _safe_read_sql
        df = _safe_read_sql("""
            SELECT title, source, published_at, sentiment_label, url
            FROM media_items
            WHERE narrative_cluster_id = :cid
            ORDER BY published_at DESC NULLS LAST
            LIMIT 5
        """, {"cid": cluster_id})

        titulos = ""
        if not df.empty:
            titulos = "\n".join(
                f"- **{r['source']}**: {r['title'][:80]}"
                for _, r in df.iterrows()
            )
        else:
            top_terms = list(fp.get("keywords", {}).keys())[:5]
            titulos = f"_Sin artículos recientes. Términos clave: {', '.join(top_terms)}_"

        return (
            f"## Narrativa: {fp['nombre']}\n\n"
            f"**Marco**: {fp.get('marco', '—')}  \n"
            f"**Tensión**: {fp.get('tension', '—')}  \n"
            f"**Audiencia objetivo**: {fp.get('target', '—')}  \n"
            f"**Sesgo ideológico**: {fp.get('ideologia_dominante', '—')}  \n\n"
            f"### Artículos recientes\n\n{titulos}"
        )
    except Exception as exc:
        logger.debug("summarize_narrative error: %s", exc)
        return f"_Error al resumir narrativa '{cluster_id}': {exc}_"


def get_media_items_for_sector(
    sector: str,
    hours: int = 48,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    Retorna artículos recientes para un sector temático.

    Args:
        sector: nombre del sector (ej. 'economía', 'sanidad', 'vivienda').
        hours: ventana temporal.
        limit: máximo de resultados.

    Returns:
        list[dict] con: source, title, url, published_at, sentiment_label.
    """
    try:
        from dashboard.services.media_core import cargar_media_items_recientes
        df = cargar_media_items_recientes(limit=limit * 3, hours=hours, topic_filter=sector)
        if df.empty:
            return []
        result = df.head(limit).fillna("").to_dict("records")
        return result
    except Exception as exc:
        logger.warning("get_media_items_for_sector: %s", exc)
        return []


def get_media_kpis() -> dict[str, Any]:
    """
    Retorna KPIs del módulo de medios para el agente.

    Returns:
        dict con: hay_datos, articulos_hoy, articulos_24h,
        fuentes_activas, narrativas_activas, toxicidad_media, sentimiento_medio.
    """
    try:
        from dashboard.services.media_core import cargar_kpis_medios
        return cargar_kpis_medios()
    except Exception as exc:
        logger.warning("get_media_kpis: %s", exc)
        return {"hay_datos": False}


def classify_text_narrative(text: str) -> dict[str, Any]:
    """
    Clasifica un texto contra las narrativas definidas.
    Útil para el agente cuando analiza texto externo.

    Args:
        text: texto a clasificar.

    Returns:
        dict con: cluster_id (str|None), nombre (str|None), score (float).
    """
    try:
        from etl.sources.media.narrative_clusterer import (
            assign_fingerprint_cluster,
            NARRATIVA_FINGERPRINTS,
        )
        cluster_id, score = assign_fingerprint_cluster(text)
        if not cluster_id:
            return {"cluster_id": None, "nombre": None, "score": 0.0}

        fp_map = {fp["id"]: fp for fp in NARRATIVA_FINGERPRINTS}
        nombre = fp_map.get(cluster_id, {}).get("nombre", cluster_id)
        return {"cluster_id": cluster_id, "nombre": nombre, "score": score}
    except Exception as exc:
        logger.debug("classify_text_narrative error: %s", exc)
        return {"cluster_id": None, "nombre": None, "score": 0.0}


def fetch_rss_now(
    max_per_source: int = 5,
    region: str | None = None,
) -> list[dict[str, Any]]:
    """
    Descarga feeds RSS ahora directamente (sin BD).
    Útil para el agente en modo tiempo real.

    Args:
        max_per_source: artículos máximos por fuente.
        region: filtrar por región (ej. 'local_spain').

    Returns:
        list[dict] con: source, title, url, published_raw, summary.
    """
    try:
        from etl.sources.media.rss_client import RSSMediaClient
        client = RSSMediaClient()
        raw_items = client.fetch_all(
            max_per_source=max_per_source,
            region_filter=region,
        )
        return [
            {
                "source": item.source,
                "source_region": item.source_region,
                "title": item.title,
                "url": item.url,
                "published_raw": item.published_raw,
                "summary": (item.summary or "")[:200],
            }
            for item in raw_items
        ]
    except Exception as exc:
        logger.warning("fetch_rss_now: %s", exc)
        return []
