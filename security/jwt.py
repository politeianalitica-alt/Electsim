"""
JWT utilities — Bloque 13.

Generación y verificación de tokens JWT.
Si PyJWT no está instalado, las funciones degradan graciosamente.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from security.settings import settings

logger = logging.getLogger(__name__)

try:
    import jwt as _jwt
    _JWT_AVAILABLE = True
except ImportError:
    _jwt = None  # type: ignore[assignment]
    _JWT_AVAILABLE = False
    logger.debug("PyJWT no disponible — JWT desactivado")


def create_access_token(
    user_id: str,
    tenant_id: str | None = None,
    roles: list[str] | None = None,
    extra_claims: dict[str, Any] | None = None,
    expires_minutes: int | None = None,
) -> str | None:
    """
    Crea un JWT de acceso.

    Returns None si JWT no está configurado.
    """
    if not _JWT_AVAILABLE or not settings.jwt_secret:
        logger.debug("JWT no configurado — token no generado")
        return None

    ttl = expires_minutes or settings.session_ttl_minutes
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=ttl),
        "type": "access",
    }
    if tenant_id:
        payload["tenant_id"] = tenant_id
    if roles:
        payload["roles"] = roles
    if extra_claims:
        payload.update(extra_claims)

    try:
        return _jwt.encode(
            payload,
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
    except Exception as exc:
        logger.error("Error creando JWT: %s", exc)
        return None


def decode_token(token: str) -> dict[str, Any] | None:
    """
    Decodifica y valida un JWT.

    Returns el payload o None si inválido/expirado.
    """
    if not _JWT_AVAILABLE or not settings.jwt_secret:
        return None

    try:
        payload = _jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except Exception as exc:
        logger.debug("JWT inválido: %s", exc)
        return None


def extract_user_id(token: str) -> str | None:
    """Extrae el user_id de un JWT sin verificar expiración (para logs)."""
    payload = decode_token(token)
    return payload.get("sub") if payload else None


def is_token_valid(token: str) -> bool:
    """Verifica si un token es válido y no ha expirado."""
    return decode_token(token) is not None
