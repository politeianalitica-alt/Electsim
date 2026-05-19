"""
Master Pipeline — orquestador central estilo Palantir Foundry AIP.

Encadena todos los steps del sistema en el orden correcto:
  1. Ingesta data lake (fuentes externas: BOE, GDELT, ACLED, INE, etc.)
  2. Geocodificacion y enriquecimiento legislativo
  3. Resolucion de entidades (persona_publica, organizacion, relaciones)
  4. Actualizacion de sentimiento mediatico
  5. Calculo de propensity scores por seccion censal
  6. Refresco de vistas materializadas y senales

Ciclos programados (APScheduler):
  - Lun-Vie 08:00  → run_full()   pipeline completo
  - Lun-Vie 14:00  → run_light()  actualizacion rapida (sentiment top-10 + senales)
  - Cada hora      → run_signals() solo senales criticas
  - Sab 10:00      → run_weekend_sentiment() sentimiento ampliado (top-100)
  - Dom 03:00      → run_propensity_retrain() retrain XGBoost si hay datos nuevos

Uso:
    python -m agents.pipelines.master_pipeline               # daemon
    python -m agents.pipelines.master_pipeline --full-now    # ejecuta run_full y sale
    python -m agents.pipelines.master_pipeline --light-now   # ejecuta run_light y sale
    python -m agents.pipelines.master_pipeline --signals-now # solo senales
"""
from __future__ import annotations

import argparse
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

log = logging.getLogger(__name__)

# ── Configuracion ─────────────────────────────────────────────────────────────

TZ = "Europe/Madrid"

FULL_HOUR         = int(os.getenv("MASTER_FULL_HOUR", "8"))
FULL_HOUR_ALT     = int(os.getenv("MASTER_FULL_HOUR_ALT", "20"))
LIGHT_HOUR        = int(os.getenv("MASTER_LIGHT_HOUR", "14"))
SIGNALS_INTERVAL  = int(os.getenv("MASTER_SIGNALS_INTERVAL_MIN", "60"))
SENTIMENT_TOP_N   = int(os.getenv("MASTER_SENTIMENT_TOP_N", "50"))
SENTIMENT_WEEKEND = int(os.getenv("MASTER_SENTIMENT_WEEKEND_TOP_N", "100"))

# ── Helpers ───────────────────────────────────────────────────────────────────


# P-INGESTA S1.1 · errores estructurales (bugs) vs operacionales (transitorios).
# Antes este wrapper absorbia AttributeError de master_pipeline.py:79 (run_priority
# no existia en DataLakeOrchestrator) sin que nadie se enterara — el daemon
# pasaba todo el tiempo sin hacer ingesta. Ahora estos errores se loguean como
# CRITICAL con stacktrace y la causa raiz es visible en cualquier observador.
_STRUCTURAL_ERRORS = (AttributeError, ImportError, ModuleNotFoundError, TypeError, NameError)


def _timed(step_name: str, fn: Callable, *args, **kwargs):
    """Ejecuta fn con logging de duracion y manejo de errores.

    Distingue entre errores estructurales (bug: metodo/clase/import no
    existe) que se loguean como CRITICAL con stacktrace, y errores
    operacionales (transitorios: red, BD, rate-limit) que se loguean
    como ERROR sin stacktrace para reducir ruido.
    """
    t0 = time.perf_counter()
    try:
        result = fn(*args, **kwargs)
        elapsed = round(time.perf_counter() - t0, 2)
        log.info("[master] step=%s status=ok elapsed_s=%.2f result=%s",
                 step_name, elapsed, result)
        return result
    except _STRUCTURAL_ERRORS as exc:
        elapsed = round(time.perf_counter() - t0, 2)
        log.critical(
            "[master] step=%s status=bug elapsed_s=%.2f error_type=%s error=%s",
            step_name, elapsed, type(exc).__name__, exc,
            exc_info=True,
        )
        return None
    except Exception as exc:
        elapsed = round(time.perf_counter() - t0, 2)
        log.error("[master] step=%s status=error elapsed_s=%.2f error=%s",
                  step_name, elapsed, exc)
        return None


# ── Steps individuales ────────────────────────────────────────────────────────


