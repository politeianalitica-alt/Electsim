"""
Orquestación Prefect — scrapers tiempo real (Fase 4).

Ejecutar un flow: ``python pipelines/realtime_scheduler.py --flow prensa``
Despliegue (API Prefect 2): ``python pipelines/realtime_scheduler.py --deploy``
"""

from __future__ import annotations

import argparse
import logging
import os
from datetime import timedelta

from prefect import flow, task
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


def get_engine():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL no definida")
    return create_engine(url)


@task(name="procesar_encuestas_tracking")
def task_procesar_encuestas_tracking() -> None:
    from etl.realtime.prensa_encuestas import insertar_en_resultados_agregados

    engine = get_engine()
    q = text(
        """
        SELECT id FROM encuestas_tracking
        WHERE procesada = false AND confianza_parseo >= 0.5
        """
    )
    with engine.connect() as conn:
        ids = [r[0] for r in conn.execute(q)]
    for eid in ids:
        try:
            insertar_en_resultados_agregados(int(eid), engine)
        except Exception:
            logger.exception("insertar_en_resultados_agregados %s", eid)


@task(name="recalcular_nowcasting")
def task_recalcular_nowcasting() -> None:
    import models.estadisticos.nowcasting as nc

    engine = get_engine()
    raw = nc.cargar_encuestas_bd(engine)
    if raw.empty:
        logger.warning("Sin encuestas para nowcasting")
        return
    res = nc.agregar_encuestas(raw)
    nc.guardar_estimaciones(res, engine)


@task(name="recalcular_simulacion_mc")
def task_recalcular_simulacion_mc() -> None:
    import models.estadisticos.nowcasting as nc
    import models.escenarios.monte_carlo_escanos as mc

    engine = get_engine()
    raw = nc.cargar_encuestas_bd(engine)
    if raw.empty:
        return
    est = nc.agregar_encuestas(raw)
    prov = mc.escanos_por_provincia_desde_bd(engine)
    fac = mc.factor_provincial_historico(engine)
    res = mc.simular_congreso(est, prov, fac, n_simulaciones=2000)
    mc.guardar_simulacion(res, engine, n_simulaciones=2000)


@task(name="recalcular_clustering")
def task_recalcular_clustering() -> None:
    import models.estadisticos.clustering_votantes as cl

    engine = get_engine()
    cl.generar_perfiles(engine)


@task(name="recalcular_riesgo_politico")
def task_recalcular_riesgo_politico() -> None:
    import models.riesgos.riesgo_politico as rp

    engine = get_engine()
    rp.generar_informe_riesgo_politico(engine)


@task(name="recalcular_pedersen")
def task_recalcular_pedersen() -> None:
    import models.estadisticos.pedersen as ped

    engine = get_engine()
    df = ped.calcular_pedersen_serie(engine)
    ped.guardar_pedersen(df, engine)


@task(name="recalcular_stress_test")
def task_recalcular_stress_test() -> None:
    import models.estadisticos.nowcasting as nc
    import models.riesgos.stress_testing as st

    engine = get_engine()
    raw = nc.cargar_encuestas_bd(engine)
    if raw.empty:
        return
    est = nc.agregar_encuestas(raw)
    df = st.stress_test_completo(est, ["PSOE", "SUMAR"])
    st.guardar_stress_test(df, engine, ["PSOE", "SUMAR"])


@flow(name="ElectSim: Scraping Prensa", log_prints=True)
def flow_prensa_encuestas():
    from etl.realtime.prensa_encuestas import PrensaEncuestasScraper

    engine = get_engine()
    scraper = PrensaEncuestasScraper("prensa", engine)
    stats = scraper.run()
    if stats.get("nuevas_encuestas_detectadas", 0) > 0:
        task_procesar_encuestas_tracking()
        task_recalcular_nowcasting()
        task_recalcular_simulacion_mc()


