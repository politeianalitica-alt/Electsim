"""Ingesta de resultados históricos desde datos estáticos del Interior."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd

from dashboard.storage.bronze import read_bronze, write_bronze

logger = logging.getLogger(__name__)


def load_historical_results(data_dir: str = "./data") -> pd.DataFrame:
    """Carga resultados históricos electorales (fallback local)."""
    static_path = Path(data_dir) / "static" / "resultados_interior_historicos.csv"
    if static_path.exists():
        df = pd.read_csv(static_path)
        write_bronze(df, "interior_historicos", data_dir=data_dir)
        return df
    logger.info("No existe resultados_interior_historicos.csv, usando cache bronze")
    return read_bronze("interior_historicos", data_dir=data_dir)

