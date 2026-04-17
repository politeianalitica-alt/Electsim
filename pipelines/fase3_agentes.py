"""
Prefect — Fase 3: agentes, simulación CIS, campaña y propagación en red.
"""

from __future__ import annotations

import json
import logging
import os
import traceback
from dataclasses import asdict

from prefect import flow, task
from sqlalchemy import create_engine, text

from agents.red_social import construir_grafo_perfiles, detectar_estructuras_red, simular_propagacion_campana
from agents.simulador_campana import MensajeCampana, analizar_receptividad, evaluar_mensaje
from agents.simulador_cis import CUESTIONARIO_CIS_BASICO, agregar_respuestas, simular_encuesta

logger = logging.getLogger(__name__)


def verificar_perfiles_en_bd(engine) -> bool:
    with engine.connect() as conn:
        n = conn.execute(text("SELECT COUNT(*) FROM perfiles_votante")).scalar()
    return int(n or 0) > 0


@task(retries=1, retry_delay_seconds=10)
def task_simular_encuesta_cis(engine):
    try:
        df_r = simular_encuesta(
            CUESTIONARIO_CIS_BASICO,
            engine,
            n_perfiles=None,
            usar_rag=True,
        )
        df_a = agregar_respuestas(df_r)
        if df_r.empty:
            logger.warning("Simulación CIS: sin respuestas")
            return df_r, df_a
        pj = json.dumps([asdict(p) for p in CUESTIONARIO_CIS_BASICO], ensure_ascii=False)
        ins = text(
            """
            INSERT INTO simulaciones_encuesta (nombre, n_perfiles, uso_rag, preguntas_json)
            VALUES (:nombre, :np, :ur, :pj)
            """
        )
        with engine.begin() as conn:
            conn.execute(
                ins,
                {
                    "nombre": "flow_fase3_cis_basico",
                    "np": int(len(df_r) / max(len(CUESTIONARIO_CIS_BASICO), 1)),
                    "ur": True,
                    "pj": pj,
                },
            )
        return df_r, df_a
    except Exception:
        logger.error("task_simular_encuesta_cis: %s", traceback.format_exc())
        return None, None


@task(retries=1, retry_delay_seconds=10)
def task_simular_campana_ejemplo(engine):
    sid = None
    try:
        msg = MensajeCampana(
            partido_emisor="PP",
            texto="Propuesta de bajar impuestos a familias trabajadoras.",
            tipo="propuesta_concreta",
            tema="economia",
        )
        react = evaluar_mensaje(msg, engine, n_perfiles=None, usar_rag=True)
        an = analizar_receptividad(react)
        ins = text(
            """
            INSERT INTO simulaciones_campana (
                partido_emisor, texto_mensaje, tipo, tema,
                receptividad_media, cambio_intencion_medio, analisis_json, n_perfiles
            ) VALUES (
                :pe, :tx, :ti, :te, :rm, :cm, :aj, :np
            ) RETURNING id
            """
        )
        sid = None
        with engine.begin() as conn:
            res = conn.execute(
                ins,
                {
                    "pe": msg.partido_emisor,
                    "tx": msg.texto,
                    "ti": msg.tipo,
                    "te": msg.tema,
                    "rm": an["receptividad_media_ponderada"],
                    "cm": an["cambio_intencion_ponderado"],
                    "aj": json.dumps(an, ensure_ascii=False),
                    "np": len(react),
                },
            )
            row = res.fetchone()
            if row is not None:
                sid = int(row[0])
        return react, sid
    except Exception:
        logger.error("task_simular_campana_ejemplo: %s", traceback.format_exc())
        return [], None


@task(retries=1, retry_delay_seconds=10)
def task_propagacion_red(reacciones, sim_campana_id, engine):
    try:
        if not reacciones:
            logger.warning("Propagación: sin reacciones")
            return
        impacto = {int(r.perfil_cluster_id): float(r.cambio_intencion_voto) for r in reacciones}
        G = construir_grafo_perfiles(engine)
        df_prop = simular_propagacion_campana(G, impacto, engine, n_iter=100)
        metricas = detectar_estructuras_red(G)
        ins = text(
            """
            INSERT INTO propagaciones_red (
                simulacion_campana_id, n_iteraciones, resultados_json, metricas_red_json
            ) VALUES (:sc, :ni, :rj, :mj)
            """
        )
        with engine.begin() as conn:
            conn.execute(
                ins,
                {
                    "sc": sim_campana_id,
                    "ni": 100,
                    "rj": df_prop.to_json(orient="records", force_ascii=False),
                    "mj": json.dumps(metricas, ensure_ascii=False),
                },
            )
    except Exception:
        logger.error("task_propagacion_red: %s", traceback.format_exc())


@task(retries=1, retry_delay_seconds=10)
def task_generar_resumen_fase3(engine):
    try:
        with engine.connect() as conn:
            ne = conn.execute(text("SELECT COUNT(*) FROM simulaciones_encuesta")).scalar()
            nc = conn.execute(text("SELECT COUNT(*) FROM simulaciones_campana")).scalar()
        logger.info("Resumen Fase 3: simulaciones_encuesta=%s simulaciones_campana=%s", ne, nc)
    except Exception:
        logger.warning("task_generar_resumen_fase3: %s", traceback.format_exc())


@flow(name="ElectSim-España: Fase 3 — Agentes LLM")
def run_fase3():
    url = os.getenv("DATABASE_URL")
    if not url:
        logger.error("DATABASE_URL no está definida")
        return
    engine = create_engine(url)
    if not verificar_perfiles_en_bd(engine):
        logger.error(
            "Abort: no hay perfiles_votante en BD. Ejecute clustering (Fase 2) antes."
        )
        return

    task_simular_encuesta_cis(engine)
    react, sid = task_simular_campana_ejemplo(engine)
    task_propagacion_red(react, sid, engine)
    task_generar_resumen_fase3(engine)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_fase3()
