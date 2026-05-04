"""
Campaign Core Service — Bloque 6.

Funciones de acceso a datos de campaña para el dashboard.
Todas degradan gracefully si no hay BD.

Funciones:
  cargar_voto_blando()
  cargar_segmentos_votante()
  cargar_mensajes_campana()
  simular_mensaje_campana()
  cargar_simulaciones_recientes()
  recomendar_mensajes()
  cargar_oportunidades_campana()
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import pandas as pd

from db.connection import get_engine

logger = logging.getLogger(__name__)


# ── Helper DB ──────────────────────────────────────────────────────────────────

def _engine():
    try:
        return get_engine()
    except Exception:
        return None


def _query_df(sql: str, params: dict | None = None) -> pd.DataFrame:
    try:
        engine = _engine()
        if engine is None:
            return pd.DataFrame()
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            return pd.read_sql(sa_text(sql), conn, params=params or {})
    except Exception as exc:
        logger.debug("campaign_core._query_df: %s", exc)
        return pd.DataFrame()


# ── Voto blando ────────────────────────────────────────────────────────────────

def cargar_voto_blando(
    geography: str = "ES",
    days_back: int = 30,
) -> pd.DataFrame:
    """
    Carga estimaciones de voto blando recientes desde BD.

    Returns:
        DataFrame con columnas: party_id, decided_pct, soft_pct, estimate_date.
        Si no hay datos en BD, calcula en tiempo real desde el nowcast.
    """
    cutoff = (date.today() - timedelta(days=days_back)).isoformat()
    sql = """
        SELECT party_id, decided_pct, soft_pct, switchable_to, estimate_date, source
        FROM soft_vote_estimates
        WHERE geography = :geography
          AND estimate_date >= :cutoff
        ORDER BY estimate_date DESC, party_id
    """
    df = _query_df(sql, {"geography": geography, "cutoff": cutoff})
    if not df.empty:
        return df

    # Fallback: calcular en tiempo real
    return _compute_soft_vote_realtime(geography)


def _compute_soft_vote_realtime(geography: str) -> pd.DataFrame:
    """Calcula voto blando en tiempo real desde nowcast."""
    try:
        from dashboard.services.electoral_core import cargar_nowcast_actual
        from etl.sources.electoral.soft_vote_model import estimate_soft_vote

        nc = cargar_nowcast_actual(geography)
        if not nc["hay_datos"]:
            return pd.DataFrame()

        estimates = estimate_soft_vote(nc["party_estimates"], geography=geography)
        if not estimates:
            return pd.DataFrame()

        records = [
            {
                "party_id": e.party_id,
                "decided_pct": e.decided_pct,
                "soft_pct": e.soft_pct,
                "estimate_date": e.estimate_date,
                "source": e.source,
            }
            for e in estimates
        ]
        return pd.DataFrame(records)
    except Exception as exc:
        logger.debug("_compute_soft_vote_realtime: %s", exc)
        return pd.DataFrame()


# ── Segmentos de votante ───────────────────────────────────────────────────────

def cargar_segmentos_votante(
    age_group: str | None = None,
    geography: str | None = None,
) -> pd.DataFrame:
    """
    Carga segmentos de votante desde BD o defaults.

    Returns:
        DataFrame con columnas: segment_id, label, ideology_mean, age_group,
        persuadability, turnout_probability, party_preference.
    """
    where = "WHERE 1=1"
    params: dict[str, Any] = {}

    if age_group:
        where += " AND age_group = :age_group"
        params["age_group"] = age_group
    if geography:
        where += " AND (geography = :geography OR geography IS NULL)"
        params["geography"] = geography

    sql = f"""
        SELECT segment_id, label, ideology_mean, age_group,
               geography, income_group, education_group,
               party_preference, persuadability, turnout_probability
        FROM voter_segments
        {where}
        ORDER BY segment_id
    """
    df = _query_df(sql, params)
    if not df.empty:
        return df

    # Fallback: usar defaults
    return _get_segments_as_df()


def _get_segments_as_df() -> pd.DataFrame:
    """Devuelve segmentos default como DataFrame."""
    try:
        from etl.sources.electoral.voter_segments import get_default_segments

        segs = get_default_segments()
        if not segs:
            return pd.DataFrame()

        records = [
            {
                "segment_id": s.segment_id,
                "label": s.label,
                "ideology_mean": s.ideology_mean,
                "age_group": s.age_group,
                "geography": s.geography,
                "persuadability": s.persuadability,
                "turnout_probability": s.turnout_probability,
                "party_preference": s.party_preference,
            }
            for s in segs
        ]
        return pd.DataFrame(records)
    except Exception as exc:
        logger.debug("_get_segments_as_df: %s", exc)
        return pd.DataFrame()


def cargar_segmentos_lista() -> list:
    """Devuelve segmentos como lista de VoterSegment (para simulaciones)."""
    try:
        from etl.sources.electoral.voter_segments import get_default_segments
        return get_default_segments()
    except Exception:
        return []


# ── Mensajes de campaña ────────────────────────────────────────────────────────

def cargar_mensajes_campana(
    party_id: str | None = None,
    theme: str | None = None,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Carga mensajes de campaña desde BD.

    Returns:
        DataFrame con columnas: message_id, party_id, theme, frame,
        target_segment, source, created_at.
    """
    where = "WHERE 1=1"
    params: dict[str, Any] = {"limit": limit}

    if party_id:
        where += " AND party_id = :party_id"
        params["party_id"] = party_id
    if theme:
        where += " AND theme ILIKE :theme"
        params["theme"] = f"%{theme}%"

    sql = f"""
        SELECT message_id, party_id, theme, frame, target_segment,
               target_geography, source, created_at
        FROM campaign_messages
        {where}
        ORDER BY created_at DESC
        LIMIT :limit
    """
    return _query_df(sql, params)


