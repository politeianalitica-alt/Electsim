"""Capa bronze: persistencia raw en parquet."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)


def write_bronze(df: pd.DataFrame, dataset: str, data_dir: str = "./data") -> Path:
    """Guarda un DataFrame raw en parquet dentro de bronze."""
    path = Path(data_dir) / "bronze"
    path.mkdir(parents=True, exist_ok=True)
    output = path / f"{dataset}.parquet"
    df.to_parquet(output, index=False)
    logger.info("Bronze write: %s (%s filas)", output, len(df))
    return output


def read_bronze(dataset: str, data_dir: str = "./data") -> pd.DataFrame:
    """Carga un dataset raw parquet de bronze."""
    input_path = Path(data_dir) / "bronze" / f"{dataset}.parquet"
    if not input_path.exists():
        logger.info("Bronze no encontrado: %s", input_path)
        return pd.DataFrame()
    return pd.read_parquet(input_path)

