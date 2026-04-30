"""
Middleware de tenancy para FastAPI (Bloque 5).

Fija las variables de sesion Postgres que activan el RLS:
  app.current_user_id      -> auth_subject del usuario
  app.current_org_id       -> UUID de la organizacion
  app.current_workspace_id -> UUID del workspace

Estas variables son locales a la transaccion (SET LOCAL) y no se
propagan a otras conexiones del pool.

Uso tipico en un router:
    from api.tenancy import enforce_tenancy

    @router.get("/alerts")
    def list_alerts(
        user: AuthenticatedUser = Depends(enforce_tenancy),
        db: Session = Depends(get_db),
    ):
        # cualquier consulta a tabla con RLS ya esta filtrada
        return db.execute(text("SELECT * FROM alertas_sistema")).all()
"""
from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session
from fastapi import Depends

from api.auth import AuthenticatedUser, get_current_user, get_db


def enforce_tenancy(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    """
    Fija las variables de sesion Postgres para RLS en la conexion actual.
    Devuelve el AuthenticatedUser para que los routers puedan usarlo.

    IMPORTANTE: el parametro ``db`` debe ser la misma sesion que usan
    las queries posteriores — FastAPI reutiliza la instancia gracias
    a su cache de dependencias dentro del mismo request.
    """
    db.execute(
        text("SELECT set_config('app.current_user_id', :val, true)"),
        {"val": user.user_id},
    )
    db.execute(
        text("SELECT set_config('app.current_org_id', :val, true)"),
        {"val": user.org_id},
    )
    db.execute(
        text("SELECT set_config('app.current_workspace_id', :val, true)"),
        {"val": user.workspace_id},
    )
    return user
