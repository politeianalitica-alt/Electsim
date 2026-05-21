"""Wikidata SPARQL endpoint · https://query.wikidata.org/sparql

Sin auth, ilimitado en uso razonable (timeout 60s).

Usos en Politeia:
  - Grafo de actores políticos · cargos actuales e históricos
  - Afiliaciones partidistas · partidos predecesores/sucesores
  - Consejos administración empresas IBEX/Eurostoxx
  - Relaciones familiares de figuras públicas (cónyuges, padres, hijos)
  - Conexiones entre instituciones (ej. ministros que pasan al sector privado)

Convención · SPARQL queries con prefijos estándar:
  wd:   item       (entidad)
  wdt:  property   (truthy, latest value)
  ps:   property   (statement)
  pq:   qualifier  (when, where, until)
  rdfs: rdfs       (label, comment)
  schema: schema   (about, dateModified)
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

SPARQL_URL = "https://query.wikidata.org/sparql"
DEFAULT_TIMEOUT_S = 30
USER_AGENT = "Politeia-Analitica/1.0 (https://politeia-visual-oscar.vercel.app)"

_cache: dict[str, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=24)


def is_available() -> bool:
    """Wikidata SPARQL es público · siempre disponible."""
    return True


def _cache_get(key: str) -> Any | None:
    e = _cache.get(key)
    if not e: return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: str, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def query(sparql: str, format: str = "json") -> dict[str, Any]:
    """Ejecuta una query SPARQL contra Wikidata.

    Falla cerrado · errores → {"results": {"bindings": []}}.
    """
    cached = _cache_get(sparql)
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"results": {"bindings": []}}

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/sparql-results+json" if format == "json" else "text/csv",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(SPARQL_URL, params={"query": sparql, "format": format}, headers=headers)
        r.raise_for_status()
        payload = r.json() if format == "json" else {"csv": r.text}
        _cache_set(sparql, payload)
        return payload
    except Exception as exc:
        logger.debug("Wikidata SPARQL falló: %s", exc)
        return {"results": {"bindings": []}, "error": str(exc)[:160]}


# ─────────────────────────────────────────────────────────────────
# Helpers de alto nivel · queries pre-construidas útiles para Politeia
# ─────────────────────────────────────────────────────────────────

def politicians_by_country(country_qid: str = "Q29", limit: int = 200) -> list[dict[str, Any]]:
    """Lista políticos vivos del país (Q29 = España).

    Returns: list[{qid, name, party_qid, party_name, position, birth_date}]
    """
    sparql = f"""
    SELECT ?p ?pLabel ?party ?partyLabel ?position ?positionLabel ?birth
    WHERE {{
      ?p wdt:P31 wd:Q5;                     # human
         wdt:P27 wd:{country_qid};          # citizen of
         wdt:P106 wd:Q82955.                # occupation: politician
      OPTIONAL {{ ?p wdt:P102 ?party. }}    # party
      OPTIONAL {{ ?p wdt:P39 ?position. }}  # position held
      OPTIONAL {{ ?p wdt:P569 ?birth. }}
      FILTER NOT EXISTS {{ ?p wdt:P570 ?death. }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }}
    }}
    LIMIT {limit}
    """
    raw = query(sparql)
    out = []
    for b in raw.get("results", {}).get("bindings", []):
        out.append({
            "qid": b.get("p", {}).get("value", "").rsplit("/", 1)[-1],
            "name": b.get("pLabel", {}).get("value"),
            "party_qid": b.get("party", {}).get("value", "").rsplit("/", 1)[-1] or None,
            "party_name": b.get("partyLabel", {}).get("value"),
            "position": b.get("positionLabel", {}).get("value"),
            "birth_date": b.get("birth", {}).get("value", "")[:10] or None,
        })
    return out


def board_members(company_qid: str) -> list[dict[str, Any]]:
    """Miembros del consejo de administración de una empresa.

    company_qid · ej. Q4729345 (Banco Santander), Q1378254 (Repsol).
    """
    sparql = f"""
    SELECT ?p ?pLabel ?role ?roleLabel
    WHERE {{
      wd:{company_qid} p:P3320 ?st.        # board member statement
      ?st ps:P3320 ?p.
      OPTIONAL {{ ?st pq:P39 ?role. }}      # role qualifier
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "es,en". }}
    }}
    """
    raw = query(sparql)
    return [
        {
            "qid": b["p"]["value"].rsplit("/", 1)[-1],
            "name": b.get("pLabel", {}).get("value"),
            "role": b.get("roleLabel", {}).get("value"),
        }
        for b in raw.get("results", {}).get("bindings", [])
    ]


def search_entity(name: str, lang: str = "es", limit: int = 10) -> list[dict[str, Any]]:
    """Búsqueda fuzzy de entidades por nombre. Devuelve top-N matches con QID."""
    # wbsearchentities endpoint (más rápido que SPARQL fuzzy)
    try:
        import httpx
    except ImportError:
        return []
    try:
        with httpx.Client(timeout=15) as cx:
            r = cx.get(
                "https://www.wikidata.org/w/api.php",
                params={
                    "action": "wbsearchentities",
                    "search": name,
                    "language": lang,
                    "limit": limit,
                    "format": "json",
                },
                headers={"User-Agent": USER_AGENT},
            )
        r.raise_for_status()
        return [
            {
                "qid": h.get("id"),
                "label": h.get("label"),
                "description": h.get("description"),
                "url": h.get("concepturi"),
            }
            for h in r.json().get("search", [])
        ]
    except Exception as exc:
        logger.debug("Wikidata search falló: %s", exc)
        return []


__all__ = ["is_available", "query", "politicians_by_country", "board_members", "search_entity"]
