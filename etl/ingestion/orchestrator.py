"""Orquestador de ingesta — coordina fetch → normalize → dedup → enrich → persist."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from etl.ingestion.connectors.bde_connector import fetch_macroeconomic_snapshot
from etl.ingestion.connectors.cis_connector import fetch_latest_barometer
from etl.ingestion.connectors.eurostat_connector import fetch_eu_indicators
from etl.ingestion.connectors.ine_connector import fetch_indicators
from etl.ingestion.connectors.parliamentary_connector import fetch_active_initiatives
from etl.ingestion.connectors.twitter_connector import fetch_tweets
from etl.ingestion.dedup_engine import dedup_items
from etl.ingestion.enrichment import enrich_batch
from etl.ingestion.normalization import normalize_text


class IngestionRun(BaseModel):
    model_config = ConfigDict(extra="ignore")

    run_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    sources_run: List[str] = Field(default_factory=list)
    articles_fetched: int = 0
    articles_kept: int = 0
    articles_dedup: int = 0
    errors: List[str] = Field(default_factory=list)
    mode: str = "demo"


_RUNS: List[IngestionRun] = []

_DEFAULT_SOURCES = ["twitter", "parliamentary", "ine", "eurostat", "bde", "cis"]


def _to_dict(obj) -> dict:
    if hasattr(obj, "model_dump"):
        return obj.model_dump(mode="json")
    if isinstance(obj, dict):
        return obj
    return {"value": str(obj)}


def _fetch_for_source(source: str) -> list[dict]:
    if source == "twitter":
        return [_to_dict(p) | {"title": p.text, "source": "twitter"} for p in fetch_tweets("politica", limit=20)]
    if source == "parliamentary":
        return [
            _to_dict(p) | {"title": p.title, "source": "parliamentary"}
            for p in fetch_active_initiatives(limit=20)
        ]
    if source == "ine":
        return [
            _to_dict(p) | {"title": p.name, "source": "ine"}
            for p in fetch_indicators()
        ]
    if source == "eurostat":
        items = fetch_eu_indicators(country="ES")
        for it in items:
            it["title"] = f"{it.get('indicator')} {it.get('country')}"
            it["source"] = "eurostat"
        return items
    if source == "bde":
        snap = fetch_macroeconomic_snapshot()
        return [
            {
                "title": "BdE snapshot macroeconómico",
                "source": "bde",
                "payload": snap,
            }
        ]
    if source == "cis":
        bar = fetch_latest_barometer()
        return [
            {
                "title": f"CIS barómetro {bar.get('wave', '')}",
                "source": "cis",
                "payload": bar,
            }
        ]
    return []


def run_full_ingestion(
    tenant_id: str, sources: Optional[List[str]] = None
) -> IngestionRun:
    """Ejecuta la pipeline completa para los conectores indicados."""

    run = IngestionRun(
        run_id=f"run_{uuid.uuid4().hex[:12]}",
        started_at=datetime.utcnow(),
        sources_run=[],
        mode="demo",
    )
    selected = sources or _DEFAULT_SOURCES
    all_items: list[dict] = []
    for src in selected:
        try:
            items = _fetch_for_source(src)
            for it in items:
                if "title" in it and isinstance(it["title"], str):
                    it["title"] = normalize_text(it["title"])
                it.setdefault("tenant_id", tenant_id)
            all_items.extend(items)
            run.sources_run.append(src)
        except Exception as exc:  # pragma: no cover
            run.errors.append(f"{src}:{exc}")
    run.articles_fetched = len(all_items)
    dedup = dedup_items(all_items, by_field="title", threshold=5)
    run.articles_kept = len(dedup.kept)
    run.articles_dedup = len(dedup.duplicates)
    try:
        _enriched = enrich_batch(dedup.kept)  # noqa: F841 — solo en memoria por ahora
    except Exception as exc:  # pragma: no cover
        run.errors.append(f"enrich:{exc}")
    run.completed_at = datetime.utcnow()
    _RUNS.append(run)
    if len(_RUNS) > 200:
        del _RUNS[: len(_RUNS) - 200]
    return run


def get_recent_ingestion_runs(tenant_id: str, limit: int = 10) -> List[IngestionRun]:
    """Devuelve las ejecuciones recientes en memoria."""

    return list(reversed(_RUNS[-limit:]))


__all__ = [
    "IngestionRun",
    "run_full_ingestion",
    "get_recent_ingestion_runs",
    "_RUNS",
]
