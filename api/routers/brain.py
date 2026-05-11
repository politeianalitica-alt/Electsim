"""
Router /api/brain — endpoint unificado para el Brain (IA conversacional).

Hasta ahora coexistían 3 capas LLM aisladas (`agents/brain/*`,
`dashboard/services/llm_local.py`, `services/llm_client.py`). Este router
expone el Brain con tool-use real: el modelo Ollama puede llamar a 8 tools
(BOE, EUR-Lex, AI Act, Congreso votaciones/diputados, actor relaciones)
desde el frontend visual-oscar.

Endpoints:
  GET  /api/brain/status                → estado del modelo y tools disponibles
  POST /api/brain/chat                  → chat sin tools (compat retro)
  POST /api/brain/chat-with-tools       → chat con tool-use real (NUEVO)
  POST /api/brain/briefing-legislativo  → briefing matutino con tools
  GET  /api/brain/tools                 → lista de tools registradas (OpenAPI schemas)
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/brain", tags=["brain"])


class ChatMessage(BaseModel):
    role: str  # 'user' | 'assistant' | 'system'
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=8000)
    history: list[ChatMessage] = Field(default_factory=list)
    context: Optional[str] = None
    workspace_id: Optional[str] = None
    session_id: Optional[str] = None
    use_tools: bool = False
    model: Optional[str] = None
    tools: Optional[list[str]] = None
    max_iterations: int = Field(3, ge=1, le=8)


class ChatResponse(BaseModel):
    answer: str
    model_used: str
    latency_ms: int
    tools_used: list[str] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)
    mode: str = "live"


# ─── Status ──────────────────────────────────────────────────────────────────


@router.get("/status")
def status():
    """Estado del brain: modelo activo, tools disponibles, Ollama reachable."""
    out: dict[str, Any] = {"available": False, "model": "unknown", "mode": "stub", "tools": []}

    # Intento 1: Ollama HTTP
    try:
        import httpx
        with httpx.Client(timeout=3.0) as cli:
            r = cli.get("http://localhost:11434/api/tags")
            if r.status_code == 200:
                tags = r.json().get("models", [])
                names = [m.get("name", "") for m in tags]
                preferred = next((n for n in names if "politeia-brain" in n), None)
                preferred = preferred or next((n for n in names if "qwen2.5" in n), None)
                preferred = preferred or (names[0] if names else "qwen2.5:7b")
                out["available"] = True
                out["model"] = preferred
                out["mode"] = "ollama"
                out["provider"] = "ollama"
    except Exception as e:
        logger.debug("ollama_status_check_failed: %s", e)

    # Intento 2: tools registry
    try:
        from dashboard.services.llm_tools_registry import tools_disponibles, status_herramientas
        out["tools"] = tools_disponibles()
        out["tools_status"] = status_herramientas()
    except ImportError:
        out["tools"] = []
        out["tools_warning"] = "llm_tools_registry_not_importable"
    except Exception as e:
        logger.warning("tools_status_failed: %s", e)
        out["tools_warning"] = str(e)

    return out


# ─── Tools (catálogo de schemas) ─────────────────────────────────────────────


@router.get("/tools")
def tools_catalog():
    """Devuelve los schemas OpenAI-style de todas las tools registradas."""
    try:
        from dashboard.services.llm_tools_registry import TOOLS_SCHEMA, tools_disponibles
        return {
            "tools": tools_disponibles(),
            "total": len(TOOLS_SCHEMA),
            "schemas": TOOLS_SCHEMA,
        }
    except ImportError:
        return {"tools": [], "total": 0, "schemas": [], "warning": "registry_not_importable"}


# ─── Chat (sin tools) ────────────────────────────────────────────────────────


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Chat sin tools (compatibilidad con `politeia_v3.brain.chat`)."""
    import time
    t0 = time.perf_counter()
    answer = ""
    model_used = "stub"
    mode = "stub"

    # Intento 1: si use_tools=True, delegamos a chat-with-tools
    if req.use_tools:
        return chat_with_tools(req)

    # Intento 2: services.llm_local.chat
    try:
        from services.llm_local import chat as llm_chat
        historia = [{"role": m.role, "content": m.content} for m in req.history]
        answer = llm_chat(
            req.question,
            historia=historia,
            contexto=req.context or "",
        )
        model_used = "politeia-brain"
        mode = "ollama"
    except ImportError:
        # Intento 3: politeia_brain
        try:
            from agents.brain.politeia_brain import ask_brain
            historia = [{"role": m.role, "content": m.content} for m in req.history]
            result = ask_brain(req.question, history=historia, context=req.context)
            answer = result.get("answer", "") if isinstance(result, dict) else str(result)
            model_used = result.get("model", "qwen2.5:7b") if isinstance(result, dict) else "qwen2.5:7b"
            mode = "ollama"
        except Exception as e:
            logger.warning("brain_chat_fallback: %s", e)
            answer = (
                "El Brain está temporalmente en modo demo. Asegúrate de tener Ollama "
                "ejecutándose en localhost:11434 con el modelo `politeia-brain:latest` "
                "o `qwen2.5:7b`."
            )
            mode = "demo"
    except Exception as e:
        logger.warning("brain_chat_failed: %s", e)
        answer = f"Error invocando al Brain: {e}"
        mode = "error"

    return ChatResponse(
        answer=answer,
        model_used=model_used,
        latency_ms=int((time.perf_counter() - t0) * 1000),
        tools_used=[],
        citations=[],
        mode=mode,
    )


