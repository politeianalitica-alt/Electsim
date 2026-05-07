"""Scheduler de ingestas periódicas."""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from dashboard.ingestion.cis_fetcher import fetch_latest_barometer
from dashboard.ingestion.ine_api import fetch_all_macro
from dashboard.ingestion.polls_scraper import scrape_electomania

logger = logging.getLogger(__name__)

_SOCIAL_QUERIES = [
    "politica España",
    "gobierno España",
    "elecciones España",
    "congreso diputados",
    "Pedro Sanchez",
]


def _run_rss() -> None:
    try:
        from dashboard.ingestion.media_fetcher import fetch_rss
        from dashboard.db import insertar_contenidos_mediaticos

        records = list(fetch_rss())
        if records:
            n = insertar_contenidos_mediaticos(records)
            logger.info("RSS ingest: %d guardados", n)
            try:
                from agents.scraper_ai import sync_records_to_local_ai
                sync_records_to_local_ai(records)
            except Exception as exc:
                logger.debug("ChromaDB sync RSS: %s", exc)
    except Exception as exc:
        logger.error("_run_rss failed: %s", exc)


def _run_social() -> None:
    try:
        from dashboard.ingestion.social_media import fetch_x_reciente
        from dashboard.db import insertar_contenidos_mediaticos

        records: list[dict] = []
        for q in _SOCIAL_QUERIES:
            try:
                records.extend(list(fetch_x_reciente(q, max_results=50)))
            except Exception as exc:
                logger.debug("X query '%s' failed: %s", q, exc)
        if records:
            n = insertar_contenidos_mediaticos(records)
            logger.info("Social ingest: %d guardados", n)
            try:
                from agents.scraper_ai import sync_records_to_local_ai
                sync_records_to_local_ai(records)
            except Exception as exc:
                logger.debug("ChromaDB sync social: %s", exc)
    except Exception as exc:
        logger.error("_run_social failed: %s", exc)


def _run_newsapi() -> None:
    try:
        from dashboard.ingestion.news_api import fetch_newsapi
        from dashboard.db import insertar_contenidos_mediaticos

        records = list(fetch_newsapi())
        if records:
            n = insertar_contenidos_mediaticos(records)
            logger.info("NewsAPI ingest: %d guardados", n)
            try:
                from agents.scraper_ai import sync_records_to_local_ai
                sync_records_to_local_ai(records)
            except Exception as exc:
                logger.debug("ChromaDB sync newsapi: %s", exc)
    except Exception as exc:
        logger.error("_run_newsapi failed: %s", exc)


def create_scheduler() -> BackgroundScheduler:
    """Crea scheduler con jobs diarios, mensuales y de medios."""
    sched = BackgroundScheduler()
    sched.add_job(fetch_latest_barometer, "cron", day=1, hour=6, id="cis_monthly")
    sched.add_job(fetch_all_macro, "cron", hour=6, id="macro_daily")
    sched.add_job(scrape_electomania, "cron", hour="*/6", id="polls_q6h")
    # Media ingestion jobs
    sched.add_job(_run_rss, "cron", hour="*/2", id="rss_q2h")
    sched.add_job(_run_social, "cron", hour="*/1", id="social_q1h")
    sched.add_job(_run_newsapi, "cron", hour="*/3", id="newsapi_q3h")
    return sched

