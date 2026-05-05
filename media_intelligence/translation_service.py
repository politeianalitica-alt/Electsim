"""Servicio de traducción con caché para artículos mediáticos."""
from __future__ import annotations
import hashlib
import logging
import os
from datetime import datetime, timezone

log = logging.getLogger(__name__)

# Caché en memoria: {cache_key: {"translated": str, "model": str, "at": str}}
_TRANSLATION_CACHE: dict[str, dict] = {}
_CACHE_MAX_SIZE = 5000
_OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
_OLLAMA_MODEL = os.environ.get("TRANSLATION_MODEL", "llama3.1:8b")


def _cache_key(text: str, source_lang: str, target_lang: str) -> str:
    payload = f"{source_lang}:{target_lang}:{text[:500]}"
    return hashlib.md5(payload.encode()).hexdigest()


def _get_cached(key: str) -> str | None:
    entry = _TRANSLATION_CACHE.get(key)
    return entry["translated"] if entry else None


def _store_cache(key: str, translated: str, model: str) -> None:
    if len(_TRANSLATION_CACHE) >= _CACHE_MAX_SIZE:
        # Evict oldest 10%
        keys_to_remove = list(_TRANSLATION_CACHE.keys())[:_CACHE_MAX_SIZE // 10]
        for k in keys_to_remove:
            _TRANSLATION_CACHE.pop(k, None)
    _TRANSLATION_CACHE[key] = {
        "translated": translated,
        "model": model,
        "at": datetime.now(timezone.utc).isoformat(),
    }


def translate_text(text: str, source_lang: str, target_lang: str = "es",
                   fast: bool = True) -> dict:
    """
    Traduce texto. Retorna dict con:
    - translated: str
    - model: str
    - from_cache: bool
    - source_lang: str
    - target_lang: str
    """
    if not text or not text.strip():
        return {
            "translated": text, "model": "none", "from_cache": False,
            "source_lang": source_lang, "target_lang": target_lang,
        }
    if source_lang == target_lang:
        return {
            "translated": text, "model": "none", "from_cache": False,
            "source_lang": source_lang, "target_lang": target_lang,
        }

    key = _cache_key(text, source_lang, target_lang)
    cached = _get_cached(key)
    if cached:
        return {
            "translated": cached, "model": "cache", "from_cache": True,
            "source_lang": source_lang, "target_lang": target_lang,
        }

    # Try Ollama
    translated = _translate_with_ollama(text, source_lang, target_lang)
    if translated:
        _store_cache(key, translated, _OLLAMA_MODEL)
        return {
            "translated": translated, "model": _OLLAMA_MODEL, "from_cache": False,
            "source_lang": source_lang, "target_lang": target_lang,
        }

    # Fallback: devuelve original
    return {
        "translated": text, "model": "none_fallback", "from_cache": False,
        "source_lang": source_lang, "target_lang": target_lang,
    }


def _translate_with_ollama(text: str, source_lang: str, target_lang: str) -> str | None:
    """Traduce con Ollama. Retorna None si falla."""
    try:
        import requests  # type: ignore[import]
        lang_names = {
            "en": "inglés", "fr": "francés", "de": "alemán",
            "it": "italiano", "pt": "portugués", "ar": "árabe",
        }
        src_name = lang_names.get(source_lang, source_lang)
        prompt = (
            f"Traduce este titular de {src_name} al español. "
            f"Responde SOLO con la traducción, sin explicaciones:\n\n{text}"
        )
        resp = requests.post(
            f"{_OLLAMA_URL}/api/generate",
            json={"model": _OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=15,
        )
        if resp.status_code == 200:
            result = resp.json().get("response", "").strip()
            if result and len(result) > 5:
                return result
    except Exception as e:
        log.debug("Ollama translation failed: %s", e)
    return None


def translate_titles_batch(articles: list[dict], target_lang: str = "es") -> list[dict]:
    """
    Traduce títulos de lista de artículos.
    Solo traduce los que tienen lang != target_lang y no tienen ya translated_title.
    Modifica artículos in-place.
    """
    to_translate = [
        a for a in articles
        if a.get("source_lang", "es") != target_lang
        and not a.get("translated_title")
        and a.get("title")
    ]
    log.info(
        "translate_titles_batch: %d de %d artículos a traducir",
        len(to_translate), len(articles),
    )

    for article in to_translate:
        result = translate_text(article["title"], article.get("source_lang", "en"), target_lang)
        article["translated_title"] = result["translated"]
        article["translation_model"] = result["model"]
        article["translated_at"] = datetime.now(timezone.utc).isoformat()

    return articles


def get_cache_stats() -> dict:
    return {"cached_translations": len(_TRANSLATION_CACHE), "max_size": _CACHE_MAX_SIZE}
