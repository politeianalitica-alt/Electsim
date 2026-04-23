"""Servicio de campaña: multi-cliente, coordinación y memoria institucional."""

from __future__ import annotations

import json
from datetime import date
from typing import Any

import pandas as pd

from db.session import get_raw_conn
from etl.logger import get_logger

logger = get_logger(__name__)


def _table_exists(table_name: str) -> bool:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass(%s)", (table_name,))
            row = cur.fetchone()
        return bool(row and row[0])
    except Exception:
        return False
    finally:
        conn.close()


def _q(sql: str, params: tuple | list | dict | None = None) -> pd.DataFrame:
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            if cur.description is None:
                return pd.DataFrame()
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
        return pd.DataFrame(rows, columns=cols)
    except Exception as exc:
        logger.error("campana._q: %s", exc)
        return pd.DataFrame()
    finally:
        conn.close()


def listar_clientes(solo_activos: bool = True) -> pd.DataFrame:
    if not _table_exists("clientes"):
        return pd.DataFrame()
    sql = "SELECT id, nombre, tipo, ambito, activo FROM clientes"
    if solo_activos:
        sql += " WHERE COALESCE(activo, TRUE) = TRUE"
    sql += " ORDER BY nombre"
    return _q(sql)


def obtener_cliente(cliente_id: int) -> dict | None:
    if not _table_exists("clientes"):
        return None
    df = _q("SELECT * FROM clientes WHERE id = %s", (int(cliente_id),))
    return df.iloc[0].to_dict() if not df.empty else None


def crear_cliente(
    nombre: str,
    tipo: str = "partido",
    ambito: str = "nacional",
    color_hex: str = "#1a6b8a",
    config: dict | None = None,
) -> int:
    if not _table_exists("clientes"):
        raise RuntimeError("Tabla clientes no existe. Ejecuta migraciones Alembic.")
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cols = {x.lower() for x in _q("SELECT column_name FROM information_schema.columns WHERE table_name='clientes'")["column_name"].astype(str)}
            if "color_hex" in cols:
                cur.execute(
                    """
                    INSERT INTO clientes (nombre, tipo, ambito, color_hex, config_json)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    RETURNING id
                    """,
                    (nombre, tipo, ambito, color_hex, json.dumps(config or {})),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO clientes (nombre, tipo, ambito, config_json)
                    VALUES (%s, %s, %s, %s::jsonb)
                    RETURNING id
                    """,
                    (nombre, tipo, ambito, json.dumps(config or {})),
                )
            new_id = cur.fetchone()[0]
        conn.commit()
        return int(new_id)
    finally:
        conn.close()


def listar_mensajes(
    cliente_id: int,
    solo_activos: bool = True,
    tipo: str | None = None,
    limit: int = 50,
) -> pd.DataFrame:
    if not _table_exists("mensajes_campana"):
        return pd.DataFrame()
    clauses = ["(cliente_id = %s OR cliente_id IS NULL)"]
    params: list[Any] = [int(cliente_id)]
    if solo_activos:
        clauses.append("COALESCE(estado, 'activo') = 'activo'")
        clauses.append("(fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE)")
    if tipo:
        clauses.append("tipo = %s")
        params.append(tipo)
    where = "WHERE " + " AND ".join(clauses)
    sql = f"""
        SELECT id, cliente_id, fecha_inicio, fecha_fin, titulo, mensaje, estado, tipo, autor, creado_en
        FROM mensajes_campana
        {where}
        ORDER BY fecha_inicio DESC NULLS LAST, creado_en DESC
        LIMIT %s
    """
    params.append(int(limit))
    return _q(sql, tuple(params))


def crear_mensaje(
    cliente_id: int,
    titulo: str,
    cuerpo: str,
    tipo: str = "mensaje_dia",
    prioridad: int = 2,  # reservado para compatibilidad API
    fecha_fin: date | None = None,
    destinatarios: list[str] | None = None,  # reservado para compatibilidad API
    autor: str | None = None,
) -> int:
    _ = (prioridad, destinatarios)
    if not _table_exists("mensajes_campana"):
        raise RuntimeError("Tabla mensajes_campana no existe. Ejecuta migraciones Alembic.")
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO mensajes_campana
                    (cliente_id, fecha_inicio, fecha_fin, titulo, mensaje, estado, tipo, autor)
                VALUES (%s, CURRENT_DATE, %s, %s, %s, 'activo', %s, %s)
                RETURNING id
                """,
                (int(cliente_id), fecha_fin, titulo, cuerpo, tipo, autor),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        return int(new_id)
    finally:
        conn.close()


def archivar_mensaje(mensaje_id: int, cliente_id: int) -> bool:
    if not _table_exists("mensajes_campana"):
        return False
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE mensajes_campana
                SET estado = 'archivado'
                WHERE id = %s
                  AND (cliente_id = %s OR cliente_id IS NULL)
                """,
                (int(mensaje_id), int(cliente_id)),
            )
            updated = int(cur.rowcount or 0)
        conn.commit()
        return updated > 0
    finally:
        conn.close()


def obtener_mensaje_dia(cliente_id: int) -> dict | None:
    df = listar_mensajes(cliente_id=cliente_id, solo_activos=True, tipo="mensaje_dia", limit=1)
    return df.iloc[0].to_dict() if not df.empty else None


def listar_decisiones(
    cliente_id: int,
    tipo: str | None = None,
    resultado: str | None = None,
    etiqueta: str | None = None,
    desde: date | None = None,
    limit: int = 100,
) -> pd.DataFrame:
    if not _table_exists("decisiones_estrategicas"):
        return pd.DataFrame()

    clauses = ["(cliente_id = %s OR cliente_id IS NULL)"]
    params: list[Any] = [int(cliente_id)]
    if tipo:
        clauses.append("tipo = %s")
        params.append(tipo)
    if resultado:
        clauses.append("resultado = %s")
        params.append(resultado)
    if etiqueta:
        clauses.append("%s = ANY(etiquetas)")
        params.append(etiqueta)
    if desde:
        clauses.append("fecha >= %s")
        params.append(desde)
    where = "WHERE " + " AND ".join(clauses)
    sql = f"""
        SELECT id, cliente_id, fecha AS fecha_decision, tipo, descripcion, datos_contexto,
               resultado, lecciones, etiquetas, creado_en
        FROM decisiones_estrategicas
        {where}
        ORDER BY fecha DESC, creado_en DESC
        LIMIT %s
    """
    params.append(int(limit))
    return _q(sql, tuple(params))


def registrar_decision(
    cliente_id: int,
    titulo: str,
    descripcion: str,
    tipo: str = "decision",
    fecha_decision: date | None = None,
    resultado: str = "pendiente",
    impacto_est: str = "",
    lecciones: str = "",
    etiquetas: list[str] | None = None,
    autor: str | None = None,
    contexto_datos: dict | None = None,
) -> int:
    _ = (impacto_est, autor)
    if not _table_exists("decisiones_estrategicas"):
        raise RuntimeError("Tabla decisiones_estrategicas no existe. Ejecuta migraciones Alembic.")

    desc_full = f"{titulo}\n\n{descripcion}" if titulo else descripcion
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO decisiones_estrategicas
                    (cliente_id, fecha, tipo, descripcion, datos_contexto, resultado, lecciones, etiquetas)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                RETURNING id
                """,
                (
                    int(cliente_id),
                    fecha_decision or date.today(),
                    tipo,
                    desc_full,
                    json.dumps(contexto_datos or {}),
                    resultado,
                    lecciones,
                    etiquetas or [],
                ),
            )
            new_id = cur.fetchone()[0]
        conn.commit()
        return int(new_id)
    finally:
        conn.close()


