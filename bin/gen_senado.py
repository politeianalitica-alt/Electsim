#!/usr/bin/env python3
"""bin/gen_senado.py

Genera data/senado/senadores.json (shape seed de gen_subfixture) con los
senadores EN ACTIVO de la XV Legislatura, usando los datos abiertos OFICIALES
del Senado (senado.es · ficopendataservlet tipoFich=10).

A DIFERENCIA DEL CONGRESO, el Senado NO publica como dato abierto ni la
biografía ni la declaración de intereses (la ficha las renderiza por JS). Por
eso, sin inventar nada:
  · Escaño: nombre, grupo parlamentario, circunscripción y tipo (electo/designado).
  · Biografía: enlace a la FICHA OFICIAL del senador (id1=credencial).
  · Declaración de bienes, actividades y rentas: enlace a la sección oficial
    del Senado, marcada como XV Legislatura.

Cifras/biografías de senadores prominentes se transcriben a mano en
bin/senado_top.json (clave = "APELLIDOS, Nombre" del Senado).

Uso:  python3 bin/gen_senado.py
"""
from __future__ import annotations

import json
import re
import ssl
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "senado" / "senadores.json"
TOP = REPO / "bin" / "senado_top.json"

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
BASE = "https://www.senado.es"
FICHA = (BASE + "/web/composicionorganizacion/senadores/composicionsenado/"
         "fichasenador/index.html?id1={cred}&legis=15")
DECLARACIONES = (BASE + "/web/composicionorganizacion/senadores/"
                 "declaracionbienesactividades/index.html")

# Grupo parlamentario del Senado -> sigla/etiqueta de partido (aproximación;
# el dato oficial es el GRUPO, no el partido electoral).
GRUPO_PARTIDO = {
    "GPP": "pp",
    "GPS": "psoe",
    "GPV": "pnv",
    "GPERB": "erc",        # Esquerra Republicana - EH Bildu
    "GPIC": "sumar",       # Izquierda Confederal (Sumar/IU/Podemos/Compromís…)
    "GPPLU": "junts",      # Grupo Plural (Junts, etc.)
    "GPMX": None,          # Mixto
}
GRUPO_NOMBRE = {
    "GPP": "Grupo Parlamentario Popular",
    "GPS": "Grupo Parlamentario Socialista",
    "GPV": "Grupo Parlamentario Vasco (EAJ-PNV)",
    "GPERB": "Grupo Parlamentario Esquerra Republicana - EH Bildu",
    "GPIC": "Grupo Parlamentario Izquierda Confederal",
    "GPPLU": "Grupo Parlamentario Plural",
    "GPMX": "Grupo Parlamentario Mixto",
}

# Heurística de género: la inmensa mayoría de nombres femeninos en español
# terminan en -a; añadimos femeninos que no acaban en -a y excluimos masculinos
# que sí acaban en -a o son ambiguos.
FEMALE_EXTRA = {
    "pilar", "isabel", "carmen", "mar", "raquel", "nuria", "mertxe", "inés",
    "beatriz", "soledad", "mercedes", "lourdes", "consuelo", "rosario", "flor",
    "estíbaliz", "edurne", "itziar", "nekane", "garbiñe", "arantxa", "aránzazu",
    "montse", "noemí", "rocío", "carolin", "esther", "ainhoa",
}
MALE_A = {
    "borja", "joshua", "luca", "elías", "jokin", "unai", "iker", "aimar",
    "jon", "asier", "nicola", "iosu", "andrea",  # andrea es ambiguo · por defecto m. en algún caso
}


def is_female(nombre: str) -> bool:
    first = (nombre.split()[0].lower() if nombre else "")
    if first in MALE_A:
        return False
    if first in FEMALE_EXTRA:
        return True
    return first.endswith("a")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=90, context=CTX).read()


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-+", "-", s)


