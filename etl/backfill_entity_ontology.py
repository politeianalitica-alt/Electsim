"""Backfill de ontología de entidades canónicas.

Uso:
  ./.venv/bin/python -m etl.backfill_entity_ontology
"""
from __future__ import annotations

from sqlalchemy import text

from dashboard.db import get_engine
from dashboard.entity_resolver import _invalidar_alias_map


def main() -> int:
    engine = get_engine()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE partidos p
                SET entidad_id = resolver_entidad(p.siglas, 'partido')
                WHERE p.entidad_id IS NULL
                """
            )
        )
        conn.execute(text("REFRESH MATERIALIZED VIEW partidos_resueltos"))
    _invalidar_alias_map()
    print("OK: backfill entidad_id y refresh de partidos_resueltos completados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
