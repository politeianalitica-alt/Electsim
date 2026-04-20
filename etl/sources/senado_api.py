"""
Ingesta del Senado de España — Open Data.
Descarga actividad: enmiendas, proyectos, interpelaciones, mociones, preguntas.

Fuente: https://www.senado.es/datosabiertos

Uso:
    python -m etl.sources.senado_api              # todos los tipos
    python -m etl.sources.senado_api --tipos pnl  # tipo concreto
    python -m etl.sources.senado_api --dry
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    import requests
    _REQ_OK = True
except ImportError:
    _REQ_OK = False

try:
    import feedparser
    _FEED_OK = True
except ImportError:
    _FEED_OK = False

from etl.logger import get_logger  # noqa: E402

log = get_logger("senado_api")

# ── Fuentes del Senado ─────────────────────────────────────────────────────────

# API REST de datos abiertos del Senado (XML/JSON, legislatura 15)
SENADO_API_BASE  = "https://www.senado.es/datosabiertos/api"
SENADO_RSS_AGENDA = "https://www.senado.es/rss/senado.xml"

# El Senado también ofrece JSON por tipo de iniciativa
SENADO_ENDPOINTS: dict[str, str] = {
    "PNL":   "/iniciativas/proposiciones-no-de-ley",
    "PREG":  "/iniciativas/preguntas",
    "INTER": "/iniciativas/interpelaciones",
    "MOCI":  "/iniciativas/mociones",
    "ENMI":  "/enmiendas",
}

LEGISLATURA = 15

_HEADERS = {"User-Agent": "ElectSim/1.0 (research; contact: info@politeria.es)"}

GRUPO_PARTIDO_SENADO: dict[str, str] = {
    "Partido Popular": "PP",
    "GPP": "PP",
    "Grupo Popular": "PP",
    "Socialista": "PSOE",
    "GPS": "PSOE",
    "Grupo Socialista": "PSOE",
    "Vox": "VOX",
    "GS Vox": "VOX",
    "Sumar": "SUMAR",
    "Junts": "JUNTS",
    "ERC": "ERC",
    "Bildu": "BILDU",
    "PNV": "PNV",
    "Coalición Canaria": "CC",
    "BNG": "BNG",
    "Mixto": "OTROS",
}

STATUS_MAP: dict[str, str] = {
    "registrada": "REGISTERED",
    "admitida":   "ADMITTED",
    "comisión":   "IN_COMMISSION",
    "comision":   "IN_COMMISSION",
    "pleno":      "IN_PLENARY",
    "aprobada":   "APPROVED",
    "rechazada":  "REJECTED",
    "retirada":   "WITHDRAWN",
    "caducada":   "WITHDRAWN",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _partido(grupo: str) -> str:
    for k, v in GRUPO_PARTIDO_SENADO.items():
        if k.lower() in grupo.lower():
            return v
    return "OTROS"


def _parse_date(raw: str | None) -> Optional[str]:
    if not raw:
        return None
    s = str(raw).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(s[:10] if "T" not in fmt else s[:19], fmt).date().isoformat()
        except ValueError:
            continue
    return s[:10] if len(s) >= 10 else None


def _map_status(raw: str) -> str:
    r = (raw or "").lower()
    for k, v in STATUS_MAP.items():
        if k in r:
            return v
    return "REGISTERED"


def _content_hash(*parts: str) -> str:
    blob = "|".join(str(p).lower().strip() for p in parts)
    return hashlib.sha256(blob.encode()).hexdigest()


# ── Fetch ──────────────────────────────────────────────────────────────────────

def _get_json(url: str, params: dict | None = None) -> list[dict]:
    """GET + json, tolerante a fallos."""
    if not _REQ_OK:
        return []
    try:
        r = requests.get(url, params=params, headers=_HEADERS, timeout=30)
        if r.status_code != 200:
            log.warning("senado_api status=%d url=%s", r.status_code, url)
            return []
        data = r.json()
        if isinstance(data, list):
            return data
        # Busca lista en la primera clave que sea list
        for v in data.values():
            if isinstance(v, list):
                return v
        return []
    except Exception as exc:
        log.warning("senado_api_error url=%s err=%s", url, exc)
        return []


def fetch_senado_tipo(code: str, n: int = 200) -> list[dict]:
    """Descarga iniciativas del Senado para un tipo dado."""
    endpoint = SENADO_ENDPOINTS.get(code)
    if not endpoint:
        log.warning("tipo_no_soportado code=%s", code)
        return []

    url = f"{SENADO_API_BASE}{endpoint}"
    params = {"legislatura": LEGISLATURA, "limit": n, "format": "json"}
    items = _get_json(url, params)
    log.info("senado tipo=%s fetched=%d", code, len(items))
    return items


def fetch_senado_rss(limit: int = 30) -> list[dict]:
    """Fallback: extrae agenda/actividad del RSS general del Senado."""
    if not _FEED_OK:
        return []
    items: list[dict] = []
    try:
        feed = feedparser.parse(SENADO_RSS_AGENDA)
        for entry in getattr(feed, "entries", [])[:limit]:
            titulo = re.sub(r"<[^>]+>", " ", str(getattr(entry, "title", ""))).strip()
            if not titulo:
                continue
            resumen = re.sub(r"<[^>]+>", " ", str(getattr(entry, "summary", ""))).strip()
            url_e   = str(getattr(entry, "link", "")).strip()
            raw_d   = str(getattr(entry, "published", "")).strip()
            fecha   = raw_d[:10] if len(raw_d) >= 10 else date.today().isoformat()
            items.append({
                "_rss":    True,
                "titulo":  titulo,
                "resumen": resumen,
                "url":     url_e,
                "fecha":   fecha,
                "grupo":   "",
            })
        log.info("senado_rss fetched=%d", len(items))
    except Exception as exc:
        log.warning("senado_rss_error err=%s", exc)
    return items[:limit]


# ── Upsert ─────────────────────────────────────────────────────────────────────

def upsert_senado_iniciativas(items: list[dict], code: str, conn) -> int:
    """
    Inserta iniciativas del Senado en parliamentary_initiative.
    ON CONFLICT (url_congreso) para idempotencia.
    """
    from sqlalchemy import text as sa_text

    sql = sa_text("""
        INSERT INTO parliamentary_initiative
            (chamber, legislatura, initiative_type, title, summary,
             proponent_party, proponent_actor,
             submitted_at, status, last_stage_at,
             url_congreso, relevancia_score)
        VALUES
            ('senado', :legislatura, :initiative_type, :title, :summary,
             :proponent_party, :proponent_actor,
             :submitted_at::date, :status, :last_stage_at::date,
             :url_congreso, :relevancia_score)
        ON CONFLICT (url_congreso) DO UPDATE SET
            status        = EXCLUDED.status,
            last_stage_at = COALESCE(EXCLUDED.last_stage_at, parliamentary_initiative.last_stage_at)
        RETURNING (xmax = 0) AS inserted
    """)

    score_map = {"PNL": 55, "PREG": 40, "INTER": 60, "MOCI": 65, "ENMI": 50}
    score = score_map.get(code, 45)
    inserted = 0

    with conn.begin():
        for item in items:
            titulo  = str(item.get("titulo") or item.get("title") or "")[:500]
            if not titulo:
                continue
            grupo   = str(item.get("grupo") or item.get("grupoParlamentario") or "")
            partido = _partido(grupo)
            actor   = str(item.get("autor") or item.get("senador") or "")[:200] or None
            estado  = str(item.get("estado") or item.get("situacion") or "registrada")
            status  = _map_status(estado)
            fecha_s = _parse_date(item.get("fechaIniciativa") or item.get("fecha"))
            fecha_l = _parse_date(item.get("fechaUltimoTramite") or item.get("fechaEstado"))
            url     = str(item.get("url") or item.get("urlExpediente") or "")[:600] or None
            resumen = str(item.get("resumen") or item.get("descripcion") or "")[:600] or None

            # Si viene del RSS, usar contenido del campo especial
            if item.get("_rss"):
                url     = item.get("url") or None
                resumen = item.get("resumen") or None
                fecha_s = item.get("fecha")
                fecha_l = fecha_s

            try:
                result = conn.execute(sql, {
                    "legislatura":      LEGISLATURA,
                    "initiative_type":  code,
                    "title":            titulo,
                    "summary":          resumen,
                    "proponent_party":  partido,
                    "proponent_actor":  actor,
                    "submitted_at":     fecha_s or date.today().isoformat(),
                    "status":           status,
                    "last_stage_at":    fecha_l or fecha_s or date.today().isoformat(),
                    "url_congreso":     url,
                    "relevancia_score": score,
                })
                row = result.fetchone()
                if row and row[0]:
                    inserted += 1
            except Exception as exc:
                log.debug("skip_senado err=%s titulo=%s", exc, titulo[:60])
    return inserted


# ── CLI ────────────────────────────────────────────────────────────────────────

TIPOS_VALIDOS = list(SENADO_ENDPOINTS.keys())  # PNL, PREG, INTER, MOCI, ENMI


def main(tipos: list[str] | None = None, dry: bool = False) -> None:
    tipos_run = [t.upper() for t in tipos] if tipos else TIPOS_VALIDOS

    log.info("senado_api start tipos=%s dry=%s", tipos_run, dry)

    all_items: list[tuple[str, list[dict]]] = []
    for code in tipos_run:
        items = fetch_senado_tipo(code)
        if not items:
            # Fallback al RSS si no hay datos API
            log.info("senado_api sin items para %s, probando RSS", code)
            items = fetch_senado_rss(limit=25)
        all_items.append((code, items))
        time.sleep(1.0)

    if dry:
        print("=== SENADO (dry run) ===")
        for code, items in all_items:
            print(f"  [{code}] → {len(items)} items")
            for it in items[:2]:
                print(f"      · {str(it.get('titulo', ''))[:70]}")
        return

    try:
        from dashboard.db import get_engine
        engine = get_engine()
        total = 0
        with engine.connect() as conn:
            for code, items in all_items:
                n = upsert_senado_iniciativas(items, code, conn)
                log.info("  upserted code=%s new=%d", code, n)
                total += n
        print(f"Senado API ingested: {total} nuevas iniciativas.")
    except Exception as exc:
        log.error("upsert_failed err=%s", exc)
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest Senado open data → parliamentary_initiative")
    parser.add_argument("--tipos", nargs="+", default=None, choices=[t.lower() for t in TIPOS_VALIDOS],
                        help="Tipos a ingestar (por defecto todos)")
    parser.add_argument("--dry", action="store_true", help="Solo mostrar, no escribir en BD")
    args = parser.parse_args()
    main(tipos=args.tipos, dry=args.dry)
