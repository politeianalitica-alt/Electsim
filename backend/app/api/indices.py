from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/indices", tags=["indices"])


@router.get("")
def get_indices(current_user: UserOut = Depends(get_current_user)):
    """Último valor de cada índice Politeia."""
    df = query("""
        SELECT DISTINCT ON (indice_codigo)
            indice_codigo, indice_nombre, valor, semaforo,
            variacion_7d, variacion_30d, interpretacion,
            metodologia, fecha_calculo
        FROM indices_politeia
        ORDER BY indice_codigo, fecha_calculo DESC
    """)
    return df.to_dict(orient="records")


@router.get("/{codigo}/serie")
def get_serie(
    codigo: str,
    dias: int = Query(default=90, ge=7, le=365),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT fecha_calculo, valor, semaforo, variacion_7d
        FROM indices_politeia
        WHERE indice_codigo = :codigo
          AND fecha_calculo >= CURRENT_DATE - :dias
        ORDER BY fecha_calculo
    """, {"codigo": codigo, "dias": dias})
    return df.to_dict(orient="records")
