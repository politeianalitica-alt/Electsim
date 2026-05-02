"""
AnalysisState — Estado del StateGraph de LangGraph.

El estado es el objeto que se pasa entre nodos del grafo.
Cada nodo puede leer y escribir en el estado.
El estado es un TypedDict compatible con LangGraph >= 0.2.

Secciones:
  input_*     datos de entrada al pipeline
  extracted_* datos extraidos por nodos de extraccion
  analysis_*  resultados de analisis estrategico
  output_*    productos de inteligencia finales
  meta_*      metadatos del pipeline (errores, tiempos, etc.)
"""
from __future__ import annotations

from typing import Any, TypedDict


class AnalysisState(TypedDict, total=False):
    """Estado del grafo de analisis de inteligencia politica."""

    # ------------------------------------------------------------------
    # Input
    # ------------------------------------------------------------------
    input_texts: list[str]           # textos fuente del dia
    input_market_id: str             # mercado objetivo
    input_sector_ids: list[str]      # sectores objetivo
    input_focus_actors: list[str]    # actores de interes
    input_poll_data: dict[str, float]  # encuestas {actor: %}
    input_economic_data: dict[str, Any]  # datos macro
    input_geopolitical_summary: str  # contexto geopolitico
    input_briefing_type: str         # morning_briefing, evening_digest, etc.
    input_run_deep: bool             # ejecutar capas 6 y 7

    # ------------------------------------------------------------------
    # Extraccion (nodo: data_collector)
    # ------------------------------------------------------------------
    extracted_entities: dict[str, list[str]]    # {tipo: [entidades]}
    extracted_facts: list[dict[str, Any]]        # hechos verificables
    extracted_signals: list[dict[str, Any]]      # señales de inteligencia
    extracted_text_len: int                      # longitud total procesada

    # ------------------------------------------------------------------
    # Contexto (nodo: context_builder)
    # ------------------------------------------------------------------
    context_actor_profiles: dict[str, dict[str, Any]]  # {actor: perfil}
    context_economic: dict[str, Any]                    # datos economicos actuales
    context_historical: list[dict[str, Any]]            # analogias historicas
    context_geopolitical: str                           # resumen geopolitico

    # ------------------------------------------------------------------
    # Analisis (nodo: analyst)
    # ------------------------------------------------------------------
    analysis_assessments: list[dict[str, Any]]   # assessments por actor
    analysis_classifications: list[dict[str, Any]]  # señales clasificadas
    analysis_deep: list[dict[str, Any]]          # analisis capa 7

    # ------------------------------------------------------------------
    # Critica (nodo: critic)
    # ------------------------------------------------------------------
    critic_feedback: str             # feedback del critic sobre el analisis
    critic_confidence: float         # confianza del critic (0-1)
    critic_requires_rerun: bool      # solicitar re-ejecucion del analyst

    # ------------------------------------------------------------------
    # Sintesis (nodo: synthesizer)
    # ------------------------------------------------------------------
    output_briefing: dict[str, Any]   # DailyBriefing serializado
    output_alerts: list[dict[str, Any]]  # alertas generadas
    output_products: list[dict[str, Any]]  # productos de inteligencia

    # ------------------------------------------------------------------
    # Alertas (nodo: alert_trigger)
    # ------------------------------------------------------------------
    alerts_sent: list[str]           # IDs de alertas enviadas
    alerts_escalated: list[str]      # IDs escaladas a nivel critico

    # ------------------------------------------------------------------
    # Meta
    # ------------------------------------------------------------------
    meta_iteration: int              # iteracion actual (para loops)
    meta_errors: list[str]           # errores acumulados
    meta_elapsed: float              # tiempo transcurrido en segundos
    meta_nodes_executed: list[str]   # nodos ejecutados en orden
    meta_is_degraded: bool           # pipeline en modo degradado


def initial_state(
    texts: list[str],
    market_id: str = "ES",
    sector_ids: list[str] | None = None,
    focus_actors: list[str] | None = None,
    poll_data: dict[str, float] | None = None,
    economic_data: dict[str, Any] | None = None,
    geopolitical_summary: str = "",
    briefing_type: str = "morning_briefing",
    run_deep: bool = True,
) -> AnalysisState:
    """Crea el estado inicial para el pipeline."""
    return AnalysisState(
        input_texts=texts,
        input_market_id=market_id,
        input_sector_ids=sector_ids or ["PARTY"],
        input_focus_actors=focus_actors or [],
        input_poll_data=poll_data or {},
        input_economic_data=economic_data or {},
        input_geopolitical_summary=geopolitical_summary,
        input_briefing_type=briefing_type,
        input_run_deep=run_deep,
        meta_iteration=0,
        meta_errors=[],
        meta_elapsed=0.0,
        meta_nodes_executed=[],
        meta_is_degraded=False,
    )
