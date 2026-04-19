from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Generator

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from db.session import SessionLocal
from ontology import DecisionLogger, OntologyStore


@dataclass(slots=True)
class UserContext:
    user_id: str
    tenant_id: str
    role: str


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _decode_token(authorization: str | None) -> UserContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        return UserContext(user_id="demo-user", tenant_id="default", role="admin")
    token = authorization.split(" ", 1)[1]
    secret = os.getenv("ELECTSIM_API_JWT_SECRET")
    if not secret:
        return UserContext(user_id="demo-user", tenant_id="default", role="admin")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido") from exc
    return UserContext(
        user_id=str(payload.get("sub", "unknown")),
        tenant_id=str(payload.get("tenant_id", "default")),
        role=str(payload.get("role", "viewer")),
    )


def get_user_context(authorization: str | None = Header(default=None)) -> UserContext:
    return _decode_token(authorization)


def require_role(roles: list[str]):
    def _dep(ctx: UserContext = Depends(get_user_context)) -> UserContext:
        if ctx.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")
        return ctx

    return _dep


def get_ontology(ctx: UserContext = Depends(get_user_context)):
    return OntologyStore(session_factory=SessionLocal, tenant_id=ctx.tenant_id)


def get_decision_logger():
    return DecisionLogger(session_factory=SessionLocal)
