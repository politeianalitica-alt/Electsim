"""
run_perfiles.py
Orquestador para dejar operativo el sistema de perfiles.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from alembic import command
from alembic.config import Config
import psycopg2

from etl.logger import get_logger

logger = get_logger(__name__)


def _normalize_pg_url(url: str) -> str:
    if not url:
        return url
    if url.startswith("postgresql+psycopg://"):
        return "postgresql://" + url[len("postgresql+psycopg://") :]
    if url.startswith("postgresql+psycopg2://"):
        return "postgresql://" + url[len("postgresql+psycopg2://") :]
    return url


def upgrade_database_to_head() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    alembic_cfg = Config(str(repo_root / "alembic.ini"))
    database_url = os.environ.get("DATABASE_URL")
    if database_url:
        alembic_cfg.set_main_option("sqlalchemy.url", database_url)
    command.upgrade(alembic_cfg, "head")
    logger.info("Migraciones Alembic aplicadas hasta head.")


def main() -> None:
    db_url = _normalize_pg_url(os.environ.get("DATABASE_URL", ""))
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    upgrade_database_to_head()
    conn = psycopg2.connect(db_url)
    try:
        from etl.models.diagnostico_microdatos import chequear_sistema

        estado = chequear_sistema(conn)
        logger.info("Estado del sistema: %s", estado.get("estado_general"))
        for rec in estado.get("recomendaciones", []):
            logger.warning("→ %s", rec)

        tiene_microdatos = bool(estado.get("microdatos_encuesta_existe")) and int(
            estado.get("microdatos_encuesta_filas") or 0
        ) > 0

        if tiene_microdatos:
            logger.info("Microdatos detectados. Ejecutando segmentacion_microdatos...")
            from etl.models.segmentacion_microdatos import run_todos_los_perfiles

            run_todos_los_perfiles(conn)
        else:
            logger.warning("Sin microdatos. Ejecutando fallback sintético calibrado...")
            from etl.models.poblar_perfiles_sinteticos import poblar_todos

            poblar_todos(conn)

        estado_post = chequear_sistema(conn)
        # Rescate: si la segmentación empírica no deja tablas satélite útiles,
        # rellenamos con sintético calibrado para que el dashboard no quede vacío.
        if int(estado_post.get("perfil_voto_filas") or 0) < 30 or int(
            estado_post.get("perfil_problemas_filas") or 0
        ) < 20:
            logger.warning(
                "Salida empírica insuficiente (perfil_voto=%s, perfil_problemas=%s). "
                "Aplicando fallback sintético calibrado...",
                estado_post.get("perfil_voto_filas", 0),
                estado_post.get("perfil_problemas_filas", 0),
            )
            from etl.models.poblar_perfiles_sinteticos import poblar_todos

            poblar_todos(conn)
            estado_post = chequear_sistema(conn)

        logger.info("Estado post-ejecución: %s", estado_post.get("estado_general"))
        logger.info("Perfiles con voto: %s", estado_post.get("perfiles_con_voto_json", 0))
        logger.info("Filas perfil_voto: %s", estado_post.get("perfil_voto_filas", 0))
        logger.info("Filas perfil_problemas: %s", estado_post.get("perfil_problemas_filas", 0))

        if int(estado_post.get("perfil_voto_filas") or 0) == 0:
            raise RuntimeError("El sistema de perfiles no se pobló correctamente (perfil_voto vacío).")

        logger.info("Sistema de perfiles listo.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
