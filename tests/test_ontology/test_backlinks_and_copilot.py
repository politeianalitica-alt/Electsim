"""Tests · backlinks API + brain copilot router smoke."""
from __future__ import annotations

import os

import pytest


# ─── Schemas ────────────────────────────────────────────────────────

def test_entity_backlinks_schema_default_empty():
    from agents.entities.schemas import EntityBacklinks
    bl = EntityBacklinks(entity_id=42)
    assert bl.entity_id == 42
    assert bl.investigations == []
    assert bl.artifact_refs == []
    assert bl.total_pinned == 0
    assert bl.total_artifact_refs == 0


def test_copilot_action_literal_acepta_solo_canonicos():
    from api.routers.brain_copilot import CopilotRequest, CopilotAction
    import typing as _t
    acciones = list(_t.get_args(CopilotAction))
    assert "resumen_caso" in acciones
    assert "hipotesis_ach" in acciones
    assert "sources_evidencia" in acciones
    assert "generar_briefing" in acciones
    assert "perfil_actor" in acciones
    assert "coalicion" in acciones
    assert "free_query" in acciones

    # Valid
    CopilotRequest(prompt="X", action="resumen_caso")
    # Invalid
    with pytest.raises(Exception):
        CopilotRequest(prompt="X", action="invalid_action")


def test_copilot_prompt_obligatorio_y_limitado():
    from api.routers.brain_copilot import CopilotRequest
    with pytest.raises(Exception):
        CopilotRequest(prompt="", action="free_query")
    # Max length 4000
    with pytest.raises(Exception):
        CopilotRequest(prompt="x" * 5000, action="free_query")
    # OK
    req = CopilotRequest(prompt="¿Qué dice el BOE de hoy?")
    assert req.action == "free_query"


# ─── Router endpoints ───────────────────────────────────────────────

def test_backlinks_endpoint_registrado():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/entities/{entity_id}/backlinks" in paths


def test_copilot_endpoint_registrado():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/brain/copilot" in paths


# ─── Copilot stub (sin Groq) ────────────────────────────────────────

def test_copilot_sin_groq_devuelve_stub_ok():
    """Sin GROQ_API_KEY/OPENAI_API_KEY, el copiloto devuelve un stub
    explicativo sin propagar excepción (Pilar 3 · resiliencia)."""
    import os as _os
    _os.environ.pop("GROQ_API_KEY", None)
    _os.environ.pop("OPENAI_API_KEY", None)
    from api.routers.brain_copilot import copilot, CopilotRequest
    req = CopilotRequest(prompt="¿Qué pasa con la coalición?", action="free_query")
    resp = copilot(req, x_user_id=None)
    assert resp.ok is False
    assert resp.error == "brain_unavailable"
    assert "brain Groq" in resp.answer.lower() or "groq" in resp.answer.lower()
    # Suggested actions siempre vienen, para que la UI no quede vacía
    assert len(resp.suggested_actions) >= 1


# ─── Backlinks helper sin BD ────────────────────────────────────────

def test_backlinks_repository_sin_bd_devuelve_vacio():
    """backlinks_for_entity es resiliente · BD no inicializada → listas vacías."""
    from agents.entities.investigations import InvestigationRepository
    # engine None fuerza el fallback
    repo = InvestigationRepository(engine=None)
    # Ejecutar sin ensure_engine no crashea
    bl = repo.backlinks_for_entity(999, owner_id="demo", limit=10)
    assert bl.entity_id == 999
    assert bl.investigations == []
    assert bl.artifact_refs == []
