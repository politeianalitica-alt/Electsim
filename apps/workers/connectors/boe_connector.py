"""
Block 1/4 — Conector BOE, EUR-Lex y boletines autonómicos (CCAA).

Ingesta el sumario diario del BOE vía RSS oficial + la API REST del BOE,
y envía cada norma al pipeline LLM para análisis legislativo.
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timedelta, timezone
from typing import Any
from xml.etree import ElementTree as ET

import httpx

from observability.logging import get_logger

log = get_logger(__name__)

BOE_RSS_BASE   = "https://www.boe.es/rss/canal.php?c=sumario"
BOE_API_BASE   = "https://www.boe.es/diario_boe/xml.php"
EURLEX_SPARQL  = "https://publications.europa.eu/webapi/rdf/sparql"
OLLAMA_BASE    = "http://localhost:11434"
OLLAMA_MODEL   = "llama3.2:3b"

# ──────────────────────────────────────────────────────────────────────
# Prompt legislativo
# ──────────────────────────────────────────────────────────────────────
LEGISLATION_PROMPT = """\
Eres un jurista y analista de política pública español.
Analiza la siguiente norma legal y devuelve ÚNICAMENTE un JSON válido:

{{
  "resumen_ejecutivo": "...",
  "temas": ["politica","economia","defensa","social","regulacion","judicial","medioambiente","tecnologia","energia","salud"],
  "sectores_afectados": [
    {{"sector": "energia", "peso": 0.8, "descripcion": "..."}}
  ],
  "entidades_implicadas": {{
    "ministerios": ["Ministerio de Hacienda"],
    "empresas":    [],
    "personas":    []
  }},
  "score_impacto_economico":  7.0,
  "score_impacto_social":     5.0,
  "score_impacto_empresas":   6.0,
  "score_urgencia_cliente":   8.0
}}

Restricciones:
- resumen_ejecutivo: máximo 3 frases. Explica QUÉ cambia y POR QUÉ importa.
- temas: lista 1–3 etiquetas del vocabulario.
- sectores_afectados: 0–5 entradas. peso 0.0–1.0.
- scores: 0.0–10.0.

