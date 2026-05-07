"""Scheduler de ingestas periódicas."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from dashboard.ingestion.cis_fetcher import fetch_latest_barometer
from dashboard.ingestion.ine_api import fetch_all_macro
from dashboard.ingestion.polls_scraper import scrape_electomania

logger = logging.getLogger(__name__)


def create_scheduler() -> BackgroundScheduler:
    """Crea scheduler con jobs diarios y mensuales."""
    sched = BackgroundScheduler()
    sched.add_job(fetch_latest_barometer, "cron", day=1, hour=6, id="cis_monthly")
    sched.add_job(fetch_all_macro, "cron", hour=6, id="macro_daily")
    sched.add_job(scrape_electomania, "cron", hour="*/6", id="polls_q6h")
    return sched

