"""
Geopolitics Core — Dashboard Service — Bloque 14.

8 funciones cargar_*() para el dashboard de D8_Geopolitica.
Devuelven DataFrames o listas. Nunca rompen.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


# ── Caché Streamlit opcional ──────────────────────────────────────────────────
try:
    import streamlit as st
    _cache = st.cache_data
except Exception:
    def _cache(func=None, ttl=None, **kwargs):  # type: ignore[misc]
        if func is not None:
            return func
        def decorator(f):
            return f
        return decorator


@_cache(ttl=1800)
def cargar_eventos_geopoliticos(
    days_back: int = 30,
    sources: list[str] | None = None,
    severity_filter: list[str] | None = None,
) -> pd.DataFrame:
    """
    Carga eventos geopolíticos recientes de ACLED/GDELT/UCDP.

    Returns:
        DataFrame con columnas: event_id, source, event_type, country,
        country_iso3, event_date, actor_1, actor_2, fatalities, severity, source_url.
    """
    try:
        start_date = date.today() - timedelta(days=days_back)
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        events = fetch_acled_events(start_date=start_date)

        if sources and "ucdp" in sources:
            try:
                from etl.sources.geopolitics.ucdp_client import fetch_ucdp_for_spain_relevant_countries
                events += fetch_ucdp_for_spain_relevant_countries()
            except Exception as exc:
                logger.debug("UCDP load error: %s", exc)

        rows = []
        for ev in events:
            if severity_filter and ev.severity not in severity_filter:
                continue
            rows.append({
                "event_id": ev.event_id,
                "source": ev.source,
                "event_type": ev.event_type,
                "event_subtype": ev.event_subtype,
                "country": ev.country,
                "country_iso3": ev.country_iso3 or "",
                "region": ev.region or "",
                "location_name": ev.location_name or "",
                "lat": ev.lat,
                "lon": ev.lon,
                "event_date": ev.event_date,
                "actor_1": ev.actor_1 or "",
                "actor_2": ev.actor_2 or "",
                "fatalities": ev.fatalities or 0,
                "severity": ev.severity,
                "source_url": ev.source_url or "",
            })
        return pd.DataFrame(rows) if rows else _empty_events_df()
    except Exception as exc:
        logger.warning("cargar_eventos_geopoliticos error: %s", exc)
        return _empty_events_df()


@_cache(ttl=3600)
def cargar_perfiles_riesgo_pais(
    min_score: float = 0.0,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Carga perfiles de riesgo país ordenados por total_score.

    Returns:
        DataFrame con columnas: country_iso3, country_name, total_score,
        conflict_risk, energy_risk, migration_risk, trend, interest_for_spain.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        presence = get_spanish_presence()
        profiles = score_all_countries(events, [], presence)

        rows = []
        for p in profiles:
            if p.total_score < min_score:
                continue
            rows.append({
                "country_iso3": p.country_iso3,
                "country_name": p.country_name,
                "total_score": round(p.total_score, 1),
                "conflict_risk": round(p.conflict_risk, 1),
                "political_risk": round(p.political_risk, 1),
                "economic_risk": round(p.economic_risk, 1),
                "energy_risk": round(p.energy_risk, 1),
                "migration_risk": round(p.migration_risk, 1),
                "defense_risk": round(p.defense_risk, 1),
                "trend": p.trend,
                "interest_for_spain": round(p.interest_for_spain, 1),
                "explanation": p.explanation,
            })
        df = pd.DataFrame(rows[:limit]) if rows else _empty_risk_df()
        return df
    except Exception as exc:
        logger.warning("cargar_perfiles_riesgo_pais error: %s", exc)
        return _empty_risk_df()


@_cache(ttl=1800)
def cargar_alertas_geopoliticas(
    severity_filter: list[str] | None = None,
    alert_type_filter: list[str] | None = None,
) -> pd.DataFrame:
    """
    Carga alertas geopolíticas activas.

    Returns:
        DataFrame con columnas: alert_id, alert_type, country_iso3,
        title, description, severity, affected_modules, created_at.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        presence = get_spanish_presence()
        alerts = detect_signals(events, [], [], presence)

        rows = []
        for a in alerts:
            if severity_filter and a.severity not in severity_filter:
                continue
            if alert_type_filter and a.alert_type not in alert_type_filter:
                continue
            rows.append({
                "alert_id": a.alert_id,
                "alert_type": a.alert_type,
                "country_iso3": a.country_iso3 or "",
                "title": a.title,
                "description": a.description,
                "severity": a.severity,
                "affected_modules": ", ".join(a.affected_modules),
                "created_at": a.created_at,
            })
        return pd.DataFrame(rows) if rows else _empty_alerts_df()
    except Exception as exc:
        logger.warning("cargar_alertas_geopoliticas error: %s", exc)
        return _empty_alerts_df()


