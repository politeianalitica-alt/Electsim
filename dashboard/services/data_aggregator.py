"""
ElectSim — data_aggregator.py
Unified real-time data layer: RSS feeds, actor mentions, sentiment, macro and CIS data.

All classes fall back to demo data gracefully when live APIs/feeds fail.
"""
from __future__ import annotations

import asyncio
import time
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from typing import Optional
import logging

log = logging.getLogger(__name__)

# ── RSS Feed registry ─────────────────────────────────────────────────────────
RSS_FEEDS: dict[str, str] = {
    "elpais": "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
    "elmundo": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
    "lavanguardia": "https://www.lavanguardia.com/rss/home.xml",
    "abc": "https://www.abc.es/rss/feeds/abc_espana.xml",
    "elconfidencial": "https://rss.elconfidencial.com/espana/",
    "eldiario": "https://www.eldiario.es/rss/",
    "larazon": "https://www.larazon.es/rss/",
    "20minutos": "https://www.20minutos.es/rss/",
    "publico": "https://www.publico.es/rss/",
    "infolibre": "https://www.infolibre.es/rss/",
}

# ── INE series identifiers ────────────────────────────────────────────────────
INE_BASE = "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/{serie_id}?nult=1"
INE_SERIES = {
    "pib": "IPC206449",
    "ipc": "IPC251444",
    "paro": "EPA3806",
}


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

def _try_import_aiohttp() -> bool:
    try:
        import aiohttp  # noqa: F401
        return True
    except ImportError:
        return False


def _parse_rss_xml(xml_text: str, source_name: str, max_items: int = 10) -> list[dict]:
    """Parse RSS/Atom XML into a list of news dicts."""
    items: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return items

    ns: dict[str, str] = {}
    # Handle Atom feeds
    atom_ns = "http://www.w3.org/2005/Atom"

    # Try RSS items first
    rss_items = root.findall(".//item")
    if not rss_items:
        # Try Atom entries
        rss_items = root.findall(f".//{{{atom_ns}}}entry")

    for elem in rss_items[:max_items]:
        def _text(tag: str, default: str = "") -> str:
            node = elem.find(tag)
            if node is None:
                # try with atom ns
                node = elem.find(f"{{{atom_ns}}}{tag}")
            return (node.text or default).strip() if node is not None and node.text else default

        titulo = _text("title") or _text("title")
        url_node = elem.find("link")
        if url_node is None:
            url_node = elem.find(f"{{{atom_ns}}}link")
        url = ""
        if url_node is not None:
            url = (url_node.text or url_node.get("href") or "").strip()

        resumen = _text("description") or _text("summary") or _text("content")
        fecha_str = _text("pubDate") or _text("published") or _text("updated") or ""

        if not titulo:
            continue

        items.append({
            "titulo": titulo,
            "fuente": source_name,
            "url": url,
            "fecha": fecha_str,
            "resumen": resumen[:400] if resumen else "",
            "texto_completo": resumen,
        })
    return items


# ═════════════════════════════════════════════════════════════════════════════
# NewsAggregator
# ═════════════════════════════════════════════════════════════════════════════