def step_datalake_priority() -> dict:
    """Ingesta rapida: BOE + GDELT + senales urgentes."""
    from etl.sources.data_lake_ingestors import DataLakeOrchestrator
    orch = DataLakeOrchestrator()
    return orch.run_priority()


def step_datalake_full() -> dict:
    """Ingesta completa: todas las fuentes de los 10 layers."""
    from etl.sources.data_lake_ingestors import DataLakeOrchestrator
    orch = DataLakeOrchestrator()
    return orch.run_daily()


def step_legislation() -> dict:
    """Ingesta y enriquecimiento de legislacion (BOE + EUR-Lex + CCAA)."""
    try:
        from dashboard.services.legislation_scraper import run_full_pipeline
        return run_full_pipeline() or {}
    except Exception as exc:
        log.warning("step_legislation fallback: %s", exc)
        return {}


def step_entity_resolution(max_queue: int = 500) -> dict:
    """Resuelve entidades pendientes de la cola entity_review_queue."""
    from agents.ontology.entity_resolver import EntityResolver
    import re
    import psycopg
    from psycopg.rows import dict_row
    from config.settings import get_settings

    settings = get_settings()
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", settings.database_url_raw)
    resolver = EntityResolver()
    stats = {"procesados": 0, "resueltos": 0, "errores": 0}

    try:
        with psycopg.connect(dsn, row_factory=dict_row) as conn:
            pending = conn.execute(
                """
                SELECT id, nombre_raw, tipo_entidad, fuente, metadata
                FROM entity_review_queue
                WHERE status = 'pending'
                ORDER BY created_at
                LIMIT %s
                """,
                (max_queue,),
            ).fetchall()
    except Exception as exc:
        log.warning("entity_review_queue no disponible: %s", exc)
        return stats

    for row in pending:
        try:
            nombre = row.get("nombre_raw", "")
            tipo   = row.get("tipo_entidad", "persona")
            if tipo == "persona":
                entity_id = resolver.resolve_persona(nombre, fuente=row.get("fuente", ""))
            else:
                entity_id = resolver.resolve_organizacion(nombre, fuente=row.get("fuente", ""))

            with psycopg.connect(dsn) as conn:
                conn.execute(
                    """
                    UPDATE entity_review_queue
                    SET status = %s, resolved_id = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    ("resolved" if entity_id else "unresolved", entity_id, row["id"]),
                )
            stats["resueltos" if entity_id else "procesados"] += 1
        except Exception as exc:
            log.debug("entity_resolution row error: %s", exc)
            stats["errores"] += 1

    stats["procesados"] = len(pending)
    return stats


def step_sentiment(top_n: int = SENTIMENT_TOP_N) -> dict:
    """Actualiza sentimiento mediatico de las N personas mas influyentes."""
    from agents.intelligence.sentiment_tracker import SentimentTracker
    tracker = SentimentTracker()
    return tracker.run_full_update(max_personas=top_n)


def step_propensity_predict() -> dict:
    """Calcula propensity scores para todas las secciones censales."""
    from agents.intelligence.propensity_engine import PropensityEngine
    engine = PropensityEngine()
    engine._load_models()
    if not engine._models:
        log.info("Sin modelos propensity entrenados — omitiendo predict")
        return {"omitido": True}
    n = engine.predict_all_sections()
    return {"secciones_actualizadas": n}


def step_propensity_retrain() -> dict:
    """Reentrena los modelos XGBoost con los datos mas recientes."""
    from agents.intelligence.propensity_engine import PropensityEngine
    engine = PropensityEngine()
    metrics = engine.train()
    if not metrics:
        return {"omitido": True, "razon": "sin datos suficientes o dependencias"}
    return {"partidos": list(metrics.keys()), "metricas": metrics}


def step_strategic_news(limit: int = 500) -> dict:
    """
    Fase 1 + Fase 2 del Strategic News Intelligence Pipeline.
    Filtra staging por relevancia y extrae inteligencia estructurada con Ollama.
    """
    from agents.intelligence.strategic_news_pipeline import StrategicNewsPipeline
    pipeline = StrategicNewsPipeline()
    return pipeline.run(limit=limit)


def step_refresh_views() -> dict:
    """Refresca vistas materializadas y compacta senales antiguas."""
    import re
    import psycopg
    from config.settings import get_settings

    settings = get_settings()
    dsn = re.sub(r"postgresql\+\w+://", "postgresql://", settings.database_url_raw)
    ops: list[str] = []

    with psycopg.connect(dsn) as conn:
        # Desactivar senales antiguas (mas de 72h)
        conn.execute(
            """
            UPDATE signal_politeia
            SET activa = FALSE
            WHERE created_at < NOW() - INTERVAL '72 hours'
              AND activa = TRUE
            """
        )
        ops.append("signals_deactivated")

        # Refrescar vista de sparklines si existe
        try:
            conn.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY sentiment_sparklines_v")
            ops.append("sentiment_sparklines_v")
        except Exception:
            pass

    return {"ops": ops}


# ── Pipelines compuestos ──────────────────────────────────────────────────────


def run_full() -> dict:
    """
    Pipeline completo — ejecuta los 6 steps en orden.
    Equivalente al batch pipeline de Palantir Foundry (full refresh).
    """
    log.info("[master] run_full START ts=%s", datetime.now(timezone.utc).isoformat())
    results: dict = {}

    results["datalake"]          = _timed("datalake_full",      step_datalake_full)
    results["legislation"]       = _timed("legislation",        step_legislation)
    results["strategic_news"]    = _timed("strategic_news",     step_strategic_news)
    results["entity_resolution"] = _timed("entity_resolution",  step_entity_resolution)
    results["sentiment"]         = _timed("sentiment",          step_sentiment, SENTIMENT_TOP_N)
    results["propensity"]        = _timed("propensity_predict", step_propensity_predict)
    results["refresh_views"]     = _timed("refresh_views",      step_refresh_views)

    log.info("[master] run_full END results=%s", results)
    return results


def run_light() -> dict:
    """
    Actualizacion rapida — sentiment top-10 + senales + vistas.
    Equivalente al incremental refresh de Foundry.
    """
    log.info("[master] run_light START")
    results: dict = {}

    results["datalake_priority"] = _timed("datalake_priority", step_datalake_priority)
    results["strategic_news"]    = _timed("strategic_news",    step_strategic_news, 200)
    results["sentiment"]         = _timed("sentiment_light",   step_sentiment, 10)
    results["refresh_views"]     = _timed("refresh_views",     step_refresh_views)

    log.info("[master] run_light END")
    return results


def run_signals() -> dict:
    """Solo ingesta de prioridad + refresco de vistas. Para ciclo horario."""
    log.info("[master] run_signals START")
    results: dict = {}

    results["datalake_priority"] = _timed("datalake_priority", step_datalake_priority)
    results["refresh_views"]     = _timed("refresh_views",     step_refresh_views)

    log.info("[master] run_signals END")
    return results


def run_weekend_sentiment() -> dict:
    """Sentimiento ampliado para sabado — top-100 personas."""
    log.info("[master] run_weekend_sentiment START")
    results: dict = {}

    results["datalake_full"] = _timed("datalake_full",          step_datalake_full)
    results["sentiment"]     = _timed("sentiment_weekend",      step_sentiment, SENTIMENT_WEEKEND)
    results["refresh_views"] = _timed("refresh_views",          step_refresh_views)

    log.info("[master] run_weekend_sentiment END")
    return results


def run_propensity_retrain() -> dict:
    """Retrain semanal de los modelos XGBoost (domingo madrugada)."""
    log.info("[master] run_propensity_retrain START")
    results: dict = {}

    results["retrain"]    = _timed("propensity_retrain",  step_propensity_retrain)
    results["predict"]    = _timed("propensity_predict",  step_propensity_predict)
    results["views"]      = _timed("refresh_views",       step_refresh_views)

    log.info("[master] run_propensity_retrain END")
    return results


# ── Daemon ────────────────────────────────────────────────────────────────────


def _job_full():
    try:
        run_full()
    except Exception as exc:
        log.error("[master] job_full exception: %s", exc)


def _job_light():
    try:
        run_light()
    except Exception as exc:
        log.error("[master] job_light exception: %s", exc)


def _job_signals():
    try:
        run_signals()
    except Exception as exc:
        log.error("[master] job_signals exception: %s", exc)


def _job_weekend_sentiment():
    try:
        run_weekend_sentiment()
    except Exception as exc:
        log.error("[master] job_weekend_sentiment exception: %s", exc)


def _job_propensity_retrain():
    try:
        run_propensity_retrain()
    except Exception as exc:
        log.error("[master] job_propensity_retrain exception: %s", exc)


def _job_strategic_news():
    """Pipeline de 15 minutos: filtrado + extraccion de inteligencia de noticias."""
    try:
        from agents.intelligence.strategic_news_pipeline import StrategicNewsPipeline
        StrategicNewsPipeline().run(limit=500)
    except Exception as exc:
        log.error("[master] job_strategic_news exception: %s", exc)


def run_daemon() -> None:
    scheduler = BackgroundScheduler(timezone=TZ)

    # Lun-Vie 08:00 y 20:00 — full pipeline
    scheduler.add_job(
        _job_full,
        trigger=CronTrigger(day_of_week="mon-fri", hour=FULL_HOUR, minute=0, timezone=TZ),
        id="master_full_morning",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    scheduler.add_job(
        _job_full,
        trigger=CronTrigger(day_of_week="mon-fri", hour=FULL_HOUR_ALT, minute=0, timezone=TZ),
        id="master_full_evening",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )

    # Lun-Vie 14:00 — light update
    scheduler.add_job(
        _job_light,
        trigger=CronTrigger(day_of_week="mon-fri", hour=LIGHT_HOUR, minute=0, timezone=TZ),
        id="master_light",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=180,
    )

    # Cada 15 minutos — strategic news pipeline (filtrado + extraccion con Ollama)
    scheduler.add_job(
        _job_strategic_news,
        trigger=IntervalTrigger(minutes=15, timezone=TZ),
        id="master_strategic_news",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=120,
    )

    # Cada hora — solo senales
    scheduler.add_job(
        _job_signals,
        trigger=IntervalTrigger(minutes=SIGNALS_INTERVAL, timezone=TZ),
        id="master_signals",
        max_instances=1,
        coalesce=True,
    )

    # Sabado 10:00 — sentimiento ampliado
    scheduler.add_job(
        _job_weekend_sentiment,
        trigger=CronTrigger(day_of_week="sat", hour=10, minute=0, timezone=TZ),
        id="master_weekend_sentiment",
        max_instances=1,
        coalesce=True,
    )

    # Domingo 03:00 — retrain XGBoost
    scheduler.add_job(
        _job_propensity_retrain,
        trigger=CronTrigger(day_of_week="sun", hour=3, minute=0, timezone=TZ),
        id="master_propensity_retrain",
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()
    log.info(
        "[master] daemon iniciado — jobs: %s",
        [j.id for j in scheduler.get_jobs()],
    )

    stop_event = False

    def _handle_stop(sig, frame):
        nonlocal stop_event
        log.info("[master] signal %s recibido — apagando scheduler", sig)
        scheduler.shutdown(wait=False)
        stop_event = True

    signal.signal(signal.SIGTERM, _handle_stop)
    signal.signal(signal.SIGINT, _handle_stop)

    while not stop_event:
        time.sleep(5)

    log.info("[master] daemon finalizado")


# ── CLI ───────────────────────────────────────────────────────────────────────


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Master Pipeline — ElectSim")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--full-now",     action="store_true", help="Ejecuta run_full() y sale")
    group.add_argument("--light-now",    action="store_true", help="Ejecuta run_light() y sale")
    group.add_argument("--signals-now",  action="store_true", help="Ejecuta run_signals() y sale")
    group.add_argument("--retrain-now",  action="store_true", help="Ejecuta retrain XGBoost y sale")
    args = parser.parse_args()

    if args.full_now:
        run_full()
    elif args.light_now:
        run_light()
    elif args.signals_now:
        run_signals()
    elif args.retrain_now:
        run_propensity_retrain()
    else:
        run_daemon()


if __name__ == "__main__":
    main()
