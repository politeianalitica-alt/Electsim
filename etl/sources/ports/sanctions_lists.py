"""Sanciones consolidadas · OFAC + EU + UN sin auth.

Tres fuentes públicas que el usuario suministró:
  · OFAC SDN: https://www.treasury.gov/ofac/downloads/sdn.xml (USA)
  · EU consolidated: https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content
  · UN SC consolidated: https://scsanctions.un.org/resources/xml/en/consolidated.xml

Estos endpoints sirven XML público (sin API key). Implementamos un
fetch + parse mínimo para extraer nombres y aliases de personas / empresas
sancionadas, útil para vessel screening cuando OpenSanctions no está disponible.

Política · live siempre que la red lo permita, caché en memoria 24h.
"""
from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

OFAC_SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml"
EU_CONSOLIDATED_URL = (
    "https://webgate.ec.europa.eu/fsd/fsf/public/files/"
    "xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw"
)
UN_SC_CONSOLIDATED_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml"

_CACHE: dict[str, dict[str, Any]] = {}
CACHE_TTL_HOURS = 24


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _cache_valid(key: str) -> bool:
    entry = _CACHE.get(key)
    if not entry:
        return False
    return _now() - entry["fetched_at"] < timedelta(hours=CACHE_TTL_HOURS)


def _http_get(url: str, timeout: float = 30.0) -> bytes | None:
    try:
        try:
            import httpx
            with httpx.Client(timeout=timeout, follow_redirects=True) as c:
                resp = c.get(url)
                resp.raise_for_status()
                return resp.content
        except ImportError:
            import requests  # type: ignore[import-not-found]
            resp = requests.get(url, timeout=timeout, allow_redirects=True)
            resp.raise_for_status()
            return resp.content
    except Exception as exc:
        logger.warning("sanctions_lists fetch %s failed: %s", url, exc)
        return None


# ─────────────────────────────────────────────────────────────────
# Parsers · cada lista usa su propio XML schema
# ─────────────────────────────────────────────────────────────────

def _parse_ofac(xml_bytes: bytes) -> list[dict[str, Any]]:
    """Parsea sdn.xml de OFAC · extrae nombre, sdnType, programs, aliases."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        logger.warning("ofac xml parse error: %s", exc)
        return []
    # SDN.xml usa namespace · http://tempuri.org/sdnList.xsd
    ns = {"s": "http://tempuri.org/sdnList.xsd"}
    out: list[dict[str, Any]] = []
    for entry in root.findall("s:sdnEntry", ns):
        first = entry.findtext("s:firstName", default="", namespaces=ns) or ""
        last = entry.findtext("s:lastName", default="", namespaces=ns) or ""
        name = (first + " " + last).strip() or last or first
        sdn_type = entry.findtext("s:sdnType", default="", namespaces=ns) or ""
        programs = [
            p.text or "" for p in entry.findall("s:programList/s:program", ns)
        ]
        aliases: list[str] = []
        for ak in entry.findall("s:akaList/s:aka", ns):
            af = ak.findtext("s:firstName", default="", namespaces=ns) or ""
            al = ak.findtext("s:lastName", default="", namespaces=ns) or ""
            full = (af + " " + al).strip() or al or af
            if full:
                aliases.append(full)
        if not name:
            continue
        out.append({
            "list": "OFAC_SDN",
            "name": name,
            "schema": sdn_type,
            "programs": programs,
            "aliases": aliases,
        })
    return out


def _parse_eu(xml_bytes: bytes) -> list[dict[str, Any]]:
    """Parsea EU consolidated · estructura SanctionsEntity con NameAlias y Subject."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        logger.warning("eu xml parse error: %s", exc)
        return []
    # El namespace cambia entre versiones · buscamos por local-name
    out: list[dict[str, Any]] = []
    for entity in root.iter():
        tag = entity.tag.split("}", 1)[-1]
        if tag != "sanctionEntity":
            continue
        subject_type = ""
        for s in entity.iter():
            st = s.tag.split("}", 1)[-1]
            if st == "subjectType":
                subject_type = s.get("code") or ""
                break
        names: list[str] = []
        for na in entity.iter():
            if na.tag.split("}", 1)[-1] == "nameAlias":
                whole = na.get("wholeName") or ""
                if whole:
                    names.append(whole)
        if not names:
            continue
        out.append({
            "list": "EU_CONSOLIDATED",
            "name": names[0],
            "schema": subject_type or "person_or_entity",
            "programs": ["EU"],
            "aliases": names[1:],
        })
    return out


