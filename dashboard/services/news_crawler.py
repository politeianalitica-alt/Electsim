"""
News Crawler Service — Noticias de medios españoles en tiempo real.

Integra:
  - fundus: crawler estructurado con parsers para El País, El Mundo, ABC, etc.
  - feedparser: fallback RSS cuando fundus no está disponible
  - Caché con @st.cache_data(ttl=600) para no sobrecargar las fuentes

Inspirado en fundus-master (https://github.com/flairNLP/fundus).
"""
from __future__ import annotations

import re
import sys
import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

log = logging.getLogger(__name__)

# ─── Optional imports ────────────────────────────────────────────────────────

try:
    from fundus import Crawler, PublisherCollection  # type: ignore
    _FUNDUS_OK = True
except ImportError:
    _FUNDUS_OK = False

try:
    import feedparser  # type: ignore
    _FEEDPARSER_OK = True
except ImportError:
    _FEEDPARSER_OK = False

try:
    import requests
    _REQUESTS_OK = True
except ImportError:
    _REQUESTS_OK = False

# ─── RSS Feed catalogue (10 Spanish media outlets) ───────────────────────────

FEEDS_ESPANA: dict[str, str] = {
    "El País":          "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada",
    "El Mundo":         "https://e00-elmundo.uecdn.es/elmundo/rss/espana.xml",
    "ABC":              "https://www.abc.es/rss/feeds/abc_EspanaEspana.xml",
    "La Vanguardia":    "https://www.lavanguardia.com/rss/politica.xml",
    "El Confidencial":  "https://rss.elconfidencial.com/espana/",
    "infoLibre":        "https://www.infolibre.es/rss/politica.xml",
    "Público":          "https://www.publico.es/rss/politica.xml",
    "El Español":       "https://feeds.elespanol.com/rss/politica",
    "20 Minutos":       "https://www.20minutos.es/rss/politica/",
    "elDiario.es":      "https://www.eldiario.es/politica/rss/",
    "El Economista":    "https://www.eleconomista.es/rss/rss-politica.php",
    "Expansión":        "https://e00-expansion.uecdn.es/rss/portada.xml",
}

MEDIO_SESGO: dict[str, str] = {
    "El País":         "centro-izquierda",
    "El Mundo":        "centro-derecha",
    "ABC":             "derecha",
    "La Vanguardia":   "centro",
    "El Confidencial": "centro",
    "infoLibre":       "izquierda",
    "Público":         "izquierda",
    "El Español":      "derecha",
    "20 Minutos":      "centro",
    "elDiario.es":     "izquierda",
    "El Economista":   "liberal",
    "Expansión":       "liberal",
}


@dataclass
class Noticia:
    """Noticia estandarizada de cualquier fuente."""
    id: str
    titulo: str
    url: str
    medio: str
    fecha: datetime
    resumen: str = ""
    texto: str = ""
    partidos: list[str] = field(default_factory=list)
    tema: str = "General"
    sesgo: str = "desconocido"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "titulo": self.titulo,
            "url": self.url,
            "medio": self.medio,
            "fecha": self.fecha.isoformat(),
            "resumen": self.resumen[:400] if self.resumen else "",
            "partidos": self.partidos,
            "tema": self.tema,
            "sesgo": self.sesgo,
        }


# ─── Party & topic detection ─────────────────────────────────────────────────

_PARTY_KWS: dict[str, list[str]] = {
    "PP":       ["partido popular", "pp ", "pp,", "populares", "feijóo"],
    "PSOE":     ["psoe", "partido socialista", "pedro sánchez", "sánchez"],
    "VOX":      ["vox", "abascal"],
    "SUMAR":    ["sumar", "yolanda díaz"],
    "PODEMOS":  ["podemos", "pablo iglesias"],
    "JUNTS":    ["junts", "puigdemont"],
    "ERC":      ["erc", "esquerra"],
    "PNV":      ["pnv", "jeltzale"],
    "EH Bildu": ["bildu", "eh bildu"],
}

