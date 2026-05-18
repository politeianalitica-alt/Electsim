"""
Búsqueda de noticias por keyword vía Google News RSS.

Google News RSS expone búsquedas públicas sin auth en:
  https://news.google.com/rss/search?q=KEYWORD&hl=es-ES&gl=ES&ceid=ES:es

Parseamos el XML con stdlib (xml.etree) sin dependencias extra. Devolvemos
una lista de noticias con titular, medio, fecha, URL y snippet.

API:
  search_news(query, max_items=30) → list[dict]
  search_news_for_municipio(nombre, ccaa) → list[dict] con keyword optimizada
  search_news_for_politico(nombre, partido) → list[dict] con keyword optimizada
"""
from __future__ import annotations

import logging
import re
import urllib.parse
from datetime import datetime
from typing import Any
from xml.etree import ElementTree as ET

from ._http import http_get_text

logger = logging.getLogger(__name__)

GOOGLE_NEWS_BASE = "https://news.google.com/rss/search"


def _parse_rss(xml_text: str) -> list[dict[str, Any]]:
    """Parsea un feed RSS 2.0 estándar."""
    if not xml_text:
        return []
    try:
        # Limpieza mínima: a veces hay BOM o whitespace
        cleaned = xml_text.lstrip("﻿").strip()
        root = ET.fromstring(cleaned)
    except ET.ParseError as exc:
        logger.debug("rss parse falló: %s", exc)
        return []
    items = []
    for item in root.iter("item"):
        # Extraer título
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        desc = (item.findtext("description") or "").strip()
        source_el = item.find("source")
        medio = source_el.text if source_el is not None and source_el.text else ""

        # En Google News, el título es "Titular - Medio"
        if not medio and " - " in title:
            parts = title.rsplit(" - ", 1)
            title = parts[0]
            medio = parts[1] if len(parts) > 1 else ""

        # Quitar HTML del description
        snippet = re.sub(r"<[^>]+>", " ", desc).strip()
        snippet = re.sub(r"\s+", " ", snippet)[:400]

        # Normalizar fecha a ISO
        fecha_iso = ""
        try:
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(pub)
            fecha_iso = dt.isoformat()
        except Exception:
            pass

        items.append({
            "titulo": title,
            "url": link,
            "medio": medio,
            "fecha": fecha_iso,
            "fecha_publicacion_raw": pub,
            "snippet": snippet,
        })
    return items


def search_news(query: str, *, max_items: int = 30,
                idioma: str = "es-ES", pais: str = "ES",
                ttl_seconds: int = 900) -> list[dict[str, Any]]:
    """Búsqueda libre en Google News RSS."""
    if not query:
        return []
    q = urllib.parse.quote_plus(query)
    url = f"{GOOGLE_NEWS_BASE}?q={q}&hl={idioma}&gl={pais}&ceid={pais}:{idioma.split('-')[0]}"
    xml_text = http_get_text(url, ttl_seconds=ttl_seconds)
    if not xml_text:
        return []
    items = _parse_rss(xml_text)
    return items[:max_items]


def search_news_for_municipio(nombre: str, ccaa: str = "", *,
                              max_items: int = 30,
                              dias: int = 30) -> list[dict[str, Any]]:
    """Búsqueda optimizada por municipio: nombre + 'ayuntamiento' o ccaa."""
    if not nombre:
        return []
    # Query con comillas para nombre exacto + filtros temporales aproximados
    if ccaa and len(nombre) < 8:
        q = f"\"{nombre}\" {ccaa} ayuntamiento OR pleno OR alcalde"
    else:
        q = f"\"{nombre}\" ayuntamiento OR pleno OR alcalde OR concejal"
    if dias and dias <= 7:
        q = f"{q} when:7d"
    elif dias and dias <= 30:
        q = f"{q} when:30d"
    return search_news(q, max_items=max_items)


def search_news_for_ccaa(nombre: str, *, max_items: int = 30,
                         dias: int = 14) -> list[dict[str, Any]]:
    q = f"\"{nombre}\" gobierno OR presidente OR consejero OR parlamento"
    if dias <= 14:
        q = f"{q} when:14d"
    return search_news(q, max_items=max_items)


def search_news_for_politico(nombre: str, partido: str = "", *,
                             max_items: int = 30,
                             dias: int = 30) -> list[dict[str, Any]]:
    """Búsqueda optimizada por político."""
    if not nombre:
        return []
    q = f"\"{nombre}\""
    if partido:
        q = f"{q} {partido}"
    if dias <= 7:
        q = f"{q} when:7d"
    elif dias <= 30:
        q = f"{q} when:30d"
    elif dias <= 90:
        q = f"{q} when:3m"
    return search_news(q, max_items=max_items)


def detect_editorial_lean(medio: str) -> str:
    """Asigna línea editorial conocida a un medio (best-effort)."""
    m = (medio or "").lower()
    progres = ["el país", "elpais", "eldiario", "público", "publico", "infolibre",
                "la sexta", "lasexta", "cadena ser", "ser ", "rtve", "ctxt", "vozpopuli"]
    conserv = ["abc", "el mundo", "elmundo", "la razón", "larazon", "okdiario",
                "el debate", "eldebate", "libertad digital", "esradio", "cope", "antena 3"]
    centro = ["lavanguardia", "la vanguardia", "20minutos", "20 minutos",
              "europapress", "europa press", "elperiodico", "el periódico", "el periodico",
              "elespanol", "el español", "el espanol",
              "elconfidencial", "el confidencial"]
    if any(k in m for k in progres):
        return "progresista"
    if any(k in m for k in conserv):
        return "conservador"
    if any(k in m for k in centro):
        return "centro"
    return ""
