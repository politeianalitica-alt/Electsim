# agents/tools — Legislative and Media tools for Politeia Brain agents
# Re-export ToolRegistry so existing `from agents.tools import ToolRegistry` keeps working.

from __future__ import annotations

from typing import Any, Callable


class ToolRegistry:
    _tools: dict[str, Callable[..., Any]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(fn: Callable[..., Any]):
            cls._tools[name] = fn
            return fn
        return decorator

    @classmethod
    def get(cls, name: str) -> Callable[..., Any]:
        if name not in cls._tools:
            raise KeyError(f"Unknown tool: {name}")
        return cls._tools[name]

    @classmethod
    def list_tools(cls) -> dict[str, Callable[..., Any]]:
        return dict(cls._tools)
