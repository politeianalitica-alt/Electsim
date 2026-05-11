"""
Servicio Core de Contratación Pública — capa de datos para el router
`api/routers/contratacion.py` (PLACSP + adjudicaciones + tribunales).

Funciones expuestas:
    cargar_kpis_contratacion()           → dict
    cargar_licitaciones(...)             → list[dict]
    cargar_adjudicaciones(...)           → list[dict]
    cargar_distribucion_sector(...)      → list[dict]
    cargar_top_organos(...)              → list[dict]
    cargar_serie_mensual(...)            → list[dict]
    cargar_resoluciones_tribunales(...)  → list[dict]
    cargar_contratos_empresa(cif, ...)   → list[dict]

Regla de oro: si la tabla `contratacion_publica` (o `resoluciones_tribunales`)
no existe, las queries fallan silenciosamente y devolvemos listas o dicts
vacíos con la clave `warning="table_not_exists"` (sólo en KPIs). Nunca se
rompe el dashboard ni se exponen tracebacks.

Shape esperado de la tabla `contratacion_publica`:
    id_expediente           VARCHAR PK
    objeto                  TEXT             — descripción de la licitación
    organo_contratante      VARCHAR          — entidad pública
    importe_adjudicacion    NUMERIC          — importe final en euros
    importe_licitacion      NUMERIC          — importe inicial en euros (opcional)
    fecha_adjudicacion      DATE
    fecha_publicacion       DATE             — fecha de publicación de la licitación
    adjudicatario           VARCHAR          — razón social
    cif_adjudicatario       VARCHAR
    cpv                     VARCHAR          — código CPV
    sector                  VARCHAR          — sector económico inferido
    estado                  VARCHAR          — abierta|cerrada|adjudicada|resuelta
    tipo_contrato           VARCHAR          — obras|servicios|suministros|...
    url_pliego              VARCHAR          — enlace al pliego original

Shape esperado de `resoluciones_tribunales`:
    id                      SERIAL PK
    tribunal                VARCHAR          — TACRC, OARC, TARCJA, ...
    numero_resolucion       VARCHAR
    fecha                   DATE
    asunto                  TEXT
    recurrente              VARCHAR
    organo_recurrido        VARCHAR
    sentido                 VARCHAR          — estimatorio|desestimatorio|...
    url                     VARCHAR
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Engine + safe SQL ────────────────────────────────────────────────────────

def _get_engine() -> Any:
    """Resuelve el engine SQLAlchemy del proyecto. Devuelve None si no hay."""
    try:
        from etl.factory import crear_engine
        return crear_engine()
    except Exception:
        pass
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        pass
    try:
        import dashboard.db as _db
        return _db.get_engine()
    except Exception:
        return None


def _safe_read_sql(query: str, params: dict | None = None) -> list[dict]:
    """
    Ejecuta SQL y devuelve list[dict]. Lista vacía si:
      - no hay engine,
      - la tabla no existe,
      - cualquier otro error.
    """
    engine = _get_engine()
    if engine is None:
        return []
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            result = conn.execute(sa_text(query), params or {})
            cols = list(result.keys())
            rows = result.fetchall()
        return [dict(zip(cols, row)) for row in rows]
    except Exception as exc:
        logger.debug("contratacion_core._safe_read_sql: %s", exc)
        return []


def _safe_read_one(query: str, params: dict | None = None) -> dict | None:
    """Ejecuta SQL que devuelve una sola fila. None si falla o no hay fila."""
    rows = _safe_read_sql(query, params)
    return rows[0] if rows else None


def _table_exists(table_name: str) -> bool:
    """Verifica si una tabla existe en el schema actual."""
    engine = _get_engine()
    if engine is None:
        return False
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            conn.execute(sa_text(f"SELECT 1 FROM {table_name} LIMIT 1"))
        return True
    except Exception:
        return False


# ── KPIs ─────────────────────────────────────────────────────────────────────

def cargar_kpis_contratacion() -> dict[str, Any]:
    """
    KPIs agregados de contratación.

    Returns:
        dict con claves:
            volumen_total_eur     — suma de importe_adjudicacion (último año)
            n_adjudicaciones      — número de adjudicaciones (último año)
            n_licitaciones_abiertas
            ticket_medio_eur
            top_entidades         — list[{organo, importe_total, n_contratos}]
            top_sectores          — list[{sector, importe_total, n_contratos}]
            ultima_actualizacion
            hay_datos
            items                 — copia de top_entidades + top_sectores
                                    (para clientes legacy que esperan 'items')
            warning               — sólo si la tabla no existe
    """
    defaults: dict[str, Any] = {
        "volumen_total_eur": 0.0,
        "n_adjudicaciones": 0,
        "n_licitaciones_abiertas": 0,
        "ticket_medio_eur": 0.0,
        "top_entidades": [],
        "top_sectores": [],
        "ultima_actualizacion": None,
        "hay_datos": False,
        "items": [],
    }

    if not _table_exists("contratacion_publica"):
        return {**defaults, "warning": "table_not_exists"}

    # Volumen global y conteos del último año
    agregados = _safe_read_one(
        """
        SELECT
            COALESCE(SUM(importe_adjudicacion), 0) AS volumen_total,
            COUNT(*) FILTER (WHERE importe_adjudicacion IS NOT NULL) AS n_adj,
            MAX(fecha_adjudicacion) AS ultima
        FROM contratacion_publica
        WHERE fecha_adjudicacion >= CURRENT_DATE - INTERVAL '365 days'
        """
    ) or {}

    abiertas = _safe_read_one(
        """
        SELECT COUNT(*) AS n
        FROM contratacion_publica
        WHERE estado = 'abierta'
        """
    ) or {}

    top_entidades = _safe_read_sql(
        """
        SELECT organo_contratante AS organo,
               COALESCE(SUM(importe_adjudicacion), 0) AS importe_total,
               COUNT(*) AS n_contratos
        FROM   contratacion_publica
        WHERE  fecha_adjudicacion >= CURRENT_DATE - INTERVAL '365 days'
          AND  organo_contratante IS NOT NULL
        GROUP  BY organo_contratante
        ORDER  BY importe_total DESC
        LIMIT  10
        """
    )

    top_sectores = _safe_read_sql(
        """
        SELECT sector,
               COALESCE(SUM(importe_adjudicacion), 0) AS importe_total,
               COUNT(*) AS n_contratos
        FROM   contratacion_publica
        WHERE  fecha_adjudicacion >= CURRENT_DATE - INTERVAL '365 days'
          AND  sector IS NOT NULL
        GROUP  BY sector
        ORDER  BY importe_total DESC
        LIMIT  10
        """
    )

    volumen = float(agregados.get("volumen_total") or 0.0)
    n_adj = int(agregados.get("n_adj") or 0)
    ticket = (volumen / n_adj) if n_adj else 0.0

    hay_datos = (n_adj > 0) or bool(top_entidades) or bool(top_sectores) or bool(abiertas.get("n"))

    return {
        "volumen_total_eur": volumen,
        "n_adjudicaciones": n_adj,
        "n_licitaciones_abiertas": int(abiertas.get("n") or 0),
        "ticket_medio_eur": ticket,
        "top_entidades": top_entidades,
        "top_sectores": top_sectores,
        "ultima_actualizacion": agregados.get("ultima"),
        "hay_datos": hay_datos,
        "items": top_entidades + top_sectores,
    }


# ── Licitaciones ─────────────────────────────────────────────────────────────

def cargar_licitaciones(
    estado: str = "abierta",
    limit: int = 50,
    organo: str | None = None,
    sector: str | None = None,
) -> list[dict]:
    """
    Licitaciones filtradas por estado/órgano/sector.

    Devuelve list[dict] con: id_expediente, objeto, organo_contratante,
    importe_licitacion, fecha_publicacion, cpv, sector, estado, tipo_contrato,
    url_pliego. Lista vacía si la tabla no existe.
    """
    if not _table_exists("contratacion_publica"):
        return []

    conditions = ["estado = :estado"]
    params: dict[str, Any] = {"estado": estado, "limit": limit}

    if organo:
        conditions.append("organo_contratante ILIKE :organo")
        params["organo"] = f"%{organo}%"
    if sector:
        conditions.append("sector ILIKE :sector")
        params["sector"] = f"%{sector}%"

    where = " AND ".join(conditions)
    query = f"""
        SELECT id_expediente, objeto, organo_contratante,
               importe_licitacion, fecha_publicacion,
               cpv, sector, estado, tipo_contrato, url_pliego
        FROM   contratacion_publica
        WHERE  {where}
        ORDER  BY fecha_publicacion DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Adjudicaciones ───────────────────────────────────────────────────────────

