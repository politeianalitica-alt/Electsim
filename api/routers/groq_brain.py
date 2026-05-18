"""
Router /api/v2/brain — endpoint unificado para el GroqBrain (29 tools).

Expone las 29 herramientas del GroqBrain a clientes frontend (visual-oscar,
workspace) y CLI, con descubrimiento dinámico y validación segura.

Endpoints:
  GET  /api/v2/brain/tools                → lista de tools + firma esperada
  POST /api/v2/brain/tool/{tool_name}     → ejecuta una tool con kwargs JSON
  POST /api/v2/brain/political_query      → atajo para la tool orquestadora
  GET  /api/v2/brain/health               → diagnóstico del modelo subyacente
  POST /api/v2/brain/ontology/enrich      → ejecuta OntologyEnricher sobre un texto
  POST /api/v2/brain/forecast/serie       → forecast_layer.forecast_serie sobre payload

Convive con el router antiguo `/api/brain` (Ollama + 8 tools) sin tocarlo.

Por seguridad:
  · Whitelist de tools — sólo se pueden invocar métodos públicos del brain.
  · Tamaño máximo de payload — kwargs serializados ≤ 30 KB.
  · Captura todas las excepciones → 500 con detalle resumido (no stack al cliente).
"""
from __future__ import annotations

import inspect
import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v2/brain", tags=["groq-brain"])

# Tamaño máximo del cuerpo serializado de la request (bytes)
_MAX_KWARGS_BYTES = 30_000


# ─────────────────────────────────────────────────────────────────
# Lazy access al brain (no construir al import)
# ─────────────────────────────────────────────────────────────────

def _get_brain():
    from agents.brain import get_groq_brain
    return get_groq_brain()


def _list_brain_tools() -> list[dict[str, Any]]:
    """Descubre las 29 tools del brain por reflexión y devuelve metadata."""
    brain = _get_brain()
    excluded = {"client", "default_temperature", "default_max_tokens", "system_prompt"}
    tools: list[dict[str, Any]] = []
    for attr_name in dir(brain):
        if attr_name.startswith("_") or attr_name in excluded:
            continue
        attr = getattr(brain, attr_name, None)
        if not callable(attr):
            continue
        try:
            sig = inspect.signature(attr)
        except (TypeError, ValueError):
            continue
        params: list[dict[str, Any]] = []
        for pname, p in sig.parameters.items():
            if pname == "self":
                continue
            params.append({
                "name": pname,
                "kind": str(p.kind),
                "required": p.default is inspect.Parameter.empty,
                "default": None if p.default is inspect.Parameter.empty else _safe_repr(p.default),
            })
        tools.append({
            "name": attr_name,
            "doc": (inspect.getdoc(attr) or "").split("\n\n")[0].strip(),
            "params": params,
        })
    return sorted(tools, key=lambda t: t["name"])


def _safe_repr(v: Any) -> Any:
    try:
        json.dumps(v)
        return v
    except (TypeError, ValueError):
        return str(v)


# ─────────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────────

class ToolRunRequest(BaseModel):
    kwargs: dict[str, Any] = Field(default_factory=dict)


class ToolRunResponse(BaseModel):
    ok: bool
    tool: str
    result: Any | None = None
    confidence: float | None = None
    sources: list[str] = Field(default_factory=list)
    reasoning_steps: list[str] = Field(default_factory=list)
    model: str | None = None
    tokens_used: int | None = None
    latency_ms: int | None = None
    error: str | None = None
    prompt_name: str | None = None
    from_fallback: bool | None = None


class PoliticalQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=4000)
    context: str | None = Field(default=None, max_length=8000)
    max_iterations: int = Field(default=10, ge=1, le=15)


class OntologyEnrichRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=20000)
    source: str = ""
    text_id: str = ""
    context: str = ""
    known_actors: list[str] = Field(default_factory=list)
    known_parties: list[str] = Field(default_factory=list)
    known_institutions: list[str] = Field(default_factory=list)
    known_laws: list[str] = Field(default_factory=list)


class ForecastSerieRequest(BaseModel):
    """Serie temporal serializada como lista de (fecha, valor)."""
    points: list[dict[str, Any]] = Field(..., min_length=3)
    fecha_col: str = "fecha"
    valor_col: str = "valor"
    horizonte_dias: int = 14
    etiqueta: str = "serie"
    eventos_recientes: list[str] = Field(default_factory=list)
    pedir_brain: bool = True
    pedir_escenarios: bool = False


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.get("/tools", tags=["groq-brain"])
def list_tools() -> dict[str, Any]:
    """Lista todas las tools disponibles con metadata para discovery."""
    try:
        tools = _list_brain_tools()
        return {"count": len(tools), "tools": tools}
    except Exception as exc:
        logger.exception("list_tools failed")
        raise HTTPException(status_code=500, detail=f"error: {exc}") from exc


