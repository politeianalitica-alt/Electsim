"""WorkflowRunner · ejecuta un Workflow declarativo sobre el GroqBrain.

Sin LangGraph · es un runner secuencial con:

  · Template resolution: `${key}` en input_template se sustituye desde
    `context.inputs` o `context.outputs` previamente guardados.
  · Retry: hasta `step.retries` reintentos en error transitorio del brain.
  · on_error: 'abort' detiene, 'continue' sigue, 'retry' usa retries.
  · Trace: cada step añade WorkflowToolTrace con latency y ok/error.
  · Audit: si hay investigation_id, persiste un analyst_event al final
    con verb=workflow_completed y resumen en payload.

El runner es agnóstico a las tools concretas · resuelve por reflection
sobre la instancia del brain (`getattr(brain, step.tool)`).
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

from agents.workflows.schemas import (
    Workflow, WorkflowStep, WorkflowContext, WorkflowResult, WorkflowToolTrace,
)

logger = logging.getLogger(__name__)

_TEMPLATE_RE = re.compile(r"\$\{([a-zA-Z0-9_.]+)\}")


# ─────────────────────────────────────────────────────────────────
# Template resolution
# ─────────────────────────────────────────────────────────────────

def _resolve_value(value: Any, context: WorkflowContext) -> Any:
    """Sustituye ${var} en strings y recursiva en dict/list."""
    if isinstance(value, str):
        if not _TEMPLATE_RE.search(value):
            return value
        # Resolver todas las plantillas
        def _replace(m: re.Match) -> str:
            key = m.group(1)
            return str(_lookup(key, context))
        # Caso especial: cuando el string es 100 % una plantilla, devolvemos
        # el valor original (mantiene tipo · dict/list/int) en lugar de str()
        full = _TEMPLATE_RE.fullmatch(value)
        if full:
            resolved = _lookup(full.group(1), context)
            return resolved if resolved is not None else ""
        return _TEMPLATE_RE.sub(_replace, value)
    if isinstance(value, dict):
        return {k: _resolve_value(v, context) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve_value(v, context) for v in value]
    return value


def _lookup(key: str, context: WorkflowContext) -> Any:
    """Busca un valor en context.inputs / context.outputs con soporte de paths.

    Ejemplos:
      'topic'              → context.inputs['topic']
      'narrative_analysis' → context.outputs['narrative_analysis']
      'profile.name'       → context.outputs['profile']['name'] (path simple)
    """
    parts = key.split(".")
    head = parts[0]
    # 1) inputs primero
    if head in context.inputs:
        value: Any = context.inputs[head]
    elif head in context.outputs:
        value = context.outputs[head]
    elif head == "investigation_id":
        return context.investigation_id
    elif head == "actor_id":
        return context.actor_id
    elif head == "pinned_entity_ids":
        return context.pinned_entity_ids
    else:
        return ""

    # Walk path
    for p in parts[1:]:
        if isinstance(value, dict):
            value = value.get(p)
        elif isinstance(value, list):
            try:
                value = value[int(p)]
            except (ValueError, IndexError):
                return ""
        else:
            return ""
        if value is None:
            return ""
    return value


# ─────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────

class WorkflowRunner:
    """Ejecuta un Workflow declarativo sobre una instancia del brain."""

    def __init__(self, brain: Any = None) -> None:
        self.brain = brain

    def _get_brain(self):
        if self.brain is not None:
            return self.brain
        try:
            from agents.brain.groq_client import is_groq_available
            if not is_groq_available():
                return None
            from agents.brain import get_groq_brain
            b = get_groq_brain()
            if b.__class__.__name__ == "_GroqBrainBuildErrorStub":
                return None
            self.brain = b
            return b
        except Exception as exc:
            logger.debug("WorkflowRunner: brain unavailable: %s", exc)
            return None

    def run(self, workflow: Workflow, context: WorkflowContext) -> WorkflowResult:
        """Ejecuta el workflow secuencialmente."""
        started = datetime.now(timezone.utc)
        t0 = time.time()
        trace: list[WorkflowToolTrace] = []
        steps_executed = 0
        steps_failed = 0
        error: str | None = None

        brain = self._get_brain()
        if brain is None:
            finished = datetime.now(timezone.utc)
            return WorkflowResult(
                workflow_slug=workflow.slug, ok=False,
                started_at=started, finished_at=finished,
                total_latency_ms=int((time.time() - t0) * 1000),
                steps_executed=0, steps_failed=0,
                trace=[], outputs={}, final_output=None,
                error="brain_unavailable",
            )

        for step in workflow.steps:
            # Check depends_on
            missing = [d for d in step.depends_on if d not in context.outputs]
            if missing:
                trace.append(WorkflowToolTrace(
                    step_id=step.id, tool=step.tool, ok=False,
                    latency_ms=0, attempts=0, output_key=step.output_to,
                    error=f"depends_on missing: {missing}",
                ))
                steps_failed += 1
                if step.on_error == "abort":
                    error = f"step {step.id}: dependencias faltantes {missing}"
                    break
                continue

            # Resolve input
            try:
                resolved = _resolve_value(step.input_template, context)
                if not isinstance(resolved, dict):
                    resolved = {}
            except Exception as exc:
                trace.append(WorkflowToolTrace(
                    step_id=step.id, tool=step.tool, ok=False,
                    latency_ms=0, attempts=0, output_key=step.output_to,
                    error=f"template_resolve: {exc}",
                ))
                steps_failed += 1
                if step.on_error == "abort":
                    error = f"step {step.id}: template error"
                    break
                continue

            # Run with retry
            ok, output, attempts, latency_ms, step_error = self._run_step(brain, step, resolved)
            steps_executed += 1

            # Persist trace
            summary = self._summarize_output(output)
            trace.append(WorkflowToolTrace(
                step_id=step.id, tool=step.tool, ok=ok,
                latency_ms=latency_ms, attempts=attempts,
                output_key=step.output_to,
                error=step_error,
                output_summary=summary,
            ))

            if ok:
                context.outputs[step.output_to] = output
            else:
                steps_failed += 1
                if step.on_error == "abort":
                    error = f"step {step.id} falló: {step_error}"
                    break

        finished = datetime.now(timezone.utc)
        result = WorkflowResult(
            workflow_slug=workflow.slug,
            ok=(steps_failed == 0 or steps_failed < len(workflow.steps)),
            started_at=started, finished_at=finished,
            total_latency_ms=int((time.time() - t0) * 1000),
            steps_executed=steps_executed, steps_failed=steps_failed,
            trace=trace,
            outputs=dict(context.outputs),
            final_output=context.outputs.get(workflow.output_field),
            error=error,
        )

        # Audit · analyst_event si hay investigation_id
        if context.investigation_id:
            try:
                from agents.entities.investigations import get_investigation_repository
                get_investigation_repository().record_event(
                    investigation_id=context.investigation_id,
                    actor_id=context.actor_id,
                    verb="workflow_completed",
                    target_kind="workflow",
                    target_id=None,
                    payload={
                        "workflow_slug": workflow.slug,
                        "steps_executed": steps_executed,
                        "steps_failed": steps_failed,
                        "ok": result.ok,
                        "latency_ms": result.total_latency_ms,
                    },
                )
            except Exception as exc:
                logger.debug("workflow audit event fallback: %s", exc)

        return result

    def _run_step(
        self, brain, step: WorkflowStep, kwargs: dict[str, Any],
    ) -> tuple[bool, Any, int, int, str | None]:
        """Llama a la tool del brain con kwargs. Retry según step.retries."""
        if not hasattr(brain, step.tool):
            return (False, None, 0, 0, f"tool '{step.tool}' no existe en el brain")
        method = getattr(brain, step.tool)
        attempts = 0
        last_error: str | None = None
        start = time.time()
        max_attempts = max(1, step.retries) if step.on_error == "retry" else 1
        for i in range(max_attempts):
            attempts = i + 1
            try:
                result = method(**kwargs)
                latency = int((time.time() - start) * 1000)
                if isinstance(result, dict):
                    if result.get("ok"):
                        # Devolvemos `result` (interno · sea dict o str)
                        return (True, result.get("result", result), attempts, latency, None)
                    last_error = str(result.get("error", "unknown"))[:200]
                else:
                    return (True, result, attempts, latency, None)
            except TypeError as exc:
                # Probablemente kwargs incorrectos · no reintentamos
                latency = int((time.time() - start) * 1000)
                return (False, None, attempts, latency, f"TypeError: {exc}"[:200])
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"[:200]
                # backoff lineal corto entre intentos
                if i + 1 < max_attempts:
                    time.sleep(0.5 * (i + 1))
        latency = int((time.time() - start) * 1000)
        return (False, None, attempts, latency, last_error)

    @staticmethod
    def _summarize_output(value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, dict):
            # Tomamos los primeros 3 keys y resumimos
            keys = list(value.keys())[:3]
            return "{" + ", ".join(f"{k}=…" for k in keys) + f", +{max(0, len(value)-3)}}}"
        s = str(value)
        return s[:120] + "…" if len(s) > 120 else s


# ─────────────────────────────────────────────────────────────────
# API simplificada
# ─────────────────────────────────────────────────────────────────

def run_workflow(
    workflow: Workflow,
    inputs: dict[str, Any] | None = None,
    *,
    investigation_id: int | None = None,
    actor_id: str = "demo",
    pinned_entity_ids: list[int] | None = None,
    brain: Any = None,
) -> WorkflowResult:
    """API conveniente · construye contexto y corre el workflow."""
    ctx = WorkflowContext(
        investigation_id=investigation_id,
        actor_id=actor_id,
        inputs=dict(inputs or {}),
        outputs={},
        pinned_entity_ids=list(pinned_entity_ids or []),
    )
    runner = WorkflowRunner(brain=brain)
    return runner.run(workflow, ctx)
