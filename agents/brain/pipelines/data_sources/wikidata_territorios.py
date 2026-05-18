"""
Wikidata SPARQL para territorios españoles.

Cada territorio español tiene un item Wikidata con:
  · P771 = código INE de municipio
  · P31 = instance of (municipio Q2074737, ccaa, etc.)
  · P6 = head of government (alcalde / presidente)
  · P94 = coat of arms image
  · P41 = flag image
  · P1082 = population
  · P2046 = area
  · P2044 = elevation

API:
  fetch_municipio_by_ine(codigo_ine) → bundle dict
  fetch_ccaa_by_iso(iso)             → bundle dict
"""
from __future__ import annotations

import logging
from typing import Any

from ._http import sparql_query

logger = logging.getLogger(__name__)

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"


def _first_val(bindings: list[dict[str, Any]], key: str, default: str = "") -> str:
    if not bindings:
        return default
    b = bindings[0]
    v = (b.get(key) or {}).get("value")
    return v if v is not None else default


def _commons_url(filename: str) -> str:
    """Construye URL de imagen Wikimedia Commons desde nombre de archivo."""
    if not filename:
        return ""
    # Wikidata devuelve URL directa o filename — soportamos ambos
    if filename.startswith("http"):
        return filename
    name = filename.replace(" ", "_")
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{name}"


def fetch_municipio_by_ine(codigo_ine: str) -> dict[str, Any]:
    """Bundle wikidata para un municipio español por código INE.

    Devuelve:
      {found, qid, wikipedia_url, escudo_url, bandera_url, poblacion, area_km2,
       altitud, alcalde, alcalde_qid, alcalde_partido, alcalde_inicio, …}
    """
    if not codigo_ine:
        return {"found": False}
    qid_query = f"""
    SELECT ?muni ?muniLabel ?wpurl ?coat ?flag ?pop ?area ?elev WHERE {{
      ?muni wdt:P772 "{codigo_ine}" .
      OPTIONAL {{ ?muni wdt:P94 ?coat . }}
      OPTIONAL {{ ?muni wdt:P41 ?flag . }}
      OPTIONAL {{ ?muni wdt:P1082 ?pop . }}
      OPTIONAL {{ ?muni wdt:P2046 ?area . }}
      OPTIONAL {{ ?muni wdt:P2044 ?elev . }}
      OPTIONAL {{ ?wpurl schema:about ?muni; schema:isPartOf <https://es.wikipedia.org/> . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT 1
    """
    data = sparql_query(WIKIDATA_SPARQL, qid_query)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    if not bindings:
        # Reintento con P772 (código INE) usando formato 5 dígitos
        return {"found": False, "codigo_ine": codigo_ine}
    b = bindings[0]
    muni_uri = (b.get("muni") or {}).get("value", "")
    qid = muni_uri.split("/")[-1] if muni_uri else ""

    bundle: dict[str, Any] = {
        "found": True,
        "qid": qid,
        "nombre": (b.get("muniLabel") or {}).get("value", ""),
        "wikipedia_url": (b.get("wpurl") or {}).get("value", ""),
        "escudo_url": _commons_url((b.get("coat") or {}).get("value", "")),
        "bandera_url": _commons_url((b.get("flag") or {}).get("value", "")),
        "poblacion": _safe_int((b.get("pop") or {}).get("value")),
        "area_km2": _safe_float((b.get("area") or {}).get("value")),
        "altitud_m": _safe_int((b.get("elev") or {}).get("value")),
        "codigo_ine": codigo_ine,
    }

    # Alcalde actual (segunda query)
    alc_query = f"""
    SELECT ?alcalde ?alcaldeLabel ?partido ?partidoLabel ?inicio WHERE {{
      wd:{qid} p:P6 ?statement .
      ?statement ps:P6 ?alcalde .
      OPTIONAL {{ ?statement pq:P580 ?inicio . }}
      OPTIONAL {{ ?alcalde wdt:P102 ?partido . }}
      FILTER NOT EXISTS {{ ?statement pq:P582 ?fin }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} ORDER BY DESC(?inicio) LIMIT 1
    """
    alc_data = sparql_query(WIKIDATA_SPARQL, alc_query)
    alc_b = (alc_data or {}).get("results", {}).get("bindings", [])
    if alc_b:
        ab = alc_b[0]
        bundle["alcalde"] = (ab.get("alcaldeLabel") or {}).get("value", "")
        bundle["alcalde_qid"] = (ab.get("alcalde") or {}).get("value", "").split("/")[-1]
        bundle["alcalde_partido"] = (ab.get("partidoLabel") or {}).get("value", "")
        bundle["alcalde_inicio"] = (ab.get("inicio") or {}).get("value", "")[:10]

    # Histórico de alcaldes (últimos 10)
    hist_query = f"""
    SELECT ?alcalde ?alcaldeLabel ?partido ?partidoLabel ?inicio ?fin WHERE {{
      wd:{qid} p:P6 ?st .
      ?st ps:P6 ?alcalde .
      OPTIONAL {{ ?st pq:P580 ?inicio . }}
      OPTIONAL {{ ?st pq:P582 ?fin . }}
      OPTIONAL {{ ?alcalde wdt:P102 ?partido . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} ORDER BY DESC(?inicio) LIMIT 20
    """
    hist_data = sparql_query(WIKIDATA_SPARQL, hist_query)
    hist_b = (hist_data or {}).get("results", {}).get("bindings", [])
    historico = []
    for hb in hist_b:
        historico.append({
            "nombre": (hb.get("alcaldeLabel") or {}).get("value", ""),
            "partido": (hb.get("partidoLabel") or {}).get("value", ""),
            "fecha_inicio": (hb.get("inicio") or {}).get("value", "")[:10],
            "fecha_fin": (hb.get("fin") or {}).get("value", "")[:10],
            "es_actual": not bool((hb.get("fin") or {}).get("value")),
        })
    bundle["historico_alcaldes"] = historico
    return bundle


