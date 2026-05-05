"""
Groq Client — ElectSim.

Cliente para la API de Groq: modelos de alto rendimiento con tier gratuito.
Requiere: GROQ_API_KEY env var.
Modelos disponibles: llama-3.3-70b-versatile, mixtral-8x7b-32768, gemma2-9b-it.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any

log = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

_GROQ_MODELS: dict[str, str] = {
    "fast":   "llama-3.1-8b-instant",
    "normal": "llama-3.3-70b-versatile",
    "deep":   "mixtral-8x7b-32768",
}

# Caché en memoria: hasta 1000 entradas SHA256
_GROQ_CACHE: dict[str, dict] = {}
_GROQ_CACHE_MAX = 1000


def is_groq_available() -> bool:
    """Verifica si GROQ_API_KEY está configurada (sin llamada HTTP)."""
    return bool(os.environ.get("GROQ_API_KEY", "").strip())


def get_groq_model(tier: str) -> str:
    """Devuelve el nombre del modelo Groq para el tier indicado."""
    return _GROQ_MODELS.get(tier, _GROQ_MODELS["fast"])


def _build_cache_key(prompt: str, model: str, system_prompt: str, expect_json: bool) -> str:
    payload = f"{model}:{system_prompt}:{prompt[:2000]}:{expect_json}"
    return hashlib.sha256(payload.encode()).hexdigest()[:32]


def _evict_cache_if_needed() -> None:
    if len(_GROQ_CACHE) >= _GROQ_CACHE_MAX:
        old_keys = sorted(
            _GROQ_CACHE.keys(),
            key=lambda k: _GROQ_CACHE[k].get("_cached_at", 0),
        )
        for k in old_keys[: _GROQ_CACHE_MAX // 10]:
            _GROQ_CACHE.pop(k, None)


def call_groq(
    prompt: str,
    model_tier: str = "fast",
    system_prompt: str = "",
    expect_json: bool = False,
    timeout: int = 20,
) -> dict:
    """
    Llama a la API de Groq y devuelve el resultado.

    Retorna dict con:
    - ok: bool
    - result: str
    - model: str
    - from_cache: bool
    - latency_ms: int
    - error: str
    """
    if not is_groq_available():
        return {
            "ok": False,
            "result": "",
            "model": "",
            "from_cache": False,
            "latency_ms": 0,
            "error": "GROQ_API_KEY not configured",
        }

    model = get_groq_model(model_tier)
    cache_key = _build_cache_key(prompt, model, system_prompt, expect_json)

    # Verificar caché
    cached = _GROQ_CACHE.get(cache_key)
    if cached:
        result = {k: v for k, v in cached.items() if not k.startswith("_")}
        result["from_cache"] = True
        return result

    start = time.time()
    try:
        import urllib.request

        messages: list[dict[str, Any]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "max_tokens": 2048,
        }
        if expect_json:
            payload["response_format"] = {"type": "json_object"}

        api_key = os.environ["GROQ_API_KEY"]
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            f"{GROQ_BASE_URL}/chat/completions",
            data=data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read().decode("utf-8"))

        latency_ms = int((time.time() - start) * 1000)
        content = body.get("choices", [{}])[0].get("message", {}).get("content", "") or ""

        result: dict = {
            "ok": True,
            "result": content,
            "model": model,
            "from_cache": False,
            "latency_ms": latency_ms,
            "error": "",
        }

        _evict_cache_if_needed()
        _GROQ_CACHE[cache_key] = {**result, "_cached_at": time.time()}
        return result

    except Exception as exc:
        latency_ms = int((time.time() - start) * 1000)
        log.debug("groq_client call failed (%dms): %s", latency_ms, exc)
        return {
            "ok": False,
            "result": "",
            "model": model,
            "from_cache": False,
            "latency_ms": latency_ms,
            "error": str(exc)[:300],
        }


def call_groq_cached(
    prompt: str,
    cache_ttl_seconds: int,
    **kwargs: Any,
) -> dict:
    """
    Como call_groq pero verifica una caché basada en tiempo antes de llamar.
    Ignora el resultado en caché si ha expirado.
    """
    model_tier = kwargs.get("model_tier", "fast")
    system_prompt = kwargs.get("system_prompt", "")
    expect_json = kwargs.get("expect_json", False)
    timeout = kwargs.get("timeout", 20)

    model = get_groq_model(str(model_tier))
    cache_key = _build_cache_key(prompt, model, str(system_prompt), bool(expect_json))

    cached = _GROQ_CACHE.get(cache_key)
    if cached:
        age = time.time() - cached.get("_cached_at", 0)
        if age < cache_ttl_seconds:
            result = {k: v for k, v in cached.items() if not k.startswith("_")}
            result["from_cache"] = True
            return result
        _GROQ_CACHE.pop(cache_key, None)

    return call_groq(
        prompt=prompt,
        model_tier=str(model_tier),
        system_prompt=str(system_prompt),
        expect_json=bool(expect_json),
        timeout=int(timeout),
    )


def clear_groq_cache() -> int:
    """Limpia la caché de Groq. Retorna el número de entradas eliminadas."""
    count = len(_GROQ_CACHE)
    _GROQ_CACHE.clear()
    return count
