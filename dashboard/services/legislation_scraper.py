"""
Legislation Scraper — Politeia Intelligence Platform
======================================================
Multi-level legislative intelligence scraper covering:
  - European Union: EUR-Lex SPARQL + Europarl Open Data API
  - National (Spain): BOE official API + Congreso de los Diputados
  - Regional (17 CCAA): Official gazettes via RSS + parliamentary portals

Uses psycopg v3, Ollama (llama3.2) for AI enrichment, APScheduler for automation.
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import time
from datetime import date, datetime, timedelta, timezone
from typing import Any
from urllib.parse import urljoin

import psycopg
from psycopg.rows import dict_row

log = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/electsim")
OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
MIN_RELEVANCE = int(os.getenv("LEGISLATION_MIN_RELEVANCE", "6"))

# EUR-Lex endpoints
EURLEX_SPARQL = "https://publications.europa.eu/webapi/rdf/sparql"

# BOE API
BOE_API_BASE = "https://www.boe.es/datosabiertos/api"

# Regional gazettes: 17 CCAA → RSS feed
REGIONAL_SOURCES: dict[str, dict] = {
    "Andalucia": {
        "gazette": "BOJA",
        "rss": "https://www.juntadeandalucia.es/boja/boletines/rss/boja_rss.xml",
        "url": "https://www.juntadeandalucia.es/boja/",
    },
    "Aragon": {
        "gazette": "BOA",
        "rss": "https://www.boa.aragon.es/cgi-bin/EBOA/BRSCGI?CMD=VERLST&BASE=BOLE&DOCS=1-10&SEC=RSS",
        "url": "https://www.boa.aragon.es/",
    },
    "Asturias": {
        "gazette": "BOPA",
        "rss": "https://sede.asturias.es/bopa/rss",
        "url": "https://sede.asturias.es/bopa",
    },
    "Baleares": {
        "gazette": "BOIB",
        "rss": "https://www.caib.es/govern/rss/caib/ca/butlleti.rss",
        "url": "https://www.caib.es/govern/publiboib.ca.html",
    },
    "Canarias": {
        "gazette": "BOC",
        "rss": "https://www.gobiernodecanarias.org/boc/rss/ultimos.xml",
        "url": "https://www.gobiernodecanarias.org/boc/",
    },
    "Cantabria": {
        "gazette": "BOC",
        "rss": "https://boc.cantabria.es/boces/rss",
        "url": "https://boc.cantabria.es/",
    },
    "Castilla-La Mancha": {
        "gazette": "DOCM",
        "rss": "https://docm.castillalamancha.es/portaldocm/rss.do",
        "url": "https://docm.castillalamancha.es/",
    },
    "Castilla y Leon": {
        "gazette": "BOCYL",
        "rss": "https://bocyl.jcyl.es/rss/bocyl_rss.xml",
        "url": "https://bocyl.jcyl.es/",
    },
    "Cataluna": {
        "gazette": "DOGC",
        "rss": "https://dogc.gencat.cat/ca/pdogc_canals_interns/pdogc_rss/",
        "url": "https://dogc.gencat.cat/",
    },
    "Extremadura": {
        "gazette": "DOE",
        "rss": "https://doe.juntaex.es/pdfs/doe/rss.xml",
        "url": "https://doe.juntaex.es/",
    },
    "Galicia": {
        "gazette": "DOGA",
        "rss": "https://www.xunta.gal/diario-oficial-galicia/rss/doga.rss",
        "url": "https://www.xunta.gal/diario-oficial-galicia/",
    },
    "La Rioja": {
        "gazette": "BOR",
        "rss": "https://www.larioja.org/bor/es/rss",
        "url": "https://www.larioja.org/bor/",
    },
    "Madrid": {
        "gazette": "BOCM",
        "rss": "https://www.comunidad.madrid/servicios/administracion/boletin-oficial-comunidad-madrid/rss",
        "url": "https://www.bocm.es/",
    },
    "Murcia": {
        "gazette": "BORM",
        "rss": "https://www.borm.es/borm/vista/mailing/rss.jsf",
        "url": "https://www.borm.es/",
    },
    "Navarra": {
        "gazette": "BON",
        "rss": "https://bon.navarra.es/eu/rss/",
        "url": "https://bon.navarra.es/",
    },
    "Pais Vasco": {
        "gazette": "BOPV",
        "rss": "https://www.euskadi.eus/contenidos/informacion/bopv_servicio_rss/es_bopv/rss_bopv.xml",
        "url": "https://www.euskadi.eus/bopv2/",
    },
    "Valencia": {
        "gazette": "DOGV",
        "rss": "https://dogv.gva.es/portal/ficha_disposicion.jsp?rss=1",
        "url": "https://dogv.gva.es/",
    },
}

# BOE section labels
BOE_SECTIONS = {
    "I": "Disposiciones Generales",
    "II": "Autoridades y Personal",
    "III": "Otras Disposiciones",
}

# Document type inference rules (title prefix → canonical type)
_DOC_TYPE_RULES: list[tuple[str, str]] = [
    ("ley organica", "Ley Organica"),
    ("ley", "Ley"),
    ("real decreto-ley", "Real Decreto-ley"),
    ("real decreto legislativo", "Real Decreto Legislativo"),
    ("real decreto", "Real Decreto"),
    ("orden ministerial", "Orden Ministerial"),
    ("orden", "Orden"),
    ("resolucion", "Resolucion"),
    ("instruccion", "Instruccion"),
    ("circular", "Circular"),
    ("acuerdo", "Acuerdo"),
    ("reglamento ue", "Reglamento UE"),
    ("directiva", "Directiva UE"),
    ("decision ue", "Decision UE"),
    ("recomendacion", "Recomendacion UE"),
    ("propuesta com", "Propuesta COM"),
    ("ley autonomica", "Ley Autonomica"),
    ("decreto-ley", "Decreto-Ley Autonomico"),
    ("decreto", "Decreto Autonomico"),
]

# ─── Database schema ──────────────────────────────────────────────────────────
_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS legislation (
    id                   SERIAL PRIMARY KEY,
    hash                 VARCHAR(64) UNIQUE NOT NULL,
    title                TEXT NOT NULL,
    reference_id         VARCHAR(256),
    url                  TEXT,
    pdf_url              TEXT,
    level                VARCHAR(20)  DEFAULT 'national',
    region               VARCHAR(100) DEFAULT 'Espana',
    doc_type             VARCHAR(80),
    section              VARCHAR(20),
    department           TEXT,
    status               VARCHAR(30)  DEFAULT 'published',
    summary              TEXT,
    full_text            TEXT,
    published_at         TIMESTAMPTZ,
    effective_date       TIMESTAMPTZ,
    fetched_at           TIMESTAMPTZ  DEFAULT NOW(),
    ai_summary           TEXT,
    ai_topics            JSONB        DEFAULT '[]',
    ai_sectors           JSONB        DEFAULT '[]',
    ai_impact_level      VARCHAR(20),
    ai_relevance         SMALLINT,
    ai_keywords          JSONB        DEFAULT '[]',
    ai_entities          JSONB        DEFAULT '{}',
    ai_obligations       TEXT,
    ai_deadlines         JSONB        DEFAULT '[]',
    ai_affected_regions  JSONB        DEFAULT '[]',
    ai_eu_relation       TEXT,
    ai_category          VARCHAR(60)
);
CREATE INDEX IF NOT EXISTS idx_leg_level     ON legislation(level);
CREATE INDEX IF NOT EXISTS idx_leg_region    ON legislation(region);
CREATE INDEX IF NOT EXISTS idx_leg_published ON legislation(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leg_relevance ON legislation(ai_relevance DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leg_status    ON legislation(status);
CREATE INDEX IF NOT EXISTS idx_leg_category  ON legislation(ai_category);
CREATE INDEX IF NOT EXISTS idx_leg_ref       ON legislation(reference_id);
"""

