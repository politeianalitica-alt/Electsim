from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/congreso", tags=["congreso"])


@router.get("/stats")
def get_stats(
    legislatura: int = Query(default=15),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT partido_siglas, periodo,
               n_iniciativas, n_aprobadas, n_rechazadas,
               tasa_exito, temas_principales_json
        FROM estadisticas_legislativas
        WHERE legislatura = :leg
        ORDER BY n_iniciativas DESC NULLS LAST
    """, {"leg": legislatura})
    return df.to_dict(orient="records")


@router.get("/votaciones")
def get_votaciones(
    legislatura: int = Query(default=15),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT id, titulo, fecha, tipo, resultado,
               votos_favor, votos_contra, abstenciones,
               descripcion, temas_json
        FROM votaciones_congreso
        WHERE legislatura = :leg
        ORDER BY fecha DESC
        LIMIT :limit
    """, {"leg": legislatura, "limit": limit})
    return df.to_dict(orient="records")


@router.get("/scraping-log")
def get_scraping_log(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT fuente, tipo, estado, n_registros_nuevos, n_registros_duplicados,
               duracion_segundos, error_mensaje, created_at
        FROM scraping_log
        ORDER BY created_at DESC
        LIMIT :limit
    """, {"limit": limit})
    return df.to_dict(orient="records")
