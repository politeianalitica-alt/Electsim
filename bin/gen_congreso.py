#!/usr/bin/env python3
"""bin/gen_congreso.py

Genera data/congreso/diputados.json (shape seed de gen_subfixture) con los
~350 diputados EN ACTIVO del Congreso (XV Legislatura), usando SOLO datos
oficiales y abiertos del Congreso de los Diputados:

  · DiputadosActivos (opendata)  -> nombre, circunscripción, formación, grupo,
                                     fechas y BIOGRAFÍA oficial.
  · docacteco (opendata)         -> declaración de intereses económicos:
                                     actividades, fundaciones y donaciones,
                                     CON fecha de registro.

NO inventa cifras de patrimonio: la "Declaración de bienes y rentas" se
referencia con su fecha y enlace oficial (los importes los publica el Congreso
como PDF). El top de figuras lleva además cifras transcritas a mano (ver
bin/patrimonio_top.json, opcional).

Uso:  python3 bin/gen_congreso.py
"""
from __future__ import annotations

import json
import re
import ssl
import unicodedata
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "data" / "congreso" / "diputados.json"
PATRIMONIO_TOP = REPO / "bin" / "patrimonio_top.json"  # opcional · cifras curadas

CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE
BASE = "https://www.congreso.es"

SIGLAS = {
    "pp", "psoe", "vox", "sumar", "erc", "junts", "bildu", "eh bildu", "pnv",
    "bng", "cup", "upn", "cca", "coalición canaria", "podemos",
}


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=90, context=CTX).read()


def discover(pattern: str) -> str:
    """Encuentra la URL actual (con timestamp) de un fichero opendata."""
    html = fetch(f"{BASE}/es/opendata/diputados").decode("utf-8", "ignore")
    matches = re.findall(rf"/webpublica/opendata/diputados/{pattern}__\d+\.json", html)
    if not matches:
        raise RuntimeError(f"no encontrado opendata: {pattern}")
    return BASE + matches[0]


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s.lower()).strip("-")
    return re.sub(r"-+", "-", s)


def nombre_propio(nombre_apellidos: str) -> str:
    """'Abades Martínez, Cristina' -> 'Cristina Abades Martínez'."""
    if "," in nombre_apellidos:
        ap, nom = nombre_apellidos.split(",", 1)
        return f"{nom.strip()} {ap.strip()}"
    return nombre_apellidos.strip()


def party_tag(formacion: str) -> str | None:
    f = (formacion or "").strip().lower()
    aliases = {"eh bildu": "bildu", "coalición canaria": "cca", "más país": "mas-pais"}
    f = aliases.get(f, f)
    if f in SIGLAS:
        return f
    return f or None


def limpiar_bio(bio: str) -> str:
    """La BIOGRAFÍA oficial usa secuencias de espacios/puntos como separadores."""
    bio = re.sub(r"\s{2,}", " · ", bio.strip())
    bio = re.sub(r"\s*·\s*", " · ", bio)
    return bio.strip(" ·\n")


def norm_key(s: str) -> str:
    s = unicodedata.normalize("NFD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", s)


