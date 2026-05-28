"""scripts/load_ibex35_graph_edges.py

Carga aristas de grafo a la tabla `brain_actor_graph_edges` desde un
archivo JSON. Sirve tanto para el seed de IBEX 35 como para el de
Diputaciones Provinciales (cada JSON declara su propio `source`).

La tabla ya existe (migración 0061_brain_fichas.py); el script solo
INSERTA filas. Con `--refresh` borra previamente las aristas con los
mismos valores de `source` que aparecen en el JSON antes de re-insertar,
de modo que re-ejecutar es idempotente sin acumular duplicados.

Uso:
    # IBEX 35 (default)
    python scripts/load_ibex35_graph_edges.py --refresh

    # Diputaciones Provinciales
    python scripts/load_ibex35_graph_edges.py --json data/diputaciones/graph_edges.json --refresh

    # Dry-run
    python scripts/load_ibex35_graph_edges.py --dry-run

Variables de entorno:
    DATABASE_URL              postgresql://…   (requerido)
    IBEX35_GRAPH_EDGES_JSON   ruta al JSON     (default data/ibex35/graph_edges.json)
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path

from sqlalchemy import create_engine, text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("load_ibex35_graph")

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON = REPO_ROOT / "data" / "ibex35" / "graph_edges.json"
SOURCE_TAG = "ibex35_seed"


INSERT_SQL = text(
    """
    INSERT INTO brain_actor_graph_edges (
        actor_from, actor_to, actor_from_name, actor_to_name,
        relation_type, valence, strength, directionality,
        date_iso, source, evidence_text, confidence
    )
    VALUES (
        :actor_from, :actor_to, :actor_from_name, :actor_to_name,
        :relation_type, :valence, :strength, :directionality,
        :date_iso, :source, :evidence_text, :confidence
    )
    """
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Carga aristas del grafo IBEX 35 a brain_actor_graph_edges"
    )
    parser.add_argument(
        "--json",
        default=os.environ.get("IBEX35_GRAPH_EDGES_JSON", str(DEFAULT_JSON)),
        help=f"Ruta al JSON (default: {DEFAULT_JSON})",
    )
    parser.add_argument(
        "--refresh",
        action="store_true",
        help=f"Borra aristas con source='{SOURCE_TAG}' antes de insertar",
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="No escribe a la BD, solo cuenta"
    )
    args = parser.parse_args()

    url = os.environ.get("DATABASE_URL")
    if not url:
        log.error("Falta DATABASE_URL")
        return 2

    path = Path(args.json)
    if not path.exists():
        log.error("No existe %s", path)
        return 2

    with path.open("r", encoding="utf-8") as fh:
        edges = json.load(fh)
    log.info("Cargadas %d aristas desde %s", len(edges), path)

    # Conjunto de sources presentes en el JSON · clave para --refresh
    # genérico (sirve a IBEX35, diputaciones u otras fuentes futuras).
    sources_en_json = {
        e.get("source") or SOURCE_TAG for e in edges
    }
    log.info("Sources detectados en JSON: %s", sorted(sources_en_json))

    engine = create_engine(url, future=True)
    with engine.begin() as conn:
        if args.refresh and not args.dry_run:
            n = conn.execute(
                text(
                    "DELETE FROM brain_actor_graph_edges "
                    "WHERE source = ANY(:sources)"
                ),
                {"sources": list(sources_en_json)},
            ).rowcount
            log.info(
                "Borradas %d aristas previas con source ∈ %s",
                n, sorted(sources_en_json),
            )

        inserted = 0
        for e in edges:
            row = {
                "actor_from": e.get("actor_from"),
                "actor_to": e.get("actor_to"),
                "actor_from_name": e.get("actor_from_name"),
                "actor_to_name": e.get("actor_to_name"),
                "relation_type": e.get("relation_type"),
                "valence": e.get("valence"),
                "strength": e.get("strength"),
                "directionality": e.get("directionality") or "undirected",
                "date_iso": e.get("date_iso"),
                "source": e.get("source") or SOURCE_TAG,
                "evidence_text": e.get("evidence_text"),
                "confidence": e.get("confidence"),
            }
            if not row["actor_from"] or not row["actor_to"]:
                log.warning("skip arista sin actor_from/to: %r", e)
                continue
            if not args.dry_run:
                conn.execute(INSERT_SQL, row)
            inserted += 1

        if args.dry_run:
            log.info("DRY-RUN · %d aristas se habrían insertado", inserted)
            conn.rollback()
        else:
            log.info("OK · %d aristas insertadas", inserted)

    return 0


if __name__ == "__main__":
    sys.exit(main())
