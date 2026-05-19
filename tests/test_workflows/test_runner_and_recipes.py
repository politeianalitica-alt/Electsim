"""Tests del workflow runner + recipes registry · sin BD ni LLM."""
from __future__ import annotations

import pytest


# ─── Registry ───────────────────────────────────────────────────────

def test_5_recipes_registradas():
    from agents.workflows import list_workflows, WORKFLOWS
    slugs = [w.slug for w in list_workflows()]
    assert "briefing_matinal_sectorial" in slugs
    assert "analisis_adversarial" in slugs
    assert "coalition_deep" in slugs
    assert "narrative_drift_monitor" in slugs
    assert "crisis_playbook" in slugs
    assert len(WORKFLOWS) >= 5


def test_get_workflow_existente_y_nulo():
    from agents.workflows import get_workflow
    assert get_workflow("crisis_playbook") is not None
    assert get_workflow("no_existe") is None


def test_workflow_steps_referencian_tools_validos():
    """Cada step.tool debe ser un método existente en GroqBrainBase + mixins."""
    from agents.workflows import list_workflows
    # Construimos la clase del brain sin instanciarla (sin Groq)
    from agents.brain.groq_brain import _build_groq_brain_class
    Brain = _build_groq_brain_class()
    available = {m for m in dir(Brain) if not m.startswith("_")}
    for w in list_workflows():
        for step in w.steps:
            assert step.tool in available, (
                f"Workflow {w.slug} step {step.id}: tool '{step.tool}' "
                f"no existe en GroqBrain"
            )


# ─── Template resolver ─────────────────────────────────────────────

def test_resolve_value_template_simple():
    from agents.workflows.runner import _resolve_value
    from agents.workflows.schemas import WorkflowContext

    ctx = WorkflowContext(
        actor_id="alice",
        inputs={"sector": "energia", "topic": "renovables"},
        outputs={"step1": {"narrative_name": "Crisis energética"}},
    )
    assert _resolve_value("hola ${sector}", ctx) == "hola energia"
    # Plantilla 100% mantiene tipo (dict)
    out = _resolve_value("${step1}", ctx)
    assert isinstance(out, dict)
    assert out["narrative_name"] == "Crisis energética"
    # Nested dict
    nested = {"a": "${topic}", "b": ["${sector}", "static"]}
    resolved = _resolve_value(nested, ctx)
    assert resolved == {"a": "renovables", "b": ["energia", "static"]}


def test_resolve_path_dotted():
    from agents.workflows.runner import _resolve_value
    from agents.workflows.schemas import WorkflowContext
    ctx = WorkflowContext(
        outputs={"profile": {"name": "Pedro", "tags": ["pp", "presidente"]}},
    )
    assert _resolve_value("${profile.name}", ctx) == "Pedro"
    # Acceso por índice de lista
    assert _resolve_value("${profile.tags.0}", ctx) == "pp"


def test_resolve_key_inexistente_devuelve_vacio():
    from agents.workflows.runner import _resolve_value
    from agents.workflows.schemas import WorkflowContext
    ctx = WorkflowContext(inputs={"foo": "bar"})
    assert _resolve_value("${no_existe}", ctx) == ""


# ─── Runner sin brain (stub) ───────────────────────────────────────

def test_runner_sin_brain_devuelve_error_controlado(monkeypatch):
    """Sin Groq disponible, run_workflow devuelve WorkflowResult con
    error='brain_unavailable' (no excepción)."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    import importlib
    from agents.brain import groq_client
    importlib.reload(groq_client)

    from agents.workflows import run_workflow, get_workflow
    w = get_workflow("briefing_matinal_sectorial")
    assert w is not None
    result = run_workflow(w, inputs={"sector": "defensa", "context_text": "ctx"})
    assert result.workflow_slug == w.slug
    assert result.ok is False
    assert result.error == "brain_unavailable"
    assert result.steps_executed == 0


# ─── Dry-run · valida estructura sin brain ─────────────────────────

def test_dry_run_completa_todos_los_steps_aunque_brain_no_disponible():
    """dry_run NO necesita brain · valida templates + depends_on."""
    from api.routers.workflows import _dry_run, RunWorkflowRequest
    from agents.workflows import get_workflow

    w = get_workflow("crisis_playbook")
    assert w is not None
    body = RunWorkflowRequest(inputs={
        "event_description": "DANA Valencia",
        "affected_actor": "Mazón",
        "sectors_at_risk": ["banca", "vivienda"],
        "context": "29 oct 2024 · 219 fallecidos",
    })
    result = _dry_run(w, body)
    assert result.ok is True
    assert result.steps_executed == len(w.steps)
    assert result.steps_failed == 0
    assert all(t.ok for t in result.trace)
    assert result.final_output == "(dry-run-output)"


# ─── Router ────────────────────────────────────────────────────────

def test_workflows_router_registrado():
    import os
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("OTEL_SDK_DISABLED", "true")
    from api.main import app
    paths = {r.path for r in app.routes if hasattr(r, "path")}
    assert "/api/v1/workflows" in paths
    assert "/api/v1/workflows/{slug}" in paths
    assert "/api/v1/workflows/{slug}/run" in paths
    assert "/api/v1/workflows/{slug}/dry-run" in paths


def test_list_recipes_devuelve_summaries_correctos():
    from api.routers.workflows import list_recipes
    summaries = list_recipes()
    assert len(summaries) >= 5
    for s in summaries:
        assert s.step_count >= 1
        assert isinstance(s.tools_used, list)
        assert len(s.tools_used) >= 1
