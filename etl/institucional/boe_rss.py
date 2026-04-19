"""
Ingesta de publicaciones del BOE vía RSS.
Parsea los feeds oficiales del BOE, normaliza disposiciones y las upserta
en la tabla boe_publication con scoring de relevancia.

Uso:
    python -m etl.institucional.boe_rss           # ingesta hoy
    python -m etl.institucional.boe_rss --dry     # sólo imprime, no escribe en BD
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import feedparser

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from etl.logger import get_logger  # noqa: E402
from dashboard.services.boe_service import (  # noqa: E402
    normalize_boe_item,
    score_relevance,
    infer_tipo,
    infer_organismo,
    infer_seccion,
)

log = get_logger("boe_rss")

# ── Feeds del BOE ─────────────────────────────────────────────────────────────

BOE_FEEDS = [
    "https://www.boe.es/rss/boe.php",
    "https://www.boe.es/rss/diario_boe.xml",
    "https://www.boe.es/rss/boe_I.php",    # Sección I — Disposiciones generales
    "https://www.boe.es/rss/boe_II.php",   # Sección II — Autoridades y personal
    "https://www.boe.es/rss/boe_III.php",  # Sección III — Otras disposiciones
]

_RELEVANCIA_SCORE: dict[str, int] = {
    "Alta":  80,
    "Media": 50,
    "Baja":  20,
}


def _clean_html(text: str) -> str:
    return re.sub(r"<[^>]+>", " ", text).strip()


def _content_hash(titulo: str, fecha: str) -> str:
    blob = f"{titulo.strip().lower()[:200]}|{fecha}"
    return hashlib.sha256(blob.encode()).hexdigest()


def _parse_date(entry) -> str:
    raw = str(getattr(entry, "published", "") or getattr(entry, "updated", "") or "").strip()
    if not raw:
        return date.today().isoformat()
    # Intentar parsear fecha estándar RSS
    for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%a, %d %b %Y %H:%M:%S GMT"):
        try:
            return datetime.strptime(raw[:29], fmt).date().isoformat()
        except ValueError:
            continue
    return raw[:10] if len(raw) >= 10 else date.today().isoformat()


def fetch_boe_items(limit: int = 30) -> list[dict]:
    """Parsea todos los feeds del BOE y devuelve items normalizados."""
    seen: dict[str, dict] = {}  # keyed by content_hash

    for feed_url in BOE_FEEDS:
        try:
            feed = feedparser.parse(feed_url)
            for entry in getattr(feed, "entries", [])[:limit]:
                titulo = _clean_html(str(getattr(entry, "title", "") or "")).strip()
                if not titulo:
                    continue
                resumen = _clean_html(str(getattr(entry, "summary", "") or "")).strip()
                url_html = str(getattr(entry, "link", "") or "").strip()
                fecha_str = _parse_date(entry)
                tipo = infer_tipo(titulo)
                organismo = infer_organismo(titulo, resumen)
                seccion = infer_seccion(titulo)
                relevancia = score_relevance(titulo, tipo)
                relevancia_score = _RELEVANCIA_SCORE.get(relevancia, 20)
                chash = _content_hash(titulo, fecha_str)

                boe_id = str(getattr(entry, "id", "") or "").strip()
                m = re.search(r"(BOE-[A-Z]-\d{4}-\d+)", boe_id or url_html)
                boe_no = m.group(1) if m else ""

                if chash not in seen:
                    seen[chash] = {
                        "boe_no":          boe_no or None,
                        "fecha":           fecha_str,
                        "seccion":         seccion,
                        "departamento":    organismo,
                        "tipo_norma":      tipo,
                        "titulo":          titulo[:500],
                        "resumen":         resumen[:600] or None,
                        "url_html":        url_html or None,
                        "relevancia":      relevancia,
                        "relevancia_score": relevancia_score,
                        "temas_json":      json.dumps([], ensure_ascii=False),
                        "content_hash":    chash,
                    }
        except Exception as exc:
            log.warning("feed_error url=%s err=%s", feed_url, exc)
            continue

    items = list(seen.values())
    # Ordenar por relevancia descendente
    items.sort(key=lambda x: x["relevancia_score"], reverse=True)
    return items[:limit]


def upsert_boe_publications(items: list[dict], conn) -> int:
    """
    Inserta/actualiza publicaciones BOE en boe_publication.
    Usa ON CONFLICT (content_hash) para idempotencia.
    Devuelve nº de filas nuevas.
    """
    if not items:
        return 0

    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO boe_publication
            (boe_no, fecha, seccion, departamento, tipo_norma, titulo, resumen,
             url_html, relevancia, relevancia_score, temas_json, content_hash)
        VALUES
            (:boe_no, :fecha::date, :seccion, :departamento, :tipo_norma, :titulo, :resumen,
             :url_html, :relevancia, :relevancia_score, :temas_json, :content_hash)
        ON CONFLICT (content_hash) DO UPDATE SET
            relevancia       = EXCLUDED.relevancia,
            relevancia_score = EXCLUDED.relevancia_score,
            resumen          = COALESCE(EXCLUDED.resumen, boe_publication.resumen),
            url_html         = COALESCE(EXCLUDED.url_html, boe_publication.url_html)
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


def main(dry: bool = False) -> None:
    items = fetch_boe_items(limit=40)
    log.info("fetched count=%d dry=%s", len(items), dry)

    if dry:
        for it in items[:5]:
            print(f"  [{it['relevancia']:5s}] {it['tipo_norma']:25s} {it['titulo'][:70]}")
        print(f"  ... total: {len(items)}")
        return

    try:
        from dashboard.db import get_engine
        engine = get_engine()
        with engine.connect() as conn:
            n = upsert_boe_publications(items, conn)
        log.info("upserted_new=%d", n)
        print(f"BOE ingested: {len(items)} parsed, {n} new rows.")
    except Exception as exc:
        log.error("upsert_failed err=%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest BOE RSS feeds")
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args()
    main(dry=args.dry)
