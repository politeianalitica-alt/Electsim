"""Pipeline declarativo de ingesta con catálogo de conectores."""

from __future__ import annotations

import importlib
import json
from pathlib import Path
from typing import Any

import yaml
from prefect import flow, task
from sqlalchemy import text

from db.session import SessionLocal

CATALOG_PATH = Path("etl/sources/catalog.yml")


def _upsert_ingest_log(source_name: str, last_ingested_at: str | None) -> None:
    with SessionLocal.begin() as session:
        session.execute(
            text(
                """
                INSERT INTO ingest_log (source_name, last_ingested_at)
                VALUES (:source_name, COALESCE(:last_ingested_at::timestamptz, NOW()))
                ON CONFLICT (source_name)
                DO UPDATE SET last_ingested_at = EXCLUDED.last_ingested_at
                """
            ),
            {"source_name": source_name, "last_ingested_at": last_ingested_at},
        )


def _last_ingested_at(source_name: str) -> str | None:
    with SessionLocal() as session:
        row = session.execute(
            text("SELECT last_ingested_at::text FROM ingest_log WHERE source_name = :source_name"),
            {"source_name": source_name},
        ).first()
    return row[0] if row else None


@task
def load_catalog() -> dict[str, Any]:
    if not CATALOG_PATH.exists():
        return {}
    return yaml.safe_load(CATALOG_PATH.read_text(encoding="utf-8")) or {}


def _instantiate_connector(cfg):
    module = importlib.import_module(cfg["module"])
    cls = getattr(module, cfg["class"])

    if not callable(cls):
        raise RuntimeError(f"{cfg['class']} no es instanciable")

    return cls()  # SIN fallback


@task
def run_connector(name: str, cfg: dict[str, Any]) -> dict[str, Any]:
    try:
        connector = _instantiate_connector(cfg)
        since = _last_ingested_at(name)
        mode = str(cfg.get("mode", "batch")).lower()

        if hasattr(connector, "ingest_batch") and mode == "batch":
            out = connector.ingest_batch(since=since)

        elif hasattr(connector, "ingest_stream") and mode == "stream":
            connector.ingest_stream()
            out = None

        elif callable(connector):
            connector = connector()
            connector.run()
            out = None

        elif hasattr(connector, "run"):
            connector.run()
            out = None

        else:
            raise RuntimeError(f"Conector {name} sin método de ejecución compatible")

        _upsert_ingest_log(name, None)
        return {"name": name, "mode": mode, "output": str(out) if out else None}

    except Exception as e:
        return {"name": name, "error": str(e)}


@flow(name="ElectSim España: ingest all declarativo")
def ingest_all() -> list[dict[str, Any]]:
    catalog = load_catalog()
    futures = [run_connector.submit(name, cfg) for name, cfg in catalog.items()]
    return [f.result() for f in futures]


if __name__ == "__main__":
    print(json.dumps(ingest_all(), ensure_ascii=False, indent=2))