_TOPIC_KWS: dict[str, list[str]] = {
    "Economía":    ["economía", "inflación", "paro", "salario", "presupuesto", "pib", "deuda"],
    "Vivienda":    ["vivienda", "alquiler", "hipoteca", "pisos"],
    "Sanidad":     ["sanidad", "hospital", "médico", "salud"],
    "Educación":   ["educación", "universidad", "escuela", "becas"],
    "Migración":   ["migración", "inmigración", "refugiados", "frontera"],
    "Cataluña":    ["cataluña", "independencia", "catalán", "estatuto"],
    "Exterior":    ["otan", "ucrania", "europa", "trump", "eeuu", "israel"],
    "Corrupción":  ["corrupción", "trama", "imputado", "juicio", "fraude"],
    "Seguridad":   ["terrorismo", "policía", "crimen", "seguridad"],
    "Clima":       ["cambio climático", "energía", "renovable", "co2", "sequía"],
}


def _detect_parties(text: str) -> list[str]:
    tl = text.lower()
    return [p for p, kws in _PARTY_KWS.items() if any(k in tl for k in kws)]


def _detect_topic(text: str) -> str:
    tl = text.lower()
    scores = {t: sum(1 for k in kws if k in tl) for t, kws in _TOPIC_KWS.items()}
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "General"


