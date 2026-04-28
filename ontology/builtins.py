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


@ActionRegistry.register("local_ai_chat")
def local_ai_chat_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("local_ai_chat")
    return tool(
        question=ctx.get("question", ctx.get("query", "")),
        k=int(ctx.get("k", 8)),
        domain=ctx.get("domain"),
        use_llm=bool(ctx.get("use_llm", True)),
        allow_tools=bool(ctx.get("allow_tools", True)),
    )


@ActionRegistry.register("local_ai_ingest_path")
def local_ai_ingest_path_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("local_ai_ingest_path")
    return tool(
        path=ctx.get("path", ""),
        max_records=ctx.get("max_records"),
    )


@ActionRegistry.register("local_ai_ontology_summary")
def local_ai_ontology_summary_action(ctx: dict[str, Any]) -> Any:
    _ = ctx
    tool = ToolRegistry.get("local_ai_ontology_summary")
    return tool()


@ActionRegistry.register("backend_manager_chat")
def backend_manager_chat_action(ctx: dict[str, Any]) -> Any:
    tool = ToolRegistry.get("backend_manager_chat")
    return tool(
        question=ctx.get("question", ctx.get("query", "")),
        k=int(ctx.get("k", 10)),
        provider=ctx.get("provider"),
        use_llm=bool(ctx.get("use_llm", True)),
        repo=ctx.get("repo"),
        domain=ctx.get("domain"),
    )
