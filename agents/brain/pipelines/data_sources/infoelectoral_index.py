"""
Histórico electoral via DB local (cargado desde Ministerio del Interior).

El Ministerio del Interior publica CSV/Excel descargables con resultados
desde 1977. Asumimos que existe una tabla `resultados_electorales` en
la BD del proyecto (typical schema · ya usada en `1_Mapa_Electoral.py`).

Si no hay BD o no hay tabla, devolvemos listas vacías sin fallar.

API:
  historial_municipales(cod_ine) → list[ResultadoEleccion]
  historial_generales_provincia(cod_provincia) → list
  historial_personal(politico_nombre) → list candidaturas
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


def _get_engine_or_none():
    if not os.environ.get("DATABASE_URL"):
        return None
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def historial_municipales(cod_ine: str) -> list[dict[str, Any]]:
    """Devuelve resultados de elecciones municipales históricas para un cod_ine."""
    if not cod_ine:
        return []
    engine = _get_engine_or_none()
    if engine is None:
        return []
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Intentamos varios nombres de tabla posibles
            for table in ("resultados_municipales", "resultados_electorales",
                          "elecciones_municipales"):
                try:
                    rows = conn.execute(
                        text(f"""
                            SELECT fecha, partido, votos, porcentaje, concejales, censo, participacion
                            FROM {table}
                            WHERE codigo_ine = :cod
                            ORDER BY fecha DESC LIMIT 200
                        """),
                        {"cod": cod_ine},
                    ).fetchall()
                    if rows:
                        return _agrupar_por_eleccion(rows)
                except Exception:
                    continue
    except Exception as exc:
        logger.debug("historial_municipales BD falló: %s", exc)
    return []


def historial_generales_provincia(cod_provincia: str) -> list[dict[str, Any]]:
    """Resultados de elecciones generales por provincia."""
    if not cod_provincia:
        return []
    engine = _get_engine_or_none()
    if engine is None:
        return []
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            for table in ("resultados_provinciales", "resultados_generales"):
                try:
                    rows = conn.execute(
                        text(f"""
                            SELECT fecha, partido, votos, porcentaje, diputados, censo, participacion
                            FROM {table}
                            WHERE provincia_codigo = :p OR provincia_id = :p
                            ORDER BY fecha DESC LIMIT 300
                        """),
                        {"p": str(cod_provincia).zfill(2)},
                    ).fetchall()
                    if rows:
                        return _agrupar_por_eleccion(rows)
                except Exception:
                    continue
    except Exception as exc:
        logger.debug("historial_generales_provincia BD falló: %s", exc)
    return []


def historial_personal(politico_nombre: str) -> list[dict[str, Any]]:
    """Candidaturas históricas en las que aparece un político por nombre."""
    if not politico_nombre:
        return []
    engine = _get_engine_or_none()
    if engine is None:
        return []
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            for table in ("candidaturas", "candidatos_listas"):
                try:
                    rows = conn.execute(
                        text(f"""
                            SELECT fecha, tipo_eleccion, distrito, partido, posicion_lista,
                                   votos, porcentaje, resultado
                            FROM {table}
                            WHERE LOWER(nombre) LIKE :q
                            ORDER BY fecha DESC LIMIT 50
                        """),
                        {"q": f"%{politico_nombre.lower()}%"},
                    ).fetchall()
                    if rows:
                        return [dict(r._mapping) for r in rows]
                except Exception:
                    continue
    except Exception as exc:
        logger.debug("historial_personal BD falló: %s", exc)
    return []


def _agrupar_por_eleccion(rows) -> list[dict[str, Any]]:
    """Agrupa filas por fecha de elección."""
    from collections import defaultdict
    grupos = defaultdict(lambda: {"resultados": [], "censo": None, "participacion": None})
    for r in rows:
        d = dict(r._mapping) if hasattr(r, "_mapping") else dict(r)
        fecha = str(d.get("fecha") or "")[:10]
        if not fecha:
            continue
        grupos[fecha]["fecha"] = fecha
        grupos[fecha]["resultados"].append({
            "partido": d.get("partido"),
            "votos": d.get("votos"),
            "porcentaje": d.get("porcentaje"),
            "concejales_o_diputados": d.get("concejales") or d.get("diputados"),
        })
        if d.get("censo") and grupos[fecha]["censo"] is None:
            grupos[fecha]["censo"] = d["censo"]
        if d.get("participacion") and grupos[fecha]["participacion"] is None:
            grupos[fecha]["participacion"] = d["participacion"]
    return sorted(grupos.values(), key=lambda x: x.get("fecha", ""), reverse=True)