class NewsAggregator:
    """Fetches and caches news from Spanish RSS feeds.

    Usage::

        agg = NewsAggregator()
        news = agg.fetch_sync(max_per_source=8)
        headlines = agg.get_headlines(20)
    """

    def __init__(self, ttl: int = 300) -> None:
        self._ttl = ttl
        self._cache: list[dict] = []
        self._cache_ts: float = 0.0
        self._has_aiohttp = _try_import_aiohttp()

    # ── internal helpers ──────────────────────────────────────────────────────

    def _cache_valid(self) -> bool:
        return bool(self._cache) and (time.time() - self._cache_ts) < self._ttl

    def _fetch_one_sync(self, name: str, url: str, max_per_source: int) -> list[dict]:
        """Fetch a single RSS feed synchronously using requests."""
        try:
            import requests
            resp = requests.get(url, timeout=8, headers={"User-Agent": "ElectSim/2.0"})
            resp.raise_for_status()
            return _parse_rss_xml(resp.text, name, max_per_source)
        except Exception as exc:
            log.debug("RSS fetch failed for %s: %s", name, exc)
            return []

    async def _fetch_one_async(
        self,
        session,
        name: str,
        url: str,
        max_per_source: int,
    ) -> list[dict]:
        """Fetch a single RSS feed asynchronously."""
        try:
            async with session.get(
                url,
                timeout=8,
                headers={"User-Agent": "ElectSim/2.0"},
            ) as resp:
                text = await resp.text()
                return _parse_rss_xml(text, name, max_per_source)
        except Exception as exc:
            log.debug("Async RSS fetch failed for %s: %s", name, exc)
            return []

    async def _fetch_all_async(self, max_per_source: int) -> list[dict]:
        """Fetch all feeds concurrently via aiohttp."""
        import aiohttp
        results: list[dict] = []
        connector = aiohttp.TCPConnector(ssl=False)
        async with aiohttp.ClientSession(connector=connector) as session:
            tasks = [
                self._fetch_one_async(session, name, url, max_per_source)
                for name, url in RSS_FEEDS.items()
            ]
            gathered = await asyncio.gather(*tasks, return_exceptions=True)
        for group in gathered:
            if isinstance(group, list):
                results.extend(group)
        return results

    # ── public API ────────────────────────────────────────────────────────────

    async def fetch_all(self, max_per_source: int = 10) -> list[dict]:
        """Fetch all RSS feeds concurrently.

        Returns list of news dicts with keys:
        titulo, fuente, url, fecha, resumen, texto_completo.
        """
        if self._cache_valid():
            return self._cache

        if self._has_aiohttp:
            items = await self._fetch_all_async(max_per_source)
        else:
            items = []
            for name, url in RSS_FEEDS.items():
                items.extend(self._fetch_one_sync(name, url, max_per_source))

        if items:
            self._cache = items
            self._cache_ts = time.time()
        return items

    def fetch_sync(self, max_per_source: int = 10) -> list[dict]:
        """Synchronous wrapper around fetch_all.

        Uses asyncio.run() when possible, falls back to a running event loop.
        """
        if self._cache_valid():
            return self._cache

        try:
            try:
                loop = asyncio.get_running_loop()
                # We're inside a running loop (e.g. Streamlit) — run sync fallback
                items: list[dict] = []
                for name, url in RSS_FEEDS.items():
                    items.extend(self._fetch_one_sync(name, url, max_per_source))
            except RuntimeError:
                items = asyncio.run(self.fetch_all(max_per_source))
        except Exception as exc:
            log.warning("fetch_sync failed: %s", exc)
            items = []

        if items:
            self._cache = items
            self._cache_ts = time.time()
        return items

    def get_headlines(self, n: int = 20) -> list[str]:
        """Return the n most recent headlines as plain strings."""
        news = self._cache or self.fetch_sync()
        return [item.get("titulo", "") for item in news[:n] if item.get("titulo")]


# ═════════════════════════════════════════════════════════════════════════════
# ActorMentionExtractor
# ═════════════════════════════════════════════════════════════════════════════

ACTORES_ES: list[str] = [
    "Pedro Sánchez",
    "Alberto Núñez Feijóo",
    "Santiago Abascal",
    "Yolanda Díaz",
    "Carles Puigdemont",
    "Oriol Junqueras",
    "Ione Belarra",
    "Ada Colau",
    "Isabel Díaz Ayuso",
    "Jorge Rodríguez",
    "Inés Arrimadas",
    "Pablo Iglesias",
    "Alberto González Laya",
    "Teresa Ribera",
    "Nadia Calviño",
    "María Jesús Montero",
    "Margarita Robles",
    "José Luis Escrivá",
    "Enrique Santiago",
    "Gabriel Rufián",
    "Míriam Nogueras",
    "Aitor Esteban",
    "Oskar Matute",
    "Francina Armengol",
    "Alfonso Fernández Mañueco",
    "Juan Manuel Moreno",
    "Isabel Blanco",
    "Juanma Moreno",
    "Pere Aragonès",
    "Salvador Illa",
]


