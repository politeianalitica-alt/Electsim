"""
Clase base para scrapers tiempo real: DRY_RUN, rate limit, cache HTTP, logging.
"""

from __future__ import annotations

import base64
import hashlib
import json
import logging
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from sqlalchemy import text

logger = logging.getLogger(__name__)


class DryRunException(Exception):
    """Se lanza en ``get()`` cuando ``ELECTSIM_DRY_RUN`` no es ``false``."""

    def __init__(self, url: str) -> None:
        self.url = url
        super().__init__(f"DRY_RUN activo; no se realiza petición a {url}")


class BaseRealTimeScraper:
    """
    Gestiona dry_run, rate limiting, logging a ``scraping_log``,
    cache en ``cache_http`` y errores uniformes.
    """

    REQUEST_DELAY_SECONDS: float = 2.0
    USER_AGENT: str = "ElectSim-España/1.0 (investigacion academica; +https://github.com/)"

    @staticmethod
    def is_dry_run() -> bool:
        """Lee ``ELECTSIM_DRY_RUN`` en cada llamada (útil en tests con ``monkeypatch``)."""
        return os.getenv("ELECTSIM_DRY_RUN", "true").lower() != "false"

    def __init__(self, nombre: str, engine) -> None:
        self.nombre = nombre
        self.engine = engine
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.USER_AGENT})

    def _url_hash(self, url: str) -> str:
        return hashlib.sha256(url.encode("utf-8")).hexdigest()

    def _cache_get(self, url: str) -> requests.Response | None:
        uh = self._url_hash(url)
        stmt = text(
            """
            SELECT respuesta_body, content_type, status_code
            FROM cache_http
            WHERE url_hash = :h AND expires_at > NOW()
            """
        )
        try:
            with self.engine.connect() as conn:
                row = conn.execute(stmt, {"h": uh}).fetchone()
        except Exception as exc:
            logger.debug("cache read skip: %s", exc)
            return None
        if not row:
            return None
        body, ctype, code = row[0], row[1] or "application/octet-stream", int(row[2] or 200)
        raw = body or ""
        if isinstance(raw, str) and raw.startswith("B64:"):
            content = base64.b64decode(raw[4:])
        else:
            content = raw.encode("utf-8") if isinstance(raw, str) else raw
        r = requests.Response()
        r.status_code = code
        r._content = content
        r.headers["Content-Type"] = ctype
        return r

    def _cache_put(
        self,
        url: str,
        body: str | bytes,
        content_type: str,
        status_code: int,
        ttl_horas: int,
    ) -> None:
        if self.is_dry_run():
            return
        uh = self._url_hash(url)
        if isinstance(body, bytes):
            try:
                body_s = body.decode("utf-8")
            except UnicodeDecodeError:
                body_s = "B64:" + base64.b64encode(body).decode("ascii")
        else:
            body_s = body
        exp = datetime.now(timezone.utc) + timedelta(hours=ttl_horas)
        stmt = text(
            """
            INSERT INTO cache_http (url_hash, url, respuesta_body, content_type, status_code, expires_at)
            VALUES (:uh, :url, :body, :ct, :sc, :exp)
            ON CONFLICT (url_hash) DO UPDATE SET
                respuesta_body = EXCLUDED.respuesta_body,
                content_type = EXCLUDED.content_type,
                status_code = EXCLUDED.status_code,
                expires_at = EXCLUDED.expires_at,
                created_at = NOW()
            """
        )
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    stmt,
                    {
                        "uh": uh,
                        "url": url,
                        "body": body_s,
                        "ct": content_type,
                        "sc": status_code,
                        "exp": exp,
                    },
                )
        except Exception as exc:
            logger.warning("cache write failed: %s", exc)

    def get(self, url: str, timeout: int = 30, cache_ttl_horas: int = 6) -> requests.Response:
        if self.is_dry_run():
            raise DryRunException(url)

        cached = self._cache_get(url)
        if cached is not None:
            return cached

        time.sleep(self.REQUEST_DELAY_SECONDS)
        last_err: Exception | None = None
        for intento in range(3):
            try:
                r = self.session.get(url, timeout=timeout)
                r.raise_for_status()
                body = r.content
                ct = r.headers.get("Content-Type", "application/octet-stream")
                self._cache_put(url, body, ct[:100], r.status_code, cache_ttl_horas)
                return r
            except Exception as e:
                last_err = e
                time.sleep(2**intento)
        assert last_err is not None
        raise last_err

    def log_resultado(
        self,
        url: str,
        estado: str,
        n_nuevos: int = 0,
        n_dup: int = 0,
        error: str | None = None,
        duracion: float = 0.0,
        tipo: str = "scrape",
    ) -> None:
        if self.is_dry_run():
            return
        stmt = text(
            """
            INSERT INTO scraping_log (
                fuente, tipo, url, estado, n_registros_nuevos, n_registros_duplicados,
                error_mensaje, duracion_segundos
            ) VALUES (
                :f, :tipo, :url, :estado, :nn, :nd, :err, :dur
            )
            """
        )
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    stmt,
                    {
                        "f": self.nombre,
                        "tipo": tipo,
                        "url": url[:2000] if url else "",
                        "estado": estado,
                        "nn": n_nuevos,
                        "nd": n_dup,
                        "err": (error or "")[:5000],
                        "dur": duracion,
                    },
                )
        except Exception as exc:
            logger.warning("scraping_log insert failed: %s", exc)

    def crear_alerta(
        self,
        tipo: str,
        severidad: str,
        titulo: str,
        descripcion: str,
        datos: dict | None = None,
    ) -> None:
        if self.is_dry_run():
            logger.info("[DRY_RUN] alerta omitida: %s — %s", titulo, tipo)
            return
        stmt = text(
            """
            INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos_json)
            VALUES (:tipo, :sev, :tit, :desc, :dj)
            """
        )
        dj = json.dumps(datos or {}, ensure_ascii=False) if datos else None
        try:
            with self.engine.begin() as conn:
                conn.execute(
                    stmt,
                    {
                        "tipo": tipo,
                        "sev": severidad,
                        "tit": titulo[:200],
                        "desc": descripcion,
                        "dj": dj,
                    },
                )
        except Exception as exc:
            logger.warning("alertas_sistema insert failed: %s", exc)

    def run(self) -> dict:
        raise NotImplementedError
