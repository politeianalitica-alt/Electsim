"""scripts/scrape_wikipedia_consejos_ibex.py

Scrapea los consejos de administración de las 35 empresas del IBEX 35
desde Wikipedia en español. Para cada empresa extrae:

  - Resumen / extract
  - Infobox (sede, fundación, presidente, CEO, ingresos, plantilla)
  - Si existe sección "Consejo de Administración" o tabla con consejeros:
    extrae nombres y cargos

Salida: data/ibex35/consejos_wikipedia.json — array con estructura por
empresa, listo para enriquecer dosieres_unificado.

NOTA: Esta es la alternativa pragmática a un scraper de CNMV (cuyo HTML
es 100% JS postback con datos en PDFs sin parser local instalado). La
cobertura por empresa varía: las grandes (Santander, BBVA, Iberdrola,
Inditex…) tienen consejos detallados en Wikipedia; las medianas (Rovi,
Fluidra, Solaria…) suelen tener menos detalle.

Uso:
    .venv/bin/python scripts/scrape_wikipedia_consejos_ibex.py --sample 5
    .venv/bin/python scripts/scrape_wikipedia_consejos_ibex.py --all
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from lxml import html as LH

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "ibex35" / "consejos_wikipedia.json"
UA = "ElectSim/0.2 (politeia-visual-oscar.vercel.app)"
HEADERS = {"User-Agent": UA, "Accept-Language": "es,en;q=0.5"}
API_BASE = "https://es.wikipedia.org/w/api.php"
SUMMARY_BASE = "https://es.wikipedia.org/api/rest_v1/page/summary/"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scrape_ibex")

# Mapping slug interno → título de Wikipedia
IBEX35 = {
    "inditex": "Inditex",
    "iberdrola": "Iberdrola",
    "banco-santander": "Banco Santander",
    "bbva": "BBVA",
    "caixabank": "CaixaBank",
    "telefonica": "Telefónica",
    "repsol": "Repsol",
    "aena": "Aena",
    "endesa": "Endesa",
    "naturgy": "Naturgy",
    "ferrovial": "Ferrovial",
    "amadeus-it-group": "Amadeus IT Group",
    "cellnex-telecom": "Cellnex Telecom",
    "acs": "Grupo ACS",
    "banco-sabadell": "Banco Sabadell",
    "bankinter": "Bankinter",
    "mapfre": "Mapfre",
    "redeia": "Redeia",
    "enagas": "Enagás",
    "acciona": "Acciona",
    "acciona-energia": "Acciona Energía",
    "logista": "Logista",
    "merlin-properties": "Merlin Properties",
    "inmobiliaria-colonial": "Inmobiliaria Colonial",
    "arcelormittal": "ArcelorMittal",
    "iag": "International Airlines Group",
    "grifols": "Grifols",
    "indra": "Indra Sistemas",
    "acerinox": "Acerinox",
    "sacyr": "Sacyr",
    "fluidra": "Fluidra",
    "rovi": "Laboratorios Farmacéuticos Rovi",
    "solaria": "Solaria Energía y Medio Ambiente",
    "unicaja": "Unicaja Banco",
    "puig": "Puig (empresa)",
}


def fetch_summary(title: str) -> dict[str, Any] | None:
    url = SUMMARY_BASE + requests.utils.quote(title, safe="")
    r = requests.get(url, headers=HEADERS, timeout=15)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def fetch_parsed_html(title: str) -> str | None:
    params = {"action": "parse", "page": title, "format": "json",
              "prop": "text", "redirects": 1}
    r = requests.get(API_BASE, params=params, headers=HEADERS, timeout=20)
    r.raise_for_status()
    j = r.json()
    if "error" in j:
        log.warning("API error para %s: %s", title, j["error"].get("info"))
        return None
    return j.get("parse", {}).get("text", {}).get("*")


def extract_infobox(doc) -> dict[str, str]:
    out: dict[str, str] = {}
    for tbl in doc.xpath("//table[contains(@class,'infobox')]"):
        for row in tbl.xpath(".//tr"):
            ths = row.xpath("./th")
            tds = row.xpath("./td")
            if len(ths) == 1 and len(tds) == 1:
                key = " ".join(ths[0].text_content().split())
                val = " ".join(tds[0].text_content().split())
                if key and val and len(key) < 80:
                    out[key.lower()] = val
        if out:
            break
    return out


def extract_consejeros(doc) -> list[dict[str, str]]:
    """Busca listas o tablas que parezcan listas de consejeros."""
    out: list[dict[str, str]] = []
    # 1) Tablas con headers que mencionen consejo/consejero
    for tbl in doc.xpath("//table[contains(@class,'wikitable')]"):
        text = tbl.text_content().lower()
        if not any(kw in text for kw in (
            "consejero", "consejera", "consejo de administración",
            "miembros del consejo", "presidente", "director general",
            "ceo", "vicepresidente",
        )):
            continue
        headers = [h.text_content().strip() for h in tbl.xpath(".//tr/th")]
        # tomar filas de td
        for row in tbl.xpath(".//tr"):
            cells = [c.text_content().strip() for c in row.xpath("./td")]
            if len(cells) >= 2 and any(
                re.search(r"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+", c) for c in cells
            ):
                out.append({
                    "raw": " | ".join(cells),
                    "headers": " | ".join(headers) if headers else None,
                })
        if out:
            break
    # 2) Listas <ul> después de un h2/h3 que diga "Consejo"
    if not out:
        for heading in doc.xpath("//h2|//h3"):
            txt = heading.text_content().lower()
            if "consejo" in txt and "administración" in txt:
                # siguientes ul hasta el próximo h2/h3
                el = heading.getnext()
                while el is not None and el.tag not in ("h2", "h3"):
                    if el.tag == "ul":
                        for li in el.xpath("./li"):
                            t = " ".join(li.text_content().split())
                            if t:
                                out.append({"raw": t, "headers": None})
                    el = el.getnext()
                if out:
                    break
    return out


def scrape_one(slug: str, title: str) -> dict[str, Any]:
    result: dict[str, Any] = {
        "slug": slug,
        "wikipedia_title": title,
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "source": "wikipedia_es",
    }
    try:
        s = fetch_summary(title)
        if s:
            result["summary_extract"] = s.get("extract")
            result["description"] = s.get("description")
            result["thumbnail_url"] = (s.get("thumbnail") or {}).get("source")
            result["canonical_url"] = (s.get("content_urls") or {}).get("desktop", {}).get("page")
    except Exception as e:
        log.warning("Summary falló: %s · %s", title, e)
    try:
        html_text = fetch_parsed_html(title)
        if html_text:
            doc = LH.fromstring(html_text)
            result["infobox"] = extract_infobox(doc)
            result["consejeros_raw"] = extract_consejeros(doc)
            result["scrape_ok"] = True
        else:
            result["scrape_ok"] = False
    except Exception as e:
        log.warning("HTML falló: %s · %s", title, e)
        result["scrape_ok"] = False
        result["error"] = str(e)
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int)
    parser.add_argument("--only", help="CSV de slugs")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--out", default=str(OUT))
    parser.add_argument("--throttle", type=float, default=1.8)
    args = parser.parse_args()

    if args.only:
        targets = {s.strip(): IBEX35[s.strip()] for s in args.only.split(",")}
    elif args.sample:
        targets = dict(list(IBEX35.items())[: args.sample])
    elif args.all:
        targets = IBEX35
    else:
        parser.error("Indica --sample N | --only csv | --all")
        return 2

    log.info("Scrapeando %d empresas IBEX 35 (throttle %.1fs)",
             len(targets), args.throttle)
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
    n_consejeros = sum(1 for r in results if r.get("consejeros_raw"))
    total_consejeros = sum(len(r.get("consejeros_raw") or []) for r in results)
    log.info("=" * 60)
    log.info("Volcadas %d entradas en %s", len(results), out_path)
    log.info("  scrape_ok:           %d / %d", n_ok, len(results))
    log.info("  con infobox:         %d", n_infobox)
    log.info("  con consejeros:      %d empresas (%d items total)",
             n_consejeros, total_consejeros)
    return 0


if __name__ == "__main__":
    sys.exit(main())