def _parse_date(entry: dict) -> datetime:
    """Extrae fecha de una entry RSS con máxima robustez."""
    for campo in ("published_parsed", "updated_parsed", "created_parsed"):
        val = entry.get(campo)
        if val:
            try:
                import time
                return datetime(*val[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return datetime.now(tz=timezone.utc)


def _make_id(url: str, titulo: str) -> str:
    return hashlib.md5(f"{url}{titulo}".encode()).hexdigest()[:12]


# ─── Core crawling functions ──────────────────────────────────────────────────

def _crawl_rss(medios: list[str] | None = None, max_por_medio: int = 15) -> list[Noticia]:
    """Crawl via feedparser RSS (fallback universal)."""
    if not _FEEDPARSER_OK:
        return []

    if medios is None:
        medios = list(FEEDS_ESPANA.keys())

    noticias: list[Noticia] = []
    for medio in medios:
        url = FEEDS_ESPANA.get(medio)
        if not url:
            continue
        try:
            feed = feedparser.parse(url)
            for entry in (feed.entries or [])[:max_por_medio]:
                titulo = entry.get("title", "Sin título")
                link = entry.get("link", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                summary = re.sub(r"<[^>]+>", " ", summary).strip()
                fecha = _parse_date(dict(entry))
                texto_completo = f"{titulo}. {summary}"
                noticias.append(Noticia(
                    id=_make_id(link, titulo),
                    titulo=titulo,
                    url=link,
                    medio=medio,
                    fecha=fecha,
                    resumen=summary[:400],
                    partidos=_detect_parties(texto_completo),
                    tema=_detect_topic(texto_completo),
                    sesgo=MEDIO_SESGO.get(medio, "desconocido"),
                ))
        except Exception as exc:
            log.warning("RSS %s error: %s", medio, exc)
            continue

    return sorted(noticias, key=lambda n: n.fecha, reverse=True)


def _crawl_fundus(medios: list[str] | None = None, max_total: int = 50) -> list[Noticia]:
    """Crawl via fundus (parsers estructurados por periódico)."""
    if not _FUNDUS_OK:
        return []

    # Map nombre → PublisherCollection attribute
    _FUNDUS_MAP = {
        "El País": "ES.ElPais",
        "El Mundo": "ES.ElMundo",
        "ABC": "ES.ABC",
        "La Vanguardia": "ES.LaVanguardia",
        "elDiario.es": "ES.ElDiario",
        "Público": "ES.Publico",
    }

    publishers = []
    target_medios = medios or list(_FUNDUS_MAP.keys())
    for m in target_medios:
        attr = _FUNDUS_MAP.get(m)
        if attr:
            try:
                parts = attr.split(".")
                pub = getattr(getattr(PublisherCollection, parts[0]), parts[1])
                publishers.append((m, pub))
            except AttributeError:
                pass

    if not publishers:
        return []

    noticias: list[Noticia] = []
    try:
        crawler = Crawler(*[p for _, p in publishers])
        for article in crawler.crawl(max_articles=max_total, timeout=30):
            try:
                medio = next((m for m, p in publishers if p.__name__ in str(type(article))), "Desconocido")
                texto = getattr(article, "plaintext", "") or ""
                titulo = getattr(article, "title", "") or ""
                url = getattr(article, "url", "") or ""
                fecha = getattr(article, "publishing_date", None) or datetime.now(tz=timezone.utc)
                if isinstance(fecha, datetime) and fecha.tzinfo is None:
                    fecha = fecha.replace(tzinfo=timezone.utc)
                texto_completo = f"{titulo}. {texto[:500]}"
                noticias.append(Noticia(
                    id=_make_id(url, titulo),
                    titulo=titulo,
                    url=url,
                    medio=medio,
                    fecha=fecha,
                    resumen=texto[:400],
                    partidos=_detect_parties(texto_completo),
                    tema=_detect_topic(texto_completo),
                    sesgo=MEDIO_SESGO.get(medio, "desconocido"),
                ))
            except Exception:
                continue
    except Exception as exc:
        log.warning("fundus error: %s", exc)

    return sorted(noticias, key=lambda n: n.fecha, reverse=True)


# ─── Public API ───────────────────────────────────────────────────────────────

def cargar_noticias(
    medios: list[str] | None = None,
    max_noticias: int = 100,
    partido_filtro: str | None = None,
    tema_filtro: str | None = None,
    usar_fundus: bool = False,
) -> list[dict]:
    """
    Carga noticias de medios españoles.

    Intenta fundus primero si usar_fundus=True, luego fallback RSS.
    Returns lista de dicts con las noticias.
    """
    noticias: list[Noticia] = []

    if usar_fundus and _FUNDUS_OK:
        noticias = _crawl_fundus(medios=medios, max_total=max_noticias)

    if not noticias:
        noticias = _crawl_rss(medios=medios, max_por_medio=max(10, max_noticias // len(FEEDS_ESPANA)))

    # Filtros
    if partido_filtro:
        noticias = [n for n in noticias if partido_filtro in n.partidos]
    if tema_filtro and tema_filtro != "Todos":
        noticias = [n for n in noticias if n.tema == tema_filtro]

    return [n.to_dict() for n in noticias[:max_noticias]]


def medios_disponibles() -> list[str]:
    """Devuelve nombres de medios configurados."""
    return list(FEEDS_ESPANA.keys())


def temas_disponibles() -> list[str]:
    """Devuelve lista de categorías temáticas."""
    return ["Todos"] + list(_TOPIC_KWS.keys())


def estadisticas_noticias(noticias: list[dict]) -> dict:
    """
    Calcula estadísticas básicas sobre una lista de noticias.
    Returns {total, por_medio, por_tema, por_partido, mas_citado}
    """
    if not noticias:
        return {"total": 0, "por_medio": {}, "por_tema": {}, "por_partido": {}, "mas_citado": "—"}

    por_medio: dict[str, int] = {}
    por_tema: dict[str, int] = {}
    por_partido: dict[str, int] = {}

    for n in noticias:
        medio = n.get("medio", "—")
        tema = n.get("tema", "General")
        partidos = n.get("partidos", [])
        por_medio[medio] = por_medio.get(medio, 0) + 1
        por_tema[tema] = por_tema.get(tema, 0) + 1
        for p in partidos:
            por_partido[p] = por_partido.get(p, 0) + 1

    mas_citado = max(por_partido, key=lambda k: por_partido[k]) if por_partido else "—"

    return {
        "total": len(noticias),
        "por_medio": dict(sorted(por_medio.items(), key=lambda x: x[1], reverse=True)),
        "por_tema": dict(sorted(por_tema.items(), key=lambda x: x[1], reverse=True)),
        "por_partido": dict(sorted(por_partido.items(), key=lambda x: x[1], reverse=True)),
        "mas_citado": mas_citado,
    }


def disponible() -> dict[str, bool]:
    return {
        "fundus": _FUNDUS_OK,
        "feedparser": _FEEDPARSER_OK,
        "requests": _REQUESTS_OK,
    }
