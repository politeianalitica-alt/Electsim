"""
Wikidata SPARQL para políticos españoles.

Cada político con presencia institucional tiene un item Wikidata con:
  · P31 = human
  · P27 = country (debe incluir España Q29)
  · P102 = political party
  · P39 = position held (cargo público) con qualifiers start/end
  · P569 = date of birth
  · P19 = place of birth
  · P69 = education
  · P18 = image
  · P735, P734 = given name, family name

API:
  fetch_politico_by_qid(qid)         → bundle dict
  fetch_politico_by_name(nombre)     → bundle dict (mejor esfuerzo, ambiguity)
  list_politicos_activos(limit)      → lista de QID + nombre (para backfill)
"""
from __future__ import annotations

import logging
from typing import Any

from ._http import sparql_query

logger = logging.getLogger(__name__)

WIKIDATA_SPARQL = "https://query.wikidata.org/sparql"


def _commons_url(filename: str) -> str:
    if not filename:
        return ""
    if filename.startswith("http"):
        return filename
    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{filename.replace(' ', '_')}"


def fetch_politico_by_qid(qid: str) -> dict[str, Any]:
    """Bundle wikidata completo para un político por QID."""
    if not qid:
        return {"found": False}
    if not qid.startswith("Q"):
        qid = "Q" + qid.lstrip("Qq")

    main_query = f"""
    SELECT ?personLabel ?wpurl ?img ?birth ?birthPlace ?birthPlaceLabel
           ?partido ?partidoLabel ?email
    WHERE {{
      BIND(wd:{qid} AS ?person)
      OPTIONAL {{ ?person wdt:P18 ?img . }}
      OPTIONAL {{ ?person wdt:P569 ?birth . }}
      OPTIONAL {{ ?person wdt:P19 ?birthPlace . }}
      OPTIONAL {{ ?person wdt:P102 ?partido . }}
      OPTIONAL {{ ?person wdt:P968 ?email . }}
      OPTIONAL {{ ?wpurl schema:about ?person; schema:isPartOf <https://es.wikipedia.org/> . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT 1
    """
    data = sparql_query(WIKIDATA_SPARQL, main_query)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    if not bindings:
        return {"found": False, "qid": qid}
    b = bindings[0]
    bundle: dict[str, Any] = {
        "found": True,
        "qid": qid,
        "nombre_completo": (b.get("personLabel") or {}).get("value", ""),
        "wikipedia_url": (b.get("wpurl") or {}).get("value", ""),
        "foto_url": _commons_url((b.get("img") or {}).get("value", "")),
        "fecha_nacimiento": (b.get("birth") or {}).get("value", "")[:10],
        "lugar_nacimiento": (b.get("birthPlaceLabel") or {}).get("value", ""),
        "partido_actual": (b.get("partidoLabel") or {}).get("value", ""),
        "email_publico": (b.get("email") or {}).get("value", ""),
    }

    # Cargos (P39) con start/end
    cargos_query = f"""
    SELECT ?cargo ?cargoLabel ?inicio ?fin ?institucion ?institucionLabel WHERE {{
      wd:{qid} p:P39 ?st .
      ?st ps:P39 ?cargo .
      OPTIONAL {{ ?st pq:P580 ?inicio . }}
      OPTIONAL {{ ?st pq:P582 ?fin . }}
      OPTIONAL {{ ?st pq:P642 ?institucion . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} ORDER BY DESC(?inicio) LIMIT 30
    """
    cargos_data = sparql_query(WIKIDATA_SPARQL, cargos_query)
    cargos_b = (cargos_data or {}).get("results", {}).get("bindings", [])
    cargos = []
    for cb in cargos_b:
        cargo_label = (cb.get("cargoLabel") or {}).get("value", "")
        inst_label = (cb.get("institucionLabel") or {}).get("value", "")
        nivel = _detectar_nivel_territorial(cargo_label, inst_label)
        cargos.append({
            "cargo": cargo_label,
            "institucion": inst_label,
            "nivel_territorial": nivel,
            "fecha_inicio": (cb.get("inicio") or {}).get("value", "")[:10],
            "fecha_fin": (cb.get("fin") or {}).get("value", "")[:10],
            "es_actual": not bool((cb.get("fin") or {}).get("value")),
        })
    bundle["cargos"] = cargos

    # Cargo actual
    cargos_actuales = [c for c in cargos if c["es_actual"]]
    if cargos_actuales:
        bundle["cargo_actual"] = cargos_actuales[0]["cargo"]
        bundle["institucion_actual"] = cargos_actuales[0]["institucion"]
        bundle["fecha_posesion_cargo"] = cargos_actuales[0]["fecha_inicio"]

    # Formación (P69)
    form_query = f"""
    SELECT ?eduLabel WHERE {{
      wd:{qid} wdt:P69 ?edu .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT 6
    """
    form_data = sparql_query(WIKIDATA_SPARQL, form_query)
    form_b = (form_data or {}).get("results", {}).get("bindings", [])
    bundle["formacion"] = [(x.get("eduLabel") or {}).get("value", "") for x in form_b]

    # Redes sociales (P2002 = Twitter username, P2003 = Instagram, P2013 = Facebook)
    rrss_query = f"""
    SELECT ?tw ?ig ?fb ?yt ?tt WHERE {{
      BIND(wd:{qid} AS ?p)
      OPTIONAL {{ ?p wdt:P2002 ?tw . }}
      OPTIONAL {{ ?p wdt:P2003 ?ig . }}
      OPTIONAL {{ ?p wdt:P2013 ?fb . }}
      OPTIONAL {{ ?p wdt:P2397 ?yt . }}
      OPTIONAL {{ ?p wdt:P7085 ?tt . }}
    }} LIMIT 1
    """
    rrss_data = sparql_query(WIKIDATA_SPARQL, rrss_query)
    rrss_b = (rrss_data or {}).get("results", {}).get("bindings", [])
    if rrss_b:
        rb = rrss_b[0]
        bundle["redes_sociales"] = {
            "twitter": (rb.get("tw") or {}).get("value", ""),
            "instagram": (rb.get("ig") or {}).get("value", ""),
            "facebook": (rb.get("fb") or {}).get("value", ""),
            "youtube": (rb.get("yt") or {}).get("value", ""),
            "tiktok": (rb.get("tt") or {}).get("value", ""),
        }

    return bundle


