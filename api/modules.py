"""
Feature-flag de modulos por workspace (Bloque 6).

Provee:
  get_active_modules() — dependency FastAPI que retorna los modulos activos
  require_modules()    — dependency factory que aborta con 403 si faltan modulos

Uso en un router:
    from api.modules import get_active_modules, require_modules

    @router.get("/electoral/nowcasting")
    def get_nowcasting(
        _ = Depends(require_modules("electoral_core", "electoral_nowcasting")),
        db: Session = Depends(get_db),
    ):
        ...

    @router.get("/me/modules")
    def list_my_modules(modules: list[str] = Depends(get_active_modules)):
        return {"modules": modules}
"""
from __future__ import annotations

from typing import List

from fastapi import Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from api.auth import AuthenticatedUser, get_db
from api.tenancy import enforce_tenancy


def get_active_modules(
    user: AuthenticatedUser = Depends(enforce_tenancy),
    db: Session = Depends(get_db),
) -> List[str]:
    """
    Retorna los codigos de modulos activos del workspace actual.

    Depende de enforce_tenancy para garantizar que app.current_workspace_id
    y app.current_org_id esten fijados en la conexion (RLS activo).
    """
    rows = db.execute(
        text("""
            SELECT module_code
            FROM workspace_module
            WHERE workspace_id = :ws_id
              AND organisation_id = :org_id
              AND enabled = true
            ORDER BY module_code
        """),
        {"ws_id": user.workspace_id, "org_id": user.org_id},
    ).fetchall()
    return [r[0] for r in rows]


def require_modules(*required: str):
    """
    Dependency factory que exige que el workspace tenga activos todos
    los modulos indicados. Aborta con 403 si falta alguno.

    Uso:
        @router.get("/nowcasting")
        def nowcasting(_ = Depends(require_modules("electoral_core", "electoral_nowcasting"))):
            ...
    """
    def _dep(modules: List[str] = Depends(get_active_modules)) -> List[str]:
        missing = [m for m in required if m not in modules]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "modules_required",
                    "missing": missing,
                    "message": f"Modulos requeridos no activos en este workspace: {missing}",
                },
            )
        return modules

    return _dep
