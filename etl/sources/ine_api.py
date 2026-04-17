"""Extractor esqueleto para API/tablas INE (JSON INEbase o descargas CSV)."""

from __future__ import annotations

import logging
from typing import Any

import pandas as pd
import requests

from etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)


class INEAPIExtractor(BaseExtractor):
    """
    Placeholder: enlazar tabla/operación INE concreta y parsear JSON/CSV.
    Documentación: https://www.ine.es/dyngs/DataLab/manual.html?cid=45
    """

    def __init__(self, tabla_id: str | None = None):
        super().__init__("ine_padron")
        self.tabla_id = tabla_id

    def extract(self) -> pd.DataFrame:
        # Ejemplo mínimo sin llamada real: leer CSV local si existe.
        candidates = sorted(self.raw_path.glob("*.csv"))
        if candidates:
            return pd.read_csv(candidates[0])
        logger.warning("No hay CSV en %s; extract() devuelve DataFrame vacío.", self.raw_path)
        return pd.DataFrame()

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        return df


def fetch_ine_json(url: str, params: dict[str, Any] | None = None, timeout: int = 60) -> dict[str, Any]:
    """Utilidad para peticiones GET a endpoints JSON del INE."""
    r = requests.get(url, params=params or {}, timeout=timeout)
    r.raise_for_status()
    return r.json()
