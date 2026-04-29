"""Razonamiento IA para ejecuciones de pipelines."""

from __future__ import annotations

import os
from typing import Any


def pipeline_ai_enabled() -> bool:
    return os.environ.get("ELECTSIM_AI_REASON_PIPELINES", "1").strip().lower() not in {"0", "false", "no", "off"}


def reason_pipeline_result(name: str, result: dict[str, Any]) -> dict[str, Any]:
    if not pipeline_ai_enabled():
        return {"enabled": False}
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        if not engine.is_ollama_available():
            return {"enabled": True, "available": False}
        answer = engine.reason_dashboard(
            {"pipeline": name, "result": result},
            insight_type="pipeline",
        )
        return {
            "enabled": True,
            "available": True,
            "model": engine.ollama_model,
            "analysis": answer,
        }
    except Exception as exc:
        return {"enabled": True, "available": False, "error": str(exc)}


def attach_pipeline_ai(name: str, result: dict[str, Any]) -> dict[str, Any]:
    out = dict(result)
    out["ai_analysis"] = reason_pipeline_result(name, result)
    return out

