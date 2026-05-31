#!/usr/bin/env python3
"""bin/patch_wikidata_enrich.py

Aplica el enriquecimiento de bin/enrich_wikidata_<source>.json a los dossieres:
añade al apartado 'trayectoria' un item con una narrativa FACTUAL construida solo
con datos públicos de Wikidata (CC0): nacimiento, partido, formación, cargos
ocupados con fechas y relevos (predecesor/sucesor = conexiones reales). Cita el
enlace a Wikidata y a Wikipedia. NO copia texto de Wikipedia (respeta copyright).

Idempotente: sustituye los items previos marcados con el tag 'wikidata-enrich'.
No toca el resto del dossier (perfil oficial, declaraciones, etc.).

Uso:  python3 bin/patch_wikidata_enrich.py --source senado
      # luego: python3 bin/gen_subfixture.py --source senado
"""
from __future__ import annotations

import argparse
import glob
import json
import re
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SOURCES = {
    "senado": [REPO / "data" / "senado" / "senadores.json"],
    "congreso": [REPO / "data" / "congreso" / "diputados.json"],
    "poder": sorted(glob.glob(str(REPO / "data" / "poder" / "figuras_clave*.json"))),
    "ibex35": sorted(glob.glob(str(REPO / "data" / "ibex35" / "*.json"))),
    "diputaciones": sorted(glob.glob(str(REPO / "data" / "diputaciones" / "*.json"))),
}
TAG = "wikidata-enrich"


def nk(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def _dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def narrative(rec: dict, L: dict) -> tuple[str, int]:
    """Devuelve (texto, nº de datos sólidos). Solo hechos resolubles."""
    name = rec["nombre"]
    parts, solid = [], 0

    nac = ""
    if rec.get("nacimiento"):
        lugar = L.get(rec.get("lugar_nacimiento_q") or "", "")
        nac = f" (n. {rec['nacimiento']}{', ' + lugar if lugar else ''})"
        solid += 1
    occ = _dedupe([L[q] for q in rec.get("ocupacion_q", []) if L.get(q)])
    s1 = f"{name}{nac}" + (f" — {', '.join(occ[:3])}." if occ else ".")
    parts.append(s1)

    parties = _dedupe([L[q] for q in rec.get("partido_q", []) if L.get(q)])
    if parties:
        parts.append(f"Afiliación política: {', '.join(parties)}.")
        solid += 1
    edu = _dedupe([L[q] for q in rec.get("formacion_q", []) if L.get(q)])
    if edu:
        parts.append(f"Formación: {', '.join(edu[:3])}.")
        solid += 1

    cl = []
    for p in rec.get("cargos", []):
        c = L.get(p["cargo"])
        if not c:
            continue
        d, h = p.get("desde"), p.get("hasta")
        rng = f" ({d}–{h})" if d and h else (f" (desde {d})" if d else (f" (hasta {h})" if h else ""))
        cl.append(c + rng)
    cl = _dedupe(cl)
    if cl:
        parts.append("Cargos públicos registrados: " + " · ".join(cl[:14]) + ".")
        solid += len(cl)

    succ = []
    for p in rec.get("cargos", []):
        c = L.get(p["cargo"]) or "el cargo"
        if p.get("reemplaza") and L.get(p["reemplaza"]):
            succ.append(f"en «{c}» sucedió a {L[p['reemplaza']]}")
        if p.get("reemplazado_por") and L.get(p["reemplazado_por"]):
            succ.append(f"en «{c}» fue sucedido por {L[p['reemplazado_por']]}")
    succ = _dedupe(succ)
    if succ:
        parts.append("Relevos en el cargo: " + "; ".join(succ[:6]) + ".")
        solid += len(succ)

    return " ".join(parts), solid


def patch_dossier(d: dict, rec: dict, L: dict) -> bool:
    texto, solid = narrative(rec, L)
    if solid < 1:   # sin hechos sólidos, no añadimos nada
        return False
    src = rec.get("wikipedia_url") or rec.get("wikidata_url")
    src_tit = "Wikipedia (es) · datos públicos verificables" if rec.get("wikipedia_url") \
        else "Wikidata (CC0) · datos públicos verificables"
    item = {
        "tipo": "evento",
        "titulo": "Trayectoria y cargos públicos (datos abiertos)",
        "contenido": texto + " · Fuente de datos estructurados: Wikidata (CC0). "
        + (f"Ficha: {rec['wikidata_url']}." if rec.get("wikidata_url") else ""),
        "fuente_url": src,
        "fuente_titulo": src_tit,
        "tags": ["trayectoria", "datos-publicos", "fuente-oficial", TAG],
    }
    aps = d.setdefault("apartados", [])
    tray = next((a for a in aps if a.get("tipo") == "trayectoria"), None)
    if not tray:
        tray = {"tipo": "trayectoria", "orden": 1, "items": []}
        aps.append(tray)
    tray["items"] = [it for it in tray["items"] if TAG not in (it.get("tags") or [])]
    tray["items"].insert(0, item)
    d["completeness"] = max(d.get("completeness", 0) or 0, 0.8)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=list(SOURCES), required=True)
    args = ap.parse_args()

    cache_path = REPO / "bin" / f"enrich_wikidata_{args.source}.json"
    if not cache_path.exists():
        print(f"! no existe {cache_path.relative_to(REPO)} — corre fetch primero")
        return 1
    cache = json.loads(cache_path.read_text("utf-8"))
    L = cache.get("_labels", {})

    patched = 0
    for f in SOURCES[args.source]:
        try:
            arr = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(arr, list):
            continue
        changed = False
        for d in arr:
            if not isinstance(d, dict) or not d.get("nombre"):
                continue
            rec = cache.get(nk(d["nombre"]))
            if not rec or rec.get("_skip"):
                continue
            if patch_dossier(d, rec, L):
                patched += 1
                changed = True
        if changed:
            json.dump(arr, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            print(f"  escrito: {Path(f).name}")
    print(f"OK · {patched} dossieres enriquecidos · regenera: python3 bin/gen_subfixture.py --source {args.source}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
