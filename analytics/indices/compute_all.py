"""
Compute All Indices — ElectSim España / Politeia
Calcula todos los índices Politeia y los persiste en indices_politeia.

Uso:
    python -m analytics.indices.compute_all
"""

from __future__ import annotations

import logging
import os
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

ALL_INDICES = [
    ("analytics.indices.ipps", "IPPS"),
    ("analytics.indices.iesp", "IESP"),
    ("analytics.indices.isma", "ISMA"),
    ("analytics.indices.iced", "ICED"),
    ("analytics.indices.icge", "ICGE"),
    ("analytics.indices.ibep", "IBEP"),
    ("analytics.indices.ivce", "IVCE"),
]


def run_all_indices(engine: Engine | None = None) -> dict:
    """Calcula todos los índices y devuelve resumen."""
    if engine is None:
        engine = create_engine(
            os.environ.get(
                "DATABASE_URL",
                "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
            ),
            pool_pre_ping=True,
        )

    resultados = {}
    for modulo_path, clase_nombre in ALL_INDICES:
        try:
            import importlib
            mod = importlib.import_module(modulo_path)
            clase = getattr(mod, clase_nombre)
            indice = clase(engine)
            result = indice.run()
            resultados[clase_nombre] = {
                "valor": result.valor,
                "semaforo": result.semaforo,
                "interpretacion": result.interpretacion[:100],
            }
            logger.info(
                "[%s] %s — %.1f (%s)",
                clase_nombre, result.nombre, result.valor, result.semaforo,
            )
        except Exception as exc:
            logger.error("[%s] Error: %s", clase_nombre, exc, exc_info=True)
            resultados[clase_nombre] = {"error": str(exc)}

    return resultados


def print_summary(resultados: dict) -> None:
    print("\n" + "=" * 60)
    print("  INDICES POLITEIA — RESUMEN")
    print("=" * 60)
    colores = {"VERDE": "\033[92m", "AMARILLO": "\033[93m", "ROJO": "\033[91m", "": "\033[0m"}
    RESET = "\033[0m"
    for codigo, res in resultados.items():
        if "error" in res:
            print(f"  {codigo:6s} ❌  Error: {res['error'][:60]}")
        else:
            color = colores.get(res.get("semaforo", ""), "")
            print(f"  {codigo:6s}  {color}{res['valor']:5.1f}  [{res['semaforo']:8s}]{RESET}  {res['interpretacion'][:70]}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s — %(message)s",
    )
    engine = create_engine(
        os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
        )
    )
    resultados = run_all_indices(engine)
    print_summary(resultados)
