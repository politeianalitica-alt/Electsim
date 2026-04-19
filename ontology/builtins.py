from __future__ import annotations

from typing import Any

from agents import tools_builtin as _tools_builtin  # noqa: F401
from agents.tools import ToolRegistry
from ontology.actions import ActionRegistry


@ActionRegistry.register("compute_nowcast")
def compute_nowcast_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("get_nowcast")
    return tool()


@ActionRegistry.register("compute_pedersen")
def compute_pedersen_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("compute_pedersen")
    return tool()


@ActionRegistry.register("simulate_campaign")
def simulate_campaign_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("simulate_campaign")
    return tool(
        object_id=ctx.get("object_id"),
        mensaje=ctx.get("mensaje", ""),
        tema=ctx.get("tema", "economia"),
    )


@ActionRegistry.register("semantic_search_posts")
def semantic_search_posts_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("search_posts_semantic")
    return tool(
        query=ctx.get("query", ""),
        k=int(ctx.get("k", 20)),
        tenant_id=ctx.get("tenant_id", "default"),
        filters=ctx.get("filters") or {},
    )
