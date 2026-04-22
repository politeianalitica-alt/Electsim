"""
loader.py
Persistencia ETL de agenda de líderes.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

def _execute_values_compat(cur: Any, sql: str, rows: list[tuple], page_size: int = 500) -> None:
    if not rows:
        return
    placeholders = ", ".join(["%s"] * len(rows[0]))
    sql_execmany = sql.replace("VALUES %s", f"VALUES ({placeholders})")
    for i in range(0, len(rows), page_size):
        cur.executemany(sql_execmany, rows[i : i + page_size])


def upsert_agenda_lideres(conn: Any, eventos: list[dict]) -> int:
    """
    Inserta/actualiza eventos en agenda_lideres.

    Acepta:
    - SQLAlchemy Engine
    - SQLAlchemy Connection
    - conexión DB-API con cursor/commit
    """
    if not eventos:
        return 0

    payload = [
        {
            "lider_id": e["lider_id"],
            "partido": e["partido"],
            "nombre_lider": e["nombre_lider"],
            "cargo": e["cargo"],
            "titulo_evento": e["titulo_evento"],
            "descripcion": e.get("descripcion"),
            "lugar": e.get("lugar"),
            "fecha_evento": e["fecha_evento"],
            "hora_inicio": e.get("hora_inicio"),
            "hora_fin": e.get("hora_fin"),
            "tipo_evento": e.get("tipo_evento", "acto_publico"),
            "es_publico": bool(e.get("es_publico", True)),
            "url_fuente": e.get("url_fuente"),
            "fuente_id": e.get("fuente_id"),
            "raw_html": e.get("raw_html"),
        }
        for e in eventos
    ]

    sql = """
        INSERT INTO agenda_lideres
            (lider_id, partido, nombre_lider, cargo, titulo_evento,
             descripcion, lugar, fecha_evento, hora_inicio, hora_fin,
             tipo_evento, es_publico, url_fuente, fuente_id, raw_html)
        VALUES
            (:lider_id, :partido, :nombre_lider, :cargo, :titulo_evento,
             :descripcion, :lugar, :fecha_evento, :hora_inicio, :hora_fin,
             :tipo_evento, :es_publico, :url_fuente, :fuente_id, :raw_html)
        ON CONFLICT (lider_id, fecha_evento, titulo_evento) DO UPDATE SET
            hora_inicio   = EXCLUDED.hora_inicio,
            lugar         = COALESCE(EXCLUDED.lugar, agenda_lideres.lugar),
            descripcion   = COALESCE(EXCLUDED.descripcion, agenda_lideres.descripcion),
            fecha_ingesta = NOW()
    """

    if isinstance(conn, Engine):
        with conn.begin() as tx:
            tx.execute(text(sql), payload)
        return len(payload)

    if isinstance(conn, Connection):
        conn.execute(text(sql), payload)
        return len(payload)

    if hasattr(conn, "cursor"):
        sql_dbapi = """
            INSERT INTO agenda_lideres
                (lider_id, partido, nombre_lider, cargo, titulo_evento,
                 descripcion, lugar, fecha_evento, hora_inicio, hora_fin,
                 tipo_evento, es_publico, url_fuente, fuente_id, raw_html)
            VALUES %s
            ON CONFLICT (lider_id, fecha_evento, titulo_evento) DO UPDATE SET
                hora_inicio   = EXCLUDED.hora_inicio,
                lugar         = COALESCE(EXCLUDED.lugar, agenda_lideres.lugar),
                descripcion   = COALESCE(EXCLUDED.descripcion, agenda_lideres.descripcion),
                fecha_ingesta = NOW()
        """
        rows = [
            (
                e["lider_id"], e["partido"], e["nombre_lider"], e["cargo"], e["titulo_evento"],
                e.get("descripcion"), e.get("lugar"), e["fecha_evento"], e.get("hora_inicio"),
                e.get("hora_fin"), e.get("tipo_evento", "acto_publico"), bool(e.get("es_publico", True)),
                e.get("url_fuente"), e.get("fuente_id"), e.get("raw_html"),
            )
            for e in eventos
        ]
        with conn.cursor() as cur:
            _execute_values_compat(cur, sql_dbapi, rows, page_size=500)
        conn.commit()
        return len(payload)

    raise TypeError("Tipo de conexión no soportado para upsert_agenda_lideres")
