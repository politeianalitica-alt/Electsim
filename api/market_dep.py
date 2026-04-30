"""
Dependencias FastAPI para resolucion del mercado activo.

Estrategia de resolucion (prioridad descendente):
  1. Cabecera HTTP  X-Market-Code  (multi-mercado, tests)
  2. Variable de entorno ELECTSIM_DEFAULT_MARKET
  3. Fallback a 'spain' si ELECTSIM_DEFAULT_MARKET no esta definida en dev mode

TODO (Bloque 5): una vez implementado multi-tenant completo, resolver el
market_code leyendo la organizacion del usuario desde el JWT:
    jwt_payload -> org_id -> clientes.market_code
"""
from __future__ import annotations

import logging
import os

from fastapi import Depends, Header, HTTPException, status

from api.context.market_context import MarketContext
from config.market_loader import MarketNotFoundError, load_market_config

logger = logging.getLogger(__name__)

_DEFAULT_MARKET_ENV = "ELECTSIM_DEFAULT_MARKET"
_DEV_MODE_ENV = "ELECTSIM_DEV_MODE"


def _is_dev_mode() -> bool:
    return os.getenv(_DEV_MODE_ENV, "false").strip().lower() == "true"


async def get_market_code(
    x_market_code: str | None = Header(
        default=None,
        alias="X-Market-Code",
        description="Codigo del mercado activo. Si se omite, se usa ELECTSIM_DEFAULT_MARKET.",
    ),
) -> str:
    """
    Resuelve el codigo de mercado activo para la peticion.

    - Cabecera X-Market-Code tiene prioridad (util para multi-mercado y tests).
    - Cae a ELECTSIM_DEFAULT_MARKET si la cabecera no esta presente.
    - En modo dev, si ninguna de las dos esta definida, usa 'spain'.
    """
    if x_market_code:
        return x_market_code.strip().lower()

    default_market = os.getenv(_DEFAULT_MARKET_ENV, "").strip().lower()
    if default_market:
        return default_market

    if _is_dev_mode():
        logger.debug("ELECTSIM_DEFAULT_MARKET no definida en dev mode: usando 'spain'")
        return "spain"

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=(
            "Market code no configurado. "
            "Define ELECTSIM_DEFAULT_MARKET o usa la cabecera X-Market-Code."
        ),
    )


async def get_market_context(
    market_code: str = Depends(get_market_code),
) -> MarketContext:
    """
    Carga y valida la configuracion del mercado activo.
    Devuelve un MarketContext listo para inyectar en handlers y pipelines.
    """
    try:
        config = load_market_config(market_code)
    except MarketNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.error("Error cargando mercado '%s': %s", market_code, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno cargando configuracion del mercado '{market_code}'",
        ) from exc

    return MarketContext(market_code=market_code, config=config)
