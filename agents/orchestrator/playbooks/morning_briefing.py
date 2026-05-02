"""
Playbook: Morning Briefing.

Genera el briefing matutino de inteligencia politica.
Configuracion del pipeline especifica para este playbook:
  - run_deep=True si hay mas de 5 textos de entrada
  - focus_actors del workspace activo
  - briefing_type="morning_briefing"
  - Hora objetivo: 06:30 UTC (via scheduler)

Uso:
    from agents.orchestrator.playbooks.morning_briefing import run_morning_briefing
    result = await run_morning_briefing(
        texts=noticias_del_dia,
        focus_actors=["Pedro Sanchez", "Alberto Feijoo"],
        poll_data={"PSOE": 28.5, "PP": 33.2},
    )
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


async def run_morning_briefing(
    texts: list[str],
    focus_actors: list[str] | None = None,
    poll_data: dict[str, float] | None = None,
    economic_data: dict[str, Any] | None = None,
    geopolitical_summary: str = "",
    market_id: str = "ES",
    sector_ids: list[str] | None = None,
    engine: Any = None,
) -> dict[str, Any]:
    """
    Ejecuta el playbook Morning Briefing.

    Args:
        texts: textos del dia (noticias, alertas, etc.)
        focus_actors: actores a analizar en profundidad
        poll_data: datos de encuesta actuales
        economic_data: datos macro del dia
        geopolitical_summary: resumen geopolitico
        market_id: mercado objetivo
        sector_ids: sectores
        engine: OllamaEngine ya inicializado (si None, se crea uno)

    Returns:
        Estado final del pipeline con briefing y alertas
    """
    from agents.analysis.ollama_engine import OllamaEngine
    from agents.orchestrator.state import initial_state
    from agents.orchestrator.router import run_graph

    run_deep = len(texts) >= 5

    state = initial_state(
        texts=texts,
        market_id=market_id,
        sector_ids=sector_ids or ["PARTY"],
        focus_actors=focus_actors or _default_actors_es(),
        poll_data=poll_data or {},
        economic_data=economic_data or {},
        geopolitical_summary=geopolitical_summary,
        briefing_type="morning_briefing",
        run_deep=run_deep,
    )

    if engine:
        result = await run_graph(state, engine)
    else:
        async with OllamaEngine(market_id=market_id) as eng:
            result = await run_graph(state, eng)

    logger.info(
        "Morning briefing completado: %d alertas, %d productos",
        len(result.get("output_alerts", [])),
        len(result.get("output_products", [])),
    )
    return result


def _default_actors_es() -> list[str]:
    """Actores predeterminados para el mercado ES."""
    return [
        "Pedro Sanchez",
        "Alberto Nunez Feijoo",
        "Santiago Abascal",
        "Yolanda Diaz",
    ]


def schedule_config() -> dict[str, Any]:
    """
    Configuracion para APScheduler/Celery Beat.

    Devuelve la configuracion de horario del playbook.
    """
    return {
        "playbook": "morning_briefing",
        "cron": "30 6 * * 1-5",    # 06:30 UTC, lunes a viernes
        "timezone": "Europe/Madrid",
        "description": "Briefing matutino de inteligencia politica",
        "timeout_seconds": 600,
        "market_id": "ES",
        "run_deep": True,
    }
