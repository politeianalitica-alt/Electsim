"""CLI para ingestar microdatos propios en ElectSim.

Uso:
  ./.venv/bin/python -m etl.ingest_microdatos --source "/ruta/Microdatos" --max-files 40
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dashboard.ingestion.microdatos_pipeline import (  # noqa: E402
    DEFAULT_MICRODATOS_DIR,
    ingest_microdatos_folder,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingesta microdatos propios (CIS/cliente)")
    parser.add_argument("--source", default=DEFAULT_MICRODATOS_DIR, help="Carpeta raíz de microdatos")
    parser.add_argument("--max-files", type=int, default=0, help="Máximo de ficheros a procesar (0=todos)")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    engine = create_engine(db_url, pool_pre_ping=True)
    result = ingest_microdatos_folder(
        engine=engine,
        source_dir=args.source,
        max_files=(args.max_files or None),
        replace_existing_for_survey=True,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())