@_cache(ttl=3600)
def cargar_presencia_espanola(
    country_iso3: str | None = None,
    category: str | None = None,
) -> pd.DataFrame:
    """
    Carga presencia española en el exterior.

    Returns:
        DataFrame con columnas: presence_id, country_iso3, country_name,
        category, actor_name, description, value, unit, relevance_score.
    """
    try:
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        categories = [category] if category else None
        presence = get_spanish_presence(country_iso3=country_iso3, categories=categories)

        rows = [{
            "presence_id": p.presence_id,
            "country_iso3": p.country_iso3,
            "country_name": p.country_name,
            "category": p.category,
            "actor_name": p.actor_name or "",
            "description": p.description,
            "value": p.value,
            "unit": p.unit or "",
            "source": p.source,
            "relevance_score": round(p.relevance_score, 2),
        } for p in presence]
        return pd.DataFrame(rows) if rows else _empty_presence_df()
    except Exception as exc:
        logger.warning("cargar_presencia_espanola error: %s", exc)
        return _empty_presence_df()


@_cache(ttl=1800)
def cargar_impactos_domesticos(
    severity_filter: list[str] | None = None,
    domain_filter: list[str] | None = None,
) -> pd.DataFrame:
    """
    Carga impactos domésticos estimados en España.

    Returns:
        DataFrame con columnas: impact_id, country_iso3, impact_domain,
        impact_score, severity, time_horizon, explanation.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        presence = get_spanish_presence()
        impacts = estimate_domestic_impacts(events, [], presence, [])

        rows = []
        for i in impacts:
            if severity_filter and i.severity not in severity_filter:
                continue
            if domain_filter and i.impact_domain not in domain_filter:
                continue
            rows.append({
                "impact_id": i.impact_id,
                "country_iso3": i.country_iso3 or "",
                "event_id": i.event_id or "",
                "impact_domain": i.impact_domain,
                "impact_score": round(i.impact_score, 1),
                "severity": i.severity,
                "time_horizon": i.time_horizon,
                "explanation": i.explanation,
                "recommended_action": i.recommended_action or "",
            })
        return pd.DataFrame(rows) if rows else _empty_impacts_df()
    except Exception as exc:
        logger.warning("cargar_impactos_domesticos error: %s", exc)
        return _empty_impacts_df()


@_cache(ttl=3600)
def cargar_narrativas_gdelt(
    hours: int = 48,
    country_iso3: str | None = None,
) -> pd.DataFrame:
    """
    Carga señales narrativas de GDELT.

    Returns:
        DataFrame con columnas: signal_id, country_iso3, topic,
        volume_24h, avg_tone, domestic_relevance, severity.
    """
    try:
        from etl.sources.geopolitics.gdelt_client import (
            SPAIN_QUERIES,
            extract_geo_narrative_signals,
            search_gdelt_articles,
        )
        all_articles = []
        for query in SPAIN_QUERIES[:3]:
            articles = search_gdelt_articles(query=query, hours=hours, limit=50)
            all_articles.extend(articles)

        signals = extract_geo_narrative_signals(all_articles, country_iso3=country_iso3)
        rows = [{
            "signal_id": s.signal_id,
            "country_iso3": s.country_iso3 or "",
            "region": s.region or "",
            "topic": s.topic,
            "narrative_label": s.narrative_label,
            "volume_24h": s.volume_24h,
            "volume_7d": s.volume_7d,
            "avg_tone": s.avg_tone,
            "domestic_relevance": round(s.domestic_relevance, 2),
            "severity": s.severity,
            "explanation": s.explanation,
        } for s in signals]
        return pd.DataFrame(rows) if rows else _empty_narratives_df()
    except Exception as exc:
        logger.warning("cargar_narrativas_gdelt error: %s", exc)
        return _empty_narratives_df()


@_cache(ttl=3600)
def cargar_briefings_recientes(limit: int = 10) -> list[dict[str, Any]]:
    """
    Carga briefings geopolíticos recientes.

    Returns:
        Lista de dicts con campos del GeoBriefing.
    """
    try:
        conn = _get_conn()
        if conn:
            import json
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT briefing_id, country_iso3, region, titulo, fecha,
                           situacion, impacto_espana, riesgos, recomendaciones
                    FROM geo_briefings
                    ORDER BY fecha DESC, created_at DESC
                    LIMIT %s
                    """,
                    (limit,),
                )
                rows = cur.fetchall()
                return [
                    {
                        "briefing_id": r[0], "country_iso3": r[1], "region": r[2],
                        "titulo": r[3], "fecha": r[4], "situacion": r[5],
                        "impacto_espana": r[6],
                        "riesgos": json.loads(r[7]) if isinstance(r[7], str) else (r[7] or []),
                        "recomendaciones": json.loads(r[8]) if isinstance(r[8], str) else (r[8] or []),
                    }
                    for r in rows
                ]
        # Fallback: build a quick digest
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_briefing_builder import build_daily_spain_digest
        events = fetch_acled_events()
        briefing = build_daily_spain_digest(events, [], [], [], [])
        return [briefing.model_dump(mode="json")]
    except Exception as exc:
        logger.warning("cargar_briefings_recientes error: %s", exc)
        return []


