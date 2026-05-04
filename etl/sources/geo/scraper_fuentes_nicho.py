"""
Scraper de fuentes nicho geopolíticas — 25+ think tanks y medios especializados.

Scrapes RSS de: ECFR, Chatham House, IISS, Carnegie, War on the Rocks, Lawfare,
Lowy Institute, CSIS, Bellingcat, Crisis Group, ACLED Blog, SIPRI, RAND,
Real Instituto Elcano, CIDOB, El Orden Mundial, NATO News, MWI West Point,
Defense One, Breaking Defense, FPRI, Stimson Center, ISW, Al-Monitor,
The Soufan Center.

Función principal: scrape_rss_fuente(nombre, url) → list[dict]
Entry point:       run_all_feeds(persist=True) → list[dict]
"""
from __future__ import annotations

import hashlib
import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ── Registro de fuentes ───────────────────────────────────────────────────────

FUENTES_NICHO: list[dict[str, str]] = [
    # Think tanks europeos
    {
        "nombre": "ECFR",
        "url": "https://ecfr.eu/feed/",
        "nicho": "think_tank_eu",
        "idioma": "en",
        "pais_foco": "EUR",
    },
    {
        "nombre": "Chatham House",
        "url": "https://www.chathamhouse.org/rss.xml",
        "nicho": "think_tank_uk",
        "idioma": "en",
        "pais_foco": "GBR",
    },
    {
        "nombre": "IISS",
        "url": "https://www.iiss.org/en/rss/publications/",
        "nicho": "defensa_estrategia",
        "idioma": "en",
        "pais_foco": "GBR",
    },
    {
        "nombre": "Carnegie Endowment",
        "url": "https://carnegieendowment.org/rss/solr?category_ids[]=",
        "nicho": "think_tank_us",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "SIPRI",
        "url": "https://www.sipri.org/rss.xml",
        "nicho": "defensa_estrategia",
        "idioma": "en",
        "pais_foco": "SWE",
    },
    {
        "nombre": "RAND Corporation",
        "url": "https://www.rand.org/pubs/rss/commentary.xml",
        "nicho": "think_tank_us",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Crisis Group",
        "url": "https://www.crisisgroup.org/rss.xml",
        "nicho": "conflictos",
        "idioma": "en",
        "pais_foco": "BEL",
    },
    {
        "nombre": "FPRI",
        "url": "https://www.fpri.org/feed/",
        "nicho": "think_tank_us",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Stimson Center",
        "url": "https://www.stimson.org/feed/",
        "nicho": "think_tank_us",
        "idioma": "en",
        "pais_foco": "USA",
    },
    # Medios de defensa y seguridad
    {
        "nombre": "War on the Rocks",
        "url": "https://warontherocks.com/feed/",
        "nicho": "seguridad_defensa",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Lawfare",
        "url": "https://www.lawfareblog.com/rss.xml",
        "nicho": "seguridad_legal",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Defense One",
        "url": "https://www.defenseone.com/rss/all/",
        "nicho": "defensa_estrategia",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Breaking Defense",
        "url": "https://breakingdefense.com/feed/",
        "nicho": "defensa_industria",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "MWI West Point",
        "url": "https://mwi.westpoint.edu/feed/",
        "nicho": "doctrina_militar",
        "idioma": "en",
        "pais_foco": "USA",
    },
    # Investigación y OSINT
    {
        "nombre": "Bellingcat",
        "url": "https://www.bellingcat.com/feed/",
        "nicho": "osint",
        "idioma": "en",
        "pais_foco": "NLD",
    },
    {
        "nombre": "ACLED Blog",
        "url": "https://acleddata.com/feed/",
        "nicho": "conflictos",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "ISW",
        "url": "https://www.understandingwar.org/rss.xml",
        "nicho": "conflictos",
        "idioma": "en",
        "pais_foco": "USA",
    },
    {
        "nombre": "Soufan Center",
        "url": "https://thesoufancenter.org/feed/",
        "nicho": "terrorismo_extremismo",
        "idioma": "en",
        "pais_foco": "USA",
    },
    # Indo-Pacífico
    {
        "nombre": "Lowy Institute",
        "url": "https://www.lowyinstitute.org/rss.xml",
        "nicho": "think_tank_au",
        "idioma": "en",
        "pais_foco": "AUS",
    },
    {
        "nombre": "Al-Monitor",
        "url": "https://www.al-monitor.com/rss.xml",
        "nicho": "oriente_medio",
        "idioma": "en",
        "pais_foco": "USA",
    },
    # Think tanks españoles / hispanos
    {
        "nombre": "Real Instituto Elcano",
        "url": "https://www.realinstitutoelcano.org/rss/?lang=es",
        "nicho": "think_tank_es",
        "idioma": "es",
        "pais_foco": "ESP",
    },
    {
        "nombre": "CIDOB",
        "url": "https://www.cidob.org/es/rss/",
        "nicho": "think_tank_es",
        "idioma": "es",
        "pais_foco": "ESP",
    },
    {
        "nombre": "El Orden Mundial",
        "url": "https://elordenmundial.com/feed/",
        "nicho": "divulgacion_geo",
        "idioma": "es",
        "pais_foco": "ESP",
    },
    # OTAN / instituciones internacionales
    {
        "nombre": "NATO News",
        "url": "https://www.nato.int/cps/en/natolive/news.rss",
        "nicho": "otan",
        "idioma": "en",
        "pais_foco": "BEL",
    },
    {
        "nombre": "CSIS",
        "url": "https://www.csis.org/rss.xml",
        "nicho": "think_tank_us",
        "idioma": "en",
        "pais_foco": "USA",
    },
]


