"""
Carga y cacheo de configuraciones de mercado desde YAML.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Directorio de YAMLs relativo a este modulo
MARKETS_DIR = Path(__file__).parent / "markets"


class MarketNotFoundError(Exception):
    """El codigo de mercado solicitado no tiene YAML de configuracion."""


@lru_cache(maxsize=32)
def load_market_config(market_code: str):
    """
    Carga y valida la configuracion de un mercado desde su YAML.
    Resultado cacheado en memoria para evitar I/O repetido.

    Args:
        market_code: Identificador del mercado, p.ej. 'spain', 'demo-eu'.

    Returns:
        MarketConfig validado.

    Raises:
        MarketNotFoundError: Si no existe el YAML.
        pydantic.ValidationError: Si el YAML no cumple el esquema.
    """
    # importacion diferida para no penalizar tests que no usan pydantic
    try:
        import yaml
    except ImportError as e:
        raise RuntimeError("PyYAML no instalado. Ejecuta: pip install pyyaml") from e

    from config.market_models import MarketConfig

    yaml_path = MARKETS_DIR / f"{market_code}.yaml"
    if not yaml_path.exists():
        raise MarketNotFoundError(
            f"Mercado '{market_code}' no encontrado. "
            f"Archivo esperado: {yaml_path}. "
            f"Mercados disponibles: {list_available_markets()}"
        )

    with yaml_path.open("r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)

    config = MarketConfig.model_validate(raw)
    logger.debug("Mercado '%s' cargado: %d partidos, %d fuentes", market_code, len(config.parties), len(config.ingestion_sources))
    return config


def list_available_markets() -> list[str]:
    """Devuelve los codigos de todos los mercados con YAML en MARKETS_DIR."""
    if not MARKETS_DIR.exists():
        return []
    return sorted(
        p.stem
        for p in MARKETS_DIR.glob("*.yaml")
        if not p.name.startswith("_")
    )


def invalidate_market_cache(market_code: Optional[str] = None) -> None:
    """
    Invalida la cache de configuracion.
    Si market_code es None, invalida toda la cache.
    Util en tests y cuando se recarga un YAML en disco.
    """
    load_market_config.cache_clear()
    if market_code:
        logger.debug("Cache de mercado '%s' invalidada", market_code)
    else:
        logger.debug("Cache de mercados completamente invalidada")
