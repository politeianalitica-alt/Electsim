"""
Ingesta de agenda del Presidente del Gobierno y del Gobierno (Moncloa).
Parsea la agenda diaria del portal de La Moncloa y upserta en agenda_item.

Uso:
    python -m etl.institucional.moncloa_agenda               # hoy
    python -m etl.institucional.moncloa_agenda --date 2026-04-14
    python -m etl.institucional.moncloa_agenda --dry
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urljoin

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    import requests
    from bs4 import BeautifulSoup
    _SCRAPE_AVAILABLE = True
except ImportError:
    _SCRAPE_AVAILABLE = False

try:
    import feedparser
    _FEED_AVAILABLE = True
except ImportError:
    _FEED_AVAILABLE = False

from etl.logger import get_logger  # noqa: E402
from dashboard.services.agenda_service import infer_event_type, compute_importance  # noqa: E402

log = get_logger("moncloa_agenda")

# ── Fuentes ───────────────────────────────────────────────────────────────────

MONCLOA_BASE = "https://www.lamoncloa.gob.es"
MONCLOA_AGENDA_PRES = "https://www.lamoncloa.gob.es/presidente/agenda/Paginas/index.aspx"
MONCLOA_GOB_AGENDA  = "https://www.lamoncloa.gob.es/gobierno/agenda/Paginas/agenda.aspx"
MONCLOA_RSS         = "https://www.lamoncloa.gob.es/Paginas/index-rss.aspx"

_HEADERS = {"User-Agent": "ElectSim/1.0 (research; contact: info@politeria.es)"}

DECISORES_MONCLOA = [
    ("pedro_sanchez", "Pedro Sánchez", "PSOE", "Presidente del Gobierno"),
    ("gobierno_espana", "Gobierno de España", "GOBIERNO", "Gobierno"),
]


@dataclass
class AgendaItemRaw:
    main_actor: str
    main_actor_id: str
    party_id: str
    host_institution: str = "Presidencia del Gobierno"
    title: str = ""
    description: str = ""
    location: str = ""
    event_date: str = ""
    time_start: str = ""
    event_type: str = "OTHER"
    importance_score: int = 50
    source_id: str = "moncloa"
    source_url: str = MONCLOA_AGENDA_PRES
    content_hash: str = ""

    def compute_hash(self) -> str:
        blob = f"{self.main_actor}|{self.event_date}|{self.title.lower().strip()[:100]}"
        return hashlib.sha256(blob.encode()).hexdigest()


# ── Parsers ───────────────────────────────────────────────────────────────────

def _parse_moncloa_rss(limit: int = 30) -> list[AgendaItemRaw]:
    """Fallback: extrae eventos de agenda del RSS general de Moncloa."""
    if not _FEED_AVAILABLE:
        log.warning("feedparser not available for moncloa rss")
        return []

    items: list[AgendaItemRaw] = []
    try:
        feed = feedparser.parse(MONCLOA_RSS)
        today = date.today().isoformat()
        for entry in getattr(feed, "entries", [])[:limit]:
            title = str(getattr(entry, "title", "") or "").strip()
            if not title:
                continue
            summary = re.sub(r"<[^>]+>", " ", str(getattr(entry, "summary", "") or "")).strip()
            url = str(getattr(entry, "link", "") or "").strip()
            raw_date = str(getattr(entry, "published", "") or "").strip()
            fecha = raw_date[:10] if len(raw_date) >= 10 else today

            # Solo tomar entradas que parezcan agenda/actos
            if not any(k in title.lower() for k in ["agenda", "acto", "visita", "reunión", "rueda", "consejo", "cumbre", "despacho"]):
                continue

            etype = infer_event_type(title, summary)
            importance = compute_importance(etype, "Pedro Sánchez", "Presidencia del Gobierno")

            raw = AgendaItemRaw(
                main_actor="Pedro Sánchez",
                main_actor_id="pedro_sanchez",
                party_id="PSOE",
                title=title[:400],
                description=summary[:600],
                event_date=fecha,
                event_type=etype,
                importance_score=importance,
                source_url=url or MONCLOA_RSS,
            )
            raw.content_hash = raw.compute_hash()
            items.append(raw)
    except Exception as exc:
        log.warning("moncloa_rss_error err=%s", exc)

    return items[:limit]


def _parse_moncloa_html(fecha_obj: date) -> list[AgendaItemRaw]:
    """
    Parsea la agenda HTML de Moncloa para una fecha concreta.
    Usa la URL de búsqueda por día.
    """
    if not _SCRAPE_AVAILABLE:
        log.warning("requests/bs4 not available for html scraping")
        return []

    fecha_str = fecha_obj.strftime("%d/%m/%Y")
    # URL con parámetro de fecha (formato Moncloa)
    url = f"{MONCLOA_AGENDA_PRES}?agendaDate={fecha_obj.strftime('%Y-%m-%d')}"
    items: list[AgendaItemRaw] = []
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Buscar contenedores de eventos (estructura típica de Moncloa)
        for container in soup.select("li.agenda-item, div.agenda-evento, article.evento, .agenda-row"):
            title_el = container.select_one("h3, h4, .titulo, .title, strong")
            title = title_el.get_text(strip=True) if title_el else ""
            if not title:
                continue
            desc_el = container.select_one("p, .descripcion, .resumen")
            desc = desc_el.get_text(strip=True)[:500] if desc_el else ""
            hora_el = container.select_one(".hora, .time, time")
            hora = hora_el.get_text(strip=True)[:5] if hora_el else ""
            lugar_el = container.select_one(".lugar, .location, .place")
            lugar = lugar_el.get_text(strip=True)[:200] if lugar_el else ""

            etype = infer_event_type(title, desc)
            importance = compute_importance(etype, "Pedro Sánchez", "Presidencia del Gobierno")

            raw = AgendaItemRaw(
                main_actor="Pedro Sánchez",
                main_actor_id="pedro_sanchez",
                party_id="PSOE",
                title=title,
                description=desc,
                location=lugar,
                event_date=fecha_obj.isoformat(),
                time_start=hora,
                event_type=etype,
                importance_score=importance,
                source_url=url,
            )
            raw.content_hash = raw.compute_hash()
            items.append(raw)

        log.info("moncloa_html_parsed date=%s count=%d", fecha_obj, len(items))
    except Exception as exc:
        log.warning("moncloa_html_error date=%s err=%s", fecha_obj, exc)

    return items


def fetch_moncloa_agenda(target_date: date | None = None, use_rss_fallback: bool = True) -> list[AgendaItemRaw]:
    """
    Fetch de agenda de Moncloa para una fecha.
    Intenta HTML primero; si falla o devuelve vacío, cae en RSS.
    """
    target = target_date or date.today()
    items = _parse_moncloa_html(target)
    if not items and use_rss_fallback:
        log.info("falling back to rss for date=%s", target)
        items = _parse_moncloa_rss(limit=20)
        # Filtrar por fecha si podemos
        items = [it for it in items if it.event_date[:10] == target.isoformat() or not it.event_date]
        if not items:
            # Tomar todos los del RSS si no hay matcheo de fecha exacta
            items = _parse_moncloa_rss(limit=15)
    return items


def upsert_agenda_items(items: list[AgendaItemRaw], conn) -> int:
    """
    Inserta/actualiza eventos en agenda_item.
    ON CONFLICT (content_hash) para idempotencia.
    """
    if not items:
        return 0

    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO agenda_item
            (main_actor, main_actor_id, party_id, host_institution, title, description,
             location, event_date, start_time, event_type, importance_score,
             certainty_score, status, source_id, source_url, content_hash)
        VALUES
            (:main_actor, :main_actor_id, :party_id, :host_institution, :title, :description,
             :location, :event_date::date,
             NULLIF(:time_start, '')::time,
             :event_type, :importance_score,
             0.85, 'SCHEDULED', :source_id, :source_url, :content_hash)
        ON CONFLICT (content_hash) DO UPDATE SET
            importance_score = EXCLUDED.importance_score,
            description      = COALESCE(EXCLUDED.description, agenda_item.description),
            location         = COALESCE(NULLIF(EXCLUDED.location,''), agenda_item.location)
        RETURNING (xmax = 0) AS inserted
    """)

    inserted = 0
    with conn.begin():
        for it in items:
            params = {
                "main_actor":      it.main_actor,
                "main_actor_id":   it.main_actor_id,
                "party_id":        it.party_id,
                "host_institution": it.host_institution,
                "title":           it.title,
                "description":     it.description or None,
                "location":        it.location or None,
                "event_date":      it.event_date,
                "time_start":      it.time_start or "",
                "event_type":      it.event_type,
                "importance_score": it.importance_score,
                "source_id":       it.source_id,
                "source_url":      it.source_url,
                "content_hash":    it.content_hash,
            }
            result = conn.execute(sql, params)
            row = result.fetchone()
            if row and row[0]:
                inserted += 1
    return inserted


# ── CLI ───────────────────────────────────────────────────────────────────────

def main(target_date: date | None = None, dry: bool = False) -> None:
    items = fetch_moncloa_agenda(target_date)
    log.info("fetched count=%d dry=%s date=%s", len(items), dry, target_date or date.today())

    if dry:
        for it in items[:5]:
            print(f"  [{it.event_type:25s}] {it.event_date} {it.time_start:5s} | {it.title[:70]}")
        return

    if not items:
        print("Sin eventos de agenda Moncloa para la fecha indicada.")
        return

    try:
        from dashboard.db import get_engine
        engine = get_engine()
        with engine.connect() as conn:
            n = upsert_agenda_items(items, conn)
        log.info("upserted_new=%d", n)
        print(f"Moncloa agenda ingested: {len(items)} parsed, {n} new rows.")
    except Exception as exc:
        log.error("upsert_failed err=%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Moncloa agenda")
    parser.add_argument("--date", type=str, default=None, help="YYYY-MM-DD")
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args()
    target = date.fromisoformat(args.date) if args.date else None
    main(target_date=target, dry=args.dry)