# ── Core scraper ──────────────────────────────────────────────────────────────

def scrape_rss_fuente(
    nombre: str,
    url: str,
    nicho: str = "geopolitica",
    idioma: str = "en",
    pais_foco: str = "",
    max_items: int = 30,
    timeout: int = 15,
) -> list[dict[str, Any]]:
    """
    Descarga y parsea un feed RSS/Atom.

    Retorna lista de dicts con campos normalizados:
      id_externo, titulo, url_articulo, descripcion, contenido,
      fecha_publicacion, nicho, idioma, fuente, pais_foco, hash_contenido
    """
    try:
        import feedparser  # type: ignore
    except ImportError:
        logger.error("feedparser no instalado — instala: pip install feedparser")
        return []

    try:
        import requests as _req
        # Usar requests para mejor control de timeout/headers
        resp = _req.get(
            url,
            timeout=timeout,
            headers={
                "User-Agent": "ElectSim/2.0 (geopolitics-module; contact@electsim.es)",
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
            },
        )
        resp.raise_for_status()
        feed_content = resp.content
    except Exception as exc:
        logger.warning("Error fetching %s (%s): %s", nombre, url, exc)
        return []

    try:
        feed = feedparser.parse(feed_content)
    except Exception as exc:
        logger.warning("Error parseando feed %s: %s", nombre, exc)
        return []

    items: list[dict[str, Any]] = []
    now_utc = datetime.now(tz=timezone.utc)

    for entry in feed.entries[:max_items]:
        titulo = _get_text(entry, "title")
        link = _get_text(entry, "link")
        if not titulo or not link:
            continue

        descripcion = _get_text(entry, "summary") or _get_text(entry, "description") or ""
        contenido = _get_content(entry) or descripcion

        # Fecha de publicación
        published = _parse_date(entry)

        # Hash para deduplicación
        hash_src = f"{link}_{titulo}"
        hash_contenido = hashlib.sha256(hash_src.encode("utf-8", errors="replace")).hexdigest()[:16]

        items.append({
            "id_externo": hash_contenido,
            "titulo": titulo[:500],
            "url_articulo": link[:2000],
            "descripcion": _truncate(descripcion, 1000),
            "contenido": _truncate(contenido, 5000),
            "fecha_publicacion": published or now_utc,
            "nicho": nicho,
            "idioma": idioma,
            "fuente": nombre,
            "pais_foco": pais_foco,
            "hash_contenido": hash_contenido,
            "scrapeado_at": now_utc,
        })

    logger.debug("Feed %s: %d items en %s", nombre, len(items), url)
    return items


# ── Helpers de parseo ─────────────────────────────────────────────────────────

def _get_text(entry: Any, field: str) -> str:
    val = getattr(entry, field, None)
    if val is None:
        return ""
    if isinstance(val, str):
        return val.strip()
    if isinstance(val, dict):
        return (val.get("value") or "").strip()
    return str(val).strip()


def _get_content(entry: Any) -> str:
    """Extrae el campo 'content' (Atom) o 'content:encoded' (RSS)."""
    content_list = getattr(entry, "content", None)
    if content_list and isinstance(content_list, list):
        for c in content_list:
            if isinstance(c, dict) and c.get("value"):
                return c["value"][:5000]
    return ""


def _parse_date(entry: Any) -> datetime | None:
    import struct
    import time as _time
    for field in ("published_parsed", "updated_parsed", "created_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                ts = _time.mktime(val)
                return datetime.fromtimestamp(ts, tz=timezone.utc)
            except (OverflowError, ValueError, struct.error):
                pass
    return None


def _truncate(text: str, max_len: int) -> str:
    if not text:
        return ""
    # Strip basic HTML tags
    import re
    clean = re.sub(r"<[^>]+>", " ", text)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:max_len]


# ── Persistencia ──────────────────────────────────────────────────────────────

