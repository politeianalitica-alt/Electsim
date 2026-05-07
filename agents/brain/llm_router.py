"""
LLM Router — enruta tareas al modelo correcto con caché, timeout y fallback.

Task types:
- translation     → modelo fast, caché larga
- classification  → modelo fast, resultado booleano/categórico
- extraction      → modelo normal, JSON estructurado
- narrative_frame → modelo normal, JSON narrativa
- briefing        → modelo deep, texto largo
- comms_strategy  → modelo deep, JSON estrategia
- qna             → modelo normal, preguntas/respuestas
- red_team        → modelo normal, análisis de riesgos
- deep_analysis   → modelo deep, análisis complejo
- evidence_check  → modelo normal, validación claims
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any, Literal

log = logging.getLogger(__name__)

TaskType = Literal[
    "translation", "classification", "extraction", "narrative_frame",
    "briefing", "comms_strategy", "qna", "red_team", "deep_analysis", "evidence_check"
]

# Configuración de modelos por task
_TASK_CONFIG: dict[str, dict] = {
    "translation":     {"speed": "fast",   "timeout": 15,  "json": False, "cache_ttl": 86400},
    "classification":  {"speed": "fast",   "timeout": 10,  "json": True,  "cache_ttl": 3600},
    "extraction":      {"speed": "normal", "timeout": 30,  "json": True,  "cache_ttl": 1800},
    "narrative_frame": {"speed": "normal", "timeout": 45,  "json": True,  "cache_ttl": 3600},
    "briefing":        {"speed": "deep",   "timeout": 120, "json": False, "cache_ttl": 900},
    "comms_strategy":  {"speed": "deep",   "timeout": 90,  "json": True,  "cache_ttl": 1800},
    "qna":             {"speed": "normal", "timeout": 60,  "json": False, "cache_ttl": 3600},
    "red_team":        {"speed": "normal", "timeout": 60,  "json": False, "cache_ttl": 1800},
    "deep_analysis":   {"speed": "deep",   "timeout": 120, "json": False, "cache_ttl": 900},
    "evidence_check":  {"speed": "normal", "timeout": 30,  "json": True,  "cache_ttl": 7200},
}

# Modelos por velocidad — lean de env o usan defaults alineados con model_router.py
_SPEED_MODELS = {
    "fast":   os.environ.get("LLM_FAST_MODEL",   os.environ.get("ELECTSIM_OLLAMA_FAST_MODEL",    "llama3.2:3b")),
    "normal": os.environ.get("LLM_NORMAL_MODEL", os.environ.get("ELECTSIM_OLLAMA_MODEL",         "qwen2.5:7b")),
    "deep":   os.environ.get("LLM_DEEP_MODEL",   os.environ.get("ELECTSIM_OLLAMA_GENERAL_MODEL", "qwen2.5:7b")),
}
_OLLAMA_URL = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

# Caché en memoria: {cache_key: {result, cached_at, task_type}}
_LLM_CACHE: dict[str, dict] = {}
_CACHE_MAX_SIZE = 2000

# Estadísticas de latencia por task_type
_STATS: dict[str, list[float]] = {}


def route(
    task_type: TaskType,
    prompt: str,
    context: dict | None = None,
    force_refresh: bool = False,
    tenant_id: str = "default",
) -> dict:
    """
    Enruta una tarea al modelo correcto.

    Retorna dict con:
    - result: str | dict | None
    - model: str
    - task_type: str
    - from_cache: bool
    - latency_ms: int | None
    - error: str | None
    - ok: bool
    """
    cfg = _TASK_CONFIG.get(task_type, _TASK_CONFIG["extraction"])
    cache_key = _build_cache_key(task_type, prompt, context)

    # Check caché primero
    if not force_refresh:
        cached = _get_cached(cache_key, cfg["cache_ttl"])
        if cached:
            return {**cached, "from_cache": True, "ok": True, "error": None}

    model = _SPEED_MODELS.get(cfg["speed"], _SPEED_MODELS["normal"])

    # Intentar Ollama
    start = time.time()
    try:
        result = _call_ollama(prompt, model, cfg["timeout"], cfg["json"])
        latency_ms = int((time.time() - start) * 1000)
        _record_stats(task_type, latency_ms)
        _record_job(task_type, prompt, model, "success", latency_ms, result)
        response = {
            "result": result,
            "model": model,
            "task_type": task_type,
            "from_cache": False,
            "latency_ms": latency_ms,
            "ok": True,
            "error": None,
        }
        _store_cache(cache_key, response)
        return response
    except Exception as exc:
        latency_ms = int((time.time() - start) * 1000)
        _record_job(task_type, prompt, model, "error", latency_ms, None, str(exc))
        log.warning("llm_router %s failed (%dms): %s", task_type, latency_ms, exc)

        # Intentar fallback Groq (rápido, gratuito) antes que cloud
        groq_result = _try_groq_fallback(prompt, task_type, cfg["json"])
        if groq_result:
            return {**groq_result, "task_type": task_type, "from_cache": False, "ok": True}

        # Intentar fallback cloud si está disponible
        cloud_result = _try_cloud_fallback(task_type, prompt, cfg)
        if cloud_result:
            return {**cloud_result, "from_cache": False, "ok": True}

        return {
            "result": None,
            "model": model,
            "task_type": task_type,
            "from_cache": False,
            "latency_ms": latency_ms,
            "ok": False,
            "error": str(exc)[:200],
        }


def _call_ollama(prompt: str, model: str, timeout: int, expect_json: bool) -> Any:
    """Llama a Ollama directamente. Lanza excepción si falla."""
    import requests  # importado aquí para que el módulo sea importable sin requests

    payload: dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
    }
    if expect_json:
        payload["format"] = "json"

    resp = requests.post(
        f"{_OLLAMA_URL}/api/generate",
        json=payload,
        timeout=timeout,
    )
    resp.raise_for_status()
    text = resp.json().get("response", "").strip()

    if expect_json and text:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Intentar extraer JSON del texto libre
            import re
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
            return {"raw": text}
    return text


def _try_groq_fallback(prompt: str, task_type: str, expect_json: bool) -> dict | None:
    """Intenta usar Groq como alternativa rápida antes del cloud."""
    try:
        from agents.brain.groq_client import is_groq_available, call_groq
        if not is_groq_available():
            return None
        tier = "fast" if _TASK_CONFIG.get(task_type, {}).get("speed") == "fast" else "normal"
        result = call_groq(prompt, model_tier=tier, expect_json=expect_json, timeout=15)
        if result.get("ok"):
            return result
        return None
    except Exception:
        return None


def _try_cloud_fallback(task_type: str, prompt: str, cfg: dict) -> dict | None:
    """Fallback a API cloud si está disponible (Anthropic > OpenAI)."""
    try:
        if "ANTHROPIC_API_KEY" in os.environ:
            import anthropic
            client = anthropic.Anthropic()
            msg = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            result = msg.content[0].text if msg.content else None
            return {
                "result": result,
                "model": "claude-haiku-cloud",
                "task_type": task_type,
                "latency_ms": None,
            }
        elif "OPENAI_API_KEY" in os.environ:
            import openai
            client = openai.OpenAI()
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
            )
            result = resp.choices[0].message.content if resp.choices else None
            return {
                "result": result,
                "model": "gpt-4o-mini-cloud",
                "task_type": task_type,
                "latency_ms": None,
            }
    except Exception as exc:
        log.debug("cloud fallback failed: %s", exc)
    return None


def _build_cache_key(task_type: str, prompt: str, context: dict | None) -> str:
    payload = f"{task_type}:{prompt[:1000]}:{json.dumps(context or {}, sort_keys=True)}"
    return hashlib.sha256(payload.encode()).hexdigest()[:24]


def _get_cached(key: str, ttl: int) -> dict | None:
    entry = _LLM_CACHE.get(key)
    if not entry:
        return None
    cached_at = entry.get("_cached_at", 0)
    if time.time() - cached_at > ttl:
        _LLM_CACHE.pop(key, None)
        return None
    return {k: v for k, v in entry.items() if not k.startswith("_")}


def _store_cache(key: str, response: dict) -> None:
    if len(_LLM_CACHE) >= _CACHE_MAX_SIZE:
        # Evict el 10% más antiguo
        old_keys = sorted(
            _LLM_CACHE.keys(),
            key=lambda k: _LLM_CACHE[k].get("_cached_at", 0),
        )
        for k in old_keys[: _CACHE_MAX_SIZE // 10]:
            _LLM_CACHE.pop(k, None)
    _LLM_CACHE[key] = {**response, "_cached_at": time.time()}


def _record_stats(task_type: str, latency_ms: int) -> None:
    if task_type not in _STATS:
        _STATS[task_type] = []
    _STATS[task_type].append(latency_ms)
    if len(_STATS[task_type]) > 100:
        _STATS[task_type] = _STATS[task_type][-100:]


def _record_job(
    task_type: str,
    prompt: str,
    model: str,
    status: str,
    latency_ms: int,
    result: Any,
    error: str | None = None,
) -> None:
    """Registra job en DB si disponible. Falla silenciosamente."""
    try:
        import uuid
        from db.session import get_raw_conn

        conn = get_raw_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO llm_jobs
                  (job_id, task_type, prompt_hash, model, status, finished_at,
                   latency_ms, result_json, error_message, created_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    str(uuid.uuid4()),
                    task_type,
                    hashlib.sha256(prompt[:500].encode()).hexdigest()[:16],
                    model,
                    status,
                    datetime.now(timezone.utc).isoformat(),
                    latency_ms,
                    json.dumps(result)[:5000] if result else None,
                    error[:500] if error else None,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            conn.commit()
    except Exception:
        pass


def get_stats() -> dict:
    """Retorna estadísticas de latencia y tamaño de caché."""
    stats: dict[str, Any] = {}
    for task, latencies in _STATS.items():
        if latencies:
            stats[task] = {
                "calls": len(latencies),
                "avg_ms": round(sum(latencies) / len(latencies)),
                "max_ms": max(latencies),
            }
    stats["cache_size"] = len(_LLM_CACHE)
    return stats


def is_ollama_available() -> bool:
    """Check rápido (3 s timeout) si Ollama está corriendo."""
    try:
        import requests

        resp = requests.get(f"{_OLLAMA_URL}/api/tags", timeout=3)
        return resp.status_code == 200
    except Exception:
        return False


def get_routing_config() -> dict:
    """
    Return the full routing configuration for diagnostic/UI purposes.
    Exposes _TASK_CONFIG, _SPEED_MODELS, ollama status, and cache stats.
    """
    return {
        "task_types": {
            task: {
                "speed": cfg["speed"],
                "timeout": cfg["timeout"],
                "json_output": cfg["json"],
                "cache_ttl_seconds": cfg["cache_ttl"],
                "model": _SPEED_MODELS.get(cfg["speed"], "unknown"),
            }
            for task, cfg in _TASK_CONFIG.items()
        },
        "speed_models": dict(_SPEED_MODELS),
        "ollama_available": is_ollama_available(),
        "cache_stats": get_stats(),
    }
