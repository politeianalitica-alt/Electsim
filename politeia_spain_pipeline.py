#!/usr/bin/env python3
"""
README — Politeia Spain Pipeline (single-file architecture)
===========================================================

Este script ejecuta ingesta + normalización + análisis de fuentes políticas y
open-data de España manteniendo una arquitectura de archivo único.

Uso rápido
----------
1) Instalar dependencias:
   pip install requests pandas beautifulsoup4 xmltodict pyarrow
2) Variables opcionales:
   - POLITEIA_BASE_DIR (default ".")
   - LOG_LEVEL (default INFO)
   - POLITEIA_TIMEOUT_SECONDS (default 45)
   - POLITEIA_RETRIES (default 3)
   - POLITEIA_BACKOFF (default 1.5)
   - POLITEIA_RATE_LIMIT_SECONDS (default 0.2)
3) Comandos:
   python politeia_spain_pipeline.py list-sources
   python politeia_spain_pipeline.py run-source boe_daily_summary
   python politeia_spain_pipeline.py run-all
   python politeia_spain_pipeline.py analyze

Salidas
-------
- Bruto:      ./data/raw/<source>/<fecha>.{json|html|xml.json}
- Normalizado: ./data/normalized/*.parquet + *.csv
- Análisis:   ./data/analysis/*.csv + report.md

Fuentes soportadas (específico vs genérico)
-------------------------------------------
Específicas/API oficial:
- BOE (sumario diario)
- datos.gob.es (catálogo)
- INE Tempus
- Moncloa agenda (HTML oficial)
- Senado agenda (HTML oficial)
- Europarl agendas plenarias (HTML oficial)

Genéricas reutilizables:
- CKAN (package_search con paginación)
- Opendatasoft (catalog con paginación)
- Socrata SODA (records con paginación)
- RSS/Atom XML
- HTML list scraper por selectores CSS

Notas de robustez
-----------------
- Siempre guarda snapshot bruto para auditoría.
- Prioriza API oficial sobre scraping HTML.
- Si una fuente cae, el resto sigue ejecutándose.
- Donde el HTML es frágil, se marca TODO explícito.
"""

from __future__ import annotations

import argparse
import csv
import dataclasses
import difflib
import hashlib
import json
import logging
import os
import re
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional
from urllib.parse import urlencode, urljoin

try:
    import pandas as pd
except ImportError:
    print("Missing dependency: pandas", file=sys.stderr)
    raise

try:
    import requests
except ImportError:
    print("Missing dependency: requests", file=sys.stderr)
    raise

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependency: beautifulsoup4", file=sys.stderr)
    raise

try:
    import xmltodict
except ImportError:
    xmltodict = None  # type: ignore[assignment]

import xml.etree.ElementTree as ET

APP_NAME = "politeia_spain_pipeline"
UTC = timezone.utc
NOW = datetime.now(tz=UTC)
TODAY_YYYYMMDD = NOW.strftime("%Y%m%d")
TODAY_ISO = NOW.strftime("%Y-%m-%d")

BASE_DIR = Path(os.environ.get("POLITEIA_BASE_DIR", ".")).resolve()
RAW_DIR = BASE_DIR / "data" / "raw"
NORMALIZED_DIR = BASE_DIR / "data" / "normalized"
ANALYSIS_DIR = BASE_DIR / "data" / "analysis"
LOG_DIR = BASE_DIR / "logs"
for d in [RAW_DIR, NORMALIZED_DIR, ANALYSIS_DIR, LOG_DIR]:
    d.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_DIR / f"{APP_NAME}.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(APP_NAME)

DEFAULT_HEADERS = {
    "User-Agent": f"{APP_NAME}/1.0 (+research; contact=replace-me)",
    "Accept": "application/json, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.7",
}
RUN_LOGS: List[Dict[str, Any]] = []

POLITICIAN_PATTERNS = [
    r"\bPedro\s+S[aá]nchez\b",
    r"\bAlberto\s+N[uú][nñ]ez\s+Feij[oó]o\b",
    r"\bSantiago\s+Abascal\b",
    r"\bYolanda\s+D[ií]az\b",
    r"\bIsabel\s+D[ií]az\s+Ayuso\b",
    r"\bSalvador\s+Illa\b",
    r"\bJuanma\s+Moreno\b",
    r"\bMar[ií]a\s+Jes[uú]s\s+Montero\b",
]
PARTY_PATTERNS = [
    r"\bPSOE\b",
    r"\bPP\b",
    r"\bVOX\b",
    r"\bSumar\b",
    r"\bPodemos\b",
    r"\bERC\b",
    r"\bJunts\b",
    r"\bPNV\b",
    r"\bBildu\b",
]
TOPIC_PATTERNS = [
    r"\bpresupuesto[s]?\b",
    r"\bcontrato[s]?\b",
    r"\bley(?:es)?\b",
    r"\bdecreto[s]?\b",
    r"\beleccion(?:es)?\b",
    r"\bsubvenci[oó]n(?:es)?\b",
    r"\binfraestructura[s]?\b",
    r"\bsanidad\b",
    r"\beducaci[oó]n\b",
    r"\bvivienda\b",
]


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    return re.sub(r"_+", "_", value).strip("_")