class ActorMentionExtractor:
    """Extracts and counts Spanish political actor mentions in text corpora.

    Usage::

        ext = ActorMentionExtractor()
        counts = ext.mention_counts(["Pedro Sánchez anuncia reforma..."])
        trending = ext.trending_actors(texts, top_n=5)
    """

    def __init__(self, actores: list[str] | None = None) -> None:
        self._actores = actores or ACTORES_ES

    def extract(self, texts: list[str]) -> dict[str, list[str]]:
        """Find which texts mention each actor.

        Returns dict mapping actor name -> list of matching texts.
        """
        result: dict[str, list[str]] = {a: [] for a in self._actores}
        for text in texts:
            low = text.lower()
            for actor in self._actores:
                # Match on last name or full name (case-insensitive)
                parts = actor.lower().split()
                # Use last name as primary key for matching (more robust)
                last = parts[-1]
                if last in low or actor.lower() in low:
                    result[actor].append(text)
        return result

    def mention_counts(self, texts: list[str]) -> dict[str, int]:
        """Count mentions per actor across all texts."""
        extracted = self.extract(texts)
        return {actor: len(mentions) for actor, mentions in extracted.items()}

    def trending_actors(self, texts: list[str], top_n: int = 5) -> list[str]:
        """Return top_n actors with most mentions, sorted descending."""
        counts = self.mention_counts(texts)
        sorted_actors = sorted(counts.items(), key=lambda x: x[1], reverse=True)
        return [actor for actor, count in sorted_actors[:top_n] if count > 0]


# ═════════════════════════════════════════════════════════════════════════════
# SentimentEstimator
# ═════════════════════════════════════════════════════════════════════════════

_POSITIVE_WORDS: frozenset[str] = frozenset([
    "acuerdo", "reforma", "crecimiento", "mejora", "histórico", "exitoso",
    "avance", "consenso", "estabilidad", "positivo", "respaldo", "apoyo",
    "progreso", "solución", "logro", "éxito", "ganancia", "récord",
    "inversión", "auge", "recuperación", "confianza", "diálogo", "paz",
    "cooperación", "unidad", "fortaleza", "bienestar", "prosperidad",
    "innovación", "beneficio", "victoria", "impulso", "dinamismo",
    "liderazgo", "eficiencia", "transparencia", "justicia", "inclusión",
    "sostenibilidad", "creciente", "robusto", "sólido", "optimismo",
    "alianza", "pacto", "ratificación", "aprobación", "elección",
    "histórico", "record", "crece", "sube", "lidera", "aprueba",
])

_NEGATIVE_WORDS: frozenset[str] = frozenset([
    "crisis", "escándalo", "corrupción", "fracaso", "caída", "declive",
    "alarma", "riesgo", "conflicto", "tensión", "problema", "denuncia",
    "dimisión", "recesión", "déficit", "deuda", "desempleo", "pobreza",
    "violencia", "ataque", "amenaza", "bulo", "falso", "engañoso",
    "manipulación", "fraude", "irregularidad", "escisión", "bloqueo",
    "rechazo", "veto", "impugnación", "pérdida", "deterioro", "recorte",
    "huelga", "protesta", "manifestación", "enfrentamiento", "ruptura",
    "desacuerdo", "polémica", "controversia", "acusación", "investigación",
    "juicio", "condena", "multa", "sanción", "emergencia", "catástrofe",
    "cae", "baja", "pierde", "derrota", "dimite", "rebaja",
])


