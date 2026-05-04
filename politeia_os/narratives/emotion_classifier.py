"""
Clasificacion de emocion dominante en narrativas (pysentimiento + Ollama).

Pipeline:
  1. pysentimiento detecta sentimiento base (POS/NEG/NEU) y score
  2. Ollama clasifica la emocion especifica dentro de las 8 categorias del sistema
  3. Si Ollama falla, se hace mapeo heuristico desde el sentimiento base

Categorias de emocion: indignacion | miedo | esperanza | orgullo |
                        desprecio | desconfianza | solidaridad | urgencia
"""
from __future__ import annotations

import json
import logging
import os
import re
from functools import lru_cache
from typing import Optional

import httpx

log = logging.getLogger(__name__)

_OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL    = os.getenv("NARRATIVE_OLLAMA_MODEL", "llama3.1:8b")
_TIMEOUT         = float(os.getenv("OLLAMA_TIMEOUT", "45"))

_VALID_EMOCIONES = {
    "indignacion", "miedo", "esperanza", "orgullo",
    "desprecio", "desconfianza", "solidaridad", "urgencia",
}

# Mapeo heuristico sentimiento→emocion para fallback sin Ollama
_SENTIMENT_FALLBACK: dict[str, dict[str, str]] = {
    "NEG": {
        "default":   "indignacion",
        "gobierno":  "desconfianza",
        "crisis":    "miedo",
        "corrupcion":"desprecio",
    },
    "POS": {
        "default":   "esperanza",
        "victoria":  "orgullo",
        "apoyo":     "solidaridad",
    },
    "NEU": {
        "default":   "desconfianza",
    },
}

_EMOTION_SYSTEM = """\
Eres un experto en linguistica afectiva y analisis de discurso politico.
Clasifica la emocion dominante de un conjunto de titulares periodisticos.
Las unicas emociones validas son exactamente estas ocho:
indignacion, miedo, esperanza, orgullo, desprecio, desconfianza, solidaridad, urgencia.
Responde SOLO con JSON valido, sin texto fuera del objeto.
"""

_EMOTION_USER = """\
Titulares del cluster narrativo (en orden de relevancia):
{titulares}

Sentimiento agregado por pysentimiento: {sentimiento} (intensidad: {intensidad:.2f})

Devuelve un JSON con exactamente estas dos claves:
{{
  "emocion_dominante": "<una de las 8 emociones validas>",
  "emocion_intensidad": <numero float entre 0.0 y 1.0>
}}
"""


# ---------------------------------------------------------------------------
# Carga lazy de pysentimiento (no disponible en todos los entornos)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=2)
def _get_sentiment_analyzer(lang: str):
    """Carga (y cachea) el analizador pysentimiento para el idioma dado."""
    try:
        from pysentimiento import create_analyzer  # type: ignore
        safe_lang = lang if lang in ("es", "en") else "es"
        analyzer = create_analyzer(task="sentiment", lang=safe_lang)
        log.info("pysentimiento cargado para lang=%s", safe_lang)
        return analyzer
    except ImportError:
        log.warning("pysentimiento no instalado; se usara Ollama para emocion")
        return None
    except Exception as exc:
        log.warning("Error cargando pysentimiento lang=%s: %s", lang, exc)
        return None


def _detect_lang(text: str) -> str:
    """Deteccion de idioma simple por heuristicos; retorna 'es' o 'en'."""
    spanish_markers = {
        "que", "de", "la", "el", "en", "y", "a", "los", "las",
        "del", "al", "con", "por", "para", "se", "es", "su",
    }
    words = set(w.lower().strip(".,;:") for w in text.split())
    overlap = words & spanish_markers
    return "es" if len(overlap) >= 3 else "en"


def _aggregate_sentiment(texts: list[str]) -> tuple[str, float]:
    """
    Calcula el sentimiento agregado de una lista de textos.

    Retorna (label, intensidad_promedio).
    """
    if not texts:
        return "NEU", 0.5

    # Detectar idioma mayoritario
    combined = " ".join(texts[:5])
    lang = _detect_lang(combined)
    analyzer = _get_sentiment_analyzer(lang)

    if analyzer is None:
        return "NEU", 0.5

    scores: dict[str, list[float]] = {"POS": [], "NEG": [], "NEU": []}
    for text in texts[:20]:  # limitar para no saturar en clusters grandes
        try:
            result = analyzer.predict(text[:512])
            label = str(result.output).upper()
            prob_values = getattr(result, "probas", {}) or {}
            best_prob = float(prob_values.get(label, 0.5))
            if label in scores:
                scores[label].append(best_prob)
        except Exception as exc:
            log.debug("pysentimiento error en texto: %s", exc)

    # Label mayoritario
    total = {k: sum(v) / max(len(v), 1) for k, v in scores.items() if v}
    if not total:
        return "NEU", 0.5
    dominant = max(total, key=lambda k: total[k])
    return dominant, total[dominant]


def _call_ollama_emotion(titulares_str: str, sent_label: str, sent_intensity: float) -> dict:
    """Llama a Ollama para clasificar la emocion especifica en el vocabulario controlado."""
    prompt = _EMOTION_USER.format(
        titulares=titulares_str,
        sentimiento=sent_label,
        intensidad=sent_intensity,
    )
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(
                f"{_OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": _OLLAMA_MODEL,
                    "messages": [
                        {"role": "system", "content": _EMOTION_SYSTEM},
                        {"role": "user",   "content": prompt},
                    ],
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 100},
                },
            )
            resp.raise_for_status()
            raw = resp.json()["message"]["content"].strip()
    except httpx.TimeoutException:
        log.warning("Timeout llamando Ollama en emotion_classifier")
        return {}
    except Exception as exc:
        log.warning("Error Ollama emotion_classifier: %s", exc)
        return {}

    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}


def _fallback_emotion(sent_label: str, headlines: list[str]) -> tuple[str, float]:
    """Emocion por heuristica cuando Ollama no esta disponible."""
    mapping = _SENTIMENT_FALLBACK.get(sent_label, _SENTIMENT_FALLBACK["NEU"])
    combined = " ".join(headlines).lower()
    for keyword, emotion in mapping.items():
        if keyword != "default" and keyword in combined:
            return emotion, 0.55
    return mapping["default"], 0.45


def classify_emotion(headlines: list[str]) -> tuple[str, float]:
    """
    Clasifica la emocion dominante de un cluster narrativo.

    Args:
        headlines: Titulares representativos del cluster.

    Returns:
        Tupla (emocion_dominante: str, emocion_intensidad: float).
        emocion_dominante es siempre una de las 8 categorias validas.
    """
    if not headlines:
        return "desconfianza", 0.3

    # Paso 1: pysentimiento
    sent_label, sent_intensity = _aggregate_sentiment(headlines)

    # Paso 2: Ollama
    titulares_str = "\n".join(f"- {h}" for h in headlines[:10])
    ollama_result = _call_ollama_emotion(titulares_str, sent_label, sent_intensity)

    emocion   = str(ollama_result.get("emocion_dominante", "")).lower().strip()
    intensidad = float(ollama_result.get("emocion_intensidad", 0.0) or 0.0)

    # Validar que la emocion este en el vocabulario controlado
    if emocion not in _VALID_EMOCIONES:
        emocion, intensidad = _fallback_emotion(sent_label, headlines)

    # Combinar intensidad pysentimiento + Ollama
    if intensidad <= 0.0:
        intensidad = sent_intensity

    # Clampear
    intensidad = max(0.05, min(1.0, intensidad))

    return emocion, intensidad
