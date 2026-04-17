"""
Orquestador de todos los scrapers — ElectSim España
Ejecuta en secuencia: RSS noticias → INE API → BDE → Congreso → Índices Politeia

Uso:
    python -m etl.run_all_scrapers
    python etl/run_all_scrapers.py
"""

from __future__ import annotations

import logging
import os
import time

from sqlalchemy import create_engine

logger = logging.getLogger(__name__)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )

    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    engine = create_engine(db_url, pool_pre_ping=True)

    resultados = {}

    # 1. RSS noticias
    try:
        from etl.sources.rss_noticias import run_scraper
        logger.info("=== RSS Noticias ===")
        resultados["rss"] = run_scraper(engine)
        time.sleep(2)
    except Exception as exc:
        logger.error("RSS error: %s", exc)
        resultados["rss"] = {"error": str(exc)}

    # 2. INE API
    try:
        from etl.sources.ine_api_v2 import run_ine
        logger.info("=== INE API ===")
        resultados["ine"] = run_ine(engine)
        time.sleep(2)
    except Exception as exc:
        logger.error("INE error: %s", exc)
        resultados["ine"] = {"error": str(exc)}

    # 3. BDE API
    try:
        from etl.sources.bde_api_v2 import run_bde
        logger.info("=== Banco de España ===")
        resultados["bde"] = run_bde(engine)
        time.sleep(2)
    except Exception as exc:
        logger.error("BDE error: %s", exc)
        resultados["bde"] = {"error": str(exc)}

    # 4. Congreso
    try:
        from etl.sources.congreso_api import run_congreso
        logger.info("=== Congreso de los Diputados ===")
        resultados["congreso"] = run_congreso(engine)
        time.sleep(2)
    except Exception as exc:
        logger.error("Congreso error: %s", exc)
        resultados["congreso"] = {"error": str(exc)}

    # 5. CIS + observatorios regionales
    try:
        from etl.sources.cis_barometro_v2 import main as run_cis_obs
        logger.info("=== CIS + Observatorios regionales ===")
        run_cis_obs()
        resultados["cis_observatorios"] = {"ok": True}
        time.sleep(2)
    except Exception as exc:
        logger.error("CIS/observatorios error: %s", exc)
        resultados["cis_observatorios"] = {"error": str(exc)}

    # 6. Agenda/comunicados oficiales (multifuente)
    try:
        from etl.sources.agenda_oficial_api import run_agenda_ingest
        logger.info("=== Agenda oficial multifuente ===")
        resultados["agenda_oficial"] = run_agenda_ingest(engine)
        time.sleep(1)
    except Exception as exc:
        logger.error("Agenda oficial error: %s", exc)
        resultados["agenda_oficial"] = {"error": str(exc)}

    # 7. Índices Politeia
    try:
        from analytics.indices.compute_all import run_all_indices
        logger.info("=== Indices Politeia ===")
        resultados["indices"] = run_all_indices(engine)
    except Exception as exc:
        logger.error("Indices error: %s", exc)
        resultados["indices"] = {"error": str(exc)}

    # 8. QA checks ETL/reporting
    try:
        from etl.quality.election_reporting_checks import run_checks
        logger.info("=== QA election reporting checks ===")
        qa = run_checks(engine)
        resultados["qa_checks"] = [{"check": c.check, "status": c.status, "detail": c.detail} for c in qa]
    except Exception as exc:
        logger.error("QA checks error: %s", exc)
        resultados["qa_checks"] = {"error": str(exc)}

    logger.info("=== COMPLETADO ===")
    for modulo, res in resultados.items():
        logger.info("  %s: %s", modulo, res)

    return resultados


if __name__ == "__main__":
    main()
