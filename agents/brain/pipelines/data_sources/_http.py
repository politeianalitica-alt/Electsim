"""HTTP helper común con caché, retry exponencial y user-agent identificable."""
from __future__ import annotations

import json
import logging
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

UA = "PoliteiaBrain/1.0 (+https://politeia-visual-oscar.vercel.app; analytics)"

_CACHE: dict[str, tuple[float, Any]] = {}
_LOCK = Lock()
_CACHE_MAX = 1024


def _cache_get(key: str, ttl_seconds: int) -> Any | None:
    with _LOCK:
        v = _CACHE.get(key)
    if v is None:
        return None
    ts, payload = v
    if time.time() - ts > ttl_seconds:
        return None
    return payload


def _cache_set(key: str, payload: Any) -> None:
    with _LOCK:
        if len(_CACHE) >= _CACHE_MAX:
            _CACHE.pop(next(iter(_CACHE)), None)
        _CACHE[key] = (time.time(), payload)


def http_get_json(
    url: str,
    *,
    params: dict[str, str] | None = None,
    timeout_s: float = 15.0,
    ttl_seconds: int = 3600,
    accept: str = "application/json",
    retries: int = 2,
) -> Any | None:
    """GET JSON con caché. Devuelve None ante fallo (no levanta)."""
    if params:
        url = url + ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    cached = _cache_get(url, ttl_seconds)
    if cached is not None:
        return cached
    last_exc: Exception | None = None
    for attempt in range(retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": UA, "Accept": accept},
            )
            with urllib.request.urlopen(req, timeout=timeout_s) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
            try:
                data = json.loads(raw)
            except (ValueError, TypeError):
                # Si pedimos XML/RSS, devolvemos raw
                data = {"_raw": raw}
            _cache_set(url, data)
            return data
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
            last_exc = exc
            backoff = (0.6 * (2 ** attempt)) + random.uniform(0.0, 0.3)
            time.sleep(backoff)
        except Exception as exc:
            last_exc = exc
            break
    if last_exc:
        logger.debug("http_get_json fallo %s: %s", url[:120], last_exc)
    return None


def http_get_text(
    url: str,
    *,
    timeout_s: float = 20.0,
    ttl_seconds: int = 3600,
    headers: dict[str, str] | None = None,
) -> str | None:
    """GET texto/HTML con caché. Devuelve None ante fallo."""
    cached = _cache_get(url, ttl_seconds)
    if cached is not None and isinstance(cached, str):
        return cached
    try:
        h = {"User-Agent": UA, "Accept": "*/*"}
        if headers:
            h.update(headers)
        req = urllib.request.Request(url, headers=h)
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            txt = resp.read().decode("utf-8", errors="replace")
        _cache_set(url, txt)
        return txt
    except Exception as exc:
        logger.debug("http_get_text fallo %s: %s", url[:120], exc)
        return None


def sparql_query(endpoint: str, query: str, *, ttl_seconds: int = 86400) -> dict[str, Any] | None:
    """Query SPARQL contra endpoint (Wikidata por defecto)."""
    return http_get_json(
        endpoint,
        params={"query": query, "format": "json"},
        ttl_seconds=ttl_seconds,
        accept="application/sparql-results+json",
        timeout_s=25.0,
    )
