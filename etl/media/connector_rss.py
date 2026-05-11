"""
RSS connector for the Media Intelligence v2 catalog.

Writes into `noticias_prensa` using the LEGACY column names
(`titular`, `fuente`, `fecha_publicacion`) for backwards compatibility,
while ALSO populating the new classification fields (`fuente_id`, `tier`,
`ideologia`, `pais`, `ccaa`, `tags`, `imagen_url`, `autor`, `word_count`,
`idioma`, `url_hash`).

Deduplication via `url_hash` (SHA-256 of URL).

Everything is honest: silent fallbacks when feedparser/bs4 missing,
empty results when feeds return no items.
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)

UPSERT_SQL = """
    INSERT INTO noticias_prensa (
        titular, subtitular, url, url_hash,
        fuente, fuente_id, fuente_nombre,
        tier, ideologia, pais, ccaa, tags,
        fecha_publicacion, fecha_scraping,
        idioma, imagen_url, autor, categoria, word_count
    )
    VALUES (
        :titular, :subtitular, :url, :url_hash,
        :fuente, :fuente_id, :fuente_nombre,
        :tier, :ideologia, :pais, :ccaa, :tags,
        :fecha_publicacion, NOW(),
        :idioma, :imagen_url, :autor, :categoria, :word_count
    )
    ON CONFLICT (url) DO UPDATE SET
        titular           = EXCLUDED.titular,
        subtitular        = EXCLUDED.subtitular,
        fecha_publicacion = EXCLUDED.fecha_publicacion,
        fuente_id         = EXCLUDED.fuente_id,
        fuente_nombre     = EXCLUDED.fuente_nombre,
        tier              = EXCLUDED.tier,
        ideologia         = EXCLUDED.ideologia,
        pais              = EXCLUDED.pais,
        ccaa              = EXCLUDED.ccaa,
        tags              = EXCLUDED.tags,
        idioma            = EXCLUDED.idioma,
        imagen_url        = EXCLUDED.imagen_url,
        autor             = EXCLUDED.autor,
        categoria         = EXCLUDED.categoria,
        word_count        = EXCLUDED.word_count