# ── Simulación de mensajes ─────────────────────────────────────────────────────

def simular_mensaje_campana(
    party_id: str,
    theme: str,
    target_segment: str | None = None,
    geography: str = "ES",
    saturation_count: int = 1,
    week_of_campaign: int = 4,
    persist: bool = False,
) -> dict[str, Any]:
    """
    Simula el efecto de un mensaje de campaña y opcionalmente persiste el resultado.

    Returns:
        Dict con: simulation_id, expected_vote_shift, expected_seat_shift,
        affected_segments, confidence, narrative, hay_datos.
    """
    empty = {"hay_datos": False, "error": None}

    try:
        from dashboard.services.electoral_core import cargar_nowcast_actual
        from etl.sources.electoral.campaign_effects import (
            create_campaign_message,
            simulate_campaign_message,
            save_campaign_message,
            save_campaign_simulation,
        )

        nc = cargar_nowcast_actual(geography)
        if not nc["hay_datos"]:
            empty["error"] = "Sin datos de nowcast disponibles."
            return empty

        segments = cargar_segmentos_lista()
        message = create_campaign_message(
            party_id=party_id,
            theme=theme,
            target_segment=target_segment,
            target_geography=geography,
        )
        simulation = simulate_campaign_message(
            message=message,
            segments=segments,
            current_estimates=nc["party_estimates"],
            saturation_count=saturation_count,
            week_of_campaign=week_of_campaign,
        )

        if persist:
            engine = _engine()
            save_campaign_message(message, engine)
            save_campaign_simulation(simulation, engine)

        return {
            "hay_datos": True,
            "simulation_id": simulation.simulation_id,
            "message_id": simulation.message_id,
            "party_id": simulation.party_id,
            "theme": theme,
            "expected_vote_shift": simulation.expected_vote_shift,
            "expected_seat_shift": simulation.expected_seat_shift,
            "affected_segments": simulation.affected_segments,
            "confidence": simulation.confidence,
            "narrative": simulation.narrative,
        }

    except Exception as exc:
        logger.error("simular_mensaje_campana: %s", exc)
        empty["error"] = str(exc)
        return empty


# ── Simulaciones recientes ─────────────────────────────────────────────────────

