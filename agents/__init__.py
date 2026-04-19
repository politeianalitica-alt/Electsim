<<<<<<< HEAD
"""Agentes sintéticos basados en ``perfiles_votante`` (Fase 3)."""

from agents.llm import OpenAIChatClient, StubLLMClient
from agents.prompts import build_system_prompt
from agents.runner import (
    AgentTurnResult,
    VoterAgent,
    build_context_aware_prompt,
    load_perfil_por_cluster,
    run_turn,
)

__all__ = [
    "AgentTurnResult",
    "VoterAgent",
    "OpenAIChatClient",
    "StubLLMClient",
    "build_context_aware_prompt",
    "build_system_prompt",
    "load_perfil_por_cluster",
    "run_turn",
=======
from __future__ import annotations

from agents.llm import (
    AnthropicChatClient,
    OllamaClient,
    OpenAIChatClient,
    StubLLMClient,
    _with_retry,
)
from agents.memory_log import (
    get_session_turns,
    get_simulation_responses,
    list_sessions,
    log_memory_turn,
)
from agents.prompts import build_system_prompt, parse_chain_of_thought
from agents.rag_retriever import construir_extra_context
from agents.runner import VoterAgent, run_turn
from agents.simulador_cis import (
    PreguntaCIS,
    agregar_respuestas,
    comparar_con_microdatos_bd,
    resumen_parseo,
    simular_encuesta,
)
from agents.red_social import (
    construir_grafo_perfiles,
    cargar_susceptibilidad,
    metricas_grafo,
    simular_propagacion_campana,
)

__all__ = [
    "OpenAIChatClient",
    "AnthropicChatClient",
    "OllamaClient",
    "StubLLMClient",
    "_with_retry",
    "build_system_prompt",
    "parse_chain_of_thought",
    "construir_extra_context",
    "VoterAgent",
    "run_turn",
    "PreguntaCIS",
    "simular_encuesta",
    "agregar_respuestas",
    "comparar_con_microdatos_bd",
    "resumen_parseo",
    "construir_grafo_perfiles",
    "cargar_susceptibilidad",
    "simular_propagacion_campana",
    "metricas_grafo",
    "log_memory_turn",
    "get_session_turns",
    "get_simulation_responses",
    "list_sessions",
>>>>>>> 6fda6ff (agentes 1)
]