"""


@dataclass
class IngestResult:
    source_id: str
    n_rows: int = 0
    n_inserted: int = 0
    n_updated: int = 0
    duration_ms: int = 0
    error: Optional[str] = None


# ── HELPERS ──────────────────────────────────────────────────────────────

def _url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().encode()).hexdigest()


def _strip_html(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(raw, "html.parser")
        out = soup.get_text(separator=" ", strip=True)
    except Exception:
        out = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", out).strip()[:2000]


def _parse_date(entry: Any) -> datetime:
    for attr in ("published", "updated", "created"):
        raw = getattr(entry, attr, None)
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc)
            except Exception:
                pass
    return datetime.now(timezone.utc)


def _detect_lang_quick(pais: str, ccaa: str | None, title: str) -> str:
    if pais in ("GB", "US", "IE"):
        return "en"
    if pais == "FR":
        return "fr"
    if pais in ("DE", "AT"):
        return "de"
    if pais == "QA":
        return "en"
    t = title.lower()
    if ccaa == "CAT" and any(w in t for w in ["però", "amb", "aquest", "també"]):
        return "ca"
    if ccaa == "PVA" and any(w in t for w in ["euskal", "ikurriña", "abertzale"]):
        return "eu"
    return "es"


def _extract_image(entry: Any) -> str | None:
    # media:thumbnail
    thumb = getattr(entry, "media_thumbnail", None)
    if thumb:
        try:
            return thumb[0].get("url")
        except Exception:
            pass
    # enclosures
    enclosures = getattr(entry, "enclosures", None) or []
    for enc in enclosures:
        if str(enc.get("type", "")).startswith("image"):
            return enc.get("href") or enc.get("url")
    # og:image embedded in summary
    summary = getattr(entry, "summary", "")
    if summary:
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(summary, "html.parser")
            img = soup.find("img")
            if img:
                return img.get("src")
        except Exception:
            pass
    return None


def _entry_to_record(entry: Any, source) -> dict | None:
    url = getattr(entry, "link", None) or getattr(entry, "id", None)
    if not url:
        return None
    titulo = _strip_html(getattr(entry, "title", ""))[:500]
    if not titulo or len(titulo) < 10:
        return None
    resumen = _strip_html(
        getattr(entry, "summary", None) or getattr(entry, "description", None) or ""
    )
    wc = len((titulo + " " + resumen).split())
    tags = list(source.tags) if source.tags else None
    categoria = None
    if getattr(entry, "tags", None):
        try:
            categoria = entry.tags[0].get("term") if isinstance(entry.tags[0], dict) else getattr(entry.tags[0], "term", None)
        except Exception:
            categoria = None
    return {
        "titular":           titulo,
        "subtitular":        resumen[:2000] or None,
        "url":               url[:1000],
        "url_hash":          _url_hash(url),
        "fuente":            source.nombre,           # legacy text column
        "fuente_id":         source.id,               # new catalog id
        "fuente_nombre":     source.nombre,
        "tier":              source.tier,
        "ideologia":         source.ideologia,
        "pais":              source.pais,
        "ccaa":              source.ccaa,
        "tags":              tags,
        "fecha_publicacion": _parse_date(entry).date(),
        "idioma":            _detect_lang_quick(source.pais, source.ccaa, titulo),
        "imagen_url":        _extract_image(entry),
        "autor":             getattr(entry, "author", None),
        "categoria":         categoria,
        "word_count":        wc,
    }


# ── FETCH / PERSIST ──────────────────────────────────────────────────────

async def fetch_feed(source, http_client) -> list[dict]:
    try:
        import feedparser
    except ImportError:
        logger.warning("feedparser not installed; skipping %s", source.id)
        return []
    try:
        resp = await http_client.get(
            source.rss_url,
            timeout=15.0,
            headers={
                "User-Agent": "Politeia-Analitica/1.0 (+https://politeia.io)",
                "Accept": "application/rss+xml, application/atom+xml, text/xml, */*",
            },
            follow_redirects=True,
        )
        if resp.status_code != 200:
            logger.debug("[%s] HTTP %d", source.id, resp.status_code)
            return []
    except Exception as exc:
        logger.debug("[%s] fetch error: %s", source.id, exc)
        return []
    feed = feedparser.parse(resp.text)
    records: list[dict] = []
    for entry in feed.entries[: source.max_items_per_fetch]:
        rec = _entry_to_record(entry, source)
        if rec:
            records.append(rec)
    return records


def _persist(records: list[dict]) -> tuple[int, int]:
    if not records:
        return 0, 0
    try:
        from db.session import get_engine
        from sqlalchemy import text as sa_text
    except Exception:
        return 0, 0
    eng = get_engine()
    inserted = updated = 0
    try:
        with eng.begin() as conn:
            for rec in records:
                try:
                    res = conn.execute(sa_text(UPSERT_SQL), rec)
                    if res.rowcount > 0:
                        inserted += 1
                    else:
                        updated += 1
                except Exception as exc:
                    logger.debug("upsert error %s: %s", rec.get("url"), exc)
    except Exception as exc:
        logger.warning("persist error: %s", exc)
    return inserted, updated


async def run_ingestion(
    sources: Optional[list] = None,
    concurrency: int = 8,
) -> dict:
    """Fetch every active source in parallel and persist."""
    if sources is None:
        from etl.media.sources_catalog import ALL_SOURCES
        sources = [s for s in ALL_SOURCES if s.activa]
    try:
        import httpx
    except ImportError:
        return {"error": "httpx_not_installed", "sources_run": 0}
    sem = asyncio.Semaphore(concurrency)
    results: list[IngestResult] = []

    async def _one(src):
        async with sem:
            t0 = datetime.now()
            try:
                async with httpx.AsyncClient() as client:
                    recs = await fetch_feed(src, client)
                ins, upd = _persist(recs)
                return IngestResult(
                    source_id=src.id, n_rows=len(recs),
                    n_inserted=ins, n_updated=upd,
                    duration_ms=int((datetime.now() - t0).total_seconds() * 1000),
                )
            except Exception as exc:
                return IngestResult(
                    source_id=src.id, error=str(exc),
                    duration_ms=int((datetime.now() - t0).total_seconds() * 1000),
                )

    results = await asyncio.gather(*[_one(s) for s in sources])
    n_ok = sum(1 for r in results if r.error is None and r.n_rows > 0)
    n_failed = sum(1 for r in results if r.error is not None)
    return {
        "sources_run":  len(sources),
        "records_found": sum(r.n_rows for r in results),
        "inserted":     sum(r.n_inserted for r in results),
        "updated":      sum(r.n_updated for r in results),
        "n_ok":         n_ok,
        "n_failed":     n_failed,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
        "details": [
            {"source_id": r.source_id, "rows": r.n_rows, "ins": r.n_inserted,
             "upd": r.n_updated, "ms": r.duration_ms, "error": r.error}
            for r in results
        ],
    }


def run_sync() -> dict:
    """Sync entry point — used by Vercel cron job (no asyncio in the handler)."""
    return asyncio.run(run_ingestion())


if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    summary = run_sync()
    print(json.dumps(summary, indent=2, default=str))
