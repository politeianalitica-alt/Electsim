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
import sys
from pathlib import Path

from sqlalchemy import create_engine

logger = logging.getLogger(__name__)

SCRAPERS_CRITICOS = {"rss", "ine", "bde", "congreso"}


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )

    root = Path(__file__).resolve().parents[1]
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.critical(
            "DATABASE_URL no está definida. Asegúrate de cargar .env o pasarla por entorno."
        )
        raise SystemExit(1)
    engine = create_engine(db_url, pool_pre_ping=True)

    resultados = {}

    # 1. RSS noticias
    try:
        from etl.sources.rss_noticias import ingest as rss_ingest
        logger.info("=== RSS Noticias ===")
        resultados["rss"] = {"ok": True, "data": rss_ingest()}
        time.sleep(2)
    except Exception as exc:
        logger.error("RSS error: %s", exc)
        resultados["rss"] = {"ok": False, "error": str(exc)}

    # 2. INE API
    try:
        from etl.sources.ine_api_v2 import run_ine
        logger.info("=== INE API ===")
        resultados["ine"] = {"ok": True, "data": run_ine(engine)}
        time.sleep(2)
    except Exception as exc:
        logger.error("INE error: %s", exc)
        resultados["ine"] = {"ok": False, "error": str(exc)}

    # 3. BDE API
    try:
        from etl.sources.bde_api_v2 import run_bde
        logger.info("=== Banco de España ===")
        resultados["bde"] = {"ok": True, "data": run_bde(engine)}
        time.sleep(2)
    except Exception as exc:
        logger.error("BDE error: %s", exc)
        resultados["bde"] = {"ok": False, "error": str(exc)}

    # 4. Congreso
    try:
        from etl.sources.congreso_api import run_congreso
        logger.info("=== Congreso de los Diputados ===")
        resultados["congreso"] = {"ok": True, "data": run_congreso(engine)}
        time.sleep(2)
    except Exception as exc:
        logger.error("Congreso error: %s", exc)
        resultados["congreso"] = {"ok": False, "error": str(exc)}

    # 5. CIS + observatorios regionales
    try:
        from etl.sources.cis_barometro_v2 import main as run_cis_obs
        logger.info("=== CIS + Observatorios regionales ===")
        run_cis_obs()
        resultados["cis_observatorios"] = {"ok": True}
        time.sleep(2)
    except Exception as exc:
        logger.error("CIS/observatorios error: %s", exc)
        resultados["cis_observatorios"] = {"ok": False, "error": str(exc)}

    # 6. Agenda/comunicados oficiales (multifuente)
    try:
        from etl.sources.agenda_oficial_api import run_agenda_ingest
        logger.info("=== Agenda oficial multifuente ===")
        resultados["agenda_oficial"] = {"ok": True, "data": run_agenda_ingest(engine)}
        time.sleep(1)
    except Exception as exc:
        logger.error("Agenda oficial error: %s", exc)
        resultados["agenda_oficial"] = {"ok": False, "error": str(exc)}

    # 7. Institucional — BOE
    try:
        from etl.institucional.boe_rss import fetch_boe_items, upsert_boe_publications
        logger.info("=== BOE RSS ===")
        items = fetch_boe_items(limit=40)
        with engine.connect() as conn:
            n = upsert_boe_publications(items, conn)
        resultados["boe"] = {"ok": True, "parsed": len(items), "new": n}
        time.sleep(1)
    except Exception as exc:
        logger.error("BOE error: %s", exc)
        resultados["boe"] = {"ok": False, "error": str(exc)}

    # 8. Institucional — Moncloa agenda
    try:
        from etl.institucional.moncloa_agenda import fetch_moncloa_agenda, upsert_agenda_items
        logger.info("=== Moncloa Agenda ===")
        items = fetch_moncloa_agenda()
        with engine.connect() as conn:
            n = upsert_agenda_items(items, conn)
        resultados["moncloa"] = {"ok": True, "parsed": len(items), "new": n}
        time.sleep(1)
    except Exception as exc:
        logger.error("Moncloa error: %s", exc)
        resultados["moncloa"] = {"ok": False, "error": str(exc)}

    # 9. Índices Politeia
    try:
        from analytics.indices.compute_all import run_all_indices
        logger.info("=== Indices Politeia ===")
        resultados["indices"] = {"ok": True, "data": run_all_indices(engine)}
    except Exception as exc:
        logger.error("Indices error: %s", exc)
        resultados["indices"] = {"ok": False, "error": str(exc)}

    # 10. QA checks ETL/reporting
    try:
        from etl.quality.election_reporting_checks import run_checks
        logger.info("=== QA election reporting checks ===")
        qa = run_checks(engine)
        resultados["qa_checks"] = {
            "ok": True,
            "data": [{"check": c.check, "status": c.status, "detail": c.detail} for c in qa],
        }
    except Exception as exc:
        logger.error("QA checks error: %s", exc)
        resultados["qa_checks"] = {"ok": False, "error": str(exc)}

    logger.info("=== COMPLETADO ===")
    for modulo, res in resultados.items():
        logger.info("  %s: %s", modulo, res)

    hay_fallo_critico = any(
        not resultados.get(nombre, {}).get("ok", False)
        for nombre in SCRAPERS_CRITICOS
    )
    return {"ok": not hay_fallo_critico, "detalle": resultados}


if __name__ == "__main__":
    main()
