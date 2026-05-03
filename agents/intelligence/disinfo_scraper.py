"""
agents.intelligence.disinfo_scraper
=====================================
Ingesta de contenido falso y desinformacion desde fuentes especializadas.

Fuentes:
  1. EUvsDisinfo       — EEAS (RSS)
  2. Maldita.es        — fact-checker espanol (RSS)
  3. Newtral           — fact-checker espanol (RSS)
  4. AFP Factual       — agencia verificacion (RSS)
  5. Verificat         — fact-checker catalan (RSS)
  6. Bellingcat        — OSINT / investigacion (RSS)
  7. EU DisinfoLab     — informes FIMI (HTML scraping)

Para cada item se extrae:
  - url, titulo, resumen, fecha de publicacion
  - veredicto (falso / engañoso / sin_contexto / parcialmente_falso / verdadero)
  - origen inferido (ES / EU / RU / CN / IR / otro)
  - taxonomia (FIMI / DOMESTIC / COORDINATED / ORGANIC)
  - actores mencionados (regex basico, NER opcional)
  - texto completo del articulo (opcional, bajo peticion)

Uso:
    scraper = DisinfoScraper()
    items = scraper.fetch_all(since_hours=24)
    for item in items:
        print(item.verdict, item.title)
"""
from __future__ import annotations

import hashlib
import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any

import requests
from bs4 import BeautifulSoup

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Fuentes configuradas
# ---------------------------------------------------------------------------

_SOURCES: list[dict[str, Any]] = [
    {
        "id": "euvsdisinfo",
        "name": "EUvsDisinfo",
        "url": "https://euvsdisinfo.eu/feed/",
        "type": "rss",
        "default_origin": "RU",
        "default_taxonomy": "FIMI",
        "language": "en",
    },
    {
        "id": "maldita",
        "name": "Maldita.es",
        "url": "https://maldita.es/malditabulo/feed/",
        "type": "rss",
        "default_origin": "ES",
        "default_taxonomy": "DOMESTIC",
        "language": "es",
    },
    {
        "id": "newtral",
        "name": "Newtral",
        "url": "https://www.newtral.es/feed/",
        "type": "rss",
        "default_origin": "ES",
        "default_taxonomy": "DOMESTIC",
        "language": "es",
    },
    {
        "id": "afp_factual",
        "name": "AFP Factual",
        "url": "https://factual.afp.com/list/rss",
        "type": "rss",
        "default_origin": "EU",
        "default_taxonomy": "DOMESTIC",
        "language": "es",
    },
    {
        "id": "verificat",
        "name": "Verificat",
        "url": "https://www.verificat.cat/feed",
        "type": "rss",
        "default_origin": "ES",
        "default_taxonomy": "DOMESTIC",
        "language": "ca",
    },
    {
        "id": "bellingcat",
        "name": "Bellingcat",
        "url": "https://www.bellingcat.com/feed/",
        "type": "rss",
        "default_origin": "EU",
        "default_taxonomy": "FIMI",
        "language": "en",
    },
    {
        "id": "eu_disinfolab",
        "name": "EU DisinfoLab",
        "url": "https://www.disinfo.eu/feed/",
        "type": "rss",
        "default_origin": "EU",
        "default_taxonomy": "FIMI",
        "language": "en",
    },
]

# Vocabulario de veredictos (ES + EN)
_VERDICT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"falso|false|fake|fabricado|inventado", re.I), "falso"),
    (re.compile(r"engañoso|misleading|manipulado|decontextualiz", re.I), "enganoso"),
    (re.compile(r"sin contexto|out of context|sin_contexto", re.I), "sin_contexto"),
    (re.compile(r"parcialmente falso|partly false|semiverdad", re.I), "parcialmente_falso"),
    (re.compile(r"verdadero|true|correcto|verificado", re.I), "verdadero"),
    (re.compile(r"satira|parody|satirico", re.I), "satira"),
]

# Proxies de origen por vocabulario
_ORIGIN_SIGNALS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"russia|kremlin|rt\.com|sputnik|russia today|wagner|rusia", re.I), "RU"),
    (re.compile(r"china|prc|xinhua|cgtn|beijing|pekin", re.I), "CN"),
    (re.compile(r"iran|irgc|teheran|khamenei", re.I), "IR"),
    (re.compile(r"vox|ultraderecha|far.right|extrema derecha", re.I), "ES_FAR_RIGHT"),
    (re.compile(r"independentismo|separatismo|cdrsoli", re.I), "ES_SEPARATIST"),
]

# Taxonomia FIMI / DOMESTIC / COORDINATED
_TAXONOMY_SIGNALS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"FIMI|foreign|extranjero|state.sponsored|patrocinado", re.I), "FIMI"),
    (re.compile(r"coordinat|network|amplification|bot|troll farm", re.I), "COORDINATED"),
    (re.compile(r"organic|espontaneo|citizen|ciudadano", re.I), "ORGANIC"),
]


# ---------------------------------------------------------------------------
# Dataclass de item
# ---------------------------------------------------------------------------

