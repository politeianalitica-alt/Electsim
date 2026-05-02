"""
Analisis de sentimiento — wrapper configurable.

Por defecto usa un clasificador basado en reglas (lexicon-based)
cuando no hay modelo transformers disponible.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Polarity = Literal["positive", "negative", "neutral"]


@dataclass(frozen=True)
class SentimentResult:
    score: float        # -1.0 (muy negativo) a 1.0 (muy positivo)
    polarity: Polarity
    confidence: float   # 0.0 a 1.0
    model: str


def compute_sentiment(
    text: str,
    lang: str = "es",
    model: str = "auto",
) -> SentimentResult:
    """
    Calcula el sentimiento del texto.

    Args:
        text:  Texto de entrada.
        lang:  Idioma ("es", "en").
        model: "auto" selecciona el mejor disponible; o un nombre explicito.

    Returns:
        SentimentResult con score [-1, 1] y polarity.
    """
    # Intentar con transformers si disponible
    if model in ("auto", "transformers"):
        result = _try_transformers(text, lang)
        if result is not None:
            return result

    # Fallback: lexicon-based simplificado
    return _lexicon_sentiment(text)


def _try_transformers(text: str, lang: str) -> SentimentResult | None:
    try:
        from transformers import pipeline as hf_pipeline

        model_id = "cardiffnlp/twitter-xlm-roberta-base-sentiment" if lang == "es" else \
                   "cardiffnlp/twitter-roberta-base-sentiment"
        classifier = hf_pipeline("sentiment-analysis", model=model_id, truncation=True)
        result = classifier(text[:512])[0]
        label_map = {"LABEL_0": -1.0, "LABEL_1": 0.0, "LABEL_2": 1.0,
                     "negative": -1.0, "neutral": 0.0, "positive": 1.0}
        score = label_map.get(result["label"], 0.0) * result["score"]
        polarity: Polarity = "positive" if score > 0.2 else "negative" if score < -0.2 else "neutral"
        return SentimentResult(score=score, polarity=polarity,
                               confidence=result["score"], model=model_id)
    except Exception:
        return None


_POS_WORDS = {"bien", "bueno", "excelente", "apoya", "avanza", "mejora", "acuerdo"}
_NEG_WORDS = {"mal", "malo", "crisis", "conflicto", "rechazo", "fracaso", "corrupcion"}


def _lexicon_sentiment(text: str) -> SentimentResult:
    tokens = set(text.lower().split())
    pos = len(tokens & _POS_WORDS)
    neg = len(tokens & _NEG_WORDS)
    score = (pos - neg) / max(pos + neg, 1)
    polarity: Polarity = "positive" if score > 0 else "negative" if score < 0 else "neutral"
    return SentimentResult(score=score, polarity=polarity, confidence=0.5, model="lexicon")
