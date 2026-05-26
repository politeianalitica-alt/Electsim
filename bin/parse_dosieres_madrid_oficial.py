#!/usr/bin/env python3
"""Parsea el CSV oficial de la Asamblea de Madrid (open data) y genera fichas
básicas para los diputados de la XIII Legislatura (actual).

Fuente: https://ctyp.asambleamadrid.es/static/doc/opendata/OAD.OPENDATA_DIPUTADOS_VIEW.csv
(la copia espejo de www.asambleamadrid.es sirve detrás de Sucuri y exige challenge JS).
"""
import csv
import json
import re
import sys
from pathlib import Path

CSV_PATH = Path("/tmp/madrid_diputados.csv")
LEGISLATURA = 13


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def titlecase_es(s: str) -> str:
    """UPPER → Title respetando preposiciones."""
    lower_words = {"de", "del", "la", "las", "el", "los", "y", "e", "i", "o", "u",
                   "da", "do", "das", "dos"}
    words = s.lower().split()
    out = []
    for i, w in enumerate(words):
        if i > 0 and w in lower_words:
            out.append(w)
        else:
            parts = re.split(r"([\-' ])", w)
            out.append("".join(p.capitalize() if not re.match(r"^[\-' ]$", p) else p for p in parts))
    return " ".join(out)


# Normalizar nombre de grupo parlamentario → partido canónico
GRUPO_A_PARTIDO = {
    "popular": "PP",
    "socialista": "PSOE",
    "vox": "VOX",
    "mas madrid": "Más Madrid",
    "más madrid": "Más Madrid",
    "ciudadanos": "Ciudadanos",
    "mixto": "Mixto",
    "unidas podemos": "Podemos",
    "podemos": "Podemos",
}


def normaliza_grupo(g: str) -> str:
    g_low = g.lower().strip().rstrip(".")
    for k, v in GRUPO_A_PARTIDO.items():
        if k in g_low:
            return v
    # Si no encaja, devolver el nombre limpio
    return titlecase_es(g.strip().rstrip("."))


def main():
    with CSV_PATH.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # Filtrar solo la legislatura actual
    actuales = [r for r in rows if r.get("LEGISLATURA", "").strip() == str(LEGISLATURA)]
    print(f"Total filas L{LEGISLATURA}: {len(actuales)}", file=sys.stderr)

    # Dedupe por nombre + apellidos. El CSV tiene una fila por cada cargo/órgano
    # (Diputado, Presidente Mesa, miembro Comisión X, etc). Nos quedamos con UNA
    # ficha por persona y consolidamos los cargos.
    por_persona = {}  # clave = (nombre, apellidos) → dict
    for r in actuales:
        nombre = (r.get("NOMBRE") or "").strip()
        apellidos = (r.get("APELLIDOS") or "").strip()
        grupo = (r.get("GRUPO_PARLAMENTARIO") or "").strip()
        cargo = (r.get("CARGO") or "").strip()
        organo = (r.get("ORGANO") or "").strip()
        legis_pres = (r.get("LEGISLATURAS_PRESENTE") or "").strip()
        if not nombre or not apellidos:
            continue
        key = (nombre, apellidos)
        if key not in por_persona:
            por_persona[key] = {
                "nombre": nombre,
                "apellidos": apellidos,
                "grupo": grupo,
                "cargos": [],
                "legis_presente": legis_pres,
            }
        # Acumular cargo + órgano si añade información
        if cargo:
            etiqueta = cargo if organo == "Asamblea de Madrid" else f"{cargo} · {organo}"
            if etiqueta not in por_persona[key]["cargos"]:
                por_persona[key]["cargos"].append(etiqueta)

    print(f"Personas únicas: {len(por_persona)}", file=sys.stderr)

    dosieres = []
    seen_slugs = set()
    for (nombre, apellidos), data in por_persona.items():
        nombre_full = titlecase_es(f"{nombre} {apellidos}")
        partido = normaliza_grupo(data["grupo"])
        grupo_legible = titlecase_es(data["grupo"].rstrip("."))

        slug = slugify(nombre_full)
        if slug in seen_slugs:
            slug = f"{slug}-madrid"
            attempt = 1
            while slug in seen_slugs:
                attempt += 1
                slug = f"{slug}-{attempt}"
        seen_slugs.add(slug)

        # Cargo principal: el más representativo o "Diputado/a"
        cargos = data["cargos"]
        cargo_principal = "Diputado/a · Asamblea de Madrid · XIII Legislatura"
        # Si hay un cargo institucional alto (Presidente, Vicepresidente, Portavoz), priorizarlo
        for c in cargos:
            c_low = c.lower()
            if any(k in c_low for k in ("presidente", "vicepresidente", "portavoz")):
                cargo_principal = f"{c} · XIII Legislatura"
                break

        cargo_actual = f"{cargo_principal} · {grupo_legible}"

        bio_corta = (
            f"Diputado/a en la Asamblea de Madrid · XIII Legislatura. "
            f"Grupo {grupo_legible}."
        )

        perfil = (
            f"{nombre_full} es diputado/a en la Asamblea de Madrid en la XIII Legislatura, "
            f"adscrito/a al {grupo_legible}. "
            f"Legislaturas presente: {data['legis_presente'] or 'XIII'}. "
            f"Ficha generada desde los datos abiertos oficiales de la Asamblea de Madrid · "
            f"pendiente de ampliar con perfil, trayectoria, posiciones, declaraciones y patrimonio verificables."
        )

        dosieres.append({
            "slug": slug,
            "num": 2000 + len(dosieres),
            "nombre_completo": nombre_full,
            "cargo_actual": cargo_actual,
            "partido": partido,
            "bio_corta": bio_corta,
            "perfil_completo": perfil,
            "relaciones": [],
            "patrimonio": [
                {"concepto": "Patrimonio declarado",
                 "valor": "Pendiente de desglose individual completo desde la declaración pública de la Asamblea de Madrid."},
            ],
        })

    out = Path("/tmp/dosieres_madrid.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} diputados/as → {out}", file=sys.stderr)

    from collections import Counter
    by_partido = Counter(d["partido"] for d in dosieres)
    print(f"\nPor partido:", file=sys.stderr)
    for p, n in sorted(by_partido.items(), key=lambda x: -x[1]):
        print(f"  {p:14} {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