def sha1_text(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8", errors="ignore")).hexdigest()


def ensure_list(obj: Any) -> List[Any]:
    if obj is None:
        return []
    if isinstance(obj, list):
        return obj
    return [obj]


def text_snippet(text: str, limit: int = 500) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text[:limit]


def normalize_day(value: Any) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y%m%d", "%d/%m/%Y", "%Y-%m-%dT%H:%M:%S", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    m = re.search(r"(\d{4}-\d{2}-\d{2})", s)
    return m.group(1) if m else None


def classify_document_type(record_type: Any, title: Any, summary: Any, category: Any) -> str:
    txt = " ".join([str(record_type or ""), str(title or ""), str(summary or ""), str(category or "")]).lower()
    rules = [
        ("real decreto", "real_decreto"),
        ("decreto", "decreto"),
        ("ley", "ley"),
        ("comisión", "comision"),
        ("votación", "votacion"),
        ("agenda", "agenda"),
        ("boe", "boe"),
        ("presupuesto", "presupuesto"),
        ("contrato", "contratacion"),
        ("rss", "noticia_rss"),
    ]
    for k, out in rules:
        if k in txt:
            return out
    return str(record_type or "registro_generico")


def regex_hits(text: str, patterns: List[str]) -> List[str]:
    hits: List[str] = []
    for pat in patterns:
        found = re.findall(pat, text or "", flags=re.IGNORECASE)
        if found:
            if isinstance(found[0], tuple):
                hits.extend([" ".join(x).strip() for x in found])
            else:
                hits.extend(found)
    out = []
    seen = set()
    for item in hits:
        key = item.lower()
        if key not in seen:
            out.append(item)
            seen.add(key)
    return out


@dataclass
class SourceConfig:
    key: str
    label: str
    source_type: str  # api_json | api_xml | ckan | opendatasoft | socrata | rss | html
    base_url: str
    enabled: bool = True
    params: Dict[str, Any] = field(default_factory=dict)
    headers: Dict[str, str] = field(default_factory=dict)
    parser: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class NormalizedRecord:
    source_key: str
    source_label: str
    record_id: str
    title: Optional[str]
    summary: Optional[str]
    body: Optional[str]
    url: Optional[str]
    published_at: Optional[str]
    territory: Optional[str]
    institution: Optional[str]
    category: Optional[str]
    raw_path: Optional[str]
    record_type: Optional[str]
    cargo: Optional[str] = None
    party: Optional[str] = None
    person: Optional[str] = None
    language: str = "es"

    def to_dict(self) -> Dict[str, Any]:
        row = dataclasses.asdict(self)
        fulltext = " ".join([
            row.get("title") or "",
            row.get("summary") or "",
            row.get("body") or "",
            row.get("category") or "",
            row.get("institution") or "",
        ]).strip()
        row["politicians"] = regex_hits(fulltext, POLITICIAN_PATTERNS)
        row["parties"] = regex_hits(fulltext, PARTY_PATTERNS)
        row["topics"] = regex_hits(fulltext, TOPIC_PATTERNS)
        row["text_len"] = len(fulltext)
        row["document_type"] = classify_document_type(row.get("record_type"), row.get("title"), row.get("summary"), row.get("category"))
        row["published_day"] = normalize_day(row.get("published_at"))
        row["ingested_at"] = NOW.isoformat()
        return row


class HttpClient:
    def __init__(self, timeout: int = 45, retries: int = 3, backoff: float = 1.5):
        self.timeout = int(os.environ.get("POLITEIA_TIMEOUT_SECONDS", timeout))
        self.retries = int(os.environ.get("POLITEIA_RETRIES", retries))
        self.backoff = float(os.environ.get("POLITEIA_BACKOFF", backoff))
        self.rate_limit_seconds = float(os.environ.get("POLITEIA_RATE_LIMIT_SECONDS", "0.2"))
        self._last_call_ts = 0.0
        self.session = requests.Session()
        self.session.headers.update(DEFAULT_HEADERS)

    def get(self, url: str, *, params: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
        merged_headers = dict(DEFAULT_HEADERS)
        if headers:
            merged_headers.update(headers)
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.retries + 1):
            try:
                elapsed = time.time() - self._last_call_ts
                if elapsed < self.rate_limit_seconds:
                    time.sleep(self.rate_limit_seconds - elapsed)
                resp = self.session.get(url, params=params, headers=merged_headers, timeout=self.timeout)
                self._last_call_ts = time.time()
                if resp.status_code >= 500:
                    raise requests.HTTPError(f"Server error {resp.status_code} for {resp.url}")
                if resp.status_code == 429:
                    raise requests.HTTPError(f"Rate limit (429) for {resp.url}")
                resp.raise_for_status()
                return resp
            except Exception as exc:
                last_exc = exc
                logger.warning("GET failed [%s/%s] %s | %s", attempt, self.retries, url, exc)
                if attempt < self.retries:
                    time.sleep(self.backoff ** attempt)
        raise RuntimeError(f"GET failed after {self.retries} attempts: {url} | {last_exc}")


HTTP = HttpClient()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def parse_json_response(resp: requests.Response) -> Any:
    ctype = resp.headers.get("Content-Type", "")
    if "json" in ctype or resp.text.lstrip().startswith(("{", "[")):
        return resp.json()
    return json.loads(resp.text)


def parse_xml_response(resp: requests.Response) -> Any:
    if xmltodict is not None:
        return xmltodict.parse(resp.text)
    # Fallback sin dependencia extra (estructura simplificada).
    root = ET.fromstring(resp.text)

    def _node_to_dict(node: ET.Element) -> Any:
        children = list(node)
        text = (node.text or "").strip()
        if not children:
            return text
        out: dict[str, Any] = {}
        for ch in children:
            key = ch.tag.split("}")[-1]
            val = _node_to_dict(ch)
            if key in out:
                if not isinstance(out[key], list):
                    out[key] = [out[key]]
                out[key].append(val)
            else:
                out[key] = val
        return out

    return {root.tag.split("}")[-1]: _node_to_dict(root)}


# -------------------------------
# Source adapters
# -------------------------------

def fetch_api_json(source: SourceConfig) -> List[NormalizedRecord]:
    resp = HTTP.get(source.base_url, params=source.params, headers=source.headers)
    payload = parse_json_response(resp)
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.json"
    write_json(raw_path, payload)
    parser_name = source.parser or "parse_generic_json_records"
    parser = globals()[parser_name]
    return parser(source, payload, raw_path)


def fetch_api_xml(source: SourceConfig) -> List[NormalizedRecord]:
    resp = HTTP.get(source.base_url, params=source.params, headers=source.headers)
    payload = parse_xml_response(resp)
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.xml.json"
    write_json(raw_path, payload)
    parser_name = source.parser or "parse_generic_xml_records"
    parser = globals()[parser_name]
    return parser(source, payload, raw_path)


def fetch_ckan(source: SourceConfig) -> List[NormalizedRecord]:
    url = source.base_url.rstrip("/") + "/api/3/action/package_search"
    rows = int(source.params.get("rows", 100))
    start = int(source.params.get("start", 0))
    max_pages = int(source.params.get("max_pages", 5))
    all_results: list[dict[str, Any]] = []
    payload: dict[str, Any] = {}
    for _ in range(max_pages):
        params = {"rows": rows, "start": start}
        if source.params.get("q"):
            params["q"] = source.params["q"]
        resp = HTTP.get(url, params=params, headers=source.headers)
        payload = parse_json_response(resp)
        result = payload.get("result", {}) if isinstance(payload, dict) else {}
        batch = result.get("results", []) if isinstance(result, dict) else []
        if not batch:
            break
        all_results.extend(batch)
        if len(batch) < rows:
            break
        start += rows
    payload = {"result": {"results": all_results}}
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.json"
    write_json(raw_path, payload)
    return parse_ckan_package_search(source, payload, raw_path)


def fetch_opendatasoft(source: SourceConfig) -> List[NormalizedRecord]:
    url = source.base_url.rstrip("/") + "/api/explore/v2.1/catalog/datasets"
    limit = int(source.params.get("limit", 100))
    offset = int(source.params.get("offset", 0))
    max_pages = int(source.params.get("max_pages", 5))
    all_results: list[dict[str, Any]] = []
    payload: dict[str, Any] = {}
    for _ in range(max_pages):
        params = {"limit": limit, "offset": offset}
        if source.params.get("where"):
            params["where"] = source.params["where"]
        resp = HTTP.get(url, params=params, headers=source.headers)
        payload = parse_json_response(resp)
        batch = payload.get("results", []) if isinstance(payload, dict) else []
        if not batch:
            break
        all_results.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    payload = {"results": all_results}
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.json"
    write_json(raw_path, payload)
    return parse_opendatasoft_catalog(source, payload, raw_path)


def fetch_socrata(source: SourceConfig) -> List[NormalizedRecord]:
    dataset = source.params.get("dataset")
    if not dataset:
        raise ValueError(f"Socrata source '{source.key}' requires params.dataset (e.g. xxxx-xxxx)")
    url = source.base_url.rstrip("/") + f"/resource/{dataset}.json"
    limit = int(source.params.get("limit", 1000))
    offset = int(source.params.get("offset", 0))
    max_pages = int(source.params.get("max_pages", 5))
    all_rows: list[dict[str, Any]] = []
    for _ in range(max_pages):
        params = {"$limit": limit, "$offset": offset}
        if source.params.get("select"):
            params["$select"] = source.params["select"]
        if source.params.get("where"):
            params["$where"] = source.params["where"]
        resp = HTTP.get(url, params=params, headers=source.headers)
        batch = parse_json_response(resp)
        if not isinstance(batch, list) or not batch:
            break
        all_rows.extend(batch)
        if len(batch) < limit:
            break
        offset += limit
    payload = {"results": all_rows}
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.json"
    write_json(raw_path, payload)
    return parse_socrata_records(source, payload, raw_path)


def fetch_rss(source: SourceConfig) -> List[NormalizedRecord]:
    resp = HTTP.get(source.base_url, params=source.params, headers=source.headers)
    payload = parse_xml_response(resp)
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.xml.json"
    write_json(raw_path, payload)
    return parse_rss_or_atom(source, payload, raw_path)


def fetch_html(source: SourceConfig) -> List[NormalizedRecord]:
    resp = HTTP.get(source.base_url, params=source.params, headers=source.headers)
    html = resp.text
    raw_path = RAW_DIR / source.key / f"{TODAY_YYYYMMDD}.html"
    write_text(raw_path, html)
    parser_name = source.parser or "parse_html_generic_list"
    parser = globals()[parser_name]
    return parser(source, html, raw_path)


FETCHERS: Dict[str, Callable[[SourceConfig], List[NormalizedRecord]]] = {
    "api_json": fetch_api_json,
    "api_xml": fetch_api_xml,
    "ckan": fetch_ckan,
    "opendatasoft": fetch_opendatasoft,
    "socrata": fetch_socrata,
    "rss": fetch_rss,
    "html": fetch_html,
}


# -------------------------------
# Parsers
# -------------------------------

def parse_generic_json_records(source: SourceConfig, payload: Any, raw_path: Path) -> List[NormalizedRecord]:
    items: List[Dict[str, Any]]
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        # best-effort candidate keys
        for k in ["results", "result", "items", "data", "value", "dataset"]:
            if k in payload and isinstance(payload[k], list):
                items = payload[k]
                break
            if k in payload and isinstance(payload[k], dict) and isinstance(payload[k].get("results"), list):
                items = payload[k]["results"]
                break
        else:
            items = [payload]
    else:
        items = [{"value": payload}]

    records: List[NormalizedRecord] = []
    for item in items:
        title = item.get("title") or item.get("titulo") or item.get("name") or item.get("label")
        summary = item.get("summary") or item.get("description") or item.get("notes")
        url = item.get("url") or item.get("webUri") or item.get("landingPage") or item.get("link")
        record_id = str(item.get("id") or item.get("identifier") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True)))
        published_at = item.get("issued") or item.get("modified") or item.get("fecha") or item.get("publication_date")
        category = item.get("theme") or item.get("tema") or item.get("category")
        institution = item.get("publisher") if isinstance(item.get("publisher"), str) else source.label
        territory = item.get("territory") or item.get("ccaa") or item.get("comunidad") or item.get("province")
        cargo = item.get("cargo") or item.get("position")
        person = item.get("persona") or item.get("person") or item.get("author")
        party = item.get("partido") or item.get("party")
        body = json.dumps(item, ensure_ascii=False)[:4000]
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=record_id,
                title=title,
                summary=summary,
                body=body,
                url=url,
                published_at=published_at,
                territory=str(territory) if territory else None,
                institution=institution,
                cargo=str(cargo) if cargo else None,
                party=str(party) if party else None,
                person=str(person) if person else None,
                category=category if isinstance(category, str) else json.dumps(category, ensure_ascii=False) if category else None,
                raw_path=str(raw_path),
                record_type=source.source_type,
            )
        )
    return records


