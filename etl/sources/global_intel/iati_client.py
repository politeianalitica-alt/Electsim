"""IATI · International Aid Transparency Initiative · https://iatistandard.org

API de transparencia en cooperación al desarrollo. Cubre:
  - 1.000+ organizaciones reportantes (donantes públicos, ONG, agencias UN)
  - Millones de actividades de cooperación con presupuestos detallados
  - Transacciones (commitments, disbursements, expenditures)
  - 200+ países beneficiarios

Endpoint base: https://api.iatistandard.org/datastore/
Autenticación: header `Ocp-Apim-Subscription-Key`
Free tier: 2 calls/segundo, 1000/día (suficiente con cache).

Use cases en Politeia:
  - Tracking de cooperación española (AECID, Cruz Roja, ACF España...)
  - Comparar volumen de ayuda España vs UE
  - Detectar concentración de fondos en países/sectores
  - Identificar ONGs españolas más activas en cooperación internacional

Endpoints clave (Solr-style):
  - /activity/select   · actividades (proyectos)
  - /organisation/select · organizaciones reportantes
  - /transaction/select · transacciones individuales
  - /budget/select     · presupuestos

Reporting orgs españoles relevantes (subset):
  - XM-DAC-7         · Spain (AECID government)
  - ES-DIR3-EA0011488 · AECID (Agencia Española Cooperación)
  - ES-CIF-G81164105 · Acción Contra el Hambre
  - ES-CIF-G28021679 · Cruz Roja Española
  - ES-CIF-G80345349 · MSF España (Médicos Sin Fronteras)
  - ES-CIF-G81233101 · Oxfam Intermón
  - ES-CIF-G81787493 · Save the Children España
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

IATI_BASE = "https://api.iatistandard.org/datastore"
DEFAULT_TIMEOUT_S = 20

_cache: dict[tuple, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(hours=6)


# Organizaciones españolas más relevantes con IATI IDs
SPANISH_ORGS = {
    "aecid_gov": ("XM-DAC-7", "Spain (AECID government)"),
    "aecid": ("ES-DIR3-EA0011488", "AECID · Agencia Española Cooperación"),
    "acf": ("ES-CIF-G81164105", "Acción Contra el Hambre España"),
    "cruz_roja": ("ES-CIF-G28021679", "Cruz Roja Española"),
    "msf": ("ES-CIF-G80345349", "Médicos Sin Fronteras España"),
    "oxfam_es": ("ES-CIF-G81233101", "Oxfam Intermón"),
    "save_children": ("ES-CIF-G81787493", "Save the Children España"),
    "caritas": ("ES-CIF-G28160124", "Cáritas Española"),
    "unicef_es": ("ES-CIF-G84451087", "UNICEF Comité Español"),
    "manos_unidas": ("ES-CIF-G28567790", "Manos Unidas"),
}


def is_available() -> bool:
    return bool(os.environ.get("IATI_API_KEY"))


def _cache_get(key: tuple) -> Any | None:
    e = _cache.get(key)
    if not e:
        return None
    exp, payload = e
    if datetime.now(timezone.utc) >= exp:
        _cache.pop(key, None)
        return None
    return payload


def _cache_set(key: tuple, payload: Any) -> None:
    _cache[key] = (datetime.now(timezone.utc) + _CACHE_TTL, payload)


def _request(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """GET autenticado al datastore Solr-style.

    Falla cerrado · sin key, sin red, rate-limited → estructura vacía.
    """
    if not is_available():
        logger.warning("IATI_API_KEY no configurada · %s", path)
        return {"response": {"numFound": 0, "docs": []}}

    cache_key = (path, tuple(sorted(params.items())))
    cached = _cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        import httpx
    except ImportError:
        return {"response": {"numFound": 0, "docs": []}}

    headers = {
        "Ocp-Apim-Subscription-Key": os.environ["IATI_API_KEY"],
        "Accept": "application/json",
    }
    try:
        with httpx.Client(timeout=DEFAULT_TIMEOUT_S) as cx:
            r = cx.get(f"{IATI_BASE}{path}", params={"wt": "json", **params}, headers=headers)
        if r.status_code == 429:
            logger.warning("IATI rate-limited (429) · usando cache o vacío")
            return {"response": {"numFound": 0, "docs": []}, "rate_limited": True}
        r.raise_for_status()
        payload = r.json()
        _cache_set(cache_key, payload)
        return payload
    except Exception as exc:
        logger.debug("IATI %s falló: %s", path, exc)
        return {"response": {"numFound": 0, "docs": []}, "error": str(exc)[:160]}


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def search_activities(
    query: str = "*:*",
    rows: int = 20,
    sort: str | None = "transaction_value_value desc",
    fields: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Búsqueda Solr genérica de actividades.

    Args:
        query · Solr query string. Ejemplos:
            'reporting_org_ref:XM-DAC-7'         · Spain government
            'recipient_country_code:UA'           · Ayuda a Ucrania
            'sector_code:151'                     · Gobernabilidad
            'activity_status_code:2'              · En implementación
            'reporting_org_ref:XM-DAC-7 AND recipient_country_code:UA'

    Returns: list[dict] con docs Solr (campos según schema IATI).
    """
    params: dict[str, Any] = {"q": query, "rows": rows}
    if sort:
        params["sort"] = sort
    if fields:
        params["fl"] = ",".join(fields)
    payload = _request("/activity/select", params)
    return list(payload.get("response", {}).get("docs", []))


