#!/usr/bin/env python3
"""bin/patch_decl_cargos.py

Inserta el enlace oficial a la declaración de bienes/actividades en la ficha de
cargos NO parlamentarios (presidentes autonómicos, alcaldes, etc.), a partir del
mapa curado y verificado bin/declaraciones_cargos.json:
  { "<slug>": {"url","titulo","fuente","tipo": "pdf"|"pagina"} }

Busca cada slug en los JSON de dossieres (poder, ibex35, diputaciones) y le añade
(o actualiza) un apartado "evidencia" con el item de la declaración. Idempotente:
sustituye el item marcado con tag "decl-cargo".

Imprime qué ficheros (y por tanto qué fixtures) hay que regenerar.

Uso:  python3 bin/patch_decl_cargos.py
      # luego: python3 bin/gen_subfixture.py --source <poder|diputaciones|ibex35>
"""
from __future__ import annotations

import glob
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MAPA = REPO / "bin" / "declaraciones_cargos.json"
FILES = (
    glob.glob(str(REPO / "data" / "poder" / "*.json"))
    + glob.glob(str(REPO / "data" / "ibex35" / "*.json"))
    + [str(REPO / "data" / "diputaciones" / "complementos.json")]
)
# fichero -> fuente del gen_subfixture (para saber qué regenerar)
SRC = {"poder": "poder", "ibex35": "ibex35", "diputaciones": "diputaciones"}


def main() -> int:
    mapa = json.loads(MAPA.read_text("utf-8"))
    pendientes = set(mapa)
    fixtures_tocados = set()
    for f in FILES:
        try:
            arr = json.load(open(f, encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(arr, list):
            continue
        cambiado = False
        for d in arr:
            if not isinstance(d, dict):
                continue
            rec = mapa.get(d.get("slug"))
            if not rec:
                continue
            aps = d.setdefault("apartados", [])
            ev = next((a for a in aps if a.get("tipo") == "evidencia"), None)
            if not ev:
                ev = {"tipo": "evidencia", "orden": 6, "items": []}
                aps.append(ev)
            # idempotencia: quita items previos de este script
            ev["items"] = [it for it in ev["items"] if "decl-cargo" not in (it.get("tags") or [])]
            tags = ["patrimonio", "declaracion-bienes", "fuente-oficial", "decl-cargo"]
            if rec.get("tipo") == "pdf":
                tags.append("pdf-directo")
            contenido = ("Declaración de bienes y actividades del cargo, publicada por su administración. "
                         + ("Enlace directo al PDF oficial." if rec.get("tipo") == "pdf"
                            else "Enlace a la ficha oficial donde se publica la declaración."))
            ev["items"].insert(0, {
                "tipo": "documento",
                "titulo": rec["titulo"],
                "contenido": contenido,
                "fuente_url": rec["url"],
                "fuente_titulo": rec.get("fuente", "Fuente oficial"),
                "tags": tags,
            })
            d["completeness"] = max(d.get("completeness", 0) or 0, 0.95)
            cambiado = True
            pendientes.discard(d["slug"])
        if cambiado:
            json.dump(arr, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            for key in SRC:
                if f"/data/{key}/" in f:
                    fixtures_tocados.add(SRC[key])
            print(f"  escrito: {Path(f).name}")
    print(f"OK · {len(mapa) - len(pendientes)}/{len(mapa)} cargos enlazados")
    if pendientes:
        print(f"  · sin dossier encontrado: {sorted(pendientes)}")
    print(f"  · regenerar fixtures: {sorted(fixtures_tocados)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
