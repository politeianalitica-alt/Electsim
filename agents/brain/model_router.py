"""
Model Router — selecciona el modelo correcto según el task_type.

Usa variables de entorno. Degradación segura a modelos más ligeros.
No falla si Ollama no está disponible — devuelve la ruta y el gateway
intenta conectarse.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from .schemas import ModelRoute

logger = logging.getLogger(__name__)

# ── Variables de entorno ──────────────────────────────────────────────────────

_BRAIN_MODEL   = os.getenv("ELECTSIM_OLLAMA_MODEL",           "qwen2.5:7b")
_FAST_MODEL    = os.getenv("ELECTSIM_OLLAMA_FAST_MODEL",      "llama3.2:3b")
_GENERAL_MODEL = os.getenv("ELECTSIM_OLLAMA_GENERAL_MODEL",   "qwen2.5:7b")
_EMBED_MODEL   = os.getenv("ELECTSIM_OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
_CLAUDE_MODEL  = os.getenv("ELECTSIM_CLAUDE_MODEL",           "claude-3-5-sonnet-20241022")

# ── Tabla de rutas por task_type ──────────────────────────────────────────────

_ROUTES: dict[str, dict[str, Any]] = {
    "fast": {
        "provider": "ollama", "model": _FAST_MODEL,
        "fallback_provider": "ollama", "fallback_model": _GENERAL_MODEL,
        "params": {"num_predict": 256, "temperature": 0.2, "top_p": 0.85},
    },
    "normal": {
        "provider": "ollama", "model": _BRAIN_MODEL,
        "fallback_provider": "anthropic", "fallback_model": _CLAUDE_MODEL,
        "params": {"num_predict": 700, "temperature": 0.3, "top_p": 0.9},
    },
    "deep": {
        "provider": "ollama", "model": _GENERAL_MODEL,
        "fallback_provider": "anthropic", "fallback_model": _CLAUDE_MODEL,
        "params": {"num_predict": 2048, "temperature": 0.25, "top_p": 0.9},
    },
    "legal": {
        "provider": "ollama", "model": _BRAIN_MODEL,
        "fallback_provider": "anthropic", "fallback_model": _CLAUDE_MODEL,
        "params": {"num_predict": 800, "temperature": 0.15, "top_p": 0.85},
    },
    "media": {
        "provider": "ollama", "model": _GENERAL_MODEL,
        "fallback_provider": "ollama", "fallback_model": _FAST_MODEL,
        "params": {"num_predict": 512, "temperature": 0.35, "top_p": 0.9},
    },
    "electoral": {
        "provider": "ollama", "model": _BRAIN_MODEL,
        "fallback_provider": "anthropic", "fallback_model": _CLAUDE_MODEL,
        "params": {"num_predict": 1024, "temperature": 0.2, "top_p": 0.85},
    },
    "system": {
        "provider": "ollama", "model": _FAST_MODEL,
        "fallback_provider": "ollama", "fallback_model": _GENERAL_MODEL,
        "params": {"num_predict": 200, "temperature": 0.1, "top_p": 0.8},
    },
    "embeddings": {
        "provider": "ollama", "model": _EMBED_MODEL,
        "fallback_provider": "sentence_transformers",
        "fallback_model": "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        "params": {},
    },
}

# Alias para mapeo de módulo → task_type
_MODULE_TO_TASK: dict[str, str] = {
    "legislativo":   "legal",
    "medios":        "media",
    "electoral":     "electoral",
    "coalicion":     "electoral",
    "actores":       "normal",
    "riesgo":        "deep",
    "geopolitica":   "deep",
    "communication": "normal",
    "workspace":     "normal",
    "sistema":       "system",
    "general":       "normal",
}


def get_route(task_type: str = "normal") -> ModelRoute:
    """
    Devuelve la ModelRoute para un task_type.

    Args:
        task_type: "fast" | "normal" | "deep" | "legal" | "media" | "electoral" | "system"

    Returns:
        ModelRoute con provider, model, fallback y params.
    """
    cfg = _ROUTES.get(task_type, _ROUTES["normal"])
    return ModelRoute(
        task_type=task_type,
        provider=cfg["provider"],
        model=cfg["model"],
        fallback_provider=cfg.get("fallback_provider"),
        fallback_model=cfg.get("fallback_model"),
        params=cfg.get("params", {}),
    )


def get_route_for_module(module: str) -> ModelRoute:
    """Convierte un nombre de módulo de dashboard a su ModelRoute."""
    task_type = _MODULE_TO_TASK.get(module, "normal")
    return get_route(task_type)


def list_routes() -> dict[str, ModelRoute]:
    """Devuelve todas las rutas disponibles."""
    return {k: get_route(k) for k in _ROUTES}