# ─── Ollama analysis prompt ───────────────────────────────────────────────────
_ANALYSIS_PROMPT = """Analiza esta norma legislativa y devuelve SOLO un objeto JSON valido, sin texto adicional.

Titulo: {title}
Tipo: {doc_type}
Nivel: {level}
Region: {region}
Texto: {text}

JSON requerido:
{{
  "ai_summary": "Resumen ejecutivo en 3-4 oraciones precisas",
  "ai_topics": ["tema1", "tema2", "tema3"],
  "ai_sectors": ["sector1", "sector2"],
  "ai_impact_level": "high",
  "ai_relevance": 7,
  "ai_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "ai_entities": {{
    "organismos": ["org1"],
    "normas_relacionadas": ["referencia"],
    "personas": []
  }},
  "ai_obligations": "Principales obligaciones que impone la norma",
  "ai_deadlines": [{{"plazo": "descripcion", "fecha": null}}],
  "ai_affected_regions": ["Espana entera"],
  "ai_eu_relation": "Independiente de normativa UE",
  "ai_category": "fiscal"
}}

Valores validos para ai_impact_level: high, medium, low
Valores validos para ai_category: fiscal, laboral, mercantil, penal, administrativo, social, ambiental, digital, sanitario, educativo, defensa, otro
ai_relevance de 1 a 10 (solo aprobar normas con score >= {min_rel})"""


