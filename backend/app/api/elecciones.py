from fastapi import APIRouter, Depends, Query

from app.auth.deps import UserOut, get_current_user
from app.db.session import query

router = APIRouter(prefix="/elecciones", tags=["elecciones"])


@router.get("")
def list_elecciones(
    tipo: str = Query(default="generales"),
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT id, tipo::text, fecha, descripcion, vuelta
        FROM elecciones
        WHERE tipo = :tipo
        ORDER BY fecha DESC
    """, {"tipo": tipo})
    return df.to_dict(orient="records")


@router.get("/{eleccion_id}/resultados")
def get_resultados(
    eleccion_id: int,
    current_user: UserOut = Depends(get_current_user),
):
    """Resultados nacionales agregados por partido."""
    df = query("""
        SELECT
            p.siglas,
            p.nombre_completo AS partido_nombre,
            SUM(re.votos)     AS votos_totales,
            MAX(re.porcentaje) AS pct_medio,
            SUM(re.escanos)   AS escanos_totales
        FROM resultados_electorales re
        JOIN partidos p ON p.id = re.partido_id
        WHERE re.eleccion_id = :eid AND re.provincia_id IS NULL
        GROUP BY p.id, p.siglas, p.nombre_completo
        ORDER BY votos_totales DESC NULLS LAST
    """, {"eid": eleccion_id})
    return df.to_dict(orient="records")


@router.get("/{eleccion_id}/resultados/provincias")
def get_resultados_provincias(
    eleccion_id: int,
    current_user: UserOut = Depends(get_current_user),
):
    df = query("""
        SELECT
            p.siglas,
            pr.nombre AS provincia,
            ca.nombre AS ccaa,
            re.votos, re.porcentaje, re.escanos
        FROM resultados_electorales re
        JOIN partidos   p  ON p.id  = re.partido_id
        JOIN provincias pr ON pr.id = re.provincia_id
        LEFT JOIN comunidades_autonomas ca ON ca.id = pr.ccaa_id
        WHERE re.eleccion_id = :eid AND re.provincia_id IS NOT NULL
        ORDER BY pr.nombre, re.porcentaje DESC NULLS LAST
    """, {"eid": eleccion_id})
    return df.to_dict(orient="records")
