"""
Analisis de sentimiento para el pipeline event-driven.

Prioridad:
  1. cardiffnlp/twitter-xlm-roberta-base-sentiment (transformers pipeline)
  2. Fallback por palabras clave positivas/negativas (sin dependencias externas)

Retorna una lista de dicts con target='global' o nombre de entidad, label e score.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Modelo lazy
_sentiment_pipeline: Any = None

PALABRAS_POSITIVAS = {
    "acuerdo", "apoya", "aprobado", "avance", "beneficio", "bueno",
    "crecimiento", "exito", "excelente", "favorable", "fortalece",
    "gana", "mejora", "positivo", "progreso", "recuperacion",
    "resolucion", "solucion", "triunfo", "victoria",
}

PALABRAS_NEGATIVAS = {
    "alerta", "ataque", "conflicto", "corrupcion", "crisis", "critica",
    "declive", "denuncia", "derrota", "desacuerdo", "desastre",
    "escandalo", "fracaso", "grave", "malo", "negativo", "peligro",
    "problema", "rechazo", "retroceso", "riesgo", "tension", "tragedia",
}


def _cargar_pipeline() -> Any:
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        try:
            from transformers import pipeline
            _sentiment_pipeline = pipeline(
                "text-classification",
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                truncation=True,
                max_length=512,
            )
            logger.info("Sentiment XLM-RoBERTa cargado")
        except Exception as exc:
            logger.info("Sentiment model no disponible (%s) — usando reglas", exc)
            _sentiment_pipeline = False   # marca de "intentado, no disponible"
    return _sentiment_pipeline if _sentiment_pipeline is not False else None


def analyze_sentiment(text: str, entities: list[dict] | None = None) -> list[dict]:
    """
    Calcula sentimiento global y por entidad (opcional).

    Args:
        text: Texto del documento (truncado a 2000 chars si muy largo).
        entities: Lista de entidades ya extraidas (dicts con 'text', 'label').

    Retorna lista de dicts:
        [{"target": "global", "label": "positive|negative|neutral", "score": float}, ...]
    """
    results = []
    text_short = text[:2000] if len(text) > 2000 else text

    # Sentimiento global
    global_label, global_score = _compute_label(text_short)
    results.append({"target": "global", "label": global_label, "score": global_score})

    # Sentimiento por entidad PER/ORG (contexto de ventana de 150 chars)
    if entities:
        unique_ents = {e["text"] for e in entities if e.get("label") in ("PER", "ORG", "PERSON", "ORGANIZATION")}
        for ent_text in list(unique_ents)[:5]:  # max 5 entidades
            window = _extract_window(text, ent_text, window=150)
            if window:
                label, score = _compute_label(window)
                results.append({"target": ent_text, "label": label, "score": score})

    return results


def _compute_label(text: str) -> tuple[str, float]:
    """Retorna (label, score) usando modelo o fallback."""
    pipe = _cargar_pipeline()
    if pipe:
        try:
            res = pipe(text[:512])
            raw = res[0] if isinstance(res, list) else res
            label_raw = raw.get("label", "neutral").lower()
            score = float(raw.get("score", 0.5))
            # Normalizar etiquetas del modelo Cardiff
            if "positive" in label_raw or label_raw == "pos":
                return "positive", score
            elif "negative" in label_raw or label_raw == "neg":
                return "negative", score
            else:
                return "neutral", score
        except Exception as exc:
            logger.debug("Sentiment model error: %s", exc)

    return _keyword_sentiment(text)


def _keyword_sentiment(text: str) -> tuple[str, float]:
    """Fallback basado en conteo de palabras clave."""
    words = set(re.findall(r'\b\w+\b', text.lower()))
    pos = len(words & PALABRAS_POSITIVAS)
    neg = len(words & PALABRAS_NEGATIVAS)
    total = pos + neg
    if total == 0:
        return "neutral", 0.5
    if pos > neg:
        return "positive", round(pos / total, 2)
    elif neg > pos:
        return "negative", round(neg / total, 2)
    return "neutral", 0.5


def _extract_window(text: str, entity: str, window: int = 150) -> str:
    """Extrae ventana de texto alrededor de la primera mencion de la entidad."""
    idx = text.find(entity)
    if idx == -1:
        return ""
    start = max(0, idx - window)
    end = min(len(text), idx + len(entity) + window)
    return text[start:end]
