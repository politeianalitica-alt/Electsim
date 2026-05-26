#!/usr/bin/env python3
"""Parsea el listado oficial nacional de concejales 2023-2027 publicado por
el Ministerio de Política Territorial y Memoria Democrática (XLSX descargado
de https://concejales.redsara.es/consulta/getConcejalesLegislatura).

Filtra a las 50 capitales de provincia de España (excluye Ceuta y Melilla
porque ya están como asambleas autonómicas) y genera fichas con el mismo
formato que los parlamentos para fusionar con `gen_dosieres_fixture.py`.

Total esperado: ~1.350 concejales · 50 ayuntamientos.

Re-descargar dataset:
    curl -sL -o /tmp/concejales_es.xlsx \
        https://concejales.redsara.es/consulta/getConcejalesLegislatura
"""
import json
import re
import sys
from pathlib import Path

import openpyxl


XLSX_PATH = Path("/tmp/concejales_es.xlsx")

# Nombre EXACTO en el dataset (case-sensitive, con artículo postnominal y
# espacios incluidos donde corresponda). Se excluyen Ceuta/Melilla porque ya
# tienen ficha como asambleas autonómicas.
CAPITALES = {
    # CCAA → ciudad
    "Vitoria-Gasteiz",            # Álava
    "Albacete",                   # Albacete
    "Alacant/Alicante",           # Alicante
    "Almería",                    # Almería
    "Oviedo",                     # Asturias
    "Ávila",                      # Ávila
    "Badajoz",                    # Badajoz
    "Palma ",                     # Baleares (¡ojo espacio final en el dataset!)
    "Barcelona",                  # Barcelona
    "Burgos",                     # Burgos
    "Cáceres",                    # Cáceres
    "Cádiz",                      # Cádiz
    "Santander",                  # Cantabria
    "Castelló de la Plana",       # Castellón
    "Ciudad Real",                # Ciudad Real
    "Córdoba",                    # Córdoba
    "Cuenca",                     # Cuenca
    "Girona",                     # Girona
    "Granada",                    # Granada
    "Guadalajara",                # Guadalajara
    "Donostia/San Sebastián",     # Guipúzcoa
    "Huelva",                     # Huelva
    "Huesca",                     # Huesca
    "Jaén",                       # Jaén
    "Coruña, A",                  # La Coruña
    "Logroño",                    # La Rioja
    "Palmas de Gran Canaria, Las",# Las Palmas
    "León",                       # León
    "Lleida",                     # Lleida
    "Lugo",                       # Lugo
    "Madrid",                     # Madrid
    "Málaga",                     # Málaga
    "Murcia",                     # Murcia
    "Pamplona/Iruña",             # Navarra
    "Ourense",                    # Ourense
    "Palencia",                   # Palencia
    "Pontevedra",                 # Pontevedra
    "Salamanca",                  # Salamanca
    "Santa Cruz de Tenerife",     # Santa Cruz de Tenerife
    "Segovia",                    # Segovia
    "Sevilla",                    # Sevilla
    "Soria",                      # Soria
    "Tarragona",                  # Tarragona
    "Teruel",                     # Teruel
    "Toledo",                     # Toledo
    "València",                   # Valencia
    "Valladolid",                 # Valladolid
    "Bilbao",                     # Vizcaya
    "Zamora",                     # Zamora
    "Zaragoza",                   # Zaragoza
}


# Nombres "limpios" para display (sin el artículo postnominal ni espacios extra)
DISPLAY_NAME = {
    "Palma ": "Palma de Mallorca",
    "Coruña, A": "A Coruña",
    "Palmas de Gran Canaria, Las": "Las Palmas de Gran Canaria",
    "Castelló de la Plana": "Castelló de la Plana / Castellón de la Plana",
    "Donostia/San Sebastián": "Donostia / San Sebastián",
    "Pamplona/Iruña": "Pamplona / Iruña",
    "Alacant/Alicante": "Alicante / Alacant",
    "València": "Valencia",
}


# Slug suffix por capital (regional disambiguation)
def city_slug(city_display: str) -> str:
    s = city_display.lower().split("/")[0].strip()
    repl = {"á": "a", "é": "e", "í": "i", "ó": "o", "ú": "u",
            "ñ": "n", "ü": "u", "à": "a", "è": "e", "ò": "o"}
    for k, v in repl.items():
        s = s.replace(k, v)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"^-+|-+$", "", s)
    return s


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
    if not s:
        return ""
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