def parse_generic_xml_records(source: SourceConfig, payload: Any, raw_path: Path) -> List[NormalizedRecord]:
    body = json.dumps(payload, ensure_ascii=False)[:4000]
    record_id = sha1_text(body)
    return [
        NormalizedRecord(
            source_key=source.key,
            source_label=source.label,
            record_id=record_id,
            title=source.label,
            summary=text_snippet(body, 500),
            body=body,
            url=source.base_url,
            published_at=TODAY_ISO,
            territory=None,
            institution=source.label,
            category=None,
            raw_path=str(raw_path),
            record_type=source.source_type,
        )
    ]


def parse_boe_daily_summary(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    sumario = payload.get("sumario", {}) if isinstance(payload, dict) else {}
    diario = sumario.get("diario", {})
    fecha = diario.get("fecha_publicacion") or TODAY_YYYYMMDD
    secciones = ensure_list(diario.get("seccion"))
    records: List[NormalizedRecord] = []

    for sec in secciones:
        sec_codigo = sec.get("@num") or sec.get("codigo") or ""
        sec_nombre = sec.get("nombre") or sec.get("titulo") or ""
        departamentos = ensure_list(sec.get("departamento"))
        for dep in departamentos:
            dep_nombre = dep.get("nombre") or dep.get("titulo") or source.label
            epigrafes = ensure_list(dep.get("epigrafe"))
            for epi in epigrafes:
                items = ensure_list(epi.get("item"))
                for item in items:
                    identifier = item.get("identificador") or item.get("id") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))
                    title = item.get("titulo") or item.get("title")
                    url = item.get("url_pdf") or item.get("url_html") or item.get("url_xml")
                    summary = item.get("titulo")
                    body = json.dumps(item, ensure_ascii=False)
                    category = f"BOE sección {sec_codigo} {sec_nombre}".strip()
                    records.append(
                        NormalizedRecord(
                            source_key=source.key,
                            source_label=source.label,
                            record_id=str(identifier),
                            title=title,
                            summary=summary,
                            body=body,
                            url=url,
                            published_at=fecha,
                            territory="España",
                            institution=dep_nombre,
                            category=category,
                            raw_path=str(raw_path),
                            record_type="boe_item",
                        )
                    )
    if not records:
        logger.warning("No BOE items parsed for %s", raw_path)
    return records