def cargar_simulaciones_recientes(
    party_id: str | None = None,
    limit: int = 20,
    days_back: int = 7,
) -> pd.DataFrame:
    """
    Carga simulaciones de campaña recientes desde BD.

    Returns:
        DataFrame con columnas: simulation_id, party_id, theme, expected_vote_shift,
        confidence, narrative, created_at.
    """
    cutoff = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
    where = "WHERE cs.created_at >= :cutoff"
    params: dict[str, Any] = {"cutoff": cutoff, "limit": limit}

    if party_id:
        where += " AND cs.party_id = :party_id"
        params["party_id"] = party_id

    sql = f"""
        SELECT cs.simulation_id, cs.party_id, cm.theme,
               cs.expected_vote_shift, cs.expected_seat_shift,
               cs.affected_segments, cs.confidence, cs.narrative,
               cs.created_at
        FROM campaign_simulations cs
        LEFT JOIN campaign_messages cm ON cs.message_id = cm.message_id
        {where}
        ORDER BY cs.created_at DESC
        LIMIT :limit
    """
    return _query_df(sql, params)


# ── Recomendaciones ────────────────────────────────────────────────────────────

def recomendar_mensajes(
    party_id: str,
    geography: str = "ES",
    top_n: int = 5,
    candidate_themes: list[str] | None = None,
) -> list[dict[str, Any]]:
    """
    Recomienda temas de campaña para un partido.

    Returns:
        Lista de dicts {theme, expected_gain_pp, top_segment, confidence}.
    """
    try:
        from dashboard.services.electoral_core import cargar_nowcast_actual
        from etl.sources.electoral.campaign_effects import recommend_messages

        nc = cargar_nowcast_actual(geography)
        if not nc["hay_datos"]:
            return []

        segments = cargar_segmentos_lista()
        return recommend_messages(
            party_id=party_id,
            segments=segments,
            current_estimates=nc["party_estimates"],
            candidate_themes=candidate_themes,
            top_n=top_n,
        )
    except Exception as exc:
        logger.error("recomendar_mensajes: %s", exc)
        return []


# ── Oportunidades de campaña ──────────────────────────────────────────────────

def cargar_oportunidades_campana(
    party_id: str,
    geography: str = "ES",
    min_opportunity_score: float = 0.05,
) -> list[dict[str, Any]]:
    """
    Identifica oportunidades de captación de voto para un partido.

    Returns:
        Lista de dicts con {segment_id, label, opportunity_score, ...}.
    """
    try:
        from etl.sources.electoral.voter_segments import (
            get_default_segments,
            find_soft_vote_opportunities,
        )
        from dashboard.services.electoral_core import cargar_nowcast_actual

        nc = cargar_nowcast_actual(geography)
        current_share = 0.0
        if nc["hay_datos"]:
            current_share = nc["party_estimates"].get(party_id, 0.0)

        segments = get_default_segments()
        opportunities = find_soft_vote_opportunities(
            segments=segments,
            party_id=party_id,
            current_share=current_share,
        )
        return [o for o in opportunities if o["opportunity_score"] >= min_opportunity_score]

    except Exception as exc:
        logger.error("cargar_oportunidades_campana: %s", exc)
        return []


# ── KPIs de campaña ───────────────────────────────────────────────────────────

def cargar_kpis_campana(
    party_id: str,
    geography: str = "ES",
) -> dict[str, Any]:
    """
    Devuelve KPIs de campaña para un partido.

    Returns:
        Dict con: voto_decidido_pct, voto_blando_pct, n_oportunidades,
        mejor_tema, mejor_segmento, hay_datos.
    """
    empty = {"hay_datos": False}

    try:
        soft_df = cargar_voto_blando(geography)
        if soft_df.empty or "party_id" not in soft_df.columns:
            return empty

        party_soft = soft_df[soft_df["party_id"] == party_id]
        if party_soft.empty:
            return empty

        row = party_soft.iloc[0]
        oportunidades = cargar_oportunidades_campana(party_id, geography)
        recomendaciones = recomendar_mensajes(party_id, geography, top_n=1)

        mejor_tema = recomendaciones[0]["theme"] if recomendaciones else None
        mejor_segmento = (
            oportunidades[0]["segment_id"] if oportunidades else None
        )

        return {
            "hay_datos": True,
            "party_id": party_id,
            "voto_decidido_pct": float(row.get("decided_pct", 0)),
            "voto_blando_pct": float(row.get("soft_pct", 0)),
            "n_oportunidades": len(oportunidades),
            "mejor_tema": mejor_tema,
            "mejor_segmento": mejor_segmento,
        }

    except Exception as exc:
        logger.debug("cargar_kpis_campana: %s", exc)
        return empty
