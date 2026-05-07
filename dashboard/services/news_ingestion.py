"""Pipeline de ingesta RSS + análisis Ollama para 350 fuentes internacionales.

Flujo:
  1. fetch_rss(source)       — descarga y parsea el feed RSS con feedparser
  2. analyze_with_ollama(article) — envía texto a Ollama (llama3.2) y obtiene JSON
  3. ingest_source(source)   — combina fetch + analyze y guarda en PostgreSQL
  4. ingest_all_sources()    — itera todas las fuentes (o una lista prioritaria)

Esquema DB: tabla `news_articles` con campos estándar + JSONB para análisis AI.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, Optional

import feedparser
import httpx
import psycopg
from psycopg.rows import dict_row

from etl.logger import get_logger
from dashboard.services.media_sources import ALL_SOURCES, PRIORITY_SOURCES

log = get_logger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
def _resolve_database_url() -> str:
    """Resuelve DATABASE_URL desde env var o (fallback) desde settings."""
    raw = os.getenv("DATABASE_URL")
    if raw:
        # Si trae driver SQLAlchemy (postgresql+psycopg://), psycopg necesita postgresql://
        return re.sub(r"postgresql\+\w+://", "postgresql://", raw)
    try:
        from config.settings import get_settings
        s = get_settings()
        return re.sub(r"postgresql\+\w+://", "postgresql://", s.database_url_raw)
    except Exception:
        return "postgresql://localhost/electsim"

DATABASE_URL = _resolve_database_url()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_TIMEOUT = int(os.getenv("OLLAMA_TIMEOUT", "45"))
MAX_CONTENT_CHARS = 2500   # truncamos para no exceder contexto
MAX_ARTICLES_PER_SOURCE = 15

_OLLAMA_MODEL_PRIORITY = ["politeia-brain:latest", "qwen2.5:7b", "llama3.2:3b"]


def _detect_ollama_model() -> str:
    """Auto-detect best available Ollama model from priority list."""
    import httpx as _httpx
    try:
        resp = _httpx.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=3)
        if resp.is_success:
            available = {m["name"] for m in resp.json().get("models", [])}
            for m in _OLLAMA_MODEL_PRIORITY:
                if m in available:
                    return m
    except Exception:
        pass
    return os.getenv("OLLAMA_MODEL", _OLLAMA_MODEL_PRIORITY[-1])


OLLAMA_MODEL = _detect_ollama_model()

# ── Esquema DB ───────────────────────────────────────────────────────────────
_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS news_articles (
    id                  SERIAL PRIMARY KEY,
    url_hash            VARCHAR(64) UNIQUE NOT NULL,
    title               TEXT NOT NULL,
    url                 TEXT NOT NULL,
    source_name         VARCHAR(255),
    source_region       VARCHAR(64),
    source_country      VARCHAR(64),
    source_lat          FLOAT,
    source_lon          FLOAT,
    published_at        TIMESTAMPTZ,
    scraped_at          TIMESTAMPTZ DEFAULT NOW(),
    content             TEXT,
    -- Campos AI (análisis exhaustivo)
    ai_summary          TEXT,
    ai_analysis         TEXT,
    ai_topics           TEXT[],
    ai_entities         JSONB,
    ai_sentiment        VARCHAR(32),
    ai_sentiment_target VARCHAR(64),
    ai_relevance        SMALLINT,
    ai_urgency          VARCHAR(16),
    ai_impact_areas     TEXT[],
    ai_region_trend     TEXT,
    ai_spain_impact     VARCHAR(16),
    ai_geo_location     TEXT,
    ai_geo_lat          FLOAT,
    ai_geo_lon          FLOAT,
    ai_language         VARCHAR(16),
    ai_category         VARCHAR(64),
    ai_raw              JSONB
);

CREATE INDEX IF NOT EXISTS idx_news_articles_scraped_at  ON news_articles(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_region      ON news_articles(source_region);
CREATE INDEX IF NOT EXISTS idx_news_articles_sentiment   ON news_articles(ai_sentiment);
CREATE INDEX IF NOT EXISTS idx_news_articles_relevance   ON news_articles(ai_relevance DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_country     ON news_articles(source_country);
CREATE INDEX IF NOT EXISTS idx_news_articles_geo         ON news_articles(ai_geo_lat, ai_geo_lon);
CREATE INDEX IF NOT EXISTS idx_news_articles_spain       ON news_articles(ai_spain_impact);
"""

