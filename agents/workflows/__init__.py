"""Workflows agentic · composición declarativa de tools del brain.

Resuelve la limitación documentada en VISION_2027.md §7: las 27 tools del
GroqBrain son atómicas (input → llamada Groq → output). Faltaba componer
varias tools en flujos de varios pasos.

Diseño: registry declarativo + runner. No depende de LangGraph (50 MB extra
en el deploy). Cada `Workflow` es una lista de `WorkflowStep` con:

  - tool          · nombre de la tool del brain
  - input_from    · mapeo de campos del contexto a kwargs (templating ligero)
  - output_to     · key del contexto donde guardar el resultado
  - on_error      · "abort" | "continue" | "retry" (default abort)
  - depends_on    · lista de keys requeridas en contexto

El runner ejecuta secuencialmente, registra trace, persiste analyst_event
y retorna `WorkflowResult` con tool_trace + outputs + ok.

Recipes canónicas en `recipes.py`. Para añadir una nueva: declárala como
constante `Workflow(...)` y aparece automáticamente vía `list_workflows()`.
"""

from agents.workflows.schemas import (
    WorkflowStep, Workflow, WorkflowContext,
    WorkflowResult, WorkflowToolTrace,
)
from agents.workflows.runner import WorkflowRunner, run_workflow
from agents.workflows.recipes import (
    WORKFLOWS, list_workflows, get_workflow,
)

__all__ = [
    "WorkflowStep", "Workflow", "WorkflowContext",
    "WorkflowResult", "WorkflowToolTrace",
    "WorkflowRunner", "run_workflow",
    "WORKFLOWS", "list_workflows", "get_workflow",
]
