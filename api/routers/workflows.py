"""Router /api/v1/workflows · workflows agentic (composición de tools).

GET    /api/v1/workflows                      → lista recipes registradas
GET    /api/v1/workflows/{slug}               → detalle de una recipe
POST   /api/v1/workflows/{slug}/run           → ejecuta el workflow
POST   /api/v1/workflows/{slug}/dry-run       → valida la recipe sin llamar al brain

Cada llamada a /run persiste un analyst_event si hay investigation_id.
El frontend puede invocar workflows desde el panel del copiloto o desde
una vista dedicada `/workspaces/.../workflows`.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from agents.workflows import (
    list_workflows, get_workflow, run_workflow,
    Workflow, WorkflowResult, WorkflowStep,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


# ─────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────

class RunWorkflowRequest(BaseModel):
    inputs: dict[str, Any] = Field(default_factory=dict)
    investigation_id: int | None = None
    pinned_entity_ids: list[int] = Field(default_factory=list)
    dry_run: bool = False


class WorkflowSummary(BaseModel):
    slug: str
    title: str
    description: str
    category: str
    step_count: int
    tools_used: list[str]
    inputs_schema: dict[str, str]


def _summary(w: Workflow) -> WorkflowSummary:
    tools = list({s.tool for s in w.steps})
    return WorkflowSummary(
        slug=w.slug, title=w.title, description=w.description,
        category=w.category, step_count=w.step_count, tools_used=tools,
        inputs_schema=w.inputs_schema,
    )


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[WorkflowSummary])
def list_recipes() -> list[WorkflowSummary]:
    """Lista las recipes registradas en el workflow registry."""
    return [_summary(w) for w in list_workflows()]


@router.get("/{slug}", response_model=Workflow)
def get_recipe(slug: str) -> Workflow:
    """Devuelve la recipe completa (steps + templates) por slug."""
    w = get_workflow(slug)
    if not w:
        raise HTTPException(404, detail=f"workflow '{slug}' no registrado")
    return w


@router.post("/{slug}/run", response_model=WorkflowResult)
def run_recipe(
    slug: str,
    body: RunWorkflowRequest,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> WorkflowResult:
    """Ejecuta un workflow con los inputs y contexto dado."""
    w = get_workflow(slug)
    if not w:
        raise HTTPException(404, detail=f"workflow '{slug}' no registrado")
    if body.dry_run:
        return _dry_run(w, body)
    actor = (x_user_id or "demo").strip() or "demo"
    try:
        return run_workflow(
            w,
            inputs=body.inputs,
            investigation_id=body.investigation_id,
            actor_id=actor,
            pinned_entity_ids=body.pinned_entity_ids,
        )
    except Exception as exc:
        logger.exception("workflow.run falló")
        raise HTTPException(500, detail=str(exc)[:300]) from exc


@router.post("/{slug}/dry-run", response_model=WorkflowResult)
def dry_run_recipe(slug: str, body: RunWorkflowRequest) -> WorkflowResult:
    """Valida que la recipe es ejecutable · sin llamar al brain.

    Sustituye plantillas, verifica depends_on, y devuelve trace con ok=True
    para todos los steps. Útil para tests + debugging de recipes nuevas.
    """
    w = get_workflow(slug)
    if not w:
        raise HTTPException(404, detail=f"workflow '{slug}' no registrado")
    return _dry_run(w, body)


def _dry_run(w: Workflow, body: RunWorkflowRequest) -> WorkflowResult:
    """Simula la ejecución del workflow sin llamar al brain.

    Cada step se marca ok=True con output_summary='(dry-run)'. Esto
    sirve para validar la estructura del DAG, los templates y dependencias.
    """
    from agents.workflows.schemas import WorkflowToolTrace
    from agents.workflows.runner import _resolve_value
    from agents.workflows.schemas import WorkflowContext

    started = datetime.now(timezone.utc)
    t0 = time.time()
    ctx = WorkflowContext(
        investigation_id=body.investigation_id,
        actor_id="dry-run",
        inputs=dict(body.inputs or {}),
        outputs={},
        pinned_entity_ids=list(body.pinned_entity_ids or []),
    )
    trace: list[WorkflowToolTrace] = []
    steps_executed = 0
    steps_failed = 0

    for step in w.steps:
        missing = [d for d in step.depends_on if d not in ctx.outputs]
        if missing:
            trace.append(WorkflowToolTrace(
                step_id=step.id, tool=step.tool, ok=False,
                latency_ms=0, attempts=0, output_key=step.output_to,
                error=f"dry-run: depends_on faltantes {missing}",
            ))
            steps_failed += 1
            continue
        try:
            _resolve_value(step.input_template, ctx)
        except Exception as exc:
            trace.append(WorkflowToolTrace(
                step_id=step.id, tool=step.tool, ok=False,
                latency_ms=0, attempts=0, output_key=step.output_to,
                error=f"dry-run template: {exc}",
            ))
            steps_failed += 1
            continue
        # Simulamos output exitoso
        ctx.outputs[step.output_to] = "(dry-run-output)"
        trace.append(WorkflowToolTrace(
            step_id=step.id, tool=step.tool, ok=True,
            latency_ms=0, attempts=1, output_key=step.output_to,
            output_summary="(dry-run)",
        ))
        steps_executed += 1

    finished = datetime.now(timezone.utc)
    return WorkflowResult(
        workflow_slug=w.slug,
        ok=steps_failed == 0,
        started_at=started, finished_at=finished,
        total_latency_ms=int((time.time() - t0) * 1000),
        steps_executed=steps_executed, steps_failed=steps_failed,
        trace=trace,
        outputs=dict(ctx.outputs),
        final_output=ctx.outputs.get(w.output_field),
        error=None,
    )
