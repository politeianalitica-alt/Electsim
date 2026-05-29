#!/usr/bin/env python3
"""bin/decl_links_senado.py

Inserta en cada ficha de senador (data/senado/senadores.json) el enlace directo a:
  · Declaración de ACTIVIDADES  -> PDF oficial  (…/legis15/senadores/regact/RA_15_{cred}_{n}.pdf)
  · Declaración de BIENES patrimoniales y rentas -> servlet XML oficial del Senado

La sección de declaraciones del Senado se renderiza server-side y empareja, por
credencial, el PDF de actividades con el expediente de bienes. Cruzamos credencial
-> nombre con el open data (ficopendataservlet tipoFich=10, legis 15).

Quirúrgico e idempotente. Guarda también un cache en bin/declaraciones_senado.json.

Uso:  python3 bin/decl_links_senado.py && python3 bin/gen_subfixture.py --source senado
"""
from __future__ import annotations

import json
import re
import ssl
import unicodedata
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SEN = REPO / "data" / "senado" / "senadores.json"
CACHE = REPO / "bin" / "declaraciones_senado.json"
BASE = "https://www.senado.es"
SECCION = BASE + "/web/composicionorganizacion/senadores/declaracionbienesactividades/index.html"
XML = BASE + "/web/ficopendataservlet?tipoFich=10&legis=15"
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

TITS_OLD = {
    "Declaración de actividades, bienes y rentas (oficial)",
    "Declaración de actividades (PDF oficial)",
    "Declaración de bienes patrimoniales y rentas (XML oficial)",
}


def nk(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def fetch(url: str) -> str:
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
                                  timeout=90, context=CTX).read().decode("utf-8", "ignore")


def cd(tag: str, blk: str) -> str:
    m = re.search(rf"<{tag}><!\[CDATA\[(.*?)\]\]></{tag}>", blk, re.S)
    return m.group(1).strip() if m else ""


def main() -> int:
    # 1) credencial -> nombre (leg 15)
    xml = fetch(XML)
    cred2name: dict[int, str] = {}
    for b in re.findall(r"<senador>(.*?)</senador>", xml, re.S):
        if cd("legislatura", b) != "15":
            continue
        cred = cd("ultCredencial", b)
        nom, ape = cd("nombre", b).title(), cd("apellidos", b).title()
        if cred.isdigit():
            cred2name[int(cred)] = f"{nom} {ape}".strip()

    # 2) sección de declaraciones -> por credencial: PDF actividades (última versión) + servlet bienes
    h = fetch(SECCION)
    acts: dict[int, tuple[str, int]] = {}
    for path, cred, ver in re.findall(r"(/legis15/senadores/regact/RA_15_(\d+)_(\d+)\.pdf)", h):
        c = int(cred)
        if c not in acts or int(ver) > acts[c][1]:
            acts[c] = (BASE + path, int(ver))
    bienes: dict[int, str] = {}
    for cred, sid in re.findall(r"RA_15_(\d+)_\d+\.pdf.{0,400}?expedientxmlclobservlet\?legis=15&id=(\d+)", h, re.S):
        bienes.setdefault(int(cred), f"{BASE}/web/expedientxmlclobservlet?legis=15&id={sid}")

    cache: dict[str, dict] = {}
    for cred, name in cred2name.items():
        a = acts.get(cred)
        b = bienes.get(cred)
        if a or b:
            cache[nk(name)] = {"nombre": name, "cred": cred,
                               "actividades_url": a[0] if a else "", "bienes_url": b or ""}
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # 3) patch senadores.json
    sens = json.load(open(SEN, encoding="utf-8"))
    matched = 0
    for d in sens:
        ev = next((a for a in d.get("apartados", []) if a.get("tipo") == "evidencia"), None)
        if not ev:
            continue
        ev["items"] = [it for it in ev["items"] if it.get("titulo") not in TITS_OLD]
        rec = cache.get(nk(d.get("nombre", "")))
        nuevos = []
        if rec and (rec["bienes_url"] or rec["actividades_url"]):
            if rec["bienes_url"]:
                nuevos.append({
                    "tipo": "documento", "titulo": "Declaración de bienes patrimoniales y rentas (XML oficial)",
                    "contenido": "Declaración de bienes patrimoniales y rentas presentada en el Senado (XV Legislatura). Enlace directo al documento oficial publicado por el Senado.",
                    "fuente_url": rec["bienes_url"],
                    "fuente_titulo": "Senado · Declaración de bienes patrimoniales y rentas",
                    "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial", "directo"],
                })
            if rec["actividades_url"]:
                nuevos.append({
                    "tipo": "documento", "titulo": "Declaración de actividades (PDF oficial)",
                    "contenido": "Declaración de actividades presentada en el Senado (XV Legislatura). Enlace directo al PDF oficial publicado por el Senado.",
                    "fuente_url": rec["actividades_url"],
                    "fuente_titulo": "Senado · Declaración de actividades (PDF oficial)",
                    "tags": ["intereses", "declaracion-actividades", "fuente-oficial", "pdf-directo"],
                })
            matched += 1
        else:
            nuevos.append({
                "tipo": "documento", "titulo": "Declaración de actividades, bienes y rentas (oficial)",
                "contenido": "Declaración de actividades, bienes patrimoniales y rentas registrada en el Senado. Consúltese en la sección oficial de declaraciones.",
                "fuente_url": BASE + "/web/composicionorganizacion/senadores/declaracionbienesactividades/index.html",
                "fuente_titulo": "Senado · Declaraciones de bienes y actividades",
                "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial"],
            })
        ev["items"] = nuevos + ev["items"]
    json.dump(sens, open(SEN, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"OK · {len(cache)} declaraciones · {matched}/{len(sens)} senadores con enlace directo")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
