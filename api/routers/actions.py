from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from api.dependencies import UserContext, get_decision_logger, get_ontology, require_role
from ontology import ActionRegistry, DecisionLogger, OntologyStore

router = APIRouter()


@router.get("")
def list_actions() -> list[str]:
    return ActionRegistry.list_actions()


@router.post("/{action_name}")
def execute_action(
    action_name: str,
    context: dict[str, Any],
    ontology: OntologyStore = Depends(get_ontology),
    logger: DecisionLogger = Depends(get_decision_logger),
    ctx: UserContext = Depends(require_role(["admin", "analyst", "automation"])),
) -> Any:
    context = dict(context or {})
    context.setdefault("tenant_id", ctx.tenant_id)
    return ActionRegistry.execute(
        action_name,
        context,
        user_id=ctx.user_id,
        tenant_id=ctx.tenant_id,
        logger=logger,
        ontology=ontology,
    )