def actualizar_resultado_decision(
    decision_id: int,
    cliente_id: int,
    resultado: str,
    impacto_est: str = "",
    lecciones: str = "",
) -> bool:
    if not _table_exists("decisiones_estrategicas"):
        return False
    conn = get_raw_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE decisiones_estrategicas
                SET resultado = %s,
                    lecciones = CASE
                        WHEN COALESCE(%s, '') = '' THEN lecciones
                        WHEN COALESCE(lecciones, '') = '' THEN %s
                        ELSE lecciones || E'\n\nImpacto: ' || %s
                    END
                WHERE id = %s
                  AND (cliente_id = %s OR cliente_id IS NULL)
                """,
                (
                    resultado,
                    impacto_est,
                    lecciones if lecciones else impacto_est,
                    impacto_est,
                    int(decision_id),
                    int(cliente_id),
                ),
            )
            updated = int(cur.rowcount or 0)
        conn.commit()
        return updated > 0
    finally:
        conn.close()


def buscar_decisiones_similares(
    cliente_id: int,
    texto_consulta: str,
    limit: int = 5,
) -> pd.DataFrame:
    if not _table_exists("decisiones_estrategicas"):
        return pd.DataFrame()
    term = f"%{texto_consulta.lower()}%"
    sql = """
        SELECT id, fecha AS fecha_decision, tipo, descripcion, resultado, lecciones, etiquetas,
               CASE
                   WHEN LOWER(descripcion) LIKE %s THEN 1.0
                   WHEN LOWER(COALESCE(lecciones,'')) LIKE %s THEN 0.8
                   ELSE 0.5
               END AS similitud
        FROM decisiones_estrategicas
        WHERE (cliente_id = %s OR cliente_id IS NULL)
          AND (
              LOWER(descripcion) LIKE %s
              OR LOWER(COALESCE(lecciones,'')) LIKE %s
          )
        ORDER BY similitud DESC, fecha DESC
        LIMIT %s
    """
    return _q(sql, (term, term, int(cliente_id), term, term, int(limit)))


def estadisticas_memoria(cliente_id: int) -> dict[str, Any]:
    if not _table_exists("decisiones_estrategicas"):
        return {}
    df = _q(
        """
        SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE resultado = 'positivo') AS positivas,
            COUNT(*) FILTER (WHERE resultado = 'negativo') AS negativas,
            COUNT(*) FILTER (WHERE resultado = 'pendiente') AS pendientes,
            COUNT(DISTINCT tipo) AS tipos_distintos
        FROM decisiones_estrategicas
        WHERE (cliente_id = %s OR cliente_id IS NULL)
        """,
        (int(cliente_id),),
    )
    return df.iloc[0].to_dict() if not df.empty else {}

