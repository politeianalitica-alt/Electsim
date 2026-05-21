"""Loader del seed `port_terminals_seed.yaml` → tabla `port_terminals`.

Sprint 2 Fase C · módulo Puertos.

Uso:

  # Cargar a BD (idempotente · upsert por (port_slug, terminal_name))
  python -m etl.sources.ports.terminals_loader

  # API · lectura sin BD (sirve desde YAML directamente)
  from etl.sources.ports.terminals_loader import list_terminals
  terms = list_terminals(port_slug='algeciras')

El loader es **falla cerrado**:
  - Sin BD → sirve desde YAML embebido (mismo que ports-handlers.ts).
  - Sin YAML → devuelve [].
  - Operadores con LEI ausente → null (resolverá vía GLEIF en next sprint).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

SEED_PATH = Path(__file__).parent / "seeds" / "port_terminals_seed.yaml"


@lru_cache(maxsize=1)
def _load_yaml() -> list[dict[str, Any]]:
    """Carga el YAML una vez · cache en memoria del proceso."""
    if not SEED_PATH.exists():
        return []
    try:
        import yaml
    except ImportError:
        logger.error("PyYAML no instalado · pip install pyyaml")
        return []
    try:
        with SEED_PATH.open("r", encoding="utf-8") as fh:
            doc = yaml.safe_load(fh) or {}
        return list(doc.get("terminals", []))
    except Exception as exc:
        logger.warning("error cargando %s: %s", SEED_PATH, exc)
        return []


def list_terminals(
    port_slug: str | None = None,
    type_: str | None = None,
    operator: str | None = None,
) -> list[dict[str, Any]]:
    """Lista terminales · filtros opcionales.

    Lee primero de BD `port_terminals`; si vacía o no hay engine, fallback al
    seed YAML. Permite que el módulo funcione tanto con backend Python como
    standalone serverless (mismo data shape).
    """
    # BD primero (si poblada)
    db_items = _read_from_db(port_slug=port_slug)
    if db_items:
        items = db_items
    else:
        items = _load_yaml()

    if port_slug:
        items = [t for t in items if t.get("port_slug") == port_slug]
    if type_:
        items = [t for t in items if t.get("type") == type_]
    if operator:
        q = operator.lower()
        items = [
            t for t in items
            if (t.get("operator_name") or "").lower().find(q) >= 0
        ]
    return items


def _read_from_db(port_slug: str | None = None) -> list[dict[str, Any]]:
    """Lee terminales de BD. Devuelve [] si no hay engine o tabla vacía."""
    try:
        from .ais_client import _get_engine
        from sqlalchemy import text
    except Exception:
        return []

    engine = _get_engine()
    if engine is None:
        return []

    try:
        with engine.connect() as cx:
            params = {}
            sql = (
                "SELECT port_slug, terminal_name, operator_name, operator_lei, "
                "type, lat, lon, capacity_teu, capacity_tonnes, berths_count, "
                "max_draft_m, quay_length_m, reefer_plugs, rail_access, "
                "concession_end_year, source, data_quality "
                "FROM port_terminals"
            )
            if port_slug:
                sql += " WHERE port_slug = :p"
                params["p"] = port_slug
            rows = cx.execute(text(sql), params).mappings().all()
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.debug("read_from_db terminals fallback yaml: %s", exc)
        return []


def upsert_to_db() -> int:
    """Upserta el seed YAML a `port_terminals` (idempotente).

    Returns: número de filas insertadas/actualizadas. 0 si no hay engine
    o falla. No-op si ya están todas presentes.
    """
    items = _load_yaml()
    if not items:
        return 0

    try:
        from .ais_client import _get_engine
        from sqlalchemy import text
    except Exception:
        return 0

    engine = _get_engine()
    if engine is None:
        logger.warning("upsert_to_db · no engine disponible · saltando")
        return 0

    now = datetime.now(timezone.utc)
    n = 0
    try:
        with engine.begin() as cx:
            for t in items:
                # ON CONFLICT-style upsert (compatible Postgres + SQLite)
                row = cx.execute(
                    text(
                        "SELECT id FROM port_terminals "
                        "WHERE port_slug = :p AND terminal_name = :t"
                    ),
                    {"p": t["port_slug"], "t": t["terminal_name"]},
                ).first()

                payload = {
                    "port_slug": t["port_slug"],
                    "terminal_name": t["terminal_name"],
                    "operator_name": t.get("operator_name"),
                    "operator_lei": t.get("operator_lei"),
                    "type": t["type"],
                    "lat": t.get("lat"),
                    "lon": t.get("lon"),
                    "capacity_teu": t.get("capacity_teu"),
                    "capacity_tonnes": t.get("capacity_tonnes"),
                    "berths_count": t.get("berths_count"),
                    "max_draft_m": t.get("max_draft_m"),
                    "quay_length_m": t.get("quay_length_m"),
                    "reefer_plugs": t.get("reefer_plugs"),
                    "rail_access": t.get("rail_access"),
                    "concession_end_year": t.get("concession_end_year"),
                    "source": t.get("source", "curated"),
                    "data_quality": t.get("data_quality", "seed"),
                    "ingested_at": now,
                }
                if row:
                    cx.execute(
                        text(
                            "UPDATE port_terminals SET "
                            "operator_name=:operator_name, operator_lei=:operator_lei, "
                            "type=:type, lat=:lat, lon=:lon, "
                            "capacity_teu=:capacity_teu, capacity_tonnes=:capacity_tonnes, "
                            "berths_count=:berths_count, max_draft_m=:max_draft_m, "
                            "quay_length_m=:quay_length_m, reefer_plugs=:reefer_plugs, "
                            "rail_access=:rail_access, concession_end_year=:concession_end_year, "
                            "source=:source, data_quality=:data_quality, "
                            "ingested_at=:ingested_at "
                            "WHERE id = :id"
                        ),
                        {**payload, "id": row[0]},
                    )
                else:
                    cx.execute(
                        text(
                            "INSERT INTO port_terminals "
                            "(port_slug, terminal_name, operator_name, operator_lei, "
                            " type, lat, lon, capacity_teu, capacity_tonnes, berths_count, "
                            " max_draft_m, quay_length_m, reefer_plugs, rail_access, "
                            " concession_end_year, source, data_quality, ingested_at) "
                            "VALUES (:port_slug, :terminal_name, :operator_name, :operator_lei, "
                            " :type, :lat, :lon, :capacity_teu, :capacity_tonnes, :berths_count, "
                            " :max_draft_m, :quay_length_m, :reefer_plugs, :rail_access, "
                            " :concession_end_year, :source, :data_quality, :ingested_at)"
                        ),
                        payload,
                    )
                n += 1
    except Exception as exc:
        logger.exception("upsert_to_db fallo: %s", exc)
        return 0

    logger.info("upsert_to_db terminals · %d filas procesadas", n)
    return n


def main() -> int:
    """CLI · python -m etl.sources.ports.terminals_loader"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s · %(message)s",
    )
    n = upsert_to_db()
    print(f"Upserted {n} port_terminals rows.")
    return 0 if n > 0 else 1


if __name__ == "__main__":
    import sys
    sys.exit(main())


__all__ = ["list_terminals", "upsert_to_db"]
