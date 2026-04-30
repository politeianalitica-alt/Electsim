"""
Servicio de evaluacion automatica LLM-as-judge (Bloque 7).

Flujo:
  1. Cada llamada LLM pasa por log_trace() que persiste un llm_trace.
  2. Si should_sample_for_eval() -> True, encola una evaluacion.
  3. run_eval() llama al modelo juez con un prompt estructurado y guarda llm_eval.
  4. LLMMetrics.record_quality() emite la metrica OTel del score.

Tipos de eval soportados:
  coherence   — el texto es coherente y bien estructurado (0-1)
  relevance   — la respuesta es relevante al prompt (0-1)
  factuality  — ausencia de alucinaciones evidentes (0-1)

Uso:
    from services.llm_eval import LLMEvalService
    svc = LLMEvalService(session)
    trace_id = await svc.log_trace(model="electsim-fast", task_type="classification",
                                    tokens_in=120, tokens_out=40, latency_ms=350.0,
                                    prompt="...", response="...")
    if svc.should_eval(trace_id):
        await svc.run_eval(trace_id, prompt="...", response="...")
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from observability.logging import get_logger, should_sample_for_eval
from observability.metrics import LLMMetrics
from services.llm_client import get_llm_client  # importado aqui para permitir patch en tests

_log = get_logger("services.llm_eval")

# Modelo LLM-juez para evaluacion
_JUDGE_MODEL = "electsim-fast"

_EVAL_TYPES = ("coherence", "relevance", "factuality")


# ---------------------------------------------------------------------------
# Schema para la respuesta del juez
# ---------------------------------------------------------------------------

class _JudgeScore(BaseModel):
    score: float = Field(..., ge=0.0, le=1.0)
    reasoning: str


# ---------------------------------------------------------------------------
# Prompts de evaluacion
# ---------------------------------------------------------------------------

_EVAL_PROMPTS: dict[str, str] = {
    "coherence": (
        "Evalua la coherencia del siguiente texto de respuesta. "
        "Considera si el texto tiene estructura logica, si las frases "
        "se conectan bien y si el argumento es claro. "
        "Responde con JSON: {{\"score\": <0.0-1.0>, \"reasoning\": \"<breve explicacion>\"}}.\n\n"
        "Prompt original: {prompt}\n\nRespuesta: {response}"
    ),
    "relevance": (
        "Evalua si la siguiente respuesta es relevante al prompt dado. "
        "Considera si la respuesta aborda la pregunta directamente. "
        "Responde con JSON: {{\"score\": <0.0-1.0>, \"reasoning\": \"<breve explicacion>\"}}.\n\n"
        "Prompt: {prompt}\n\nRespuesta: {response}"
    ),
    "factuality": (
        "Evalua la factualidad de la siguiente respuesta. "
        "Identifica si hay afirmaciones claramente incorrectas o alucinaciones. "
        "Responde con JSON: {{\"score\": <0.0-1.0>, \"reasoning\": \"<breve explicacion>\"}}.\n\n"
        "Prompt: {prompt}\n\nRespuesta: {response}"
    ),
}


# ---------------------------------------------------------------------------
# Servicio
# ---------------------------------------------------------------------------

class LLMEvalService:
    """
    Persiste traces LLM y ejecuta evaluaciones LLM-as-judge muestreadas.

    El llamador es responsable del commit de la sesion.
    """

    def __init__(self, session: Session) -> None:
        self._session = session

    # ------------------------------------------------------------------
    # API publica
    # ------------------------------------------------------------------

    def log_trace(
        self,
        *,
        model: str,
        task_type: str,
        tokens_in: int = 0,
        tokens_out: int = 0,
        latency_ms: float = 0.0,
        error: Optional[str] = None,
        org_id: Optional[str] = None,
        workspace_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None,
    ) -> uuid.UUID:
        """
        Persiste un registro llm_trace y retorna su UUID.
        sample_for_eval se fija aleatoriamente segun LLM_EVAL_SAMPLE_RATE.
        """
        sample = should_sample_for_eval()
        row_id = uuid.uuid4()

        self._session.execute(
            text("""
                INSERT INTO llm_trace
                  (id, org_id, workspace_id, trace_id, span_id,
                   task_type, model, tokens_in, tokens_out,
                   latency_ms, error, sample_for_eval, created_at)
                VALUES
                  (:id, :org_id, :workspace_id, :trace_id, :span_id,
                   :task_type, :model, :tokens_in, :tokens_out,
                   :latency_ms, :error, :sample_for_eval, :created_at)
            """),
            {
                "id": str(row_id),
                "org_id": org_id,
                "workspace_id": workspace_id,
                "trace_id": trace_id,
                "span_id": span_id,
                "task_type": task_type,
                "model": model,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "latency_ms": latency_ms,
                "error": error,
                "sample_for_eval": sample,
                "created_at": datetime.now(timezone.utc),
            },
        )

        _log.debug(
            "llm_trace_logged",
            trace_row_id=str(row_id),
            model=model,
            task_type=task_type,
            sample_for_eval=sample,
        )
        return row_id

    def should_eval(self, trace_row_id: uuid.UUID) -> bool:
        """Comprueba si el trace esta marcado para evaluacion."""
        row = self._session.execute(
            text("SELECT sample_for_eval FROM llm_trace WHERE id = :id"),
            {"id": str(trace_row_id)},
        ).fetchone()
        return bool(row and row[0])

    async def run_eval(
        self,
        trace_row_id: uuid.UUID,
        *,
        prompt: str,
        response: str,
        eval_types: tuple[str, ...] = _EVAL_TYPES,
    ) -> list[uuid.UUID]:
        """
        Ejecuta evaluaciones LLM-as-judge para los tipos solicitados.
        Persiste resultados en llm_eval y emite metricas OTel.

        Retorna lista de UUIDs de los registros llm_eval creados.
        """
        client = get_llm_client()
        eval_ids: list[uuid.UUID] = []

        for eval_type in eval_types:
            judge_prompt = _EVAL_PROMPTS[eval_type].format(
                prompt=prompt[:800],     # limitar para no gastar tokens
                response=response[:800],
            )
            try:
                result: _JudgeScore = await client.analyze_structured(
                    prompt=judge_prompt,
                    schema=_JudgeScore,
                    task_type="classification",
                    temperature=0.0,
                )
                score = max(0.0, min(1.0, result.score))
                reasoning = result.reasoning
            except Exception as exc:
                _log.warning("llm_eval_judge_failed", eval_type=eval_type, error=str(exc))
                score = 0.0
                reasoning = f"eval_error: {exc}"

            eval_id = uuid.uuid4()
            self._session.execute(
                text("""
                    INSERT INTO llm_eval
                      (id, trace_id, eval_type, judge_model, score, reasoning, metadata, created_at)
                    VALUES
                      (:id, :trace_id, :eval_type, :judge_model, :score, :reasoning, :metadata, :created_at)
                """),
                {
                    "id": str(eval_id),
                    "trace_id": str(trace_row_id),
                    "eval_type": eval_type,
                    "judge_model": _JUDGE_MODEL,
                    "score": score,
                    "reasoning": reasoning,
                    "metadata": "{}",
                    "created_at": datetime.now(timezone.utc),
                },
            )
            eval_ids.append(eval_id)

            # Emitir metrica OTel
            LLMMetrics.record_quality(
                model=_JUDGE_MODEL,
                eval_type=eval_type,
                score=score,
            )

            _log.info(
                "llm_eval_recorded",
                trace_row_id=str(trace_row_id),
                eval_type=eval_type,
                score=score,
            )

        return eval_ids

    def get_recent_scores(
        self,
        *,
        eval_type: str = "coherence",
        limit: int = 100,
    ) -> list[dict]:
        """
        Retorna los scores recientes de un tipo de evaluacion.
        Usado por el endpoint /admin/eval/scores para dashboards.
        """
        rows = self._session.execute(
            text("""
                SELECT e.score, e.eval_type, e.judge_model, e.created_at,
                       t.model, t.task_type, t.org_id
                FROM llm_eval e
                JOIN llm_trace t ON t.id = e.trace_id
                WHERE e.eval_type = :eval_type
                ORDER BY e.created_at DESC
                LIMIT :limit
            """),
            {"eval_type": eval_type, "limit": limit},
        ).fetchall()

        return [
            {
                "score": r[0],
                "eval_type": r[1],
                "judge_model": r[2],
                "created_at": r[3].isoformat() if r[3] else None,
                "model": r[4],
                "task_type": r[5],
                "org_id": str(r[6]) if r[6] else None,
            }
            for r in rows
        ]