# ─── Core helpers ─────────────────────────────────────────────────────────────

def _get_conn():
    return psycopg.connect(DATABASE_URL)


def _ensure_schema():
    try:
        with _get_conn() as conn:
            conn.execute(_SCHEMA_SQL)
            conn.commit()
        log.info("Legislation schema OK")
    except Exception as exc:
        log.warning("Schema creation skipped: %s", exc)


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()


def _item_exists(conn, hash_val: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM legislation WHERE hash = %s LIMIT 1", (hash_val,)
    ).fetchone()
    return row is not None


def _infer_doc_type(title: str) -> str:
    t = title.lower()
    for prefix, canonical in _DOC_TYPE_RULES:
        if prefix in t:
            return canonical
    return "Disposicion"


def _safe_get(url: str, timeout: int = 20, headers: dict | None = None) -> Any | None:
    """HTTP GET with graceful error handling."""
    try:
        import requests
        resp = requests.get(
            url,
            timeout=timeout,
            headers=headers or {
                "User-Agent": "Politeia-Intelligence-Bot/2.0 (+https://politeia.es/bot)",
                "Accept-Language": "es-ES,es;q=0.9",
            },
        )
        resp.raise_for_status()
        time.sleep(0.8)
        return resp
    except Exception as exc:
        log.debug("GET %s failed: %s", url[:80], exc)
        return None


def _analyze_ollama(item: dict) -> dict:
    """Run Ollama analysis on a legislation item. Returns {} on any failure."""
    import requests as _req
    prompt = _ANALYSIS_PROMPT.format(
        title=item.get("title", "")[:300],
        doc_type=item.get("doc_type", "Disposicion"),
        level=item.get("level", "national"),
        region=item.get("region", "Espana"),
        text=item.get("full_text", item.get("summary", ""))[:2500],
        min_rel=MIN_RELEVANCE,
    )
    try:
        resp = _req.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"temperature": 0.05, "num_predict": 600},
            },
            timeout=90,
        )
        resp.raise_for_status()
        raw = resp.json().get("response", "")
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as exc:
        log.debug("Ollama analysis failed: %s", exc)
    return {}