def activities_by_org(org_ref: str, rows: int = 20) -> list[dict[str, Any]]:
    """Actividades reportadas por una organización (IATI Org ID)."""
    return search_activities(
        query=f"reporting_org_ref:\"{org_ref}\"",
        rows=rows,
        fields=[
            "iati_identifier",
            "title_narrative_text",
            "description_narrative_text",
            "recipient_country_code",
            "sector_code",
            "activity_status_code",
            "activity_date_iso_date",
            "transaction_value_value",
            "default_currency",
        ],
    )


def org_summary(org_ref: str) -> dict[str, Any]:
    """Resumen agregado de una organización · # activities, importe total,
    países y sectores top.
    """
    docs = activities_by_org(org_ref, rows=100)
    countries: dict[str, int] = {}
    sectors: dict[str, int] = {}
    total_value = 0.0
    statuses: dict[str, int] = {}
    for d in docs:
        for c in d.get("recipient_country_code", []) or []:
            countries[c] = countries.get(c, 0) + 1
        for s in d.get("sector_code", []) or []:
            sectors[s] = sectors.get(s, 0) + 1
        # transaction_value_value puede ser array
        vals = d.get("transaction_value_value") or []
        if isinstance(vals, list):
            total_value += sum(float(v) for v in vals if v)
        elif isinstance(vals, (int, float)):
            total_value += float(vals)
        st = d.get("activity_status_code")
        if isinstance(st, list) and st:
            st = st[0]
        if st is not None:
            statuses[str(st)] = statuses.get(str(st), 0) + 1

    return {
        "org_ref": org_ref,
        "n_activities_sampled": len(docs),
        "estimated_total_value": round(total_value, 2),
        "top_countries": sorted(countries.items(), key=lambda x: -x[1])[:10],
        "top_sectors": sorted(sectors.items(), key=lambda x: -x[1])[:10],
        "status_breakdown": statuses,
    }


def spain_overview() -> dict[str, Any]:
    """Snapshot · 10 ONGs españolas top + AECID con counts."""
    out = []
    for slug, (ref, name) in SPANISH_ORGS.items():
        docs = activities_by_org(ref, rows=1)
        # Solr exact count requiere otro query
        count_q = _request(
            "/activity/select",
            {"q": f'reporting_org_ref:"{ref}"', "rows": 0},
        )
        n = count_q.get("response", {}).get("numFound", 0)
        out.append({
            "slug": slug,
            "iati_ref": ref,
            "name": name,
            "n_activities": n,
            "sample_title": (
                (docs[0].get("title_narrative_text") or ["?"])[0]
                if docs else None
            ),
        })
    return {"orgs": out, "total_orgs": len(out)}


def activities_to_country(country_iso2: str, rows: int = 20) -> list[dict[str, Any]]:
    """Actividades cuyo beneficiario es un país concreto (ISO-2).

    Útil para tracking de ayuda española a Ucrania, Marruecos, Etiopía, etc.
    """
    return search_activities(
        query=f"recipient_country_code:{country_iso2.upper()}",
        rows=rows,
        fields=[
            "iati_identifier",
            "reporting_org_ref",
            "reporting_org_narrative",
            "title_narrative_text",
            "activity_status_code",
            "transaction_value_value",
        ],
    )


__all__ = [
    "is_available",
    "search_activities",
    "activities_by_org",
    "org_summary",
    "spain_overview",
    "activities_to_country",
    "SPANISH_ORGS",
]
