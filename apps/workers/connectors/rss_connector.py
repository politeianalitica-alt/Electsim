"""
Block 1 — Conector RSS/Atom genérico con análisis LLM local (Ollama).

Pipeline por artículo:
  RSS feed → extracción texto completo (trafilatura) →
  deduplicación SHA256 → Ollama (clasificación + NER + sentiment + resumen + geo) →
  nomic-embed-text (vector 768d) → PostgreSQL
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

import feedparser
import httpx

from observability.logging import get_logger

log = get_logger(__name__)

# ── Ollama ─────────────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL    = "llama3.2:3b"    # override vía env OLLAMA_MODEL
EMBED_MODEL     = "nomic-embed-text"

ANALYSIS_PROMPT = """\
Eres un analista senior de inteligencia política y geopolítica hispano.
Analiza el siguiente artículo y devuelve ÚNICAMENTE un JSON válido:

{{
  "temas": ["politica","economia","defensa","social","internacional","judicial","salud","tecnologia","energia","medioambiente"],
  "entidades": {{
    "personas":       ["nombre1"],
    "organizaciones": ["org1"],
    "lugares":        ["lugar1"]
  }},
  "sentiment": 0.0,
  "resumen": "...",
  "relevancia_cliente": 7,
  "geo_evento": {{
    "lugar": "Madrid, España",
    "lat": 40.41,
    "lon": -3.70
  }}
}}

Restricciones:
- temas: lista de 1–4 etiquetas del vocabulario arriba.
- sentiment: float −1.0 (muy negativo) a +1.0 (muy positivo).
- resumen: máximo 3 frases. Neutro y factual.
- relevancia_cliente: 0–10 (política española/europea = alta).
- geo_evento: lugar principal del evento, no de la redacción.

