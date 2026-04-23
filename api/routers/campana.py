"""Router de campaña: clientes, coordinación y memoria institucional."""

from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from dashboard.services import campana as svc

router = APIRouter()


class ClienteCreate(BaseModel):
    nombre: str
    tipo: str = "partido"
    ambito: str = "nacional"
    color_hex: str = "#1a6b8a"
    config: dict | None = None


class MensajeCreate(BaseModel):
    titulo: str
    cuerpo: str
    tipo: Literal[
        "mensaje_dia",
        "talking_points",
        "lineas_rojas",
        "temas_evitar",
        "narrativa_semana",
    ] = "mensaje_dia"
    prioridad: int = Field(default=2, ge=1, le=3)
    fecha_fin: date | None = None
    destinatarios: list[str] = ["todos"]
    autor: str | None = None


class DecisionCreate(BaseModel):
    titulo: str
    descripcion: str
    tipo: Literal[
        "decision",
        "accion",
        "crisis",
        "hito",
        "leccion",
        "cambio_estrategia",
    ] = "decision"
    fecha_decision: date | None = None
    resultado: str = "pendiente"
    impacto_est: str = ""
    lecciones: str = ""
    etiquetas: list[str] = []
    autor: str | None = None
    contexto_datos: dict | None = None


class ResultadoUpdate(BaseModel):
    resultado: Literal["positivo", "neutral", "negativo", "pendiente"]
    impacto_est: str = ""
    lecciones: str = ""


@router.get("/clientes")
def get_clientes(solo_activos: bool = True):
    return svc.listar_clientes(solo_activos).to_dict("records")


@router.post("/clientes", status_code=201)
def post_cliente(body: ClienteCreate):
    new_id = svc.crear_cliente(**body.model_dump())
    return {"id": new_id}


@router.get("/clientes/{cliente_id}/mensajes")
def get_mensajes(
    cliente_id: int,
    tipo: str | None = Query(None),
    solo_activos: bool = True,
    limit: int = Query(50, le=200),
):
    df = svc.listar_mensajes(cliente_id, solo_activos, tipo, limit)
    return df.to_dict("records")


@router.post("/clientes/{cliente_id}/mensajes", status_code=201)
def post_mensaje(cliente_id: int, body: MensajeCreate):
    new_id = svc.crear_mensaje(cliente_id=cliente_id, **body.model_dump())
    return {"id": new_id}


@router.delete("/clientes/{cliente_id}/mensajes/{mensaje_id}")
def delete_mensaje(cliente_id: int, mensaje_id: int):
    ok = svc.archivar_mensaje(mensaje_id, cliente_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    return {"archived": True}


@router.get("/clientes/{cliente_id}/decisiones")
def get_decisiones(
    cliente_id: int,
    tipo: str | None = Query(None),
    resultado: str | None = Query(None),
    etiqueta: str | None = Query(None),
    limit: int = Query(100, le=500),
):
    df = svc.listar_decisiones(
        cliente_id=cliente_id,
        tipo=tipo,
        resultado=resultado,
        etiqueta=etiqueta,
        limit=limit,
    )
    return df.to_dict("records")


@router.post("/clientes/{cliente_id}/decisiones", status_code=201)
def post_decision(cliente_id: int, body: DecisionCreate):
    new_id = svc.registrar_decision(cliente_id=cliente_id, **body.model_dump())
    return {"id": new_id}


@router.patch("/clientes/{cliente_id}/decisiones/{decision_id}")
def patch_decision_resultado(cliente_id: int, decision_id: int, body: ResultadoUpdate):
    ok = svc.actualizar_resultado_decision(
        decision_id=decision_id,
        cliente_id=cliente_id,
        resultado=body.resultado,
        impacto_est=body.impacto_est,
        lecciones=body.lecciones,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Decisión no encontrada")
    return {"updated": True}


@router.get("/clientes/{cliente_id}/decisiones/buscar")
def buscar_decisiones(
    cliente_id: int,
    q: str = Query(..., min_length=3),
    limit: int = Query(5, le=20),
):
    df = svc.buscar_decisiones_similares(cliente_id, q, limit)
    return df.to_dict("records")

