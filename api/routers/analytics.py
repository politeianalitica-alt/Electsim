from __future__ import annotations

from sqlalchemy import text
from fastapi import APIRouter, Depends

from api.dependencies import get_db

router = APIRouter()


@router.get("/nowcast")
def get_nowcast(db=Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT fecha_estimacion, partido_id, estimacion_pct
            FROM estimaciones_voto_agregadas
            ORDER BY fecha_estimacion DESC
            LIMIT 200
            """
        )
    ).mappings().all()
    return [dict(r) for r in rows]


@router.get("/pedersen")
def get_pedersen(db=Depends(get_db)):
    rows = db.execute(
        text(
            """
            SELECT eleccion_actual, volatilidad_total, volatilidad_bloques, volatilidad_interna
            FROM volatilidad_electoral_historica
            ORDER BY eleccion_actual DESC
            LIMIT 100
            """
        )
    ).mappings().all()
    return [dict(r) for r in rows]
