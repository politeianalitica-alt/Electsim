"""Acceso a datos del dominio institucional del dashboard."""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
import streamlit as st

from dashboard.repositories.base import run_query


@dataclass(frozen=True)
class CongresoDashboardData:
    """Payload agregado con los datasets que consume la página de Congreso."""

    source_health: pd.DataFrame
    scraper_incidents: pd.DataFrame
    boe_today: pd.DataFrame
    boe_week: pd.DataFrame
    agenda_week: pd.DataFrame
    agenda_quality: pd.DataFrame
    votes_recent: pd.DataFrame
    votes_quality: pd.DataFrame
    votes_long: pd.DataFrame
    activity_long: pd.DataFrame
    activity_topic_window: pd.DataFrame


@st.cache_data(ttl=120)
def load_source_health() -> pd.DataFrame:
    """Último estado conocido por fuente de ingesta."""
    return run_query(
        """
        SELECT DISTINCT ON (source_id)
            source_id, source_type, fecha, articles_count,
            errors_count, avg_latency_ms, freshness_lag_s, status, checked_at
        FROM source_health
        WHERE fecha >= CURRENT_DATE - INTERVAL '2 days'
        ORDER BY source_id, checked_at DESC
        """,
    )


@st.cache_data(ttl=120)
def load_scraper_incidents(solo_activos: bool = True) -> pd.DataFrame:
    """Incidencias recientes de scrapers institucionales."""
    extra = "AND resolved = FALSE" if solo_activos else ""
    return run_query(
        f"""
        SELECT source_id, error_type, severity, first_seen, last_seen,
               occurrence_count, details, resolved
        FROM scraper_incident
        WHERE last_seen >= NOW() - INTERVAL '7 days'
          {extra}
        ORDER BY
            CASE severity WHEN 'critical' THEN 1 WHEN 'major' THEN 2 ELSE 3 END,
            last_seen DESC
        LIMIT 50
        """,
    )


@st.cache_data(ttl=1800)
def load_boe_publicaciones(
    dias: int = 1,
    limit: int = 40,
    solo_alta_media: bool = False,
) -> pd.DataFrame:
    """Publicaciones del BOE persistidas en base de datos."""
    extra = "AND relevancia IN ('Alta','Media')" if solo_alta_media else ""
    return run_query(
        f"""
        SELECT boe_no, fecha, seccion, departamento, tipo_norma,
               titulo, resumen, url_html, relevancia, relevancia_score
        FROM boe_publication
        WHERE fecha >= CURRENT_DATE - :dias
          {extra}
        ORDER BY relevancia_score DESC, fecha DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )


@st.cache_data(ttl=300)
def load_agenda_institucional(
    dias_atras: int = 0,
    dias_adelante: int = 7,
    limit: int = 60,
) -> pd.DataFrame:
    """Agenda institucional persistida en la tabla rica `agenda_item`."""
    return run_query(
        """
        SELECT main_actor, main_actor_id, party_id, host_institution,
               title, description, location, event_date,
               start_time::text AS time_start,
               event_type, topic, importance_score, certainty_score,
               source_id, source_url
        FROM agenda_item
        WHERE event_date BETWEEN CURRENT_DATE - :dias_atras
                              AND CURRENT_DATE + :dias_adelante
          AND status != 'CANCELLED'
        ORDER BY importance_score DESC, event_date, start_time NULLS LAST
        LIMIT :limit
        """,
        {"dias_atras": dias_atras, "dias_adelante": dias_adelante, "limit": limit},
    )


@st.cache_data(ttl=300)
def load_recent_congress_activity(dias: int = 90, limit: int = 50) -> pd.DataFrame:
    """Actividad legislativa reciente del Congreso."""
    return run_query(
        """
        SELECT partido_siglas, tipo_acto, titulo, fecha, resultado
        FROM actividad_congreso
        WHERE fecha >= CURRENT_DATE - :dias
        ORDER BY fecha DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )


@st.cache_data(ttl=300)
def load_votaciones_legacy(limit: int = 30) -> pd.DataFrame:
    """Fallback legacy de votaciones cuando `parliamentary_vote` está vacía."""
    return run_query(
        """
        SELECT fecha, titulo, tipo_votacion, resultado,
               votos_si AS votos_favor,
               votos_no AS votos_contra,
               abstenciones
        FROM votaciones_parlamentarias
        ORDER BY fecha DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


@st.cache_data(ttl=300)
def load_votaciones_pleno(dias: int = 14, limit: int = 30) -> pd.DataFrame:
    """Votaciones parlamentarias recientes, con fallback a esquema legacy."""
    df = run_query(
        """
        SELECT session_date AS fecha, vote_type AS tipo_votacion,
               title AS titulo, result AS resultado,
               votos_favor, votos_contra, abstenciones,
               parties_favor_json, parties_against_json,
               topic AS tema, implications AS implicaciones, url_congreso
        FROM parliamentary_vote
        WHERE session_date >= CURRENT_DATE - :dias
        ORDER BY session_date DESC, votos_favor + votos_contra + abstenciones DESC
        LIMIT :limit
        """,
        {"dias": dias, "limit": limit},
    )
    if not df.empty:
        return df
    return load_votaciones_legacy(limit=limit)


def load_congreso_dashboard_data() -> CongresoDashboardData:
    """Carga centralizada de datasets para la página institucional."""
    return CongresoDashboardData(
        source_health=load_source_health(),
        scraper_incidents=load_scraper_incidents(solo_activos=True),
        boe_today=load_boe_publicaciones(dias=1, limit=40),
        boe_week=load_boe_publicaciones(dias=7, limit=100),
        agenda_week=load_agenda_institucional(dias_atras=0, dias_adelante=7, limit=80),
        agenda_quality=load_agenda_institucional(dias_atras=7, dias_adelante=7, limit=50),
        votes_recent=load_votaciones_pleno(dias=14, limit=25),
        votes_quality=load_votaciones_pleno(dias=30, limit=30),
        votes_long=load_votaciones_pleno(dias=540, limit=800),
        activity_long=load_recent_congress_activity(dias=540, limit=1000),
        activity_topic_window=load_recent_congress_activity(dias=30, limit=300),
    )
