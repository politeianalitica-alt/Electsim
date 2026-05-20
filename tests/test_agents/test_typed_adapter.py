"""
Tests para agents.typed (Sprint 5 · S5.5)

Verifica:
  - is_available() reporta correctamente la disponibilidad de pydantic_ai
  - list_known_tools() devuelve el catálogo
  - _resolve_tool() resuelve callables reales del módulo
  - _resolve_tool() lanza ValueError para tools desconocidas
  - build_typed_agent() lanza TypedAgentUnavailable si pydantic_ai no está
  - TypedAgentResult.to_dict() serializa OK
"""
from __future__ import annotations

import pytest

from agents.typed import (
    TypedAgentResult,
    TypedAgentUnavailable,
    build_typed_agent,
    is_available,
    list_known_tools,
)
from agents.typed.adapter import KNOWN_TOOLS, _resolve_tool


def test_list_known_tools_non_empty():
    tools = list_known_tools()
    assert isinstance(tools, list)
    assert len(tools) >= 5
    # ordenado alfabéticamente
    assert tools == sorted(tools)
    # ningún duplicado
    assert len(tools) == len(set(tools))


def test_resolve_tool_returns_callable():
    """Cada entrada del catálogo debe apuntar a un callable real."""
    for tool_name in list_known_tools():
        fn = _resolve_tool(tool_name)
        assert callable(fn), f"Tool '{tool_name}' no es callable"


def test_resolve_tool_unknown_raises():
    with pytest.raises(ValueError, match="no está en el catálogo"):
        _resolve_tool("nonexistent_tool_xyz")


def test_is_available_returns_bool():
    assert isinstance(is_available(), bool)


def test_typed_agent_result_to_dict_roundtrip():
    r = TypedAgentResult(
        ok=True,
        output={"key": "value"},
        error=None,
        trace=[{"kind": "Msg", "repr": "hola"}],
        model="groq:llama-3.3-70b-versatile",
    )
    d = r.to_dict()
    assert d["ok"] is True
    assert d["output"] == {"key": "value"}
    assert d["error"] is None
    assert d["trace"] == [{"kind": "Msg", "repr": "hola"}]
    assert d["model"] == "groq:llama-3.3-70b-versatile"


def test_typed_agent_result_error_path():
    r = TypedAgentResult(ok=False, error="boom")
    d = r.to_dict()
    assert d["ok"] is False
    assert d["error"] == "boom"
    assert d["output"] is None
    assert d["trace"] == []


def test_build_typed_agent_fails_clean_without_pydantic_ai(monkeypatch):
    """Si pydantic_ai no es importable, levantar TypedAgentUnavailable, no ImportError."""
    import sys
    import importlib

    # Forzar ImportError simulando que pydantic_ai no existe
    saved = sys.modules.pop("pydantic_ai", None)

    def _fake_import(name, *args, **kwargs):
        if name == "pydantic_ai":
            raise ImportError("simulated · pydantic_ai missing")
        return importlib.__import__(name, *args, **kwargs)

    monkeypatch.setattr(importlib, "import_module", lambda n: (_ for _ in ()).throw(ImportError("simulated")) if n == "pydantic_ai" else __import__(n))

    try:
        with pytest.raises(TypedAgentUnavailable, match="pydantic-ai no está instalado"):
            build_typed_agent(
                name="test",
                system_prompt="x",
                tools=["get_current_nowcast"],
            )
    finally:
        if saved is not None:
            sys.modules["pydantic_ai"] = saved


def test_known_tools_catalog_structure():
    """Catálogo: cada valor debe ser tupla (str, str)."""
    for name, value in KNOWN_TOOLS.items():
        assert isinstance(name, str)
        assert isinstance(value, tuple) and len(value) == 2
        module_path, attr = value
        assert isinstance(module_path, str) and module_path.startswith("agents.tools.")
        assert isinstance(attr, str) and attr.isidentifier()
