"""
Fase 5 — Pipeline de Validación

Orquesta con Prefect:
  1. Calidad de datos (checks por tabla)
  2. Backtesting electoral (leave-one-out, generales)
  3. Calibración de agentes LLM vs CIS real
  4. Generación del informe HTML

Uso:
    python -m pipelines.fase5_validacion
    python -m pipelines.fase5_validacion --tipo autonomicas
    python -m pipelines.fase5_validacion --solo-calidad
"""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime
from pathlib import Path

from prefect import flow, task
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from validation.backtesting import BacktestResults, run_backtesting
from validation.calibracion_agentes import ResultadoCalibracion, calibrar_agentes
from validation.calidad_datos import ReporteCalidad, run_calidad_datos
from validation.informe import guardar_informe

log = logging.getLogger(__name__)


def _engine() -> Engine:
    url = os.environ["DATABASE_URL"]
    return create_engine(url, pool_pre_ping=True)


# ─── Tasks ────────────────────────────────────────────────────────────────────

@task(name="calidad-datos", retries=1)
def task_calidad_datos(guardar_bd: bool = True) -> ReporteCalidad:
    log.info("▶ Calidad de datos")
    engine = _engine()
    resultado = run_calidad_datos(engine, guardar_bd=guardar_bd)
    log.info(
        "Calidad: %s — %d/%d checks OK",
        resultado.semaforo.upper(),
        resultado.n_ok,
        resultado.n_ok + resultado.n_fail,
    )
    return resultado


@task(name="backtesting-electoral", retries=1)
def task_backtesting(tipo_eleccion: str = "generales", guardar_bd: bool = True) -> BacktestResults:
    log.info("▶ Backtesting electoral (%s)", tipo_eleccion)
    engine = _engine()
    resultado = run_backtesting(engine, tipo_eleccion=tipo_eleccion, guardar_bd=guardar_bd)
    log.info(
        "Backtesting: %d elecciones, BS=%.4f, MAE_esc=%.1f",
        resultado.n_elecciones,
        resultado.metricas_globales.brier_score,
        resultado.mae_escanos,
    )
    return resultado


@task(name="calibracion-agentes", retries=1)
def task_calibracion(guardar_bd: bool = True) -> ResultadoCalibracion:
    log.info("▶ Calibración de agentes LLM")
    engine = _engine()
    resultado = calibrar_agentes(engine, guardar_bd=guardar_bd)
    log.info(
        "Calibración: %s — KS=%.4f MAD_voto=%.2f pp",
        "OK" if resultado.agentes_calibrados else "FAIL",
        resultado.ks_stat_ideologia,
        resultado.mad_intencion_voto,
    )
    return resultado


@task(name="generar-informe")
def task_informe(
    backtesting: BacktestResults,
    calibracion: ResultadoCalibracion,
    calidad: ReporteCalidad,
) -> str:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = Path("data/outputs") / f"informe_validacion_{ts}.html"
    path = guardar_informe(output_path, backtesting, calibracion, calidad)
    log.info("Informe HTML generado: %s", path)
    return str(path)


# ─── Flow ─────────────────────────────────────────────────────────────────────

@flow(name="fase5-validacion", log_prints=True)
def fase5_validacion_flow(
    tipo_eleccion: str = "generales",
    guardar_bd: bool = True,
    solo_calidad: bool = False,
) -> dict:
    """Flow principal de validación del sistema ElectSim."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    calidad = task_calidad_datos(guardar_bd=guardar_bd)

    if solo_calidad:
        path = guardar_informe(
            f"data/outputs/informe_calidad_{datetime.now():%Y%m%d_%H%M%S}.html",
            calidad=calidad,
        )
        return {"calidad": calidad.semaforo, "informe": str(path)}

    backtesting = task_backtesting(tipo_eleccion=tipo_eleccion, guardar_bd=guardar_bd)
    calibracion = task_calibracion(guardar_bd=guardar_bd)
    informe_path = task_informe(backtesting, calibracion, calidad)

    # Resumen final
    resumen = {
        "calidad_semaforo": calidad.semaforo,
        "calidad_pct_ok": calidad.pct_completitud_global,
        "backtesting_n_elecciones": backtesting.n_elecciones,
        "backtesting_brier_score": backtesting.metricas_globales.brier_score,
        "backtesting_mae_escanos": backtesting.mae_escanos,
        "calibracion_ok": calibracion.agentes_calibrados,
        "calibracion_ks": calibracion.ks_stat_ideologia,
        "calibracion_mad_voto": calibracion.mad_intencion_voto,
        "informe": informe_path,
    }

    print("\n" + "=" * 60)
    print("RESUMEN VALIDACIÓN ELECTSIM ESPAÑA")
    print("=" * 60)
    print(f"  Calidad datos:   {calidad.semaforo.upper()} ({calidad.pct_completitud_global}% checks OK)")
    print(f"  Backtesting:     {backtesting.n_elecciones} elecciones | BS={backtesting.metricas_globales.brier_score:.4f} | MAE_esc={backtesting.mae_escanos:.1f}")
    print(f"  Agentes LLM:     {'CALIBRADO ✓' if calibracion.agentes_calibrados else 'DESCALIBRADO ✗'} | MAD={calibracion.mad_intencion_voto:.2f}pp")
    print(f"  Informe:         {informe_path}")
    print("=" * 60)

    return resumen


# ─── CLI ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ElectSim — Fase 5: Validación")
    parser.add_argument("--tipo", default="generales", choices=["generales", "autonomicas", "municipales", "europeas"])
    parser.add_argument("--no-guardar", action="store_true", help="No persiste resultados en BD")
    parser.add_argument("--solo-calidad", action="store_true", help="Solo ejecuta checks de calidad")
    args = parser.parse_args()

    fase5_validacion_flow(
        tipo_eleccion=args.tipo,
        guardar_bd=not args.no_guardar,
        solo_calidad=args.solo_calidad,
    )
