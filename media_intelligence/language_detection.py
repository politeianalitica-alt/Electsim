"""Detección de idioma para artículos."""
from __future__ import annotations
import logging
import re

log = logging.getLogger(__name__)

# Stopwords por idioma para detección rápida
_STOPWORDS = {
    "en": {"the", "a", "an", "in", "to", "of", "and", "for", "is", "was", "that", "this",
           "it", "with", "by", "from", "on", "at", "as", "be", "are", "has", "have", "not",
           "says", "said", "will", "new", "can", "but", "or", "its", "who", "what", "how"},
    "fr": {"le", "la", "les", "un", "une", "des", "de", "du", "et", "en", "dans", "avec",
           "pour", "par", "sur", "est", "sont", "que", "qui", "selon", "après"},
    "de": {"der", "die", "das", "des", "dem", "den", "und", "ein", "eine", "ist", "sind",
           "von", "mit", "für", "nach", "bei", "auf", "in", "zu", "er", "sie", "es"},
    "it": {"il", "la", "i", "gli", "le", "un", "una", "di", "del", "dell", "che", "per",
           "con", "nel", "nella", "nei", "sono", "ha", "hanno"},
    "pt": {"o", "a", "os", "as", "um", "uma", "de", "do", "da", "dos", "das", "que",
           "em", "com", "para", "por", "na", "no", "se", "ao"},
    "ar": {"في", "من", "على", "إلى", "هذا", "هذه", "أن", "كان", "مع", "عن", "بعد", "لقد"},
    "es": {"el", "la", "los", "las", "un", "una", "de", "del", "que", "en", "con", "por",
           "para", "como", "más", "este", "esta", "son", "fue", "pero", "su", "se"},
}


def detect_language(text: str, source_lang: str | None = None, confidence_threshold: float = 0.3) -> dict:
    """
    Detecta idioma de texto. Retorna dict con:
    - detected: str (código ISO)
    - confidence: float (0-1)
    - method: str
    """
    if not text or len(text.strip()) < 10:
        return {"detected": source_lang or "es", "confidence": 0.0, "method": "default"}

    # Intentar librería si disponible
    try:
        from langdetect import detect_langs  # type: ignore[import]
        langs = detect_langs(text)
        best = langs[0]
        return {"detected": best.lang, "confidence": float(best.prob), "method": "langdetect"}
    except Exception:
        pass

    # Fallback: conteo de stopwords
    return _stopword_detect(text, source_lang)


def _stopword_detect(text: str, source_lang: str | None) -> dict:
    words = set(re.findall(r'\b\w+\b', text.lower()))
    scores: dict[str, int] = {}
    for lang, stops in _STOPWORDS.items():
        scores[lang] = len(words & stops)

    if not any(scores.values()):
        return {"detected": source_lang or "es", "confidence": 0.0, "method": "stopwords_no_match"}

    best_lang = max(scores, key=scores.get)  # type: ignore[arg-type]
    total = sum(scores.values())
    confidence = scores[best_lang] / total if total > 0 else 0.0

    if confidence < 0.25:
        return {"detected": source_lang or "es", "confidence": confidence, "method": "stopwords_low"}

    return {"detected": best_lang, "confidence": confidence, "method": "stopwords"}


def detect_language_batch(texts: list[str], source_langs: list[str | None] | None = None) -> list[dict]:
    results = []
    for i, text in enumerate(texts):
        src = source_langs[i] if source_langs and i < len(source_langs) else None
        results.append(detect_language(text, src))
    return results


def should_translate(lang: str, target_lang: str = "es") -> bool:
    """Devuelve True si el texto necesita traducción."""
    return lang != target_lang and lang not in ("es", "")
