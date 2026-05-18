"""
Router del agente ReAct · expone POST /api/v1/agent/query

Permite a clientes (dashboard Streamlit, frontend Next.js, CLI) invocar
el ReactAgent y obtener respuesta + trazas de razonamiento.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.orchestrator.react_agent import ReactAgent

logger = logging.getLogger(__name__)
router = APIRouter()


class AgentQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=4000, description="Consulta del usuario")
    context: str | None = Field(default=None, max_length=8000, description="Contexto adicional opcional")
    max_iterations: int = Field(default=10, ge=1, le=15)


class AgentStep(BaseModel):
    iteration: int
    thought: str
    action: str | None = None
    action_input: dict[str, Any] | None = None
    observation: str | None = None
    final_answer: str | None = None


class AgentQueryResponse(BaseModel):
    answer: str
    steps: list[AgentStep]
    tools_used: list[str]
    iterations: int
    error: str | None = None


@router.post("/v1/agent/query", response_model=AgentQueryResponse, tags=["agent"])
def agent_query(payload: AgentQueryRequest) -> AgentQueryResponse:
    """Ejecuta una consulta agéntica · loop ReAct sobre Groq/LLaMA 3.3 70B."""
    try:
        agent = ReactAgent(max_iterations=payload.max_iterations)
        result = agent.run(payload.query, context=payload.context)
        return AgentQueryResponse(
            answer=result.answer,
            steps=[
                AgentStep(
                    iteration=s.iteration,
                    thought=s.thought,
                    action=s.action,
                    action_input=s.action_input,
                    observation=(s.observation or "")[:2000] if s.observation else None,
                    final_answer=s.final_answer,
                )
                for s in result.steps
            ],
            tools_used=result.tools_used,
            iterations=result.iterations,
            error=result.error,
        )
    except Exception as e:
        logger.exception("Error en agent_query")
        raise HTTPException(status_code=500, detail=f"Error agente: {type(e).__name__}: {str(e)[:200]}") from e


@router.get("/v1/agent/health", tags=["agent"])
def agent_health() -> dict[str, Any]:
    """Diagnóstico rápido del agente · verifica que el LLM client carga."""
    try:
        from agents.llm import get_llm_client
        client = get_llm_client()
        return {
            "status": "ok",
            "provider_model": str(client.modelo),
            "client_class": type(client).__name__,
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


@router.get("/v1/agent/tools", tags=["agent"])
def agent_tools() -> dict[str, Any]:
    """Lista las tools disponibles para el agente con sus descripciones."""
    from agents.orchestrator.react_agent import TOOLS
    return {
        "tools": [
            {"name": name, "args": t["args"], "description": t["desc"]}
            for name, t in TOOLS.items()
        ]
    }
