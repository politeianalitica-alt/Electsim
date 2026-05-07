"""Sentiment local para noticias y redes politicas en espanol."""

from __future__ import annotations

import os
import re
import threading
from typing import Any

POSITIVE_RE = re.compile(r"\b(acuerdo|mejora|avance|exito|éxito|logro|crece|sube|recuperacion|recuperación|estabilidad)\w*\b", re.I)
NEGATIVE_RE = re.compile(r"\b(crisis|cae|caida|caída|escandalo|escándalo|corrupcion|corrupción|ataque|conflicto|fracaso|problema|bloqueo)\w*\b", re.I)

# Thread-safe lazy init — avoids lru_cache races in multi-threaded Streamlit
_pipeline_lock = threading.Lock()
_pipeline_cache: dict[str, Any] = {}


def get_sentiment_pipeline() -> Any | None:
    backend = os.environ.get("ELECTSIM_SENTIMENT_BACKEND", "auto").strip().lower()
    if backend in {"lexicon", "regex", "off"}:
        return None
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None
    model_name = os.environ.get(
        "ELECTSIM_SENTIMENT_MODEL",
        "PlanTL-GOB-ES/roberta-base-bne-sentiment",  # Spanish press-trained (vs Twitter)
    )
    if model_name in _pipeline_cache:
        return _pipeline_cache[model_name]
    with _pipeline_lock:
        # Double-check after acquiring lock
        if model_name in _pipeline_cache:
            return _pipeline_cache[model_name]
        try:
            from transformers import pipeline  # type: ignore

            pipe = pipeline(
                "sentiment-analysis",
                model=model_name,
                top_k=None,
                truncation=True,
                max_length=512,
            )
            _pipeline_cache[model_name] = pipe
            return pipe
        except Exception:
            _pipeline_cache[model_name] = None
            return None


def analyze_sentiment(text: str) -> dict[str, Any]:
    text = str(text or "")
    pipe = get_sentiment_pipeline()
    if pipe is None:
        return _lexicon_sentiment(text)
    try:
        raw = pipe(text[:512])
        results = raw[0] if raw and isinstance(raw[0], list) else raw
        scores: dict[str, float] = {}
        for row in results:
            label = str(row.get("label", "")).lower()
            label = {
                "label_0": "negativo",
                "label_1": "neutral",
                "label_2": "positivo",
                "negative": "negativo",
                "neutral": "neutral",
                "positive": "positivo",
            }.get(label, label)
            scores[label] = round(float(row.get("score", 0.0)), 4)
        return _finalize(scores, backend="transformers")
    except Exception:
        return _lexicon_sentiment(text)


def analyze_party_sentiment(texts_by_party: dict[str, list[str]]) -> dict[str, dict[str, Any]]:
    results: dict[str, dict[str, Any]] = {}
    for party, texts in texts_by_party.items():
        scores = [analyze_sentiment(t) for t in texts[:20] if str(t).strip()]
        if not scores:
            continue
        results[party] = {
            "positivo": round(sum(float(s.get("positivo", 0.0)) for s in scores) / len(scores), 3),
            "negativo": round(sum(float(s.get("negativo", 0.0)) for s in scores) / len(scores), 3),
            "neutral": round(sum(float(s.get("neutral", 0.0)) for s in scores) / len(scores), 3),
            "n_docs": len(scores),
        }
    return results


def _lexicon_sentiment(text: str) -> dict[str, Any]:
    pos = len(POSITIVE_RE.findall(text))
    neg = len(NEGATIVE_RE.findall(text))
    total = pos + neg
    if total == 0:
        # score=None signals "no data" — distinct from genuinely neutral score=0.0
        return {"positivo": 0.0, "negativo": 0.0, "neutral": 1.0, "label": "neutral", "score": None, "backend": "lexicon"}
    raw = (pos - neg) / total
    positive = max(0.0, raw)
    negative = max(0.0, -raw)
    neutral = max(0.0, 1.0 - positive - negative)
    return _finalize({"positivo": positive, "negativo": negative, "neutral": neutral}, backend="lexicon", raw_score=raw)


def _finalize(scores: dict[str, float], *, backend: str, raw_score: float | None = None) -> dict[str, Any]:
    positive = float(scores.get("positivo", 0.0))
    negative = float(scores.get("negativo", 0.0))
    neutral = float(scores.get("neutral", max(0.0, 1.0 - positive - negative)))
    label = "neutral"
    if positive > negative and positive > neutral:
        label = "positivo"
    elif negative > positive and negative > neutral:
        label = "negativo"
    score = raw_score if raw_score is not None else positive - negative
    return {
        "positivo": round(positive, 4),
        "negativo": round(negative, 4),
        "neutral": round(neutral, 4),
        "label": label,
        "score": round(float(score), 4),
        "backend": backend,
    }

