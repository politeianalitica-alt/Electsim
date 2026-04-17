"""
agendas_lideres.py
Ingesta de agendas políticas por líder/partido.
"""

from __future__ import annotations

from datetime import date
import os
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine

from etl.config import validate_env
from etl.fetcher import fetch
from etl.loader import upsert_agenda_lideres
from etl.logger import get_logger
from etl.sources.agenda_extractors import dispatch
from etl.sources.lideres_config import LIDERES, FuenteAgenda


TTL_AGENDA = 3600 * 2
logger = get_logger(__name__)


def _fetch_fuente(fuente: FuenteAgenda) -> str | None:
    return fetch(fuente.url, cache_ttl=TTL_AGENDA)


def _default_engine() -> Engine:
    validate_env()
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana",
    )
    return create_engine(db_url, pool_pre_ping=True)


def _run_with_connection(conn: Any, solo_hoy: bool) -> dict[str, int]:
    resultado: dict[str, int] = {}
    hoy = date.today()

    for lider in LIDERES:
        eventos_lider: list[dict] = []

        for fuente in sorted(lider.fuentes, key=lambda f: f.prioridad):
            content = _fetch_fuente(fuente)
            if not content:
                continue
            eventos = dispatch(fuente.parser_hint, content, lider, fuente.url)
            if eventos:
                eventos_lider = eventos
                break

        if solo_hoy:
            eventos_lider = [e for e in eventos_lider if e.get("fecha_evento") == hoy]

        eventos_lider = [e for e in eventos_lider if e.get("fecha_evento") is not None]

        if eventos_lider:
            n = upsert_agenda_lideres(conn, eventos_lider)
            resultado[lider.lider_id] = n
        else:
            resultado[lider.lider_id] = 0

    return resultado


def run_agendas(conn: Any | None = None, solo_hoy: bool = False) -> dict[str, int]:
    """
    Descarga y persiste agendas de todos los líderes configurados.
    """
    if conn is None:
        engine = _default_engine()
        with engine.begin() as tx:
            return _run_with_connection(tx, solo_hoy=solo_hoy)

    if isinstance(conn, Engine):
        with conn.begin() as tx:
            return _run_with_connection(tx, solo_hoy=solo_hoy)

    if isinstance(conn, Connection):
        return _run_with_connection(conn, solo_hoy=solo_hoy)

    # DB-API fallback.
    return _run_with_connection(conn, solo_hoy=solo_hoy)


def main() -> int:
    out = run_agendas(solo_hoy=False)
    total = sum(out.values())
    logger.info("[agendas_lideres] total upserts: %s · detalle: %s", total, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
