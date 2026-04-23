from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from dashboard.db import (
    cargar_nowcasting,
    cargar_transferencia_voto,
    cargar_voto_blando,
    guardar_transferencia_voto,
    guardar_voto_blando,
)
from dashboard.models.transferencia import calcular_transferencia_heuristica
from dashboard.models.voto_blando import calcular_score_voto_blando

router = APIRouter(prefix="/voto_blando", tags=["voto_blando"])


class SolicitudVotoBlando(BaseModel):
    partido_ref: str
    tipo_eleccion: str = "generales"
    cliente_id: Optional[int] = None
    recalcular: bool = False


@router.post("/calcular")
def calcular_voto_blando(req: SolicitudVotoBlando):
    if not req.recalcular:
        df_cache = cargar_voto_blando(
            partido_ref=req.partido_ref,
            tipo_eleccion=req.tipo_eleccion,
            cliente_id=req.cliente_id,
        )
        if not df_cache.empty:
            return {
                "fuente": "cache_db",
                "registros": df_cache.to_dict(orient="records"),
            }

    try:
        # Si no hay nowcasting provincial, el modelo usa fallbacks internos.
        df_now = cargar_nowcasting()
        registros = calcular_score_voto_blando(
            partido_ref=req.partido_ref,
            tipo_eleccion=req.tipo_eleccion,
            df_encuestas=df_now if not df_now.empty else None,
            df_macro=None,
        )
        guardar_voto_blando(
            registros=registros,
            partido_ref=req.partido_ref,
            tipo_eleccion=req.tipo_eleccion,
            cliente_id=req.cliente_id,
        )
        return {"fuente": "calculado", "registros": registros}
    except Exception as e:
        return {"fuente": "error", "detalle": str(e), "registros": []}


@router.get("/transferencia")
def obtener_transferencia(
    partido_origen: Optional[str] = None,
    tipo_eleccion: str = "generales",
    cliente_id: Optional[int] = None,
):
    df = cargar_transferencia_voto(
        partido_origen=partido_origen,
        tipo_eleccion=tipo_eleccion,
        cliente_id=cliente_id,
    )
    return {"registros": df.to_dict(orient="records") if not df.empty else []}


@router.post("/transferencia/recalcular")
def recalcular_transferencia(
    tipo_eleccion: str = "generales",
    cliente_id: Optional[int] = None,
):
    try:
        df = calcular_transferencia_heuristica()
        # Adaptar naming al esquema DB nuevo
        df_db = df.rename(columns={"prob_transicion": "prob_transferencia"}).copy()
        n = guardar_transferencia_voto(
            df_matriz=df_db,
            tipo_eleccion=tipo_eleccion,
            cliente_id=cliente_id,
            metodo="heuristico",
        )
        return {"insertados": n, "registros": df_db.to_dict(orient="records")}
    except Exception as e:
        return {"error": str(e)}
