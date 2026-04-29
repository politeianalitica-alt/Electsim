from __future__ import annotations

import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from api.routers import (
    actions,
    ai,
    analogias,
    analytics,
    campana,
    ontology,
    opposition,
    pipelines,
    search,
    voto_blando,
    workspace_signals,
)
from agents.semantic_search import validate_semantic_schema
from db.session import get_session_factory

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("electsim.api")

app = FastAPI(title="ElectSim API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8501",
        os.getenv("FRONTEND_URL", "http://localhost:5173"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_checks() -> None:
    max_retries = 10
    for attempt in range(max_retries):
        try:
            with get_session_factory()() as session:
                validate_semantic_schema(session)
            logger.info("startup_checks OK")
            return
        except OperationalError as e:
            logger.warning("DB no lista (intento %d/%d): %s", attempt + 1, max_retries, e)
            time.sleep(2 ** min(attempt, 4))
        except Exception as e:
            logger.error("startup_checks no crítico: %s", e)
            return
    logger.error("No se pudo validar esquema semántico tras %d intentos.", max_retries)


@app.middleware("http")
async def structured_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    logger.info(
        '{"path":"%s","method":"%s","status":%d,"elapsed_ms":%d}',
        request.url.path,
        request.method,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.get("/health")
def health():
    return {"status": "ok", "service": "electsim-api"}


@app.get("/metrics")
def metrics():
    # placeholder compatible con scraping Prometheus
    return JSONResponse(
        {
            "service": "electsim-api",
            "metrics": {
                "ontology_actions_total": "expuesto en logs por ahora",
                "llm_tokens_total": "pendiente integración fina",
            },
        }
    )


app.include_router(ontology.router, prefix="/ontology", tags=["ontology"])
app.include_router(actions.router, prefix="/actions", tags=["actions"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
app.include_router(opposition.router, prefix="/opposition", tags=["opposition"])
app.include_router(campana.router, prefix="/campana", tags=["campana"])
app.include_router(voto_blando.router)
app.include_router(analogias.router)
app.include_router(workspace_signals.router, tags=["workspace"])
