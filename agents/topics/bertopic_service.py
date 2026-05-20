"""BERTopic service · wrapper consolidador para pipeline de ingesta.

> **Sprint 1 · S1.2** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 1`)

Politeia ya tiene `agents/mediatico/bertopic_agent.BERTopicAgent` (329 LOC con
seed topics ES + UMAP + HDBSCAN + c-TF-IDF + persistencia pickle + fallback
TF-IDF si BERTopic no esta instalado).

Este servicio NO reimplementa BERTopic. Solo expone el contrato que necesita
el pipeline:

```
NormalizedItem → analyze_full(text) → sentiment/emotion/...
                ↓
                bertopic_service.enrich_with_topics(items)
                ↓
                EnrichedItem(topic_id, topic_label, keywords)
                ↓
                OntologyMapper → entities/entity_links
```

Filosofia:
  - Lazy load del agent · no cargamos modelo BERTopic si no hace falta
  - Idempotente · llamar 2 veces sobre el mismo item no cambia nada
  - Falla cerrado · si BERTopic no esta instalado, topic_id = -1 y topic_label = ""
  - YAKE para keywords · sin entrenamiento, estadistico, rapido
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any, Iterable

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────
# Acceso al BERTopicAgent existente · singleton
# ─────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_agent() -> Any | None:
    """Singleton del BERTopicAgent con modelo cargado · None si no disponible."""
    try:
        from agents.mediatico.bertopic_agent import BERTopicAgent
    except ImportError as exc:
        logger.warning("bertopic_service: BERTopicAgent no importable · %s", exc)
        return None
    try:
        agent = BERTopicAgent()
        loaded = agent.cargar_modelo()
        if not loaded:
            logger.info("bertopic_service: sin modelo entrenado · transformar devolvera -1")
        return agent
    except Exception as exc:
        logger.warning("bertopic_service: error inicializando BERTopicAgent · %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────────────
# Topic labels · cache
# ─────────────────────────────────────────────────────────────────────────

# Mapping de seed_topics_ES (en bertopic_agent.py) a etiquetas humanas.
# Sincronizado con SEED_TOPICS_ES en agents/mediatico/bertopic_agent.py
_SEED_LABELS: dict[int, str] = {
    0: "Economia y presupuestos",
    1: "Politica interior",
    2: "Elecciones",
    3: "Politica territorial",
    4: "Seguridad y defensa",
    5: "Politica exterior",
    6: "Energia y clima",
    7: "Corrupcion y justicia",
    8: "Vivienda y sociedad",
    9: "Sanidad y bienestar",
    -1: "",  # Outlier de HDBSCAN
}


def get_topic_label(topic_id: int) -> str:
    """Etiqueta human-readable de un topic_id.

    Para los 10 seed topics ES devuelve etiquetas predefinidas.
    Para topics descubiertos automaticamente, devuelve las top 3 palabras
    del topic concatenadas (ej. 'tribunal, sentencia, fiscal').
    """
    if topic_id in _SEED_LABELS:
        return _SEED_LABELS[topic_id]
    agent = _get_agent()
    if agent is None:
        return ""
    try:
        palabras = agent.obtener_palabras_topic(topic_id, n_palabras=3)
        return ", ".join(palabras) if palabras else f"topic_{topic_id}"
    except Exception:
        return f"topic_{topic_id}"


# ─────────────────────────────────────────────────────────────────────────
# YAKE keywords · sin entrenamiento, estadistico
# ─────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_yake_extractor() -> Any | None:
    """KeywordExtractor de YAKE para espanol · None si no instalado."""
    try:
        import yake  # type: ignore
    except ImportError:
        return None
    try:
        return yake.KeywordExtractor(
            lan="es",
            n=2,           # max ngram size
            top=10,        # top N keywords
            dedupLim=0.7,
            features=None,
        )
    except Exception:
        return None


def extract_keywords_yake(text: str, top_n: int = 10) -> list[str]:
    """Extrae keywords de un texto en espanol usando YAKE!.

    YAKE! es estadistico (no requiere modelo) y muy rapido. Funciona bien
    para textos de >100 palabras. Para textos cortos (titulares), devuelve
    pocas keywords.

    Devuelve lista de strings ordenada por relevancia (mas relevante primero).
    """
    if not text or len(text.strip()) < 50:
        return []
    extractor = _get_yake_extractor()
    if extractor is None:
        return []
    try:
        kws = extractor.extract_keywords(text[:8000])  # YAKE tiene limite practico
        # kws = [(keyword, score), ...] · menor score = mas relevante
        return [kw for kw, _score in kws[:top_n]]
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────
# Pipeline · asignar topics a una bateria de items
# ─────────────────────────────────────────────────────────────────────────

def assign_topic_ids(textos: list[str]) -> list[int]:
    """Asigna topic_id a cada texto · devuelve lista de ints (-1 si no clasificable).

    Usa el modelo BERTopic ya entrenado. Si no hay modelo cargado, devuelve
    -1 para todos. El reentrenamiento es responsabilidad de un job batch
    separado (cron diario), no del pipeline en tiempo real.
    """
    if not textos:
        return []
    agent = _get_agent()
    if agent is None:
        return [-1] * len(textos)
    try:
        return list(agent.transformar(textos))
    except Exception as exc:
        logger.warning("bertopic_service.assign_topic_ids · error · %s", exc)
        return [-1] * len(textos)


def enrich_with_topics(items: Iterable[Any]) -> list[Any]:
    """Enriquece una lista de EnrichedItem con topic_id, topic_label y keywords.

    Mutates items in-place y los devuelve. Items deben tener:
      - .body / .title / .summary (todos opcionales · concatenamos)
      - .topic_id / .topic_label / .keywords (campos destino)

    Falla cerrado: si BERTopic no responde, rellena topic_id=-1 y topic_label="".
    """
    items_list = list(items)
    if not items_list:
        return items_list

    # Concatenar title + body + summary para clasificar
    def _text_of(item: Any) -> str:
        parts: list[str] = []
        if title := getattr(item, "title", ""):
            parts.append(str(title))
        if body := getattr(item, "body", ""):
            parts.append(str(body))
        elif summary := getattr(item, "summary", ""):
            parts.append(str(summary))
        return " ".join(parts).strip()

    textos = [_text_of(item) for item in items_list]
    topic_ids = assign_topic_ids(textos)

    for item, tid, txt in zip(items_list, topic_ids, textos):
        # topic_id / topic_label (solo si el item tiene esos campos)
        if hasattr(item, "topic_id"):
            try:
                item.topic_id = int(tid)
            except Exception:
                item.topic_id = -1
        if hasattr(item, "topic_label"):
            item.topic_label = get_topic_label(int(tid)) if tid != -1 else ""
        # keywords con YAKE
        if hasattr(item, "keywords"):
            existing = list(getattr(item, "keywords", []) or [])
            if not existing:  # No sobreescribir si ya tiene
                item.keywords = extract_keywords_yake(txt)
        # enrichment_trace
        if hasattr(item, "enrichment_trace") and isinstance(item.enrichment_trace, list):
            item.enrichment_trace.append("bertopic+yake")

    return items_list