# ── Prompt Ollama ─────────────────────────────────────────────────────────────
# Exhaustive analysis: only assign relevance >= 7 to genuinely important events
_ANALYSIS_PROMPT_TMPL = """Eres un analista de inteligencia política senior. Analiza rigurosamente la siguiente noticia.
Responde SOLO con JSON válido, sin markdown ni texto adicional.

CRITERIOS DE RELEVANCIA (ai_relevance, escala 1-10):
- 9-10: acontecimiento histórico, crisis aguda, decisión geopolítica de primer orden con impacto global
- 7-8: decisión política significativa, movimiento electoral relevante, hecho económico de primer plano
- 5-6: desarrollo político normal, declaración institucional, hecho regional con repercusión nacional
- 3-4: agenda rutinaria, declaración sin impacto, noticia de interés local
- 1-2: contenido de relleno, entretenimiento, noticia sin consecuencias

FUENTE: {source_name} ({source_country})
TITULO: {title}
TEXTO: {content}

RESPONDE EXCLUSIVAMENTE CON ESTE JSON:
{{
  "ai_summary": "Resumen ejecutivo en español de 3-4 frases con los hechos esenciales, actores y consecuencias",
  "ai_analysis": "Análisis estratégico: implicaciones para España, balance de poder afectado, riesgos a vigilar",
  "ai_topics": ["tema_especifico_1","tema_especifico_2","tema_especifico_3"],
  "ai_entities": {{
    "personas": ["Nombre Apellido (cargo)"],
    "lugares": ["Ciudad, País"],
    "organizaciones": ["Nombre organización (tipo)"],
    "instrumentos_legales": ["ley, decreto o acuerdo relevante"]
  }},
  "ai_sentiment": "positivo|negativo|neutro|mixto",
  "ai_sentiment_target": "gobierno|oposicion|mercados|sociedad|ninguno",
  "ai_relevance": 5,
  "ai_urgency": "inmediata|24h|semana|mes|baja",
  "ai_impact_areas": ["area_afectada_1","area_afectada_2"],
  "ai_region_trend": "Contexto geopolítico: tendencia regional y factores estructurales subyacentes",
  "ai_spain_impact": "Impacto directo o indirecto en España: ninguno|bajo|medio|alto|critico",
  "ai_geo_location": "pais_o_region_exacta_del_evento",
  "ai_geo_lat": 40.4,
  "ai_geo_lon": -3.7,
  "ai_language": "es|en|fr|de|pt|ar|zh|ja|ko|other",
  "ai_category": "politica_interior|politica_exterior|economia|seguridad_defensa|justicia|sociedad|tecnologia|medioambiente|energia|salud|otro"
}}"""

# ── DB helpers ────────────────────────────────────────────────────────────────
def _get_conn():
    return psycopg.connect(DATABASE_URL)


def init_db() -> None:
    """Crea la tabla si no existe."""
    try:
        conn = _get_conn()
        with conn:
            conn.execute(_CREATE_TABLE_SQL)
        conn.close()
        log.info("news_articles table ready")
    except Exception as exc:
        log.error(f"init_db error: {exc}")


def _url_hash(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:64]


def _article_exists(cur, url_hash: str) -> bool:
    cur.execute("SELECT 1 FROM news_articles WHERE url_hash=%s", (url_hash,))
    return cur.fetchone() is not None  # psycopg v3 compatible


# ── RSS fetch ─────────────────────────────────────────────────────────────────
def _parse_date(entry: feedparser.FeedParserDict) -> Optional[datetime]:
    for field in ("published_parsed", "updated_parsed", "created_parsed"):
        t = getattr(entry, field, None)
        if t:
            try:
                import calendar
                ts = calendar.timegm(t)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            except Exception:
                pass
    return datetime.now(tz=timezone.utc)


def _clean_html(text: str) -> str:
    """Elimina tags HTML básicos."""
    return re.sub(r"<[^>]+>", " ", text or "").strip()


