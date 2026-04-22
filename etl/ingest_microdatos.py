"""CLI para ingestar microdatos propios en ElectSim.

Uso:
  ./.venv/bin/python -m etl.ingest_microdatos --source "/ruta/Microdatos" --max-files 40
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from etl.config import validate_env
from etl.logger import get_logger

ROOT = Path(__file__).resolve().parents[1]
from etl.pipelines.microdatos_pipeline import (
    DEFAULT_MICRODATOS_DIR,
    ingest_microdatos_folder,
)

logger = get_logger(__name__)


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingesta microdatos propios (CIS/cliente)")
    parser.add_argument("--source", default=DEFAULT_MICRODATOS_DIR, help="Carpeta raíz de microdatos")
    parser.add_argument("--max-files", type=int, default=0, help="Máximo de ficheros a procesar (0=todos)")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    validate_env()
    db_url = os.environ["DATABASE_URL"]
    engine = create_engine(db_url, pool_pre_ping=True)
    result = ingest_microdatos_folder(
        engine=engine,
        source_dir=args.source,
        max_files=(args.max_files or None),
        replace_existing_for_survey=True,
    )
    logger.info("Resultado ingesta microdatos: %s", json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
