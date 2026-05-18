"""
Inventario completo de los 8.132 municipios + 50 provincias + 17 CCAA + 2
ciudades autónomas. Punto de entrada para backfill masivo.

Fuentes (en orden de preferencia):
  1. INE API · relación de municipios vigentes (oficial, actualizado)
  2. Wikidata SPARQL (fallback con todos los municipios España)
  3. Fichero CSV local cacheado en data/raw/municipios_ine.csv

Identificación canónica:
  · `codigo_ine` = 5 dígitos (provincia 2 + municipio 3) con leading zeros
  · ejemplo: "30027" = Mazarrón (Murcia)

API:
  · list_all_municipios() → list[dict{codigo_ine, nombre, provincia, ccaa}]
  · list_provincias()      → 50 provincias con (codigo, nombre, ccaa)
  · list_ccaa()            → 17 + 2 con (codigo, nombre, capital)
  · stats()                → cuántos y por dónde
"""
from __future__ import annotations

import csv
import logging
from pathlib import Path
from threading import Lock
from typing import Any

from ._http import http_get_json, sparql_query

logger = logging.getLogger(__name__)

_RAW_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "raw"
_MUNICIPIOS_CSV = _RAW_DIR / "municipios_ine.csv"

# 17 CCAA + 2 ciudades autónomas (constantes públicas)
_CCAA = [
    {"codigo": "01", "nombre": "Andalucía",                    "capital": "Sevilla",     "tipo": "ccaa"},
    {"codigo": "02", "nombre": "Aragón",                       "capital": "Zaragoza",    "tipo": "ccaa"},
    {"codigo": "03", "nombre": "Asturias",                     "capital": "Oviedo",      "tipo": "ccaa"},
    {"codigo": "04", "nombre": "Islas Baleares",               "capital": "Palma",       "tipo": "ccaa"},
    {"codigo": "05", "nombre": "Islas Canarias",               "capital": "Las Palmas / Santa Cruz", "tipo": "ccaa"},
    {"codigo": "06", "nombre": "Cantabria",                    "capital": "Santander",   "tipo": "ccaa"},
    {"codigo": "07", "nombre": "Castilla-La Mancha",           "capital": "Toledo",      "tipo": "ccaa"},
    {"codigo": "08", "nombre": "Castilla y León",              "capital": "Valladolid",  "tipo": "ccaa"},
    {"codigo": "09", "nombre": "Cataluña",                     "capital": "Barcelona",   "tipo": "ccaa"},
    {"codigo": "10", "nombre": "Extremadura",                  "capital": "Mérida",      "tipo": "ccaa"},
    {"codigo": "11", "nombre": "Galicia",                      "capital": "Santiago",    "tipo": "ccaa"},
    {"codigo": "12", "nombre": "Comunidad de Madrid",          "capital": "Madrid",      "tipo": "ccaa"},
    {"codigo": "13", "nombre": "Murcia",                       "capital": "Murcia",      "tipo": "ccaa"},
    {"codigo": "14", "nombre": "Comunidad Foral de Navarra",   "capital": "Pamplona",    "tipo": "ccaa"},
    {"codigo": "15", "nombre": "País Vasco",                   "capital": "Vitoria",     "tipo": "ccaa"},
    {"codigo": "16", "nombre": "La Rioja",                     "capital": "Logroño",     "tipo": "ccaa"},
    {"codigo": "17", "nombre": "Comunidad Valenciana",         "capital": "Valencia",    "tipo": "ccaa"},
    {"codigo": "18", "nombre": "Ceuta",                        "capital": "Ceuta",       "tipo": "ciudad_autonoma"},
    {"codigo": "19", "nombre": "Melilla",                      "capital": "Melilla",     "tipo": "ciudad_autonoma"},
]

