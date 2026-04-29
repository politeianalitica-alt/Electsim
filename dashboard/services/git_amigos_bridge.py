"""Adaptadores locales para los repos de `gits amigos`.

La integración se hace como corpus operativo y señales ligeras: no importamos
stacks completos de terceros en runtime, leemos sus fuentes locales verificables
y las exponemos a las páginas existentes y a Ollama como contexto RAG.
"""
from __future__ import annotations

import hashlib
import json
import math
import re
import time
from collections import Counter
from dataclasses import dataclass
from functools import wraps
from pathlib import Path
from typing import Any, Iterable

import pandas as pd

from etl.logger import get_logger

logger = get_logger(__name__)

ROOT = Path(__file__).resolve().parents[2]
GITS_ROOT = ROOT / "gits amigos"

TEXT_SUFFIXES = {".md", ".rst", ".txt", ".py", ".ts", ".tsx", ".js", ".json", ".yml", ".yaml", ".toml", ".r", ".rd", ".rmd", ".csv"}
SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", "__pycache__", ".venv", "venv"}


@dataclass(frozen=True)
class RepoSpec:
    key: str
    repo: str
    label: str
    layer: str
    domains: tuple[str, ...]
    modules: tuple[str, ...]
    priority_globs: tuple[str, ...]
    keywords: tuple[str, ...]
    tool_name: str | None = None


