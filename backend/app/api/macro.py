from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/macro", tags=["macro"])

_COLUMNAS_VALIDAS = {
    "ipc_general", "crecimiento_pib", "prima_riesgo_bono10",
    "euribor_12m", "ibex35_cierre", "deuda_publica_pib", "deficit_publico_pib",
}


@router.get("")
def get_macro_ultimo(current_user: UserOut = Depends(get_current_user)):
    """Últimos valores de todos los indicadores macro."""
    df = query("""
        SELECT indicador, valor, fecha FROM (
            SELECT 'IPC General (%)'        AS indicador, ipc_general::numeric        AS valor, fecha FROM indicadores_macroeconomicos WHERE ipc_general IS NOT NULL
            UNION ALL
            SELECT 'Prima Riesgo (pb)',     prima_riesgo_bono10::numeric,             fecha FROM indicadores_macroeconomicos WHERE prima_riesgo_bono10 IS NOT NULL
            UNION ALL
            SELECT 'Crec. PIB (%)',         crecimiento_pib::numeric,                 fecha FROM indicadores_macroeconomicos WHERE crecimiento_pib IS NOT NULL
            UNION ALL
            SELECT 'Euribor 12m (%)',       euribor_12m::numeric,                     fecha FROM indicadores_macroeconomicos WHERE euribor_12m IS NOT NULL
            UNION ALL
            SELECT 'IBEX 35',              ibex35_cierre::numeric,                    fecha FROM indicadores_macroeconomicos WHERE ibex35_cierre IS NOT NULL
            UNION ALL
            SELECT 'Deuda Pública (% PIB)', deuda_publica_pib::numeric,              fecha FROM indicadores_macroeconomicos WHERE deuda_publica_pib IS NOT NULL
        ) t
        ORDER BY indicador, fecha DESC
    """)
    return df.to_dict(orient="records")


@router.get("/{columna}/serie")
def get_macro_serie(
    columna: str,
    anios: int = Query(default=5, ge=1, le=20),
    current_user: UserOut = Depends(get_current_user),
):
    """Serie histórica de un indicador."""
    if columna not in _COLUMNAS_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Columna inválida. Válidas: {sorted(_COLUMNAS_VALIDAS)}",
        )
    df = query(f"""
        SELECT fecha, {columna} AS valor
        FROM indicadores_macroeconomicos
        WHERE {columna} IS NOT NULL
          AND fecha >= CURRENT_DATE - INTERVAL '{anios * 365} days'
        ORDER BY fecha
    """)
    return df.to_dict(orient="records")