def fetch_politico_by_name(nombre: str, *, country_qid: str = "Q29") -> dict[str, Any]:
    """Busca político por nombre exacto (preferiblemente con país=España)."""
    if not nombre:
        return {"found": False}
    nombre_safe = nombre.replace('"', "")
    query = f"""
    SELECT ?p ?pLabel WHERE {{
      ?p rdfs:label "{nombre_safe}"@es .
      ?p wdt:P31 wd:Q5 .
      ?p wdt:P27 wd:{country_qid} .
      ?p wdt:P39 ?cargo .
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT 1
    """
    data = sparql_query(WIKIDATA_SPARQL, query)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    if not bindings:
        return {"found": False, "nombre": nombre}
    qid = (bindings[0].get("p") or {}).get("value", "").split("/")[-1]
    return fetch_politico_by_qid(qid)


def list_politicos_activos(*, limit: int = 100) -> list[dict[str, str]]:
    """Lista QID + nombre de políticos españoles con cargo público activo.

    Útil para backfill: itera y llama fetch_politico_by_qid para cada uno.
    """
    query = f"""
    SELECT DISTINCT ?p ?pLabel ?cargoLabel WHERE {{
      ?p wdt:P31 wd:Q5 .
      ?p wdt:P27 wd:Q29 .
      ?p p:P39 ?st .
      ?st ps:P39 ?cargo .
      FILTER NOT EXISTS {{ ?st pq:P582 ?fin }}
      VALUES ?cargo {{
        wd:Q18171345  # diputado del Congreso
        wd:Q19831149  # senador
        wd:Q1115144   # diputado autonómico
        wd:Q3308935   # alcalde
        wd:Q83307     # ministro
      }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en" }}
    }} LIMIT {int(limit)}
    """
    data = sparql_query(WIKIDATA_SPARQL, query, ttl_seconds=43200)
    bindings = (data or {}).get("results", {}).get("bindings", [])
    out = []
    seen = set()
    for b in bindings:
        qid = (b.get("p") or {}).get("value", "").split("/")[-1]
        nombre = (b.get("pLabel") or {}).get("value", "")
        if not qid or qid in seen:
            continue
        seen.add(qid)
        out.append({
            "qid": qid,
            "nombre": nombre,
            "cargo": (b.get("cargoLabel") or {}).get("value", ""),
        })
    return out


def _detectar_nivel_territorial(cargo: str, institucion: str) -> str:
    """Heurística: a partir del cargo + institución asignar nivel."""
    c = (cargo + " " + institucion).lower()
    if any(k in c for k in ("europ", "eurocámara")):
        return "europeo"
    if any(k in c for k in ("ministro", "presidente del gobierno", "secretari", "congreso",
                             "senad", "diputado nacional", "vicepresidente del gobierno")):
        return "nacional"
    if any(k in c for k in ("autonóm", "parlamento ", "junta de", "generalitat", "gobierno vasco",
                             "xunta", "asamblea", "consejer", "presidente del gobierno de")):
        return "autonomico"
    if any(k in c for k in ("alcalde", "concejal", "ayuntamiento", "municipal", "diputación")):
        return "local"
    return "otro"