@flow(name="ElectSim: Monitor Macro", log_prints=True)
def flow_macro_monitor():
    from etl.realtime.macro_monitor import MacroMonitor

    engine = get_engine()
    monitor = MacroMonitor("macro", engine)
    stats = monitor.run()
    n_shocks = sum(int(s.get("shocks", 0) or 0) for s in stats.values() if isinstance(s, dict))
    if n_shocks > 0:
        task_recalcular_riesgo_politico()


@flow(name="ElectSim: Monitor CIS", log_prints=True)
def flow_cis_monitor():
    from etl.realtime.cis_monitor import CISMonitor

    engine = get_engine()
    monitor = CISMonitor("cis", engine)
    stats = monitor.run()
    if stats.get("nuevos", 0) > 0:
        task_recalcular_clustering()
        task_recalcular_nowcasting()


@flow(name="ElectSim: Alertas", log_prints=True)
def flow_alertas():
    from etl.realtime.alertas import procesar_alertas_pendientes

    engine = get_engine()
    n = procesar_alertas_pendientes(engine)
    if n > 0:
        print(f"Enviadas {n} alertas")


@flow(name="ElectSim: Recálculo Diario", log_prints=True)
def flow_recalculo_diario():
    task_recalcular_nowcasting()
    task_recalcular_riesgo_politico()
    task_recalcular_pedersen()
    task_recalcular_stress_test()


@flow(name="ElectSim: Noche electoral", log_prints=True)
def flow_noche_electoral():
    from etl.realtime.interior_noche_electoral import NocheElectoralMonitor, detectar_eleccion_activa

    engine = get_engine()
    if not detectar_eleccion_activa(engine):
        logger.info("Sin elección activa; se omite noche electoral.")
        return
    mon = NocheElectoralMonitor("interior_noche", engine)
    mon.run(n_ciclos=1)


def _deploy() -> None:
    try:
        from prefect.deployments import Deployment
        from prefect.server.schemas.schedules import CronSchedule, IntervalSchedule
    except ImportError as e:
        logger.error("No se pudo importar deployments: %s", e)
        return

    Deployment.build_from_flow(
        flow=flow_cis_monitor,
        name="cis-semanal",
        schedule=CronSchedule(cron="0 9 * * 1", timezone="Europe/Madrid"),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    Deployment.build_from_flow(
        flow=flow_prensa_encuestas,
        name="prensa-6h",
        schedule=IntervalSchedule(interval=timedelta(hours=6)),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    Deployment.build_from_flow(
        flow=flow_macro_monitor,
        name="macro-hora",
        schedule=IntervalSchedule(interval=timedelta(hours=1)),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    Deployment.build_from_flow(
        flow=flow_recalculo_diario,
        name="diario-07",
        schedule=CronSchedule(cron="0 7 * * *", timezone="Europe/Madrid"),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    Deployment.build_from_flow(
        flow=flow_alertas,
        name="alertas-15m",
        schedule=IntervalSchedule(interval=timedelta(minutes=15)),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    Deployment.build_from_flow(
        flow=flow_noche_electoral,
        name="noche-electoral",
        schedule=IntervalSchedule(interval=timedelta(minutes=5)),
        work_pool_name="electsim-pool",
        tags=["electsim", "realtime"],
    ).apply()
    logger.info("Deployments registrados en API Prefect (pool electsim-pool).")


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser(description="Scheduler tiempo real ElectSim")
    p.add_argument("--deploy", action="store_true", help="Registrar deployments en Prefect")
    p.add_argument(
        "--flow",
        choices=("prensa", "macro", "cis", "diario", "alertas", "noche"),
        help="Ejecutar un flow localmente",
    )
    args = p.parse_args()
    if args.deploy:
        _deploy()
        return
    if args.flow == "prensa":
        flow_prensa_encuestas()
    elif args.flow == "macro":
        flow_macro_monitor()
    elif args.flow == "cis":
        flow_cis_monitor()
    elif args.flow == "diario":
        flow_recalculo_diario()
    elif args.flow == "alertas":
        flow_alertas()
    elif args.flow == "noche":
        flow_noche_electoral()
    else:
        p.print_help()


if __name__ == "__main__":
    main()
