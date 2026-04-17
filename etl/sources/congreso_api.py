"""
Congreso de los Diputados — Open Data API — ElectSim España
Descarga actividad parlamentaria de la legislatura actual.

API: https://www.congreso.es/opendata/api
Documentación: https://www.congreso.es/web/guest/opendata

Uso:
    python -m etl.sources.congreso_api
"""

from __future__ import annotations

import json
import logging
import os
import time
from datetime import date, datetime

import requests
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

CONGRESO_API = "https://www.congreso.es/opendata/api"
LEGISLATURA_ACTUAL = 15

# Mapeo de grupo parlamentario -> partido
GRUPO_PARTIDO = {
    "Partido Popular": "PP",
    "Grupo Parlamentario Popular en el Congreso": "PP",
    "Socialista": "PSOE",
    "Grupo Parlamentario Socialista": "PSOE",
    "Vox": "VOX",
    "Grupo Parlamentario VOX": "VOX",
    "Sumar": "SUMAR",
    "Junts": "JUNTS",
    "ERC": "ERC",
    "Esquerra Republicana": "ERC",
    "Bildu": "BILDU",
    "EH Bildu": "BILDU",
    "PNV": "PNV",
    "Euzko Alderdi Jeltzalea-Partido Nacionalista Vasco": "PNV",
    "Coalición Canaria": "CC",
    "BNG": "BNG",
}


def _partido_from_grupo(grupo: str) -> str:
    for key, siglas in GRUPO_PARTIDO.items():
        if key.lower() in grupo.lower():
            return siglas
    return "OTROS"


def fetch_iniciativas(tipo: str = "proposicion-ley", legislatura: int = 15, n: int = 100) -> list[dict]:
    """Descarga iniciativas del congreso."""
    try:
        url = f"{CONGRESO_API}/iniciativas"
        params = {"legislatura": legislatura, "tipo": tipo, "limit": n, "format": "json"}
        r = requests.get(url, params=params, timeout=30, headers={
            "User-Agent": "ElectSim-Research/1.0",
            "Accept": "application/json",
        })
        if r.status_code != 200:
            logger.debug("Congreso API %s status %d", tipo, r.status_code)
            return []
        data = r.json()
        return data.get("iniciativas", data) if isinstance(data, dict) else data
    except Exception as exc:
        logger.warning("Congreso API error %s: %s", tipo, exc)
        return []


def fetch_votaciones(legislatura: int = 15, n: int = 200) -> list[dict]:
    """Descarga votaciones del pleno."""
    try:
        url = f"{CONGRESO_API}/votaciones"
        params = {"legislatura": legislatura, "limit": n, "format": "json"}
        r = requests.get(url, params=params, timeout=30, headers={
            "User-Agent": "ElectSim-Research/1.0",
            "Accept": "application/json",
        })
        if r.status_code != 200:
            return []
        data = r.json()
        return data.get("votaciones", data) if isinstance(data, dict) else data
    except Exception as exc:
        logger.warning("Congreso votaciones error: %s", exc)
        return []


def insertar_actividad(items: list[dict], tipo_acto: str, engine) -> int:
    sql = text("""
        INSERT INTO actividad_congreso (legislatura, fecha, partido_siglas, tipo_acto, titulo, resultado)
        VALUES (:leg, :fecha, :partido, :tipo, :titulo, :resultado)
        ON CONFLICT DO NOTHING
    """)
    n = 0
    with engine.begin() as conn:
        for item in items:
            grupo = item.get("grupoParlamentario", item.get("grupo", ""))
            partido = _partido_from_grupo(str(grupo))
            fecha_str = item.get("fecha", item.get("fechaIniciativa", ""))
            try:
                fecha = datetime.fromisoformat(str(fecha_str)[:10]).date() if fecha_str else None
            except Exception:
                fecha = None
            titulo = str(item.get("titulo", item.get("descripcion", "")))[:500]
            resultado = str(item.get("resultado", item.get("estado", "")))[:50]
            try:
                conn.execute(sql, {
                    "leg": LEGISLATURA_ACTUAL,
                    "fecha": fecha,
                    "partido": partido,
                    "tipo": tipo_acto,
                    "titulo": titulo,
                    "resultado": resultado,
                })
                n += 1
            except Exception:
                pass
    return n


def calcular_stats_legislativas(engine) -> None:
    """Agrega actividad por partido y periodo en stats_legislativas."""
    sql_agg = text("""
        INSERT INTO stats_legislativas (legislatura, partido_siglas, periodo, n_proposiciones, n_preguntas_orales, n_enmiendas, n_mociones, n_interpelaciones)
        SELECT
            legislatura,
            partido_siglas,
            TO_CHAR(fecha, 'YYYY-MM') AS periodo,
            SUM(CASE WHEN tipo_acto = 'proposicion-ley' THEN 1 ELSE 0 END),
            SUM(CASE WHEN tipo_acto = 'pregunta-oral' THEN 1 ELSE 0 END),
            SUM(CASE WHEN tipo_acto = 'enmienda' THEN 1 ELSE 0 END),
            SUM(CASE WHEN tipo_acto = 'mocion' THEN 1 ELSE 0 END),
            SUM(CASE WHEN tipo_acto = 'interpelacion' THEN 1 ELSE 0 END)
        FROM actividad_congreso
        WHERE fecha IS NOT NULL
        GROUP BY legislatura, partido_siglas, periodo
        ON CONFLICT (legislatura, partido_siglas, periodo) DO UPDATE SET
            n_proposiciones = EXCLUDED.n_proposiciones,
            n_preguntas_orales = EXCLUDED.n_preguntas_orales,
            n_enmiendas = EXCLUDED.n_enmiendas,
            n_mociones = EXCLUDED.n_mociones,
            n_interpelaciones = EXCLUDED.n_interpelaciones
    """)
    with engine.begin() as conn:
        conn.execute(sql_agg)


def run_congreso(engine=None) -> dict:
    if engine is None:
        from sqlalchemy import create_engine as ce
        engine = ce(os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://electsim:electsim@localhost:5432/electsim_espana"
        ))

    total = 0
    tipos = [
        ("proposicion-ley", "proposicion-ley"),
        ("pregunta-oral", "pregunta-oral"),
        ("mocion", "mocion"),
        ("interpelacion", "interpelacion"),
    ]
    for tipo_api, tipo_acto in tipos:
        logger.info("Congreso: descargando %s...", tipo_api)
        items = fetch_iniciativas(tipo=tipo_api)
        n = insertar_actividad(items, tipo_acto, engine)
        total += n
        logger.info("  -> %d actos insertados", n)
        time.sleep(1)

    calcular_stats_legislativas(engine)
    return {"actos_congreso": total}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    r = run_congreso()
    print(f"Congreso API completado: {r}")
