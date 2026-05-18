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
    actors,
    agent,  # ReAct agent orquestador (Groq via OpenAI-compat)
    ai,
    analogias,
    analytics,
    campana,
    dashboard,
    geopolitica,
    intelligence,
    laws,
    market,
    media_intel,
    narratives,
    news_intelligence,
    ontology,
    opposition,
    persons,
    pipelines,
    politeia_v3,
    macro_finance,
    risk,
    risk_intelligence,
    risk_v2,
    search,
    voto_blando,
    workspace_config,
    workspace_signals,
)
from api.routers import (
    brain,
    contratacion,
    crm_comms,
    economy,
    fondos_eu,
    groq_brain,  # GroqBrain v2 · 29 tools cerebro razonador
    intelligence_workspace,
    legislative_core_api,
    opendata,
    rag,
    sectors,
)
from agents.semantic_search import validate_semantic_schema
from db.session import get_session_factory
from api.middleware import RequestLoggingMiddleware
from observability.logging import configure_logging

configure_logging()
logger = logging.getLogger("electsim.api")

app = FastAPI(title="ElectSim API", version="0.2.0")

# Observabilidad: logging de requests y metricas HTTP
app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8501",
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "https://politeia-visual-oscar.vercel.app",
    ],
    # Regex para Vercel preview deployments (URLs dinámicas) + dominios propios
    allow_origin_regex=r"^https://(.*\.vercel\.app|.*\.railway\.app|.*\.politeia-?(analitica|app)?\.com)$",
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
            break
        except OperationalError as e:
            logger.warning("DB no lista (intento %d/%d): %s", attempt + 1, max_retries, e)
            time.sleep(2 ** min(attempt, 4))
        except Exception as e:
            logger.error("startup_checks no crítico: %s", e)
            break
    else:
        logger.error("No se pudo validar esquema semántico tras %d intentos.", max_retries)

    # Arranque opt-in del RAG scheduler (RAG_SCHEDULER_ENABLED=1)
    try:
        from agents.brain.rag_scheduler import start_scheduler
        started = start_scheduler()
        if started:
            logger.info("rag_scheduler arrancado correctamente")
    except Exception as e:
        logger.warning("rag_scheduler.start_scheduler falló: %s", e)


@app.on_event("shutdown")
def shutdown_checks() -> None:
    try:
        from agents.brain.rag_scheduler import stop_scheduler
        stop_scheduler()
    except Exception as e:
        logger.debug("rag_scheduler.stop_scheduler: %s", e)


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
app.include_router(agent.router, prefix="/api", tags=["agent"])  # POST /api/v1/agent/query
app.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
app.include_router(opposition.router, prefix="/opposition", tags=["opposition"])
app.include_router(campana.router, prefix="/campana", tags=["campana"])
app.include_router(voto_blando.router)
app.include_router(analogias.router)
app.include_router(workspace_signals.router, tags=["workspace"])
app.include_router(workspace_config.router, tags=["workspace-config"])
app.include_router(intelligence_workspace.router, tags=["intelligence-workspace"])
# Bloque P2 — *_core.py expuestos como REST para visual-oscar:
app.include_router(economy.router, tags=["economy-macro"])
app.include_router(legislative_core_api.router, tags=["legislative-core"])
app.include_router(opendata.router, tags=["opendata-simulation"])
app.include_router(crm_comms.router, tags=["crm-comms"])
# Bloque P3 — IA unificada con tool-use real:
app.include_router(brain.router, tags=["brain"])
# GroqBrain v2 · cerebro razonador transversal (29 tools, Groq + LLaMA 3.3 70B)
app.include_router(groq_brain.router, tags=["groq-brain"])
# Bloque P2.2 — Routers de dominio que el frontend visual-oscar requería:
app.include_router(sectors.router, tags=["sectors"])
app.include_router(contratacion.router, tags=["contratacion"])
app.include_router(fondos_eu.router, tags=["fondos-europeos"])
# Bloque P3.2 — RAG: indexado BOE/Congreso/EUR-Lex/media + scheduler:
app.include_router(rag.router, tags=["rag"])
app.include_router(market.router, prefix="/market", tags=["market"])
app.include_router(intelligence.router, tags=["intelligence"])
app.include_router(politeia_v3.router, tags=["politeia-v3"])
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(news_intelligence.router, tags=["news-intelligence"])
app.include_router(media_intel.router, tags=["media-intel"])
app.include_router(narratives.router, tags=["narratives"])
app.include_router(laws.router, tags=["laws"])
app.include_router(persons.router, tags=["persons"])
app.include_router(risk_intelligence.router, tags=["risk-intelligence"])

# Routers para apps/web (montados bajo /api porque el rewrites de Next.js
# proxea /api/:path* hacia FastAPI)
app.include_router(risk.router, prefix="/api", tags=["risk"])
app.include_router(risk_v2.router, tags=["risk-v2"])
app.include_router(macro_finance.router, tags=["macro-finance"])
app.include_router(geopolitica.router, prefix="/api", tags=["geopolitica"])
app.include_router(actors.router, tags=["actors"])
