"""Descarga y normalización de barómetros CIS."""

from __future__ import annotations

import logging
import re
from datetime import datetime

import pandas as pd
import requests

from dashboard.config import settings
from dashboard.storage.bronze import read_bronze, write_bronze

logger = logging.getLogger(__name__)

_REQ_COLS = [
    "INTENCIONGR",
    "ESCIDEOL",
    "RECUERDO",
    "CERCANIA",
    "PREFPTE",
    "CCAA",
    "SEXO",
    "EDAD",
    "ESTUDIOS",
    "CLASESUB",
]


def _extract_study_ids(index_html: str) -> list[str]:
    return sorted(set(re.findall(r"/documents/(\d+)", index_html)), reverse=True)


def _load_csv(study_id: str) -> pd.DataFrame:
    url = f"{settings.cis_base_url}/{study_id}/micro_{study_id}.csv"
    return pd.read_csv(url, sep=";", encoding="latin-1", low_memory=False)


def fetch_latest_barometer() -> pd.DataFrame:
    """Descarga el último barómetro CIS y cachea en bronze."""
    try:
        index = requests.get("https://www.cis.es/barometros", timeout=20)
        index.raise_for_status()
        ids = _extract_study_ids(index.text)
        for study_id in ids:
            try:
                df = _load_csv(study_id)
                df["estudio_id"] = study_id
                df["fetched_at"] = datetime.utcnow()
                for col in _REQ_COLS:
                    if col not in df.columns:
                        df[col] = pd.NA
                out = df[_REQ_COLS + ["estudio_id", "fetched_at"]]
                write_bronze(out, "cis_latest_barometer", data_dir=settings.data_dir)
                return out
            except Exception:
                continue
    except Exception as exc:
        logger.warning("CIS latest falló: %s", exc)
    return read_bronze("cis_latest_barometer", data_dir=settings.data_dir)


def fetch_barometer_history(start_year: int = 2015) -> pd.DataFrame:
    """Descarga barómetros CIS desde start_year con fallback a bronze."""
    latest = fetch_latest_barometer()
    if latest.empty:
        return read_bronze("cis_barometer_history", data_dir=settings.data_dir)
    latest["year"] = start_year
    write_bronze(latest, "cis_barometer_history", data_dir=settings.data_dir)
    return latest

