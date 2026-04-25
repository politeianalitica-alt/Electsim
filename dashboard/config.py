"""
Configuración central del dashboard.

Lee valores en este orden de prioridad:
  1. st.secrets (Streamlit Cloud)
  2. Variables de entorno / .env (desarrollo local)
  3. Valor por defecto hardcoded
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()


def _get(key: str, default: str | None = None) -> str | None:
    """Lee una clave desde st.secrets si está disponible, si no desde env vars."""
    try:
        import streamlit as st
        val = st.secrets.get(key)
        if val is not None:
            return str(val)
    except Exception:
        pass
    return os.getenv(key, default)


def _cloud_safe_data_dir() -> str:
    """Devuelve un directorio de datos escribible: ./data en local, /tmp/electsim en cloud."""
    candidate = os.getenv("DATA_DIR")
    if candidate:
        return candidate
    # Intentar leer desde st.secrets
    try:
        import streamlit as st
        val = st.secrets.get("DATA_DIR")
        if val:
            return str(val)
    except Exception:
        pass
    # Comprobar si ./data es escribible (local dev)
    local = "./data"
    try:
        p = __import__("pathlib").Path(local)
        p.mkdir(parents=True, exist_ok=True)
        # Test de escritura
        test = p / ".write_test"
        test.touch()
        test.unlink()
        return local
    except OSError:
        # Filesystem efímero (Streamlit Cloud)
        return "/tmp/electsim"


@dataclass(frozen=True)
class DashboardSettings:
    cis_base_url: str = field(
        default_factory=lambda: _get("CIS_BASE_URL", "https://www.cis.es/documents")
    )
    ine_api_base: str = field(
        default_factory=lambda: _get("INE_API_BASE", "https://servicios.ine.es/wstempus/js")
    )
    interior_base: str = field(
        default_factory=lambda: _get("INTERIOR_BASE", "https://infoelectoral.interior.gob.es")
    )
    openai_api_key: str | None = field(
        default_factory=lambda: _get("OPENAI_API_KEY")
    )
    twitter_bearer_token: str | None = field(
        default_factory=lambda: _get("TWITTER_BEARER_TOKEN")
    )
    data_dir: str = field(
        default_factory=_cloud_safe_data_dir
    )
    duckdb_path: str = field(
        default_factory=lambda: _get("DUCKDB_PATH") or f"{_cloud_safe_data_dir()}/electsim.duckdb"
    )
    log_level: str = field(
        default_factory=lambda: _get("LOG_LEVEL", "INFO")
    )


settings = DashboardSettings()
