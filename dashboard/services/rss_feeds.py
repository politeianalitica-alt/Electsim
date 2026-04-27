"""Integración RSS para el Monitor de Medios.

Obtiene titulares de medios españoles usando feedparser (sin API key, sin coste).
TTL de caché en Streamlit: 15 minutos para no sobrecargar los servidores de origen.

Inspiración:
- scrapy-master/scrapy/spiders/feed.py: patrón XMLFeedSpider — iterar sobre
  entries del feed y extraer campos normalizados (title, link, published, summary)
- scrapy-master/scrapy/extensions/feedexport.py: campo-a-campo extraction con
  getattr defensivo.
"""
from __future__ import annotations

import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import streamlit as st

from etl.logger import get_logger

logger = get_logger(__name__)

# ── Feeds de medios españoles ──────────────────────────────────────────────────
FEEDS_ESPANA: list[dict[str, str]] = [
    {"nombre": "El País",        "url": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", "categoria": "generalista"},
    {"nombre": "El Mundo",       "url": "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",              "categoria": "generalista"},
    {"nombre": "El Confidencial","url": "https://rss.elconfidencial.com/espana/",                           "categoria": "generalista"},
    {"nombre": "La Vanguardia",  "url": "https://www.lavanguardia.com/mvc/feed/rss/politics.xml",           "categoria": "generalista"},
    {"nombre": "Público",        "url": "https://www.publico.es/rss/",                                      "categoria": "generalista"},
    {"nombre": "20 Minutos",     "url": "https://www.20minutos.es/rss/",                                    "categoria": "generalista"},
    {"nombre": "El Español",     "url": "https://www.elespanol.com/rss/",                                   "categoria": "generalista"},
    {"nombre": "infoLibre",      "url": "https://www.infolibre.es/rss/",                                    "categoria": "generalista"},
    {"nombre": "Expansión",      "url": "https://e00-expansion.uecdn.es/rss/portada.xml",                   "categoria": "economia"},
    {"nombre": "El Economista",  "url": "https://www.eleconomista.es/rss/rss-portada.php",                  "categoria": "economia"},
]

_PARTIDOS = ["PP", "PSOE", "VOX", "Sumar", "Podemos", "Junts", "PNV", "ERC", "Bildu", "Ciudadanos", "CS"]
_TEMAS = {
    "economia":   ["economía", "pib", "inflación", "empleo", "paro", "deuda", "presupuesto", "impuesto", "renta"],
    "sanidad":    ["sanidad", "salud", "hospital", "médico", "enfermería", "psicología"],
    "vivienda":   ["vivienda", "alquiler", "hipoteca", "inmobiliario", "piso", "casa"],
    "seguridad":  ["crimen", "delito", "policía", "seguridad", "terrorismo"],
    "cataluna":   ["cataluña", "independencia", "generalitat", "secesión"],
    "migracion":  ["migración", "inmigrante", "frontera", "mena", "refugiado"],
    "internacional": ["ucrania", "otan", "europa", "ue", "trump", "eeuu", "china"],
}


@dataclass
class NoticiaRSS:
    titulo: str
    url: str
    medio: str
    categoria: str
    fecha: datetime
    resumen: str = ""
    partidos_mencionados: list[str] = field(default_factory=list)
    temas_detectados: list[str] = field(default_factory=list)


def _extraer_texto(entry: Any, campo: str, default: str = "") -> str:
    """Extracción defensiva de un campo de entry feedparser (patrón Scrapy)."""
    val = getattr(entry, campo, None)
    if val is None:
        val = entry.get(campo, default) if hasattr(entry, "get") else default
    return str(val or default).strip()


def _parsear_fecha(entry: Any) -> datetime:
    """Convierte published_parsed de feedparser a datetime UTC."""
    parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if parsed:
        try:
            return datetime(*parsed[:6], tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.now(tz=timezone.utc)


def _detectar_partidos(texto: str) -> list[str]:
    texto_lower = texto.lower()
    return [p for p in _PARTIDOS if p.lower() in texto_lower]


def _detectar_temas(texto: str) -> list[str]:
    texto_lower = texto.lower()
    return [tema for tema, kws in _TEMAS.items() if any(kw in texto_lower for kw in kws)]


def _limpiar_html(texto: str) -> str:
    return re.sub(r"<[^>]+>", "", texto).strip()


def _parsear_feed(feed_cfg: dict[str, str], timeout: int = 8) -> list[NoticiaRSS]:
    """Descarga y parsea un feed RSS. Retorna [] si falla."""
    try:
        import feedparser  # type: ignore

        feed = feedparser.parse(feed_cfg["url"], request_headers={"User-Agent": "ElectSim/1.0"})
        noticias: list[NoticiaRSS] = []
        for entry in (feed.get("entries") or [])[:20]:
            titulo = _extraer_texto(entry, "title")
            if not titulo:
                continue
            resumen = _limpiar_html(_extraer_texto(entry, "summary") or _extraer_texto(entry, "description"))
            texto_completo = f"{titulo} {resumen}"
            noticias.append(
                NoticiaRSS(
                    titulo=titulo,
                    url=_extraer_texto(entry, "link"),
                    medio=feed_cfg["nombre"],
                    categoria=feed_cfg["categoria"],
                    fecha=_parsear_fecha(entry),
                    resumen=resumen[:300],
                    partidos_mencionados=_detectar_partidos(texto_completo),
                    temas_detectados=_detectar_temas(texto_completo),
                )
            )
        return noticias
    except Exception as exc:
        logger.warning("RSS %s falló: %s", feed_cfg["nombre"], exc)
        return []


@st.cache_data(ttl=900, show_spinner=False)
def cargar_noticias_rss(
    medios: list[str] | None = None,
    partido_filtro: str | None = None,
    tema_filtro: str | None = None,
    max_noticias: int = 60,
) -> list[dict]:
    """Carga noticias de RSS feeds españoles con caché de 15 minutos.

    Args:
        medios: nombres de medios a incluir, None = todos
        partido_filtro: filtra por partido mencionado
        tema_filtro: filtra por tema detectado
        max_noticias: máximo de noticias a retornar

    Returns:
        Lista de dicts con claves: titulo, url, medio, categoria, fecha,
        resumen, partidos_mencionados, temas_detectados
    """
    feeds_activos = [f for f in FEEDS_ESPANA if medios is None or f["nombre"] in medios]
    todas: list[NoticiaRSS] = []
    for feed_cfg in feeds_activos:
        todas.extend(_parsear_feed(feed_cfg))
        time.sleep(0.1)

    todas.sort(key=lambda n: n.fecha, reverse=True)

    if partido_filtro:
        todas = [n for n in todas if partido_filtro in n.partidos_mencionados]
    if tema_filtro:
        todas = [n for n in todas if tema_filtro in n.temas_detectados]

    return [
        {
            "titulo": n.titulo,
            "url": n.url,
            "medio": n.medio,
            "categoria": n.categoria,
            "fecha": n.fecha.strftime("%Y-%m-%d %H:%M"),
            "resumen": n.resumen,
            "partidos": ", ".join(n.partidos_mencionados) or "—",
            "temas": ", ".join(n.temas_detectados) or "—",
        }
        for n in todas[:max_noticias]
    ]


def nombres_medios() -> list[str]:
    return [f["nombre"] for f in FEEDS_ESPANA]


def temas_disponibles() -> list[str]:
    return list(_TEMAS.keys())
