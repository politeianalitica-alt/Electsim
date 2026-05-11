"""
Servicio Core de Fondos Europeos — capa de datos para el router
`api/routers/fondos_eu.py` (PRTR + PERTE + MFP + InvestEU + NextGen).

Funciones expuestas:
    cargar_componentes_prtr()         → list[dict]
    cargar_pertes(estado)             → list[dict]
    cargar_convocatorias(...)         → list[dict]
    cargar_hitos(...)                 → list[dict]
    cargar_top_beneficiarios(...)     → list[dict]
    cargar_totales_programas()        → dict

Si ninguna de las tablas existe, todas las funciones devuelven listas/dicts
vacíos. Nunca lanzan excepciones al caller.

Shape esperado de las tablas:

`fondos_eu_componentes` (los 11 componentes del PRTR español):
    codigo               VARCHAR PK            — C01..C11 o similar
    nombre               VARCHAR
    area                 VARCHAR               — agenda urbana | infraestructuras | ...
    descripcion          TEXT
    asignacion_m         NUMERIC               — millones de euros asignados
    ejecutado_m          NUMERIC
    n_hitos              INTEGER
    n_reformas           INTEGER
    url_oficial          VARCHAR

`fondos_eu_pertes` (los 12 PERTE oficiales):
    codigo               VARCHAR PK            — PERTE_VEC, PERTE_CHIP, ...
    nombre               VARCHAR
    sector               VARCHAR
    descripcion          TEXT
    inversion_publica_m  NUMERIC
    inversion_privada_m  NUMERIC
    inversion_total_m    NUMERIC
    fecha_aprobacion     DATE
    estado               VARCHAR               — aprobado|ejecucion|finalizado
    n_convocatorias      INTEGER
    url_oficial          VARCHAR

`fondos_eu_convocatorias`:
    id                   VARCHAR PK
    titulo               VARCHAR
    componente           VARCHAR FK            — referencia a componente
    perte                VARCHAR FK            — referencia a PERTE (opcional)
    organo_convocante    VARCHAR
    importe_total_m      NUMERIC
    fecha_apertura       DATE
    fecha_cierre         DATE
    estado               VARCHAR               — abierta|cerrada|adjudicada
    bases_url            VARCHAR

`fondos_eu_hitos`:
    id                   VARCHAR PK            — CID milestone identifier
    componente           VARCHAR FK
    tipo                 VARCHAR               — hito|reforma|objetivo
    titulo               VARCHAR
    descripcion          TEXT
    fecha_objetivo       DATE
    estado               VARCHAR               — pendiente|cumplido|retrasado
    desembolso_asociado_m NUMERIC

`fondos_eu_beneficiarios`:
    cif                  VARCHAR
    razon_social         VARCHAR
    componente           VARCHAR
    perte                VARCHAR
    importe_total_m      NUMERIC
    n_proyectos          INTEGER
    sector               VARCHAR
    region               VARCHAR

`fondos_eu_totales`:
    programa             VARCHAR PK            — PRTR|MFP|InvestEU|NextGen|...
    asignado_m           NUMERIC
    ejecutado_m          NUMERIC
    transferido_m        NUMERIC
    ultima_actualizacion DATE
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Engine + safe SQL ────────────────────────────────────────────────────────

def _get_engine() -> Any:
    """Resuelve el engine SQLAlchemy. None si no hay BD disponible."""
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
    """Ejecuta SQL y devuelve list[dict] (vacío si error o tabla inexistente)."""
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
        logger.debug("fondos_eu_core._safe_read_sql: %s", exc)
        return []


def _table_exists(table_name: str) -> bool:
    """Verifica si una tabla existe."""
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


# ── Componentes PRTR ─────────────────────────────────────────────────────────

def cargar_componentes_prtr() -> list[dict]:
    """
    Los 11 componentes del Plan de Recuperación, Transformación y Resiliencia.

    Devuelve list[dict] con: codigo, nombre, area, descripcion,
    asignacion_m, ejecutado_m, n_hitos, n_reformas, url_oficial.
    Lista vacía si la tabla no existe.
    """
    if not _table_exists("fondos_eu_componentes"):
        return []

    query = """
        SELECT codigo, nombre, area, descripcion,
               asignacion_m, ejecutado_m,
               n_hitos, n_reformas, url_oficial
        FROM   fondos_eu_componentes
        ORDER  BY codigo ASC
    """
    return _safe_read_sql(query)


# ── PERTE ────────────────────────────────────────────────────────────────────

def cargar_pertes(estado: str | None = None) -> list[dict]:
    """
    Proyectos Estratégicos para la Recuperación y Transformación Económica.

    Devuelve list[dict] con: codigo, nombre, sector, descripcion,
    inversion_publica_m, inversion_privada_m, inversion_total_m,
    fecha_aprobacion, estado, n_convocatorias, url_oficial.
    """
    if not _table_exists("fondos_eu_pertes"):
        return []

    conditions: list[str] = []
    params: dict[str, Any] = {}

    if estado:
        conditions.append("estado = :estado")
        params["estado"] = estado

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT codigo, nombre, sector, descripcion,
               inversion_publica_m, inversion_privada_m, inversion_total_m,
               fecha_aprobacion, estado, n_convocatorias, url_oficial
        FROM   fondos_eu_pertes
        {where}
        ORDER  BY fecha_aprobacion DESC NULLS LAST, codigo ASC
    """
    return _safe_read_sql(query, params)


