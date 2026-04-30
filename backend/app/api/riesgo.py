from fastapi import APIRouter, Depends

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/riesgo", tags=["riesgo"])


@router.get("")
def get_riesgo(current_user: UserOut = Depends(get_current_user)):
    """Últimos 20 informes de riesgo político."""
    df = query("""
        SELECT fecha_calculo, indice_compuesto, semaforo, dimensiones_json
        FROM informes_riesgo_politico
        ORDER BY fecha_calculo DESC
        LIMIT 20
    """)
    return df.to_dict(orient="records")


@router.get("/validacion")
def get_validacion(current_user: UserOut = Depends(get_current_user)):
    df = query("""
        SELECT run_id, tipo, modelo, brier_score, rmse_voto, mae_escanos,
               cobertura_95ci, pct_completitud, n_checks_ok, n_checks_fail, created_at
        FROM resultados_validacion
        ORDER BY created_at DESC
        LIMIT 50
    """)
    return df.to_dict(orient="records")


@router.get("/validacion/{run_id}/partidos")
def get_validacion_partidos(
    run_id: str,
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT partido_siglas, voto_real_pct, voto_pred_pct, error_pct,
               escanos_reales, escanos_pred_mediana, escanos_pred_p5, escanos_pred_p95
        FROM validacion_por_partido
        WHERE run_id = :rid
        ORDER BY ABS(error_pct) DESC NULLS LAST
    """, {"rid": run_id})
    return df.to_dict(orient="records")
