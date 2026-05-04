"""
Run Logger — registra ejecuciones de agentes y llamadas a herramientas.

Guarda en:
  - BD: tablas agent_runs y tool_calls (si existen)
  - Memoria: lista circular en RAM (fallback siempre disponible)
"""
from __future__ import annotations

import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Any

from .schemas import AgentRunResult, ToolCallRecord

logger = logging.getLogger(__name__)

# ── Memoria en RAM ────────────────────────────────────────────────────────────

_RUNS_MEMORY: deque[dict[str, Any]] = deque(maxlen=200)
_TOOL_CALLS_MEMORY: deque[dict[str, Any]] = deque(maxlen=500)


# ── BD helpers ────────────────────────────────────────────────────────────────

def _get_engine() -> Any:
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        try:
            from database import get_engine  # type: ignore
            return get_engine()
        except Exception:
            return None


def _safe_json(obj: Any) -> str:
    try:
        return json.dumps(obj, default=str)
    except Exception:
        return "{}"


# ── Log agent run ─────────────────────────────────────────────────────────────

def log_agent_run(result: AgentRunResult) -> None:
    """
    Persiste un AgentRunResult en agent_runs (BD) y en memoria.
    No falla si la tabla no existe.
    """
    record = {
        "run_id": result.run_id,
        "agent_name": result.agent_name,
        "task": result.task,
        "module": result.module,
        "answer": result.answer[:2000] if result.answer else "",
        "model_used": result.model_used,
        "provider": result.provider,
        "confidence": result.confidence,
        "latency_ms": result.latency_ms,
        "status": result.status,
        "error": result.error,
        "tools_used": result.tools_used,
        "created_at": result.created_at.isoformat(),
    }
    _RUNS_MEMORY.appendleft(record)

    try:
        from sqlalchemy import text as sa_text
        engine = _get_engine()
        if engine is None:
            return
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO agent_runs (
                    id, agent_name, module, task, model_used, provider,
                    prompt_tokens, completion_tokens, latency_ms,
                    answer, structured_output, evidence, tools_used,
                    confidence, status, error, created_at
                ) VALUES (
                    :id, :agent_name, :module, :task, :model_used, :provider,
                    :prompt_tokens, :completion_tokens, :latency_ms,
                    :answer, CAST(:structured_output AS JSONB),
                    CAST(:evidence AS JSONB), CAST(:tools_used AS JSONB),
                    :confidence, :status, :error, :created_at
                )
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": result.run_id,
                "agent_name": result.agent_name,
                "module": result.module,
                "task": result.task[:1000],
                "model_used": result.model_used,
                "provider": result.provider,
                "prompt_tokens": None,
                "completion_tokens": None,
                "latency_ms": result.latency_ms,
                "answer": (result.answer or "")[:5000],
                "structured_output": _safe_json(result.structured_output),
                "evidence": _safe_json([e.model_dump() for e in result.evidence_pack.evidence]),
                "tools_used": _safe_json(result.tools_used),
                "confidence": result.confidence,
                "status": result.status,
                "error": result.error,
                "created_at": result.created_at,
            })
    except Exception as exc:
        logger.debug("log_agent_run BD error: %s", exc)


def log_tool_call(record: ToolCallRecord) -> None:
    """Persiste una ToolCallRecord en tool_calls y en memoria."""
    _TOOL_CALLS_MEMORY.appendleft({
        "run_id": record.run_id,
        "tool_name": record.tool_name,
        "status": record.status,
        "latency_ms": record.latency_ms,
        "created_at": record.created_at.isoformat(),
    })

    try:
        from sqlalchemy import text as sa_text
        engine = _get_engine()
        if engine is None:
            return
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO tool_calls (run_id, tool_name, input, output, status, error, latency_ms, created_at)
                VALUES (
                    CAST(:run_id AS UUID), :tool_name,
                    CAST(:input AS JSONB), CAST(:output AS JSONB),
                    :status, :error, :latency_ms, :created_at
                )
            """), {
                "run_id": record.run_id,
                "tool_name": record.tool_name,
                "input": _safe_json(record.input),
                "output": _safe_json(record.output),
                "status": record.status,
                "error": record.error,
                "latency_ms": record.latency_ms,
                "created_at": record.created_at,
            })
    except Exception as exc:
        logger.debug("log_tool_call BD error: %s", exc)


# ── Consultas ─────────────────────────────────────────────────────────────────

def get_recent_runs(limit: int = 20) -> list[dict[str, Any]]:
    """Devuelve ejecuciones recientes (BD primero, luego memoria)."""
    try:
        from sqlalchemy import text as sa_text
        import pandas as pd
        engine = _get_engine()
        if engine:
            df = pd.read_sql(sa_text("""
                SELECT id, agent_name, module, task, model_used, confidence,
                       status, latency_ms, created_at
                FROM agent_runs
                ORDER BY created_at DESC NULLS LAST
                LIMIT :limit
            """), engine, params={"limit": limit})
            if not df.empty:
                return df.fillna("").to_dict("records")
    except Exception:
        pass
    return list(_RUNS_MEMORY)[:limit]


def get_run_by_id(run_id: str) -> dict[str, Any] | None:
    """Devuelve una ejecución por ID."""
    for r in _RUNS_MEMORY:
        if r.get("run_id") == run_id:
            return r
    try:
        from sqlalchemy import text as sa_text
        import pandas as pd
        engine = _get_engine()
        if engine:
            df = pd.read_sql(sa_text(
                "SELECT * FROM agent_runs WHERE id = :rid LIMIT 1"
            ), engine, params={"rid": run_id})
            if not df.empty:
                return df.fillna("").to_dict("records")[0]
    except Exception:
        pass
    return None
