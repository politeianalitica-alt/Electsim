"""Ingesta diaria del dashboard electoral."""

from .config import ElectoralIngestionConfig, load_config
from .runtime import ElectoralIngestionRuntime, SourceOutcome

__all__ = [
    "ElectoralIngestionConfig",
    "ElectoralIngestionRuntime",
    "SourceOutcome",
    "load_config",
]
