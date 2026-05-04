"""
Campaign Brain Tools — Bloque 6.

5 herramientas que el Brain LLM puede invocar para análisis de campaña.
Análogas a electoral_tools.py.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_campaign_call(fn, *args, default=None, **kwargs) -> Any:
    """Wrapper seguro para llamadas al módulo de campaña."""
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("campaign_tools._safe_campaign_call %s: %s", fn.__name__, exc)
        return default if default is not None else {"error": str(exc), "hay_datos": False}


# ── Tools ──────────────────────────────────────────────────────────────────────

def simulate_campaign_message(
    party_id: str,
    theme: str,
    target_segment: str | None = None,
    geography: str = "ES",
    saturation_count: int = 1,
    week_of_campaign: int = 4,
) -> dict[str, Any]:
    """
    Simula el efecto de un mensaje de campaña sobre el voto estimado.

    Args:
        party_id: Partido que emite el mensaje (ej. "PP", "PSOE").
        theme: Tema del mensaje (ej. "vivienda", "pensiones").
        target_segment: Segmento objetivo (ej. "jovenes", "mayores"). None = todos.
        geography: Código geográfico.
        saturation_count: Nº de veces que se emite el mensaje.
        week_of_campaign: Semana de la campaña (1-8).

    Returns:
        dict con expected_vote_shift, expected_seat_shift, affected_segments,
        confidence, narrative.
    """
    from dashboard.services.campaign_core import simular_mensaje_campana

    return _safe_campaign_call(
        simular_mensaje_campana,
        party_id=party_id,
        theme=theme,
        target_segment=target_segment,
        geography=geography,
        saturation_count=saturation_count,
        week_of_campaign=week_of_campaign,
        persist=False,
        default={"hay_datos": False},
    )


def get_soft_vote_opportunities(
    party_id: str,
    geography: str = "ES",
) -> list[dict[str, Any]]:
    """
    Devuelve segmentos de votantes con mayor potencial de captación de voto blando.

    Args:
        party_id: Partido objetivo.
        geography: Código geográfico.

    Returns:
        Lista de dicts con {segment_id, label, current_pref, persuadability,
        opportunity_score}.
    """
    from dashboard.services.campaign_core import cargar_oportunidades_campana

    return _safe_campaign_call(
        cargar_oportunidades_campana,
        party_id=party_id,
        geography=geography,
        default=[],
    )


def recommend_campaign_messages(
    party_id: str,
    geography: str = "ES",
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """
    Recomienda temas de campaña ordenados por impacto esperado en voto.

    Args:
        party_id: Partido objetivo.
        geography: Código geográfico.
        top_n: Número de recomendaciones.

    Returns:
        Lista de dicts con {theme, expected_gain_pp, top_segment, confidence}.
    """
    from dashboard.services.campaign_core import recomendar_mensajes

    return _safe_campaign_call(
        recomendar_mensajes,
        party_id=party_id,
        geography=geography,
        top_n=top_n,
        default=[],
    )


def get_voter_segments(
    age_group: str | None = None,
    geography: str | None = None,
) -> list[dict[str, Any]]:
    """
    Devuelve los segmentos de votante con sus características y preferencias.

    Args:
        age_group: Filtro por grupo de edad ('18-34', '35-54', '55+').
        geography: Código geográfico opcional.

    Returns:
        Lista de dicts con {segment_id, label, ideology_mean, persuadability,
        party_preference, turnout_probability}.
    """
    from dashboard.services.campaign_core import cargar_segmentos_votante

    df = _safe_campaign_call(
        cargar_segmentos_votante,
        age_group=age_group,
        geography=geography,
        default=None,
    )
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.to_dict(orient="records")
    except Exception:
        return []


def explain_campaign_simulation(
    party_id: str,
    theme: str,
    target_segment: str | None = None,
) -> str:
    """
    Genera una explicación narrativa del impacto de un mensaje de campaña.

    Args:
        party_id: Partido objetivo.
        theme: Tema del mensaje.
        target_segment: Segmento objetivo (opcional).

    Returns:
        Texto explicativo del impacto esperado.
    """
    result = simulate_campaign_message(
        party_id=party_id,
        theme=theme,
        target_segment=target_segment,
    )
    if not result.get("hay_datos"):
        return (
            f"No hay datos de nowcast disponibles para simular el efecto de '{theme}' "
            f"para {party_id}."
        )

    narrative = result.get("narrative", "")
    vote_shift = result.get("expected_vote_shift", {})
    seat_shift = result.get("expected_seat_shift", {})
    confidence = result.get("confidence", 0)

    lines = [narrative]

    if vote_shift:
        shift_txt = ", ".join(
            f"{p}: {v:+.2f}pp"
            for p, v in sorted(vote_shift.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        )
        lines.append(f"Cambios de voto estimados: {shift_txt}")

    if seat_shift:
        seat_txt = ", ".join(
            f"{p}: {v:+d} escaños"
            for p, v in sorted(seat_shift.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
            if v != 0
        )
        if seat_txt:
            lines.append(f"Cambios en escaños: {seat_txt}")

    lines.append(f"Confianza del modelo: {confidence:.0%}")

    return " | ".join(lines)


# ── Registro ───────────────────────────────────────────────────────────────────

CAMPAIGN_TOOLS = [
    {
        "name": "simulate_campaign_message",
        "fn": simulate_campaign_message,
        "description": (
            "Simula el efecto de un mensaje de campaña electoral sobre el voto estimado. "
            "Devuelve cambios en % de voto y escaños proyectados."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "party_id": {"type": "string", "description": "Partido emisor (ej. 'PP')."},
                "theme": {"type": "string", "description": "Tema del mensaje (ej. 'vivienda')."},
                "target_segment": {
                    "type": "string",
                    "description": "Segmento objetivo (ej. 'jovenes'). Opcional.",
                },
                "geography": {"type": "string", "default": "ES"},
                "saturation_count": {"type": "integer", "default": 1},
                "week_of_campaign": {"type": "integer", "default": 4},
            },
            "required": ["party_id", "theme"],
        },
    },
    {
        "name": "get_soft_vote_opportunities",
        "fn": get_soft_vote_opportunities,
        "description": "Devuelve los segmentos de votantes con mayor potencial de captación para un partido.",
        "parameters": {
            "type": "object",
            "properties": {
                "party_id": {"type": "string", "description": "Partido objetivo."},
                "geography": {"type": "string", "default": "ES"},
            },
            "required": ["party_id"],
        },
    },
    {
        "name": "recommend_campaign_messages",
        "fn": recommend_campaign_messages,
        "description": "Recomienda temas de campaña ordenados por impacto en voto para un partido.",
        "parameters": {
            "type": "object",
            "properties": {
                "party_id": {"type": "string"},
                "geography": {"type": "string", "default": "ES"},
                "top_n": {"type": "integer", "default": 5},
            },
            "required": ["party_id"],
        },
    },
    {
        "name": "get_voter_segments",
        "fn": get_voter_segments,
        "description": "Devuelve los segmentos de votantes con sus características y preferencias de partido.",
        "parameters": {
            "type": "object",
            "properties": {
                "age_group": {"type": "string", "description": "Filtro por edad ('18-34', '35-54', '55+')."},
                "geography": {"type": "string"},
            },
            "required": [],
        },
    },
    {
        "name": "explain_campaign_simulation",
        "fn": explain_campaign_simulation,
        "description": "Genera una explicación narrativa en lenguaje natural del impacto de un mensaje de campaña.",
        "parameters": {
            "type": "object",
            "properties": {
                "party_id": {"type": "string"},
                "theme": {"type": "string"},
                "target_segment": {"type": "string"},
            },
            "required": ["party_id", "theme"],
        },
    },
]