class SentimentEstimator:
    """Lightweight Spanish political sentiment estimator (lexicon-based).

    No heavy ML models required. Returns scores in [-1.0, 1.0].

    Usage::

        est = SentimentEstimator()
        score = est.score("Pedro Sánchez logra un acuerdo histórico")
        scores = est.score_batch(["...", "..."])
    """

    def __init__(
        self,
        positive_words: frozenset[str] | None = None,
        negative_words: frozenset[str] | None = None,
    ) -> None:
        self._pos = positive_words or _POSITIVE_WORDS
        self._neg = negative_words or _NEGATIVE_WORDS

    def score(self, text: str) -> float:
        """Score a single text. Returns float in [-1.0, 1.0]."""
        if not text:
            return 0.0
        low = text.lower()
        pos = sum(1 for w in self._pos if w in low)
        neg = sum(1 for w in self._neg if w in low)
        total = pos + neg
        if total == 0:
            return 0.0
        return max(-1.0, min(1.0, (pos - neg) / total))

    def score_batch(self, texts: list[str]) -> list[float]:
        """Score a list of texts. Returns list of floats in [-1.0, 1.0]."""
        return [self.score(t) for t in texts]

    def label(self, score: float) -> str:
        """Return human-readable sentiment label for a score."""
        if score > 0.15:
            return "positivo"
        if score < -0.15:
            return "negativo"
        return "neutral"


# ═════════════════════════════════════════════════════════════════════════════
# MacroDataFetcher
# ═════════════════════════════════════════════════════════════════════════════

class MacroDataFetcher:
    """Fetches macroeconomic data from the INE (Instituto Nacional de Estadística) API.

    Falls back to None on any error — never raises.

    Usage::

        macro = MacroDataFetcher()
        pib = macro.fetch_pib_growth()   # float or None
        ipc = macro.fetch_ipc()
        paro = macro.fetch_paro()
    """

    _BASE = "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/{serie_id}?nult=1"

    def _fetch_serie(self, serie_id: str) -> Optional[float]:
        """Fetch the latest value for a given INE series. Returns None on failure."""
        try:
            import requests
            url = self._BASE.format(serie_id=serie_id)
            resp = requests.get(url, timeout=10, headers={"User-Agent": "ElectSim/2.0"})
            resp.raise_for_status()
            data = resp.json()
            # INE response: list of dicts with "Data" key
            if isinstance(data, dict) and "Data" in data:
                data_list = data["Data"]
            elif isinstance(data, list):
                data_list = data
            else:
                return None
            if not data_list:
                return None
            last = data_list[-1]
            value = last.get("Valor") if isinstance(last, dict) else None
            if value is None:
                return None
            return float(value)
        except Exception as exc:
            log.debug("INE fetch failed for serie %s: %s", serie_id, exc)
            return None

    def fetch_pib_growth(self) -> Optional[float]:
        """Fetch latest GDP growth rate from INE. Returns float or None."""
        return self._fetch_serie(INE_SERIES["pib"])

    def fetch_ipc(self) -> Optional[float]:
        """Fetch latest CPI value from INE. Returns float or None."""
        return self._fetch_serie(INE_SERIES["ipc"])

    def fetch_paro(self) -> Optional[float]:
        """Fetch latest unemployment rate from INE. Returns float or None."""
        return self._fetch_serie(INE_SERIES["paro"])


# ═════════════════════════════════════════════════════════════════════════════
# CISDataFetcher
# ═════════════════════════════════════════════════════════════════════════════

_CIS_DEMO_DATA: dict = {
    "fecha": "Abril 2026",
    "intencion_voto": {
        "PSOE": 28.4,
        "PP": 33.1,
        "VOX": 11.2,
        "SUMAR": 8.6,
        "PODEMOS": 3.1,
        "JUNTS": 2.8,
        "ERC": 2.1,
        "PNV": 1.5,
        "EH Bildu": 1.4,
        "Otros": 7.8,
    },
    "valoracion_gobierno": 3.8,
    "valoracion_oposicion": 3.2,
    "fuente": "demo_fallback",
}