@dataclass
class DisinfoItem:
    item_id: str                         # hash SHA-1 de la URL
    url: str
    source_id: str
    source_name: str
    title: str
    summary: str
    published_at: datetime | None
    verdict: str                         # falso / enganoso / sin_contexto / parcialmente_falso / verdadero / satira / desconocido
    origin: str                          # RU / CN / IR / ES / EU / otro
    taxonomy: str                        # FIMI / DOMESTIC / COORDINATED / ORGANIC
    actors: list[str] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    raw_tags: list[str] = field(default_factory=list)
    # Campos enriquecidos por DisinfoAnalyzer
    narrative_id: int | None = None
    narrative_similarity: float | None = None
    llm_enrichment: dict[str, Any] = field(default_factory=dict)
    scraped_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ---------------------------------------------------------------------------
# DisinfoScraper
# ---------------------------------------------------------------------------

class DisinfoScraper:
    """
    Ingesta paralela de items de desinformacion desde fuentes RSS/HTML.

    Params:
        timeout_s  — timeout HTTP por peticion (segundos)
        user_agent — cabecera User-Agent
    """

    def __init__(
        self,
        timeout_s: int = 15,
        user_agent: str = "ElectSim/1.0 (research; +https://electsim.es)",
    ) -> None:
        self.timeout_s = timeout_s
        self.session = requests.Session()
        self.session.headers["User-Agent"] = user_agent

    # ------------------------------------------------------------------
    # Punto de entrada
    # ------------------------------------------------------------------

    def fetch_all(
        self,
        since_hours: int = 48,
        source_ids: list[str] | None = None,
    ) -> list[DisinfoItem]:
        """
        Obtiene items de todas las fuentes configuradas (o un subconjunto).

        Returns lista deduplicada por URL, ordenada por published_at DESC.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        sources = _SOURCES
        if source_ids:
            sources = [s for s in _SOURCES if s["id"] in source_ids]

        all_items: list[DisinfoItem] = []
        seen_urls: set[str] = set()

        for source in sources:
            try:
                items = self._fetch_source(source, cutoff)
                for item in items:
                    if item.url not in seen_urls:
                        seen_urls.add(item.url)
                        all_items.append(item)
                log.info("Fuente %s: %d items", source["id"], len(items))
            except Exception as exc:
                log.warning("Error fetching %s: %s", source["id"], exc)

        # Ordenar por fecha desc
        all_items.sort(
            key=lambda x: x.published_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        return all_items

    def fetch_source(self, source_id: str, since_hours: int = 48) -> list[DisinfoItem]:
        """Obtiene items de una sola fuente por su ID."""
        source = next((s for s in _SOURCES if s["id"] == source_id), None)
        if source is None:
            raise ValueError(f"Fuente desconocida: {source_id}")
        cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        return self._fetch_source(source, cutoff)

    # ------------------------------------------------------------------
    # Parseo por tipo
    # ------------------------------------------------------------------

    def _fetch_source(self, source: dict[str, Any], cutoff: datetime) -> list[DisinfoItem]:
        if source["type"] == "rss":
            return self._fetch_rss(source, cutoff)
        if source["type"] == "html":
            return self._fetch_html(source, cutoff)
        log.warning("Tipo desconocido para fuente %s: %s", source["id"], source["type"])
        return []

    def _fetch_rss(self, source: dict[str, Any], cutoff: datetime) -> list[DisinfoItem]:
        try:
            resp = self.session.get(source["url"], timeout=self.timeout_s)
            resp.raise_for_status()
        except Exception as exc:
            log.warning("RSS fetch error %s: %s", source["url"], exc)
            return []

        soup = BeautifulSoup(resp.content, "xml")
        items_xml = soup.find_all("item")

        items: list[DisinfoItem] = []
        for item_xml in items_xml:
            try:
                url = self._text(item_xml, "link") or self._text(item_xml, "guid") or ""
                if not url:
                    continue

                pub_date = self._parse_date(self._text(item_xml, "pubDate"))
                if pub_date and pub_date < cutoff:
                    continue

                title = self._clean_html(self._text(item_xml, "title") or "")
                summary = self._clean_html(
                    self._text(item_xml, "description") or
                    self._text(item_xml, "content:encoded") or ""
                )[:800]

                tags = [
                    c.get_text(strip=True)
                    for c in item_xml.find_all("category")
                ]

                full_text = f"{title} {summary} {' '.join(tags)}"
                verdict = self._extract_verdict(full_text, source)
                origin = self._extract_origin(full_text, source)
                taxonomy = self._extract_taxonomy(full_text, source)
                actors = self._extract_actors(full_text)
                keywords = self._extract_keywords(full_text)

                items.append(DisinfoItem(
                    item_id=self._make_id(url),
                    url=url,
                    source_id=source["id"],
                    source_name=source["name"],
                    title=title,
                    summary=summary,
                    published_at=pub_date,
                    verdict=verdict,
                    origin=origin,
                    taxonomy=taxonomy,
                    actors=actors,
                    keywords=keywords,
                    raw_tags=tags,
                ))
            except Exception as exc:
                log.debug("Item parse error: %s", exc)
                continue

        return items

    def _fetch_html(self, source: dict[str, Any], cutoff: datetime) -> list[DisinfoItem]:
        """Fallback para fuentes sin RSS estandar — parseo HTML generico."""
        try:
            resp = self.session.get(source["url"], timeout=self.timeout_s)
            resp.raise_for_status()
        except Exception as exc:
            log.warning("HTML fetch error %s: %s", source["url"], exc)
            return []

        soup = BeautifulSoup(resp.content, "html.parser")
        items: list[DisinfoItem] = []

        # Heuristica: buscar articulos con h2/h3 + enlace
        for article in soup.find_all(["article", "div"], class_=re.compile(r"post|article|entry", re.I)):
            try:
                link_tag = article.find("a", href=True)
                if not link_tag:
                    continue
                url = link_tag["href"]
                if not url.startswith("http"):
                    base = source["url"].split("/")[0] + "//" + source["url"].split("/")[2]
                    url = base + url

                title_tag = article.find(["h1", "h2", "h3"])
                title = self._clean_html(title_tag.get_text() if title_tag else link_tag.get_text())
                summary = ""

                full_text = title
                verdict = self._extract_verdict(full_text, source)
                origin = self._extract_origin(full_text, source)
                taxonomy = self._extract_taxonomy(full_text, source)

                items.append(DisinfoItem(
                    item_id=self._make_id(url),
                    url=url,
                    source_id=source["id"],
                    source_name=source["name"],
                    title=title,
                    summary=summary,
                    published_at=None,
                    verdict=verdict,
                    origin=origin,
                    taxonomy=taxonomy,
                    actors=self._extract_actors(full_text),
                    keywords=self._extract_keywords(full_text),
                ))
            except Exception:
                continue

        return items[:30]

    # ------------------------------------------------------------------
    # Helpers de extraccion
    # ------------------------------------------------------------------

    @staticmethod
    def _text(tag, name: str) -> str | None:
        child = tag.find(name)
        return child.get_text(strip=True) if child else None

    @staticmethod
    def _clean_html(text: str) -> str:
        """Elimina etiquetas HTML y normaliza espacios."""
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"&[a-z]+;", " ", text)
        return re.sub(r"\s+", " ", text).strip()

    @staticmethod
    def _make_id(url: str) -> str:
        return hashlib.sha1(url.encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _parse_date(date_str: str | None) -> datetime | None:
        if not date_str:
            return None
        try:
            dt = parsedate_to_datetime(date_str)
            return dt.astimezone(timezone.utc)
        except Exception:
            pass
        try:
            for fmt in ("%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
                try:
                    dt = datetime.strptime(date_str[:25], fmt)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt
                except ValueError:
                    continue
        except Exception:
            pass
        return None

    @staticmethod
    def _extract_verdict(text: str, source: dict[str, Any]) -> str:
        for pattern, verdict in _VERDICT_PATTERNS:
            if pattern.search(text):
                return verdict
        # EUvsDisinfo siempre es "falso" por defecto
        if source["id"] == "euvsdisinfo":
            return "falso"
        return "desconocido"

    @staticmethod
    def _extract_origin(text: str, source: dict[str, Any]) -> str:
        for pattern, origin in _ORIGIN_SIGNALS:
            if pattern.search(text):
                return origin
        return source.get("default_origin", "otro")

    @staticmethod
    def _extract_taxonomy(text: str, source: dict[str, Any]) -> str:
        for pattern, taxonomy in _TAXONOMY_SIGNALS:
            if pattern.search(text):
                return taxonomy
        return source.get("default_taxonomy", "DOMESTIC")

    @staticmethod
    def _extract_actors(text: str) -> list[str]:
        """Extraccion basica de entidades nombradas por patron de mayusculas."""
        pat = re.compile(
            r"\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3})\b"
        )
        candidates = pat.findall(text)
        # Filtrar stopwords comunes
        stopwords = {
            "El", "La", "Los", "Las", "Un", "Una", "En", "Por", "Con",
            "Del", "Al", "Se", "No", "Si", "Que", "De", "Es", "Ha",
        }
        actors = [c for c in candidates if c.split()[0] not in stopwords]
        freq = {}
        for a in actors:
            freq[a] = freq.get(a, 0) + 1
        return sorted(freq, key=freq.get, reverse=True)[:8]

    @staticmethod
    def _extract_keywords(text: str) -> list[str]:
        """Palabras significativas de mas de 5 caracteres, normalizadas a minusculas."""
        stopwords = {
            "sobre", "desde", "hasta", "entre", "segun", "aunque", "porque",
            "cuando", "donde", "quienes", "durante", "mediante", "cuales",
        }
        words = re.findall(r"[a-záéíóúñ]{5,}", text.lower())
        freq: dict[str, int] = {}
        for w in words:
            if w not in stopwords:
                freq[w] = freq.get(w, 0) + 1
        return sorted(freq, key=freq.get, reverse=True)[:12]
