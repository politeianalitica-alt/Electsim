"""Capa silver: limpieza con DuckDB."""

from __future__ import annotations

import logging
from pathlib import Path

import duckdb
import pandas as pd

logger = logging.getLogger(__name__)


def normalize_with_duckdb(df: pd.DataFrame, table_name: str, duckdb_path: str) -> pd.DataFrame:
    """Normaliza tipos básicos y persiste tabla silver."""
    Path(duckdb_path).parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(duckdb_path)
    con.register("raw_df", df)
    con.execute(f"create schema if not exists silver; create or replace table silver.{table_name} as select * from raw_df")
    result = con.execute(f"select * from silver.{table_name}").df()
    con.close()
    logger.info("Silver upsert: %s (%s filas)", table_name, len(result))
    return result

