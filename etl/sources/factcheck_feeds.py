"""
Ingesta de feeds de fact-checking.
Parsea RSS de Newtral, Maldita.es, EFE Verifica y AFP Factual y normaliza
los items al schema de la tabla fact_check.

Uso:
    python -m etl.sources.factcheck_feeds          # ingesta completa
    python -m etl.sources.factcheck_feeds --dry    # sólo imprime, no escribe en BD
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import feedparser

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from etl.logger import get_logger  # noqa: E402

log = get_logger("factcheck_feeds")

# ── Configuración de fuentes ──────────────────────────────────────────────────

@dataclass
class FactCheckSource:
    source_id: str
    name: str
    feeds: list[str]
    verdict_keywords: dict[str, list[str]] = field(default_factory=dict)


FACTCHECK_SOURCES: list[FactCheckSource] = [
    FactCheckSource(
        source_id="newtral",
        name="Newtral",
        feeds=[
            "https://www.newtral.es/tag/fact-check/feed/",
            "https://www.newtral.es/tag/verificacion/feed/",
        ],
        verdict_keywords={
            "FALSO":    ["falso", "bulo", "fake", "mentira"],
            "ENGAÑOSO": ["engañoso", "enganoso", "fuera de contexto", "manipulad", "parcialmente"],
            "VERDADERO": ["verdadero", "correcto", "cierto"],
        },
    ),
    FactCheckSource(
        source_id="maldita",
        name="Maldita.es",
        feeds=[
            "https://maldita.es/malditobulo/feed/",
            "https://maldita.es/feed/",
        ],
        verdict_keywords={
            "FALSO":    ["falso", "bulo", "fake"],
            "ENGAÑOSO": ["engañoso", "manipulad", "contexto"],
            "VERDADERO": ["verdadero"],
        },
    ),
    FactCheckSource(
        source_id="efe_verifica",
        name="EFE Verifica",
        feeds=[
            "https://verifica.efe.com/feed/",
        ],
        verdict_keywords={
            "FALSO":    ["falso", "bulo", "inexacto"],
            "ENGAÑOSO": ["engañoso", "fuera de contexto", "manipulad"],
        },
    ),
    FactCheckSource(
        source_id="afp_factual",
        name="AFP Factual",
        feeds=[
            "https://factual.afp.com/es/feed",
        ],
        verdict_keywords={
            "FALSO":    ["falso", "bulo", "incorrecto"],
            "ENGAÑOSO": ["engañoso", "falta de contexto", "manipulad"],
        },
    ),
]

# ── Keywords de partidos ──────────────────────────────────────────────────────

_PARTIDOS_KW: dict[str, list[str]] = {
    "PSOE":    ["psoe", "sanchez", "pedro sanchez", "socialista"],
    "PP":      ["pp", "feijoo", "feijóo", "partido popular"],
    "VOX":     ["vox", "abascal"],
    "SUMAR":   ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "irene montero"],
    "JUNTS":   ["junts", "puigdemont"],
    "ERC":     ["erc", "esquerra"],
}

_TEMAS_KW: dict[str, list[str]] = {
    "economia":    ["economia", "economía", "impuesto", "pib", "deuda", "presupuesto", "iva"],
    "inmigracion": ["inmigraci", "migrante", "extranjero"],
    "sanidad":     ["sanidad", "salud", "hospital", "vacuna"],
    "vivienda":    ["vivienda", "alquiler", "hipoteca"],
    "justicia":    ["justicia", "tribunal", "juez", "sentencia"],
    "energia":     ["energía", "energia", "luz", "electricidad", "gas"],
    "defensa":     ["defensa", "ejército", "ejercito", "nato", "otan"],
}


# ── Funciones de parseo ───────────────────────────────────────────────────────

def _clean_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text).strip()


def _content_hash(titular: str, resumen: str) -> str:
    blob = f"{titular.strip().lower()}|{resumen.strip().lower()[:200]}"
    return hashlib.sha256(blob.encode()).hexdigest()


def _detect_verdict(text: str, kw_map: dict[str, list[str]]) -> str:
    t = text.lower()
    for verdict, kws in kw_map.items():
        if any(k in t for k in kws):
            return verdict
    return "SIN VERIFICAR"


def _detect_parties(text: str) -> list[str]:
    t = text.lower()
    return [sig for sig, kws in _PARTIDOS_KW.items() if any(k in t for k in kws)]


def _detect_topics(text: str) -> list[str]:
    t = text.lower()
    return [tema for tema, kws in _TEMAS_KW.items() if any(k in t for k in kws)]


def parse_feed(source: FactCheckSource, limit: int = 30) -> list[dict]:
    """Parsea todos los feeds de una fuente y devuelve items normalizados."""
    items: list[dict] = {}  # keyed by content_hash para dedup dentro de la fuente
    for feed_url in source.feeds:
        try:
            feed = feedparser.parse(feed_url)
            for entry in getattr(feed, "entries", [])[:limit * 2]:
                titular = _clean_html(str(getattr(entry, "title", "") or "")).strip()
                if not titular:
                    continue
                resumen = _clean_html(str(getattr(entry, "summary", "") or "")).strip()
                url = str(getattr(entry, "link", "") or "").strip()
                raw_date = str(getattr(entry, "published", "") or getattr(entry, "updated", "") or "").strip()
                published_at = raw_date[:25] if raw_date else None

                texto = f"{titular}. {resumen}"
                verdict = _detect_verdict(texto, source.verdict_keywords)
                parties = _detect_parties(texto)
                topics = _detect_topics(texto)
                chash = _content_hash(titular, resumen)

                if chash not in items:
                    items[chash] = {
                        "source_id":    source.source_id,
                        "url":          url or None,
                        "titular":      titular[:500],
                        "resumen":      resumen[:2000] or None,
                        "claim_text":   None,
                        "verdict":      verdict,
                        "verdict_label": verdict,
                        "partidos_json": json.dumps(parties, ensure_ascii=False),
                        "temas_json":   json.dumps(topics, ensure_ascii=False),
                        "published_at": published_at,
                        "content_hash": chash,
                    }
        except Exception as exc:
            log.warning("feed_error source=%s url=%s err=%s", source.source_id, feed_url, exc)
            continue

    return list(items.values())[:limit]


def fetch_all_factchecks(limit_per_source: int = 25) -> list[dict]:
    """Agrega fact-checks de todas las fuentes configuradas."""
    all_items: list[dict] = []
    for source in FACTCHECK_SOURCES:
        items = parse_feed(source, limit=limit_per_source)
        log.info("fetched source=%s count=%d", source.source_id, len(items))
        all_items.extend(items)
    return all_items


def upsert_factchecks(items: list[dict], conn) -> int:
    """
    Inserta/actualiza fact-checks en la tabla fact_check.
    Usa ON CONFLICT (content_hash) para idempotencia.
    Devuelve el número de filas nuevas insertadas.
    """
    if not items:
        return 0

    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO fact_check
            (source_id, url, titular, resumen, claim_text, verdict, verdict_label,
             partidos_json, temas_json, published_at, content_hash)
        VALUES
            (:source_id, :url, :titular, :resumen, :claim_text, :verdict, :verdict_label,
             :partidos_json, :temas_json, :published_at::timestamptz, :content_hash)
        ON CONFLICT (content_hash) DO UPDATE SET
            verdict        = EXCLUDED.verdict,
            verdict_label  = EXCLUDED.verdict_label,
            partidos_json  = EXCLUDED.partidos_json,
            temas_json     = EXCLUDED.temas_json,
            published_at   = COALESCE(EXCLUDED.published_at, fact_check.published_at),
            url            = COALESCE(EXCLUDED.url, fact_check.url)
        RETURNING (xmax = 0) AS inserted
    """)

    inserted = 0
    with conn.begin():
        for item in items:
            result = conn.execute(sql, item)
            row = result.fetchone()
            if row and row[0]:
                inserted += 1
    return inserted


# ── CLI ───────────────────────────────────────────────────────────────────────

def main(dry: bool = False) -> None:
    items = fetch_all_factchecks()
    log.info("total_fetched=%d dry=%s", len(items), dry)

    if dry:
        for it in items[:5]:
            print(f"  [{it['source_id']}] {it['verdict']:20s} {it['titular'][:80]}")
        return

    try:
        from dashboard.db import get_engine
        engine = get_engine()
        with engine.connect() as conn:
            n = upsert_factchecks(items, conn)
        log.info("upserted_new=%d", n)
        print(f"Fact-checks ingested: {len(items)} parsed, {n} new rows.")
    except Exception as exc:
        log.error("upsert_failed err=%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest fact-check RSS feeds")
    parser.add_argument("--dry", action="store_true", help="Sólo parsea, no escribe en BD")
    args = parser.parse_args()
    main(dry=args.dry)
