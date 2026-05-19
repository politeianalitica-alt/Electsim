"""Schemas Pydantic del workflow registry.

Diseño: el `Workflow` es declarativo (data), no código. Esto permite:

  - serializarlo a JSON (export/import entre tenants)
  - editarlo desde UI sin tocar código
  - testear el grafo sin invocar tools reales (dry-run mode)

Cada step referencia una tool por nombre (string). El runner resuelve
el método del brain por reflection. Input templating soporta `${var}`
para referirse a outputs previos o context inicial.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────────────────────────────────
# Workflow declarativo
# ─────────────────────────────────────────────────────────────────

OnError = Literal["abort", "continue", "retry"]


class WorkflowStep(BaseModel):
    """Un paso del workflow · una llamada a una tool del brain."""
    id: str = Field(min_length=1, max_length=80)
    tool: str = Field(min_length=1, description="Nombre del método del brain (ej. 'analyze_narrative')")
    description: str = ""
    input_template: dict[str, Any] = Field(
        default_factory=dict,
        description="Kwargs · valores estáticos o ${var} con keys del contexto",
    )
    output_to: str = Field(min_length=1, description="key del contexto donde se guarda result")
    on_error: OnError = "abort"
    depends_on: list[str] = Field(default_factory=list)
    retries: int = Field(default=1, ge=0, le=5)


class Workflow(BaseModel):
    """Recipe declarativa · lista de WorkflowStep + metadata."""
    slug: str = Field(min_length=2, max_length=80)
    title: str
    description: str = ""
    category: Literal[
        "briefing", "intelligence", "forecast",
        "narrative", "crisis", "discovery", "custom",
    ] = "briefing"
    inputs_schema: dict[str, str] = Field(
        default_factory=dict,
        description="Tipo esperado de cada input inicial · documental",
    )
    steps: list[WorkflowStep]
    output_field: str = Field(
        default="output",
        description="Campo del contexto que se considera el output final del workflow",
    )

    @property
    def step_count(self) -> int:
        return len(self.steps)


# ─────────────────────────────────────────────────────────────────
# Ejecución
# ─────────────────────────────────────────────────────────────────

class WorkflowContext(BaseModel):
    """Contexto mutable que cruza el workflow · inputs + outputs por step."""
    investigation_id: int | None = None
    actor_id: str = "demo"
    inputs: dict[str, Any] = Field(default_factory=dict)
    outputs: dict[str, Any] = Field(default_factory=dict)
    pinned_entity_ids: list[int] = Field(default_factory=list)


class WorkflowToolTrace(BaseModel):
    """Trace de una llamada a tool dentro del workflow."""
    step_id: str
    tool: str
    ok: bool
    latency_ms: int
    attempts: int = 1
    error: str | None = None
    output_key: str
    output_summary: str = ""  # resumen corto del output


class WorkflowResult(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    workflow_slug: str
    ok: bool
    started_at: datetime
    finished_at: datetime
    total_latency_ms: int
    steps_executed: int
    steps_failed: int
    trace: list[WorkflowToolTrace] = Field(default_factory=list)
    outputs: dict[str, Any] = Field(default_factory=dict)
    final_output: Any = None
    error: str | None = None
