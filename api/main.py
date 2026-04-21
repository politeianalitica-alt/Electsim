from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request

from api.observability import record_request
from api.routers import actions, analytics, observability, ontology, search
from agents.semantic_search import validate_semantic_schema
from db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("electsim.api")

app = FastAPI(title="ElectSim API", version="0.2.0")


@app.on_event("startup")
def startup_checks() -> None:
    with SessionLocal() as session:
        validate_semantic_schema(session)


@app.middleware("http")
async def structured_log_middleware(request: Request, call_next):
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        record_request(request.method, request.url.path, 500, elapsed_ms)
        logger.exception("Unhandled API error on %s %s", request.method, request.url.path)
        raise
    elapsed_ms = int((time.perf_counter() - start) * 1000)
    record_request(request.method, request.url.path, response.status_code, elapsed_ms)
    logger.info(
        '{"path":"%s","method":"%s","status":%d,"elapsed_ms":%d}',
        request.url.path,
        request.method,
        response.status_code,
        elapsed_ms,
    )
    return response


app.include_router(observability.router, tags=["observability"])
app.include_router(ontology.router, prefix="/ontology", tags=["ontology"])
app.include_router(actions.router, prefix="/actions", tags=["actions"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(search.router, prefix="/search", tags=["search"])
