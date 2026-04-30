"""
Dependencia FastAPI de autenticacion multi-tenant (Bloque 5).

Produce un AuthenticatedUser con user_id, org_id, workspace_id y role_code
a partir del Bearer JWT incluido en cada request.

Claims esperados en el JWT:
  sub          — auth_subject del usuario (Supabase UID u otro provider)
  org_id       — UUID de la organizacion activa
  workspace_id — UUID del workspace activo
  role         — codigo de rol: SUPERADMIN | ORG_ADMIN | ANALYST_SENIOR |
                 ANALYST_JUNIOR | CLIENT_VIEW
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from db.session import SessionLocal

# ---------------------------------------------------------------------------
# Roles permitidos
# ---------------------------------------------------------------------------

ROLE_CODES = {
    "SUPERADMIN",
    "ORG_ADMIN",
    "ANALYST_SENIOR",
    "ANALYST_JUNIOR",
    "CLIENT_VIEW",
}


@dataclass(slots=True)
class AuthenticatedUser:
    """Contexto de usuario resuelto desde el JWT."""

    user_id: str        # auth_subject (sub del JWT)
    org_id: str         # UUID de la organizacion
    workspace_id: str   # UUID del workspace activo
    role_code: str      # codigo de rol


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _dev_user() -> AuthenticatedUser:
    return AuthenticatedUser(
        user_id="dev-user",
        org_id="00000000-0000-0000-0000-000000000001",
        workspace_id="00000000-0000-0000-0000-000000000002",
        role_code="ORG_ADMIN",
    )


def _decode_jwt(token: str) -> AuthenticatedUser:
    secret = os.getenv("ELECTSIM_API_JWT_SECRET")
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ELECTSIM_API_JWT_SECRET no configurada",
        )
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido",
        ) from exc

    org_id = str(payload.get("org_id", ""))
    workspace_id = str(payload.get("workspace_id", ""))
    role_code = str(payload.get("role", "CLIENT_VIEW"))

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin claim org_id",
        )
    if not workspace_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin claim workspace_id",
        )
    if role_code not in ROLE_CODES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Rol desconocido: {role_code!r}",
        )

    return AuthenticatedUser(
        user_id=str(payload.get("sub", "")),
        org_id=org_id,
        workspace_id=workspace_id,
        role_code=role_code,
    )


# ---------------------------------------------------------------------------
# Dependencia principal
# ---------------------------------------------------------------------------

def get_current_user(
    authorization: str | None = Header(default=None),
) -> AuthenticatedUser:
    """
    Extrae y valida el JWT del header Authorization.
    En ELECTSIM_DEV_MODE=true devuelve un usuario de desarrollo sin validar.
    """
    dev_mode = os.getenv("ELECTSIM_DEV_MODE", "false").strip().lower() == "true"

    if not authorization or not authorization.lower().startswith("bearer "):
        if dev_mode:
            return _dev_user()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header requerido (Bearer <token>)",
        )

    token = authorization.split(" ", 1)[1].strip()

    if dev_mode and token == "dev":
        return _dev_user()

    return _decode_jwt(token)


# ---------------------------------------------------------------------------
# Restriccion por rol
# ---------------------------------------------------------------------------

def require_role(allowed: list[str]):
    """
    Dependency factory que aborta con 403 si el rol del usuario
    no esta en la lista permitida.

    Uso:
        @router.get("/admin")
        def admin(user = Depends(require_role(["SUPERADMIN", "ORG_ADMIN"]))):
            ...
    """
    def _dep(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if user.role_code not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol '{user.role_code}' no autorizado para esta operacion",
            )
        return user

    return _dep


# ---------------------------------------------------------------------------
# Sesion DB
# ---------------------------------------------------------------------------

def get_db():
    """Dependencia que abre y cierra una sesion síncrona."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