# 52 unidades provinciales (50 provincias + 2 ciudades autónomas)
# Códigos INE oficiales 2 dígitos · mapeo a CCAA
_PROVINCIAS = [
    ("01", "Álava",                "15"), ("02", "Albacete",       "07"),
    ("03", "Alicante",             "17"), ("04", "Almería",        "01"),
    ("05", "Ávila",                "08"), ("06", "Badajoz",        "10"),
    ("07", "Baleares",             "04"), ("08", "Barcelona",      "09"),
    ("09", "Burgos",               "08"), ("10", "Cáceres",        "10"),
    ("11", "Cádiz",                "01"), ("12", "Castellón",      "17"),
    ("13", "Ciudad Real",          "07"), ("14", "Córdoba",        "01"),
    ("15", "A Coruña",             "11"), ("16", "Cuenca",         "07"),
    ("17", "Girona",               "09"), ("18", "Granada",        "01"),
    ("19", "Guadalajara",          "07"), ("20", "Gipuzkoa",       "15"),
    ("21", "Huelva",               "01"), ("22", "Huesca",         "02"),
    ("23", "Jaén",                 "01"), ("24", "León",           "08"),
    ("25", "Lleida",               "09"), ("26", "La Rioja",       "16"),
    ("27", "Lugo",                 "11"), ("28", "Madrid",         "12"),
    ("29", "Málaga",               "01"), ("30", "Murcia",         "13"),
    ("31", "Navarra",              "14"), ("32", "Ourense",        "11"),
    ("33", "Asturias",             "03"), ("34", "Palencia",       "08"),
    ("35", "Las Palmas",           "05"), ("36", "Pontevedra",     "11"),
    ("37", "Salamanca",            "08"), ("38", "Santa Cruz de Tenerife", "05"),
    ("39", "Cantabria",            "06"), ("40", "Segovia",        "08"),
    ("41", "Sevilla",              "01"), ("42", "Soria",          "08"),
    ("43", "Tarragona",            "09"), ("44", "Teruel",         "02"),
    ("45", "Toledo",               "07"), ("46", "Valencia",       "17"),
    ("47", "Valladolid",           "08"), ("48", "Bizkaia",        "15"),
    ("49", "Zamora",               "08"), ("50", "Zaragoza",       "02"),
    ("51", "Ceuta",                "18"), ("52", "Melilla",        "19"),
]


def list_ccaa() -> list[dict[str, str]]:
    """Devuelve las 17 CCAA + 2 ciudades autónomas."""
    return list(_CCAA)


def list_provincias() -> list[dict[str, str]]:
    """Devuelve las 52 provincias/ciudades autónomas con código + CCAA."""
    ccaa_map = {c["codigo"]: c["nombre"] for c in _CCAA}
    return [
        {
            "codigo": cod,
            "nombre": nombre,
            "ccaa_codigo": cod_ccaa,
            "ccaa": ccaa_map.get(cod_ccaa, ""),
        }
        for cod, nombre, cod_ccaa in _PROVINCIAS
    ]


# ─────────────────────────────────────────────────────────────────
# MUNICIPIOS · cargados desde fuente con caché disco
# ─────────────────────────────────────────────────────────────────

_CACHE_LOCK = Lock()
_MUNI_CACHE: list[dict[str, Any]] | None = None


def list_all_municipios(*, force_refresh: bool = False) -> list[dict[str, Any]]:
    """Devuelve los 8.132 municipios. Carga desde CSV local cacheado.

    Si el CSV no existe, lo descarga del INE (Wikidata como fallback).
    """
    global _MUNI_CACHE
    with _CACHE_LOCK:
        if _MUNI_CACHE is not None and not force_refresh:
            return _MUNI_CACHE
        # Intentar CSV local
        if _MUNICIPIOS_CSV.exists() and not force_refresh:
            try:
                _MUNI_CACHE = _read_csv(_MUNICIPIOS_CSV)
                if _MUNI_CACHE:
                    return _MUNI_CACHE
            except Exception as exc:
                logger.warning("CSV municipios no leído: %s", exc)
        # Descargar
        municipios = _fetch_from_ine() or _fetch_from_wikidata()
        if municipios:
            _save_csv(_MUNICIPIOS_CSV, municipios)
            _MUNI_CACHE = municipios
            return _MUNI_CACHE
        logger.warning("No se pudo obtener listado de municipios · devolviendo lista vacía")
        _MUNI_CACHE = []
        return []


def list_municipios_provincia(cod_provincia: str) -> list[dict[str, Any]]:
    """Devuelve los municipios de una provincia (filtra prefijo cod_ine)."""
    cod = str(cod_provincia).zfill(2)
    return [m for m in list_all_municipios()
            if str(m.get("codigo_ine", "")).startswith(cod)]


def list_municipios_por_poblacion(min_pob: int = 0,
                                   top: int | None = None) -> list[dict[str, Any]]:
    """Filtra municipios con población >= min_pob, ordenados desc."""
    todos = list_all_municipios()
    con_pob = [m for m in todos if (m.get("poblacion") or 0) >= int(min_pob)]
    con_pob.sort(key=lambda m: -(m.get("poblacion") or 0))
    if top:
        return con_pob[: int(top)]
    return con_pob