# Normalización de nombre de partido a forma canónica (alinear con resto del repo)
PARTIDO_OVERRIDES = {
    "P.P.": "PP",
    "PARTIDO POPULAR": "PP",
    "PARTIT POPULAR": "PP",
    "P.S.O.E.": "PSOE",
    "PARTIDO SOCIALISTA OBRERO ESPAÑOL": "PSOE",
    "PSC-PSOE": "PSC",
    "PSC": "PSC",
    "PSE-EE": "PSE-EE",
    "VOX": "VOX",
    "V.O.X.": "VOX",
    "SUMAR": "Sumar",
    "PODEMOS": "Podemos",
    "EAJ-PNV": "PNV",
    "PNV-EAJ": "PNV",
    "EAJ/PNV": "PNV",
    "EH BILDU": "EH Bildu",
    "BILDU": "EH Bildu",
    "ERC": "ERC",
    "ERC-AM": "ERC",
    "ESQUERRA REPUBLICANA DE CATALUNYA": "ERC",
    "JUNTS": "Junts",
    "JUNTS PER CATALUNYA": "Junts",
    "CUP": "CUP",
    "BNG": "BNG",
    "COMPROMIS": "Compromís",
    "COMPROMÍS": "Compromís",
    "CHA": "CHA",
    "CHUNTA ARAGONESISTA": "CHA",
    "IU": "IU",
    "IZQUIERDA UNIDA": "IU",
    "PRC": "PRC",
    "UPN": "UPN",
    "GEROA BAI": "Geroa Bai",
    "FORO": "Foro Asturias",
    "FORO ASTURIAS": "Foro Asturias",
    "CC": "CC",
    "COALICION CANARIA": "CC",
    "CC-PNC": "CC",
    "AGRUPACION SOCIALISTA GOMERA": "ASG",
    "NCa": "NCa",
    "TENERIFE NACIONALISTA": "TNC",
    "UPL": "UPL",
    "MAS MADRID": "Más Madrid",
    "MÁS MADRID": "Más Madrid",
    "BARCELONA EN COMU": "BComú",
    "BARCELONA EN COMÚ": "BComú",
    "MADRIDISTAS": "Más Madrid",
    "RECUPERAR MURCIA": "Recuperar Murcia",
    "TERUEL EXISTE": "Teruel Existe",
    "INDEPENDIENTE": "Independiente",
}


def normaliza_partido(p: str) -> str:
    if not p:
        return "Independiente"
    p = p.strip()
    if p.upper() in PARTIDO_OVERRIDES:
        return PARTIDO_OVERRIDES[p.upper()]
    return p  # tal cual (suele venir en mayúsculas → mantenemos)


def main():
    if not XLSX_PATH.exists():
        print(f"ERROR: {XLSX_PATH} no existe. Descarga con:", file=sys.stderr)
        print("  curl -sL -o /tmp/concejales_es.xlsx https://concejales.redsara.es/consulta/getConcejalesLegislatura", file=sys.stderr)
        sys.exit(1)

    wb = openpyxl.load_workbook(XLSX_PATH, read_only=True)
    ws = wb.active

    # Index: 0 INE, 1 Municipio, 2 Provincia, 3 CCAA, 4 Nombre, 5 1Ap, 6 2Ap, 7 Cargo, 8 Fecha, 9 Partido
    by_city = {c: [] for c in CAPITALES}
    for r in ws.iter_rows(values_only=True):
        if not r[0] or not str(r[0]).isdigit() or r[0] == "Código INE":
            continue
        municipio = r[1]
        if municipio in CAPITALES:
            by_city[municipio].append(r)

    dosieres = []
    seen_slugs = set()
    total = 0
    num_base = 5000
    summary = []

    for city in sorted(CAPITALES):
        rows = by_city[city]
        display = DISPLAY_NAME.get(city, city)
        slug_suffix = city_slug(display)
        partidos_count = {}

        for r in rows:
            nombre = (r[4] or "").strip()
            ap1 = (r[5] or "").strip()
            ap2 = (r[6] or "").strip()
            cargo = (r[7] or "").strip()
            partido_raw = (r[9] or "").strip()
            partido = normaliza_partido(partido_raw)
            full_name = " ".join(p for p in [nombre, ap1, ap2] if p)
            nombre_t = titlecase_es(full_name)

            slug_base = slugify(nombre_t)
            slug = f"{slug_base}-{slug_suffix}"
            attempt = 0
            while slug in seen_slugs:
                attempt += 1
                slug = f"{slug_base}-{slug_suffix}-{attempt}"
            seen_slugs.add(slug)

            cargo_full = (
                f"{cargo} · Ayuntamiento de {display} · Legislatura 2023-2027 · {partido}"
            )
            bio_corta = (
                f"{cargo} en el Ayuntamiento de {display} · Legislatura 2023-2027. "
                f"Grupo {partido}."
            )
            perfil = (
                f"{nombre_t} es {cargo.lower()} en el Ayuntamiento de {display} "
                f"(legislatura municipal 2023-2027), candidato/a por {partido}. "
                f"Ficha generada desde el listado nacional oficial de concejales del "
                f"Ministerio de Política Territorial y Memoria Democrática "
                f"(https://concejales.redsara.es) · pendiente de ampliar con "
                f"trayectoria, posiciones públicas y patrimonio."
            )
            dosieres.append({
                "slug": slug,
                "num": num_base + total,
                "nombre_completo": nombre_t,
                "cargo_actual": cargo_full,
                "partido": partido,
                "bio_corta": bio_corta,
                "perfil_completo": perfil,
                "relaciones": [],
                "patrimonio": [
                    {"concepto": "Patrimonio declarado",
                     "valor": "Pendiente de desglose desde la declaración pública municipal."},
                ],
            })
            total += 1
            partidos_count[partido] = partidos_count.get(partido, 0) + 1

        n = len(rows)
        # Sumario por ciudad
        top3 = sorted(partidos_count.items(), key=lambda x: -x[1])[:3]
        top3_s = ", ".join(f"{p}={n}" for p, n in top3)
        summary.append(f"  {display:36s} {n:3d}  ({top3_s})")

    out = Path("/tmp/dosieres_ayuntamientos.json")
    out.write_text(json.dumps(dosieres, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ {total} concejales de {len([c for c in by_city if by_city[c]])} capitales → {out}\n", file=sys.stderr)
    for line in summary:
        print(line, file=sys.stderr)


if __name__ == "__main__":
    main()
