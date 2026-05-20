"""Servicios de topic modeling consolidados para Politeia.

Wrapper limpio sobre `agents/mediatico/bertopic_agent.py` (BERTopicAgent) que
expone el contrato esperado por el pipeline de ingesta (EnrichedItem).

Funciones principales:
  · enrich_with_topics(items)  → asigna topic_id + topic_label
  · extract_keywords_yake(text) → keywords sin entrenamiento
  · get_topic_label(topic_id)  → etiqueta human-readable de un topic_id

Diseño: este paquete NO reimplementa BERTopic. Solo orquesta el agent
existente. Si el agent cambia, este wrapper sigue funcionando.
"""
from agents.topics.bertopic_service import (
    enrich_with_topics,
    get_topic_label,
    extract_keywords_yake,
)
from agents.topics.iptc_classifier import (
    classify_iptc,
    classify_iptc_with_scores,
    enrich_with_iptc,
    IPTC_TOP_LEVEL_TOPICS,
)

__all__ = [
    # BERTopic + YAKE (Sprint 1)
    "enrich_with_topics",
    "get_topic_label",
    "extract_keywords_yake",
    # IPTC (Sprint 2)
    "classify_iptc",
    "classify_iptc_with_scores",
    "enrich_with_iptc",
    "IPTC_TOP_LEVEL_TOPICS",
]