def norm_key(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def titlecase(s: str) -> str:
    return " ".join(w.capitalize() if w.isupper() or w.islower() else w for w in s.split())


def main() -> int:
    print("· descargando datos abiertos del Senado…")
    data = fetch(BASE + "/web/ficopendataservlet?tipoFich=10&legis=15")
    root = ET.fromstring(data)
    xv = [s for s in root if (s.findtext("legislatura") or "") == "15"]
    print(f"  senadores XV: {len(xv)}")

    top = {}
    if TOP.exists():
        top = {norm_key(k): v for k, v in json.loads(TOP.read_text("utf-8")).items()
               if not k.startswith("_")}

    dossiers = []
    for s in xv:
        nombre = (s.findtext("nombre") or "").strip()
        apellidos = (s.findtext("apellidos") or "").strip()
        full = titlecase(f"{nombre} {apellidos}")
        slug = slugify(f"{nombre} {apellidos}")
        cred = (s.findtext("ultCredencial") or "").strip()
        grupo_sig = (s.findtext("grupoNombre") or "").strip()
        proc_lit = (s.findtext("procedLiteral") or "").strip()       # Electo / Designado
        proc_lugar = re.sub(r"^(Elect[oa]|Designad[oa])\s*:?\s*", "", (s.findtext("procedLugar") or "").strip())
        es_mujer = is_female(nombre)
        rol = "Senadora" if es_mujer else "Senador"
        tipo_eleccion = "electa" if es_mujer else "electo"
        if proc_lit.lower().startswith("design"):
            tipo_eleccion = "designada" if es_mujer else "designado"
        cargo = f"{rol} {tipo_eleccion} por {proc_lugar} · XV Legislatura"

        partido = GRUPO_PARTIDO.get(grupo_sig)
        grupo_full = GRUPO_NOMBRE.get(grupo_sig, grupo_sig)
        tags = [t for t in [partido, "senador", "senado", "politico", "xv-legislatura"] if t]
        ficha_url = FICHA.format(cred=cred)

        perfil = (f"{rol} {tipo_eleccion} por {proc_lugar} en la XV Legislatura, "
                  f"integrad{'a' if es_mujer else 'o'} en el {grupo_full}.")

        ap = [
            {"tipo": "identidad", "orden": 0, "items": [
                {"tipo": "dato", "titulo": "Perfil", "contenido": perfil},
                {"tipo": "dato", "titulo": "Escaño",
                 "contenido": f"{rol} {tipo_eleccion} por {proc_lugar}. {grupo_full}. XV Legislatura del Senado.",
                 "tags": [partido or grupo_sig.lower(), "senado", "xv-legislatura"]},
            ]},
            {"tipo": "trayectoria", "orden": 1, "items": [
                {"tipo": "dato", "titulo": "Biografía (ficha oficial del Senado)",
                 "contenido": ("Reseña biográfica y trayectoria parlamentaria completas en la ficha "
                               "oficial del Senado (el Senado no publica la biografía como dato abierto)."),
                 "fuente_url": ficha_url, "fuente_titulo": "Ficha oficial del Senado"},
            ]},
        ]

        # Patrimonio · declaración oficial (+ cifras transcritas si existen en TOP)
        evid = []
        t = top.get(norm_key(f"{apellidos}, {nombre}")) or top.get(norm_key(full))
        if t:
            evid.append({"tipo": "documento", "titulo": "Declaración de bienes y rentas (cifras)",
                         "contenido": t.get("texto", ""), "fecha": t.get("fecha"),
                         "fuente_url": t.get("fuente"), "fuente_titulo": t.get("fuente_titulo", "Fuente"),
                         "tags": ["patrimonio", "cifras"]})
        evid.append({
            "tipo": "documento", "titulo": "Declaración de actividades, bienes y rentas (oficial)",
            "contenido": ("Declaración de actividades, bienes patrimoniales, rentas e intereses económicos "
                          "presentada ante el Senado en la XV Legislatura. Los importes los publica el Senado; "
                          "consúltense en la sección oficial de declaraciones."),
            "fuente_url": DECLARACIONES,
            "fuente_titulo": "Senado · Declaraciones de bienes y actividades",
            "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial"],
        })
        ap.append({"tipo": "evidencia", "orden": 5, "items": evid})

        dossiers.append({
            "slug": slug,
            "nombre": full,
            "cargo": cargo,
            "tags": tags,
            "bio_corta": perfil,
            "fuente_principal": ficha_url,
            "confidence": 0.95,
            "completeness": 0.55,
            "apartados": ap,
        })

    by_slug = {d["slug"]: d for d in dossiers}
    out = list(by_slug.values())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    con_top = sum(1 for d in out if any(i.get("titulo", "").endswith("(cifras)") for ap in d["apartados"] for i in ap["items"]))
    print(f"OK · {len(out)} senadores escritos en {OUT.relative_to(REPO)} · con cifras transcritas: {con_top}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