def parse_datosgob_catalog(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    result = payload.get("result", {}) if isinstance(payload, dict) else {}
    items = ensure_list(result.get("items") or result.get("results") or payload.get("items") or payload.get("results"))
    records: List[NormalizedRecord] = []
    for item in items:
        title = item.get("title") or item.get("label")
        record_id = item.get("identifier") or item.get("id") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))
        description = item.get("description") or item.get("notes")
        publisher = item.get("publisher", {})
        publisher_name = publisher.get("label") if isinstance(publisher, dict) else str(publisher) if publisher else source.label
        landing = item.get("landingPage") or item.get("uri") or item.get("url")
        theme = item.get("theme")
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=str(record_id),
                title=title,
                summary=description,
                body=json.dumps(item, ensure_ascii=False)[:4000],
                url=landing,
                published_at=item.get("modified") or item.get("issued"),
                territory=None,
                institution=publisher_name,
                category=json.dumps(theme, ensure_ascii=False) if theme else None,
                raw_path=str(raw_path),
                record_type="catalog_dataset",
            )
        )
    return records


def parse_ine_tempus(source: SourceConfig, payload: Any, raw_path: Path) -> List[NormalizedRecord]:
    items = payload if isinstance(payload, list) else ensure_list(payload)
    records: List[NormalizedRecord] = []
    for item in items:
        title = item.get("Nombre") or item.get("nombre") or item.get("NombrePadre")
        record_id = item.get("Id") or item.get("COD") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=str(record_id),
                title=title,
                summary=item.get("NombreCorto") or item.get("MetaData") or item.get("Descripcion"),
                body=json.dumps(item, ensure_ascii=False)[:4000],
                url=source.base_url,
                published_at=None,
                territory="España",
                institution="INE",
                category="estadística",
                raw_path=str(raw_path),
                record_type="ine_series_or_node",
            )
        )
    return records


def parse_ckan_package_search(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    results = payload.get("result", {}).get("results", [])
    records: List[NormalizedRecord] = []
    for item in results:
        resources = item.get("resources", [])
        first_url = resources[0].get("url") if resources else item.get("url")
        tags = [t.get("name") for t in item.get("tags", []) if isinstance(t, dict)]
        groups = [g.get("display_name") for g in item.get("groups", []) if isinstance(g, dict)]
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=str(item.get("id") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))),
                title=item.get("title") or item.get("name"),
                summary=item.get("notes"),
                body=json.dumps(item, ensure_ascii=False)[:4000],
                url=first_url,
                published_at=item.get("metadata_modified") or item.get("metadata_created"),
                territory=None,
                institution=source.label,
                category=" | ".join([x for x in tags + groups if x]),
                raw_path=str(raw_path),
                record_type="ckan_dataset",
            )
        )
    return records


def parse_opendatasoft_catalog(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    results = payload.get("results", [])
    records: List[NormalizedRecord] = []
    for item in results:
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=str(item.get("dataset_id") or item.get("id") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))),
                title=item.get("title"),
                summary=item.get("description"),
                body=json.dumps(item, ensure_ascii=False)[:4000],
                url=item.get("dataset_uid") and f"{source.base_url.rstrip('/')}/explore/dataset/{item.get('dataset_uid')}" or source.base_url,
                published_at=item.get("modified") or item.get("created"),
                territory=None,
                institution=source.label,
                category=" | ".join(item.get("themes", []) or []),
                raw_path=str(raw_path),
                record_type="opendatasoft_dataset",
            )
        )
    return records


