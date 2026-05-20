"""IPTC Media Topic Classifier · estándar internacional (Sprint 2 · S2.2).

> **Sprint 2 · S2.2** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 2`)

Clasifica articulos de noticias segun la taxonomia **IPTC NewsCodes** —
estandar internacional usado por agencias profesionales (Reuters, AFP, EFE,
AP) para categorizar contenidos editoriales.

Modelo HuggingFace: `classla/multilingual-IPTC-news-topic-classifier`
- Base: XLM-RoBERTa large
- Finetuned sobre 17 top-level IPTC topics (politica, economia, deportes,
  cultura, salud, ciencia, justicia, etc.)
- Multilingüe (>30 idiomas, español incluido)
- F1 macro = 0.746

Diferencia con BERTopic (Sprint 1):
- BERTopic = topics DESCUBIERTOS automaticamente en nuestro corpus
- IPTC      = topics ESTANDAR fijos · auditable + comparable inter-medio

Caso de uso:
  Tabla de comparativa por medio: '% cobertura sobre politica este mes' es
  defendible ante el cliente porque la categorizacion es estandar publico,
  no inventada por nosotros.

Activacion opcional · igual que pysentimiento (1.5GB de modelo):
  pip install transformers torch
  export ELECTSIM_IPTC_BACKEND=hf

Fallback: si transformers no esta o el modelo no se puede cargar, devuelve
`[]` sin romper.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Any

logger = logging.getLogger(__name__)

# Modelo por defecto · classla/multilingual-IPTC-news-topic-classifier
_DEFAULT_MODEL = os.environ.get(
    "ELECTSIM_IPTC_MODEL",
    "classla/multilingual-IPTC-news-topic-classifier",
)

# Top-level IPTC NewsCodes (17 categorias) · sirven como vocabulario controlado
# para validar outputs del modelo y para fallback heuristic.
IPTC_TOP_LEVEL_TOPICS: tuple[str, ...] = (
    "arts, culture, entertainment and media",
    "conflict, war and peace",
    "crime, law and justice",
    "disaster, accident and emergency incident",
    "economy, business and finance",
    "education",
    "environment",
    "health",
    "human interest",
    "labour",
    "lifestyle and leisure",
    "politics",
    "religion",
    "science and technology",
    "society",
    "sport",
    "weather",
)


# ────────────────────────────────────────────────────────────────────
# Backend HuggingFace · pipeline transformers
# ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_iptc_pipeline() -> Any | None:
    """Singleton del classifier IPTC · None si transformers no instalado."""
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None

    backend = os.environ.get("ELECTSIM_IPTC_BACKEND", "auto").strip().lower()
    if backend in {"off", "disabled"}:
        return None

    try:
        from transformers import pipeline  # type: ignore
    except ImportError:
        logger.debug("iptc_classifier: transformers no instalado")
        return None

    try:
        pipe = pipeline(
            "text-classification",
            model=_DEFAULT_MODEL,
            top_k=3,  # devolver top-3 IPTC topics
            truncation=True,
            max_length=512,
        )
        logger.info("iptc_classifier: modelo %s cargado", _DEFAULT_MODEL)
        return pipe
    except Exception as exc:
        logger.warning("iptc_classifier: error cargando modelo · %s", exc)
        return None


# ────────────────────────────────────────────────────────────────────
# API publica
# ────────────────────────────────────────────────────────────────────

def classify_iptc(text: str, top_k: int = 3, min_score: float = 0.15) -> list[str]:
    """Clasifica un texto en hasta `top_k` IPTC topics.

    Args:
      text: texto a clasificar (title + body recomendado para mejor recall).
      top_k: max topics a devolver.
      min_score: score minimo (0-1) para incluir un topic. Filtra los de baja
                 confianza para evitar etiquetas espurias.

    Returns:
      Lista de strings con los IPTC labels en orden de relevancia decreciente.
      [] si transformers no esta disponible o el texto es vacio.
    """
    if not text or not text.strip():
        return []

    pipe = _get_iptc_pipeline()
    if pipe is None:
        return []

    try:
        snippet = text[:1500]  # XLM-RoBERTa context limit razonable
        raw = pipe(snippet)
        # raw puede ser [[{label, score}, ...]] o [{label, score}, ...]
        results = raw[0] if raw and isinstance(raw[0], list) else raw
        if not isinstance(results, list):
            return []

        # Filtrar por min_score y ordenar
        filtered = [
            r for r in results
            if float(r.get("score", 0.0)) >= min_score
        ]
        # Limitar a top_k tras filtro
        topics = [str(r.get("label", "")) for r in filtered[:top_k]]
        return [t for t in topics if t]
    except Exception as exc:
        logger.warning("iptc_classifier: prediccion fallida · %s", exc)
        return []


def classify_iptc_with_scores(
    text: str,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    """Igual que classify_iptc pero devuelve label + score.

    Returns:
      [{"label": "politics", "score": 0.87}, ...]
    """
    if not text or not text.strip():
        return []

    pipe = _get_iptc_pipeline()
    if pipe is None:
        return []

    try:
        raw = pipe(text[:1500])
        results = raw[0] if raw and isinstance(raw[0], list) else raw
        if not isinstance(results, list):
            return []
        out = []
        for r in results[:top_k]:
            out.append({
                "label": str(r.get("label", "")),
                "score": round(float(r.get("score", 0.0)), 4),
            })
        return out
    except Exception:
        return []


def enrich_with_iptc(items: list[Any]) -> list[Any]:
    """Rellena EnrichedItem.iptc_topics para una bateria de items.

    Mutates items in-place y los devuelve.
    Falla cerrado: si IPTC no esta disponible, deja iptc_topics como estaba ([]).
    """
    pipe = _get_iptc_pipeline()
    if pipe is None:
        return list(items)

    items_list = list(items)
    for item in items_list:
        if not hasattr(item, "iptc_topics"):
            continue
        if item.iptc_topics:
            continue  # ya tiene topics · no sobreescribir
        text = " ".join(filter(None, [
            getattr(item, "title", ""),
            getattr(item, "body", "") or getattr(item, "summary", ""),
        ]))
        topics = classify_iptc(text, top_k=3, min_score=0.15)
        item.iptc_topics = topics
        # enrichment trace
        if hasattr(item, "enrichment_trace") and isinstance(item.enrichment_trace, list):
            item.enrichment_trace.append("iptc")
    return items_list


__all__ = [
    "classify_iptc",
    "classify_iptc_with_scores",
    "enrich_with_iptc",
    "IPTC_TOP_LEVEL_TOPICS",
]