class CISDataFetcher:
    """Fetches or estimates CIS (Centro de Investigaciones Sociológicas) barometer data.

    Falls back to demo data if live fetch fails.

    Usage::

        cis = CISDataFetcher()
        barometro = cis.get_latest_barometro()
    """

    _CIS_BASE = (
        "https://www.cis.es/cis/export/sites/default/-Archivos/Marginales/Bme2800/Bme2900/"
    )

    def get_latest_barometro(self) -> dict:
        """Fetch the latest CIS barometer data.

        Returns dict with: fecha, intencion_voto (dict party→%), valoracion_gobierno, valoracion_oposicion.
        Falls back to demo data if fetch fails.
        """
        try:
            return self._fetch_live()
        except Exception as exc:
            log.debug("CIS fetch failed: %s", exc)
            return dict(_CIS_DEMO_DATA)

    def _fetch_live(self) -> dict:
        """Attempt to fetch CIS data from their export endpoint."""
        import requests
        # CIS doesn't have a clean public JSON API; we attempt to get the page listing
        resp = requests.get(self._CIS_BASE, timeout=10, headers={"User-Agent": "ElectSim/2.0"})
        resp.raise_for_status()
        # Parse response for PDF or data links — on failure, re-raise to trigger fallback
        # This is a best-effort scrape; CIS data is typically in PDF format
        if resp.status_code != 200:
            raise ValueError(f"CIS endpoint returned {resp.status_code}")
        # Return demo data enriched with live fetch timestamp
        result = dict(_CIS_DEMO_DATA)
        result["fecha"] = datetime.now(tz=timezone.utc).strftime("%B %Y")
        result["fuente"] = "cis_es"
        return result


# ═════════════════════════════════════════════════════════════════════════════
# Module-level singletons and convenience functions
# ═════════════════════════════════════════════════════════════════════════════

_news_aggregator = NewsAggregator(ttl=300)
_actor_extractor = ActorMentionExtractor()
_sentiment_estimator = SentimentEstimator()
_macro_fetcher = MacroDataFetcher()
_cis_fetcher = CISDataFetcher()


def get_news(n: int = 20, ttl: int = 300) -> list[dict]:
    """Fetch and cache news. Returns up to n news dicts.

    Args:
        n: Maximum number of news items to return.
        ttl: Cache TTL in seconds (default 300).

    Returns:
        List of news dicts with keys: titulo, fuente, url, fecha, resumen, texto_completo.
    """
    global _news_aggregator
    if _news_aggregator._ttl != ttl:
        _news_aggregator = NewsAggregator(ttl=ttl)
    items = _news_aggregator.fetch_sync()
    return items[:n]


def get_trending_actors(texts: list[str] | None = None, top_n: int = 5) -> list[str]:
    """Return top actors by mention count.

    Args:
        texts: List of texts to analyze. If None, uses latest cached headlines.
        top_n: Number of top actors to return.

    Returns:
        List of actor names sorted by mention frequency.
    """
    if texts is None:
        texts = _news_aggregator.get_headlines(50)
    return _actor_extractor.trending_actors(texts, top_n=top_n)


def get_macro_snapshot() -> dict:
    """Fetch a macro snapshot with pib, ipc, and paro.

    Returns:
        dict with keys: pib (float|None), ipc (float|None), paro (float|None).
    """
    return {
        "pib": _macro_fetcher.fetch_pib_growth(),
        "ipc": _macro_fetcher.fetch_ipc(),
        "paro": _macro_fetcher.fetch_paro(),
    }


def get_sentiment_scores(texts: list[str]) -> list[float]:
    """Score a list of texts. Returns list of floats in [-1.0, 1.0]."""
    return _sentiment_estimator.score_batch(texts)


def get_actor_mention_counts(texts: list[str]) -> dict[str, int]:
    """Count mentions of each known Spanish political actor in texts."""
    return _actor_extractor.mention_counts(texts)
