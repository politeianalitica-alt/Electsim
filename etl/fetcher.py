"""
fetcher.py
Cliente HTTP con caché local, retry y rate-limit por dominio.
"""

from __future__ import annotations

import hashlib
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


CACHE_DIR = Path(".etl_cache")
CACHE_DIR.mkdir(exist_ok=True)

_domain_last_call: dict[str, float] = {}

RATE_LIMITS = {
    "default": 0.5,
    "servicios.ine.es": 1.0,
    "data-api.ecb.europa.eu": 0.5,
    "ec.europa.eu": 1.0,
    "www.congreso.es": 2.0,
    "www.boe.es": 1.0,
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PoliteiaScraper/1.0; +https://github.com/politeianalitica-alt/Electsim)"
}


def _get_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(total=3, backoff_factor=1.5, status_forcelist=[429, 500, 502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    return s


def _cache_key(url: str) -> Path:
    return CACHE_DIR / (hashlib.md5(url.encode("utf-8")).hexdigest() + ".txt")


def _rate_limit(domain: str) -> None:
    delay = RATE_LIMITS.get(domain, RATE_LIMITS["default"])
    last = _domain_last_call.get(domain, 0.0)
    wait = delay - (time.time() - last)
    if wait > 0:
        time.sleep(wait)
    _domain_last_call[domain] = time.time()


def fetch(url: str, cache_ttl: int = 3600, timeout: int = 15) -> str | None:
    """Descarga URL con caché local y degradación elegante."""
    cache_file = _cache_key(url)
    domain = urlparse(url).netloc

    if cache_file.exists():
        age = time.time() - cache_file.stat().st_mtime
        if age < cache_ttl:
            return cache_file.read_text(encoding="utf-8")

    _rate_limit(domain)
    try:
        session = _get_session()
        r = session.get(url, headers=HEADERS, timeout=timeout)
        r.raise_for_status()
        content = r.text
        cache_file.write_text(content, encoding="utf-8")
        return content
    except Exception:
        # Si falla, intenta caché stale.
        if cache_file.exists():
            return cache_file.read_text(encoding="utf-8")
        return None
