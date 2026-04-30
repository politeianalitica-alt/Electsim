from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/nowcasting", tags=["nowcasting"])


@router.get("")
def get_nowcasting(current_user: UserOut = Depends(get_current_user)):
    """Última estimación por partido."""
    df = query("""
        SELECT DISTINCT ON (p.siglas)
            p.siglas        AS partido_siglas,
            p.nombre_completo AS partido_nombre,
            e.estimacion_pct,
            e.ic_95_inf,
            e.ic_95_sup,
            e.n_encuestas,
            e.fecha_estimacion AS fecha_calculo
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        ORDER BY p.siglas, e.fecha_estimacion DESC
    """)
    return df.to_dict(orient="records")


@router.get("/{siglas}/serie")
def get_serie(
    siglas: str,
    dias: int = Query(default=180, ge=7, le=730),
    current_user: UserOut = Depends(get_current_user),
):
    """Serie temporal de un partido."""
    df = query("""
        SELECT e.fecha_estimacion, e.estimacion_pct, e.ic_95_inf, e.ic_95_sup
        FROM estimaciones_voto_agregadas e
        JOIN partidos p ON p.id = e.partido_id
        WHERE p.siglas = :siglas
          AND e.fecha_estimacion >= CURRENT_DATE - :dias
        ORDER BY e.fecha_estimacion
    """, {"siglas": siglas.upper(), "dias": dias})
    return df.to_dict(orient="records")