REPOS: tuple[RepoSpec, ...] = (
    RepoSpec("boe_r", "BOE-master", "BOE R package", "ingesta", ("legislativo", "boe", "borme"), ("D4", "D3", "D6"), ("README.md", "DESCRIPTION", "R/*.R", "man/*.Rd", "tests/fixtures/*.yml"), ("boe", "borme", "sumario", "document", "consolidada"), "boe_local"),
    RepoSpec("senado", "senadoRES-master", "Senado RES", "ingesta", ("legislativo", "senado", "votaciones"), ("D4", "D6", "D2"), ("README.md", "DESCRIPTION", "R/*.R", "man/*.Rd"), ("senado", "leyes", "iniciativas", "votos", "plenarias"), "senado_local"),
    RepoSpec("congreso_ui", "MiCongreso-gh-pages", "Mi Congreso", "ingesta", ("legislativo", "congreso", "electoral"), ("D4", "D2", "D10"), ("README.md", "data.json", "metodos_escanos.js", "script.js"), ("congreso", "diputados", "escanos", "partidos"), "congreso_local"),
    RepoSpec("europarl_mcp", "European-Parliament-MCP-Server-main", "European Parliament MCP", "tool", ("legislativo", "ue", "actores", "geopolitica", "osint"), ("D4", "D2", "D8"), ("README.md", "DATA_MODEL.md", "docs/EP_API_QUICK_REFERENCE.md", "docs/EP_API_INTEGRATION.md", "tests/fixtures/*.ts", "src/**/*.ts"), ("european parliament", "mep", "committee", "procedure", "voting", "osint"), "euparl_query"),
    RepoSpec("cia", "cia-master 2", "Citizen Intelligence Agency", "referencia", ("parlamento", "actores", "worldbank", "votaciones"), ("D2", "D8", "D3"), ("README.md", "json-export-specs/*.md", "service.external.worldbank/**/*.java", "model.external.riksdagen/**/*.java"), ("parliament", "votering", "person", "worldbank", "government"), "parliament_intel"),
    RepoSpec("opensanctions", "opensanctions-main 2", "OpenSanctions", "ingesta", ("osint", "sanciones", "actores", "compliance"), ("D2", "D6", "D8"), ("README.md", "zavod/README.md", "zavod/**/*.py", "opensanctions.yml"), ("sanctions", "entities", "risk", "persons", "follow the money"), "sanctions_lookup"),
    RepoSpec("osint_tools", "osint_stuff_tool_collection-main", "OSINT Tool Collection", "referencia", ("osint", "medios", "geopolitica"), ("D7", "D8", "D6"), ("README.md", "weekly_updates/*.md"), ("osint", "intelligence", "investigation", "sources"), "osint_toolkit"),
    RepoSpec("awesome_osint", "awesome-osint-master", "Awesome OSINT", "referencia", ("osint", "medios", "geopolitica"), ("D7", "D8", "D6"), ("README.md",), ("osint", "social media", "news", "geolocation"), "osint_sources"),
    RepoSpec("apis_osint", "API-s-for-OSINT-main", "APIs for OSINT", "referencia", ("osint", "api", "medios"), ("D7", "D8"), ("README.md",), ("api", "osint", "search", "news"), "osint_apis"),
    RepoSpec("news_crawlers", "news-crawlers-main", "News Crawlers", "ingesta", ("medios", "scraping", "rss"), ("D7", "D6", "D10"), ("README.md", "**/*.py", "**/*.md"), ("news", "crawler", "rss", "scrape"), "news_crawler_patterns"),
    RepoSpec("fundus", "fundus-master", "Fundus", "ingesta", ("medios", "scraping", "news"), ("D7", "D6"), ("README.md", "src/**/*.py", "pyproject.toml"), ("news", "article", "publisher", "crawler"), "fundus_patterns"),
    RepoSpec("freshrss", "FreshRSS-edge", "FreshRSS", "ingesta", ("medios", "rss", "monitoring"), ("D7", "D10"), ("README.md", "cli/README.md", "lib/README.md"), ("rss", "feed", "aggregator"), "rss_hub"),
    RepoSpec("globalthreat", "globalthreatmap-main", "Global Threat Map", "ingesta", ("geopolitica", "osint", "riesgo"), ("D8", "D3", "D6"), ("README.md", "src/**/*.*", "data/**/*.*"), ("threat", "conflict", "map", "risk"), "global_threats"),
    RepoSpec("globalthreat2", "globalthreatmap-main 2", "Global Threat Map 2", "ingesta", ("geopolitica", "osint", "riesgo"), ("D8", "D3", "D6"), ("README.md", "src/**/*.*", "data/**/*.*"), ("threat", "conflict", "map", "risk"), "global_threats_2"),
    RepoSpec("wdi", "world-development-indicators-main", "World Development Indicators", "ingesta", ("economia", "macro", "geopolitica"), ("D8", "D3", "N6"), ("README.md", "indicators/**/*.csv", "scripts/*.py"), ("world bank", "indicator", "gdp", "inflation"), "wdi_context"),
    RepoSpec("tradingeconomics", "tradingeconomics-master", "Trading Economics SDKs", "tool", ("economia", "macro", "api"), ("D3", "N6", "D10"), ("README.md", "python/README.md", "R/README.md", "typescript/README.md"), ("calendar", "markets", "economic", "forecast"), "macro_calendar"),
    RepoSpec("contratos", "contrataciondelestado-master", "Contratación del Estado", "ingesta", ("licitaciones", "compliance", "economia"), ("D4", "D6", "D10"), ("README.md", "**/*.R", "**/*.md"), ("contratacion", "licitacion", "public procurement"), "contratos_publicos"),
    RepoSpec("municipios", "municipios-master", "Municipios", "datos", ("geo", "municipal", "electoral"), ("D2", "D8", "D10"), ("README.md", "dataset/**/*.*", "sql/*.sql", "fuentes/**/*.*"), ("municipios", "ine", "geo", "local"), "municipal_geo"),
    RepoSpec("gisco", "giscoR-main", "GISCO R", "datos", ("geo", "ue", "mapas"), ("D8", "D2"), ("README.md", "DESCRIPTION", "R/*.R"), ("gisco", "eurostat", "geospatial", "nuts"), "gisco_geo"),
    RepoSpec("eudata", "eudata-main", "EU Data", "datos", ("ue", "economia", "geo"), ("D8", "D4"), ("README.md", "**/*.R", "**/*.md"), ("eurostat", "europe", "data"), "eu_data"),
    RepoSpec("pxweb", "pxweb-master", "PXWEB R", "datos", ("estadistica", "ine", "macro"), ("D3", "N6"), ("README.md", "DESCRIPTION", "R/*.R"), ("pxweb", "statistics", "api"), "pxweb_stats"),
    RepoSpec("pysal", "pysal-main", "PySAL", "analitica", ("geo", "spatial", "riesgo"), ("D3", "D8"), ("README.md", "pysal/**/*.py", "pyproject.toml"), ("spatial", "econometrics", "esda"), "spatial_risk"),
    RepoSpec("statsforecast", "statsforecast-main", "StatsForecast", "analitica", ("forecast", "economia", "riesgo"), ("D3", "N6"), ("README.md", "python/statsforecast/**/*.py", "pyproject.toml"), ("forecast", "time series", "arima"), "forecasting"),
    RepoSpec("bertopic", "BERTopic-master", "BERTopic", "nlp", ("nlp", "medios", "narrativas"), ("D7", "D6", "D10"), ("README.md", "bertopic/**/*.py", "pyproject.toml"), ("topic modeling", "bert", "clusters"), "topic_modeling"),
    RepoSpec("graphiti", "graphiti-main", "Graphiti", "kg", ("knowledge_graph", "memoria", "ollama"), ("D2", "D10", "27"), ("README.md", "mcp_server/README.md", "server/README.md", "graphiti_core/**/*.py"), ("knowledge graph", "temporal", "memory", "mcp"), "temporal_kg"),
    RepoSpec("anything_llm", "anything-llm-master", "AnythingLLM", "llm", ("ollama", "rag", "chatbot"), ("27", "D10"), ("README.md", "server/**/*.js", "collector/**/*.js", "docker/*.yml"), ("ollama", "workspace", "rag", "embed"), "rag_workspace"),
    RepoSpec("open_webui", "open-webui-main", "Open WebUI", "llm", ("ollama", "chatbot", "rag"), ("27", "D10"), ("README.md", "pyproject.toml", "backend/**/*.py"), ("ollama", "open-webui", "rag", "chat"), "ollama_ui_patterns"),
    RepoSpec("pydantic_ai", "pydantic-ai-main", "Pydantic AI", "llm", ("agents", "tools", "ollama"), ("27", "D10"), ("README.md", "pydantic_ai_slim/**/*.py", "examples/**/*.py"), ("agent", "tool", "model", "structured output"), "structured_agents"),
    RepoSpec("crewai", "crewAI-main", "CrewAI", "llm", ("agents", "orchestration"), ("27", "D10"), ("README.md", "lib/**/*.py", "pyproject.toml"), ("crew", "agent", "task", "process"), "agent_crews"),
    RepoSpec("langchain", "langchain-master 2", "LangChain", "llm", ("agents", "tools", "rag"), ("27", "D10"), ("README.md", "libs/**/*.py"), ("retriever", "tool", "agent", "chain"), "tool_chains"),
    RepoSpec("dbt", "dbt-core-main", "dbt Core", "etl", ("datos_etl", "calidad"), ("D10", "pipelines"), ("README.md", "core/README.md", "schemas/**/*.json"), ("model", "lineage", "warehouse", "schema"), "data_lineage"),
    RepoSpec("dagster", "dagster-master", "Dagster", "etl", ("datos_etl", "orquestacion"), ("D10", "pipelines"), ("README.md", "examples/README.md", "python_modules/**/*.py"), ("asset", "orchestration", "schedule"), "asset_pipeline"),
    RepoSpec("airbyte", "airbyte-master", "Airbyte", "etl", ("datos_etl", "connectors"), ("D10", "pipelines"), ("README.md", "docusaurus/README.md", "airbyte-integrations/**/*.md"), ("connector", "sync", "source", "destination"), "data_connectors"),
)


