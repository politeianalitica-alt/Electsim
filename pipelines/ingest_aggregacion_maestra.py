"""
Pipeline maestro de agregación multi-fuente.

Orquesta:
  1. Backtest (actualiza pesos por casa si hay nuevas elecciones con accuracy).
  2. Nowcasting v2 bayesiano multi-fuente.
  3. Informe de cobertura y calidad del run.

Uso:
    python -m pipelines.ingest_aggregacion_maestra
"""

from __future__ import annotations

import json
import logging
import os

from sqlalchemy import create_engine

from models.estadisticos.nowcasting_v2 import ejecutar as ejecutar_nowcasting_v2
from validation.backtest_casas import ejecutar_backtest_completo

logger = logging.getLogger(__name__)


def _safe(fn, *args, **kwargs) -> dict:
    """Ejecuta un paso y devuelve diagnóstico aunque falle, para no romper el pipeline."""
    try:
        res = fn(*args, **kwargs)
        return res if isinstance(res, dict) else {"ok": True, "result": res}
    except Exception as e:
        logger.warning("%s falló: %s", getattr(fn, "__name__", "step"), e)
        return {"ok": False, "error": str(e)}


def run(tipo_eleccion: str = "generales", scrapear_externos: bool = True) -> dict:
    engine = create_engine(os.environ["DATABASE_URL"])
    resultado: dict = {}

    if scrapear_externos:
        logger.info("— Paso 0a — Wikipedia polls (histórico ampliado)")
        try:
            from etl.sources.wikipedia_polls import ingest_wikipedia_polls
            resultado["wikipedia_polls"] = _safe(ingest_wikipedia_polls, engine)
        except ImportError as e:
            resultado["wikipedia_polls"] = {"ok": False, "error": f"import: {e}"}

        logger.info("— Paso 0b — Eurostat")
        try:
            from etl.sources.eurostat_api import ingest_eurostat
            resultado["eurostat"] = _safe(ingest_eurostat, engine)
        except ImportError as e:
            resultado["eurostat"] = {"ok": False, "error": f"import: {e}"}

        logger.info("— Paso 0c — OCDE MEI")
        try:
            from etl.sources.ocde_mei import ingest_ocde_mei
            resultado["ocde"] = _safe(ingest_ocde_mei, engine)
        except ImportError as e:
            resultado["ocde"] = {"ok": False, "error": f"import: {e}"}

    logger.info("— Paso 1 — Backtest de casas encuestadoras")
    resultado["backtest"] = _safe(ejecutar_backtest_completo, engine, tipo=tipo_eleccion)

    logger.info("— Paso 2 — Nowcasting v2 multi-fuente")
    resultado["estimacion"] = _safe(ejecutar_nowcasting_v2, engine)

    return resultado


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
    res = run()
    print(json.dumps(res, indent=2, ensure_ascii=False, default=str))
