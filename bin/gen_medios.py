#!/usr/bin/env python3
"""bin/gen_medios.py

Genera data/medios/medios.json (shape seed de gen_subfixture) a partir de la
lista curada data/medios/periodistas.json.

Cada periodista lleva el apartado clave que pidió el propietario: la RELACIÓN
CON LOS PODERES DEL ESTADO (Gobierno, oposición, poder judicial) con su nota
(+favorable / -crítico) y la razón en términos de cómo encuadra las noticias.

Esas relaciones apuntan a nodos resolubles del dataset (Pedro Sánchez para el
Gobierno, Feijóo para la oposición, el Fiscal General para la judicatura), de
modo que también se convierten en ARISTAS del grafo de relaciones.

Uso:  python3 bin/gen_medios.py && python3 bin/gen_subfixture.py --source medios
"""
from __future__ import annotations

import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / "data" / "medios" / "periodistas.json"
OUT = REPO / "data" / "medios" / "medios.json"

# Destino de cada relación = NOMBRE del actor que ya existe en el grafo (ACTORES),
# para que la arista enlace al nodo existente sin duplicarlo. El "poder" va en la
# etiqueta del contenido.
PODER_TARGET = {
    "gobierno": ("Pedro Sánchez", "Gobierno"),
    "oposicion": ("Alberto Núñez Feijóo", "Oposición (PP)"),
    "judicial": ("Álvaro García Ortiz", "Poder judicial / Fiscalía"),
}
AMBITO_LABEL = {
    "izquierda": "Izquierda", "centro-izquierda": "Centro-izquierda", "centro": "Centro",
    "centro-derecha": "Centro-derecha", "derecha": "Derecha", "derecha-liberal": "Derecha liberal",
    "derecha-dura": "Derecha dura", "derecha-conservadora": "Derecha conservadora",
    "derecha-economica": "Derecha económica", "liberal": "Liberal",
}


def nota_str(n: int) -> str:
    return f"+{n}" if n >= 0 else str(n)


def main() -> int:
    data = json.loads(SRC.read_text("utf-8"))
    periodistas = data["periodistas"]

    dossiers = []
    for p in periodistas:
        medio = p.get("medio", "")
        rol = p.get("rol", "Periodista")
        ambito = p.get("ambito", "")
        encuadre = p.get("encuadre", "")
        bio = f"{rol} de {medio}." + (f" Línea: {AMBITO_LABEL.get(ambito, ambito)}." if ambito else "")

        ap = [
            {"tipo": "identidad", "orden": 0, "items": [
                {"tipo": "dato", "titulo": "Perfil", "contenido": bio},
            ]},
        ]
        if encuadre:
            ap.append({"tipo": "posiciones", "orden": 1, "items": [
                {"tipo": "dato", "titulo": "Encuadre informativo (cómo presenta las noticias)",
                 "contenido": encuadre, "tags": [ambito] if ambito else []},
            ]})

        # RELACIÓN CON LOS PODERES DEL ESTADO -> redes (y aristas del grafo)
        redes = []
        for key, (target_slug, label) in PODER_TARGET.items():
            rel = p.get(key)
            if not rel:
                continue
            n = rel["nota"]
            redes.append({
                "tipo": "contacto", "titulo": target_slug,
                "contenido": f"**{label}** (nota {nota_str(n)}/10) — {rel['razon']}",
                "tags": ["poderes-estado", "positiva" if n >= 0 else "negativa"],
            })
        if redes:
            ap.append({"tipo": "redes", "orden": 2, "items": redes})

        tags = ["medios", "periodista", "mediatico", "poder-mediatico"]
        if ambito:
            tags.append(ambito)

        dossiers.append({
            "slug": p["slug"],
            "nombre": p["nombre"],
            "cargo": f"{rol} · {medio}",
            "tags": tags,
            "bio_corta": bio,
            "fuente_principal": None,
            "confidence": 0.8,
            "completeness": 0.62,
            "apartados": ap,
        })

    by_slug = {d["slug"]: d for d in dossiers}
    out = list(by_slug.values())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK · {len(out)} periodistas escritos en {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
