"""
Configuración central del dashboard (solo env vars).
"""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class DashboardSettings:
    cis_base_url: str = os.getenv("CIS_BASE_URL", "https://www.cis.es/documents")
    ine_api_base: str = os.getenv("INE_API_BASE", "https://servicios.ine.es/wstempus/js")
    interior_base: str = os.getenv("INTERIOR_BASE", "https://infoelectoral.interior.gob.es")
    openai_api_key: str | None = os.getenv("OPENAI_API_KEY")
    twitter_bearer_token: str | None = os.getenv("TWITTER_BEARER_TOKEN")
    duckdb_path: str = os.getenv("DUCKDB_PATH", "./data/electsim.duckdb")
    data_dir: str = os.getenv("DATA_DIR", "./data")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = DashboardSettings()

