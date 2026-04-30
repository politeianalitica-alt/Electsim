"""
Configuracion central para scheduler Celery + pipelines async.
Lee variables de entorno; compatible con el resto del proyecto.
"""
from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _db_url_asyncpg(raw: str) -> str:
    """Convierte postgresql+psycopg:// o postgresql+psycopg2:// a asyncpg://."""
    cleaned = re.sub(r"postgresql\+\w+://", "postgresql+asyncpg://", raw)
    # si ya era postgresql:// sin driver, forzar asyncpg
    if cleaned.startswith("postgresql://") and "+asyncpg" not in cleaned:
        cleaned = cleaned.replace("postgresql://", "postgresql+asyncpg://", 1)
    return cleaned


def _db_url_sync(raw: str) -> str:
    """Devuelve la URL con driver psycopg2 para operaciones sincronas (Celery)."""
    cleaned = re.sub(r"postgresql\+\w+://", "postgresql+psycopg2://", raw)
    if cleaned.startswith("postgresql://") and "+" not in cleaned.split("@")[0]:
        cleaned = cleaned.replace("postgresql://", "postgresql+psycopg2://", 1)
    return cleaned


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Settings:
    # --- base de datos ---
    database_url_raw: str = field(
        default_factory=lambda: os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
        )
    )

    # --- redis / celery ---
    redis_url: str = field(
        default_factory=lambda: os.getenv("REDIS_URL", "redis://localhost:6379/0")
    )
    celery_result_backend: str = field(
        default_factory=lambda: os.getenv(
            "CELERY_RESULT_BACKEND",
            os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        )
    )

    # --- ollama ---
    ollama_base_url: str = field(
        default_factory=lambda: os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    )
    ollama_model_resumen: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL_RESUMEN", "qwen3:8b")
    )
    ollama_model_entidades: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL_ENTIDADES", "llama3.2:3b")
    )
    ollama_model_embed: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text")
    )
    ollama_model_analisis: str = field(
        default_factory=lambda: os.getenv("OLLAMA_MODEL_ANALISIS", "gemma3:12b")
    )

    # --- pipeline media ---
    max_articulos_por_medio: int = field(
        default_factory=lambda: int(os.getenv("MAX_ARTICULOS_POR_MEDIO", "30"))
    )
    pipeline_ollama_lote: int = field(
        default_factory=lambda: int(os.getenv("PIPELINE_OLLAMA_LOTE", "50"))
    )

    # --- logging ---
    log_level: str = field(
        default_factory=lambda: os.getenv("LOG_LEVEL", "INFO")
    )

    # --- litellm proxy ---
    litellm_base_url: str = field(
        default_factory=lambda: os.getenv("LITELLM_BASE_URL", "http://localhost:4000")
    )
    litellm_api_key: str = field(
        default_factory=lambda: os.getenv("LITELLM_API_KEY", "no-key-needed")
    )
    # Nombre de modelo LiteLLM a usar por defecto para cada tier
    llm_model_analysis: str = field(
        default_factory=lambda: os.getenv("LLM_MODEL_ANALYSIS", "electsim-analysis")
    )
    llm_model_fast: str = field(
        default_factory=lambda: os.getenv("LLM_MODEL_FAST", "electsim-fast")
    )
    llm_model_embed: str = field(
        default_factory=lambda: os.getenv("LLM_MODEL_EMBED", "electsim-embed")
    )

    # --- flower ---
    flower_user: str = field(
        default_factory=lambda: os.getenv("FLOWER_USER", "admin")
    )
    flower_password: str = field(
        default_factory=lambda: os.getenv("FLOWER_PASSWORD", "change_me")
    )

    @property
    def database_url_asyncpg(self) -> str:
        return _db_url_asyncpg(self.database_url_raw)

    @property
    def database_url_sync(self) -> str:
        return _db_url_sync(self.database_url_raw)

    @property
    def celery_broker_url(self) -> str:
        return os.getenv("CELERY_BROKER_URL", self.redis_url)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
