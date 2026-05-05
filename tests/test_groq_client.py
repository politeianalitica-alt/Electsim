"""
Tests para agents/brain/groq_client.py.

Todos los tests pasan sin GROQ_API_KEY configurada.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Garantizar que el raíz del proyecto está en sys.path
_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# Asegurar que GROQ_API_KEY no está configurada para estos tests
os.environ.pop("GROQ_API_KEY", None)

from agents.brain.groq_client import (  # noqa: E402
    GROQ_BASE_URL,
    _GROQ_MODELS,
    call_groq,
    call_groq_cached,
    clear_groq_cache,
    get_groq_model,
    is_groq_available,
)


def test_groq_not_available_without_key() -> None:
    """is_groq_available() debe retornar False si GROQ_API_KEY no está."""
    os.environ.pop("GROQ_API_KEY", None)
    assert is_groq_available() is False


def test_call_groq_returns_error_without_key() -> None:
    """call_groq() debe retornar ok=False con mensaje de error cuando no hay API key."""
    os.environ.pop("GROQ_API_KEY", None)
    result = call_groq("test prompt")
    assert result["ok"] is False
    assert "GROQ_API_KEY" in result["error"]


def test_call_groq_returns_dict_structure() -> None:
    """call_groq() siempre retorna un dict con las claves esperadas."""
    os.environ.pop("GROQ_API_KEY", None)
    result = call_groq("test prompt")
    required_keys = {"ok", "result", "model", "from_cache", "latency_ms", "error"}
    assert required_keys.issubset(result.keys())


def test_groq_model_tier_fast() -> None:
    """get_groq_model('fast') debe retornar el modelo fast definido."""
    model = get_groq_model("fast")
    assert model == _GROQ_MODELS["fast"]
    assert isinstance(model, str)
    assert len(model) > 0


def test_groq_model_tier_normal() -> None:
    """get_groq_model('normal') debe retornar el modelo normal definido."""
    model = get_groq_model("normal")
    assert model == _GROQ_MODELS["normal"]
    assert isinstance(model, str)
    assert len(model) > 0


def test_groq_model_tier_deep() -> None:
    """get_groq_model('deep') debe retornar el modelo deep definido."""
    model = get_groq_model("deep")
    assert model == _GROQ_MODELS["deep"]
    assert isinstance(model, str)
    assert len(model) > 0


def test_clear_groq_cache_returns_int() -> None:
    """clear_groq_cache() debe retornar un entero (numero de entradas eliminadas)."""
    result = clear_groq_cache()
    assert isinstance(result, int)
    assert result >= 0


def test_groq_cached_returns_dict() -> None:
    """call_groq_cached() debe retornar un dict con las claves esperadas."""
    os.environ.pop("GROQ_API_KEY", None)
    result = call_groq_cached("test prompt cached", cache_ttl_seconds=60)
    required_keys = {"ok", "result", "model", "from_cache", "latency_ms", "error"}
    assert required_keys.issubset(result.keys())
    assert result["ok"] is False  # sin API key
