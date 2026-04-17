"""
Orquestación Prefect — Fase 2 (modelos). Cada tarea tolera fallos puntuales.
"""

from __future__ import annotations

import logging
import os
import traceback

from prefect import flow, task

logger = logging.getLogger(__name__)


def _safe_import(name: str):
    try:
        mod = __import__(name, fromlist=["*"])
        return mod
    except ImportError:
        logger.warning("ImportError: %s", name)
        return None


@task(retries=2, retry_delay_seconds=5)
def task_ipf():
    m = _safe_import("models.estadisticos.ipf")
    if m is None:
        return
    from sqlalchemy import create_engine

    eid = os.getenv("ELECTSIM_IPF_ENCUESTA_ID")
    if not eid:
        logger.warning("ELECTSIM_IPF_ENCUESTA_ID no definido; se omite IPF")
        return
    engine = create_engine(os.environ["DATABASE_URL"])
    m.aplicar_ipf_a_encuesta(int(eid), engine)


@task(retries=2, retry_delay_seconds=5)
def task_clustering():
    m = _safe_import("models.estadisticos.clustering_votantes")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    m.generar_perfiles(engine)


@task(retries=2, retry_delay_seconds=5)
def task_nowcasting():
    m = _safe_import("models.estadisticos.nowcasting")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    raw = m.cargar_encuestas_bd(engine)
    if raw.empty:
        logger.warning("Sin encuestas para nowcasting")
        return
    res = m.agregar_encuestas(raw)
    m.guardar_estimaciones(res, engine)


@task(retries=2, retry_delay_seconds=5)
def task_pedersen():
    m = _safe_import("models.estadisticos.pedersen")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    df = m.calcular_pedersen_serie(engine)
    m.guardar_pedersen(df, engine)


@task(retries=2, retry_delay_seconds=5)
def task_coaliciones():
    m = _safe_import("models.estrategicos.coaliciones")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    m.analisis_completo(engine)


@task(retries=2, retry_delay_seconds=5)
def task_morfologico():
    m = _safe_import("models.escenarios.morfologico")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    esc = m.generar_escenarios(m.EJES_ELECTORALES_ESPAÑA, m.INCOMPATIBILIDADES, top_n=20)
    m.exportar_a_bd(esc, engine)


@task(retries=2, retry_delay_seconds=5)
def task_monte_carlo():
    m = _safe_import("models.escenarios.monte_carlo_escanos")
    n = _safe_import("models.estadisticos.nowcasting")
    if m is None or n is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    raw = n.cargar_encuestas_bd(engine)
    if raw.empty:
        return
    est = n.agregar_encuestas(raw)
    prov = m.escanos_por_provincia_desde_bd(engine)
    fac = m.factor_provincial_historico(engine)
    res = m.simular_congreso(est, prov, fac, n_simulaciones=2000)
    m.guardar_simulacion(res, engine, n_simulaciones=2000)


@task(retries=2, retry_delay_seconds=5)
def task_dafo():
    m = _safe_import("models.estrategicos.dafo")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    for sig in ["PSOE", "PP", "VOX", "SUMAR", "ERC", "PNV"]:
        try:
            d = m.calcular_dafo_partido(sig, engine)
            m.guardar_dafo(d, engine)
        except Exception:
            logger.warning("DAFO %s: %s", sig, traceback.format_exc())


@task(retries=2, retry_delay_seconds=5)
def task_riesgo():
    m = _safe_import("models.riesgos.riesgo_politico")
    if m is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    m.generar_informe_riesgo_politico(engine)


@task(retries=2, retry_delay_seconds=5)
def task_stress():
    m = _safe_import("models.riesgos.stress_testing")
    n = _safe_import("models.estadisticos.nowcasting")
    if m is None or n is None:
        return
    from sqlalchemy import create_engine

    engine = create_engine(os.environ["DATABASE_URL"])
    raw = n.cargar_encuestas_bd(engine)
    if raw.empty:
        return
    est = n.agregar_encuestas(raw)
    df = m.stress_test_completo(est, ["PSOE", "SUMAR"])
    m.guardar_stress_test(df, engine, ["PSOE", "SUMAR"])


@flow(name="ElectSim España — Fase 2 modelos")
def run_fase2():
    task_ipf()
    task_clustering()
    task_nowcasting()
    task_pedersen()
    task_coaliciones()
    task_morfologico()
    task_monte_carlo()
    task_dafo()
    task_riesgo()
    task_stress()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_fase2()