TÍTULO: {titulo}
TEXTO (primeros 1500 chars): {texto}
"""


async def _fetch_full_text(url: str, fallback: str) -> str:
    """Intenta extraer texto completo con trafilatura; usa fallback si falla."""
    try:
        import importlib.util
        if importlib.util.find_spec("trafilatura"):
            from trafilatura import extract
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url)
                text = extract(resp.text, include_comments=False, include_tables=False)
                if text and len(text) > 200:
                    return text[:4000]
    except Exception as e:
        log.debug(f"trafilatura error ({url}): {e}")
    return (fallback or "")[:4000]


async def _ollama_analyze(titulo: str, texto: str) -> dict[str, Any]:
    """Llama a Ollama para análisis completo. Retorna dict vacío en caso de error."""
    prompt = ANALYSIS_PROMPT.format(titulo=titulo, texto=texto[:1500])
    try:
        async with httpx.AsyncClient(timeout=60, base_url=OLLAMA_BASE_URL) as client:
            resp = await client.post("/api/generate", json={
                "model":  OLLAMA_MODEL,
                "prompt": prompt,
                "format": "json",
                "stream": False,
            })
            raw = resp.json().get("response", "{}")
            return json.loads(raw)
    except Exception as e:
        log.warning(f"Ollama analysis error: {e}")
        return {
            "temas":              [],
            "entidades":          {"personas": [], "organizaciones": [], "lugares": []},
            "sentiment":          0.0,
            "resumen":            "",
            "relevancia_cliente": 0,
            "geo_evento":         {"lugar": "", "lat": None, "lon": None},
        }


async def _ollama_embed(text: str) -> list[float]:
    """Genera embedding 768d con nomic-embed-text."""
    try:
        async with httpx.AsyncClient(timeout=30, base_url=OLLAMA_BASE_URL) as client:
            resp = await client.post("/api/embeddings", json={
                "model": EMBED_MODEL,
                "prompt": text[:512],
            })
            return resp.json().get("embedding", [])
    except Exception as e:
        log.warning(f"Ollama embed error: {e}")
        return []


async def fetch_rss_feed(source: dict) -> list[dict]:
    """
    Parsea un feed RSS/Atom y retorna lista de artículos crudos
    (sin análisis LLM todavía).
    """
    rss_url = source.get("rss")
    if not rss_url:
        return []

    try:
        feed = feedparser.parse(rss_url)
        articles: list[dict] = []

        for entry in feed.entries[:25]:
            url     = entry.get("link", "")
            titulo  = entry.get("title", "").strip()
            summary = entry.get("summary", entry.get("description", ""))

            if not url or not titulo:
                continue

            # Normalizar fecha
            published_raw = entry.get("published", entry.get("updated", ""))
            try:
                from email.utils import parsedate_to_datetime
                pub_dt = parsedate_to_datetime(published_raw)
                pub_str = pub_dt.isoformat()
            except Exception:
                pub_str = datetime.now(timezone.utc).isoformat()

            hash_id = hashlib.sha256(url.encode()).hexdigest()[:16]

            articles.append({
                "hash_id":      hash_id,
                "titulo":       titulo,
                "url":          url,
                "resumen_raw":  summary[:2000],
                "fuente":       source.get("name", ""),
                "fuente_url":   source.get("url", ""),
                "region":       source.get("region", ""),
                "pais":         source.get("country", ""),
                "lat_fuente":   source.get("lat"),
                "lon_fuente":   source.get("lon"),
                "familia":      source.get("familia", ""),
                "tier":         source.get("tier", 3),
                "categoria":    source.get("categoria", ""),
                "publicado_en": pub_str,
            })
        return articles
    except Exception as e:
        log.error(f"RSS parse error [{source.get('name')}] {rss_url}: {e}")
        return []


async def enrich_article(article: dict, *, skip_llm: bool = False) -> dict:
    """
    Enriquece un artículo crudo con:
    - Texto completo (trafilatura)
    - Análisis LLM (Ollama)
    - Embedding vectorial (nomic-embed-text)
    """
    # 1. Texto completo
    texto = await _fetch_full_text(article["url"], article["resumen_raw"])
    article["texto"] = texto

    if skip_llm:
        article["analisis"] = {}
        article["embedding"] = []
        return article

    # 2. Análisis LLM
    analysis = await _ollama_analyze(article["titulo"], texto)
    article["analisis"] = analysis

    # 3. Embedding
    embed_input = f"{article['titulo']}. {analysis.get('resumen', '')} {texto[:300]}"
    article["embedding"] = await _ollama_embed(embed_input)

    # 4. Fusionar coordenadas del evento
    geo = analysis.get("geo_evento", {})
    article["lat_evento"]    = geo.get("lat") or article.get("lat_fuente")
    article["lon_evento"]    = geo.get("lon") or article.get("lon_fuente")
    article["lugar_evento"]  = geo.get("lugar", "")

    return article


async def ingest_source(source: dict, *, skip_llm: bool = False) -> list[dict]:
    """
    Ingiere una fuente RSS completa: parsea + enriquece todos los artículos.
    Devuelve lista de artículos enriquecidos listos para persistir.
    """
    raw_articles = await fetch_rss_feed(source)
    enriched: list[dict] = []

    for art in raw_articles:
        try:
            enriched.append(await enrich_article(art, skip_llm=skip_llm))
        except Exception as e:
            log.warning(f"Error enriqueciendo artículo {art.get('url')}: {e}")

    log.info(f"[RSS] {source.get('name')}: {len(enriched)}/{len(raw_articles)} artículos procesados")
    return enriched


def build_article_record(article: dict) -> dict:
    """
    Convierte artículo enriquecido al formato de la tabla `article`
    (compatible con el modelo ORM existente).
    """
    analisis = article.get("analisis", {})
    entidades = analisis.get("entidades", {})

    return {
        "hash_id":            article.get("hash_id", ""),
        "titulo":             article.get("titulo", ""),
        "url":                article.get("url", ""),
        "texto":              article.get("texto", ""),
        "fuente":             article.get("fuente", ""),
        "fuente_url":         article.get("fuente_url", ""),
        "region":             article.get("region", ""),
        "pais":               article.get("pais", ""),
        "familia_fuente":     article.get("familia", ""),
        "tier_fuente":        article.get("tier", 3),
        "lat_fuente":         article.get("lat_fuente"),
        "lon_fuente":         article.get("lon_fuente"),
        "lat_evento":         article.get("lat_evento"),
        "lon_evento":         article.get("lon_evento"),
        "lugar_evento":       article.get("lugar_evento", ""),
        "temas":              analisis.get("temas", []),
        "entidades":          entidades,
        "sentiment":          float(analisis.get("sentiment", 0.0)),
        "resumen":            analisis.get("resumen", ""),
        "relevancia_cliente": int(analisis.get("relevancia_cliente", 0)),
        "embedding":          article.get("embedding", []),
        "publicado_en":       article.get("publicado_en"),
        "ingerido_en":        datetime.now(timezone.utc).isoformat(),
    }