# ── Convocatorias ────────────────────────────────────────────────────────────

def cargar_convocatorias(
    estado: str = "abierta",
    componente: str | None = None,
    limit: int = 50,
) -> list[dict]:
    """
    Convocatorias de ayudas y subvenciones financiadas con fondos EU.

    Devuelve list[dict] con: id, titulo, componente, perte, organo_convocante,
    importe_total_m, fecha_apertura, fecha_cierre, estado, bases_url.
    """
    if not _table_exists("fondos_eu_convocatorias"):
        return []

    conditions = ["estado = :estado"]
    params: dict[str, Any] = {"estado": estado, "limit": limit}

    if componente:
        conditions.append("componente = :componente")
        params["componente"] = componente

    where = " AND ".join(conditions)
    query = f"""
        SELECT id, titulo, componente, perte, organo_convocante,
               importe_total_m, fecha_apertura, fecha_cierre,
               estado, bases_url
        FROM   fondos_eu_convocatorias
        WHERE  {where}
        ORDER  BY fecha_cierre ASC NULLS LAST, fecha_apertura DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Hitos y reformas ─────────────────────────────────────────────────────────

def cargar_hitos(
    estado: str | None = None,
    componente: str | None = None,
    limit: int = 100,
) -> list[dict]:
    """
    Hitos y reformas del Plan de Recuperación (CID milestones).

    Devuelve list[dict] con: id, componente, tipo, titulo, descripcion,
    fecha_objetivo, estado, desembolso_asociado_m.
    """
    if not _table_exists("fondos_eu_hitos"):
        return []

    conditions: list[str] = []
    params: dict[str, Any] = {"limit": limit}

    if estado:
        conditions.append("estado = :estado")
        params["estado"] = estado
    if componente:
        conditions.append("componente = :componente")
        params["componente"] = componente

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT id, componente, tipo, titulo, descripcion,
               fecha_objetivo, estado, desembolso_asociado_m
        FROM   fondos_eu_hitos
        {where}
        ORDER  BY fecha_objetivo ASC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Top beneficiarios ────────────────────────────────────────────────────────

def cargar_top_beneficiarios(
    top: int = 50,
    componente: str | None = None,
) -> list[dict]:
    """
    Top beneficiarios por importe agregado de fondos EU recibidos.

    Devuelve list[dict] con: cif, razon_social, componente, perte,
    importe_total_m, n_proyectos, sector, region.
    """
    if not _table_exists("fondos_eu_beneficiarios"):
        return []

    conditions: list[str] = []
    params: dict[str, Any] = {"top": top}

    if componente:
        conditions.append("componente = :componente")
        params["componente"] = componente

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT cif, razon_social, componente, perte,
               importe_total_m, n_proyectos, sector, region
        FROM   fondos_eu_beneficiarios
        {where}
        ORDER  BY importe_total_m DESC NULLS LAST
        LIMIT  :top
    """
    return _safe_read_sql(query, params)


# ── Totales por programa ─────────────────────────────────────────────────────

def cargar_totales_programas() -> dict[str, Any]:
    """
    Totales agregados por programa (PRTR / MFP / InvestEU / NextGen / ...).

    Returns:
        dict con:
            items: list[{programa, asignado_m, ejecutado_m, transferido_m,
                         ultima_actualizacion}]
            hay_datos: bool
            warning (opcional): 'table_not_exists'
    """
    if not _table_exists("fondos_eu_totales"):
        return {"items": [], "hay_datos": False, "warning": "table_not_exists"}

    rows = _safe_read_sql(
        """
        SELECT programa, asignado_m, ejecutado_m, transferido_m,
               ultima_actualizacion
        FROM   fondos_eu_totales
        ORDER  BY asignado_m DESC NULLS LAST
        """
    )
    return {"items": rows, "hay_datos": bool(rows)}
