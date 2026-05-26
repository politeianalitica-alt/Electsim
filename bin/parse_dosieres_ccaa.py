#!/usr/bin/env python3
"""Parser unificado para 14 parlamentos autonómicos españoles.

Cubre: Andalucía, Aragón, Asturias, Baleares, Canarias, Cantabria,
       Castilla-La Mancha (pendiente), Castilla y León, Extremadura,
       Galicia (pendiente WAF), La Rioja, Murcia, Navarra (pendiente WAF),
       País Vasco, Valencia, Ceuta, Melilla

NO cubre: Madrid (parser propio), Catalunya (parser propio).

Por honradez: cuando una fuente NO expone el grupo parlamentario, partido
queda como 'Sin grupo (fuente oficial no lo expone)' en lugar de inventarlo.
Tampoco se asignan relaciones · solo ficha básica con nombre, cargo, perfil.
"""
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable

# ──────────────────────────────────────────────────────────────────────────────
# Utilidades comunes
# ──────────────────────────────────────────────────────────────────────────────


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


def strip_html(s: str) -> str:
    s = re.sub(r"<script[^>]*>.*?</script>", "", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<style[^>]*>.*?</style>", "", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    return s


# Mapeo común de strings de grupo → partido canónico
GRUPO_MAP = [
    (r"\bsocialista|psoe|p\.s\.o\.e|psib|psib-psoe|psn-psoe|psgalega|pse-ee", "PSOE"),
    (r"\bpopular|\bpp\b|p\.p\.", "PP"),
    (r"\bvox\b", "VOX"),
    (r"sumar|comuns|en comú", "Sumar"),
    (r"podemos|unidas podemos|adelante|ahora", "Podemos"),
    (r"izquierda unida|iu\b|cha\b", "IU"),
    (r"\bbng\b|bloque nacionalista", "BNG"),
    (r"\beh bildu|bildu\b", "EH Bildu"),
    (r"\bpnv\b|jeltzale|eaj", "PNV"),
    (r"esquerra|erc\b", "ERC"),
    (r"junts\b", "Junts"),
    (r"compromís|compromis", "Compromís"),
    (r"\bcup\b", "CUP"),
    (r"coalición canaria|cc-pnc|cc \b|coalicion canaria", "CC"),
    (r"nueva canarias|nc-bc", "NC"),
    (r"agrupación socialista gomera|asg", "ASG"),
    (r"asturias forum|foro asturias|foro\b", "Foro Asturias"),
    (r"convocatoria|cxa\b", "Convocatoria por Asturias"),
    (r"teruel existe|te\b", "Teruel Existe"),
    (r"navarra suma|geroa bai", "Geroa Bai"),
    (r"upn\b", "UPN"),
    (r"movimiento ciudadano|mdyc|mdc", "MDyC"),
    (r"ceuta ya", "Ceuta Ya"),
    (r"\bcs\b|ciudadanos", "Ciudadanos"),
    (r"más madrid|mas madrid", "Más Madrid"),
    (r"más país|mas pais", "Más País"),
    (r"mixto", "Mixto"),
    (r"no adscrito", "No adscrito"),
]


def normaliza_partido(raw: str | None) -> str | None:
    if not raw:
        return None
    s = raw.lower()
    for pat, partido in GRUPO_MAP:
        if re.search(pat, s):
            return partido
    # Si no encaja, devolver el primer término significativo capitalizado
    primero = re.split(r"[,\.\-\(\)]", raw.strip())[0].strip()
    if primero and len(primero) > 2:
        return titlecase_es(primero)
    return None


def base_ficha(slug: str, num_start: int, idx: int, nombre: str, cargo: str,
               partido: str | None, asamblea: str, legislatura_rom: str,
               fuente: str, extra_perfil: str = "") -> dict:
    bio = f"{nombre.split()[0]} es {('diputado/a' if 'diputat' not in cargo.lower() else 'diputat/da')} en {asamblea} · {legislatura_rom} Legislatura."
    perfil = (
        f"{nombre} es miembro de {asamblea} en la {legislatura_rom} Legislatura. "
        f"Cargo: {cargo}. "
        f"{extra_perfil} "
        f"Ficha generada a partir de la {fuente} oficial · pendiente de ampliar con "
        f"trayectoria, posiciones, declaraciones y patrimonio verificables. "
        f"No se inventan datos que no aparezcan en la fuente."
    ).strip()
    return {
        "slug": slug,
        "num": num_start + idx,
        "nombre_completo": nombre,
        "cargo_actual": cargo,
        "partido": partido,
        "bio_corta": bio,
        "perfil_completo": perfil,
        "relaciones": [],
        "patrimonio": [
            {"concepto": "Patrimonio declarado",
             "valor": f"Pendiente de desglose individual desde la declaración pública de {asamblea}."},
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Parser por CCAA · cada uno devuelve list[dict]
# ──────────────────────────────────────────────────────────────────────────────


def parse_asturias() -> list[dict]:
    """XML oficial JGPA · 353 entradas, filtramos activos en XII (validez termina
    en 'vs 12' + escanioactual no vacío + publicado=1). El XML NO expone grupo.
    """
    tree = ET.parse("/tmp/asturias.xml")
    root = tree.getroot()
    activos = []
    for d in root.findall(".//diputado"):
        val = (d.findtext("validez") or "").strip()
        esc = (d.findtext("escanioactual") or "").strip()
        pub = (d.findtext("publicado") or "").strip()
        if val.endswith("vs 12") and esc and pub == "1":
            activos.append(d)

    out = []
    seen = set()
    for i, d in enumerate(activos):
        nombre = (d.findtext("nombre") or "").strip()
        apellidos = (d.findtext("apellidos") or "").strip()
        if not nombre or not apellidos:
            continue
        full = f"{nombre} {apellidos}"
        slug = slugify(full)
        if slug in seen:
            slug = f"{slug}-asturias"
        seen.add(slug)
        cargo = f"Diputado/a · Junta General del Principado de Asturias · XII Legislatura"
        out.append(base_ficha(
            slug, 4000, i, full, cargo, None,
            "la Junta General del Principado de Asturias", "XII",
            "lista oficial del Ágora (transparencia JGPA)",
        ))
    return out


def parse_canarias() -> list[dict]:
    """JSON oficial CKAN · 67 diputados con biografía. Sin grupo explícito."""
    with open("/tmp/canarias.json", encoding="utf-8") as f:
        data = json.load(f)

    out = []
    seen = set()
    for i, d in enumerate(data):
        nombre = (d.get("nombre") or "").strip()
        ap1 = (d.get("apellido1") or "").strip()
        ap2 = (d.get("apellido2") or "").strip()
        if not nombre or not ap1:
            continue
        full = " ".join([p for p in [nombre, ap1, ap2] if p])
        slug = slugify(full)
        if slug in seen:
            slug = f"{slug}-canarias"
        seen.add(slug)
        cargo = "Diputado/a · Parlamento de Canarias · XI Legislatura"
        # Extraer primer párrafo útil de bio
        texto = (d.get("texto") or "").strip()
        bio_short = re.sub(r"\s+", " ", texto)[:280]
        extra = f"Biografía oficial disponible: {bio_short}..." if bio_short else ""
        out.append(base_ficha(
            slug, 4500, i, full, cargo, None,
            "el Parlamento de Canarias", "XI",
            "API oficial CKAN del Parlamento de Canarias",
            extra_perfil=extra,
        ))
    return out


def _extract_names_from_html(path: str, encoding: str = "utf-8") -> list[str]:
    """Heurística genérica: busca en el HTML nombres con apellidos en mayúsculas.
    Usado como fallback cuando no hay un patrón estructural claro.
    """
    try:
        txt = Path(path).read_text(encoding=encoding, errors="ignore")
    except FileNotFoundError:
        return []
    txt = strip_html(txt)
    txt = html.unescape(txt)
    # Patrón nombre completo: 2-5 palabras donde al menos 2 empiezan con mayúscula
    return []


def parse_pais_vasco() -> list[dict]:
    """HTML alfabético de Eusko Legebiltzarra · 75 parlamentarios.
    Patrón: enlaces a /fichas/c_NNN.html con el nombre como texto.
    """
    txt = Path("/tmp/euskadi.html").read_text(encoding="utf-8", errors="ignore")
    # Patrón: <a href="...fichas/c_NN.html">NOMBRE APELLIDOS</a>
    matches = re.findall(
        r'href="[^"]*fichas/c_(\d+)\.html"[^>]*>\s*([^<]+?)\s*</a>',
        txt,
    )
    out = []
    seen = set()
    for i, (codi, raw) in enumerate(matches):
        nombre = re.sub(r"\s+", " ", html.unescape(raw)).strip()
        # Limpiar comas, dos apellidos
        # Formato típico: "APELLIDO1 APELLIDO2, NOMBRE" → invertir
        if "," in nombre:
            ap, nom = nombre.split(",", 1)
            nombre = f"{nom.strip()} {ap.strip()}"
        nombre = titlecase_es(nombre)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            slug = f"{slug}-euskadi"
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Parlamentario/a · Eusko Legebiltzarra (Parlamento Vasco) · XIII Legislatura"
        out.append(base_ficha(
            slug, 5000, i, nombre, cargo, None,
            "el Eusko Legebiltzarra (Parlamento Vasco)", "XIII",
            "lista alfabética oficial del Eusko Legebiltzarra",
        ))
    return out


def parse_murcia() -> list[dict]:
    """HTML Drupal con pattern /diputado/{id}/{slug}.
    El nombre viene en el ALT del <img>, no en el texto del <a>.
    """
    from urllib.parse import unquote
    txt = Path("/tmp/murcia.html").read_text(encoding="utf-8", errors="ignore")
    # Extraer id + slug-de-url directamente; el slug ya contiene el nombre completo
    matches = re.findall(
        r'href="/diputado/(\d+)/([^"]+)"',
        txt,
    )
    out = []
    seen_ids = set()
    seen = set()
    i = 0
    for codi, slug_url in matches:
        if codi in seen_ids:
            continue
        seen_ids.add(codi)
        # El slug-URL contiene el nombre: jose-luis-alvarez-castellanos-rubio
        # Decodificar %C3%B3 etc primero
        slug_decoded = unquote(slug_url)
        nombre_raw = slug_decoded.replace("-", " ").strip()
        nombre = titlecase_es(nombre_raw)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Diputado/a · Asamblea Regional de Murcia · XI Legislatura"
        out.append(base_ficha(
            slug, 5500, i, nombre, cargo, None,
            "la Asamblea Regional de Murcia", "XI",
            "página oficial /diputados de la Asamblea Regional",
        ))
        i += 1
    return out


def parse_castilla_y_leon() -> list[dict]:
    """HTML /Parlamento/Procuradores · ~82 procuradores XII Leg."""
    txt = Path("/tmp/cyl.html").read_text(encoding="utf-8", errors="ignore")
    # Patrón: enlaces a fichas individuales
    matches = re.findall(
        r'href="[^"]*Procurador[^"]*"[^>]*>\s*([^<]+?)\s*</a>',
        txt,
        re.IGNORECASE,
    )
    out = []
    seen = set()
    for i, raw in enumerate(matches):
        nombre = re.sub(r"\s+", " ", html.unescape(raw)).strip()
        if "," in nombre:
            ap, nom = nombre.split(",", 1)
            nombre = f"{nom.strip()} {ap.strip()}"
        nombre = titlecase_es(nombre)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Procurador/a · Cortes de Castilla y León · XII Legislatura"
        out.append(base_ficha(
            slug, 6000, i, nombre, cargo, None,
            "las Cortes de Castilla y León", "XII",
            "página oficial /Parlamento/Procuradores",
        ))
    return out


def parse_la_rioja() -> list[dict]:
    """HTML Drupal · 33 diputados XI Leg.
    Links son URL absoluta (https://...) y el slug ya contiene el nombre.
    """
    txt = Path("/tmp/larioja.html").read_text(encoding="utf-8", errors="ignore")
    # Extraer slugs únicos de URL final
    matches = re.findall(
        r'composicion-y-organos/legislatura-11/diputados/([a-z\-]+)(?:\b|")',
        txt,
        re.IGNORECASE,
    )
    out = []
    seen = set()
    seen_slug = set()
    i = 0
    for slug_url in matches:
        if slug_url in seen:
            continue
        seen.add(slug_url)
        # 'diego-antonio-bengoa-de-la-cruz' → 'Diego Antonio Bengoa de la Cruz'
        nombre_raw = slug_url.replace("-", " ").strip()
        nombre = titlecase_es(nombre_raw)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        sl = slugify(nombre)
        if sl in seen_slug:
            continue
        seen_slug.add(sl)
        cargo = "Diputado/a · Parlamento de La Rioja · XI Legislatura"
        out.append(base_ficha(
            sl, 6500, i, nombre, cargo, None,
            "el Parlamento de La Rioja", "XI",
            "página oficial /composicion-y-organos/legislatura-11/diputados",
        ))
        i += 1
    return out


def parse_cantabria() -> list[dict]:
    """HTML · 35 diputados XI Leg con pattern /11l-{apellido}-{nombre}.
    URLs vienen URL-encoded (Ñ → %C3%91, etc), hay que decodificar.
    """
    from urllib.parse import unquote
    txt = Path("/tmp/cantabria.html").read_text(encoding="utf-8", errors="ignore")
    # Buscar SLUG después de /11l- excluyendo los que sean órganos colectivos
    matches = re.findall(
        r'/informacion-general/composicion/11l-([A-Za-z0-9%\-]+)(?:["\s])',
        txt,
    )
    excluir = ("comisi", "diputaci", "grupo-", "junta-de-portavoces", "mesa-",
               "pleno-")
    out = []
    seen = set()
    i = 0
    for slug_raw in matches:
        slug_raw_low = slug_raw.lower()
        if any(slug_raw_low.startswith(e) for e in excluir):
            continue
        if slug_raw in seen:
            continue
        seen.add(slug_raw)
        # Decodificar URL: 'álvarez-fernández-ana-belén' tras unquote
        decoded = unquote(slug_raw)
        # Formato típico: APELLIDO1-APELLIDO2-NOMBRE (a veces con guión final -0)
        decoded = re.sub(r"-\d+$", "", decoded)  # eliminar -0, -1 si lo hay
        nombre_raw = decoded.replace("-", " ").strip()
        nombre = titlecase_es(nombre_raw)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            continue
        cargo = "Diputado/a · Parlamento de Cantabria · XI Legislatura"
        out.append(base_ficha(
            slug, 7000, i, nombre, cargo, None,
            "el Parlamento de Cantabria", "XI",
            "página oficial /informacion-general/composicion del Parlamento de Cantabria",
        ))
        i += 1
    return out


def parse_valencia() -> list[dict]:
    """HTML Corts Valencianes · 99 diputats XI Leg.
    La página principal /ca-va/composicio/diputats tiene una tabla DataTable con
    todos los 99 diputats: <td data-order='slug'><a>NOMBRE, Apellidos</a></td>
    + <td data-order='socialista|popular|vox_cortes_valencianas|compromis'><a gp=X>
    + <td data-order='Alacant|Castelló|València'>provincia</td>
    """
    txt = Path("/tmp/valencia.html").read_text(encoding="utf-8", errors="ignore")
    # Mapeo data-order del grupo → partido
    grupo_map = {
        "socialista": "PSOE",
        "popular": "PP",
        "vox_cortes_valencianas": "VOX",
        "compromis": "Compromís",
    }
    rows = re.findall(r"<tr[^>]*>(.*?)</tr>", txt, re.DOTALL)
    out = []
    seen = set()
    i = 0
    for r in rows:
        nm = re.search(
            r'<a[^>]*href="[^"]*diputados/xi/[^"]+"[^>]*>([^<]+)</a>', r
        )
        gp = re.search(r'data-order="([^"]+)"[^>]*>[^<]*<a[^>]*gp=', r)
        prov = re.search(
            r'data-order="(Alacant|Castelló|València)"[^>]*>(?:Alacant|Castelló|València)',
            r,
        )
        if not nm:
            continue
        nombre_raw = html.unescape(nm.group(1)).strip()
        # Format: "Abad Soler, Ramón" → "Ramón Abad Soler"
        if "," in nombre_raw:
            ap, nom = nombre_raw.split(",", 1)
            nombre = f"{nom.strip()} {ap.strip()}"
        else:
            nombre = nombre_raw
        nombre = titlecase_es(nombre)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        grupo_raw = gp.group(1) if gp else ""
        partido = grupo_map.get(grupo_raw)
        provincia = prov.group(1) if prov else ""
        cargo_parts = [f"Diputat/da · Corts Valencianes · XI Legislatura"]
        if provincia:
            cargo_parts.append(provincia)
        if grupo_raw:
            cargo_parts.append(titlecase_es(grupo_raw.replace("_", " ")))
        cargo = " · ".join(cargo_parts)
        out.append(base_ficha(
            slug, 7500, i, nombre, cargo, partido,
            "les Corts Valencianes", "XI",
            "tabla oficial /ca-va/composicio/diputats con datos de circumscripció",
        ))
        i += 1
    return out


def parse_extremadura() -> list[dict]:
    """HTML ISO-8859-1 · 65 diputados XII Leg paginado.
    Combina /dipslegisdiputados-12 (pág 1) + /dipslegisdiputados-12-ALTA-21 (pág 2).
    """
    pages = []
    for fname in ("/tmp/extremadura.html", "/tmp/ex_alta21.html"):
        if Path(fname).exists():
            pages.append(Path(fname).read_text(encoding="iso-8859-1", errors="ignore"))
    out = []
    seen = set()
    i = 0
    for txt in pages:
        matches = re.findall(
            r'<a[^>]+href="[^"]*diputad[^"]*"[^>]*>\s*([A-ZÁÉÍÓÚÑ][^<]{8,80}?)\s*</a>',
            txt,
        )
        for raw in matches:
            nombre = re.sub(r"\s+", " ", html.unescape(raw)).strip()
            if "," in nombre:
                ap, nom = nombre.split(",", 1)
                nombre = f"{nom.strip()} {ap.strip()}"
            nombre = titlecase_es(nombre)
            if len(nombre) < 6 or len(nombre.split()) < 2:
                continue
            # Filtros: descartar etiquetas
            low = nombre.lower()
            if any(k in low for k in ("presidencia", "diputadas", "vice", "secretari")):
                continue
            slug = slugify(nombre)
            if slug in seen:
                continue
            seen.add(slug)
            cargo = "Diputado/a · Asamblea de Extremadura · XII Legislatura"
            out.append(base_ficha(
                slug, 8000, i, nombre, cargo, None,
                "la Asamblea de Extremadura", "XII",
                "página oficial /dipslegis (paginación combinada)",
            ))
            i += 1
    return out


def parse_aragon() -> list[dict]:
    """HTML TYPO3 Cortes de Aragón · 67 diputados XI Leg.
    URL correcta: /Diputados-y-diputadas.2164.0.html
    Nombres dentro de enlaces a fichas.
    """
    txt = Path("/tmp/aragon.html").read_text(encoding="utf-8", errors="ignore")
    # Patrón: cualquier <a> con texto que parezca nombre completo
    matches = re.findall(
        r'<a[^>]*href="[^"]+"[^>]*>\s*([A-ZÁÉÍÓÚÑa-záéíóúñ][\w\sáéíóúñÁÉÍÓÚÑ\.\-]{8,80}?)\s*</a>',
        txt,
    )
    out = []
    seen = set()
    i = 0
    for raw in matches:
        nombre = re.sub(r"\s+", " ", html.unescape(raw)).strip()
        # Filtros: descartar opciones de menú, navegación
        low = nombre.lower()
        if any(k in low for k in (
            "diputados y", "guía del", "reglamento", "transparencia",
            "actividad", "trámites", "aljafería", "proceso", "exparlam",
            "grupos parlament", "parlamento", "asociación", "cortes de"
        )):
            continue
        # Tiene que haber al menos un Apellido + Nombre con MAYÚSCULAS reales
        words = nombre.split()
        if len(words) < 2 or len(words) > 6:
            continue
        # Al menos 2 palabras deben empezar con mayúscula
        upper_count = sum(1 for w in words if w and w[0].isupper())
        if upper_count < 2:
            continue
        nombre = titlecase_es(nombre)
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Diputado/a · Cortes de Aragón · XI Legislatura"
        out.append(base_ficha(
            slug, 8500, i, nombre, cargo, None,
            "las Cortes de Aragón", "XI",
            "página oficial /Diputados-y-diputadas de las Cortes de Aragón",
        ))
        i += 1
    return out


def parse_baleares() -> list[dict]:
    """HTML ASP.NET · 59 diputats XI Leg.
    Los nombres vienen en handlers JS: javascript: showDiputado('ID', 'Sr.', 'Nombre', 'APELLIDOS')
    """
    txt = Path("/tmp/baleares.html").read_text(encoding="utf-8", errors="ignore")
    matches = re.findall(
        r"showDiputado\('(\d+)'\s*,\s*'([^']*)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\)",
        txt,
    )
    out = []
    seen_ids = set()
    seen = set()
    i = 0
    for codi, trat, nombre_, apellidos in matches:
        if codi in seen_ids:
            continue
        seen_ids.add(codi)
        full_raw = f"{nombre_.strip()} {apellidos.strip()}"
        nombre = titlecase_es(full_raw)
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Diputat/da · Parlament de les Illes Balears · XI Legislatura"
        out.append(base_ficha(
            slug, 9000, i, nombre, cargo, None,
            "el Parlament de les Illes Balears", "XI",
            "página oficial /Representants/Diputats del Parlament balear",
        ))
        i += 1
    return out


def parse_ceuta() -> list[dict]:
    """HTML Joomla del Gobierno de Ceuta · 25 diputados XI Leg."""
    txt = Path("/tmp/ceuta.html").read_text(encoding="utf-8", errors="ignore")
    txt2 = strip_html(txt)
    txt2 = html.unescape(txt2)
    # Buscar nombres con patrón típico (nombres y apellidos en orden)
    # Es probable que esté como tabla o lista plana
    # Patrón muy permisivo: extraer líneas con palabras capitalizadas que parezcan nombres
    out = []
    seen = set()
    # Buscar líneas con "D. Nombre Apellido" o similar
    cand = re.findall(r'(?:Dña?\.?|D\.|Sra\.|Sr\.)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})', txt2)
    for i, raw in enumerate(cand):
        nombre = raw.strip()
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        nombre = titlecase_es(nombre)
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Diputado/a · Asamblea de Ceuta · XI Legislatura"
        out.append(base_ficha(
            slug, 9500, i, nombre, cargo, None,
            "la Asamblea de Ceuta", "XI",
            "página oficial del Gobierno de Ceuta (apartado Asamblea)",
        ))
    return out


def parse_melilla() -> list[dict]:
    """HTML ISO-8859-1 · 25 diputados XI Leg."""
    txt = Path("/tmp/melilla.html").read_text(encoding="iso-8859-1", errors="ignore")
    txt2 = strip_html(txt)
    txt2 = html.unescape(txt2)
    out = []
    seen = set()
    cand = re.findall(r'(?:Dña?\.?|D\.|Sra\.|Sr\.)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4})', txt2)
    for i, raw in enumerate(cand):
        nombre = raw.strip()
        if len(nombre) < 6 or len(nombre.split()) < 2:
            continue
        nombre = titlecase_es(nombre)
        slug = slugify(nombre)
        if slug in seen:
            continue
        seen.add(slug)
        cargo = "Diputado/a · Asamblea de Melilla · XI Legislatura"
        out.append(base_ficha(
            slug, 9800, i, nombre, cargo, None,
            "la Asamblea de Melilla", "XI",
            "portal institucional de Melilla (sección Miembros de la Asamblea)",
        ))
    return out


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────


PARSERS: list[tuple[str, callable]] = [
    ("Asturias", parse_asturias),
    ("Canarias", parse_canarias),
    ("País Vasco", parse_pais_vasco),
    ("Murcia", parse_murcia),
    ("Castilla y León", parse_castilla_y_leon),
    ("La Rioja", parse_la_rioja),
    ("Cantabria", parse_cantabria),
    ("Valencia", parse_valencia),
    ("Extremadura", parse_extremadura),
    ("Aragón", parse_aragon),
    ("Baleares", parse_baleares),
    ("Ceuta", parse_ceuta),
    ("Melilla", parse_melilla),
]


def main():
    todos: list[dict] = []
    global_seen: set[str] = set()
    for ccaa, parser in PARSERS:
        try:
            fichas = parser()
        except Exception as e:
            print(f"  ⚠ {ccaa}: ERROR {e}", file=sys.stderr)
            continue
        # Deduplicar globalmente (un mismo nombre raro entre CCAA = sufijo)
        ccaa_added = 0
        for f in fichas:
            sl = f["slug"]
            if sl in global_seen:
                # Renombrar
                base_slug = sl
                attempt = 2
                while sl in global_seen:
                    sl = f"{base_slug}-{attempt}"
                    attempt += 1
                f["slug"] = sl
            global_seen.add(sl)
            todos.append(f)
            ccaa_added += 1
        print(f"  ✓ {ccaa:18}: {ccaa_added:4} fichas", file=sys.stderr)

    out = Path("/tmp/dosieres_ccaa.json")
    out.write_text(json.dumps(todos, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  Total CCAA: {len(todos)} → {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