# ─── Chat con tools (tool-use real) ──────────────────────────────────────────


@router.post("/chat-with-tools", response_model=ChatResponse)
def chat_with_tools(req: ChatRequest):
    """
    Chat con acceso a las 8 tools del registry:
      - boe_search, boe_sumario          (BOE)
      - euparl_query, euparl_procedimiento (EUR-Lex)
      - ai_act_compliance                (EU AI Act)
      - congreso_votaciones, congreso_diputados (Congreso)
      - actor_relaciones                 (Grafo actores Politeia)

    El modelo decide qué tools usar; la respuesta incluye `tools_used`.
    """
    import time
    t0 = time.perf_counter()

    try:
        from dashboard.services.llm_tools_registry import chat_con_herramientas, tools_disponibles
    except ImportError as e:
        return ChatResponse(
            answer=(
                "El registry de herramientas LLM no está disponible. "
                f"Revisa la instalación de `dashboard/services/llm_tools_registry.py`. ({e})"
            ),
            model_used="stub",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            mode="error",
        )

    historia = [{"role": m.role, "content": m.content} for m in req.history]
    try:
        # `chat_con_herramientas` devuelve string final tras tool-use loop
        answer = chat_con_herramientas(
            mensaje=req.question,
            historia=historia,
            contexto=req.context or "",
            modelo=req.model or "",
            herramientas=req.tools,
            max_iteraciones=req.max_iterations,
        )
        used = req.tools if req.tools else tools_disponibles()
        return ChatResponse(
            answer=answer,
            model_used=req.model or "auto",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            tools_used=list(used) if isinstance(used, list) else [],
            mode="ollama+tools",
        )
    except Exception as e:
        logger.warning("brain_chat_with_tools_failed: %s", e)
        return ChatResponse(
            answer=f"Error en chat-with-tools: {e}",
            model_used="stub",
            latency_ms=int((time.perf_counter() - t0) * 1000),
            mode="error",
        )


# ─── Briefing legislativo (tool-use orquestado) ──────────────────────────────


class BriefingRequest(BaseModel):
    dias: int = Field(1, ge=1, le=30)


@router.post("/briefing-legislativo")
def briefing_legislativo(req: BriefingRequest):
    """
    Genera un briefing matutino sobre normativa BOE + UE + Congreso usando
    `llm_tools_registry.briefing_legislativo_matutino()`.
    """
    import time
    t0 = time.perf_counter()
    try:
        from dashboard.services.llm_tools_registry import briefing_legislativo_matutino
        out = briefing_legislativo_matutino(dias=req.dias)
        return {
            "briefing": out,
            "dias": req.dias,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "mode": "live",
        }
    except ImportError as e:
        return {
            "briefing": "",
            "error": "registry_not_importable",
            "details": str(e),
            "mode": "error",
        }
    except Exception as e:
        logger.warning("briefing_legislativo_failed: %s", e)
        return {"briefing": "", "error": str(e), "mode": "error"}
