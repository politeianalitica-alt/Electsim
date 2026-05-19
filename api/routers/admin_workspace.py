"""Router /api/v1/admin/* · operaciones de inicialización del workspace.

Endpoints sin auth fuerte por ahora (sprint próximo añade JWT admin).
Son idempotentes y seguros de re-ejecutar.

POST /api/v1/admin/init_workspace
  Asegura las tablas de ontología + investigations + analyst_memory.
  Ejecuta el backfill de catálogos curados (15 partidos + 19 CCAA + 9
  sectores + 46 reguladores + 84 links).

  Devuelve resumen con counts y timing.

POST /api/v1/admin/reset_workspace_init_flags
  Solo testing · resetea los flags de proceso para forzar re-init en
  la siguiente llamada (no borra datos).
"""
from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


class InitWorkspaceResponse(BaseModel):
    ok: bool
    ontology: dict[str, Any] = Field(default_factory=dict)
    memory: dict[str, Any] = Field(default_factory=dict)
    backfill: dict[str, Any] = Field(default_factory=dict)
    total_latency_ms: int
    notes: list[str] = Field(default_factory=list)


@router.post("/init_workspace", response_model=InitWorkspaceResponse)
def init_workspace(
    skip_backfill: bool = Query(default=False, description="Si true, solo crea tablas sin volcar catálogos"),
) -> InitWorkspaceResponse:
    """Inicializa workspace · tablas + backfill catálogos. Idempotente.

    Llamable una vez tras deploy a Railway/Render para activar Pilar 1+2+3
    en producción sin necesidad de SSH ni `alembic upgrade head`.

    Curl:
      curl -X POST https://tu-fastapi/api/v1/admin/init_workspace
    """
    started = time.time()
    notes: list[str] = []
    ok = True

    # 1) Engine
    try:
        from db.session import get_engine
        engine = get_engine()
    except Exception as exc:
        return InitWorkspaceResponse(
            ok=False, notes=[f"engine: {exc}"], total_latency_ms=int((time.time() - started) * 1000),
        )
    if engine is None:
        return InitWorkspaceResponse(
            ok=False, notes=["DATABASE_URL no configurada"], total_latency_ms=int((time.time() - started) * 1000),
        )

    # 2) Ontology + investigations tables
    try:
        from agents.entities._schema import ensure_ontology_tables, reset_init_flag as reset_ont
        reset_ont()  # forzamos para tener counts reales esta llamada
        ontology = ensure_ontology_tables(engine)
        if not ontology.get("ok"):
            ok = False
            notes.append(f"ontology: {ontology.get('error')}")
    except Exception as exc:
        logger.exception("init_workspace.ontology")
        ontology = {"ok": False, "error": str(exc)[:300]}
        ok = False

    # 3) Memory tables
    try:
        from agents.memory._schema import ensure_memory_tables, reset_init_flag as reset_mem
        reset_mem()
        memory = ensure_memory_tables(engine)
        if not memory.get("ok"):
            ok = False
            notes.append(f"memory: {memory.get('error')}")
    except Exception as exc:
        logger.exception("init_workspace.memory")
        memory = {"ok": False, "error": str(exc)[:300]}
        ok = False

    # 4) Backfill catálogos (si las tablas están)
    backfill: dict[str, Any] = {}
    if not skip_backfill and ontology.get("ok"):
        try:
            from agents.entities.backfill import backfill as run_backfill
            counts = run_backfill(dry_run=False)
            backfill = {"ok": True, "counts": counts}
            notes.append(
                f"backfill ejecutado · {counts.get('parties', 0)} partidos · "
                f"{counts.get('ccaa', 0)} CCAA · {counts.get('sectors', 0)} sectores · "
                f"{counts.get('regulators', 0)} reguladores"
            )
        except Exception as exc:
            logger.exception("init_workspace.backfill")
            backfill = {"ok": False, "error": str(exc)[:300]}
            ok = False
            notes.append(f"backfill: {exc}")
    elif skip_backfill:
        notes.append("backfill omitido (skip_backfill=true)")

    return InitWorkspaceResponse(
        ok=ok,
        ontology=ontology,
        memory=memory,
        backfill=backfill,
        total_latency_ms=int((time.time() - started) * 1000),
        notes=notes,
    )


@router.post("/reset_workspace_init_flags")
def reset_flags() -> dict[str, Any]:
    """Resetea los flags de init para forzar re-creación en próxima llamada.

    NO borra datos. Útil cuando se añaden columnas nuevas en el código y
    se quiere que los CREATE TABLE IF NOT EXISTS se reintenten (efecto
    nulo en columnas ya existentes, pero permite recrear índices).
    """
    try:
        from agents.entities._schema import reset_init_flag as r1
        from agents.memory._schema import reset_init_flag as r2
        r1()
        r2()
        return {"ok": True, "reset": ["ontology", "memory"]}
    except Exception as exc:
        raise HTTPException(500, detail=str(exc)[:200]) from exc
