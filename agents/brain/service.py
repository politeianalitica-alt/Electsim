"""
Brain service — business logic layer between the API router and the
raw AI engine / LLM router.  All methods return plain dicts; the router
is responsible for wrapping in ApiEnvelope.
"""
from __future__ import annotations

import os
import time
from typing import Any


def _redact(value: str | None, *, keep_chars: int = 4) -> str:
    """Redact a secret value, keeping the last N characters visible."""
    if not value:
        return "(not set)"
    if len(value) <= keep_chars:
        return "****"
    return f"****{value[-keep_chars:]}"


def get_brain_status() -> dict[str, Any]:
    """
    Return comprehensive brain/LLM status for the diagnostic page.
    Tries to import from llm_router and politeia_brain; falls back gracefully.
    """
    try:
        from agents.brain.llm_router import get_routing_config, is_ollama_available
        routing = get_routing_config()
        ollama_ok = is_ollama_available()
    except Exception:
        routing = {}
        ollama_ok = False

    try:
        from agents.brain.politeia_brain import get_available_model, is_brain_available
        brain_ok = is_brain_available()
        active_model = get_available_model()
    except Exception:
        brain_ok = False
        active_model = "unknown"

    env_vars = {
        "OLLAMA_BASE_URL": os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        "LITELLM_BASE_URL": _redact(os.getenv("LITELLM_BASE_URL")),
        "ANTHROPIC_API_KEY": _redact(os.getenv("ANTHROPIC_API_KEY")),
        "GROQ_API_KEY": _redact(os.getenv("GROQ_API_KEY")),
        "OPENAI_API_KEY": _redact(os.getenv("OPENAI_API_KEY")),
    }

    return {
        "ollama_available": ollama_ok,
        "brain_available": brain_ok,
        "active_model": active_model,
        "routing": routing,
        "env": env_vars,
        "timestamp": time.time(),
    }


def test_brain(prompt: str, task_type: str = "qna") -> dict[str, Any]:
    """
    Run a single prompt through the LLM router and return timing + result.

    route() returns a dict with keys: result, model, task_type, from_cache,
    latency_ms, ok, error.
    """
    start = time.perf_counter()
    try:
        from agents.brain.llm_router import route
        result = route(task_type=task_type, prompt=prompt)
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "success": result.get("ok", False),
            "response": result.get("result", ""),
            "model_used": result.get("model", "unknown"),
            "cached": result.get("from_cache", False),
            "elapsed_ms": elapsed_ms,
            "task_type": task_type,
            "error": result.get("error"),
        }
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "success": False,
            "error": str(exc),
            "elapsed_ms": elapsed_ms,
            "task_type": task_type,
        }


def test_embedding(text: str) -> dict[str, Any]:
    """
    Generate an embedding via the AI engine and return stats.
    """
    start = time.perf_counter()
    try:
        from agents.ai_engine import get_ai_engine
        engine = get_ai_engine()
        # upsert_documents expects a list of dicts with 'id', 'text', 'metadata'
        engine.upsert_documents([{"id": "__embed_test__", "text": text, "metadata": {}}])
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "success": True,
            "model": os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
            "elapsed_ms": elapsed_ms,
            "char_count": len(text),
        }
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "success": False,
            "error": str(exc),
            "elapsed_ms": elapsed_ms,
        }


def get_model_routing() -> dict[str, Any]:
    """Return routing config dict for the diagnostic table."""
    try:
        from agents.brain.llm_router import get_routing_config
        return get_routing_config()
    except Exception as exc:
        return {"error": str(exc)}