def fetch_rss(source: dict) -> list[dict]:
    """Descarga y parsea el feed RSS de una fuente. Devuelve lista de artículos normalizados."""
    articles: list[dict] = []
    rss_url = source.get("rss", "")
    if not rss_url:
        return articles

    try:
        feed = feedparser.parse(rss_url, request_headers={"User-Agent": "ElectSim-Bot/2.0"})
        if feed.bozo and not feed.entries:
            log.warning(f"RSS bozo for {source['name']}: {feed.bozo_exception}")
            return articles

        for entry in feed.entries[:MAX_ARTICLES_PER_SOURCE]:
            url = getattr(entry, "link", "") or getattr(entry, "id", "")
            if not url:
                continue

            title = _clean_html(getattr(entry, "title", ""))
            summary = _clean_html(getattr(entry, "summary", "") or getattr(entry, "description", ""))
            content_list = getattr(entry, "content", [])
            content_val = content_list[0].get("value", "") if content_list else ""
            content = _clean_html(content_val) or summary

            articles.append({
                "url": url,
                "url_hash": _url_hash(url),
                "title": title,
                "content": content[:MAX_CONTENT_CHARS],
                "published_at": _parse_date(entry),
                "source_name": source["name"],
                "source_region": source["region"],
                "source_country": source["country"],
                "source_lat": source.get("lat"),
                "source_lon": source.get("lon"),
            })

    except Exception as exc:
        log.error(f"fetch_rss error [{source['name']}]: {exc}")

    return articles


# ── Ollama analysis ───────────────────────────────────────────────────────────
def analyze_with_ollama(article: dict) -> dict:
    """Envía el artículo a Ollama y devuelve el dict de análisis AI.
    Si falla devuelve valores por defecto para no bloquear la ingesta.
    """
    prompt = _ANALYSIS_PROMPT_TMPL.format(
        source_name=article.get("source_name", ""),
        source_country=article.get("source_country", ""),
        title=article.get("title", "")[:300],
        content=(article.get("content", "") or "")[:MAX_CONTENT_CHARS],
    )

    default = {
        "ai_summary": None,
        "ai_analysis": None,
        "ai_topics": [],
        "ai_entities": {"personas": [], "lugares": [], "organizaciones": [], "instrumentos_legales": []},
        "ai_sentiment": "neutro",
        "ai_sentiment_target": "ninguno",
        "ai_relevance": 5,
        "ai_urgency": "baja",
        "ai_impact_areas": [],
        "ai_region_trend": None,
        "ai_spain_impact": "bajo",
        "ai_geo_location": article.get("source_country"),
        "ai_geo_lat": article.get("source_lat"),
        "ai_geo_lon": article.get("source_lon"),
        "ai_language": "other",
        "ai_category": "otro",
        "ai_raw": None,
    }

    try:
        resp = httpx.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.1, "num_predict": 512},
            },
            timeout=OLLAMA_TIMEOUT,
        )
        resp.raise_for_status()
        raw_text: str = resp.json().get("response", "")

        # Extraer JSON del response (puede venir con ```json ... ```)
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if not json_match:
            log.warning(f"Ollama no devolvió JSON para '{article['title'][:60]}'")
            return default

        parsed: dict = json.loads(json_match.group())
        default.update({
            "ai_summary":         parsed.get("ai_summary"),
            "ai_analysis":        parsed.get("ai_analysis"),
            "ai_topics":          parsed.get("ai_topics", [])[:10],
            "ai_entities":        parsed.get("ai_entities", default["ai_entities"]),
            "ai_sentiment":       parsed.get("ai_sentiment", "neutro"),
            "ai_sentiment_target":parsed.get("ai_sentiment_target", "ninguno"),
            "ai_relevance":       min(10, max(1, int(parsed.get("ai_relevance", 5)))),
            "ai_urgency":         parsed.get("ai_urgency", "baja"),
            "ai_impact_areas":    parsed.get("ai_impact_areas", [])[:6],
            "ai_region_trend":    parsed.get("ai_region_trend"),
            "ai_spain_impact":    parsed.get("ai_spain_impact", "bajo"),
            "ai_geo_location":    parsed.get("ai_geo_location"),
            "ai_geo_lat":         _safe_float(parsed.get("ai_geo_lat"), article.get("source_lat")),
            "ai_geo_lon":         _safe_float(parsed.get("ai_geo_lon"), article.get("source_lon")),
            "ai_language":        parsed.get("ai_language", "other"),
            "ai_category":        parsed.get("ai_category", "otro"),
            "ai_raw":             parsed,
        })

    except httpx.ConnectError:
        log.warning("Ollama no disponible — ingesta sin análisis AI")
    except Exception as exc:
        log.error(f"analyze_with_ollama error: {exc}")

    return default


