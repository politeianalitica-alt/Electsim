from __future__ import annotations

from typing import Any, Callable

from ontology.decision_log import DecisionLogger
from ontology.objects import OntologyStore


class ActionRegistry:
    _actions: dict[str, Callable[[dict[str, Any]], Any]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(fn: Callable[[dict[str, Any]], Any]):
            cls._actions[name] = fn
            return fn

        return decorator

    @classmethod
    def list_actions(cls) -> list[str]:
        return sorted(cls._actions.keys())

    @classmethod
    def execute(
        cls,
        action_name: str,
        context: dict[str, Any],
        *,
        user_id: str,
        tenant_id: str,
        logger: DecisionLogger | None,
        ontology: OntologyStore,
    ) -> Any:
        if action_name not in cls._actions:
            raise ValueError(f"Unknown action: {action_name}")
        fn = cls._actions[action_name]
        result = fn(context | {"ontology": ontology, "tenant_id": tenant_id, "user_id": user_id})
        if logger is not None:
            logger.log_decision(
                object_type=context.get("object_type"),
                object_id=str(context.get("object_id")) if context.get("object_id") is not None else None,
                action_name=action_name,
                input_params=context,
                output_summary=_summarize_output(result),
                user_id=user_id,
                tenant_id=tenant_id,
            )
        return result


def _summarize_output(result: Any) -> str:
    text = str(result)
    return text if len(text) < 2000 else f"{text[:1997]}..."
