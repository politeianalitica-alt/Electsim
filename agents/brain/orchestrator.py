"""
Bloque 7 — Orchestrator · 1 tool · political_query (ReAct loop).

`political_query` es la pregunta-a-todo: dada una consulta política
arbitraria, el brain decide qué herramientas de los bloques 1-6 invocar,
en qué orden, y sintetiza una respuesta final con trazabilidad.

Implementación pragmática:
  · Usamos `agents.orchestrator.react_agent.ReactAgent` que ya existe y
    funciona contra Groq (verificado en sesión anterior).
  · `political_query` adapta su salida al formato dict normalizado del brain.

Si en el futuro queremos un ReAct específico de brain (con acceso a las 29
tools propias, no solo las 6 del agente actual), basta extender este módulo.
"""
from __future__ import annotations

import time
from typing import Any

from agents.brain.groq_brain import _normalize_result


class OrchestratorMixin:
    """Bloque 7 · Orquestador agéntico (ReAct)."""

    def political_query(
        self,
        query: str,
        *,
        context: str | None = None,
        max_iterations: int = 10,
    ) -> dict[str, Any]:
        """Pregunta-a-todo: el brain decide tools y orden, devuelve respuesta
        sintetizada + trazas.

        Devuelve el dict normalizado estándar + dos campos extra útiles:
            result.steps        → trazas (Thought/Action/Observation)
            result.tools_used   → lista de tools que el agente invocó
        """
        t0 = time.time()
        model = getattr(self.client, "modelo", "unknown")
        try:
            # Import perezoso para evitar ciclos al cargar el paquete
            from agents.orchestrator.react_agent import ReactAgent
            agent = ReactAgent(max_iterations=max_iterations, temperature=self.default_temperature)
            res = agent.run(query, context=context)
            payload: dict[str, Any] = {
                "answer": res.answer,
                "steps": [
                    {
                        "iteration": s.iteration,
                        "thought": s.thought,
                        "action": s.action,
                        "action_input": s.action_input,
                        "observation": s.observation,
                        "final_answer": s.final_answer,
                    }
                    for s in res.steps
                ],
                "tools_used": list(res.tools_used),
                "iterations": int(res.iterations),
                "agent_error": res.error,
            }
            out = _normalize_result(
                raw=res.answer or "",
                parsed=payload,
                prompt_name="orchestrator_political_query",
                model=model,
                latency_ms=int((time.time() - t0) * 1000),
                tokens_used=0,  # ReactAgent no nos da tokens — campo simbólico
                ok=res.error is None or res.error == "max_iterations_exceeded",
                error=res.error,
            )
            # confidence inferida: alta si terminó limpio en pocas iteraciones
            if res.error is None:
                out["confidence"] = max(0.0, min(1.0, 1.0 - (res.iterations / max(1, max_iterations * 2))))
            return out
        except Exception as e:
            return _normalize_result(
                raw="",
                parsed=None,
                prompt_name="orchestrator_political_query",
                model=model,
                latency_ms=int((time.time() - t0) * 1000),
                tokens_used=0,
                ok=False,
                error=f"{type(e).__name__}: {str(e)[:300]}",
            )
