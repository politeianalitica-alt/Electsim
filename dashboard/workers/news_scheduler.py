"""Scheduler APScheduler para ingesta periódica de 350 fuentes de noticias.

Ciclos:
- Cada 30 min → fuentes prioritarias (España + Europa, ~150 fuentes)
- Cada 2 horas → ingesta completa de las 350 fuentes

Uso:
    python -m dashboard.workers.news_scheduler          # start daemon
    python -m dashboard.workers.news_scheduler --once   # una vuelta y sale
    python -m dashboard.workers.news_scheduler --priority-only  # solo prioritarias
"""
from __future__ import annotations

import argparse
import os
import signal
import sys
import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from etl.logger import get_logger
from dashboard.services.news_ingestion import (
    init_db,
    ingest_all_sources,
    ingest_priority,
)

log = get_logger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
USE_OLLAMA = os.getenv("NEWS_OLLAMA_ENABLED", "true").lower() == "true"
PRIORITY_INTERVAL_MIN = int(os.getenv("NEWS_PRIORITY_INTERVAL_MIN", "30"))
FULL_INTERVAL_HOURS = int(os.getenv("NEWS_FULL_INTERVAL_HOURS", "2"))

# ── Job callbacks ─────────────────────────────────────────────────────────────
def job_priority_ingestion() -> None:
    """Ejecuta ingesta de fuentes prioritarias (España + Europa)."""
    start = time.monotonic()
    log.info("=== PRIORITY INGESTION START ===")
    try:
        stats = ingest_priority(use_ollama=USE_OLLAMA)
        elapsed = time.monotonic() - start
        log.info(
            f"=== PRIORITY INGESTION DONE in {elapsed:.1f}s | "
            f"fetched={stats['fetched']} inserted={stats['inserted']} "
            f"skipped={stats['skipped']} errors={stats['errors']} ==="
        )
    except Exception as exc:
        log.error(f"Priority ingestion failed: {exc}")


def job_full_ingestion() -> None:
    """Ejecuta ingesta completa de las 350 fuentes."""
    start = time.monotonic()
    log.info("=== FULL INGESTION START (350 sources) ===")
    try:
        stats = ingest_all_sources(use_ollama=USE_OLLAMA, delay_between_sources=0.5)
        elapsed = time.monotonic() - start
        log.info(
            f"=== FULL INGESTION DONE in {elapsed:.1f}s | "
            f"fetched={stats['fetched']} inserted={stats['inserted']} "
            f"skipped={stats['skipped']} errors={stats['errors']} ==="
        )
    except Exception as exc:
        log.error(f"Full ingestion failed: {exc}")


# ── Scheduler ─────────────────────────────────────────────────────────────────
def build_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")

    # Prioridad: cada 30 minutos
    scheduler.add_job(
        job_priority_ingestion,
        trigger=IntervalTrigger(minutes=PRIORITY_INTERVAL_MIN),
        id="priority_ingestion",
        name="Priority Ingestion (ES+EU)",
        max_instances=1,
        coalesce=True,
        next_run_time=datetime.now(tz=timezone.utc),  # ejecuta al arrancar
    )

    # Completo: cada 2 horas
    scheduler.add_job(
        job_full_ingestion,
        trigger=IntervalTrigger(hours=FULL_INTERVAL_HOURS),
        id="full_ingestion",
        name="Full Ingestion (350 sources)",
        max_instances=1,
        coalesce=True,
    )

    return scheduler


def run_daemon(priority_only: bool = False) -> None:
    """Arranca el scheduler como daemon hasta SIGINT/SIGTERM."""
    log.info("Initializing DB schema...")
    init_db()

    if priority_only:
        log.info("Running in priority-only mode")
        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            job_priority_ingestion,
            trigger=IntervalTrigger(minutes=PRIORITY_INTERVAL_MIN),
            id="priority_ingestion",
            name="Priority Ingestion (ES+EU)",
            max_instances=1,
            coalesce=True,
            next_run_time=datetime.now(tz=timezone.utc),
        )
    else:
        scheduler = build_scheduler()

    scheduler.start()
    log.info(
        f"Scheduler started. Priority every {PRIORITY_INTERVAL_MIN}min, "
        f"Full every {FULL_INTERVAL_HOURS}h. Ollama={'on' if USE_OLLAMA else 'off'}."
    )

    # Graceful shutdown
    stop_signal = {"received": False}

    def handle_signal(signum, frame):
        log.info(f"Signal {signum} received, shutting down...")
        stop_signal["received"] = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    try:
        while not stop_signal["received"]:
            time.sleep(5)
    finally:
        scheduler.shutdown(wait=False)
        log.info("Scheduler stopped.")


def run_once(priority_only: bool = False) -> None:
    """Una sola pasada de ingesta y sale."""
    init_db()
    if priority_only:
        job_priority_ingestion()
    else:
        job_full_ingestion()


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ElectSim News Scheduler")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--priority-only", action="store_true", help="Only priority sources")
    parser.add_argument("--no-ollama", action="store_true", help="Disable Ollama analysis")
    args = parser.parse_args()

    if args.no_ollama:
        USE_OLLAMA = False

    if args.once:
        run_once(priority_only=args.priority_only)
    else:
        run_daemon(priority_only=args.priority_only)