def parse_socrata_records(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    rows = payload.get("results", []) if isinstance(payload, dict) else []
    records: List[NormalizedRecord] = []
    for item in rows:
        if not isinstance(item, dict):
            continue
        rec_id = item.get("id") or item.get("uuid") or item.get(":id") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))
        title = (
            item.get("title")
            or item.get("titulo")
            or item.get("name")
            or item.get("nombre")
            or item.get("description")
        )
        summary = item.get("description") or item.get("descripcion") or item.get("notes")
        pub = item.get("created_at") or item.get("updated_at") or item.get(":updated_at")
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=str(rec_id),
                title=str(title)[:300] if title else None,
                summary=str(summary)[:1000] if summary else None,
                body=json.dumps(item, ensure_ascii=False)[:4000],
                url=source.base_url,
                published_at=str(pub) if pub else None,
                territory=None,
                institution=source.label,
                category="socrata_dataset_row",
                raw_path=str(raw_path),
                record_type="socrata_row",
            )
        )
    return records


def parse_rss_or_atom(source: SourceConfig, payload: Dict[str, Any], raw_path: Path) -> List[NormalizedRecord]:
    records: List[NormalizedRecord] = []
    channel = payload.get("rss", {}).get("channel") if isinstance(payload, dict) else None
    feed = payload.get("feed") if isinstance(payload, dict) else None
    if channel:
        items = ensure_list(channel.get("item"))
        for item in items:
            records.append(
                NormalizedRecord(
                    source_key=source.key,
                    source_label=source.label,
                    record_id=str(item.get("guid") or item.get("link") or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))),
                    title=item.get("title"),
                    summary=item.get("description"),
                    body=json.dumps(item, ensure_ascii=False)[:4000],
                    url=item.get("link"),
                    published_at=item.get("pubDate"),
                    territory=None,
                    institution=source.label,
                    category="rss",
                    raw_path=str(raw_path),
                    record_type="rss_item",
                )
            )
    elif feed:
        entries = ensure_list(feed.get("entry"))
        for item in entries:
            link = item.get("link")
            if isinstance(link, list):
                link = link[0]
            if isinstance(link, dict):
                link = link.get("@href")
            records.append(
                NormalizedRecord(
                    source_key=source.key,
                    source_label=source.label,
                    record_id=str(item.get("id") or link or sha1_text(json.dumps(item, ensure_ascii=False, sort_keys=True))),
                    title=item.get("title"),
                    summary=item.get("summary"),
                    body=json.dumps(item, ensure_ascii=False)[:4000],
                    url=link,
                    published_at=item.get("updated") or item.get("published"),
                    territory=None,
                    institution=source.label,
                    category="atom",
                    raw_path=str(raw_path),
                    record_type="atom_entry",
                )
            )
    return records


def parse_html_generic_list(source: SourceConfig, html: str, raw_path: Path) -> List[NormalizedRecord]:
    soup = BeautifulSoup(html, "html.parser")
    selectors = source.params.get("selectors", ["article", "li", "div.item", "div.dataset-item"])
    nodes = []
    for sel in selectors:
        found = soup.select(sel)
        if found:
            nodes = found
            break
    records: List[NormalizedRecord] = []
    for idx, node in enumerate(nodes[: source.params.get("max_nodes", 100)]):
        a = node.find("a", href=True)
        title = a.get_text(" ", strip=True) if a else node.get_text(" ", strip=True)[:200]
        summary = node.get_text(" ", strip=True)[:1000]
        link = urljoin(source.base_url, a["href"]) if a else source.base_url
        record_id = sha1_text(f"{source.key}:{idx}:{title}:{link}")
        records.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=record_id,
                title=title,
                summary=summary,
                body=summary,
                url=link,
                published_at=None,
                territory=None,
                institution=source.label,
                category="html_list",
                raw_path=str(raw_path),
                record_type="html_item",
            )
        )
    return records


def parse_html_agenda_events(source: SourceConfig, html: str, raw_path: Path) -> List[NormalizedRecord]:
    """
    Parser específico para agendas institucionales en HTML.
    Mantiene estrategia tolerante: múltiples selectores y fallback al parser genérico.
    TODO: endurecer selectores por dominio cuando se estabilice estructura.
    """
    soup = BeautifulSoup(html, "html.parser")
    selectors = source.params.get(
        "selectors",
        [
            "article",
            ".agenda-item",
            ".event",
            ".listado li",
            "li",
        ],
    )
    nodes = []
    for sel in selectors:
        found = soup.select(sel)
        if found:
            nodes = found
            break
    if not nodes:
        return parse_html_generic_list(source, html, raw_path)

    out: List[NormalizedRecord] = []
    for idx, node in enumerate(nodes[: source.params.get("max_nodes", 120)]):
        a = node.find("a", href=True)
        title = (a.get_text(" ", strip=True) if a else node.get_text(" ", strip=True))[:350]
        if not title:
            continue
        text = node.get_text(" ", strip=True)
        link = urljoin(source.base_url, a["href"]) if a else source.base_url
        date_guess = normalize_day(text) or normalize_day(TODAY_ISO)
        out.append(
            NormalizedRecord(
                source_key=source.key,
                source_label=source.label,
                record_id=sha1_text(f"{source.key}:{idx}:{title}:{link}"),
                title=title,
                summary=text_snippet(text, 700),
                body=text_snippet(text, 2000),
                url=link,
                published_at=date_guess,
                territory=source.params.get("territory") or "España",
                institution=source.label,
                category="agenda_evento",
                raw_path=str(raw_path),
                record_type="agenda_evento",
            )
        )
    return out


# -------------------------------
# Source registry
# -------------------------------