TÍTULO: {titulo}
TEXTO: {texto}
"""

# ──────────────────────────────────────────────────────────────────────
# BOLETINES AUTONÓMICOS
# ──────────────────────────────────────────────────────────────────────
CCAA_RSS: dict[str, str] = {
    "BOJA":  "https://www.juntadeandalucia.es/boja/rss/sumario",
    "DOGC":  "https://dogc.gencat.cat/ca/RSS/",
    "BOCM":  "https://www.bocm.es/bocm/portaltema/rss",
    "BORM":  "https://www.borm.es/services/anuncios/rss/rss.php",
    "DOE":   "https://doe.juntaex.es/rss/sumario.xml",
    "DOGA":  "https://www.xunta.gal/dog/Publicados/Anuncio.rss",
    "BON":   "https://www.boe.es/boe/boe_r.php?c=BONA",
}


# ──────────────────────────────────────────────────────────────────────
# Helpers LLM
# ──────────────────────────────────────────────────────────────────────
async def _analyze_legislation(titulo: str, texto: str) -> dict[str, Any]:
    prompt = LEGISLATION_PROMPT.format(titulo=titulo, texto=texto[:2500])
    try:
        async with httpx.AsyncClient(timeout=90, base_url=OLLAMA_BASE) as c:
            r = await c.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
            })
            return json.loads(r.json().get("response", "{}"))
    except Exception as e:
        log.warning(f"LLM legislation analysis error: {e}")
        return {
            "resumen_ejecutivo":        "",
            "temas":                    [],
            "sectores_afectados":       [],
            "entidades_implicadas":     {},
            "score_impacto_economico":  0.0,
            "score_impacto_social":     0.0,
            "score_impacto_empresas":   0.0,
            "score_urgencia_cliente":   0.0,
        }


# ──────────────────────────────────────────────────────────────────────
# BOE — Ingesta sumario diario
# ──────────────────────────────────────────────────────────────────────
async def fetch_boe_sumario(fecha: date | None = None) -> list[dict]:
    """
    Descarga el sumario del BOE para una fecha (por defecto, hoy).
    Retorna lista de entradas con metadatos básicos.
    """
    if fecha is None:
        fecha = date.today()

    fecha_str = fecha.strftime("%Y%m%d")
    url = f"{BOE_API_BASE}?id=BOE-S-{fecha_str}"

    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(url)
            if r.status_code != 200:
                log.warning(f"BOE API status {r.status_code} para {fecha_str}")
                return []

            root = ET.fromstring(r.text)
            items: list[dict] = []

            for item in root.iter("item"):
                titulo    = item.findtext("titulo", "").strip()
                url_item  = item.findtext("urlHtml", "") or item.findtext("urlPdf", "")
                numero    = item.findtext("numero", "")
                rango     = item.findtext("rango", "")
                dept      = item.findtext("departamento", "")
                epigraf   = item.findtext("epigrafe", "")
                texto_pdf = item.findtext("texto", "")[:3000] if item.findtext("texto") else ""

                if not titulo:
                    continue

                items.append({
                    "tipo":            _map_boe_rango(rango),
                    "titulo":          titulo,
                    "titulo_corto":    titulo[:120],
                    "numero_boe":      numero,
                    "fuente":          "BOE",
                    "url_fuente":      url_item,
                    "rango":           rango,
                    "departamento":    dept,
                    "ministerio":      dept,
                    "texto_completo":  texto_pdf,
                    "temas_raw":       [epigraf] if epigraf else [],
                    "fecha_publicacion": fecha.isoformat(),
                })
            log.info(f"BOE {fecha_str}: {len(items)} normas")
            return items

    except Exception as e:
        log.error(f"Error ingesta BOE {fecha}: {e}")
        return []


def _map_boe_rango(rango: str) -> str:
    rango_lower = rango.lower()
    if "ley orgánica" in rango_lower:
        return "ley_organica"
    if "ley" in rango_lower:
        return "ley"
    if "real decreto-ley" in rango_lower:
        return "real_decreto_ley"
    if "real decreto" in rango_lower:
        return "real_decreto"
    if "orden" in rango_lower:
        return "orden_ministerial"
    if "resolución" in rango_lower:
        return "resolucion"
    return "otro"


# ──────────────────────────────────────────────────────────────────────
# CCAA boletines
# ──────────────────────────────────────────────────────────────────────
async def fetch_ccaa_rss(ccaa_code: str) -> list[dict]:
    """
    Descarga el feed RSS de un boletín autonómico.
    """
    import feedparser

    rss_url = CCAA_RSS.get(ccaa_code)
    if not rss_url:
        log.warning(f"No hay RSS para {ccaa_code}")
        return []

    try:
        feed = feedparser.parse(rss_url)
        items: list[dict] = []
        for entry in feed.entries[:30]:
            titulo = entry.get("title", "").strip()
            link   = entry.get("link", "")
            if not titulo:
                continue
            items.append({
                "tipo":             "decreto_ccaa",
                "titulo":           titulo,
                "titulo_corto":     titulo[:120],
                "fuente":           f"CCAA_{ccaa_code}",
                "url_fuente":       link,
                "rango":            ccaa_code,
                "departamento":     "",
                "texto_completo":   entry.get("summary", "")[:2000],
                "temas_raw":        [],
                "fecha_publicacion": datetime.now(timezone.utc).date().isoformat(),
            })
        log.info(f"CCAA {ccaa_code}: {len(items)} entradas")
        return items
    except Exception as e:
        log.error(f"Error RSS CCAA {ccaa_code}: {e}")
        return []


# ──────────────────────────────────────────────────────────────────────
# EUR-Lex — Directivas y Reglamentos recientes
# ──────────────────────────────────────────────────────────────────────
EURLEX_RSS = "https://eur-lex.europa.eu/RSSPS/RS0007EN02.xml"


async def fetch_eurlex_recent(days: int = 7) -> list[dict]:
    """Descarga normas EUR-Lex recientes vía RSS."""
    import feedparser
    desde = (date.today() - timedelta(days=days)).isoformat()

    try:
        feed = feedparser.parse(EURLEX_RSS)
        items: list[dict] = []
        for entry in feed.entries[:50]:
            titulo = entry.get("title", "").strip()
            link   = entry.get("link", "")
            desc   = entry.get("summary", "")
            numero = _extract_eurlex_number(titulo)
            items.append({
                "tipo":              _map_eurlex_tipo(titulo),
                "titulo":            titulo,
                "titulo_corto":      titulo[:120],
                "numero_eur_lex":    numero,
                "fuente":            "EUR-LEX",
                "url_fuente":        link,
                "rango":             "acto_ue",
                "departamento":      "Unión Europea",
                "texto_completo":    desc[:2000],
                "temas_raw":         [],
                "fecha_publicacion": desde,
            })
        log.info(f"EUR-Lex: {len(items)} actos recientes")
        return items
    except Exception as e:
        log.error(f"Error EUR-Lex RSS: {e}")
        return []


def _extract_eurlex_number(titulo: str) -> str:
    m = re.search(r"(\d{4}/\d+/\w+|\(EU\)\s*\d+/\d+)", titulo)
    return m.group(0) if m else ""


def _map_eurlex_tipo(titulo: str) -> str:
    t = titulo.lower()
    if "directive" in t or "directiva" in t:
        return "directiva_ue"
    if "regulation" in t or "reglamento" in t:
        return "reglamento_ue"
    if "decision" in t or "decisión" in t:
        return "decision_ue"
    return "acto_ue"


# ──────────────────────────────────────────────────────────────────────
# Pipeline unificado: analiza + construye registro de BD
# ──────────────────────────────────────────────────────────────────────
async def enrich_legislation(doc: dict) -> dict:
    """Llama al LLM para analizar la norma y construye el registro completo."""
    analysis = await _analyze_legislation(
        doc.get("titulo", ""),
        doc.get("texto_completo", "")
    )

    return {
        **doc,
        "resumen_llm":              analysis.get("resumen_ejecutivo", ""),
        "resumen_ejecutivo":        analysis.get("resumen_ejecutivo", ""),
        "temas":                    analysis.get("temas", doc.get("temas_raw", [])),
        "sectores_afectados":       analysis.get("sectores_afectados", []),
        "entidades_implicadas":     analysis.get("entidades_implicadas", {}),
        "score_impacto_economico":  float(analysis.get("score_impacto_economico", 0.0)),
        "score_impacto_social":     float(analysis.get("score_impacto_social", 0.0)),
        "score_impacto_empresas":   float(analysis.get("score_impacto_empresas", 0.0)),
        "score_urgencia_cliente":   float(analysis.get("score_urgencia_cliente", 0.0)),
        "estado":                   "publicado",
    }


async def ingest_boe_today() -> list[dict]:
    """Ingesta BOE del día y enriquece con LLM."""
    docs = await fetch_boe_sumario()
    enriched = []
    for doc in docs:
        try:
            enriched.append(await enrich_legislation(doc))
        except Exception as e:
            log.warning(f"Error enriching BOE doc: {e}")
    return enriched


async def ingest_eurlex_recent(days: int = 7) -> list[dict]:
    """Ingesta EUR-Lex reciente y enriquece con LLM."""
    docs = await fetch_eurlex_recent(days)
    enriched = []
    for doc in docs:
        try:
            enriched.append(await enrich_legislation(doc))
        except Exception as e:
            log.warning(f"Error enriching EUR-Lex doc: {e}")
    return enriched


async def ingest_ccaa_all() -> list[dict]:
    """Ingesta todos los boletines autonómicos configurados."""
    enriched: list[dict] = []
    for code in CCAA_RSS:
        docs = await fetch_ccaa_rss(code)
        for doc in docs:
            try:
                enriched.append(await enrich_legislation(doc))
            except Exception as e:
                log.warning(f"Error enriching CCAA {code} doc: {e}")
    return enriched
