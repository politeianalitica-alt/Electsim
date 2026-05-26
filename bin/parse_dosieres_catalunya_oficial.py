#!/usr/bin/env python3
"""Scrapea los 8 grupos parlamentarios del Parlament de Catalunya (XV Legislatura)
y genera fichas básicas para sus 135 diputats.

Fuente: páginas HTML públicas del Parlament por grupo:
  https://www.parlament.cat/web/composicio/grups-parlamentaris/grup-parlamentari/
    index.html?p_codi={CODI}&p_legislatura=15

El Parlament NO ofrece dataset abierto estructurado para esto. La lista por
grupo es la fuente oficial más concreta y se descarga sin challenge JS si se
envía User-Agent.
"""
import json
import re
import sys
from pathlib import Path

# Mapa codi del grupo → (partido canónico, nombre legible del grupo)
GRUPOS = {
    "31":   ("PSC",     "Grup Parlamentari Socialistes i Units per Avançar"),
    "1302": ("Junts",   "Grup Parlamentari de Junts"),
    "39":   ("ERC",     "Grup Parlamentari d'Esquerra Republicana de Catalunya"),
    "271":  ("PP",      "Grup Parlamentari del Partit Popular de Catalunya"),
    "36":   ("VOX",     "Grup Parlamentari de VOX en Cataluña"),
    "1301": ("Comuns",  "Grup Parlamentari Comuns"),
    "1347": ("CUP",     "Grup Parlamentari de la Candidatura d'Unitat Popular - Defensem la Terra"),
    "52":   ("Mixto",   "Grup Mixt"),
}


def slugify(name: str) -> str:
    s = name.lower().strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u", "ñ": "n", "ü": "u",
            "à": "a", "è": "e", "ò": "o", "ï": "i", "ç": "c"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s[:120]


# Honoríficos catalanes/españoles que aparecen en el Parlament
HONORIFICS_RE = re.compile(
    r"^(I\.\s*)?"                          # I. (Il·lustre)
    r"(M\.?\s*H\.?\s*)?"                   # M.H. (Molt Honorable)
    r"(H\.\s*)?"                           # H. (Honorable)
    r"(Sr[ay]?\.?|Sra\.|Sr\.|Excm\.?\s*Sr\.?|Excma\.?\s*Sra\.?)\s*",
    re.IGNORECASE,
)


def limpia_nombre(raw: str) -> str:
    """Elimina honoríficos y normaliza espacios."""
    s = HONORIFICS_RE.sub("", raw.strip())
    # Posibles tratamientos sueltos que sobran
    s = re.sub(r"^(Il·lustre\s+)?Sr[ay]?\.?\s+", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s).strip()
    # Algunos nombres vienen con sufijo " (...)", quitarlo
    s = re.sub(r"\s*\([^)]*\)\s*$", "", s).strip()
    return s


def extrae_diputats(html_path: Path) -> list[tuple[str, str]]:
    """Devuelve lista de (p_codi, nombre_limpio) únicos del HTML del grupo."""
    txt = html_path.read_text(encoding="iso-8859-1")
    # Patrón: <a href="/web/composicio/diputats-fitxa/index.html?p_codi=NNN" target="_blank">NAME</a>
    matches = re.findall(
        r'href="/web/composicio/diputats-fitxa/index\.html\?p_codi=(\d+)"\s+target="_blank"[^>]*>([^<]+)</a>',
        txt,
    )
    seen = set()
    result = []
    for codi, raw in matches:
        if codi in seen:
            continue
        seen.add(codi)
        nom = limpia_nombre(raw)
        if not nom or len(nom) < 5 or len(nom.split()) < 2:
            continue
        result.append((codi, nom))
    return result


def main():
    dosieres = []
    seen_slugs = set()
    total = 0
    by_partido = {}

    for codi, (partido, grupo_legible) in GRUPOS.items():
        path = Path(f"/tmp/parlament_g{codi}.html")
        if not path.exists():
            print(f"⚠ Falta {path}", file=sys.stderr)
            continue
        miembros = extrae_diputats(path)
        print(f"  {partido:7} ({codi:4}): {len(miembros):3} → {grupo_legible}", file=sys.stderr)
        total += len(miembros)
        by_partido[partido] = by_partido.get(partido, 0) + len(miembros)

        for p_codi, nombre in miembros:
            slug = slugify(nombre)
            if slug in seen_slugs:
                slug = f"{slug}-parlament"
                attempt = 1
                while slug in seen_slugs:
                    attempt += 1
                    slug = f"{slug}-{attempt}"
            seen_slugs.add(slug)

            cargo_actual = (
                f"Diputat/da · Parlament de Catalunya · XV Legislatura · {grupo_legible}"
            )
            bio_corta = (
                f"Diputat/da al Parlament de Catalunya · XV Legislatura. "
                f"{grupo_legible}."
            )
            perfil = (
                f"{nombre} es diputat/da al Parlament de Catalunya en la XV Legislatura, "
                f"adscrit/a al {grupo_legible}. "
                f"Fitxa generada a partir de la composició oficial publicada pel Parlament "
                f"(codi intern: {p_codi}). "
                f"Pendent d'ampliar amb perfil, trajectòria, posicions, declaracions i patrimoni verificables."
            )

            dosieres.append({
                "slug": slug,
                "num": 3000 + len(dosieres),
                "nombre_completo": nombre,
                "cargo_actual": cargo_actual,
                "partido": partido,
                "bio_corta": bio_corta,
                "perfil_completo": perfil,
                "relaciones": [],
                "patrimonio": [
                    {"concepto": "Patrimoni declarat",
                     "valor": "Pendent de desglossament individual des de la declaració pública del Parlament."},
                ],
            })

    out = Path("/tmp/dosieres_catalunya.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ {len(dosieres)} diputats/des → {out}", file=sys.stderr)
    print(f"\nPer partit:", file=sys.stderr)
    for p, n in sorted(by_partido.items(), key=lambda x: -x[1]):
        print(f"  {p:8} {n}", file=sys.stderr)


if __name__ == "__main__":
    main()
