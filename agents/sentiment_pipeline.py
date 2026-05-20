"""Sentiment + emocion + hate + irony local para noticias y redes politicas ES.

> **Sprint 1 · S1.1**: añadido backend `pysentimiento` (opt-in) que provee:
>   - sentiment (positivo/negativo/neutral) finetuned RoBERTuito sobre tweets
>     politicos espanoles (mejor calibracion que cardiffnlp/xlm-roberta)
>   - emotion (joy, sadness, anger, fear, surprise, disgust, others)
>   - hate_speech (sexism, racism, lgbtq, religious, ...)
>   - irony (boolean + score)
>
> Activacion:  `pip install pysentimiento`
>              `ELECTSIM_SENTIMENT_BACKEND=pysentimiento`
> Fallback:    si el paquete no esta instalado, vuelve al backend transformers
>              actual (cardiffnlp/twitter-xlm-roberta), y de ahi al lexicon.
>
> NO se fuerza la instalacion en deploys donde no haga falta NLP pesado
> (torch + 1.5GB de modelos). Util en workers dedicados; opt-in.
"""

from __future__ import annotations

import os
import re
from functools import lru_cache
from typing import Any

POSITIVE_RE = re.compile(r"\b(acuerdo|mejora|avance|exito|éxito|logro|crece|sube|recuperacion|recuperación|estabilidad)\w*\b", re.I)
NEGATIVE_RE = re.compile(r"\b(crisis|cae|caida|caída|escandalo|escándalo|corrupcion|corrupción|ataque|conflicto|fracaso|problema|bloqueo)\w*\b", re.I)


# ─────────────────────────────────────────────────────────────────────────────
# Backend pysentimiento (Sprint 1 · S1.1)
# ─────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_pysentimiento_analyzers() -> dict[str, Any] | None:
    """Devuelve los 4 analyzers de pysentimiento o None si no esta instalado.

    Cache global · cargar los 4 modelos una vez por proceso (~3GB de VRAM/RAM).
    Hace sentido cargarlos juntos solo en workers NLP dedicados.
    """
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None
    backend = os.environ.get("ELECTSIM_SENTIMENT_BACKEND", "auto").strip().lower()
    if backend not in {"pysentimiento", "auto"}:
        return None
    try:
        from pysentimiento import create_analyzer  # type: ignore
    except ImportError:
        return None
    try:
        return {
            "sentiment": create_analyzer(task="sentiment", lang="es"),
            "emotion":   create_analyzer(task="emotion",   lang="es"),
            "hate":      create_analyzer(task="hate_speech", lang="es"),
            "irony":     create_analyzer(task="irony",     lang="es"),
        }
    except Exception:
        return None


@lru_cache(maxsize=1)
def get_sentiment_pipeline() -> Any | None:
    """Backend legacy (transformers/cardiffnlp) · usado si pysentimiento no esta.

    Mantiene compatibilidad con codigo existente que llama analyze_sentiment().
    """
    backend = os.environ.get("ELECTSIM_SENTIMENT_BACKEND", "auto").strip().lower()
    if backend in {"lexicon", "regex", "off"}:
        return None
    if backend == "pysentimiento":
        # Backend explicitamente pedido · si pysentimiento no esta, fallback a lexicon
        return None
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return None
    try:
        from transformers import pipeline  # type: ignore

        return pipeline(
            "sentiment-analysis",
            model=os.environ.get("ELECTSIM_SENTIMENT_MODEL", "cardiffnlp/twitter-xlm-roberta-base-sentiment"),
            top_k=None,
            truncation=True,
            max_length=512,
        )
    except Exception:
        return None


