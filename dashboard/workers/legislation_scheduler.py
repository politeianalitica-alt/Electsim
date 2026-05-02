"""Scheduler APScheduler para ingesta periódica de legislación multinivel.

Ciclos:
- Cada 30 min   → BOE prioridad (sumario del día)
- 07:30 y 19:30 → pipeline completo (EU + Nacional + 17 CCAA)
- Domingos 03:00 → backfill 7 días atrás

Uso:
    python -m dashboard.workers.legislation_scheduler          # daemon
    python -m dashboard.workers.legislation_scheduler --once   # una vuelta y sale
    python -m dashboard.workers.legislation_scheduler --priority-only
    python -m dashboard.workers.legislation_scheduler --full-now
"""
from __future__ import annotations

import argparse
import os
import signal
import sys
import time
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from etl.logger import get_logger
from dashboard.services.legislation_scraper import (
    run_priority_pipeline,
    run_full_pipeline,
)

log = get_logger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
PRIORITY_INTERVAL_MIN = int(os.getenv("LEG_PRIORITY_INTERVAL_MIN", "30"))
FULL_HOUR_MORNING = int(os.getenv("LEG_FULL_HOUR_MORNING", "7"))
FULL_HOUR_EVENING = int(os.getenv("LEG_FULL_HOUR_EVENING", "19"))
FULL_MIN = int(os.getenv("LEG_FULL_MIN", "30"))
BACKFILL_DAYS = int(os.getenv("LEG_BACKFILL_DAYS", "7"))
TZ = os.getenv("TZ", "Europe/Madrid")


# ── Job callbacks ─────────────────────────────────────────────────────────────

def job_priority() -> None:
    """Ingesta rápida: solo BOE del día en curso."""
    t0 = time.monotonic()
    log.info("legislation_scheduler.priority.start")
    try:
        stats = run_priority_pipeline()
        elapsed = time.monotonic() - t0
        log.info(
            "legislation_scheduler.priority.done",
            extra={"stats": stats, "elapsed_s": round(elapsed, 1)},
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("legislation_scheduler.priority.error", extra={"error": str(exc)})


def job_full(days_back: int = 2) -> None:
    """Pipeline completo: EU + Nacional + 17 CCAA."""
    t0 = time.monotonic()
    log.info("legislation_scheduler.full.start", extra={"days_back": days_back})
    try:
        stats = run_full_pipeline(days_back=days_back)
        elapsed = time.monotonic() - t0
        log.info(
            "legislation_scheduler.full.done",
            extra={"stats": stats, "elapsed_s": round(elapsed, 1)},
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("legislation_scheduler.full.error", extra={"error": str(exc)})


def job_weekly_backfill() -> None:
    """Backfill semanal profundo."""
    log.info("legislation_scheduler.backfill.start", extra={"days_back": BACKFILL_DAYS})
    job_full(days_back=BACKFILL_DAYS)


# ── Scheduler setup ───────────────────────────────────────────────────────────

def build_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone=TZ)

    # Prioridad BOE cada 30 minutos
    scheduler.add_job(
        job_priority,
        trigger=IntervalTrigger(minutes=PRIORITY_INTERVAL_MIN, timezone=TZ),
        id="leg_priority",
        name="BOE prioridad",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=120,
    )

    # Pipeline completo mañana (07:30)
    scheduler.add_job(
        job_full,
        trigger=CronTrigger(hour=FULL_HOUR_MORNING, minute=FULL_MIN, timezone=TZ),
        id="leg_full_morning",
        name="Pipeline completo mañana",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    # Pipeline completo tarde (19:30)
    scheduler.add_job(
        job_full,
        trigger=CronTrigger(hour=FULL_HOUR_EVENING, minute=FULL_MIN, timezone=TZ),
        id="leg_full_evening",
        name="Pipeline completo tarde",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=600,
    )

    # Backfill semanal — domingos a las 03:00
    scheduler.add_job(
        job_weekly_backfill,
        trigger=CronTrigger(day_of_week="sun", hour=3, minute=0, timezone=TZ),
        id="leg_backfill",
        name="Backfill semanal",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )

    return scheduler


def _handle_signal(sig: int, _frame: object) -> None:
    log.info("legislation_scheduler.signal_received", extra={"signal": sig})
    sys.exit(0)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Legislation scheduler daemon")
    parser.add_argument("--once", action="store_true", help="Ejecutar pipeline completo una vez y salir")
    parser.add_argument("--priority-only", action="store_true", help="Ejecutar solo BOE prioridad y salir")
    parser.add_argument("--full-now", action="store_true", help="Ejecutar pipeline completo ahora y salir")
    parser.add_argument("--backfill", action="store_true", help="Ejecutar backfill semanal y salir")
    args = parser.parse_args()

    if args.priority_only:
        log.info("legislation_scheduler.cli.priority_only")
        job_priority()
        return

    if args.full_now or args.once:
        log.info("legislation_scheduler.cli.full_now")
        job_full(days_back=2)
        return

    if args.backfill:
        log.info("legislation_scheduler.cli.backfill")
        job_weekly_backfill()
        return

    # Daemon mode
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    log.info(
        "legislation_scheduler.daemon.start",
        extra={
            "priority_interval_min": PRIORITY_INTERVAL_MIN,
            "full_morning": f"{FULL_HOUR_MORNING:02d}:{FULL_MIN:02d}",
            "full_evening": f"{FULL_HOUR_EVENING:02d}:{FULL_MIN:02d}",
            "tz": TZ,
        },
    )

    # Ejecutar prioridad al arrancar para tener datos frescos de inmediato
    job_priority()

    scheduler = build_scheduler()
    scheduler.start()
    log.info("legislation_scheduler.daemon.running")

    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        log.info("legislation_scheduler.daemon.stopping")
        scheduler.shutdown(wait=False)
        log.info("legislation_scheduler.daemon.stopped")


if __name__ == "__main__":
    main()