def _ttl_cache(seconds: int = 300, maxsize: int = 128):
    def decorator(func):
        cache: dict[Any, tuple[float, Any]] = {}

        @wraps(func)
        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            now = time.monotonic()
            hit = cache.get(key)
            if hit and now - hit[0] < seconds:
                return hit[1]
            value = func(*args, **kwargs)
            if len(cache) >= maxsize:
                cache.pop(min(cache, key=lambda k: cache[k][0]), None)
            cache[key] = (now, value)
            return value

        return wrapper

    return decorator


def _repo_path(spec: RepoSpec) -> Path:
    return GITS_ROOT / spec.repo


def _read_text(path: Path, max_chars: int = 8_000) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except Exception:
        return ""


def _clean(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text


def _tokens(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-záéíóúüñ0-9_-]{3,}", str(text).lower())}


def _score(text: str, query: str, spec: RepoSpec) -> float:
    if not query:
        return 0.5 + min(len(text) / 20_000, 0.4)
    q = _tokens(query)
    hay = _tokens(text)
    overlap = len(q & hay)
    keyword_hits = sum(1 for kw in spec.keywords if kw.lower() in text.lower())
    return overlap * 2.0 + keyword_hits * 0.4 + min(len(text) / 60_000, 0.3)


def _iter_priority_files(spec: RepoSpec, *, max_files: int = 80) -> Iterable[Path]:
    base = _repo_path(spec)
    if not base.exists():
        return []
    files: list[Path] = []
    seen: set[Path] = set()
    for pattern in spec.priority_globs:
        for path in base.glob(pattern):
            if len(files) >= max_files:
                break
            if not path.is_file() or path in seen:
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if path.suffix.lower() not in TEXT_SUFFIXES and path.name.lower() not in {"readme", "dockerfile"}:
                continue
            seen.add(path)
            files.append(path)
    return files


@_ttl_cache(seconds=600, maxsize=1)
def inventory() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for spec in REPOS:
        base = _repo_path(spec)
        priority = [str(p.relative_to(base)) for p in _iter_priority_files(spec, max_files=12)] if base.exists() else []
        readme = _read_text(base / "README.md", 1_200) if base.exists() else ""
        rows.append(
            {
                "key": spec.key,
                "repo": spec.repo,
                "label": spec.label,
                "path": str(base),
                "exists": base.exists(),
                "layer": spec.layer,
                "domains": list(spec.domains),
                "modules": list(spec.modules),
                "tool_name": spec.tool_name,
                "priority_files": priority,
                "excerpt": _clean(readme)[:500],
            }
        )
    return rows


def available_specs(*, domains: Iterable[str] | None = None, modules: Iterable[str] | None = None) -> list[RepoSpec]:
    dset = {d.lower() for d in domains or []}
    mset = {m.lower() for m in modules or []}
    specs: list[RepoSpec] = []
    for spec in REPOS:
        if not _repo_path(spec).exists():
            continue
        if dset and not dset.intersection({d.lower() for d in spec.domains}):
            continue
        if mset and not mset.intersection({m.lower() for m in spec.modules}):
            continue
        specs.append(spec)
    return specs


@_ttl_cache(seconds=300, maxsize=128)
def search_corpus(query: str = "", domain: str | None = None, module: str | None = None, limit: int = 12) -> list[dict[str, Any]]:
    domains = [domain] if domain else None
    modules = [module] if module else None
    results: list[dict[str, Any]] = []
    for spec in available_specs(domains=domains, modules=modules):
        base = _repo_path(spec)
        for path in _iter_priority_files(spec, max_files=60):
            text = _read_text(path, 10_000)
            if not text.strip():
                continue
            s = _score(text, query, spec)
            if query and s <= 0:
                continue
            rel = str(path.relative_to(base))
            path_lower = rel.lower()
            if path_lower.startswith(("tests/", "test/", "spec/", "fixtures/")) or "/fixtures/" in path_lower:
                s -= 2.0
            if rel.lower() in {"readme.md", "description", "data_model.md", "pyproject.toml"}:
                s += 0.8
            results.append(
                {
                    "id": hashlib.sha1(f"{spec.key}:{rel}".encode()).hexdigest()[:16],
                    "repo": spec.repo,
                    "label": spec.label,
                    "layer": spec.layer,
                    "domains": list(spec.domains),
                    "modules": list(spec.modules),
                    "tool_name": spec.tool_name,
                    "path": rel,
                    "title": f"{spec.label} · {rel}",
                    "score": round(float(s), 3),
                    "snippet": _clean(text)[:700],
                    "source_path": str(path),
                }
            )
    results.sort(key=lambda r: r["score"], reverse=True)
    return results[:limit]


def legislative_signals(query: str = "", limit: int = 12) -> list[dict[str, Any]]:
    raw_docs = search_corpus(query=query or "boe senado congreso parliament voting procedure ley iniciativa", domain="legislativo", limit=max(limit * 3, limit))
    docs = [
        doc for doc in raw_docs
        if "/fixtures/" not in str(doc.get("path", "")).lower()
        and not str(doc.get("path", "")).lower().startswith(("tests/", "test/"))
        and ".test." not in str(doc.get("path", "")).lower()
        and ".spec." not in str(doc.get("path", "")).lower()
    ][:limit]
    if len(docs) < limit:
        seen = {doc["id"] for doc in docs}
        docs.extend([doc for doc in raw_docs if doc["id"] not in seen][: limit - len(docs)])
    for doc in docs:
        doc["severity"] = "ALTO" if any(k in doc["snippet"].lower() for k in ("vot", "ley", "procedure", "boe", "senado")) else "MEDIO"
    return docs


def compliance_signals(query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    docs = search_corpus(query=query or "sanctions compliance risk procurement ai act regulation", domain="compliance", limit=limit)
    docs += search_corpus(query=query or "contratacion licitacion public procurement", domain="licitaciones", limit=max(0, limit - len(docs)))
    return docs[:limit]


def osint_signals(query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    return search_corpus(query=query or "osint threat news crawler rss investigation", domain="osint", limit=limit)


def geopolitical_signals(query: str = "", limit: int = 10) -> list[dict[str, Any]]:
    docs = search_corpus(query=query or "threat map europe parliament sanctions world bank", domain="geopolitica", limit=limit)
    events: list[dict[str, Any]] = []
    coords = {
        "UE": (50.85, 4.35),
        "EEUU": (38.9, -77.0),
        "Rusia/Ucrania": (49.0, 32.0),
        "Marruecos": (32.0, -5.0),
        "Sahel": (15.0, -5.0),
    }
    for i, doc in enumerate(docs):
        text = f"{doc['title']} {doc['snippet']}".lower()
        region = "UE" if "europe" in text or "parliament" in text or "euro" in text else "EEUU" if "world bank" in text else "Sahel" if "threat" in text else "Marruecos" if "sanction" in text else "Rusia/Ucrania"
        lat, lon = coords.get(region, (40.4, -3.7))
        risk = min(92, 48 + int(doc["score"] * 6) + i * 3)
        events.append(
            {
                "pais": region,
                "lat": lat,
                "lon": lon,
                "riesgo": risk,
                "tipo": "OSINT" if "osint" in doc["domains"] else "UE" if "ue" in doc["domains"] else "Riesgo",
                "desc": f"{doc['label']}: {doc['path']}",
                "source": doc,
            }
        )
    return events[:limit]


def actor_intelligence(limit: int = 12) -> list[dict[str, Any]]:
    docs = search_corpus(query="mep person parliament sanctions entities diputados senadores", domain="actores", limit=limit)
    out: list[dict[str, Any]] = []
    for doc in docs:
        tipo = "europeo" if "ue" in doc["domains"] or "legislativo" in doc["domains"] else "osint"
        out.append(
            {
                "id": doc["id"],
                "nombre": doc["label"],
                "tipo": tipo,
                "rol": doc["path"],
                "source": doc,
                "score": doc["score"],
            }
        )
    return out


def risk_components() -> dict[str, Any]:
    legislative = len(legislative_signals(limit=20))
    compliance = len(compliance_signals(limit=20))
    osint = len(osint_signals(limit=20))
    geo = len(geopolitical_signals(limit=20))
    repos_ok = sum(1 for row in inventory() if row["exists"])
    total_repos = len(REPOS)
    score = min(100.0, 12.0 + legislative * 1.4 + compliance * 1.2 + osint * 0.9 + geo * 1.1)
    return {
        "score": round(score, 1),
        "repos_disponibles": repos_ok,
        "repos_catalogados": total_repos,
        "legislativo": legislative,
        "compliance": compliance,
        "osint": osint,
        "geopolitica": geo,
        "componentes": {
            "actividad_normativa_local": min(100, legislative * 4),
            "exposicion_compliance": min(100, compliance * 5),
            "presion_osint": min(100, osint * 4),
            "riesgo_geopolitico": min(100, geo * 5),
        },
    }


def alerts(limit: int = 10) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for doc in legislative_signals(limit=4):
        rows.append(_alert_from_doc(doc, "Legislativa", "ALTA" if doc.get("severity") == "ALTO" else "MEDIA"))
    for doc in compliance_signals(limit=3):
        rows.append(_alert_from_doc(doc, "Compliance", "ALTA"))
    for doc in osint_signals(limit=3):
        rows.append(_alert_from_doc(doc, "OSINT", "MEDIA"))
    rows.sort(key=lambda r: {"CRÍTICA": 4, "ALTA": 3, "MEDIA": 2, "BAJA": 1}.get(r["severidad"], 0), reverse=True)
    return rows[:limit]


def _alert_from_doc(doc: dict[str, Any], category: str, severity: str) -> dict[str, Any]:
    return {
        "id": f"git_{doc['id']}",
        "titulo": f"{category}: {doc['label']}",
        "desc": f"{doc['path']} · fuente local gits amigos · tool={doc.get('tool_name') or 'context'}",
        "severidad": severity,
        "categoria": category,
        "fuente": doc["repo"],
        "channels": ["Platform"],
        "leida": False,
        "urgencia": 78 if severity == "ALTA" else 55,
        "novedad": 70,
        "source": doc,
    }


def llm_context_pack(topic: str, *, module: str | None = None, max_chars: int = 5_000) -> str:
    docs = search_corpus(query=topic, module=module, limit=10)
    parts: list[str] = []
    size = 0
    for i, doc in enumerate(docs, 1):
        chunk = (
            f"[GIT {i}] {doc['label']} | {doc['repo']} | {doc['path']} | tool={doc.get('tool_name')}\n"
            f"{doc['snippet']}\n"
        )
        if size + len(chunk) > max_chars:
            remaining = max_chars - size
            if remaining > 160:
                parts.append(chunk[:remaining])
            break
        parts.append(chunk)
        size += len(chunk)
    return "\n---\n".join(parts)


def ollama_ready_documents(limit: int = 80) -> list[dict[str, Any]]:
    docs = search_corpus(query="", limit=limit)
    out: list[dict[str, Any]] = []
    for doc in docs:
        out.append(
            {
                "id": f"git-amigos-{doc['id']}",
                "title": doc["title"],
                "summary": doc["snippet"][:500],
                "text": doc["snippet"],
                "source": f"gits amigos/{doc['repo']}/{doc['path']}",
                "domain": ",".join(doc["domains"]),
                "url": "",
                "published_at": "",
                "raw": doc,
            }
        )
    return out


def sync_to_ai_engine(limit: int = 80) -> dict[str, Any]:
    docs = ollama_ready_documents(limit=limit)
    try:
        from agents.ai_engine import get_ai_engine

        engine = get_ai_engine()
        inserted = engine.upsert_documents(docs)
        status = engine.status()
    except Exception as exc:
        logger.warning("No se pudo sincronizar gits amigos con AIEngine: %s", exc)
        return {"ok": False, "documents": len(docs), "vectors_upserted": 0, "error": str(exc)}
    return {"ok": True, "documents": len(docs), "vectors_upserted": inserted, "engine": status}


def summary_for_module(module: str) -> dict[str, Any]:
    specs = available_specs(modules=[module])
    domains = Counter(d for spec in specs for d in spec.domains)
    docs = search_corpus(query="", module=module, limit=8)
    return {
        "module": module,
        "repos": len(specs),
        "domains": dict(domains),
        "tools": [spec.tool_name for spec in specs if spec.tool_name],
        "top_docs": docs,
    }


def data_frame_inventory() -> pd.DataFrame:
    return pd.DataFrame(inventory())