# ── Insert ─────────────────────────────────────────────────────────────────────
_INSERT_SQL = """
INSERT INTO news_articles (
    url_hash, title, url, source_name, source_region, source_country,
    source_lat, source_lon, published_at, content,
    ai_summary, ai_analysis, ai_topics, ai_entities,
    ai_sentiment, ai_sentiment_target, ai_relevance, ai_urgency,
    ai_impact_areas, ai_region_trend, ai_spain_impact,
    ai_geo_location, ai_geo_lat, ai_geo_lon,
    ai_language, ai_category, ai_raw
) VALUES (
    %(url_hash)s, %(title)s, %(url)s, %(source_name)s, %(source_region)s, %(source_country)s,
    %(source_lat)s, %(source_lon)s, %(published_at)s, %(content)s,
    %(ai_summary)s, %(ai_analysis)s, %(ai_topics)s, %(ai_entities)s,
    %(ai_sentiment)s, %(ai_sentiment_target)s, %(ai_relevance)s, %(ai_urgency)s,
    %(ai_impact_areas)s, %(ai_region_trend)s, %(ai_spain_impact)s,
    %(ai_geo_location)s, %(ai_geo_lat)s, %(ai_geo_lon)s,
    %(ai_language)s, %(ai_category)s, %(ai_raw)s
) ON CONFLICT (url_hash) DO NOTHING
"""


def _safe_float(val, fallback=None):
    """Convert to float safely, returning fallback on failure."""
    try:
        return float(val)
    except (TypeError, ValueError):
        return fallback


def _insert_article(cur, article: dict, ai: dict) -> bool:
    row = {**article, **ai}
    # Serializar JSONB
    row["ai_entities"] = json.dumps(ai.get("ai_entities", {}))
    row["ai_raw"] = json.dumps(ai.get("ai_raw")) if ai.get("ai_raw") else None
    cur.execute(_INSERT_SQL, row)
    return cur.rowcount > 0


# ── Ingesta por fuente ────────────────────────────────────────────────────────
def ingest_source(source: dict, use_ollama: bool = True) -> dict[str, int]:
    """Descarga RSS, analiza con Ollama y persiste. Devuelve estadísticas."""
    stats = {"fetched": 0, "inserted": 0, "skipped": 0, "errors": 0}

    articles = fetch_rss(source)
    stats["fetched"] = len(articles)
    if not articles:
        return stats

    try:
        with _get_conn() as conn:
            with conn.cursor() as cur:
                for art in articles:
                    try:
                        if _article_exists(cur, art["url_hash"]):
                            stats["skipped"] += 1
                            continue

                        ai = analyze_with_ollama(art) if use_ollama else {}
                        inserted = _insert_article(cur, art, ai)
                        if inserted:
                            stats["inserted"] += 1
                    except Exception as exc:
                        log.error(f"Article insert error: {exc}")
                        stats["errors"] += 1
    except Exception as exc:
        log.error(f"ingest_source DB error [{source['name']}]: {exc}")
        stats["errors"] += 1

    log.info(
        f"[{source['name']}] fetched={stats['fetched']} "
        f"inserted={stats['inserted']} skipped={stats['skipped']}"
    )
    return stats


# ── Ingesta masiva ────────────────────────────────────────────────────────────
def ingest_all_sources(
    sources: list[dict] | None = None,
    use_ollama: bool = True,
    delay_between_sources: float = 0.5,
) -> dict[str, int]:
    """Itera todas las fuentes (o las indicadas) y agrega estadísticas."""
    targets = sources or ALL_SOURCES
    total = {"fetched": 0, "inserted": 0, "skipped": 0, "errors": 0}

    log.info(f"Starting ingestion of {len(targets)} sources (ollama={use_ollama})")
    for i, source in enumerate(targets, 1):
        try:
            stats = ingest_source(source, use_ollama=use_ollama)
            for k in total:
                total[k] += stats.get(k, 0)
        except Exception as exc:
            log.error(f"Source {source['name']} failed: {exc}")
            total["errors"] += 1

        if delay_between_sources and i < len(targets):
            time.sleep(delay_between_sources)

    log.info(f"Ingestion complete: {total}")
    return total


def ingest_priority(use_ollama: bool = True) -> dict[str, int]:
    """Ingesta rápida de fuentes prioritarias (España + Europa, ~150 fuentes)."""
    return ingest_all_sources(sources=PRIORITY_SOURCES, use_ollama=use_ollama, delay_between_sources=0.3)


