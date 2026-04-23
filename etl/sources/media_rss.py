"""Fuentes RSS de medios para tracker de narrativas."""

from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import logging
import re
from typing import Iterable

import feedparser
import httpx

log = logging.getLogger(__name__)

RSS_SOURCES: list[dict[str, str]] = [
    {
        "fuente": "rss_elpais",
        "medio": "El Pais",
        "tipo": "prensa",
        "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    },
    {
        "fuente": "rss_elmundo",
        "medio": "El Mundo",
        "tipo": "prensa",
        "url": "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",
    },
    {
        "fuente": "rss_eldiario",
        "medio": "eldiario.es",
        "tipo": "prensa",
        "url": "https://www.eldiario.es/rss/",
    },
    {
        "fuente": "rss_lavanguardia",
        "medio": "La Vanguardia",
        "tipo": "prensa",
        "url": "https://www.lavanguardia.com/rss/home.xml",
    },
    {
        "fuente": "rss_abc",
        "medio": "ABC",
        "tipo": "prensa",
        "url": "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml",
    },
]

POLITICA_KW = {
    "gobierno",
    "parlamento",
    "congreso",
    "senado",
    "partido",
    "elecciones",
    "pp",
    "psoe",
    "vox",
    "sumar",
    "podemos",
    "ciudadanos",
}



def _clean_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", str(text or "")).strip()



def _is_political(text: str) -> bool:
    low = text.lower()
    return any(kw in low for kw in POLITICA_KW)



def _parse_entry_date(entry: dict) -> datetime:
    pub = entry.get("published_parsed") or entry.get("updated_parsed")
    if pub:
        try:
            return datetime(*pub[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)



def _uid(seed: str) -> str:
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()



def fetch_media_rss(solo_politico: bool = True, max_por_fuente: int = 60) -> list[dict]:
    """Extrae items RSS normalizados para `contenido_mediatico`."""
    records: list[dict] = []
    headers = {"User-Agent": "ElectSim-Tracker/1.0"}

    for source in RSS_SOURCES:
        try:
            resp = httpx.get(
                source["url"],
                headers=headers,
                timeout=12,
                follow_redirects=True,
            )
            resp.raise_for_status()
            feed = feedparser.parse(resp.text)
        except Exception as exc:
            log.warning("[tracker/rss] fallo %s: %s", source.get("fuente"), exc)
            continue

        count = 0
        for entry in feed.entries:
            if count >= max_por_fuente:
                break

            titular = str(getattr(entry, "title", "") or "").strip()
            resumen = _clean_html(str(getattr(entry, "summary", "") or ""))
            texto = (titular + " " + resumen).strip()
            if not texto:
                continue
            if solo_politico and not _is_political(texto):
                continue

            url = str(getattr(entry, "link", "") or "").strip()
            if not url:
                url = f"urn:tracker:{_uid(titular + source['fuente'])}"

            fecha_pub = _parse_entry_date(entry)
            hash_dedup = _uid(f"{source['fuente']}|{url}|{fecha_pub.date().isoformat()}")

            records.append(
                {
                    "fuente": source["fuente"],
                    "tipo": source["tipo"],
                    "medio": source["medio"],
                    "autor": str(getattr(entry, "author", "") or "").strip() or None,
                    "url": url,
                    "titular": titular,
                    "resumen": resumen,
                    "texto_completo": texto,
                    "fecha_publicacion": fecha_pub,
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
                    "partidos_mencionados": "",
                    "personas_mencionadas": "",
                    "embedding_vector": None,
                    "procesado": True,
                    "cliente_id": None,
                    "hash_dedup": hash_dedup,
                }
            )
            count += 1

    return records