SOURCES: Dict[str, SourceConfig] = {
    # Official APIs verified in 2026
    "boe_daily_summary": SourceConfig(
        key="boe_daily_summary",
        label="BOE diario oficial",
        source_type="api_xml",
        base_url=f"https://www.boe.es/datosabiertos/api/boe/sumario/{TODAY_YYYYMMDD}",
        parser="parse_boe_daily_summary",
        notes="Official daily BOE summary. Change date in URL for historical pulls.",
    ),
    "datosgob_catalog": SourceConfig(
        key="datosgob_catalog",
        label="datos.gob.es catálogo",
        source_type="api_json",
        base_url="https://datos.gob.es/apidata/catalog/dataset",
        params={"_pageSize": 100},
        parser="parse_datosgob_catalog",
        notes="Official semantic catalog API. Useful for discovering publishers and datasets.",
    ),
    "ine_tempus_root": SourceConfig(
        key="ine_tempus_root",
        label="INE Tempus",
        source_type="api_json",
        base_url="https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/50904",
        parser="parse_ine_tempus",
        notes="Example INE endpoint. Replace table ID with the target series/table.",
    ),
    # Regional/local catalogs via CKAN
    "aragon_ckan": SourceConfig(
        key="aragon_ckan",
        label="Aragón Open Data",
        source_type="ckan",
        base_url="https://opendata.aragon.es",
        params={"rows": 100, "q": "presupuesto OR contrato OR elección"},
    ),
    "euskadi_ckan": SourceConfig(
        key="euskadi_ckan",
        label="Open Data Euskadi",
        source_type="ckan",
        base_url="https://opendata.euskadi.eus",
        params={"rows": 100, "q": "presupuesto OR contratación OR elecciones"},
    ),
    "barcelona_opendatasoft": SourceConfig(
        key="barcelona_opendatasoft",
        label="Barcelona Open Data",
        source_type="opendatasoft",
        base_url="https://opendata-ajuntament.barcelona.cat",
        params={"limit": 100},
    ),
    "valencia_opendatasoft": SourceConfig(
        key="valencia_opendatasoft",
        label="Valencia Open Data",
        source_type="opendatasoft",
        base_url="https://valencia.opendatasoft.com",
        params={"limit": 100},
    ),
    # Generic HTML pages that often need scraping
    "madrid_datasets_html": SourceConfig(
        key="madrid_datasets_html",
        label="Datos Madrid",
        source_type="html",
        base_url="https://datos.madrid.es/portal/site/egob/",
        params={"selectors": ["article", "li", ".portlet-listRecord li", ".dataset-item"], "max_nodes": 50},
        notes="HTML discovery fallback; replace with dedicated API endpoint if you identify one.",
    ),
    "andalucia_datasets_html": SourceConfig(
        key="andalucia_datasets_html",
        label="Junta de Andalucía Datos Abiertos",
        source_type="html",
        base_url="https://www.juntadeandalucia.es/datosabiertos/portal.html",
        params={"selectors": ["article", "li", ".views-row", ".dataset-item"], "max_nodes": 50},
    ),
    # Optional RSS/Atom examples
    "boe_news_rss": SourceConfig(
        key="boe_news_rss",
        label="BOE RSS",
        source_type="rss",
        base_url="https://www.boe.es/rss/boe.php",
        notes="General BOE RSS feed if available for your use case.",
    ),
    # Agendas oficiales (HTML con parser específico)
    "moncloa_agenda_html": SourceConfig(
        key="moncloa_agenda_html",
        label="La Moncloa Agenda",
        source_type="html",
        base_url="https://www.lamoncloa.gob.es/gobierno/agenda/paginas/agenda.aspx",
        parser="parse_html_agenda_events",
        params={"selectors": ["article", "li", ".agenda-item"], "max_nodes": 120, "territory": "España"},
        notes="Agenda del Ejecutivo. Endpoint verificado (HTTP 200).",
    ),
    "senado_agenda_html": SourceConfig(
        key="senado_agenda_html",
        label="Senado Agenda",
        source_type="html",
        base_url="https://www.senado.es/web/actividadparlamentaria/actualidad/agenda/index.html",
        parser="parse_html_agenda_events",
        params={"selectors": ["article", "li", ".agenda-item"], "max_nodes": 120, "territory": "España"},
        notes="Agenda del Senado. Endpoint verificado (HTTP 200).",
    ),
    "europarl_agenda_html": SourceConfig(
        key="europarl_agenda_html",
        label="Europarl Plenary Agenda",
        source_type="html",
        base_url="https://www.europarl.europa.eu/plenary/es/agendas.html",
        parser="parse_html_agenda_events",
        params={"selectors": ["article", "li", ".ep-layout-column-item"], "max_nodes": 120, "territory": "UE"},
        notes="Agendas plenarias UE. Endpoint verificado (HTTP 200).",
    ),
    "congreso_agenda_html": SourceConfig(
        key="congreso_agenda_html",
        label="Congreso Agenda",
        source_type="html",
        base_url="https://www.congreso.es/agenda",
        parser="parse_html_agenda_events",
        params={"selectors": ["article", "li", ".agenda-item"], "max_nodes": 120, "territory": "España"},
        enabled=False,
        notes="Actualmente bloqueado (HTTP 403 desde cliente estándar). Mantener para reintento con whitelisting/cookies.",
    ),
    # Adapter Socrata reutilizable (ejemplo deshabilitado; activar al definir dataset real).
    "socrata_placeholder": SourceConfig(
        key="socrata_placeholder",
        label="Socrata Generic",
        source_type="socrata",
        base_url="https://data.cityofnewyork.us",
        params={"dataset": "erm2-nwe9", "limit": 500, "max_pages": 2},
        enabled=False,
        notes="Fuente de ejemplo para validar adapter SODA. Sustituir por dataset objetivo.",
    ),
}


def get_source(source_key: str) -> SourceConfig:
    if source_key not in SOURCES:
        raise KeyError(f"Unknown source: {source_key}")
    return SOURCES[source_key]


# -------------------------------
# Pipeline execution
# -------------------------------

def run_source(source_key: str) -> pd.DataFrame:
    source = get_source(source_key)
    if not source.enabled:
        logger.info("Source disabled: %s", source_key)
        return pd.DataFrame()
    fetcher = FETCHERS[source.source_type]
    logger.info("Running source: %s (%s)", source.key, source.label)
    records = fetcher(source)
    rows = [r.to_dict() for r in records]
    df = pd.DataFrame(rows)
    if not df.empty:
        out_path = NORMALIZED_DIR / f"{source.key}.parquet"
        csv_path = NORMALIZED_DIR / f"{source.key}.csv"
        df.to_parquet(out_path, index=False)
        df.to_csv(csv_path, index=False)
        logger.info("Saved %s rows -> %s", len(df), out_path)
    else:
        logger.warning("No rows for source: %s", source.key)
    return df


