"""Ingesta de indicadores macro desde API INE."""

from __future__ import annotations

import logging

import pandas as pd
import requests

from dashboard.config import settings
from dashboard.storage.bronze import read_bronze, write_bronze

logger = logging.getLogger(__name__)


def _fetch_table(table_id: int) -> pd.DataFrame:
    url = f"{settings.ine_api_base}/ES/DATOS_TABLA/{table_id}"
    data = requests.get(url, timeout=25).json()
    return pd.DataFrame(data)


def fetch_epa_unemployment() -> pd.DataFrame:
    """Obtiene tasa de paro EPA trimestral (tabla 4247)."""
    try:
        df = _fetch_table(4247)
        write_bronze(df, "ine_epa", data_dir=settings.data_dir)
        return df
    except Exception as exc:
        logger.warning("INE EPA falló: %s", exc)
        return read_bronze("ine_epa", data_dir=settings.data_dir)


def fetch_ipc() -> pd.DataFrame:
    """Obtiene IPC mensual general España."""
    try:
        df = _fetch_table(50923)
        write_bronze(df, "ine_ipc", data_dir=settings.data_dir)
        return df
    except Exception as exc:
        logger.warning("INE IPC falló: %s", exc)
        return read_bronze("ine_ipc", data_dir=settings.data_dir)


def fetch_gdp_quarterly() -> pd.DataFrame:
    """Obtiene PIB trimestral."""
    try:
        df = _fetch_table(50927)
        write_bronze(df, "ine_gdp", data_dir=settings.data_dir)
        return df
    except Exception as exc:
        logger.warning("INE PIB falló: %s", exc)
        return read_bronze("ine_gdp", data_dir=settings.data_dir)


def fetch_all_macro() -> dict[str, pd.DataFrame]:
    """Devuelve los tres indicadores macro en un dict."""
    return {
        "unemployment": fetch_epa_unemployment(),
        "ipc": fetch_ipc(),
        "gdp": fetch_gdp_quarterly(),
    }

