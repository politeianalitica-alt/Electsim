"""
Tests para agents/brain/politeia_brain.py
"""
from __future__ import annotations

import pytest

# ---------------------------------------------------------------------------
# Import module under test
# ---------------------------------------------------------------------------
from agents.brain.politeia_brain import (
    SYSTEM_PROMPT,
    BrainQuery,
    BrainResponse,
    _build_prompt,
    _demo_answer,
    ask_brain,
    get_available_model,
    is_brain_available,
)


# ---------------------------------------------------------------------------
# Tests: ask_brain
# ---------------------------------------------------------------------------


def test_ask_brain_returns_response():
    """ask_brain siempre retorna un objeto con atributo 'answer'."""
    query = BrainQuery(question="Que pasa en la politica espanola?")
    result = ask_brain(query)
    assert hasattr(result, "answer")
    assert isinstance(result.answer, str)
    assert len(result.answer) > 0


def test_ask_brain_response_model_valid():
    """ask_brain retorna una BrainResponse valida con todos los campos."""
    query = BrainQuery(question="Situacion actual del congreso?")
    result = ask_brain(query)
    assert hasattr(result, "model_used")
    assert hasattr(result, "latency_ms")
    assert hasattr(result, "from_cache")
    assert hasattr(result, "ok")
    assert hasattr(result, "error")
    assert hasattr(result, "context_used")
    assert isinstance(result.latency_ms, int)
    assert result.latency_ms >= 0


def test_ask_brain_demo_mode():
    """En modo demo (sin LLM disponible), ask_brain retorna respuesta de demostracion."""
    query = BrainQuery(question="Test sin LLM disponible")
    result = ask_brain(query)
    # La respuesta debe contener algo (demo o real)
    assert result.answer
    # model_used debe ser un string no vacio
    assert isinstance(result.model_used, str)
    assert len(result.model_used) > 0


# ---------------------------------------------------------------------------
# Tests: _demo_answer
# ---------------------------------------------------------------------------


def test_demo_answer_about_pp():
    """_demo_answer reconoce preguntas sobre el PP."""
    answer = _demo_answer("Que dicen las encuestas sobre el PP?")
    assert "PP" in answer or "Partido Popular" in answer or "partido popular" in answer.lower()
    assert "demostracion" in answer.lower() or "demo" in answer.lower()


def test_demo_answer_about_psoe():
    """_demo_answer reconoce preguntas sobre el PSOE."""
    answer = _demo_answer("Cuales son las perspectivas del PSOE?")
    assert "PSOE" in answer
    assert len(answer) > 50


def test_demo_answer_generic():
    """_demo_answer maneja preguntas genericas."""
    answer = _demo_answer("Como esta la situacion politica en general?")
    assert isinstance(answer, str)
    assert len(answer) > 50
    # Siempre debe incluir el aviso de demostracion
    assert "demostracion" in answer.lower() or "GROQ_API_KEY" in answer or "Ollama" in answer


# ---------------------------------------------------------------------------
# Tests: _build_prompt
# ---------------------------------------------------------------------------


def test_build_prompt_includes_question():
    """_build_prompt incluye la pregunta en el prompt resultante."""
    question = "Que piensas sobre la reforma electoral?"
    query = BrainQuery(question=question)
    prompt = _build_prompt(query)
    assert question in prompt


def test_build_prompt_includes_context():
    """_build_prompt incluye el contexto cuando se proporciona."""
    query = BrainQuery(
        question="Que opinas?",
        context="Contexto de prueba: datos electorales recientes",
    )
    prompt = _build_prompt(query)
    assert "Contexto de prueba" in prompt
    assert "CONTEXTO" in prompt.upper()


# ---------------------------------------------------------------------------
# Tests: get_available_model / is_brain_available
# ---------------------------------------------------------------------------


def test_get_available_model_returns_string():
    """get_available_model retorna siempre un string no vacio."""
    model = get_available_model()
    assert isinstance(model, str)
    assert len(model) > 0


def test_is_brain_available_returns_bool():
    """is_brain_available retorna siempre un bool."""
    available = is_brain_available()
    assert isinstance(available, bool)


# ---------------------------------------------------------------------------
# Tests: Pydantic models
# ---------------------------------------------------------------------------


def test_brain_query_model_valid():
    """BrainQuery valida campos con defaults correctos."""
    query = BrainQuery(question="Pregunta de prueba")
    assert query.question == "Pregunta de prueba"
    assert query.context == ""
    assert query.user_id == ""
    assert query.workspace_id == "default"
    assert query.conversation_history == []


def test_brain_response_model_valid():
    """BrainResponse acepta todos los campos correctamente."""
    response = BrainResponse(
        answer="Respuesta de prueba",
        model_used="demo",
        latency_ms=123,
        from_cache=False,
        ok=True,
    )
    assert response.answer == "Respuesta de prueba"
    assert response.model_used == "demo"
    assert response.latency_ms == 123
    assert response.from_cache is False
    assert response.ok is True
    assert response.error == ""
    assert response.context_used is False
