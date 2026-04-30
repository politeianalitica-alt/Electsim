from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/escenarios", tags=["escenarios"])


@router.get("")
def get_escenarios(current_user: UserOut = Depends(get_current_user)):
    df = query("""
        SELECT id, nombre, probabilidad, descripcion_narrativa, estados_json
        FROM escenarios_generados
        ORDER BY probabilidad DESC NULLS LAST
        LIMIT 20
    """)
    return df.to_dict(orient="records")


@router.get("/coaliciones")
def get_coaliciones(
    eleccion_id: int | None = Query(default=None),
    current_user: UserOut = Depends(get_current_user),
):
    cond = "WHERE eleccion_id = :eid" if eleccion_id else ""
    df = query(f"""
        SELECT partidos_coalicion AS partidos,
               escanos_totales    AS escanos_total,
               es_minima          AS viable,
               n_partidos,
               distancia_ideologica,
               score_viabilidad   AS probabilidad
        FROM analisis_coaliciones
        {cond}
        ORDER BY escanos_totales DESC
        LIMIT 30
    """, {"eid": eleccion_id} if eleccion_id else {})
    return df.to_dict(orient="records")
