"""scripts/scrape_wikipedia_diputaciones.py

Scrapea las 41 Diputaciones (38 Provinciales + 3 Forales) desde Wikipedia
en español. Para cada una extrae:

  - Resumen / extract de Wikipedia
  - Infobox (presidente, partido, sede, web oficial, año fundación,
    población, presupuesto)
  - Composición política si está disponible en la página

Salida: data/diputaciones/composicion_wikipedia.json — un array de objetos
con los datos extraídos + metadatos de fuente (URL, fecha de scrape,
confidence).

Uso:
    .venv/bin/python scripts/scrape_wikipedia_diputaciones.py --sample 5
    .venv/bin/python scripts/scrape_wikipedia_diputaciones.py --all
    .venv/bin/python scripts/scrape_wikipedia_diputaciones.py --only "diputacion-sevilla,diputacion-malaga"

Requiere conexión a internet (Wikipedia REST API + parse API).
Sin BeautifulSoup: usa `requests` + `lxml.html`.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import requests
from lxml import html as lxml_html

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "diputaciones" / "composicion_wikipedia.json"

UA = "ElectSim/0.2 (politeia-visual-oscar.vercel.app · contacto: oscar)"
HEADERS = {"User-Agent": UA, "Accept-Language": "es,en;q=0.5"}

API_BASE = "https://es.wikipedia.org/w/api.php"
SUMMARY_BASE = "https://es.wikipedia.org/api/rest_v1/page/summary/"

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)-7s %(message)s", datefmt="%H:%M:%S"
)
log = logging.getLogger("scrape_wikipedia")


# Mapping slug interno → título de Wikipedia (artículo en es.wikipedia.org).
# Verificado manualmente al construir el script; algunos títulos divergen
# del patrón estándar.
DIPUTACIONES = {
    # ─── Andalucía ────────────────────────────────────────────────────
    "diputacion-almeria": "Diputación Provincial de Almería",
    "diputacion-cadiz": "Diputación Provincial de Cádiz",
    "diputacion-cordoba": "Diputación Provincial de Córdoba (España)",
    "diputacion-granada": "Diputación Provincial de Granada",
    "diputacion-huelva": "Diputación Provincial de Huelva",
    "diputacion-jaen": "Diputación Provincial de Jaén",
    "diputacion-malaga": "Diputación Provincial de Málaga",
    "diputacion-sevilla": "Diputación Provincial de Sevilla",
    # ─── Aragón ───────────────────────────────────────────────────────
    "diputacion-huesca": "Diputación Provincial de Huesca",
    "diputacion-teruel": "Diputación Provincial de Teruel",
    "diputacion-zaragoza": "Diputación Provincial de Zaragoza",
    # ─── Castilla y León ──────────────────────────────────────────────
    "diputacion-avila": "Diputación Provincial de Ávila",
    "diputacion-burgos": "Diputación Provincial de Burgos",
    "diputacion-leon": "Diputación Provincial de León",
    "diputacion-palencia": "Diputación Provincial de Palencia",
    "diputacion-salamanca": "Diputación Provincial de Salamanca",
    "diputacion-segovia": "Diputación Provincial de Segovia",
    "diputacion-soria": "Diputación Provincial de Soria",
    "diputacion-valladolid": "Diputación Provincial de Valladolid",
    "diputacion-zamora": "Diputación Provincial de Zamora",
    # ─── Castilla-La Mancha ───────────────────────────────────────────
    "diputacion-albacete": "Diputación Provincial de Albacete",
    "diputacion-ciudad-real": "Diputación Provincial de Ciudad Real",
    "diputacion-cuenca": "Diputación Provincial de Cuenca",
    "diputacion-guadalajara": "Diputación Provincial de Guadalajara",
    "diputacion-toledo": "Diputación Provincial de Toledo",
    # ─── Cataluña ─────────────────────────────────────────────────────
    "diputacio-barcelona": "Diputación de Barcelona",
    "diputacio-girona": "Diputación de Gerona",
    "diputacio-lleida": "Diputación de Lérida",
    "diputacio-tarragona": "Diputación de Tarragona",
    # ─── Comunidad Valenciana ────────────────────────────────────────
    "diputacio-alacant": "Diputación Provincial de Alicante",
    "diputacio-castello": "Diputación Provincial de Castellón",
    "diputacio-valencia": "Diputación Provincial de Valencia",
    # ─── Extremadura ──────────────────────────────────────────────────
    "diputacion-badajoz": "Diputación Provincial de Badajoz",
    "diputacion-caceres": "Diputación Provincial de Cáceres",
    # ─── Galicia ──────────────────────────────────────────────────────
    "deputacion-coruna": "Diputación Provincial de La Coruña",
    "deputacion-lugo": "Diputación Provincial de Lugo",
    "deputacion-ourense": "Diputación Provincial de Orense",
    "deputacion-pontevedra": "Diputación Provincial de Pontevedra",
    # ─── Diputaciones Forales (País Vasco) ────────────────────────────
    "diputacion-foral-alava": "Diputación Foral de Álava",
    "diputacion-foral-bizkaia": "Diputación Foral de Vizcaya",
    "diputacion-foral-gipuzkoa": "Diputación Foral de Guipúzcoa",
}


# ─── Helpers ──────────────────────────────────────────────────────────
def fetch_summary(title: str) -> dict[str, Any] | None:
    """REST API summary: extract, descripción corta, URL canónica, imagen."""
    url = SUMMARY_BASE + requests.utils.quote(title, safe="")
    r = requests.get(url, headers=HEADERS, timeout=15)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def fetch_parsed_html(title: str) -> str | None:
    """Devuelve el HTML completo de la página parsed via API action=parse."""
    params = {
        "action": "parse",
        "page": title,
        "format": "json",
        "prop": "text",
        "redirects": 1,
    }
    r = requests.get(API_BASE, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    j = r.json()
    if "error" in j:
        log.warning("API error para %s: %s", title, j["error"].get("info"))
        return None
    return j.get("parse", {}).get("text", {}).get("*")


def extract_infobox(doc) -> dict[str, str]:
    """Extrae key/value de la infobox de Wikipedia (vía XPath; sin cssselect)."""
    out: dict[str, str] = {}
    tablas = doc.xpath("//table[contains(@class,'infobox')]")
    for tbl in tablas:
        for row in tbl.xpath(".//tr"):
            ths = row.xpath("./th")
            tds = row.xpath("./td")
            if len(ths) == 1 and len(tds) == 1:
                key = " ".join(ths[0].text_content().split()).strip()
                val = " ".join(tds[0].text_content().split()).strip()
                if key and val and len(key) < 80:
                    out[key.lower()] = val
        if out:
            break  # solo primera infobox
    return out


def extract_composicion(doc) -> list[dict[str, str]]:
    """Busca tablas con encabezados que sugieran composición política."""
    out = []
    for tbl in doc.xpath("//table[contains(@class,'wikitable')]"):
        text = tbl.text_content().lower()
        if not any(
            kw in text for kw in ("partido", "grupo", "escaños", "diputados", "composición")
        ):
            continue
        headers = [th.text_content().strip() for th in tbl.xpath(".//tr/th")]
        if not headers:
            continue
        for row in tbl.xpath(".//tr"):
            cells = [c.text_content().strip() for c in row.xpath("./td")]
            if len(cells) >= 2:
                out.append({"raw": " | ".join(cells)})
        if out:
            break
    return out


def scrape_one(slug: str, title: str) -> dict[str, Any]:
    """Scrapea una diputación. Devuelve dict con datos extraídos."""
    result: dict[str, Any] = {
        "slug": slug,
        "wikipedia_title": title,
        "scraped_at": datetime.now(UTC).isoformat(),
        "source": "wikipedia_es",
    }
    # 1) Summary (rest API · rápido)
    try:
        s = fetch_summary(title)
        if s:
            result["summary_extract"] = s.get("extract")
            result["description"] = s.get("description")
            result["thumbnail_url"] = (s.get("thumbnail") or {}).get("source")
            result["canonical_url"] = s.get("content_urls", {}).get("desktop", {}).get("page")
    except Exception as e:
        log.warning("Summary falló para %s: %s", title, e)

    # 2) HTML para infobox y composición
    try:
        html_text = fetch_parsed_html(title)
        if html_text:
            doc = lxml_html.fromstring(html_text)
            result["infobox"] = extract_infobox(doc)
            result["composicion_raw"] = extract_composicion(doc)
            result["scrape_ok"] = True
        else:
            result["scrape_ok"] = False
    except Exception as e:
        log.warning("HTML falló para %s: %s", title, e)
        result["scrape_ok"] = False
        result["error"] = str(e)

    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, help="Sólo las primeras N")
    parser.add_argument("--only", help="CSV de slugs a scrapear")
    parser.add_argument("--all", action="store_true", help="Las 41")
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument(
        "--throttle", type=float, default=1.0, help="Segundos entre requests (default 1.0)"
    )
    args = parser.parse_args()

    if args.only:
        targets = {s.strip(): DIPUTACIONES[s.strip()] for s in args.only.split(",")}
    elif args.sample:
        targets = dict(list(DIPUTACIONES.items())[: args.sample])
    elif args.all:
        targets = DIPUTACIONES
    else:
        parser.error("Indica --sample N | --only slug,slug | --all")
        return 2

    log.info("Scrapeando %d diputaciones de Wikipedia", len(targets))
    results = []
    for i, (slug, title) in enumerate(targets.items(), 1):
        log.info("[%d/%d] %s → %s", i, len(targets), slug, title)
        results.append(scrape_one(slug, title))
        time.sleep(args.throttle)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as fh:
        json.dump(results, fh, ensure_ascii=False, indent=2)

    n_ok = sum(1 for r in results if r.get("scrape_ok"))
    n_infobox = sum(1 for r in results if r.get("infobox"))
    n_compo = sum(1 for r in results if r.get("composicion_raw"))
    log.info("=" * 60)
    log.info("Volcadas %d entradas en %s", len(results), out_path)
    log.info("  scrape_ok:      %d / %d", n_ok, len(results))
    log.info("  con infobox:    %d", n_infobox)
    log.info("  con composición: %d", n_compo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
