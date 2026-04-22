"""Orquestador de ingesta simplificado (sin dependencia de catálogo dinámico).

Mantiene compatibilidad con los wrappers existentes:
- pipelines/ingest_electoral.py
- pipelines/ingest_economico.py
- pipelines/ingest_sectorial.py
- pipelines/ingest_social.py
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from sqlalchemy import create_engine

logger = logging.getLogger(__name__)



def _engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL no definida")
    return create_engine(url, pool_pre_ping=True)



def ingest_electoral() -> dict[str, Any]:
    """Ingesta electoral/institucional base."""
    engine = _engine()
    out: dict[str, Any] = {}

    try:
        from etl.sources.congreso_api import run_congreso

        out["congreso"] = run_congreso(engine)
    except Exception as exc:
        logger.exception("Fallo ingest_electoral.congreso")
        out["congreso_error"] = str(exc)

    try:
        from etl.sources.agenda_oficial_api import run_agenda_ingest

        out["agenda_oficial"] = run_agenda_ingest(engine)
    except Exception as exc:
        logger.exception("Fallo ingest_electoral.agenda")
        out["agenda_error"] = str(exc)

    return out



def ingest_macroeconomia() -> dict[str, Any]:
    """Ingesta macroeconómica desde INE + BdE."""
    engine = _engine()
    out: dict[str, Any] = {}

    try:
        from etl.sources.ine_api_v2 import run_ine

        out["ine"] = run_ine(engine)
    except Exception as exc:
        logger.exception("Fallo ingest_macroeconomia.ine")
        out["ine_error"] = str(exc)

    try:
        from etl.sources.bde_api_v2 import run_bde

        out["bde"] = run_bde(engine)
    except Exception as exc:
        logger.exception("Fallo ingest_macroeconomia.bde")
        out["bde_error"] = str(exc)

    return out



def ingest_sectores() -> dict[str, Any]:
    """Placeholder explícito para capa sectorial (no falla)."""
    return {"status": "pending", "detail": "Ingesta sectorial específica no implementada en este entrypoint"}



def ingest_cis_barometros() -> dict[str, Any]:
    """Ingesta CIS/observatorios."""
    try:
        from etl.sources.cis_barometro_v2 import main as run_cis_obs

        run_cis_obs()
        return {"status": "ok"}
    except Exception as exc:
        logger.exception("Fallo ingest_cis_barometros")
        return {"status": "error", "detail": str(exc)}



def ingest_ine_demografia() -> dict[str, Any]:
    """Alias de compatibilidad para wrappers sociales."""
    return ingest_macroeconomia()



def ingest_redes_sociales() -> dict[str, Any]:
    """Ingesta simple de prensa/RSS como fallback social-compatible."""
    try:
        from etl.sources.rss_noticias import ingest as rss_ingest

        return rss_ingest()
    except Exception as exc:
        logger.exception("Fallo ingest_redes_sociales")
        return {"status": "error", "detail": str(exc)}


def ingest_all() -> list[dict[str, Any]]:
    pasos = [
        ("electoral", ingest_electoral),
        ("macroeconomia", ingest_macroeconomia),
        ("cis", ingest_cis_barometros),
        ("redes", ingest_redes_sociales),
        ("sectores", ingest_sectores),
    ]

    resultados: list[dict[str, Any]] = []
    for nombre, fn in pasos:
        try:
            resultados.append({"step": nombre, "ok": True, "result": fn()})
        except Exception as exc:
            logger.exception("Fallo en paso %s", nombre)
            resultados.append({"step": nombre, "ok": False, "error": str(exc)})

    return resultados


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
    print(json.dumps(ingest_all(), ensure_ascii=False, indent=2, default=str))