def _upsert_items_to_db(items: list[dict[str, Any]]) -> int:
    """
    Inserta los items en osint_items (tabla existente del módulo geo).
    Usa ON CONFLICT (id_externo) DO NOTHING para idempotencia.
    """
    if not items:
        return 0

    try:
        import psycopg2
        from psycopg2.extras import execute_values
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            logger.warning("DATABASE_URL no configurada")
            return 0

        with psycopg2.connect(db_url) as conn:
            with conn.cursor() as cur:
                # Crear tabla si no existe (compatibilidad con entornos sin migración)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS osint_nicho_items (
                        id              BIGSERIAL PRIMARY KEY,
                        id_externo      VARCHAR(32) UNIQUE NOT NULL,
                        titulo          TEXT,
                        url_articulo    TEXT,
                        descripcion     TEXT,
                        contenido       TEXT,
                        fecha_publicacion TIMESTAMPTZ,
                        nicho           VARCHAR(50),
                        idioma          VARCHAR(10),
                        fuente          VARCHAR(100),
                        pais_foco       CHAR(3),
                        hash_contenido  VARCHAR(32),
                        urgencia        SMALLINT DEFAULT 2,
                        relevancia_es   SMALLINT DEFAULT 2,
                        scrapeado_at    TIMESTAMPTZ DEFAULT now(),
                        procesado       BOOLEAN DEFAULT false
                    )
                """)
                rows = [
                    (
                        it["id_externo"], it["titulo"], it["url_articulo"],
                        it["descripcion"], it["contenido"],
                        it["fecha_publicacion"], it["nicho"], it["idioma"],
                        it["fuente"], it.get("pais_foco", ""),
                        it["hash_contenido"], it["scrapeado_at"],
                    )
                    for it in items
                ]
                execute_values(cur, """
                    INSERT INTO osint_nicho_items
                        (id_externo, titulo, url_articulo, descripcion, contenido,
                         fecha_publicacion, nicho, idioma, fuente, pais_foco,
                         hash_contenido, scrapeado_at)
                    VALUES %s
                    ON CONFLICT (id_externo) DO NOTHING
                """, rows)
                conn.commit()
                return cur.rowcount
    except ImportError:
        logger.warning("psycopg2 no disponible")
        return 0
    except Exception as exc:
        logger.error("Error upsertando osint_nicho_items: %s", exc)
        return 0


# ── Entry point ───────────────────────────────────────────────────────────────

def run_all_feeds(
    persist: bool = True,
    max_items_per_feed: int = 20,
    delay_between_feeds: float = 0.5,
) -> list[dict[str, Any]]:
    """
    Scrapea todos los feeds del registro y opcionalmente los persiste.

    Returns: lista plana de todos los items scrapeados.
    """
    all_items: list[dict[str, Any]] = []
    errors: list[str] = []

    for fuente in FUENTES_NICHO:
        nombre = fuente["nombre"]
        try:
            items = scrape_rss_fuente(
                nombre=nombre,
                url=fuente["url"],
                nicho=fuente.get("nicho", "geopolitica"),
                idioma=fuente.get("idioma", "en"),
                pais_foco=fuente.get("pais_foco", ""),
                max_items=max_items_per_feed,
            )
            all_items.extend(items)
            logger.info("✓ %s: %d items", nombre, len(items))
        except Exception as exc:
            logger.warning("✗ %s: %s", nombre, exc)
            errors.append(nombre)

        if delay_between_feeds > 0:
            time.sleep(delay_between_feeds)

    logger.info(
        "Scraping completado: %d items de %d fuentes (%d errores)",
        len(all_items), len(FUENTES_NICHO), len(errors),
    )

    if persist and all_items:
        n = _upsert_items_to_db(all_items)
        logger.info("Persistidos en DB: %d items nuevos", n)

    return all_items


def get_items_by_nicho(
    nichos: list[str] | None = None,
    max_age_hours: int = 48,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Lee items recientes de osint_nicho_items filtrados por nicho.
    Útil para el dashboard sin tener que hacer scraping en tiempo real.
    """
    try:
        import psycopg2
        import psycopg2.extras
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            return []

        with psycopg2.connect(db_url) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if nichos:
                    cur.execute("""
                        SELECT id_externo, titulo, url_articulo, descripcion,
                               fecha_publicacion, nicho, idioma, fuente, pais_foco,
                               urgencia, relevancia_es, scrapeado_at
                        FROM osint_nicho_items
                        WHERE nicho = ANY(%s)
                          AND scrapeado_at > now() - interval '%s hours'
                        ORDER BY fecha_publicacion DESC
                        LIMIT %s
                    """, (nichos, max_age_hours, limit))
                else:
                    cur.execute("""
                        SELECT id_externo, titulo, url_articulo, descripcion,
                               fecha_publicacion, nicho, idioma, fuente, pais_foco,
                               urgencia, relevancia_es, scrapeado_at
                        FROM osint_nicho_items
                        WHERE scrapeado_at > now() - interval '%s hours'
                        ORDER BY fecha_publicacion DESC
                        LIMIT %s
                    """, (max_age_hours, limit))
                return [dict(r) for r in cur.fetchall()]
    except Exception as exc:
        logger.debug("get_items_by_nicho error: %s", exc)
        return []


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)s  %(message)s",
    )
    items = run_all_feeds(persist=False, max_items_per_feed=5)
    print(f"\nTotal items: {len(items)}")
    for it in items[:10]:
        print(f"  [{it['fuente']:25s}] {it['titulo'][:70]}")