def fetch_ccaa_by_name(nombre: str) -> dict[str, Any]:
    """Bundle wikidata para una CCAA por nombre."""
    if not nombre:
        return {"found": False}
    query = f"""
    SELECT ?ccaa ?ccaaLabel ?wpurl ?coat ?flag ?pop ?area ?presidente ?presidenteLabel ?partido ?partidoLabel WHERE {{
      ?ccaa wdt:P31 wd:Q3168261 .
      ?ccaa rdfs:label "{nombre}"@es .
      OPTIONAL {{ ?ccaa wdt:P94 ?coat . }}
      OPTIONAL {{ ?ccaa wdt:P41 ?flag . }}
      OPTIONAL {{ ?ccaa wdt:P1082 ?pop . }}
      OPTIONAL {{ ?ccaa wdt:P2046 ?area . }}
      OPTIONAL {{ ?ccaa p:P6 ?st . ?st ps:P6 ?presidente .
                 FILTER NOT EXISTS {{ ?st pq:P582 ?fin }}
                 OPTIONAL {{ ?presidente wdt:P102 ?partido . }} }}
      OPTIONAL {{ ?wpurl schema:about ?ccaa; schema:isPartOf <https://es.wikipedia.org/> . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT 1
    """
    data = sparql_query(WIKIDATA_SPARQL, query)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    if not bindings:
        return {"found": False, "nombre": nombre}
    b = bindings[0]
    return {
        "found": True,
        "qid": (b.get("ccaa") or {}).get("value", "").split("/")[-1],
        "nombre": (b.get("ccaaLabel") or {}).get("value", "") or nombre,
        "wikipedia_url": (b.get("wpurl") or {}).get("value", ""),
        "escudo_url": _commons_url((b.get("coat") or {}).get("value", "")),
        "bandera_url": _commons_url((b.get("flag") or {}).get("value", "")),
        "poblacion": _safe_int((b.get("pop") or {}).get("value")),
        "area_km2": _safe_float((b.get("area") or {}).get("value")),
        "presidente": (b.get("presidenteLabel") or {}).get("value", ""),
        "presidente_partido": (b.get("partidoLabel") or {}).get("value", ""),
    }


def _safe_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def _safe_float(v: Any) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None
