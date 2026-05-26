#!/usr/bin/env python3
"""Parsea el XML oficial del Senado XV Legislatura y genera fichas básicas
para añadir al fixture de dosieres.

Fuente: https://www.senado.es/web/ficopendataservlet?tipoFich=6&legis=15
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

XML = Path("/tmp/senado_xv.xml")


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


def titlecase_spanish(s: str) -> str:
    """Convierte UPPER CASE a Title Case respetando preposiciones cortas."""
    lower_words = {"de", "del", "la", "las", "el", "los", "y", "e", "i", "o", "u",
                   "da", "do", "das", "dos"}
    words = s.lower().split()
    out = []
    for i, w in enumerate(words):
        if i > 0 and w in lower_words:
            out.append(w)
        else:
            # Manejar guiones y apóstrofes
            parts = re.split(r"([\-' ])", w)
            out.append("".join(p.capitalize() if not re.match(r"^[\-' ]$", p) else p for p in parts))
    return " ".join(out)


# Mapeo de siglas oficiales del grupo → partido canónico
GRUPO_A_PARTIDO = {
    "GPP": "PP",
    "GPS": "PSOE",
    "GPMX": "Mixto",
    "GPV": "PNV",
    "GPIC": "PSC",  # Izquierda Confederal incluye PSC, Sumar, Compromís, IU
    "GPER": "ERC",
    "GPN": "Junts",
    "GPD": "Mixto",
}


def main():
    tree = ET.parse(XML)
    root = tree.getroot()
    senadores_xml = root.findall(".//senador")
    print(f"Encontrados {len(senadores_xml)} senadores en XML", file=sys.stderr)

    dosieres = []
    seen_slugs = set()
    for el in senadores_xml:
        def get(tag):
            x = el.find(tag)
            return (x.text or "").strip() if x is not None and x.text else ""

        nombre_raw = get("nombre")
        apellidos_raw = get("apellidos")
        if not nombre_raw or not apellidos_raw:
            continue
        nombre_full = titlecase_spanish(f"{nombre_raw} {apellidos_raw}")

        proced_tipo = get("procedTipo")           # Electo | Designado/Designada
        proced_lit = get("procedLiteral")         # "Electo:  Madrid"
        grupo_siglas = get("grupoSiglas")
        grupo_nombre = titlecase_spanish(get("grupoNombre"))

        # Extraer provincia/CCAA del procedLiteral
        provincia = ""
        m = re.match(r"^(Elect[oa]|Designad[oa]):\s*(.+)$", proced_lit)
        if m:
            provincia = titlecase_spanish(m.group(2).strip())

        partido = GRUPO_A_PARTIDO.get(grupo_siglas, grupo_siglas)
        slug = slugify(nombre_full)
        # Sufijo -senador para evitar colisión con diputados/ministros del mismo nombre
        if slug in seen_slugs:
            slug = f"{slug}-senado"
            attempt = 1
            while slug in seen_slugs:
                attempt += 1
                slug = f"{slug}-{attempt}"
        seen_slugs.add(slug)

        cargo_parts = [f"Senador/a {proced_tipo.lower()} por {provincia}" if provincia else "Senador/a"]
        if grupo_nombre:
            cargo_parts.append(grupo_nombre)
        cargo = " · ".join(cargo_parts)

        # Perfil neutro · honesto: solo lo que sabemos de la fuente oficial
        perfil = (
            f"Senador/a por {provincia} en la XV Legislatura. "
            f"Procedencia: {proced_tipo.lower()}. Adscrito/a al {grupo_nombre}. "
            f"Ficha generada desde la lista oficial del Senado · pendiente de ampliar con perfil, "
            f"trayectoria, posiciones, declaraciones y patrimonio verificables."
        )

        dosieres.append({
            "slug": slug,
            "num": 1000 + len(dosieres),
            "nombre_completo": nombre_full,
            "cargo_actual": cargo,
            "partido": partido,
            "bio_corta": f"Senador/a por {provincia} ({partido}) en la XV Legislatura · procedencia {proced_tipo.lower()}.",
            "perfil_completo": perfil,
            "relaciones": [],   # Sin relaciones · pendientes de añadir
            "patrimonio": [
                {"concepto": "Patrimonio declarado",
                 "valor": "Pendiente de desglose individual completo desde la declaración pública del Senado."},
            ],
        })

    out = Path("/tmp/dosieres_senado.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ {len(dosieres)} senadores → {out}", file=sys.stderr)
    # Distribución por partido
    from collections import Counter
    by_partido = Counter(d["partido"] for d in dosieres)
    print(f"\nPor grupo:", file=sys.stderr)
    for p, n in sorted(by_partido.items(), key=lambda x: -x[1]):
        print(f"  {p:8} {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