def _save_item(conn, item: dict) -> bool:
    """
    Persist a legislation item. Returns True if new, False if duplicate/filtered.
    Runs Ollama analysis inline; skips if ai_relevance < MIN_RELEVANCE.
    """
    h = _sha256((item.get("reference_id") or "") + item["title"])
    if _item_exists(conn, h):
        return False

    analysis = _analyze_ollama(item)
    if int(analysis.get("ai_relevance", 0)) < MIN_RELEVANCE:
        log.debug("Filtered out (relevance %s): %s", analysis.get("ai_relevance"), item["title"][:60])
        return False

    row = {
        "hash":              h,
        "title":             item.get("title", "")[:512],
        "reference_id":      item.get("reference_id"),
        "url":               item.get("url"),
        "pdf_url":           item.get("pdf_url"),
        "level":             item.get("level", "national"),
        "region":            item.get("region", "Espana"),
        "doc_type":          item.get("doc_type", "Disposicion"),
        "section":           item.get("section"),
        "department":        item.get("department"),
        "status":            item.get("status", "published"),
        "summary":           item.get("summary", "")[:2000],
        "full_text":         item.get("full_text", "")[:40000],
        "published_at":      item.get("published_at"),
        "effective_date":    item.get("effective_date"),
        "ai_summary":        analysis.get("ai_summary"),
        "ai_topics":         json.dumps(analysis.get("ai_topics", [])),
        "ai_sectors":        json.dumps(analysis.get("ai_sectors", [])),
        "ai_impact_level":   analysis.get("ai_impact_level"),
        "ai_relevance":      analysis.get("ai_relevance"),
        "ai_keywords":       json.dumps(analysis.get("ai_keywords", [])),
        "ai_entities":       json.dumps(analysis.get("ai_entities", {})),
        "ai_obligations":    analysis.get("ai_obligations"),
        "ai_deadlines":      json.dumps(analysis.get("ai_deadlines", [])),
        "ai_affected_regions": json.dumps(analysis.get("ai_affected_regions", [])),
        "ai_eu_relation":    analysis.get("ai_eu_relation"),
        "ai_category":       analysis.get("ai_category"),
    }
    try:
        conn.execute("""
            INSERT INTO legislation (
                hash, title, reference_id, url, pdf_url, level, region,
                doc_type, section, department, status, summary, full_text,
                published_at, effective_date,
                ai_summary, ai_topics, ai_sectors, ai_impact_level, ai_relevance,
                ai_keywords, ai_entities, ai_obligations, ai_deadlines,
                ai_affected_regions, ai_eu_relation, ai_category
            ) VALUES (
                %(hash)s, %(title)s, %(reference_id)s, %(url)s, %(pdf_url)s,
                %(level)s, %(region)s, %(doc_type)s, %(section)s, %(department)s,
                %(status)s, %(summary)s, %(full_text)s, %(published_at)s, %(effective_date)s,
                %(ai_summary)s, %(ai_topics)s, %(ai_sectors)s, %(ai_impact_level)s,
                %(ai_relevance)s, %(ai_keywords)s, %(ai_entities)s, %(ai_obligations)s,
                %(ai_deadlines)s, %(ai_affected_regions)s, %(ai_eu_relation)s, %(ai_category)s
            )
            ON CONFLICT (hash) DO NOTHING
        """, row)
        conn.commit()
        log.info("Saved [%s/%s]: %s", item.get("level"), item.get("region"), item["title"][:70])
        return True
    except Exception as exc:
        log.error("DB save failed: %s — %s", exc, item["title"][:60])
        conn.rollback()
        return False


# ─── European scraper ─────────────────────────────────────────────────────────

_EURLEX_SPARQL_QUERY = """
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?work ?celex ?title_es ?title_en ?date_doc ?resource_type
WHERE {{
    ?work cdm:work_has_resource-type ?resource_type .
    ?work cdm:resource_legal_date_document ?date_doc .
    OPTIONAL {{
        ?work cdm:work_has_expression ?expr_es .
        ?expr_es cdm:expression_uses_language
            <http://publications.europa.eu/resource/authority/language/SPA> .
        ?expr_es cdm:expression_title ?title_es
    }}
    OPTIONAL {{
        ?work cdm:work_has_expression ?expr_en .
        ?expr_en cdm:expression_uses_language
            <http://publications.europa.eu/resource/authority/language/ENG> .
        ?expr_en cdm:expression_title ?title_en
    }}
    FILTER(?date_doc >= "{date_from}"^^xsd:date)
    FILTER(?resource_type IN (
        <http://publications.europa.eu/resource/authority/resource-type/REG>,
        <http://publications.europa.eu/resource/authority/resource-type/DIR>,
        <http://publications.europa.eu/resource/authority/resource-type/DEC>,
        <http://publications.europa.eu/resource/authority/resource-type/REC>
    ))
    BIND(REPLACE(STR(?work),
        "http://publications.europa.eu/resource/celex/", "") AS ?celex)
}}
ORDER BY DESC(?date_doc)
LIMIT 100
"""

_EU_DOC_MAP = {
    "REG": "Reglamento UE",
    "DIR": "Directiva UE",
    "DEC": "Decision UE",
    "REC": "Recomendacion UE",
}


