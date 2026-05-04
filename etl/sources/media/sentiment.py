"""
Análisis de sentimiento para artículos de medios.

Dos modos:
  - "fast": léxico simple (sin dependencias externas) — siempre disponible
  - "advanced": pysentimiento (opcional, activado con ELECTSIM_MEDIA_USE_PYSENTIMIENTO=true)

El modo "fast" usa un léxico de polaridad basado en el existente en data_aggregator.py.
"""
from __future__ import annotations

import logging
import os
import re

from .schemas import TextSignal

logger = logging.getLogger(__name__)

_USE_PYSENTIMIENTO = os.getenv("ELECTSIM_MEDIA_USE_PYSENTIMIENTO", "false").lower() == "true"

# ── Léxico de polaridad (modo fast) ──────────────────────────────────────────

_POSITIVO = {
    "acuerdo", "aprobado", "avance", "beneficio", "bien", "crecimiento",
    "éxito", "gana", "histórico", "inversión", "logro", "mejora",
    "positivo", "progreso", "prosperidad", "record", "recuperación",
    "reforma", "solidaridad", "superávit", "victoria", "aumento",
    "apoyo", "colaboración", "confianza", "desarrollo", "estabilidad",
    "ganancia", "incremento", "innovación", "modernización", "reducción",
    "seguridad", "solución", "éxito", "eficiencia",
}

_NEGATIVO = {
    "acusación", "alerta", "amenaza", "ataque", "bloqueo", "caída",
    "cierre", "conflicto", "corrupción", "crisis", "déficit", "deuda",
    "dimisión", "escándalo", "fracaso", "fraude", "guerra", "huelga",
    "impuesto", "multa", "pérdida", "polémica", "protesta", "recorte",
    "rechazo", "resignación", "riesgo", "suspensión", "tensión",
    "veto", "violencia", "desempleo", "paro", "quiebra", "desastre",
    "catástrofe", "derrota", "dimisión", "expediente", "sanción",
}

_EMOCION_PATTERNS: dict[str, list[str]] = {
    "ira": ["indignación", "rabia", "furia", "protestas", "enfado", "airado",
            "repudio", "condena", "rechazo", "denuncia"],
    "miedo": ["alerta", "amenaza", "peligro", "riesgo", "ataque", "guerra",
               "crisis", "emergencia", "colapso", "catástrofe"],
    "alegría": ["celebración", "victoria", "acuerdo", "éxito", "récord",
                 "histórico", "avance", "logro", "ganancia"],
    "tristeza": ["muerte", "pérdida", "luto", "tragedia", "fallecido",
                  "víctimas", "accidente", "derrumbe", "desastre"],
}

_TOXICIDAD_PATTERNS = [
    r"\bmente[s]?\b", r"\bestúpid[oa]s?\b", r"\bidiota[s]?\b",
    r"\btraidor[es]?\b", r"\bfascista[s]?\b", r"\bcomunista[s]?\b",
    r"\bcorrupt[oa]s?\b", r"\bladrón\b", r"\bladrones\b",
]
_TOXICIDAD_RE = re.compile("|".join(_TOXICIDAD_PATTERNS), re.IGNORECASE)


# ── Análisis modo fast ────────────────────────────────────────────────────────

def _fast_sentiment(text: str) -> TextSignal:
    """Análisis léxico rápido, sin dependencias."""
    words = set(re.findall(r"\b\w+\b", text.lower()))
    n_pos = len(words & _POSITIVO)
    n_neg = len(words & _NEGATIVO)
    total = n_pos + n_neg or 1

    if n_pos > n_neg:
        label = "positivo"
        score = round(n_pos / total, 3)
    elif n_neg > n_pos:
        label = "negativo"
        score = round(-n_neg / total, 3)
    else:
        label = "neutral"
        score = 0.0

    # Emoción dominante
    emotion: str | None = None
    best_count = 0
    text_lower = text.lower()
    for emo, patterns in _EMOCION_PATTERNS.items():
        count = sum(1 for p in patterns if p in text_lower)
        if count > best_count:
            best_count = count
            emotion = emo
    if best_count == 0:
        emotion = None

    # Toxicidad
    tox_matches = _TOXICIDAD_RE.findall(text)
    toxicity = min(len(tox_matches) / 10.0, 1.0)

    return TextSignal(
        sentiment_label=label,
        sentiment_score=score,
        emotion_label=emotion,
        toxicity_score=round(toxicity, 3),
        analysis_mode="fast",
    )


# ── Análisis modo advanced (pysentimiento) ────────────────────────────────────

_pysentimiento_analyzer: Any = None


def _get_pysentimiento():
    """Carga el analizador pysentimiento (lazy, singleton)."""
    global _pysentimiento_analyzer
    if _pysentimiento_analyzer is not None:
        return _pysentimiento_analyzer
    try:
        from pysentimiento import create_analyzer
        _pysentimiento_analyzer = create_analyzer(task="sentiment", lang="es")
        logger.info("pysentimiento cargado correctamente")
    except Exception as exc:
        logger.warning("pysentimiento no disponible: %s — usando modo fast", exc)
        _pysentimiento_analyzer = None
    return _pysentimiento_analyzer


def _advanced_sentiment(text: str) -> TextSignal:
    """
    Análisis con pysentimiento (si disponible), cae a fast si falla.
    Solo procesa los primeros 512 caracteres para evitar timeouts.
    """
    analyzer = _get_pysentimiento()
    if analyzer is None:
        return _fast_sentiment(text)

    try:
        snippet = text[:512]
        result = analyzer.predict(snippet)
        label_map = {"POS": "positivo", "NEG": "negativo", "NEU": "neutral"}
        label = label_map.get(result.output, "neutral")
        score = result.probas.get("POS", 0.5) - result.probas.get("NEG", 0.5)

        # Toxicidad sigue siendo léxica por ahora
        fast = _fast_sentiment(text)
        return TextSignal(
            sentiment_label=label,
            sentiment_score=round(score, 3),
            emotion_label=fast.emotion_label,
            toxicity_score=fast.toxicity_score,
            analysis_mode="advanced",
        )
    except Exception as exc:
        logger.debug("pysentimiento predict failed: %s", exc)
        return _fast_sentiment(text)


# ── API pública ───────────────────────────────────────────────────────────────

def analyze_sentiment(
    text: str,
    mode: str = "fast",
) -> TextSignal:
    """
    Analiza el sentimiento de un texto.

    Args:
        text: texto a analizar (título + resumen recomendado).
        mode: "fast" (léxico, sin deps) | "advanced" (pysentimiento opcional).

    Returns:
        TextSignal con label, score [-1,1], emotion, toxicity [0,1].
    """
    if not text or not text.strip():
        return TextSignal(
            sentiment_label="neutral",
            sentiment_score=0.0,
            analysis_mode=mode,
        )

    effective_mode = mode
    if mode == "advanced" and not _USE_PYSENTIMIENTO:
        effective_mode = "fast"

    if effective_mode == "advanced":
        return _advanced_sentiment(text)
    return _fast_sentiment(text)


# Type alias para import lazy en otros módulos
from typing import Any  # noqa: E402 (necesario aquí)
