"""
Adaptador de artículos crudos → MediaItem normalizado y deduplicado.

Responsabilidades:
  - Limpiar HTML del resumen/texto
  - Calcular content_hash (SHA-256 del título normalizado) para deduplicación
  - Parsear published_at desde múltiples formatos
  - Truncar campos a los límites de la BD
  - Producir MediaItem listo para upsert
"""
from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

from .schemas import MediaItem, RawMediaItem

logger = logging.getLogger(__name__)

# ── Límites de la BD ──────────────────────────────────────────────────────────

_MAX_TITLE = 2000
_MAX_URL = 2000
_MAX_SUMMARY = 5000
_MAX_TEXT = 50_000


# ── Normalización de texto ────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def _strip_html(text: str | None) -> str | None:
    """Elimina etiquetas HTML y normaliza espacios."""
    if not text:
        return None
    clean = _TAG_RE.sub(" ", text)
    clean = _WS_RE.sub(" ", clean).strip()
    return clean or None


def _normalize_title(titulo: str) -> str:
    """
    Normaliza el título para calcular el hash de deduplicación:
    minúsculas, sin acentos, sin puntuación, espacios simples.
    """
    s = titulo.lower()
    # Eliminar acentos
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    # Eliminar caracteres no alfanuméricos
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


# ── Parser de fechas ──────────────────────────────────────────────────────────

_DATE_FORMATS = [
    "%a, %d %b %Y %H:%M:%S %z",      # RFC 2822 con zona horaria (+0200)
    "%a, %d %b %Y %H:%M:%S %Z",      # RFC 2822 con nombre de zona (GMT)
    "%Y-%m-%dT%H:%M:%S%z",           # ISO 8601 con zona
    "%Y-%m-%dT%H:%M:%SZ",            # ISO 8601 UTC
    "%Y-%m-%dT%H:%M:%S",             # ISO 8601 naive
    "%Y-%m-%d %H:%M:%S",             # SQL-like
    "%Y-%m-%d",                       # Solo fecha
    "%d/%m/%Y %H:%M:%S",             # ES format con hora
    "%d/%m/%Y",                       # ES format solo fecha
]


def _parse_published_at(raw: str | None) -> datetime | None:
    """Parsea fecha de publicación desde string RSS en múltiples formatos."""
    if not raw:
        return None
    raw = raw.strip()
    # Eliminar sufijo de zona horaria textual desconocido
    raw_clean = re.sub(r"\s+[A-Z]{3,4}$", "", raw)
    for fmt in _DATE_FORMATS:
        try:
            dt = datetime.strptime(raw_clean, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    logger.debug("No se pudo parsear fecha: %r", raw)
    return None


# ── MediaAdapter ──────────────────────────────────────────────────────────────

class MediaAdapter:
    """
    Convierte RawMediaItem → MediaItem normalizado.

    Uso::

        adapter = MediaAdapter()
        items = adapter.adapt_many(raw_items)
    """

    def adapt(self, raw: RawMediaItem) -> MediaItem:
        """Normaliza un artículo crudo a MediaItem."""
        titulo = (raw.title or "").strip()[:_MAX_TITLE]
        url = (raw.url or "")[:_MAX_URL]
        summary = _strip_html(raw.summary)
        if summary:
            summary = summary[:_MAX_SUMMARY]
        text = _strip_html(raw.text)
        if text:
            text = text[:_MAX_TEXT]

        # Hashes de deduplicación
        normalized = _normalize_title(titulo)
        content_hash = _sha256(normalized) if normalized else _sha256(titulo)
        title_hash = _sha256(titulo)

        # URL canónica — por ahora igual a url (Fundus la puede enriquecer)
        canonical_url = url or None

        return MediaItem(
            source=raw.source,
            source_url=raw.source_url,
            source_region=raw.source_region,
            source_country=raw.source_country,
            source_lat=raw.source_lat,
            source_lon=raw.source_lon,
            title=titulo,
            url=url,
            published_at=_parse_published_at(raw.published_raw),
            author=raw.author,
            summary=summary,
            text=text,
            language=raw.language,
            canonical_url=canonical_url,
            content_hash=content_hash,
            title_hash=title_hash,
            raw_payload=raw.raw_payload,
        )

    def adapt_many(
        self,
        raws: list[RawMediaItem],
        deduplicate: bool = True,
    ) -> list[MediaItem]:
        """
        Normaliza una lista de artículos crudos.

        Args:
            raws: artículos a normalizar.
            deduplicate: si True, elimina duplicados por content_hash (primer ganador).

        Returns:
            list[MediaItem] únicos si deduplicate=True.
        """
        items: list[MediaItem] = []
        seen: set[str] = set()

        for raw in raws:
            try:
                item = self.adapt(raw)
            except Exception as exc:
                logger.warning("MediaAdapter.adapt skip (%s): %s", raw.title[:50], exc)
                continue

            if deduplicate:
                if item.content_hash in seen:
                    continue
                seen.add(item.content_hash)

            items.append(item)

        logger.debug("MediaAdapter.adapt_many: %d/%d artículos únicos", len(items), len(raws))
        return items