@router.get("/health", tags=["groq-brain"])
def health() -> dict[str, Any]:
    """Diagnóstico del modelo subyacente."""
    try:
        brain = _get_brain()
        return {
            "status": "ok",
            "model": brain.client.modelo,
            "client_class": type(brain.client).__name__,
            "default_temperature": brain.default_temperature,
            "default_max_tokens": brain.default_max_tokens,
        }
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:300]}


@router.post("/tool/{tool_name}", response_model=ToolRunResponse, tags=["groq-brain"])
def run_tool(tool_name: str, payload: ToolRunRequest) -> ToolRunResponse:
    """Ejecuta una tool del brain por nombre.

    `political_query` se excluye explícitamente del endpoint genérico —
    tiene su propio handler `/political_query` con validación de longitud
    e iteraciones máximas para evitar abusos.
    """
    if tool_name == "political_query":
        raise HTTPException(
            status_code=400,
            detail="Usa /api/v2/brain/political_query (tiene su propio schema y límites)",
        )
    # Whitelist por descubrimiento
    valid_tools = {t["name"] for t in _list_brain_tools()}
    if tool_name not in valid_tools:
        raise HTTPException(status_code=404, detail=f"tool desconocida: {tool_name}")
    # Limite de tamaño
    try:
        size = len(json.dumps(payload.kwargs, ensure_ascii=False, default=str).encode("utf-8"))
    except Exception:
        size = 0
    if size > _MAX_KWARGS_BYTES:
        raise HTTPException(status_code=413, detail=f"kwargs > {_MAX_KWARGS_BYTES} bytes")

    try:
        brain = _get_brain()
        method = getattr(brain, tool_name)
        out = method(**(payload.kwargs or {}))
    except TypeError as exc:
        # Argumentos inválidos
        raise HTTPException(status_code=400, detail=f"args inválidos: {str(exc)[:300]}") from exc
    except Exception as exc:
        logger.exception("run_tool %s failed", tool_name)
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:300]}") from exc

    if not isinstance(out, dict):
        raise HTTPException(status_code=500, detail="respuesta del brain con forma inesperada")
    return ToolRunResponse(
        ok=bool(out.get("ok", False)),
        tool=tool_name,
        result=out.get("result"),
        confidence=out.get("confidence"),
        sources=out.get("sources") or [],
        reasoning_steps=out.get("reasoning_steps") or [],
        model=out.get("model"),
        tokens_used=out.get("tokens_used"),
        latency_ms=out.get("latency_ms"),
        error=out.get("error"),
        prompt_name=out.get("prompt_name"),
        from_fallback=out.get("from_fallback"),
    )


@router.post("/political_query", tags=["groq-brain"])
def political_query(payload: PoliticalQueryRequest) -> dict[str, Any]:
    """Atajo: ejecuta el orquestador ReAct sobre una consulta de lenguaje natural."""
    try:
        brain = _get_brain()
        out = brain.political_query(
            payload.query,
            context=payload.context,
            max_iterations=payload.max_iterations,
        )
        return out
    except Exception as exc:
        logger.exception("political_query failed")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:300]}") from exc


@router.post("/ontology/enrich", tags=["groq-brain"])
def ontology_enrich(payload: OntologyEnrichRequest) -> dict[str, Any]:
    """Ejecuta OntologyEnricher sobre un texto y devuelve propuesta de cambios."""
    try:
        from agents.brain.pipelines.ontology_enricher import OntologyEnricher
        enricher = OntologyEnricher(
            known_actors=set(payload.known_actors),
            known_parties=set(payload.known_parties),
            known_institutions=set(payload.known_institutions),
            known_laws=set(payload.known_laws),
        )
        proposal = enricher.enrich_text(
            payload.text,
            source=payload.source,
            text_id=payload.text_id,
            context=payload.context,
        )
        return proposal.to_dict()
    except Exception as exc:
        logger.exception("ontology_enrich failed")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:300]}") from exc


@router.post("/forecast/serie", tags=["groq-brain"])
def forecast_serie(payload: ForecastSerieRequest) -> dict[str, Any]:
    """Forecast cuantitativo + lectura razonada para una serie temporal."""
    try:
        import pandas as pd
        from dashboard.services.forecast_layer import forecast_serie as _forecast
        df = pd.DataFrame(payload.points)
        res = _forecast(
            df,
            fecha_col=payload.fecha_col,
            valor_col=payload.valor_col,
            horizonte_dias=int(payload.horizonte_dias),
            etiqueta=payload.etiqueta,
            eventos_recientes=payload.eventos_recientes,
            pedir_brain=bool(payload.pedir_brain),
            pedir_escenarios=bool(payload.pedir_escenarios),
        )
        return res.to_dict()
    except Exception as exc:
        logger.exception("forecast_serie failed")
        raise HTTPException(status_code=500, detail=f"{type(exc).__name__}: {str(exc)[:300]}") from exc