def _parse_un(xml_bytes: bytes) -> list[dict[str, Any]]:
    """Parsea UN consolidated · INDIVIDUALS + ENTITIES."""
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError as exc:
        logger.warning("un xml parse error: %s", exc)
        return []
    out: list[dict[str, Any]] = []
    # INDIVIDUALS
    for ind in root.iter("INDIVIDUAL"):
        first = ind.findtext("FIRST_NAME", default="") or ""
        second = ind.findtext("SECOND_NAME", default="") or ""
        third = ind.findtext("THIRD_NAME", default="") or ""
        name = " ".join(x for x in (first, second, third) if x).strip()
        if not name:
            continue
        aliases = [
            a.text or "" for a in ind.findall(".//INDIVIDUAL_ALIAS/ALIAS_NAME") if (a.text or "").strip()
        ]
        programs = [
            p.text or "" for p in ind.findall("UN_LIST_TYPE")
        ]
        out.append({
            "list": "UN_SC",
            "name": name,
            "schema": "Person",
            "programs": programs or ["UN"],
            "aliases": aliases,
        })
    # ENTITIES
    for ent in root.iter("ENTITY"):
        name = (ent.findtext("FIRST_NAME", default="") or "").strip()
        if not name:
            continue
        aliases = [
            a.text or "" for a in ent.findall(".//ENTITY_ALIAS/ALIAS_NAME") if (a.text or "").strip()
        ]
        out.append({
            "list": "UN_SC",
            "name": name,
            "schema": "Organization",
            "programs": ["UN"],
            "aliases": aliases,
        })
    return out


# ─────────────────────────────────────────────────────────────────
# API pública
# ─────────────────────────────────────────────────────────────────

def fetch_ofac() -> list[dict[str, Any]]:
    if _cache_valid("ofac"):
        return _CACHE["ofac"]["data"]
    raw = _http_get(OFAC_SDN_URL)
    data = _parse_ofac(raw) if raw else []
    _CACHE["ofac"] = {"data": data, "fetched_at": _now()}
    return data


def fetch_eu() -> list[dict[str, Any]]:
    if _cache_valid("eu"):
        return _CACHE["eu"]["data"]
    raw = _http_get(EU_CONSOLIDATED_URL)
    data = _parse_eu(raw) if raw else []
    _CACHE["eu"] = {"data": data, "fetched_at": _now()}
    return data


def fetch_un() -> list[dict[str, Any]]:
    if _cache_valid("un"):
        return _CACHE["un"]["data"]
    raw = _http_get(UN_SC_CONSOLIDATED_URL)
    data = _parse_un(raw) if raw else []
    _CACHE["un"] = {"data": data, "fetched_at": _now()}
    return data


def search_consolidated(query: str, limit: int = 20) -> list[dict[str, Any]]:
    """Busca un nombre/alias en las 3 listas consolidadas.

    Match case-insensitive · substring sobre name + aliases.
    """
    q = (query or "").strip().lower()
    if not q:
        return []
    hits: list[dict[str, Any]] = []
    for fetcher in (fetch_ofac, fetch_eu, fetch_un):
        for entry in fetcher():
            haystack = " ".join([entry.get("name", "")] + entry.get("aliases", [])).lower()
            if q in haystack:
                hits.append(entry)
                if len(hits) >= limit:
                    return hits
    return hits


def list_availability() -> dict[str, dict[str, Any]]:
    """Estado de cada lista · útil para /data-sources/status."""
    out: dict[str, dict[str, Any]] = {}
    for key, fetcher, label in (
        ("ofac", fetch_ofac, "OFAC SDN"),
        ("eu", fetch_eu, "EU Consolidated"),
        ("un", fetch_un, "UN Security Council"),
    ):
        data = fetcher()
        out[key] = {
            "label": label,
            "n_entries": len(data),
            "live": len(data) > 0,
        }
    return out


__all__ = [
    "fetch_ofac",
    "fetch_eu",
    "fetch_un",
    "search_consolidated",
    "list_availability",
]
