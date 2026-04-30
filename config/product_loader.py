"""
Loader y registro de productos/DLCs desde YAML.

Estructura esperada:
    config/products/<code>.yaml

Uso:
    from config.product_loader import load_product_config, list_available_products

    cfg = load_product_config("war_room_electoral_spain")
    # cfg.modules -> ['electoral_core', 'electoral_nowcasting', ...]

    codes = list_available_products("spain")
    # ['war_room_electoral_spain', 'regulatory_radar_spain', 'dlc_energy_spain', ...]
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

PRODUCTS_DIR = Path(__file__).resolve().parent / "products"


# ---------------------------------------------------------------------------
# Excepciones
# ---------------------------------------------------------------------------

class ProductNotFoundError(Exception):
    """El codigo de producto solicitado no tiene YAML de configuracion."""


class ProductConfigError(Exception):
    """El YAML de producto existe pero no cumple el esquema Pydantic."""


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

@lru_cache(maxsize=64)
def load_product_config(product_code: str):
    """
    Carga y valida la configuracion de un producto desde su YAML.
    Resultado cacheado en memoria para evitar I/O repetido.

    Args:
        product_code: Codigo del producto, p.ej. 'war_room_electoral_spain'.

    Returns:
        ProductConfig validado.

    Raises:
        ProductNotFoundError: Si no existe el YAML.
        ProductConfigError: Si el YAML no cumple el esquema.
    """
    try:
        import yaml
    except ImportError as exc:
        raise ImportError("PyYAML requerido: pip install pyyaml") from exc

    from config.product_models import ProductConfig

    yaml_path = PRODUCTS_DIR / f"{product_code}.yaml"
    if not yaml_path.exists():
        raise ProductNotFoundError(
            f"Producto '{product_code}' no encontrado en {PRODUCTS_DIR}. "
            f"Ficheros disponibles: {[p.stem for p in PRODUCTS_DIR.glob('*.yaml') if not p.stem.startswith('_')]}"
        )

    try:
        with yaml_path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh)
        return ProductConfig(**raw)
    except Exception as exc:
        raise ProductConfigError(
            f"Error al cargar producto '{product_code}': {exc}"
        ) from exc


def list_available_products(
    market_code: Optional[str] = None,
    product_type: Optional[str] = None,
) -> list[str]:
    """
    Lista los codigos de productos disponibles.

    Args:
        market_code: Filtra por mercado (p.ej. 'spain', 'eu').
        product_type: Filtra por tipo ('base_product' o 'dlc').

    Returns:
        Lista de codigos de producto ordenada.
    """
    try:
        import yaml
    except ImportError:
        return []

    codes: list[str] = []
    for path in sorted(PRODUCTS_DIR.glob("*.yaml")):
        if path.stem.startswith("_"):
            continue
        try:
            with path.open("r", encoding="utf-8") as fh:
                raw = yaml.safe_load(fh)
        except Exception as exc:
            logger.warning("No se pudo leer %s: %s", path, exc)
            continue

        if market_code is not None and raw.get("market") != market_code:
            continue
        if product_type is not None and raw.get("type") != product_type:
            continue

        codes.append(raw["code"])

    return codes


def list_base_products(market_code: Optional[str] = None) -> list[str]:
    """Retorna solo los productos base (excluye DLCs)."""
    return list_available_products(market_code=market_code, product_type="base_product")


def list_dlcs(market_code: Optional[str] = None) -> list[str]:
    """Retorna solo los DLCs."""
    return list_available_products(market_code=market_code, product_type="dlc")


def invalidate_cache() -> None:
    """Invalida el cache del loader (util en tests y recargas en caliente)."""
    load_product_config.cache_clear()
