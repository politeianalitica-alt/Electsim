"""
Wikipedia Fetcher · helper liviano para alimentar al GroqBrain con material
de Wikipedia ES sobre actores, municipios, CCAA, partidos, instituciones.

Sin dependencias pesadas: usa la REST API pública de Wikipedia con
`urllib.request` (incluido en stdlib). Caché en memoria para evitar
re-fetch en la misma sesión.

API:
  · WikipediaFetcher().fetch_summary(title)      → resumen + URL
  · WikipediaFetcher().fetch_extract(title)      → primeros 5 párrafos
  · WikipediaFetcher().fetch_infobox(title)      → dict con campos clave
  · WikipediaFetcher().fetch_actor(name)         → bundle especializado actor
  · WikipediaFetcher().fetch_municipio(name, ccaa) → bundle especializado terr

Se usa SOLO en pipelines de enriquecimiento backend. Nunca en UI.
"""
from __future__ import annotations

import json
import logging
import re
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

logger = logging.getLogger(__name__)

_WIKI_API = "https://es.wikipedia.org/w/api.php"
_WIKI_REST_SUMMARY = "https://es.wikipedia.org/api/rest_v1/page/summary/{title}"


@dataclass
class WikipediaArticle:
    """Resumen mínimo de un artículo de Wikipedia ES."""
    title: str
    url: str = ""
    summary: str = ""
    extract: str = ""               # primeros 5-10 párrafos planos
    infobox: dict[str, str] = field(default_factory=dict)
    image_url: str | None = None
    found: bool = False
    error: str | None = None


# ─────────────────────────────────────────────────────────────────
# Helpers HTTP minimalistas
# ─────────────────────────────────────────────────────────────────

def _http_get_json(url: str, *, timeout: float = 12.0) -> dict[str, Any] | None:
    """Devuelve JSON o None ante fallo. Sin levantar excepción."""
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "PoliteiaBrain/1.0 (https://politeia-visual-oscar.vercel.app)",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return data
    except Exception as exc:
        logger.debug("wikipedia _http_get_json fallo (%s): %s", url[:80], exc)
        return None


_STRIP_HTML_RE = re.compile(r"<[^>]+>")
_MULTISPACE_RE = re.compile(r"\s+")


def _strip_html(s: str) -> str:
    if not s:
        return ""
    return _MULTISPACE_RE.sub(" ", _STRIP_HTML_RE.sub(" ", s)).strip()


# ─────────────────────────────────────────────────────────────────
# Fetcher principal
# ─────────────────────────────────────────────────────────────────

