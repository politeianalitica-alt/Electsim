"""
Bloque 6 — Memory · 3 tools del GroqBrain.

Razonamiento sobre la memoria institucional del propio sistema. Estas tools
NO acceden directamente a ChromaDB ni Postgres — reciben los resultados de
búsqueda y razonan sobre ellos.

  · search_institutional_memory  — sintetiza recuerdos relevantes a una query
  · validate_prediction          — compara predicción pasada con realidad observada
  · extract_lessons_learned      — aprendizajes accionables tras un evento

(Si necesitas ejecutar la búsqueda semántica, usa `agents.brain.rag_indexer.semantic_search`
y luego pasa los resultados aquí.)

El nombre del módulo es `memory_tools` para no chocar con la palabra
reservada/uso común de `memory` y para distinguirlo del runtime de memoria
de agentes existente.
"""
from __future__ import annotations

from typing import Any


class MemoryToolsMixin:
    """Bloque 6 · Razonamiento sobre memoria institucional."""

    # ─────────────────────────────────────────────────────────────
    def search_institutional_memory(
        self,
        *,
        query: str,
        retrieved_items: list[dict[str, Any]] | str,
        purpose: str = "decisión presente",
    ) -> dict[str, Any]:
        """Sintetiza la memoria relevante para una consulta actual.

        Devuelve: {synthesis, top_lessons, contradictions, gaps_in_memory,
                   recommended_next_search, ...}
        """
        return self._call(
            "memory_search_institutional",
            {
                "query": query,
                "retrieved_items": retrieved_items,
                "purpose": purpose,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def validate_prediction(
        self,
        *,
        prediction_summary: str,
        prediction_date: str,
        observed_outcome: str,
        observed_date: str,
    ) -> dict[str, Any]:
        """Compara una predicción pasada con lo realmente observado.

        Devuelve: {accuracy_grade, what_we_got_right, what_we_got_wrong,
                   why_wrong, calibration_score, ...}
        """
        return self._call(
            "memory_validate_prediction",
            {
                "prediction_summary": prediction_summary,
                "prediction_date": prediction_date,
                "observed_outcome": observed_outcome,
                "observed_date": observed_date,
            },
        )

    # ─────────────────────────────────────────────────────────────
    def extract_lessons_learned(
        self,
        *,
        event_summary: str,
        actions_taken: list[str] | str,
        outcomes: list[str] | str,
        context: str = "",
    ) -> dict[str, Any]:
        """Extrae lecciones accionables tras un evento (electoral, crisis,
        legislativo, mediático...).

        Devuelve: {key_lessons, what_worked, what_failed, transferable_principles,
                   guard_rails_for_next_time, ...}
        """
        return self._call(
            "memory_extract_lessons",
            {
                "event_summary": event_summary,
                "actions_taken": actions_taken,
                "outcomes": outcomes,
                "context": context,
            },
        )