def cargar_source_health() -> dict[str, dict[str, Any]]:
    """
    Carga estado de salud de las fuentes geopolíticas.

    Returns:
        Dict con source_name → health dict.
    """
    try:
        from etl.sources.geopolitics.geopolitics_monitor import get_health_status
        return get_health_status()
    except Exception as exc:
        logger.warning("cargar_source_health error: %s", exc)
        return {
            "acled": {"available": False, "error": str(exc)},
            "gdelt": {"available": False, "error": str(exc)},
            "ucdp": {"available": False, "error": str(exc)},
        }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None


def _empty_events_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "event_id", "source", "event_type", "event_subtype", "country",
        "country_iso3", "region", "location_name", "lat", "lon", "event_date",
        "actor_1", "actor_2", "fatalities", "severity", "source_url",
    ])


def _empty_risk_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "country_iso3", "country_name", "total_score", "conflict_risk",
        "political_risk", "economic_risk", "energy_risk", "migration_risk",
        "defense_risk", "trend", "interest_for_spain", "explanation",
    ])


def _empty_alerts_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "alert_id", "alert_type", "country_iso3", "title",
        "description", "severity", "affected_modules", "created_at",
    ])


def _empty_presence_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "presence_id", "country_iso3", "country_name", "category",
        "actor_name", "description", "value", "unit", "source", "relevance_score",
    ])


def _empty_impacts_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "impact_id", "country_iso3", "event_id", "impact_domain",
        "impact_score", "severity", "time_horizon", "explanation", "recommended_action",
    ])


def _empty_narratives_df() -> pd.DataFrame:
    return pd.DataFrame(columns=[
        "signal_id", "country_iso3", "region", "topic", "narrative_label",
        "volume_24h", "volume_7d", "avg_tone", "domestic_relevance", "severity", "explanation",
    ])
