"""
agents.typed · Sprint 5 · S5.5

Adaptador para `pydantic-ai` (https://ai.pydantic.dev) que envuelve las
brain tools en agentes tipados con I/O validado por Pydantic.

Patrón:

    from agents.typed import build_typed_agent, TypedAgentResult

    agent = build_typed_agent(
        name="electoral_advisor",
        system_prompt="Analista electoral de Politeia ...",
        tools=["get_current_nowcast", "get_recent_polls"],
    )
    result: TypedAgentResult = agent.run_sync("¿Cómo van las encuestas?")

Diseño · fail-closed:
  - Si `pydantic_ai` no está instalado, `build_typed_agent` levanta
    `TypedAgentUnavailable` con instrucciones claras (no degrada silenciosamente).
  - Si el modelo no responde, el resultado lleva `ok=False` y `error`.
  - Cada herramienta se resuelve por reflection sobre los módulos
    `agents/tools/*` ya existentes (cero duplicación de lógica de dominio).
"""
from __future__ import annotations

from .adapter import (
    TypedAgentUnavailable,
    TypedAgentResult,
    build_typed_agent,
    is_available,
    list_known_tools,
)

__all__ = [
    "TypedAgentUnavailable",
    "TypedAgentResult",
    "build_typed_agent",
    "is_available",
    "list_known_tools",
]