def analyze_sentiment(text: str) -> dict[str, Any]:
    """Sentiment principal · backend = pysentimiento si disponible, sino transformers, sino lexicon."""
    text = str(text or "")

    # Backend 1: pysentimiento (finetuned ES, mejor calibracion para politica)
    analyzers = get_pysentimiento_analyzers()
    if analyzers is not None:
        try:
            return _pysentimiento_sentiment(analyzers["sentiment"], text)
        except Exception:
            pass

    # Backend 2: transformers cardiffnlp (multilingual XLM-RoBERTa)
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


def analyze_full(text: str) -> dict[str, Any]:
    """Analisis completo con pysentimiento · sentiment + emotion + hate + irony.

    Si pysentimiento no esta instalado, devuelve solo `sentiment` (con fallback
    a transformers/lexicon) y los otros campos en dict vacio.

    Output:
    ```
    {
        "sentiment": {label, positivo, negativo, neutral, score, backend},
        "emotion":   {label, probas: {joy, sadness, anger, ...}} | {},
        "hate":      {label, probas: {hateful, targeted, aggressive}} | {},
        "irony":     {label, probas: {ironic, not_ironic}} | {},
    }
    ```
    """
    text = str(text or "").strip()
    if not text:
        return {"sentiment": _lexicon_sentiment(""), "emotion": {}, "hate": {}, "irony": {}}

    analyzers = get_pysentimiento_analyzers()
    if analyzers is None:
        # Sin pysentimiento · devolvemos solo sentiment
        return {
            "sentiment": analyze_sentiment(text),
            "emotion": {},
            "hate": {},
            "irony": {},
        }

    snippet = text[:512]
    try:
        s = analyzers["sentiment"].predict(snippet)
        e = analyzers["emotion"].predict(snippet)
        h = analyzers["hate"].predict(snippet)
        i = analyzers["irony"].predict(snippet)
        return {
            "sentiment": _pysentimiento_to_dict(s, backend="pysentimiento", kind="sentiment"),
            "emotion":   _pysentimiento_to_dict(e, backend="pysentimiento", kind="emotion"),
            "hate":      _pysentimiento_to_dict(h, backend="pysentimiento", kind="hate"),
            "irony":     _pysentimiento_to_dict(i, backend="pysentimiento", kind="irony"),
        }
    except Exception:
        return {
            "sentiment": analyze_sentiment(text),
            "emotion": {},
            "hate": {},
            "irony": {},
        }


def _pysentimiento_sentiment(analyzer: Any, text: str) -> dict[str, Any]:
    """Pysentimiento sentiment → mismo formato que analyze_sentiment legacy."""
    snippet = text[:512] if text else ""
    result = analyzer.predict(snippet)
    return _pysentimiento_to_dict(result, backend="pysentimiento", kind="sentiment")


def _pysentimiento_to_dict(result: Any, *, backend: str, kind: str) -> dict[str, Any]:
    """Convierte el AnalyzerOutput de pysentimiento a dict serializable."""
    label = str(getattr(result, "output", "")).lower()
    probas = dict(getattr(result, "probas", {})) or {}
    # Normalizamos labels comunes en sentiment
    if kind == "sentiment":
        # pysentimiento devuelve: POS / NEG / NEU
        label_map = {"pos": "positivo", "neg": "negativo", "neu": "neutral"}
        label = label_map.get(label, label)
        positivo = float(probas.get("POS", 0.0))
        negativo = float(probas.get("NEG", 0.0))
        neutral  = float(probas.get("NEU", 0.0))
        return {
            "positivo": round(positivo, 4),
            "negativo": round(negativo, 4),
            "neutral":  round(neutral, 4),
            "label":    label,
            "score":    round(positivo - negativo, 4),
            "backend":  backend,
        }
    # emotion, hate, irony · devolvemos label + probas + backend
    return {
        "label": label,
        "probas": {str(k): round(float(v), 4) for k, v in probas.items()},
        "backend": backend,
    }


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
        return {"positivo": 0.0, "negativo": 0.0, "neutral": 1.0, "label": "neutral", "score": 0.0, "backend": "lexicon"}
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