def scrape_eurlex(days_back: int = 7) -> int:
    """EUR-Lex SPARQL endpoint — Regulations, Directives, Decisions."""
    try:
        from SPARQLWrapper import SPARQLWrapper, JSON as SPARQL_JSON
    except ImportError:
        log.warning("SPARQLWrapper not installed — EUR-Lex scraper disabled")
        return 0

    date_from = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    log.info("EUR-Lex SPARQL from %s", date_from)

    sparql = SPARQLWrapper(EURLEX_SPARQL)
    sparql.setReturnFormat(SPARQL_JSON)
    sparql.setQuery(_EURLEX_SPARQL_QUERY.format(date_from=date_from))
    try:
        results = sparql.query().convert()
    except Exception as exc:
        log.error("SPARQL query failed: %s", exc)
        return 0

    new_count = 0
    with _get_conn() as conn:
        for r in results.get("results", {}).get("bindings", []):
            title = (
                r.get("title_es", {}).get("value")
                or r.get("title_en", {}).get("value")
                or ""
            )
            if not title:
                continue

            celex = r.get("celex", {}).get("value", "")
            date_str = r.get("date_doc", {}).get("value", "")
            rtype = r.get("resource_type", {}).get("value", "").split("/")[-1]

            pub_date = None
            if date_str:
                try:
                    pub_date = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    pass

            item = {
                "title":        title,
                "reference_id": celex,
                "url":          f"https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:{celex}",
                "pdf_url":      f"https://eur-lex.europa.eu/legal-content/ES/TXT/PDF/?uri=CELEX:{celex}",
                "level":        "european",
                "region":       "Union Europea",
                "doc_type":     _EU_DOC_MAP.get(rtype, rtype),
                "status":       "published",
                "published_at": pub_date,
                "summary":      title,
                "full_text":    "",
            }
            if _save_item(conn, item):
                new_count += 1

    log.info("EUR-Lex: %d new items", new_count)
    return new_count


def scrape_europarl(days_back: int = 14) -> int:
    """Europarl Open Data API — procedures and adopted texts."""
    ENDPOINT = "https://data.europarl.europa.eu/api/v2"
    new_count = 0
    date_from = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")

    with _get_conn() as conn:
        # Legislative procedures
        resp = _safe_get(
            f"{ENDPOINT}/legislative-observatory/procedures",
            headers={"Accept": "application/ld+json"},
        )
        if resp:
            try:
                data = resp.json()
                for proc in data.get("data", [])[:60]:
                    title_obj = proc.get("title", {})
                    title = title_obj.get("es") or title_obj.get("en") or title_obj.get("fr") or ""
                    if not title:
                        continue
                    ref = proc.get("reference", "")
                    date_str = proc.get("dateOfAdoption", "")
                    pub_date = None
                    if date_str:
                        try:
                            pub_date = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                        except ValueError:
                            pass
                    item = {
                        "title":        title,
                        "reference_id": ref,
                        "url":          f"https://oeil.secure.europarl.europa.eu/oeil/search/search.do?lang=es&refProcNum={ref}",
                        "level":        "european",
                        "region":       "Union Europea",
                        "doc_type":     proc.get("type", {}).get("label", {}).get("es", "Procedimiento PE"),
                        "department":   proc.get("leadCommittee", {}).get("name", {}).get("en", ""),
                        "status":       "pending" if proc.get("status") in ("ongoing", "active") else "published",
                        "published_at": pub_date,
                        "summary":      title,
                        "full_text":    "",
                    }
                    if _save_item(conn, item):
                        new_count += 1
            except Exception as exc:
                log.warning("Europarl parse error: %s", exc)

    log.info("Europarl: %d new items", new_count)
    return new_count


# ─── National scraper (BOE) ───────────────────────────────────────────────────

def scrape_boe(days_back: int = 2) -> int:
    """BOE official API — national legislation."""
    new_count = 0

    with _get_conn() as conn:
        for i in range(days_back):
            d = date.today() - timedelta(days=i)
            new_count += _scrape_boe_day(conn, d)

    log.info("BOE: %d new items", new_count)
    return new_count