def cargar_adjudicaciones(
    limit: int = 50,
    sector: str | None = None,
    organo: str | None = None,
    importe_min: float | None = None,
    days: int = 30,
) -> list[dict]:
    """
    Adjudicaciones de los últimos `days` días, filtrables por sector/órgano/importe.

    Devuelve list[dict] con: id_expediente, objeto, organo_contratante,
    adjudicatario, cif_adjudicatario, importe_adjudicacion, fecha_adjudicacion,
    cpv, sector, tipo_contrato, url_pliego. Lista vacía si la tabla no existe.
    """
    if not _table_exists("contratacion_publica"):
        return []

    conditions = [
        "fecha_adjudicacion >= CURRENT_DATE - (:days || ' days')::interval",
        "importe_adjudicacion IS NOT NULL",
    ]
    params: dict[str, Any] = {"limit": limit, "days": days}

    if sector:
        conditions.append("sector ILIKE :sector")
        params["sector"] = f"%{sector}%"
    if organo:
        conditions.append("organo_contratante ILIKE :organo")
        params["organo"] = f"%{organo}%"
    if importe_min is not None:
        conditions.append("importe_adjudicacion >= :importe_min")
        params["importe_min"] = importe_min

    where = " AND ".join(conditions)
    query = f"""
        SELECT id_expediente, objeto, organo_contratante,
               adjudicatario, cif_adjudicatario,
               importe_adjudicacion, fecha_adjudicacion,
               cpv, sector, tipo_contrato, url_pliego
        FROM   contratacion_publica
        WHERE  {where}
        ORDER  BY fecha_adjudicacion DESC, importe_adjudicacion DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Distribución por sector ──────────────────────────────────────────────────

def cargar_distribucion_sector(days: int = 90) -> list[dict]:
    """
    Distribución de adjudicaciones por sector en los últimos `days` días.

    Devuelve list[dict] con: sector, total_importe, n_contratos.
    """
    if not _table_exists("contratacion_publica"):
        return []

    query = """
        SELECT sector,
               COALESCE(SUM(importe_adjudicacion), 0) AS total_importe,
               COUNT(*) AS n_contratos
        FROM   contratacion_publica
        WHERE  fecha_adjudicacion >= CURRENT_DATE - (:days || ' days')::interval
          AND  sector IS NOT NULL
        GROUP  BY sector
        ORDER  BY total_importe DESC
    """
    return _safe_read_sql(query, {"days": days})


# ── Top órganos contratantes ─────────────────────────────────────────────────

def cargar_top_organos(days: int = 90, limit: int = 20) -> list[dict]:
    """
    Top órganos contratantes por importe adjudicado en los últimos `days` días.

    Devuelve list[dict] con: organo, importe_total, n_contratos.
    """
    if not _table_exists("contratacion_publica"):
        return []

    query = """
        SELECT organo_contratante AS organo,
               COALESCE(SUM(importe_adjudicacion), 0) AS importe_total,
               COUNT(*) AS n_contratos
        FROM   contratacion_publica
        WHERE  fecha_adjudicacion >= CURRENT_DATE - (:days || ' days')::interval
          AND  organo_contratante IS NOT NULL
        GROUP  BY organo_contratante
        ORDER  BY importe_total DESC
        LIMIT  :limit
    """
    return _safe_read_sql(query, {"days": days, "limit": limit})


# ── Serie mensual ────────────────────────────────────────────────────────────

def cargar_serie_mensual(months: int = 12) -> list[dict]:
    """
    Serie temporal del volumen mensual adjudicado en los últimos `months` meses.

    Devuelve list[dict] con: mes (YYYY-MM-01 DATE), importe_total, n_contratos.
    """
    if not _table_exists("contratacion_publica"):
        return []

    query = """
        SELECT date_trunc('month', fecha_adjudicacion)::date AS mes,
               COALESCE(SUM(importe_adjudicacion), 0) AS importe_total,
               COUNT(*) AS n_contratos
        FROM   contratacion_publica
        WHERE  fecha_adjudicacion >= (date_trunc('month', CURRENT_DATE)
                                      - (:months || ' months')::interval)
        GROUP  BY mes
        ORDER  BY mes ASC
    """
    return _safe_read_sql(query, {"months": months})


# ── Resoluciones de tribunales (TACRC + autonómicos) ─────────────────────────

def cargar_resoluciones_tribunales(
    limit: int = 50,
    tribunal: str | None = None,
) -> list[dict]:
    """
    Resoluciones de Tribunales Administrativos de Contratación (TACRC, OARC,
    TARCJA, etc.).

    Devuelve list[dict] con: tribunal, numero_resolucion, fecha, asunto,
    recurrente, organo_recurrido, sentido, url.
    """
    if not _table_exists("resoluciones_tribunales"):
        return []

    conditions: list[str] = []
    params: dict[str, Any] = {"limit": limit}

    if tribunal:
        conditions.append("tribunal ILIKE :tribunal")
        params["tribunal"] = f"%{tribunal}%"

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT tribunal, numero_resolucion, fecha, asunto,
               recurrente, organo_recurrido, sentido, url
        FROM   resoluciones_tribunales
        {where}
        ORDER  BY fecha DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Contratos por empresa (CIF) ──────────────────────────────────────────────

def cargar_contratos_empresa(cif: str, limit: int = 100) -> list[dict]:
    """
    Histórico de contratos adjudicados a una empresa (filtra por CIF).

    Devuelve list[dict] con: id_expediente, objeto, organo_contratante,
    importe_adjudicacion, fecha_adjudicacion, sector, tipo_contrato, url_pliego.
    """
    if not cif or not _table_exists("contratacion_publica"):
        return []

    query = """
        SELECT id_expediente, objeto, organo_contratante,
               importe_adjudicacion, fecha_adjudicacion,
               sector, tipo_contrato, url_pliego
        FROM   contratacion_publica
        WHERE  cif_adjudicatario = :cif
        ORDER  BY fecha_adjudicacion DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, {"cif": cif.upper().strip(), "limit": limit})
