"""
Normalizacion de texto y deteccion de idioma.
"""
from __future__ import annotations

import re
import unicodedata


def normalize_text(
    text: str,
    lowercase: bool = False,
    remove_urls: bool = True,
    remove_mentions: bool = True,
    remove_hashtags: bool = False,
    strip_accents: bool = False,
) -> str:
    """
    Normaliza texto para procesamiento NLP.

    Args:
        text:             Texto de entrada.
        lowercase:        Convertir a minusculas.
        remove_urls:      Eliminar URLs.
        remove_mentions:  Eliminar @menciones (Twitter/social).
        remove_hashtags:  Eliminar #hashtags.
        strip_accents:    Eliminar tildes y diacriticos.

    Returns:
        Texto normalizado.
    """
    result = text

    if remove_urls:
        result = re.sub(r"https?://\S+|www\.\S+", " ", result)
    if remove_mentions:
        result = re.sub(r"@\w+", " ", result)
    if remove_hashtags:
        result = re.sub(r"#\w+", " ", result)

    # Normalizar espacios
    result = re.sub(r"\s+", " ", result).strip()

    if strip_accents:
        result = "".join(
            c for c in unicodedata.normalize("NFD", result)
            if unicodedata.category(c) != "Mn"
        )

    if lowercase:
        result = result.lower()

    return result


def detect_language(text: str) -> str:
    """
    Detecta el idioma del texto. Retorna codigo ISO 639-1.

    Usa langdetect si disponible, fallback a heuristica simple.
    """
    try:
        from langdetect import detect
        return detect(text[:500])
    except Exception:
        return _heuristic_language(text)


_ES_MARKERS = {"el", "la", "los", "las", "de", "que", "es", "en", "y", "por"}
_CA_MARKERS = {"el", "la", "els", "les", "de", "que", "és", "en", "i", "per"}
_EN_MARKERS = {"the", "a", "an", "of", "and", "in", "is", "to", "it", "for"}


def _heuristic_language(text: str) -> str:
    tokens = set(text.lower().split()[:50])
    scores = {
        "es": len(tokens & _ES_MARKERS),
        "ca": len(tokens & _CA_MARKERS),
        "en": len(tokens & _EN_MARKERS),
    }
    return max(scores, key=lambda k: scores[k], default="es")
