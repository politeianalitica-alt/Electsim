from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from dashboard.db import cargar_contradicciones, cargar_declaraciones
from dashboard.services.debate_simulator import simular_debate
from dashboard.services.opposition import calcular_posicionamiento
from dashboard.services import opposition as opposition_svc

router = APIRouter()


class DebateRequest(BaseModel):
    partido_propio: str = Field(..., min_length=1)
    adversario: str = Field(..., min_length=1)
    tema: str = Field(..., min_length=1)
    formato: str = Field(default="debate televisivo")


class SimulacionRequest(BaseModel):
    partido_propio: str = Field(..., min_length=1)
    partido_rival: str = Field(..., min_length=1)
    tema: str = Field(..., min_length=1)
    formato: str = Field(default="debate_televisivo")
    tipo_output: str = Field(default="guion")
    cliente_id: int | None = None
    contexto_extra: dict | None = None


@router.get("/contradictions")
def get_contradictions(
    partido: str | None = Query(default=None),
    persona: str | None = Query(default=None),
    gravedad: str | None = Query(default=None),
    limite: int = Query(default=50, ge=1, le=200),
):
    df = cargar_contradicciones(partido=partido, persona=persona, gravedad=gravedad, limite=limite)
    return df.to_dict(orient="records")


@router.post("/debate_simulation")
def debate_simulation(payload: DebateRequest):
    dfa = cargar_declaraciones(partido=payload.adversario, tema=payload.tema, ventana_dias=365, limite=250)
    decs = dfa["texto"].dropna().astype(str).str[:220].head(6).tolist() if not dfa.empty else []
    dfc = cargar_contradicciones(partido=payload.adversario, limite=6)
    cons = dfc["descripcion"].dropna().astype(str).head(6).tolist() if not dfc.empty else []
    sim = simular_debate(
        partido_propio=payload.partido_propio,
        adversario=payload.adversario,
        tema=payload.tema,
        formato=payload.formato,
        declaraciones_adversario=decs,
        contradicciones=cons,
    )
    return {
        "tema": sim.tema,
        "partido_propio": sim.partido_propio,
        "adversario": sim.adversario,
        "preguntas_probables": sim.preguntas_prob,
        "respuestas_sugeridas": sim.respuestas_sug,
        "contra_replicas": sim.contra_replicas,
        "puntos_de_presion": sim.puntos_presion,
        "lineas_rojas": sim.lineas_rojas,
    }


@router.get("/positioning")
def positioning(
    tema: str | None = Query(default=None),
    partido_a: str | None = Query(default=None),
    partido_b: str | None = Query(default=None),
):
    df = cargar_declaraciones(ventana_dias=730, limite=5000)
    temas = [tema] if tema else None
    partidos = [p for p in [partido_a, partido_b] if p]
    pos = calcular_posicionamiento(df, temas=temas, partidos=partidos or None)
    return [
        {
            "partido": p.partido,
            "tema": p.tema,
            "posicion_x": p.posicion_x,
            "posicion_y": p.posicion_y,
            "intensidad": p.intensidad,
            "n_decl": p.n_decl,
        }
        for p in pos
    ]


# --- Endpoints Bloque 2 (compatibles con arquitectura propuesta) ---


@router.get("/contradicciones")
def get_contradicciones(
    persona: str | None = Query(default=None),
    tema: str | None = Query(default=None),
    score_minimo: float = Query(default=0.6, ge=0.0, le=1.0),
    cliente_id: int | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    df = opposition_svc.cargar_contradicciones(
        persona=persona,
        tema=tema,
        score_minimo=score_minimo,
        cliente_id=cliente_id,
        limit=limit,
    )
    return df.to_dict(orient="records")


@router.get("/declaraciones")
def get_declaraciones(
    partido: str | None = Query(default=None),
    persona: str | None = Query(default=None),
    tema: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
):
    df = opposition_svc.cargar_declaraciones(
        partido=partido,
        persona=persona,
        tema=tema,
        cliente_id=cliente_id,
        limit=limit,
    )
    return df.to_dict(orient="records")


@router.get("/posicionamiento")
def get_posicionamiento(
    partidos: str = Query(..., description="Partidos separados por coma"),
    tema: str | None = Query(default=None),
    cliente_id: int | None = Query(default=None),
):
    lista = [p.strip() for p in partidos.split(",") if p.strip()]
    df = opposition_svc.cargar_posicionamiento(
        partidos=lista,
        tema=tema,
        cliente_id=cliente_id,
    )
    return df.to_dict(orient="records")


@router.post("/simular")
def post_simular_debate(payload: SimulacionRequest):
    resultado = opposition_svc.simular_debate(
        partido_propio=payload.partido_propio,
        partido_rival=payload.partido_rival,
        tema=payload.tema,
        formato=payload.formato,
        tipo_output=payload.tipo_output,
        contexto_extra=payload.contexto_extra,
        cliente_id=payload.cliente_id,
    )
    return {"resultado": resultado}