def run_all() -> pd.DataFrame:
    frames: List[pd.DataFrame] = []
    for source_key, source in SOURCES.items():
        if source.enabled:
            try:
                df = run_source(source_key)
                if not df.empty:
                    frames.append(df)
            except Exception as exc:
                logger.exception("Source failed: %s | %s", source_key, exc)
    if frames:
        combined = pd.concat(frames, ignore_index=True)
        combined.to_parquet(NORMALIZED_DIR / "all_sources.parquet", index=False)
        combined.to_csv(NORMALIZED_DIR / "all_sources.csv", index=False)
        logger.info("Combined rows: %s", len(combined))
        return combined
    return pd.DataFrame()


# -------------------------------
# Analysis layer
# -------------------------------

def load_all_normalized() -> pd.DataFrame:
    all_path = NORMALIZED_DIR / "all_sources.parquet"
    if all_path.exists():
        return pd.read_parquet(all_path)

    frames = []
    for fp in NORMALIZED_DIR.glob("*.parquet"):
        if fp.name == "all_sources.parquet":
            continue
        frames.append(pd.read_parquet(fp))
    if frames:
        return pd.concat(frames, ignore_index=True)
    return pd.DataFrame()


def explode_counts(df: pd.DataFrame, col: str, out_name: str) -> pd.DataFrame:
    if col not in df.columns or df.empty:
        return pd.DataFrame(columns=[col, "count"])
    tmp = df[[col]].copy()
    tmp[col] = tmp[col].apply(lambda x: x if isinstance(x, list) else [])
    tmp = tmp.explode(col)
    tmp = tmp[tmp[col].notna() & (tmp[col] != "")]
    out = tmp.groupby(col).size().reset_index(name="count").sort_values("count", ascending=False)
    out.to_csv(ANALYSIS_DIR / out_name, index=False)
    return out


