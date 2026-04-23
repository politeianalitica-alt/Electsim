"""Endpoints para analogías históricas."""

from __future__ import annotations

from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from dashboard.db import (
    cargar_elecciones_historicas,
    cargar_macro_serie,
    cargar_nowcasting,
    guardar_snapshot_analogia,
)
from dashboard.models.analogias_historicas import ContextoElectoral, MotorAnalogias

router = APIRouter(prefix="/analogias", tags=["analogias"])


class ContextoRequest(BaseModel):
    pib_crecimiento: float = 2.5
    tasa_paro: float = 11.0
    inflacion: float = 3.5
    deficit_pib: float = 3.5
    satisfaccion_eco: float = 4.0
    incumbente_anios: int = 5
    aprobacion_gobierno: float = 33.0
    fragmentacion_pre: float = 5.8
    polarizacion: float = 0.65
    escandalo_mayor: bool = False
    tension_territorial: float = 0.65
    crisis_internacional: bool = True
    partido_ref: Optional[str] = None
    tipo_eleccion: str = "generales"
    top_n: int = Field(default=5, ge=1, le=20)
    guardar: bool = True
    cliente_id: Optional[int] = None


def _ultimo_valor(df, default: float) -> float:
    if df is None or getattr(df, "empty", True):
        return default
    try:
        return float(df["valor"].iloc[-1])
    except Exception:
        return default


@router.post("/buscar")
def buscar_analogias(req: ContextoRequest):
    df = cargar_elecciones_historicas(tipo=req.tipo_eleccion)
    motor = MotorAnalogias(df).ajustar_normalizacion()

    ctx = ContextoElectoral(
        pib_crecimiento=req.pib_crecimiento,
        tasa_paro=req.tasa_paro,
        inflacion=req.inflacion,
        deficit_pib=req.deficit_pib,
        satisfaccion_eco=req.satisfaccion_eco,
        incumbente_anios=req.incumbente_anios,
        aprobacion_gobierno=req.aprobacion_gobierno,
        fragmentacion_pre=req.fragmentacion_pre,
        polarizacion=req.polarizacion,
        escandalo_mayor=req.escandalo_mayor,
        tension_territorial=req.tension_territorial,
        crisis_internacional=req.crisis_internacional,
    )

    analogias = motor.buscar(ctx, top_n=req.top_n)
    analogias_dict = [asdict(a) for a in analogias]

    proyeccion = {}
    if req.partido_ref:
        proyeccion = motor.proyeccion_resultado(analogias, req.partido_ref)

    snapshot_id = None
    if req.guardar:
        snapshot_id = guardar_snapshot_analogia(
            contexto_dict=asdict(ctx),
            resultados=analogias_dict,
            proyeccion=proyeccion or None,
            partido_ref=req.partido_ref,
            tipo_eleccion=req.tipo_eleccion,
            cliente_id=req.cliente_id,
        )

    return {
        "analogias": analogias_dict,
        "proyeccion": proyeccion,
        "n_historico": len(df),
        "snapshot_id": snapshot_id,
    }


@router.get("/contexto_automatico")
def contexto_automatico():
    """Construye un contexto base desde macro + nowcasting disponible."""
    pib_val, ipc_val, paro_val = 2.5, 3.5, 11.0

    try:
        pib_df = cargar_macro_serie("crecimiento_pib", anios=2)
        pib_val = _ultimo_valor(pib_df, pib_val)
    except Exception:
        pass

    try:
        ipc_df = cargar_macro_serie("ipc_general", anios=2)
        ipc_val = _ultimo_valor(ipc_df, ipc_val)
    except Exception:
        pass

    try:
        # Puede no existir en todos los despliegues.
        paro_df = cargar_macro_serie("tasa_paro", anios=2)
        paro_val = _ultimo_valor(paro_df, paro_val)
    except Exception:
        pass

    # Derivar fragmentación de nowcasting actual (número efectivo de partidos)
    fragmentacion = 5.8
    aprobacion = 33.0
    try:
        df_nc = cargar_nowcasting()
        if not df_nc.empty and "estimacion_pct" in df_nc.columns:
            p = (df_nc["estimacion_pct"].astype(float).clip(lower=0.0) / 100.0).values
            p = p[p > 0.01]
            if len(p) > 0:
                nep = float(1.0 / (p**2).sum())
                fragmentacion = round(max(2.0, min(10.0, nep)), 2)
            # Proxy conservador: mayor fragmentación y menor voto del líder -> menor aprobación
            voto_lider = float(df_nc["estimacion_pct"].max())
            aprobacion = round(max(20.0, min(60.0, voto_lider + 2.0)), 1)
    except Exception:
        pass

    return {
        "pib_crecimiento": pib_val,
        "tasa_paro": paro_val,
        "inflacion": ipc_val,
        "deficit_pib": 3.5,
        "satisfaccion_eco": 4.0,
        "incumbente_anios": 5,
        "aprobacion_gobierno": aprobacion,
        "fragmentacion_pre": fragmentacion,
        "polarizacion": 0.65,
        "escandalo_mayor": False,
        "tension_territorial": 0.65,
        "crisis_internacional": True,
    }
