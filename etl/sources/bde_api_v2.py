"""
Banco de España API v2 — ElectSim España
Descarga series del BDE via servicio estadístico público.

Documentación: https://www.bde.es/webbe/es/estadisticas/recursos/acceso-datos-estadisticos.html
API estadística BDE: https://app.bde.es/rss/rss

Uso:
    python -m etl.sources.bde_api_v2
"""

from __future__ import annotations

import logging
import os
from datetime import date, datetime

import requests
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

# Series BDE (código -> nombre, columna target)
BDE_SERIES = [
    # Tipos de interés y financiación
    ("BE_N_BPI_D_ESIA", "Euribor 1 mes", "euribor_12m"),
    ("BE_N_BPI_D_ESIA12", "Euribor 12 meses", "euribor_12m"),
    ("BE_N_FLO_M_DEUDA_PGSOE", "Deuda publica total", "deuda_publica_pib"),
    ("BE_N_FLO_M_HOGARES_PRESTAMOS", "Prestamos hogares", None),
    ("BE_N_BOND_D_ESPANA10", "Prima de riesgo bono 10Y", "prima_riesgo_bono10"),
]

BDE_RSS_BASE = "https://app.bde.es/rss/series"


def fetch_bde_serie(codigo: str, timeout: int = 30) -> list[dict]:
    """Intenta descargar serie del BDE via RSS/JSON."""
    try:
        url = f"https://app.bde.es/rss/rss?c={codigo}&i=S"
        r = requests.get(url, timeout=timeout, headers={"User-Agent": "ElectSim/1.0"})
        if r.status_code != 200:
            return []
        # Parse simple RSS
        import feedparser
        feed = feedparser.parse(r.content)
        rows = []
        for entry in feed.entries[:60]:
            titulo = getattr(entry, "title", "")
            # Formato típico BDE: "2024-01-15: 3.456"
            parts = titulo.split(":")
            if len(parts) >= 2:
                try:
                    fecha_str = parts[0].strip()
                    valor_str = parts[-1].strip().replace(",", ".")
                    fecha = datetime.strptime(fecha_str[:10], "%Y-%m-%d").date()
                    valor = float(valor_str)
                    rows.append({"fecha": fecha, "valor": valor})
                except Exception:
                    pass
        return rows
    except Exception as exc:
        logger.debug("BDE serie %s: %s", codigo, exc)
        return []


def guardar_bde_en_macro(rows: list[dict], columna: str, engine) -> int:
    """Inserta datos BDE en indicadores_macroeconomicos."""
    if not rows or not columna:
        return 0
    n = 0
    for row in rows:
        try:
            upsert = text(f"""
                INSERT INTO indicadores_macroeconomicos (fecha, frecuencia, {columna})
                VALUES (:fecha, 'M', :valor)
                ON CONFLICT (fecha, frecuencia) DO UPDATE SET
                    {columna} = EXCLUDED.{columna}
            """)
            with engine.begin() as conn:
                conn.execute(upsert, {"fecha": row["fecha"], "valor": row["valor"]})
            n += 1
        except Exception as exc:
            logger.debug("Skip BDE %s %s: %s", columna, row.get("fecha"), exc)
    return n


def run_bde(engine=None) -> dict:
    if engine is None:
        from sqlalchemy import create_engine as ce
        engine = ce(os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"
        ))
    total = 0
    for codigo, nombre, columna in BDE_SERIES:
        logger.info("BDE serie %s (%s)...", codigo, nombre)
        rows = fetch_bde_serie(codigo)
        if columna and rows:
            n = guardar_bde_en_macro(rows, columna, engine)
            total += n
            logger.info("  -> %d registros", n)
    return {"registros_bde": total}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    r = run_bde()
    print(f"BDE completado: {r}")
