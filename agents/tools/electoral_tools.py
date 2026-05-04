"""
Electoral Brain Tools — Bloque 6.

6 herramientas que el Brain LLM puede invocar para análisis electoral.
Todas usan _safe_electoral_call() para degradar gracefully.

Registro en ELECTORAL_TOOLS (análogo a ECONOMY_TOOLS de economy_tools.py).
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _safe_electoral_call(fn, *args, default=None, **kwargs) -> Any:
    """Wrapper seguro para llamadas al módulo electoral."""
    try:
        return fn(*args, **kwargs)
    except Exception as exc:
        logger.debug("electoral_tools._safe_electoral_call %s: %s", fn.__name__, exc)
        return default if default is not None else {"error": str(exc), "hay_datos": False}


# ── Tools ──────────────────────────────────────────────────────────────────────

def get_current_nowcast(geography: str = "ES") -> dict[str, Any]:
    """
    Devuelve el nowcasting electoral actual.

    Args:
        geography: Código geográfico (ej. "ES", "CAT").

    Returns:
        dict con party_estimates, seat_estimates, leading_party,
        majority_probability, snapshot_date.
    """
    from dashboard.services.electoral_core import cargar_nowcast_actual
    return _safe_electoral_call(cargar_nowcast_actual, geography=geography, default={})


def get_recent_polls(geography: str = "ES", days_back: int = 90) -> list[dict[str, Any]]:
    """
    Devuelve las encuestas recientes con estimaciones por partido.

    Args:
        geography: Código geográfico.
        days_back: Días hacia atrás (default: 90).

    Returns:
        Lista de dicts con {poll_id, pollster, publication_date, party_id, vote_share}.
    """
    from dashboard.services.electoral_core import cargar_encuestas_recientes

    df = _safe_electoral_call(
        cargar_encuestas_recientes,
        geography=geography,
        days_back=days_back,
        default=None,
    )
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.to_dict(orient="records")
    except Exception:
        return []


def project_seats(
    geography: str = "ES",
    method: str = "dhondt",
) -> dict[str, int]:
    """
    Proyecta la distribución de escaños usando el nowcast actual.

    Args:
        geography: Código geográfico.
        method: Método de asignación ('dhondt', 'webster', 'hare').

    Returns:
        dict {partido: escaños}.
    """
    from dashboard.services.electoral_core import cargar_escanos_actuales
    return _safe_electoral_call(
        cargar_escanos_actuales, geography=geography, method=method, default={}
    )


def analyze_coalitions(
    geography: str = "ES",
    limit: int = 10,
) -> list[dict[str, Any]]:
    """
    Analiza los escenarios de coalición más probables.

    Args:
        geography: Código geográfico.
        limit: Número de coaliciones a devolver.

    Returns:
        Lista de dicts con {name, parties, seats_total, has_majority,
        probability, scenario_type, explanation}.
    """
    from dashboard.services.electoral_core import cargar_coaliciones_actuales

    df = _safe_electoral_call(
        cargar_coaliciones_actuales, geography=geography, limit=limit, default=None
    )
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.to_dict(orient="records")
    except Exception:
        return []


def get_electoral_volatility(
    election_id_a: str | None = None,
    geography: str = "ES",
) -> dict[str, Any]:
    """
    Calcula indicadores de volatilidad electoral.

    Args:
        election_id_a: ID de la elección de referencia (None = última elección).
        geography: Código geográfico.

    Returns:
        dict con pedersen_index, party_swing, bloc_swing, most_volatile_party.
    """
    from dashboard.services.electoral_core import cargar_volatilidad
    return _safe_electoral_call(
        cargar_volatilidad,
        election_id_a=election_id_a,
        geography=geography,
        default={"hay_datos": False},
    )


def get_tipping_provinces(
    geography: str = "ES",
    threshold_delta: float = 2.0,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Detecta provincias donde un pequeño cambio en votos altera el reparto de escaños.

    Args:
        geography: Código geográfico.
        threshold_delta: Variación en pp a simular (default: 2.0pp).
        top_n: Número de provincias a devolver.

    Returns:
        Lista de dicts con {province, party_simulated, seat_changes, sensitivity}.
    """
    from dashboard.services.electoral_core import cargar_provincias_tipping_point
    return _safe_electoral_call(
        cargar_provincias_tipping_point,
        geography=geography,
        threshold_delta=threshold_delta,
        top_n=top_n,
        default=[],
    )


# ── Registro ───────────────────────────────────────────────────────────────────

ELECTORAL_TOOLS = [
    {
        "name": "get_current_nowcast",
        "fn": get_current_nowcast,
        "description": "Devuelve el nowcasting electoral actual con estimaciones de voto y escaños.",
        "parameters": {
            "type": "object",
            "properties": {
                "geography": {
                    "type": "string",
                    "description": "Código geográfico (ej. 'ES', 'CAT'). Default: 'ES'.",
                    "default": "ES",
                }
            },
            "required": [],
        },
    },
    {
        "name": "get_recent_polls",
        "fn": get_recent_polls,
        "description": "Devuelve las encuestas electorales recientes con estimaciones por partido.",
        "parameters": {
            "type": "object",
            "properties": {
                "geography": {"type": "string", "default": "ES"},
                "days_back": {
                    "type": "integer",
                    "description": "Días hacia atrás a considerar (default: 90).",
                    "default": 90,
                },
            },
            "required": [],
        },
    },
    {
        "name": "project_seats",
        "fn": project_seats,
        "description": "Proyecta la distribución de escaños en el Congreso usando el nowcast.",
        "parameters": {
            "type": "object",
            "properties": {
                "geography": {"type": "string", "default": "ES"},
                "method": {
                    "type": "string",
                    "enum": ["dhondt", "webster", "hare"],
                    "default": "dhondt",
                },
            },
            "required": [],
        },
    },
    {
        "name": "analyze_coalitions",
        "fn": analyze_coalitions,
        "description": "Analiza los escenarios de coalición más probables con sus probabilidades.",
        "parameters": {
            "type": "object",
            "properties": {
                "geography": {"type": "string", "default": "ES"},
                "limit": {"type": "integer", "default": 10},
            },
            "required": [],
        },
    },
    {
        "name": "get_electoral_volatility",
        "fn": get_electoral_volatility,
        "description": "Calcula el Índice de Pedersen y swing por partido/bloque.",
        "parameters": {
            "type": "object",
            "properties": {
                "election_id_a": {
                    "type": "string",
                    "description": "ID de la elección de referencia (opcional).",
                },
                "geography": {"type": "string", "default": "ES"},
            },
            "required": [],
        },
    },
    {
        "name": "get_tipping_provinces",
        "fn": get_tipping_provinces,
        "description": "Detecta provincias 'bisagra' donde un cambio de 2pp altera el reparto de escaños.",
        "parameters": {
            "type": "object",
            "properties": {
                "geography": {"type": "string", "default": "ES"},
                "threshold_delta": {
                    "type": "number",
                    "description": "Variación en pp a simular (default: 2.0).",
                    "default": 2.0,
                },
                "top_n": {"type": "integer", "default": 10},
            },
            "required": [],
        },
    },
]
