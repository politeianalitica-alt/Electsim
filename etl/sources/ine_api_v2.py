"""
INE API v2 — ElectSim España
Descarga indicadores clave del INE via API pública JSON.

Series utilizadas:
- IPC: tabla 50902 (IPC base 2021, variación mensual)
- EPA (paro): tabla 4247 (tasa de paro total)
- Índice Confianza Consumidor: tabla 25424
- AROPE (riesgo pobreza): tabla 10748

Docs API: https://www.ine.es/dyngs/DataLab/manual.html?cid=45

Uso:
    python -m etl.sources.ine_api_v2
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime

import requests
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

INE_BASE = "https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA"

# Tabla INE -> (nombre_indicador, unidad)
SERIES_CONFIG = {
    "50902": ("IPC General", "%"),
    "4247": ("Tasa de Paro EPA", "%"),
    "25424": ("Indice de Confianza del Consumidor", "indice"),
    "3996": ("PIB crecimiento trimestral", "%"),
    # "1739": ("Deuda publica pct PIB", "%"),  # desactivado: tabla movida, usar BDE
    "10748": ("Tasa de riesgo de pobreza AROPE", "%"),
    "2077": ("Coste laboral medio mensual", "EUR"),
    "29991": ("Indice Produccion Industrial IPI", "indice"),
    "4247": ("Tasa de empleo 16-64", "%"),
}


def fetch_serie(tabla_id: str, n_periodos: int = 24) -> list[dict]:
    """Descarga últimos n_periodos datos de una tabla INE."""
    url = f"{INE_BASE}/{tabla_id}"
    params = {"nult": n_periodos, "det": 0}
    try:
        r = requests.get(url, params=params, timeout=30, headers={
            "User-Agent": "ElectSim-Research/1.0"
        })
        r.raise_for_status()
        data = r.json()
    except Exception as exc:
        logger.warning("Error INE tabla %s: %s", tabla_id, exc)
        return []

    rows = []
    for serie in data if isinstance(data, list) else []:
        nombre = serie.get("Nombre", "")
        for dato in serie.get("Data", []):
            fecha_ms = dato.get("Fecha")
            valor = dato.get("Valor")
            if fecha_ms is None or valor is None:
                continue
            try:
                dt = datetime.fromtimestamp(fecha_ms / 1000)
                rows.append({"fecha": dt.date(), "valor": float(valor), "nombre_serie": nombre})
            except Exception:
                continue
    return rows


def guardar_indicadores(tabla_id: str, nombre: str, unidad: str, rows: list[dict], engine) -> int:
    if not rows:
        return 0
    sql = text("""
        INSERT INTO indicadores_sociales (indicador, codigo_ine, valor, unidad, fecha, fuente)
        VALUES (:indicador, :codigo_ine, :valor, :unidad, :fecha, 'INE')
        ON CONFLICT (indicador, fecha, ccaa_id) DO UPDATE SET
            valor = EXCLUDED.valor
    """)
    n = 0
    with engine.begin() as conn:
        for row in rows:
            try:
                conn.execute(sql, {
                    "indicador": nombre,
                    "codigo_ine": tabla_id,
                    "valor": row["valor"],
                    "unidad": unidad,
                    "fecha": row["fecha"],
                })
                n += 1
            except Exception as exc:
                logger.debug("Skip %s %s: %s", nombre, row["fecha"], exc)
    return n


def run_ine(engine=None) -> dict:
    if engine is None:
        from sqlalchemy import create_engine as ce
        engine = ce(os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"
        ))
    total = 0
    for tabla_id, (nombre, unidad) in SERIES_CONFIG.items():
        logger.info("INE tabla %s (%s)...", tabla_id, nombre)
        rows = fetch_serie(tabla_id, n_periodos=36)
        n = guardar_indicadores(tabla_id, nombre, unidad, rows, engine)
        total += n
        logger.info("  -> %d registros", n)
    return {"registros_ine": total}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    r = run_ine()
    print(f"INE API completado: {r}")
