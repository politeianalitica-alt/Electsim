"""
Password utilities — Bloque 13.

Hashing y verificación de contraseñas con bcrypt (via passlib).
Si passlib no está instalado, las funciones degradan graciosamente
con un warning — en dev mode sin auth esto es aceptable.
"""
from __future__ import annotations

import hashlib
import logging
import secrets

logger = logging.getLogger(__name__)

try:
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    _PASSLIB_AVAILABLE = True
except ImportError:
    _pwd_context = None  # type: ignore[assignment]
    _PASSLIB_AVAILABLE = False
    logger.debug("passlib no disponible — usando fallback SHA-256 (solo dev)")


def hash_password(password: str) -> str:
    """
    Hashea una contraseña.

    En producción usa bcrypt via passlib.
    En desarrollo sin passlib, usa SHA-256 con salt (NO para producción real).
    """
    if _PASSLIB_AVAILABLE and _pwd_context is not None:
        return _pwd_context.hash(password)
    # Fallback: SHA-256 + salt (NO es seguro para producción)
    salt = secrets.token_hex(16)
    digest = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
    return f"sha256${salt}${digest}"


def verify_password(plain: str, hashed: str) -> bool:
    """
    Verifica una contraseña contra su hash.

    Returns False en lugar de lanzar excepciones.
    """
    try:
        if _PASSLIB_AVAILABLE and _pwd_context is not None:
            return _pwd_context.verify(plain, hashed)
        # Fallback SHA-256
        if hashed.startswith("sha256$"):
            parts = hashed.split("$")
            if len(parts) != 3:
                return False
            _, salt, stored_digest = parts
            digest = hashlib.sha256(f"{salt}:{plain}".encode()).hexdigest()
            return secrets.compare_digest(digest, stored_digest)
        return False
    except Exception as exc:
        logger.debug("Error verificando contraseña: %s", exc)
        return False


def generate_api_token(length: int = 40) -> str:
    """Genera un token API seguro (URL-safe)."""
    return secrets.token_urlsafe(length)


def generate_reset_token() -> str:
    """Genera un token de reset de contraseña."""
    return secrets.token_urlsafe(32)


def is_strong_password(password: str) -> tuple[bool, list[str]]:
    """
    Valida la fortaleza de una contraseña.

    Returns:
        (is_strong, list_of_issues)
    """
    issues = []
    if len(password) < 8:
        issues.append("Mínimo 8 caracteres")
    if not any(c.isupper() for c in password):
        issues.append("Al menos una mayúscula")
    if not any(c.islower() for c in password):
        issues.append("Al menos una minúscula")
    if not any(c.isdigit() for c in password):
        issues.append("Al menos un número")
    if len(password) < 12:
        issues.append("Recomendado: 12+ caracteres")
    return len(issues) == 0, issues
