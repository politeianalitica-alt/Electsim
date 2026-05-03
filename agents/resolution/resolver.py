"""
Resolver de identidades en cascada A → B → C (Bloque 2).

Umbrales:
  A) Lookup YAML: score 1.0 → auto-resolver (ya hecho en Bloque 1)
  B) Embedding >= 0.88  → auto-resolver
  B) Embedding >= 0.72  → resolver + encolar en review
  C) Ollama aceptado (>= 0.65)  → resolver (o review segun umbral)
  Ninguno → encolar en review sin resolucion

Para menciones ya resueltas por YAML (Bloque 1), este modulo
solo genera el registro en entity_mentions sin pasar por B ni C.
"""
from __future__ import annotations

import logging
from typing import Optional

from .embedding_store import EmbeddingIndex
from .models import Candidate, ResolutionMethod, ResolutionResult
from .ollama_judge import judge as ollama_judge

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Umbrales
# ---------------------------------------------------------------------------

_THRESHOLD_AUTO   = 0.88   # embedding: auto-resolver sin revision
_THRESHOLD_REVIEW = 0.72   # embedding: resolver pero encolar review
_THRESHOLD_DISCARD = 0.50  # embedding: candidatos por debajo se descartan


# ---------------------------------------------------------------------------
# Clase Resolver
# ---------------------------------------------------------------------------

class CascadeResolver:
    """
    Implementa la cascada A → B → C por mencion.

    Se inicializa con un EmbeddingIndex ya cargado.
    """

    def __init__(self, embedding_index: EmbeddingIndex) -> None:
        self._index = embedding_index

    def resolve(
        self,
        raw_mention_id: int,
        surface_text: str,
        surface_norm: str,
        context_window: str,
        ner_label: str,
        yaml_resolved_qid: Optional[str] = None,
    ) -> ResolutionResult:
        """
        Resuelve una mencion usando la cascada A → B → C.

        Args:
          raw_mention_id:    id en raw_mentions
          surface_text:      texto literal
          surface_norm:      normalizado T1-T8
          context_window:    oracion contenedora
          ner_label:         PER|ORG|LOC
          yaml_resolved_qid: QID pre-resuelto por lookup YAML en Bloque 1

        Returns:
          ResolutionResult con todos los campos rellenos.
        """
        # --- A: YAML (ya resuelto en Bloque 1) ---
        if yaml_resolved_qid:
            return ResolutionResult(
                raw_mention_id=raw_mention_id,
                surface_text=surface_text,
                surface_norm=surface_norm,
                context_window=context_window,
                method=ResolutionMethod.YAML,
                resolved_qid=yaml_resolved_qid,
                score=1.0,
                needs_review=False,
            )

        # --- B: Embedding similarity ---
        candidates: list[Candidate] = []
        if self._index.ready:
            candidates = self._index.search(
                surface_norm=surface_norm,
                context=context_window,
                top_k=5,
                min_score=_THRESHOLD_DISCARD,
            )

        if candidates:
            top = candidates[0]

            if top.score >= _THRESHOLD_AUTO:
                return ResolutionResult(
                    raw_mention_id=raw_mention_id,
                    surface_text=surface_text,
                    surface_norm=surface_norm,
                    context_window=context_window,
                    method=ResolutionMethod.EMBEDDING,
                    resolved_qid=top.qid,
                    score=top.score,
                    candidates=candidates,
                    needs_review=False,
                )

            if top.score >= _THRESHOLD_REVIEW:
                return ResolutionResult(
                    raw_mention_id=raw_mention_id,
                    surface_text=surface_text,
                    surface_norm=surface_norm,
                    context_window=context_window,
                    method=ResolutionMethod.EMBEDDING,
                    resolved_qid=top.qid,
                    score=top.score,
                    candidates=candidates,
                    needs_review=True,  # resuelto pero con revision pendiente
                )

        # --- C: Ollama arbitro ---
        if candidates:
            resolved_qid, score, method, raw_resp = ollama_judge(
                surface_text=surface_text,
                surface_norm=surface_norm,
                context_window=context_window,
                candidates=candidates,
            )
            needs_review = (method == ResolutionMethod.REVIEW) or (score < _THRESHOLD_AUTO)
            return ResolutionResult(
                raw_mention_id=raw_mention_id,
                surface_text=surface_text,
                surface_norm=surface_norm,
                context_window=context_window,
                method=method if resolved_qid else ResolutionMethod.REVIEW,
                resolved_qid=resolved_qid,
                score=score,
                candidates=candidates,
                ollama_response=raw_resp,
                needs_review=needs_review,
            )

        # --- Sin candidatos: encolar para revision ---
        return ResolutionResult(
            raw_mention_id=raw_mention_id,
            surface_text=surface_text,
            surface_norm=surface_norm,
            context_window=context_window,
            method=ResolutionMethod.REVIEW,
            resolved_qid=None,
            score=0.0,
            candidates=[],
            needs_review=True,
        )
