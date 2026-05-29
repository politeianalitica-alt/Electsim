#!/usr/bin/env python3
"""bin/patch_decl_links_congreso.py

Inserta el ENLACE DIRECTO al PDF de la declaración de bienes y rentas (y al de
actividades/intereses) en la ficha de cada diputado de data/congreso/diputados.json,
usando el mapa generado por fetch_declaraciones_congreso.py.

Es quirúrgico: solo toca los items de "Declaración…" del apartado evidencia,
sin re-descargar el open data ni alterar el resto (preserva bios y parches).
Idempotente.

Uso:  python3 bin/patch_decl_links_congreso.py && python3 bin/gen_subfixture.py --source congreso
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DIPS = REPO / "data" / "congreso" / "diputados.json"
DECL = REPO / "bin" / "declaraciones_congreso.json"

TITS_OLD = {
    "Declaración de bienes y rentas (oficial)",
    "Declaración de bienes y rentas (PDF oficial)",
    "Declaración de actividades e intereses (PDF oficial)",
}


def nk(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def main() -> int:
    dips = json.load(open(DIPS, encoding="utf-8"))
    decl = json.load(open(DECL, encoding="utf-8"))
    matched = 0
    for d in dips:
        ev = next((a for a in d.get("apartados", []) if a.get("tipo") == "evidencia"), None)
        if not ev:
            continue
        # quita los items de declaración previos (idempotencia)
        ev["items"] = [it for it in ev["items"] if it.get("titulo") not in TITS_OLD]
        rec = decl.get(nk(d.get("nombre", "")))
        nuevos = []
        if rec and rec.get("bienes_url"):
            fecha = rec.get("bienes_fecha", "")
            nuevos.append({
                "tipo": "documento", "titulo": "Declaración de bienes y rentas (PDF oficial)",
                "contenido": (f"Declaración de bienes y rentas presentada ante el Congreso (XV Legislatura)"
                              f"{f', última versión registrada el {fecha}' if fecha else ''}. "
                              "Enlace directo al PDF oficial publicado por el Congreso de los Diputados."),
                "fecha": fecha,
                "fuente_url": rec["bienes_url"],
                "fuente_titulo": "Congreso · Declaración de bienes y rentas (PDF oficial)",
                "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial", "pdf-directo"],
            })
            if rec.get("acteco_url"):
                nuevos.append({
                    "tipo": "documento", "titulo": "Declaración de actividades e intereses (PDF oficial)",
                    "contenido": "Declaración de actividades y bienes patrimoniales (intereses económicos) registrada en el Congreso. Enlace directo al PDF oficial.",
                    "fecha": fecha,
                    "fuente_url": rec["acteco_url"],
                    "fuente_titulo": "Congreso · Declaración de actividades (PDF oficial)",
                    "tags": ["intereses", "declaracion-actividades", "fuente-oficial", "pdf-directo"],
                })
            matched += 1
        else:
            # sin enlace directo: deja el enlace oficial genérico (no rompemos nada)
            nuevos.append({
                "tipo": "documento", "titulo": "Declaración de bienes y rentas (oficial)",
                "contenido": "Declaración de bienes y rentas presentada ante el Congreso en la XV Legislatura. Consúltese en la ficha oficial del diputado en el Congreso.",
                "fuente_url": "https://www.congreso.es/es/busqueda-de-diputados",
                "fuente_titulo": "Congreso · Declaraciones de bienes y rentas",
                "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial"],
            })
        ev["items"] = nuevos + ev["items"]
    json.dump(dips, open(DIPS, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"OK · {matched}/{len(dips)} diputados con enlace directo al PDF · {len(dips)-matched} sin coincidencia")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