def main() -> int:
    print("· descargando opendata del Congreso…")
    activos = json.loads(fetch(discover("DiputadosActivos")).decode("utf-8", "ignore"))
    acteco = json.loads(fetch(discover("docacteco")).decode("utf-8", "ignore"))
    print(f"  diputados activos: {len(activos)} · filas intereses: {len(acteco)}")

    # índice de intereses por nombre normalizado
    interes: dict[str, list] = {}
    for r in acteco:
        interes.setdefault(norm_key(r.get("NOMBRE", "")), []).append(r)

    # cifras de patrimonio curadas (opcional)
    patr_top = {}
    if PATRIMONIO_TOP.exists():
        patr_top = {norm_key(k): v for k, v in json.loads(PATRIMONIO_TOP.read_text("utf-8")).items()}

    dossiers = []
    for d in activos:
        nombre_raw = d.get("NOMBRE", "")
        full = nombre_propio(nombre_raw)
        slug = slugify(full)
        circ = d.get("CIRCUNSCRIPCION", "")
        formacion = d.get("FORMACIONELECTORAL", "")
        grupo = d.get("GRUPOPARLAMENTARIO", "")
        bio = limpiar_bio(d.get("BIOGRAFIA", "") or "")
        es_mujer = bool(re.search(r"^[^,]*,\s*(maría|ana|cristina|laura|pilar|carmen|isabel|marta|sara|patricia|" r"elena|nuria|mertxe|aina|inés|irene|yolanda|montse|noelia|esther|gemma|macarena|" r"sofía|teresa|josefa|esperanza|verónica|mariana|lídia|joseba)", nombre_raw, re.I))
        cargo = f"Diputad{'a' if es_mujer else 'o'} por {circ} · XV Legislatura"
        tags = [t for t in [party_tag(formacion), "diputado-congreso", "congreso", "politico", "xv-legislatura"] if t]

        rows = interes.get(norm_key(nombre_raw), [])
        fechas = sorted({r.get("FECHAREGISTRO") for r in rows if r.get("FECHAREGISTRO")},
                        key=lambda f: (f or "").split("/")[::-1])
        fecha_decl = fechas[-1] if fechas else d.get("FECHAALTA")

        # ── apartados ──────────────────────────────────────────────
        ap = []
        # identidad
        perfil = bio[:280] + ("…" if len(bio) > 280 else "") if bio else (
            f"Diputad{'a' if es_mujer else 'o'} de {formacion} por {circ} en la XV Legislatura.")
        ap.append({"tipo": "identidad", "orden": 0, "items": [
            {"tipo": "dato", "titulo": "Perfil", "contenido": perfil},
            {"tipo": "dato", "titulo": "Escaño",
             "contenido": f"Diputad{'a' if es_mujer else 'o'} por {circ}, elegid{'a' if es_mujer else 'o'} "
                          f"por {formacion}. {grupo}. Alta en la Cámara: {d.get('FECHAALTA','—')}. XV Legislatura.",
             "tags": [party_tag(formacion) or formacion.lower(), "xv-legislatura"]},
        ]})
        # trayectoria · biografía oficial + actividades previas
        tray_items = []
        if bio:
            tray_items.append({"tipo": "evento", "titulo": "Biografía (ficha oficial del Congreso)", "contenido": bio})
        actividades = [r for r in rows if r.get("TIPO") == "ACTIVIDAD"]
        if actividades:
            txt = " · ".join(
                f"{(r.get('DESCRIPCION') or '').strip()} ({(r.get('EMPLEADOR') or '').strip()}, "
                f"{(r.get('SECTOR') or '').strip().lower()}, {r.get('PERIODO') or ''})".strip()
                for r in actividades if (r.get("DESCRIPCION") or r.get("EMPLEADOR"))
            )
            if txt:
                tray_items.append({"tipo": "dato", "titulo": "Actividades económicas declaradas (anteriores al escaño)",
                                   "contenido": txt, "fecha": fecha_decl,
                                   "fuente_titulo": "Declaración de intereses · Congreso (opendata)"})
        if tray_items:
            ap.append({"tipo": "trayectoria", "orden": 1, "items": tray_items})

        # evidencia · PATRIMONIO (declaración de bienes y rentas)
        evid = []
        patr = patr_top.get(norm_key(nombre_raw))
        if patr:
            evid.append({"tipo": "documento", "titulo": "Declaración de bienes y rentas (cifras)",
                         "contenido": patr.get("texto", ""), "fecha": patr.get("fecha", fecha_decl),
                         "fuente_url": patr.get("fuente"), "fuente_titulo": patr.get("fuente_titulo", "Fuente"),
                         "tags": ["patrimonio", "cifras"]})
        evid.append({
            "tipo": "documento", "titulo": "Declaración de bienes y rentas (oficial)",
            "contenido": (f"Declaración de bienes y rentas presentada ante el Congreso en la XV Legislatura"
                          f"{f' · última actualización registrada: {fecha_decl}' if fecha_decl else ''}. "
                          "Los importes (inmuebles, depósitos, valores, deudas y rentas) los publica el Congreso "
                          "en el Boletín Oficial de las Cortes Generales; consúltense en la fuente oficial."),
            "fecha": fecha_decl,
            "fuente_url": f"{BASE}/es/busqueda-de-diputados",
            "fuente_titulo": "Congreso · Declaraciones de bienes y rentas (BOCG)",
            "tags": ["patrimonio", "declaracion-bienes", "fuente-oficial"],
        })
        fundaciones = [r for r in rows if r.get("TIPO") == "FUNDACIONES"]
        if fundaciones:
            txt = " · ".join((r.get("DESCRIPCION") or r.get("EMPLEADOR") or "").strip()
                             for r in fundaciones if (r.get("DESCRIPCION") or r.get("EMPLEADOR")))
            if txt:
                evid.append({"tipo": "dato", "titulo": "Intereses en fundaciones / entidades",
                             "contenido": txt, "fecha": fecha_decl, "tags": ["intereses"]})
        donaciones = [r for r in rows if r.get("TIPO") == "DONACION"
                      and (r.get("BENEFACTOR") or "").upper() not in ("", "NINGUNO", "NINGUNA")]
        if donaciones:
            txt = " · ".join((r.get("BENEFACTOR") or "").strip() for r in donaciones)
            if txt:
                evid.append({"tipo": "dato", "titulo": "Donaciones declaradas",
                             "contenido": txt, "fecha": fecha_decl, "tags": ["donaciones"]})
        ap.append({"tipo": "evidencia", "orden": 5, "items": evid})

        dossiers.append({
            "slug": slug,
            "nombre": full,
            "cargo": cargo,
            "tags": tags,
            "bio_corta": perfil,
            "fuente_principal": f"{BASE}/es/busqueda-de-diputados",
            "confidence": 0.95,
            "completeness": 0.7 if bio else 0.5,
            "apartados": ap,
        })

    # dedupe por slug (último gana)
    by_slug = {d["slug"]: d for d in dossiers}
    out = list(by_slug.values())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    con_top = sum(1 for d in out if any(i.get("titulo", "").endswith("(cifras)") for ap in d["apartados"] for i in ap["items"]))
    print(f"OK · {len(out)} diputados escritos en {OUT.relative_to(REPO)} · con cifras transcritas: {con_top}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
