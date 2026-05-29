#!/usr/bin/env python3
"""bin/fetch_declaraciones_congreso.py

Barre las fichas del Congreso (XV Legislatura) por codParlamentario y extrae el
ENLACE DIRECTO a la "Declaración de bienes y rentas" (PDF docbienes) y a la
declaración de intereses (docacteco) de cada diputado/a.

La ficha sólo se renderiza con la URL del portlet en fase render (lifecycle=0):
  …/busqueda-de-diputados?p_p_id=diputadomodule&p_p_lifecycle=0&…
    &_diputadomodule_mostrarFicha=true&codParlamentario={N}&idLegislatura=XV

Guarda un mapa en bin/declaraciones_congreso.json keyed por nombre normalizado:
  { "<norm>": {"nombre","cod","bienes_url","bienes_fecha","acteco_url"} }

Uso:  python3 bin/fetch_declaraciones_congreso.py [code_max]
"""
from __future__ import annotations

import json
import re
import ssl
import sys
import time
import unicodedata
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "bin" / "declaraciones_congreso.json"
BASE = "https://www.congreso.es"
TPL = (BASE + "/es/busqueda-de-diputados?p_p_id=diputadomodule&p_p_lifecycle=0"
       "&p_p_state=normal&p_p_mode=view&_diputadomodule_mostrarFicha=true"
       "&codParlamentario={cod}&idLegislatura=XV&mostrarAgenda=false")
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def norm_key(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def fetch(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        return urllib.request.urlopen(req, timeout=30, context=CTX).read().decode("utf-8", "ignore")
    except Exception:
        return None


def fecha_de(url: str) -> str:
    m = re.search(r"_(\d{8})\.pdf$", url)
    if not m:
        return ""
    y, mo, d = m.group(1)[:4], m.group(1)[4:6], m.group(1)[6:8]
    return f"{d}/{mo}/{y}"


def main() -> int:
    code_max = int(sys.argv[1]) if len(sys.argv) > 1 else 430
    out: dict[str, dict] = {}
    consecutivos_vacios = 0
    for cod in range(1, code_max + 1):
        h = fetch(TPL.format(cod=cod))
        if not h:
            continue
        title = (re.findall(r"<title>(.*?)</title>", h) or [""])[0].split(" - ")[0].strip()
        if not title or title.lower().startswith("búsqueda") or title.lower().startswith("busqueda"):
            consecutivos_vacios += 1
            # tras 20 códigos vacíos seguidos por encima de 400, paramos
            if cod > 400 and consecutivos_vacios > 20:
                break
            continue
        consecutivos_vacios = 0
        bienes = sorted(set(re.findall(r"/docbienes/leg15/\d+/[\w]+\.pdf", h)))
        acteco = sorted(set(re.findall(r"/docacteco/leg15/\d+/[\w]+\.pdf", h)))
        # elige la declaración de bienes con fecha más reciente
        bienes_url = max(bienes, key=lambda u: re.search(r"_(\d{8})\.pdf$", u).group(1) if re.search(r"_(\d{8})\.pdf$", u) else "") if bienes else ""
        acteco_url = max(acteco, key=lambda u: re.search(r"_(\d{8})\.pdf$", u).group(1) if re.search(r"_(\d{8})\.pdf$", u) else "") if acteco else ""
        rec = {
            "nombre": title,
            "cod": cod,
            "bienes_url": (BASE + bienes_url) if bienes_url else "",
            "bienes_fecha": fecha_de(bienes_url) if bienes_url else "",
            "acteco_url": (BASE + acteco_url) if acteco_url else "",
        }
        out[norm_key(title)] = rec
        if cod % 25 == 0:
            print(f"  · cod {cod} · acumulados {len(out)} (último: {title})", flush=True)
        time.sleep(0.05)
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    con_bienes = sum(1 for r in out.values() if r["bienes_url"])
    print(f"OK · {len(out)} fichas · {con_bienes} con declaración de bienes · -> {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