def build_dedup_table(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["source_key", "published_day", "title_norm", "url_norm", "count", "similarity_hint"])
    tmp = df.copy()
    tmp["url_norm"] = tmp["url"].fillna("").astype(str).str.strip().str.lower()
    tmp["title_norm"] = (
        tmp["title"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(r"\s+", " ", regex=True)
    )
    tmp["published_day"] = tmp["published_day"].fillna("")
    grouped = (
        tmp.groupby(["source_key", "published_day", "title_norm", "url_norm"])
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    grouped = grouped[grouped["count"] > 1]
    if grouped.empty:
        return grouped
    # Hint de similitud para posibles duplicados cross-source
    hints: list[float] = []
    titles = grouped["title_norm"].tolist()
    for i, t in enumerate(titles):
        best = 0.0
        for j, t2 in enumerate(titles):
            if i == j:
                continue
            best = max(best, difflib.SequenceMatcher(a=t, b=t2).ratio())
        hints.append(round(best, 3))
    grouped["similarity_hint"] = hints
    return grouped


def analyze(df: Optional[pd.DataFrame] = None) -> Dict[str, pd.DataFrame]:
    if df is None or df.empty:
        df = load_all_normalized()
    if df.empty:
        logger.warning("No normalized data found for analysis")
        return {}

    outputs: Dict[str, pd.DataFrame] = {}

    # Basic source stats
    source_stats = (
        df.groupby(["source_key", "source_label"])  # type: ignore[arg-type]
        .agg(records=("record_id", "count"), avg_text_len=("text_len", "mean"))
        .reset_index()
        .sort_values("records", ascending=False)
    )
    source_stats.to_csv(ANALYSIS_DIR / "source_stats.csv", index=False)
    outputs["source_stats"] = source_stats

    # Institution / category counts
    for col, fname in [
        ("institution", "institution_counts.csv"),
        ("category", "category_counts.csv"),
        ("territory", "territory_counts.csv"),
    ]:
        if col in df.columns:
            tmp = (
                df[col].fillna("<missing>").astype(str).value_counts().reset_index()
            )
            tmp.columns = [col, "count"]
            tmp.to_csv(ANALYSIS_DIR / fname, index=False)
            outputs[col] = tmp

    outputs["politicians"] = explode_counts(df, "politicians", "politician_counts.csv")
    outputs["parties"] = explode_counts(df, "parties", "party_counts.csv")
    # topic_counts.csv sigue generandose como conteo legacy de keywords regex
    # pero ya NO se usa como "narrativas" — las narrativas reales las detecta narrative_engine
    outputs["topics"] = explode_counts(df, "topics", "topic_counts.csv")

    # Latest records for analyst review
    if "published_at" in df.columns:
        latest = df.sort_values("published_at", ascending=False, na_position="last").head(200)
    else:
        latest = df.head(200)
    latest.to_csv(ANALYSIS_DIR / "latest_records_review.csv", index=False)
    outputs["latest_records"] = latest

    # Series temporales por institución / fuente
    if "published_day" in df.columns:
        ts = (
            df[df["published_day"].notna() & (df["published_day"] != "")]
            .groupby(["published_day", "source_key"])
            .size()
            .reset_index(name="n_records")
            .sort_values(["published_day", "n_records"], ascending=[True, False])
        )
        ts.to_csv(ANALYSIS_DIR / "time_series_by_source.csv", index=False)
        outputs["time_series_by_source"] = ts
        inst_ts = (
            df[df["published_day"].notna() & (df["published_day"] != "")]
            .groupby(["published_day", "institution"])
            .size()
            .reset_index(name="n_records")
            .sort_values(["published_day", "n_records"], ascending=[True, False])
        )
        inst_ts.to_csv(ANALYSIS_DIR / "time_series_by_institution.csv", index=False)
        outputs["time_series_by_institution"] = inst_ts

    # Tendencia por institución (últimos 7 vs 30 días, según días presentes)
    if "published_day" in df.columns:
        dfx = df[df["published_day"].notna() & (df["published_day"] != "")].copy()
        if not dfx.empty:
            dfx["published_day"] = pd.to_datetime(dfx["published_day"], errors="coerce")
            dfx = dfx[dfx["published_day"].notna()]
            if not dfx.empty:
                max_day = dfx["published_day"].max()
                last_7 = dfx[dfx["published_day"] >= (max_day - pd.Timedelta(days=6))]
                prev_30 = dfx[(dfx["published_day"] < (max_day - pd.Timedelta(days=6))) & (dfx["published_day"] >= (max_day - pd.Timedelta(days=36)))]
                a = last_7.groupby("institution").size().rename("n_7d")
                b = prev_30.groupby("institution").size().rename("n_prev30d")
                trend = pd.concat([a, b], axis=1).fillna(0).reset_index()
                trend["trend_ratio"] = trend.apply(lambda r: round((r["n_7d"] + 1) / (r["n_prev30d"] + 1), 3), axis=1)
                trend = trend.sort_values("trend_ratio", ascending=False)
                trend.to_csv(ANALYSIS_DIR / "institution_trends.csv", index=False)
                outputs["institution_trends"] = trend

    # Duplicate heuristic avanzada (hash + similitud de títulos)
    dupes = build_dedup_table(df)
    dupes.to_csv(ANALYSIS_DIR / "possible_duplicates.csv", index=False)
    outputs["possible_duplicates"] = dupes

    # ---------------------------------------------------------------------------
    # NARRATIVAS REALES — clustering semantico (reemplaza value_counts de topics)
    # ---------------------------------------------------------------------------
    try:
        from analytics.narrative_engine import run_narrative_detection  # type: ignore
        logger.info("Iniciando deteccion de narrativas semanticas...")
        narratives_df = run_narrative_detection(df, output_dir=ANALYSIS_DIR)
        if not narratives_df.empty:
            outputs["narratives"] = narratives_df
            logger.info(
                "Narrativas detectadas: %d (ver %s/narratives.csv)",
                len(narratives_df), ANALYSIS_DIR,
            )
        else:
            logger.warning(
                "narrative_engine no detecto narrativas validas "
                "(corpus insuficiente o LLM no disponible)"
            )
    except ImportError:
        logger.warning(
            "analytics.narrative_engine no disponible — "
            "instala: sentence-transformers umap-learn hdbscan"
        )
    except Exception as exc:
        logger.exception("Error en narrative_engine: %s", exc)

    # ---------------------------------------------------------------------------
    # EVENTOS PARA EL MAPA — corroborados, geolocalizados, con score de relevancia
    # ---------------------------------------------------------------------------
    try:
        from analytics.event_detector import detect_events  # type: ignore
        logger.info("Iniciando deteccion de eventos para el mapa...")
        events_df = detect_events(df, analysis_dir=ANALYSIS_DIR)
        if not events_df.empty:
            outputs["events"] = events_df
            logger.info(
                "Eventos en mapa: %d (ver %s/events_map.csv)",
                len(events_df), ANALYSIS_DIR,
            )
        else:
            logger.warning(
                "event_detector no encontro eventos validos "
                "(score<3 o sin geolocalizacion)"
            )
    except ImportError:
        logger.warning(
            "analytics.event_detector no disponible — "
            "instala: langdetect sentence-transformers"
        )
    except Exception as exc:
        logger.exception("Error en event_detector: %s", exc)

    build_markdown_report(outputs)
    logger.info("Analysis completed: %s", ANALYSIS_DIR)
    return outputs


def build_markdown_report(outputs: Dict[str, pd.DataFrame]) -> None:
    lines = [
        "# Political Data Pipeline Report",
        "",
        f"Generated: {NOW.isoformat()}",
        "",
        "## Source coverage",
    ]
    source_stats = outputs.get("source_stats")
    if source_stats is not None and not source_stats.empty:
        lines.append(source_stats.head(15).to_markdown(index=False))
    else:
        lines.append("No source stats available.")

    for section_key, title in [
        ("politicians", "Named politicians"),
        ("parties", "Party mentions"),
        ("topics", "Topic mentions"),
    ]:
        lines.extend(["", f"## {title}"])
        table = outputs.get(section_key)
        if table is not None and not table.empty:
            lines.append(table.head(25).to_markdown(index=False))
        else:
            lines.append("No hits.")

    lines.extend([
        "",
        "## Analyst notes",
        "- This is a first-pass extraction layer, not a final truth layer.",
        "- HTML sources should be upgraded to dedicated parsers when source-specific structure is stable.",
        "- INE requires target table IDs; replace the example endpoint with the exact table(s) you need.",
        "- Add entity resolution for people/institutions before using this in production dashboards.",
    ])
    (ANALYSIS_DIR / "report.md").write_text("\n".join(lines), encoding="utf-8")


# -------------------------------
# CLI
# -------------------------------

def cli() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Unified Spain political/open-data pipeline")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list-sources", help="List configured sources")
    run_one = sub.add_parser("run-source", help="Run one source")
    run_one.add_argument("source_key", type=str)
    sub.add_parser("run-all", help="Run all enabled sources")
    sub.add_parser("analyze", help="Analyze normalized outputs")

    return parser.parse_args()


def main() -> None:
    args = cli()
    if args.cmd == "list-sources":
        rows = []
        for s in SOURCES.values():
            rows.append({
                "key": s.key,
                "label": s.label,
                "type": s.source_type,
                "enabled": s.enabled,
                "base_url": s.base_url,
                "notes": s.notes,
            })
        table = pd.DataFrame(rows)
        try:
            print(table.to_markdown(index=False))
        except Exception:
            print(table.to_string(index=False))
        return

    if args.cmd == "run-source":
        df = run_source(args.source_key)
        print(f"Rows: {len(df)}")
        return

    if args.cmd == "run-all":
        df = run_all()
        print(f"Combined rows: {len(df)}")
        return

    if args.cmd == "analyze":
        outputs = analyze()
        print(f"Analysis tables: {', '.join(outputs.keys()) if outputs else 'none'}")
        return


if __name__ == "__main__":
    main()
