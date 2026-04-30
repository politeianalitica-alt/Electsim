from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import execute, query

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("")
def list_alertas(
    solo_no_leidas: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user),
):
    cond = "AND leida = false" if solo_no_leidas else ""
    df = query(f"""
        SELECT tipo, severidad, titulo, descripcion, leida, created_at
        FROM alertas_sistema
        WHERE 1=1 {cond}
        ORDER BY created_at DESC
        LIMIT {limit}
    """)
    return df.to_dict(orient="records")


@router.patch("/{alerta_id}/leer", status_code=204)
def marcar_leida(
    alerta_id: int,
    current_user: UserOut = Depends(get_current_user),
):
    execute(
        "UPDATE alertas_sistema SET leida = true WHERE id = :id",
        {"id": alerta_id},
    )
