"""Ingesta RSS para monitorización de medios."""

from __future__ import annotations

import logging
import hashlib
from datetime import datetime, timezone
from typing import Generator

import feedparser

log = logging.getLogger(__name__)

RSS_FUENTES: dict[str, dict[str, str]] = {
    "el_pais": {"url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "tipo": "prensa", "medio": "El Pais"},
    "el_mundo": {"url": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml", "tipo": "prensa", "medio": "El Mundo"},
    "abc": {"url": "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml", "tipo": "prensa", "medio": "ABC"},
    "la_vanguardia": {"url": "https://www.lavanguardia.com/rss/home.xml", "tipo": "prensa", "medio": "La Vanguardia"},
    "eldiario": {"url": "https://www.eldiario.es/rss/", "tipo": "prensa", "medio": "eldiario.es"},
    "newtral_fc": {"url": "https://www.newtral.es/tag/fact-check/feed/", "tipo": "fact_check", "medio": "Newtral"},
    "maldita": {"url": "https://maldita.es/feed/", "tipo": "fact_check", "medio": "Maldita"},
}


def _parse_fecha(entry: feedparser.FeedParserDict) -> datetime:
    for key in ("published_parsed", "updated_parsed"):
        v = getattr(entry, key, None) or entry.get(key)
        if v:
            try:
                return datetime(*v[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return datetime.now(timezone.utc)


def _norm_url(url: str) -> str:
    if not url:
        return ""
    return url.split("#", 1)[0].strip()


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:16]


def fetch_rss(fuente_id: str | None = None) -> Generator[dict, None, None]:
    sources = {fuente_id: RSS_FUENTES[fuente_id]} if fuente_id else RSS_FUENTES
    for fid, meta in sources.items():
        try:
            feed = feedparser.parse(meta["url"])
        except Exception as exc:
            log.warning("Error RSS %s: %s", fid, exc)
            continue

        for entry in getattr(feed, "entries", []) or []:
            url = _norm_url(str(entry.get("link", "")))
            if not url:
                continue
            title = str(entry.get("title", "")).strip()
            summary = str(entry.get("summary", "")).replace("<p>", " ").replace("</p>", " ").strip()
            yield {
                "fuente": fid,
                "tipo": meta["tipo"],
                "medio": meta["medio"],
                "autor": None,
                "url": url,
                "titular": title[:2000],
                "resumen": summary[:4000],
                "texto_completo": None,
                "fecha_publicacion": _parse_fecha(entry),
                "idioma": "es",
                "alcance_est": 0,
                "likes": 0,
                "shares": 0,
                "comentarios": 0,
                "sentimiento_score": None,
                "sentimiento_label": None,
                "tono": None,
                "categoria": None,
                "categorias_json": [],
                "partidos_mencionados": None,
                "personas_mencionadas": None,
                "embedding_vector": None,
                "procesado": False,
                "cliente_id": None,
                "source_uid": _url_hash(url),
            }