class WikipediaFetcher:
    """Cliente liviano para Wikipedia ES. Caché en memoria + dedup."""

    _CACHE: dict[str, WikipediaArticle] = {}
    _LOCK = Lock()
    _CACHE_MAX = 500

    def __init__(self, *, timeout_s: float = 12.0) -> None:
        self.timeout_s = float(timeout_s)

    # ─────────────────────────────────────────────────────────────
    def _cache_get(self, key: str) -> WikipediaArticle | None:
        with self._LOCK:
            return self._CACHE.get(key)

    def _cache_set(self, key: str, art: WikipediaArticle) -> None:
        with self._LOCK:
            if len(self._CACHE) >= self._CACHE_MAX:
                # Eviction simple: borra el primero
                self._CACHE.pop(next(iter(self._CACHE)))
            self._CACHE[key] = art

    # ─────────────────────────────────────────────────────────────
    def fetch_summary(self, title: str) -> WikipediaArticle:
        """Resumen rápido (REST API)."""
        if not title:
            return WikipediaArticle(title="", error="empty title")
        key = f"summary::{title.lower()}"
        cached = self._cache_get(key)
        if cached is not None:
            return cached

        url = _WIKI_REST_SUMMARY.format(title=urllib.parse.quote(title))
        data = _http_get_json(url, timeout=self.timeout_s)
        art = WikipediaArticle(title=title)
        if not data:
            art.error = "rest_api_unavailable"
            self._cache_set(key, art)
            return art
        if data.get("type") == "disambiguation":
            art.error = "disambiguation"
        art.found = True
        art.url = (data.get("content_urls") or {}).get("desktop", {}).get("page", "") or ""
        art.summary = str(data.get("extract") or "")
        try:
            art.image_url = (data.get("thumbnail") or {}).get("source")
        except (AttributeError, TypeError):
            art.image_url = None
        self._cache_set(key, art)
        return art

    # ─────────────────────────────────────────────────────────────
    def fetch_extract(self, title: str, *, sentences: int = 30) -> WikipediaArticle:
        """Extracto plano más largo via api.php prop=extracts."""
        if not title:
            return WikipediaArticle(title="", error="empty title")
        key = f"extract::{title.lower()}::{sentences}"
        cached = self._cache_get(key)
        if cached is not None:
            return cached

        params = {
            "action": "query",
            "format": "json",
            "prop": "extracts",
            "titles": title,
            "explaintext": "1",
            "exsectionformat": "plain",
            "redirects": "1",
        }
        url = f"{_WIKI_API}?{urllib.parse.urlencode(params)}"
        data = _http_get_json(url, timeout=self.timeout_s)
        art = WikipediaArticle(title=title)
        if not data:
            art.error = "api_unavailable"
            self._cache_set(key, art)
            return art
        pages = (data.get("query") or {}).get("pages") or {}
        if not pages:
            art.error = "no pages"
            self._cache_set(key, art)
            return art
        page = next(iter(pages.values()))
        if "missing" in page:
            art.error = "not_found"
            self._cache_set(key, art)
            return art
        extract = str(page.get("extract") or "")
        if extract:
            # Tomamos hasta N párrafos
            paragraphs = [p.strip() for p in extract.split("\n") if p.strip()]
            art.extract = "\n\n".join(paragraphs[: max(1, int(sentences) // 3)])
            art.found = True
        art.url = f"https://es.wikipedia.org/wiki/{urllib.parse.quote(title)}"
        self._cache_set(key, art)
        return art

    # ─────────────────────────────────────────────────────────────
    def fetch_infobox(self, title: str) -> dict[str, str]:
        """Extrae infobox parseando el wikitexto crudo de la primera sección."""
        params = {
            "action": "parse",
            "format": "json",
            "page": title,
            "prop": "wikitext",
            "section": "0",
            "redirects": "1",
        }
        url = f"{_WIKI_API}?{urllib.parse.urlencode(params)}"
        data = _http_get_json(url, timeout=self.timeout_s)
        if not data:
            return {}
        wt = (data.get("parse") or {}).get("wikitext", {}).get("*", "")
        return self._parse_infobox(wt)

    @staticmethod
    def _parse_infobox(wikitext: str) -> dict[str, str]:
        """Parse mínimo de campos clave de un infobox MediaWiki."""
        if not wikitext or "{{Ficha" not in wikitext and "{{Infobox" not in wikitext:
            return {}
        out: dict[str, str] = {}
        # Tomamos solo el primer infobox
        try:
            start = wikitext.find("{{Ficha")
            if start < 0:
                start = wikitext.find("{{Infobox")
            # Buscamos fin del template (balance simple)
            depth = 0
            end = start
            for i, ch in enumerate(wikitext[start:], start=start):
                if ch == "{" and wikitext[i:i+2] == "{{":
                    depth += 1
                elif ch == "}" and wikitext[i:i+2] == "}}":
                    depth -= 1
                    if depth == 0:
                        end = i + 2
                        break
            block = wikitext[start:end]
        except Exception:
            return {}
        # Líneas tipo "| campo = valor"
        for line in block.split("\n"):
            line = line.strip()
            if not line.startswith("|") or "=" not in line:
                continue
            try:
                k, v = line[1:].split("=", 1)
                k = k.strip().lower()
                v = _strip_html(v.strip())
                # Limpieza extra de templates anidados {{Cita ...}}, {{Cite ...}}
                # iterativa por si hay anidados
                for _ in range(4):
                    v_new = re.sub(r"\{\{[^{}]*\}\}", "", v)
                    if v_new == v:
                        break
                    v = v_new
                # Limpieza de wikilinks
                v = re.sub(r"\[\[([^\|\]]+)\|([^\]]+)\]\]", r"\2", v)
                v = re.sub(r"\[\[([^\]]+)\]\]", r"\1", v)
                # Quitar referencias <ref>...</ref>
                v = re.sub(r"<ref[^>]*>.*?</ref>", "", v, flags=re.DOTALL)
                v = re.sub(r"<ref[^/]*/>", "", v)
                # Coletillas finales típicas
                v = re.sub(r"\s+", " ", v).strip(" ,;:-")
                if k and v:
                    out[k] = v[:500]
            except ValueError:
                continue
        return out

    # ─────────────────────────────────────────────────────────────
    # Bundles especializados
    # ─────────────────────────────────────────────────────────────

    def fetch_actor(self, name: str) -> dict[str, Any]:
        """Bundle completo para un actor político: summary + extract + infobox."""
        summary_art = self.fetch_summary(name)
        if not summary_art.found:
            # Probamos sin tildes (Wikipedia ES suele redirigir)
            from agents.brain.pipelines.entity_resolver import _strip_accents
            alt = _strip_accents(name)
            if alt != name:
                summary_art = self.fetch_summary(alt)
        extract_art = self.fetch_extract(name, sentences=15)
        infobox = self.fetch_infobox(name)
        return {
            "found": summary_art.found or extract_art.found,
            "name": name,
            "url": summary_art.url or extract_art.url,
            "summary": summary_art.summary,
            "extract": extract_art.extract,
            "infobox": infobox,
            "image_url": summary_art.image_url,
            # Campos derivados del infobox (mejor esfuerzo)
            "birth_date": (
                infobox.get("fecha de nacimiento")
                or infobox.get("nacimiento")
                or infobox.get("nacimiento_fecha")
                or ""
            ),
            "birth_place": (
                infobox.get("lugar de nacimiento")
                or infobox.get("nacimiento_lugar")
                or ""
            ),
            "party": (
                infobox.get("partido")
                or infobox.get("partido_político")
                or infobox.get("filiación")
                or ""
            ),
            "office": (
                infobox.get("cargo")
                or infobox.get("ocupación")
                or ""
            ),
            "education": (
                infobox.get("alma_máter")
                or infobox.get("educación")
                or ""
            ),
        }

    def fetch_municipio(self, nombre: str, ccaa: str = "") -> dict[str, Any]:
        """Bundle para municipio: summary + extract + infobox demográfico."""
        # Probamos varias variantes de título
        candidates = [nombre]
        if ccaa:
            candidates.append(f"{nombre} ({ccaa})")
            candidates.append(f"{nombre}, {ccaa}")
        first_ok = None
        for cand in candidates:
            summary = self.fetch_summary(cand)
            if summary.found:
                first_ok = (cand, summary)
                break
        if first_ok is None:
            return {"found": False, "name": nombre, "error": "no encontrado"}
        cand, summary = first_ok
        extract = self.fetch_extract(cand, sentences=20)
        infobox = self.fetch_infobox(cand)
        # Campos clave para municipios españoles
        return {
            "found": True,
            "name": cand,
            "url": summary.url,
            "summary": summary.summary,
            "extract": extract.extract,
            "infobox": infobox,
            "image_url": summary.image_url,
            "poblacion":   infobox.get("población") or infobox.get("habitantes") or "",
            "superficie":  infobox.get("superficie") or "",
            "altitud":     infobox.get("altitud") or "",
            "comarca":     infobox.get("comarca") or "",
            "provincia":   infobox.get("provincia") or "",
            "ccaa":        infobox.get("comunidad") or ccaa or "",
            "gentilicio":  infobox.get("gentilicio") or "",
            "alcalde":     infobox.get("alcalde") or "",
            "partido_alcalde": infobox.get("partido") or "",
            "fiestas":     infobox.get("fiestas") or "",
        }

    def fetch_ccaa(self, nombre: str) -> dict[str, Any]:
        """Bundle para CCAA: similar a municipio."""
        summary = self.fetch_summary(nombre)
        extract = self.fetch_extract(nombre, sentences=25)
        infobox = self.fetch_infobox(nombre)
        return {
            "found": summary.found or extract.found,
            "name": nombre,
            "url": summary.url or extract.url,
            "summary": summary.summary,
            "extract": extract.extract,
            "infobox": infobox,
            "poblacion":   infobox.get("población") or "",
            "superficie":  infobox.get("superficie") or "",
            "capital":     infobox.get("capital") or "",
            "presidente":  infobox.get("presidente") or "",
            "idiomas":     infobox.get("idiomas") or infobox.get("lenguas") or "",
            "pib_per_capita": infobox.get("pib per cápita") or "",
        }


# ─────────────────────────────────────────────────────────────────
# Singleton accessor
# ─────────────────────────────────────────────────────────────────

_WIKI_FETCHER: WikipediaFetcher | None = None


def get_wikipedia_fetcher() -> WikipediaFetcher:
    global _WIKI_FETCHER
    if _WIKI_FETCHER is None:
        _WIKI_FETCHER = WikipediaFetcher()
    return _WIKI_FETCHER
