"""
Named Entity Recognition — wrapper sobre spaCy / XLM-RoBERTa.

Devuelve entidades tipadas sin efectos secundarios.
El modelo se carga lazy (primera llamada).
"""
from __future__ import annotations

import functools
from dataclasses import dataclass, field
from typing import List, Literal, Optional

EntityType = Literal["PER", "ORG", "LOC", "MISC", "PARTY", "NORM"]


@dataclass(frozen=True)
class Entity:
    text: str
    label: EntityType
    start: int
    end: int
    confidence: float = 1.0


@dataclass
class NERResult:
    entities: List[Entity]
    text: str
    language: str
    model: str


@functools.lru_cache(maxsize=4)
def _load_spacy_model(lang: str = "es"):
    """Carga el modelo spaCy correspondiente al idioma (lazy, cacheado)."""
    try:
        import spacy
        model_map = {"es": "es_core_news_lg", "en": "en_core_web_sm", "ca": "ca_core_news_sm"}
        return spacy.load(model_map.get(lang, "es_core_news_lg"))
    except Exception:
        return None


def run_ner(
    text: str,
    lang: str = "es",
    confidence_threshold: float = 0.0,
) -> NERResult:
    """
    Ejecuta NER sobre el texto dado.

    Args:
        text:                 Texto de entrada.
        lang:                 Idioma ("es", "en", "ca").
        confidence_threshold: Filtrar entidades por debajo de este umbral.

    Returns:
        NERResult con la lista de entidades detectadas.
    """
    nlp = _load_spacy_model(lang)
    if nlp is None:
        # Fallback: sin modelo, retornar sin entidades
        return NERResult(entities=[], text=text, language=lang, model="none")

    doc = nlp(text)
    entities = [
        Entity(
            text=ent.text,
            label=ent.label_,  # type: ignore[arg-type]
            start=ent.start_char,
            end=ent.end_char,
        )
        for ent in doc.ents
        if ent.label_ in ("PER", "ORG", "LOC", "MISC")
    ]

    return NERResult(
        entities=[e for e in entities if e.confidence >= confidence_threshold],
        text=text,
        language=lang,
        model=nlp.meta.get("name", "spacy"),
    )