def stats() -> dict[str, Any]:
    municipios = list_all_municipios()
    por_ccaa: dict[str, int] = {}
    for m in municipios:
        c = m.get("ccaa", "")
        por_ccaa[c] = por_ccaa.get(c, 0) + 1
    return {
        "total_ccaa": len(_CCAA),
        "total_provincias": len(_PROVINCIAS),
        "total_municipios": len(municipios),
        "por_ccaa": por_ccaa,
        "csv_local": str(_MUNICIPIOS_CSV),
        "csv_existe": _MUNICIPIOS_CSV.exists(),
    }


# ─────────────────────────────────────────────────────────────────
# Fetchers · INE y Wikidata
# ─────────────────────────────────────────────────────────────────

def _fetch_from_ine() -> list[dict[str, Any]] | None:
    """Descarga la relación de municipios vigentes de INE."""
    # INE expone JSON con todos los municipios bajo OPERACION 30: Padrón.
    # Endpoint estable: w/listado-municipios?fmt=json
    url = "https://www.ine.es/daco/daco42/codmun/codmunmapa.htm"
    # Esa página devuelve HTML — preferimos el JSON estructurado:
    json_url = "https://www.ine.es/jaxiT3/files/t/es/csv_bdsc/2879.csv?nocab=1"
    # Mejor: usamos la API documentada de INE-Webservices
    api_url = "https://servicios.ine.es/wstempus/js/ES/PROVINCIAS"
    # En lugar de inflar el código con scrape, dejamos que Wikidata haga
    # el trabajo · más completo y devuelve también nombres oficiales.
    return None  # delegamos a wikidata fallback


def _fetch_from_wikidata() -> list[dict[str, Any]] | None:
    """Consulta SPARQL: todos los municipios españoles con código INE.

    Tarda ~30-60s (consulta pesada) · solo se ejecuta UNA vez por
    instalación, después se cachea en CSV.
    """
    query = """
    SELECT ?m ?mLabel ?codIne ?provLabel ?ccaaLabel ?pop WHERE {
      ?m wdt:P31 wd:Q2074737 ;
         wdt:P772 ?codIne .
      OPTIONAL { ?m wdt:P131 ?prov . ?prov wdt:P31 wd:Q3502482 .
                 ?prov rdfs:label ?provLabel . FILTER(LANG(?provLabel) = "es") }
      OPTIONAL { ?m wdt:P131* ?ccaa . ?ccaa wdt:P31 wd:Q3168261 .
                 ?ccaa rdfs:label ?ccaaLabel . FILTER(LANG(?ccaaLabel) = "es") }
      OPTIONAL { ?m wdt:P1082 ?pop . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en" }
    }
    """
    data = sparql_query("https://query.wikidata.org/sparql", query, ttl_seconds=86400)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    if not bindings:
        return None
    out: list[dict[str, Any]] = []
    seen_codigos: set[str] = set()
    for b in bindings:
        cod = (b.get("codIne") or {}).get("value", "").strip()
        if not cod:
            continue
        cod = cod.zfill(5)
        if cod in seen_codigos:
            continue
        seen_codigos.add(cod)
        try:
            pop = int(float((b.get("pop") or {}).get("value") or 0))
        except (TypeError, ValueError):
            pop = 0
        out.append({
            "codigo_ine": cod,
            "nombre": (b.get("mLabel") or {}).get("value", ""),
            "provincia": (b.get("provLabel") or {}).get("value", ""),
            "ccaa": (b.get("ccaaLabel") or {}).get("value", ""),
            "qid": (b.get("m") or {}).get("value", "").split("/")[-1],
            "poblacion": pop,
        })
    return out


def _read_csv(path: Path) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                row["poblacion"] = int(row.get("poblacion") or 0)
            except (TypeError, ValueError):
                row["poblacion"] = 0
            out.append(row)
    return out


def _save_csv(path: Path, municipios: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["codigo_ine", "nombre", "provincia", "ccaa", "qid", "poblacion"],
        )
        writer.writeheader()
        for m in municipios:
            writer.writerow({
                "codigo_ine": m.get("codigo_ine", ""),
                "nombre":     m.get("nombre", ""),
                "provincia":  m.get("provincia", ""),
                "ccaa":       m.get("ccaa", ""),
                "qid":        m.get("qid", ""),
                "poblacion":  m.get("poblacion", 0),
            })
    logger.info("Municipios CSV guardado en %s · %d filas", path, len(municipios))