# ── Query helpers para el dashboard ──────────────────────────────────────────
def get_recent_articles(
    limit: int = 100,
    region: str | None = None,
    category: str | None = None,
    min_relevance: int = 1,
    hours_back: int = 24,
) -> list[dict]:
    """Obtiene artículos recientes con filtros para el dashboard."""
    filters = ["scraped_at > NOW() - (%s || ' hours')::interval", "ai_relevance >= %s"]
    params: list[Any] = [str(hours_back), min_relevance]

    if region:
        filters.append("source_region = %s")
        params.append(region)
    if category:
        filters.append("ai_category = %s")
        params.append(category)

    where = " AND ".join(filters)
    sql = f"""
        SELECT
            id, title, url, source_name, source_region, source_country,
            source_lat, source_lon, published_at, scraped_at,
            ai_summary, ai_analysis, ai_topics, ai_sentiment, ai_sentiment_target,
            ai_relevance, ai_urgency, ai_impact_areas, ai_spain_impact,
            ai_geo_location, ai_geo_lat, ai_geo_lon, ai_category, ai_language
        FROM news_articles
        WHERE {where}
        ORDER BY ai_relevance DESC, scraped_at DESC
        LIMIT %s
    """
    params.append(limit)

    try:
        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                rows = list(cur.fetchall())
        return rows
    except Exception as exc:
        log.error(f"get_recent_articles error: {exc}")
        return []


def get_sentiment_by_region(hours_back: int = 24) -> list[dict]:
    """Agrega sentimiento por región para el KPI del mapa."""
    sql = """
        SELECT
            source_region,
            ai_sentiment,
            COUNT(*) as cnt
        FROM news_articles
        WHERE scraped_at > NOW() - (%s || ' hours')::interval
          AND ai_sentiment IS NOT NULL
        GROUP BY source_region, ai_sentiment
        ORDER BY source_region, cnt DESC
    """
    try:
        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, [str(hours_back)])
                rows = list(cur.fetchall())
        return rows
    except Exception as exc:
        log.error(f"get_sentiment_by_region error: {exc}")
        return []


def get_top_topics(hours_back: int = 24, limit: int = 20) -> list[dict]:
    """Devuelve los temas más frecuentes en el período."""
    sql = """
        SELECT
            unnest(ai_topics) as topic,
            COUNT(*) as cnt
        FROM news_articles
        WHERE scraped_at > NOW() - (%s || ' hours')::interval
          AND ai_topics IS NOT NULL
        GROUP BY topic
        ORDER BY cnt DESC
        LIMIT %s
    """
    try:
        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, [str(hours_back), limit])
                rows = list(cur.fetchall())
        return rows
    except Exception as exc:
        log.error(f"get_top_topics error: {exc}")
        return []


def get_ingestion_stats() -> dict:
    """Estadísticas de la última ingesta para el panel de control."""
    sql = """
        SELECT
            COUNT(*)                                           AS total_articles,
            COUNT(*) FILTER (WHERE scraped_at > NOW() - INTERVAL '1 hour')  AS last_hour,
            COUNT(*) FILTER (WHERE scraped_at > NOW() - INTERVAL '24 hours') AS last_24h,
            COUNT(DISTINCT source_name)                        AS sources_active,
            COUNT(DISTINCT source_region)                      AS regions_active,
            AVG(ai_relevance)::NUMERIC(4,1)                    AS avg_relevance,
            MAX(scraped_at)                                    AS last_scraped
        FROM news_articles
    """
    try:
        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql)
                row = cur.fetchone()
        return dict(row) if row else {}
    except Exception as exc:
        log.error(f"get_ingestion_stats error: {exc}")
        return {}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="ElectSim news ingestion")
    parser.add_argument("--init-db", action="store_true", help="Create DB tables")
    parser.add_argument("--priority", action="store_true", help="Ingest priority sources only")
    parser.add_argument("--all", action="store_true", help="Ingest all 350 sources")
    parser.add_argument("--no-ollama", action="store_true", help="Skip Ollama analysis")
    args = parser.parse_args()

    if args.init_db:
        init_db()
    if args.priority:
        ingest_priority(use_ollama=not args.no_ollama)
    elif args.all:
        ingest_all_sources(use_ollama=not args.no_ollama)