def _scrape_boe_day(conn, day: date) -> int:
    date_str = day.strftime("%Y%m%d")
    log.info("BOE day %s", day.isoformat())

    resp = _safe_get(
        f"{BOE_API_BASE}/sumario/{date_str}",
        headers={"Accept": "application/json"},
    )
    if not resp:
        return _scrape_boe_rss(conn)

    try:
        data = resp.json()
    except Exception:
        return 0

    new_count = 0
    sumario = data.get("data", {}).get("sumario", {})

    for section_id, section_data in sumario.items():
        if section_id not in BOE_SECTIONS:
            continue

        depts = section_data.get("diario", {}).get("seccion", {})
        if not isinstance(depts, list):
            depts = [depts]

        for dept_data in depts:
            dept_name = dept_data.get("@nombre", "")
            items = dept_data.get("item", [])
            if isinstance(items, dict):
                items = [items]

            for raw in items:
                ref   = raw.get("identificador", "")
                title = raw.get("titulo", "")
                if not title:
                    continue

                url_html = raw.get("url_html", "")
                url_pdf  = raw.get("url_pdf", "")
                date_val = raw.get("fecha_publicacion", day.isoformat())

                pub_date = None
                try:
                    pub_date = datetime.strptime(date_val[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    pass

                full_text = _fetch_boe_text(ref)

                item = {
                    "title":        title,
                    "reference_id": ref,
                    "url":          f"https://www.boe.es{url_html}" if url_html.startswith("/") else url_html,
                    "pdf_url":      f"https://www.boe.es{url_pdf}"  if url_pdf.startswith("/")  else url_pdf,
                    "level":        "national",
                    "region":       "Espana",
                    "doc_type":     _infer_doc_type(title),
                    "section":      section_id,
                    "department":   dept_name,
                    "status":       "published",
                    "published_at": pub_date,
                    "summary":      title,
                    "full_text":    full_text,
                }
                if _save_item(conn, item):
                    new_count += 1

    return new_count


def _scrape_boe_rss(conn) -> int:
    """Fallback: ingest BOE via RSS feed."""
    try:
        import feedparser
    except ImportError:
        return 0

    feed = feedparser.parse("https://www.boe.es/rss/boe_A.xml")
    new_count = 0
    for entry in feed.entries[:40]:
        title = entry.get("title", "")
        pub_date = None
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        item = {
            "title":        title,
            "reference_id": entry.get("id", "").split("/")[-1],
            "url":          entry.get("link", ""),
            "level":        "national",
            "region":       "Espana",
            "doc_type":     _infer_doc_type(title),
            "status":       "published",
            "published_at": pub_date,
            "summary":      entry.get("summary", ""),
            "full_text":    "",
        }
        if _save_item(conn, item):
            new_count += 1
    return new_count


def _fetch_boe_text(ref_id: str) -> str:
    """Download full text of a BOE item by reference ID."""
    if not ref_id:
        return ""
    resp = _safe_get(
        f"{BOE_API_BASE}/documento/{ref_id}",
        headers={"Accept": "application/json"},
    )
    if not resp:
        return ""
    try:
        data = resp.json()
        doc = data.get("data", {}).get("documento", {})
        return doc.get("texto", "") if isinstance(doc, dict) else ""
    except Exception:
        return ""


def scrape_congreso() -> int:
    """Congreso de los Diputados — pending legislative initiatives."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        log.warning("beautifulsoup4 not installed — Congreso scraper disabled")
        return 0

    CONGRESO_BASE = "https://www.congreso.es"
    new_count = 0

    with _get_conn() as conn:
        for tipo_code, doc_type in [("120", "Proyecto de Ley"), ("122", "Proposicion de Ley")]:
            url = (
                f"{CONGRESO_BASE}/es/busqueda-de-iniciativas"
                f"?action=search&formato=lista&tipo={tipo_code}"
                f"&legislatura=15&estado=Vigente&paginacion=50"
            )
            resp = _safe_get(url)
            if not resp:
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            selectors = [
                "ul.listado-resultado > li",
                ".iniciativa-item",
                "article.result",
            ]
            rows = []
            for sel in selectors:
                rows = soup.select(sel)
                if rows:
                    break

            for row in rows[:30]:
                link_el = row.select_one("a.titulo, h3 a, .titulo-iniciativa a, a")
                if not link_el:
                    continue

                title = link_el.get_text(strip=True)
                if not title or len(title) < 10:
                    continue

                href = link_el.get("href", "")
                full_url = urljoin(CONGRESO_BASE, href)

                ref_el = row.select_one(".expediente, .referencia")
                ref = ref_el.get_text(strip=True) if ref_el else href.split("/")[-1]

                date_el = row.select_one(".fecha, time")
                pub_date = None
                if date_el:
                    date_str = date_el.get("datetime") or date_el.get_text(strip=True)
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                        try:
                            pub_date = datetime.strptime(date_str[:10], fmt).replace(tzinfo=timezone.utc)
                            break
                        except ValueError:
                            continue

                grupo_el = row.select_one(".grupo, .autor, .proponente")
                grupo = grupo_el.get_text(strip=True) if grupo_el else ""

                item = {
                    "title":        title,
                    "reference_id": ref,
                    "url":          full_url,
                    "level":        "national",
                    "region":       "Espana",
                    "doc_type":     doc_type,
                    "department":   grupo,
                    "status":       "pending",
                    "published_at": pub_date,
                    "summary":      row.select_one(".estado, .tramitacion") and
                                    row.select_one(".estado, .tramitacion").get_text(strip=True) or "",
                    "full_text":    "",
                }
                if _save_item(conn, item):
                    new_count += 1

    log.info("Congreso: %d new items", new_count)
    return new_count


# ─── Regional scraper (17 CCAA) ───────────────────────────────────────────────

def scrape_regional(regions: list[str] | None = None) -> int:
    """Ingest regional gazette RSS feeds for selected CCAA (all if None)."""
    try:
        import feedparser
        from bs4 import BeautifulSoup
    except ImportError:
        log.warning("feedparser/beautifulsoup4 not installed — CCAA scraper disabled")
        return 0

    targets = regions or list(REGIONAL_SOURCES.keys())
    new_count = 0

    with _get_conn() as conn:
        for region_name in targets:
            src = REGIONAL_SOURCES.get(region_name)
            if not src:
                continue

            log.info("CCAA %s (%s)", region_name, src["gazette"])
            rss_url = src.get("rss", "")
            if not rss_url:
                continue

            feed = feedparser.parse(
                rss_url,
                request_headers={"User-Agent": "Politeia-Intelligence-Bot/2.0"},
            )

            for entry in feed.entries[:25]:
                title = entry.get("title", "")
                if not title:
                    continue

                link = entry.get("link", "")
                summary = ""
                if hasattr(entry, "summary"):
                    try:
                        soup = BeautifulSoup(entry.summary, "html.parser")
                        summary = soup.get_text(separator=" ", strip=True)[:800]
                    except Exception:
                        summary = entry.summary[:800]

                pub_date = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)

                # Fetch page text for richer Ollama context
                full_text = _fetch_regional_text(link)

                item = {
                    "title":        title,
                    "reference_id": entry.get("id", link),
                    "url":          link,
                    "level":        "regional",
                    "region":       region_name,
                    "doc_type":     _infer_regional_doc_type(title),
                    "department":   src["gazette"],
                    "status":       "published",
                    "published_at": pub_date,
                    "summary":      summary,
                    "full_text":    full_text,
                }
                if _save_item(conn, item):
                    new_count += 1

    log.info("CCAA total: %d new items", new_count)
    return new_count


def _fetch_regional_text(url: str) -> str:
    """Extract text from a regional gazette page."""
    if not url:
        return ""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        return ""

    resp = _safe_get(url)
    if not resp:
        return ""
    soup = BeautifulSoup(resp.text, "html.parser")

    # Common selectors across gazette portals
    for sel in [
        "#texto-norma", ".norma-texto", "#contenido-disposicion",
        ".texto-disposicion", "article.norma", "#divTextoNorma",
        ".boletinTexto", ".textoCuerpo", "main article",
    ]:
        el = soup.select_one(sel)
        if el:
            return el.get_text(separator="\n", strip=True)[:20000]

    # Paragraph fallback
    return "\n".join(p.get_text(strip=True) for p in soup.find_all("p")[:40])[:8000]


def _infer_regional_doc_type(title: str) -> str:
    t = title.lower()
    if any(x in t for x in ["ley organica", "llei organica"]): return "Ley Organica Autonomica"
    if any(x in t for x in ["ley ", "llei ", "lege "]):        return "Ley Autonomica"
    if any(x in t for x in ["decreto-ley", "decret-llei"]):    return "Decreto-Ley Autonomico"
    if "decreto" in t:                                          return "Decreto Autonomico"
    if "orden" in t:                                            return "Orden Autonomica"
    if any(x in t for x in ["resolucion", "resolucio"]):       return "Resolucion Autonomica"
    if any(x in t for x in ["proposicion", "proposicio"]):     return "Proposicion de Ley"
    return "Disposicion Autonomica"


# ─── Dashboard query functions ────────────────────────────────────────────────

def get_legislation(
    level: str | None = None,
    region: str | None = None,
    status: str | None = None,
    category: str | None = None,
    limit: int = 100,
    min_relevance: int = 0,
    days_back: int = 30,
) -> list[dict]:
    """
    Query legislation table with filters. Returns list of row dicts.
    Falls back to empty list if DB unavailable.
    """
    try:
        where_clauses = ["1=1"]
        params: list[Any] = []

        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        where_clauses.append("(published_at >= %s OR published_at IS NULL)")
        params.append(cutoff)

        if level:
            where_clauses.append("level = %s")
            params.append(level)
        if region:
            where_clauses.append("region ILIKE %s")
            params.append(f"%{region}%")
        if status:
            where_clauses.append("status = %s")
            params.append(status)
        if category:
            where_clauses.append("ai_category = %s")
            params.append(category)
        if min_relevance > 0:
            where_clauses.append("(ai_relevance >= %s OR ai_relevance IS NULL)")
            params.append(min_relevance)

        sql = f"""
            SELECT
                id, title, reference_id, url, pdf_url, level, region,
                doc_type, department, status, summary,
                published_at, effective_date,
                ai_summary, ai_topics, ai_sectors, ai_impact_level,
                ai_relevance, ai_keywords, ai_obligations,
                ai_affected_regions, ai_eu_relation, ai_category
            FROM legislation
            WHERE {' AND '.join(where_clauses)}
            ORDER BY
                COALESCE(ai_relevance, 0) DESC,
                COALESCE(published_at, fetched_at) DESC
            LIMIT %s
        """
        params.append(limit)

        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()
                return [dict(r) for r in rows]
    except Exception as exc:
        log.debug("get_legislation DB error: %s", exc)
        return []


def get_legislation_kpis() -> dict:
    """Return aggregate KPIs for the legislation dashboard."""
    try:
        with _get_conn() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE level = 'european')   AS total_eu,
                        COUNT(*) FILTER (WHERE level = 'national')   AS total_national,
                        COUNT(*) FILTER (WHERE level = 'regional')   AS total_regional,
                        COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
                        COUNT(*) FILTER (WHERE status = 'published') AS published,
                        COUNT(*) FILTER (WHERE ai_impact_level = 'high') AS high_impact,
                        MAX(published_at) AS last_update
                    FROM legislation
                """)
                row = cur.fetchone()
                return dict(row) if row else {}
    except Exception as exc:
        log.debug("get_legislation_kpis DB error: %s", exc)
        return {}


# ─── Unified pipeline ─────────────────────────────────────────────────────────

def run_priority_pipeline() -> dict:
    """Fast pipeline (every 30 min): BOE RSS + EU regulations check."""
    _ensure_schema()
    results = {"boe": 0, "errors": []}
    try:
        results["boe"] = scrape_boe(days_back=1)
    except Exception as exc:
        results["errors"].append(f"boe: {exc}")
    return results


def run_full_pipeline(
    regions: list[str] | None = None,
    days_back: int = 3,
) -> dict:
    """
    Complete pipeline (twice daily): EU + national + all CCAA.
    Returns dict with counts per level.
    """
    _ensure_schema()
    results = {"european": 0, "national": 0, "regional": 0, "errors": []}

    log.info("=== Legislation pipeline START ===")

    for fn_name, fn, kwargs, key in [
        ("EUR-Lex",    scrape_eurlex,    {"days_back": max(days_back, 7)}, "european"),
        ("Europarl",   scrape_europarl,  {"days_back": max(days_back, 14)}, "european"),
        ("BOE",        scrape_boe,       {"days_back": days_back},          "national"),
        ("Congreso",   scrape_congreso,  {},                                "national"),
        ("CCAA",       scrape_regional,  {"regions": regions},              "regional"),
    ]:
        try:
            count = fn(**kwargs)
            results[key] += count
            log.info("%s: +%d", fn_name, count)
        except Exception as exc:
            log.error("%s failed: %s", fn_name, exc)
            results["errors"].append(f"{fn_name}: {exc}")

    total = results["european"] + results["national"] + results["regional"]
    log.info(
        "=== Pipeline END — EU:%d ES:%d CCAA:%d TOTAL:%d ===",
        results["european"], results["national"], results["regional"], total,
    )
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
    run_full_pipeline()
