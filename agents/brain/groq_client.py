"""
Groq Client — ElectSim · cliente HTTP a la API OpenAI-compat de Groq.

Modelos vigentes (mayo 2026 · verificados contra https://console.groq.com/docs/models):
  - classify : gemma2-9b-it             (rápido + barato · clasificación)
  - fast     : llama-3.1-8b-instant     (rápido + 128k contexto)
  - normal   : llama-3.3-70b-versatile  (calidad alta · 128k contexto)
  - deep     : llama-3.3-70b-versatile  (mismo modelo · más tokens y temperatura más baja)

Notas de configuración:
  - Lee `GROQ_API_KEY` o, si no existe, `OPENAI_API_KEY` (compat: el deploy
    usa OPENAI_API_KEY apuntando a Groq via OPENAI_BASE_URL).
  - Cliente HTTP: `httpx` (compatible con el resto del backend FastAPI).
  - Rate limit: semáforo de 30 req/min compartido (tier gratuito Groq 70B).
  - Errores 429: retry exponencial respetando el header `Retry-After`.
  - Caché: SHA-256 con TTL por defecto 1h (configurable por llamada).
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from collections import deque
from typing import Any

log = logging.getLogger(__name__)

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# ─────────────────────────────────────────────────────────────────
# MODELOS · única fuente de verdad para todo el proyecto
# ─────────────────────────────────────────────────────────────────

_GROQ_MODELS: dict[str, str] = {
    "classify": "gemma2-9b-it",                  # G8 · ahora sí se usa
    "fast":     "llama-3.1-8b-instant",
    "normal":   "llama-3.3-70b-versatile",
    "deep":     "llama-3.3-70b-versatile",       # G1 · ya no apunta a mixtral discontinuado
}

# Permitir override via env (production puede preferir un modelo específico)
for _tier in list(_GROQ_MODELS.keys()):
    _env_key = f"GROQ_MODEL_{_tier.upper()}"
    _override = os.environ.get(_env_key, "").strip()
    if _override:
        _GROQ_MODELS[_tier] = _override


# ─────────────────────────────────────────────────────────────────
# CACHÉ · LRU con TTL temporal
# ─────────────────────────────────────────────────────────────────

_GROQ_CACHE: dict[str, dict] = {}
_GROQ_CACHE_MAX = 1000
_GROQ_CACHE_DEFAULT_TTL_S = int(os.environ.get("GROQ_CACHE_TTL_SECONDS", "3600"))
_GROQ_CACHE_LOCK = threading.Lock()


# ─────────────────────────────────────────────────────────────────
# RATE LIMITER · 30 req/min compartido entre todos los hilos
# ─────────────────────────────────────────────────────────────────

_GROQ_RATE_RPM = int(os.environ.get("GROQ_RATE_LIMIT_RPM", "30"))
_GROQ_RATE_LOCK = threading.Lock()
_GROQ_RATE_HISTORY: deque[float] = deque(maxlen=_GROQ_RATE_RPM * 2)


def _acquire_rate_slot(timeout: float = 60.0) -> bool:
    """Bloquea hasta que haya hueco en el rate limit o expire timeout.

    Implementación: ventana deslizante de 60s con `_GROQ_RATE_RPM` huecos.
    Si la ventana está llena, duerme hasta que el slot más antiguo caduque.
    """
    deadline = time.monotonic() + timeout
    while True:
        with _GROQ_RATE_LOCK:
            now = time.monotonic()
            # Purga timestamps fuera de la ventana de 60s
            while _GROQ_RATE_HISTORY and now - _GROQ_RATE_HISTORY[0] > 60.0:
                _GROQ_RATE_HISTORY.popleft()
            if len(_GROQ_RATE_HISTORY) < _GROQ_RATE_RPM:
                _GROQ_RATE_HISTORY.append(now)
                return True
            sleep_for = 60.0 - (now - _GROQ_RATE_HISTORY[0])
        if time.monotonic() + sleep_for > deadline:
            log.warning("groq rate limit · esperando %.1fs supera timeout", sleep_for)
            return False
        time.sleep(min(sleep_for + 0.05, 2.0))


# ─────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────

def _get_api_key() -> str:
    """Devuelve la API key de Groq.

    Acepta GROQ_API_KEY (canónica) o OPENAI_API_KEY (compat OpenAI · cuando
    el deploy usa Groq via OPENAI_BASE_URL).
    """
    key = (os.environ.get("GROQ_API_KEY") or os.environ.get("OPENAI_API_KEY") or "").strip()
    return key


def is_groq_available() -> bool:
    """Verifica si hay API key configurada (sin llamada HTTP)."""
    return bool(_get_api_key())


def get_groq_model(tier: str) -> str:
    """Devuelve el nombre del modelo Groq para el tier indicado."""
    return _GROQ_MODELS.get(tier, _GROQ_MODELS["fast"])


def list_groq_models() -> dict[str, str]:
    """Snapshot de los modelos actuales (para diagnóstico)."""
    return dict(_GROQ_MODELS)


def _build_cache_key(prompt: str, model: str, system_prompt: str, expect_json: bool) -> str:
    payload = f"{model}:{system_prompt}:{prompt[:2000]}:{expect_json}"
    return hashlib.sha256(payload.encode()).hexdigest()[:32]


def _evict_cache_if_needed() -> None:
    with _GROQ_CACHE_LOCK:
        if len(_GROQ_CACHE) >= _GROQ_CACHE_MAX:
            old_keys = sorted(
                _GROQ_CACHE.keys(),
                key=lambda k: _GROQ_CACHE[k].get("_cached_at", 0),
            )
            for k in old_keys[: _GROQ_CACHE_MAX // 10]:
                _GROQ_CACHE.pop(k, None)


def _cache_get(cache_key: str, ttl_s: int) -> dict | None:
    with _GROQ_CACHE_LOCK:
        cached = _GROQ_CACHE.get(cache_key)
        if not cached:
            return None
        age = time.time() - cached.get("_cached_at", 0)
        if age >= ttl_s:
            _GROQ_CACHE.pop(cache_key, None)
            return None
        result = {k: v for k, v in cached.items() if not k.startswith("_")}
        result["from_cache"] = True
        return result


def _cache_set(cache_key: str, result: dict) -> None:
    with _GROQ_CACHE_LOCK:
        _GROQ_CACHE[cache_key] = {**result, "_cached_at": time.time()}


# ─────────────────────────────────────────────────────────────────
# LLAMADA HTTP
# ─────────────────────────────────────────────────────────────────

def _http_post_chat(
    payload: dict[str, Any],
    api_key: str,
    timeout: int,
) -> tuple[int, dict[str, Any], dict[str, str]]:
    """POST a /chat/completions usando httpx. Devuelve (status, body, headers).

    Lanza excepción solo en errores de transporte (DNS, TLS, timeout). Para
    códigos HTTP no-2xx devuelve el cuerpo para que el caller decida la
    estrategia (retry, fallback, etc.).
    """
    import httpx
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(
            f"{GROQ_BASE_URL}/chat/completions",
            json=payload,
            headers=headers,
        )
        try:
            body = resp.json()
        except Exception:
            body = {"raw_text": resp.text[:500]}
        return resp.status_code, body, dict(resp.headers)


def _retry_after_seconds(headers: dict[str, str], body: dict[str, Any], attempt: int) -> float:
    """Calcula segundos a esperar antes de reintentar tras 429."""
    raw = headers.get("retry-after") or headers.get("Retry-After")
    if raw:
        try:
            return max(0.5, float(raw))
        except (TypeError, ValueError):
            pass
    # Groq incluye a veces 'retry-after-ms'
    raw_ms = headers.get("retry-after-ms") or headers.get("Retry-After-Ms")
    if raw_ms:
        try:
            return max(0.5, float(raw_ms) / 1000.0)
        except (TypeError, ValueError):
            pass
    # Backoff exponencial 1s, 2s, 4s, 8s...
    return min(30.0, 2.0 ** attempt)


# ─────────────────────────────────────────────────────────────────
# API PÚBLICA
# ─────────────────────────────────────────────────────────────────

def call_groq(
    prompt: str,
    model_tier: str = "fast",
    system_prompt: str = "",
    expect_json: bool = False,
    timeout: int = 20,
    max_retries: int = 3,
    cache_ttl_seconds: int | None = None,
    use_cache: bool = True,
) -> dict:
    """Llama a la API de Groq con cache, rate-limit y retry en 429.

    Retorna dict con: ok, result, model, from_cache, latency_ms, error,
    attempts, status_code.
    """
    if not is_groq_available():
        return {
            "ok": False, "result": "", "model": "", "from_cache": False,
            "latency_ms": 0, "error": "GROQ_API_KEY/OPENAI_API_KEY not configured",
            "attempts": 0, "status_code": 0,
        }

    model = get_groq_model(model_tier)
    ttl = cache_ttl_seconds if cache_ttl_seconds is not None else _GROQ_CACHE_DEFAULT_TTL_S
    cache_key = _build_cache_key(prompt, model, system_prompt, expect_json)

    if use_cache:
        hit = _cache_get(cache_key, ttl)
        if hit is not None:
            return hit

    # G7 · respetamos rate-limit antes de cada intento
    if not _acquire_rate_slot(timeout=float(timeout * max(2, max_retries))):
        return {
            "ok": False, "result": "", "model": model, "from_cache": False,
            "latency_ms": 0, "error": "groq_rate_limit_timeout",
            "attempts": 0, "status_code": 429,
        }

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
        # I8 · La API Groq exige que "json" aparezca en el prompt/system
        haystack = (system_prompt + " " + prompt).lower()
        if "json" not in haystack:
            log.debug("groq expect_json=True pero prompt no menciona 'json'; añadiendo aviso al system")
            payload["messages"] = (
                [{"role": "system", "content": (system_prompt + " Responde estrictamente en JSON válido.").strip()}]
                if not system_prompt else
                [
                    {"role": "system", "content": system_prompt + "\n\nResponde estrictamente en JSON válido."},
                    {"role": "user", "content": prompt},
                ]
            )
        payload["response_format"] = {"type": "json_object"}

    api_key = _get_api_key()
    start = time.time()
    last_error: str = ""
    last_status: int = 0
    attempts = 0

    for attempt in range(max_retries):
        attempts = attempt + 1
        try:
            status, body, headers = _http_post_chat(payload, api_key, timeout)
            last_status = status

            if status == 200:
                content = ""
                try:
                    content = body.get("choices", [{}])[0].get("message", {}).get("content", "") or ""
                except (AttributeError, IndexError, TypeError):
                    content = ""
                latency_ms = int((time.time() - start) * 1000)
                result: dict = {
                    "ok": True, "result": content, "model": model,
                    "from_cache": False, "latency_ms": latency_ms, "error": "",
                    "attempts": attempts, "status_code": status,
                }
                if use_cache:
                    _evict_cache_if_needed()
                    _cache_set(cache_key, result)
                return result

            if status == 429:
                wait_s = _retry_after_seconds(headers, body, attempt)
                log.warning(
                    "groq 429 rate-limited (attempt %d/%d) · esperando %.1fs · model=%s",
                    attempts, max_retries, wait_s, model,
                )
                last_error = f"rate_limited_429: {body.get('error', {}).get('message', '')[:120]}"
                if attempt < max_retries - 1:
                    time.sleep(wait_s)
                    # Re-adquirir rate slot tras la espera (la cuenta probablemente ya está limpia)
                    _acquire_rate_slot(timeout=float(timeout))
                    continue
                break

            if status in (500, 502, 503, 504):
                wait_s = min(8.0, 2.0 ** attempt)
                log.warning(
                    "groq %d (attempt %d/%d) · esperando %.1fs · model=%s",
                    status, attempts, max_retries, wait_s, model,
                )
                last_error = f"http_{status}"
                if attempt < max_retries - 1:
                    time.sleep(wait_s)
                    continue
                break

            # 4xx no recuperable
            err_msg = body.get("error", {}) if isinstance(body, dict) else {}
            if isinstance(err_msg, dict):
                last_error = f"http_{status}: {err_msg.get('message', '')[:200]}"
            else:
                last_error = f"http_{status}"
            log.warning("groq error %d (no-retry) · %s", status, last_error)
            break

        except Exception as exc:
            last_error = f"transport: {type(exc).__name__}: {str(exc)[:200]}"
            log.warning(
                "groq transport error (attempt %d/%d): %s",
                attempts, max_retries, last_error,
            )
            if attempt < max_retries - 1:
                time.sleep(min(8.0, 2.0 ** attempt))
                continue
            break

    latency_ms = int((time.time() - start) * 1000)
    return {
        "ok": False, "result": "", "model": model, "from_cache": False,
        "latency_ms": latency_ms, "error": last_error or "unknown",
        "attempts": attempts, "status_code": last_status,
    }


def call_groq_cached(
    prompt: str,
    cache_ttl_seconds: int,
    **kwargs: Any,
) -> dict:
    """Compat retroactiva · llama a call_groq con TTL explícito."""
    kwargs.pop("cache_ttl_seconds", None)
    return call_groq(prompt, cache_ttl_seconds=cache_ttl_seconds, **kwargs)


def clear_groq_cache() -> int:
    """Limpia la caché de Groq. Retorna el número de entradas eliminadas."""
    with _GROQ_CACHE_LOCK:
        count = len(_GROQ_CACHE)
        _GROQ_CACHE.clear()
    return count
