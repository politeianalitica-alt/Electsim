"""
packages.nlp — Pipelines NLP puros (sin LLM) para ElectSim.

Expone:
    run_ner(text, lang)          → Named Entity Recognition
    compute_sentiment(text)      → Analisis de sentimiento (-1 a 1)
    normalize_text(text)         → Limpieza y normalizacion de texto
    detect_language(text)        → Deteccion de idioma

Sin dependencias de apps/, observability/ ni LLMClient.
"""
from packages.nlp.src.ner import run_ner, NERResult
from packages.nlp.src.sentiment import compute_sentiment, SentimentResult
from packages.nlp.src.normalization import normalize_text, detect_language

__all__ = [
    "run_ner", "NERResult",
    "compute_sentiment", "SentimentResult",
    "normalize_text", "detect_language",
]
