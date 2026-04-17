"""
Calibración de agentes LLM vs microdatos CIS reales.

Compara distribuciones de respuesta sintéticas (simulaciones de agentes)
con distribuciones reales de encuestas CIS para verificar que los agentes
son representativos de la población española.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats
from sqlalchemy import text
from sqlalchemy.engine import Engine

log = logging.getLogger(__name__)


@dataclass
class ResultadoCalibracion:
    run_id: str
    # Ideología (escala 1-10)
    ks_stat_ideologia: float
    ks_pvalue_ideologia: float
    media_ideologia_real: float
    media_ideologia_sintetica: float
    # Intención de voto
    mad_intencion_voto: float          # Mean Absolute Deviation por partido (pp)
    chi2_stat_intencion: float
    chi2_pvalue_intencion: float
    # Situación económica
    mad_economia: float
    # Resumen
    n_real: int
    n_sintetico: int
    agentes_calibrados: bool           # True si todos los tests pasan umbral
    detalles: dict = field(default_factory=dict)


def _cargar_microdatos_cis(engine: Engine, n_recientes: int = 3) -> pd.DataFrame:
    """Carga microdatos CIS de los N barómetros más recientes."""
    q = text("""
        SELECT
            m.ideo_escala,
            m.intencion_voto_partido_id,
            p.siglas AS partido_siglas,
            m.valoracion_situacion_economica,
            m.ponderacion
        FROM microdatos_encuesta m
        LEFT JOIN partidos p ON p.id = m.intencion_voto_partido_id
        JOIN encuestas e ON e.id = m.encuesta_id
        JOIN fuentes_encuesta f ON f.id = e.fuente_id
        WHERE f.nombre ILIKE '%CIS%'
        AND e.fecha_trabajo_fin IS NOT NULL
        ORDER BY e.fecha_trabajo_fin DESC
        LIMIT 10000
    """)
    try:
        with engine.connect() as conn:
            return pd.read_sql(q, conn)
    except Exception as exc:
        log.warning("No se pudieron cargar microdatos CIS: %s", exc)
        return pd.DataFrame()


def _cargar_simulaciones_agentes(engine: Engine, n_recientes: int = 1) -> pd.DataFrame:
    """Carga la última simulación de encuesta sintética de agentes."""
    q = text("""
        SELECT
            respuestas_json,
            n_agentes,
            cluster_id
        FROM simulaciones_encuesta
        ORDER BY created_at DESC
        LIMIT :n
    """)
    try:
        with engine.connect() as conn:
            return pd.read_sql(q, conn, params={"n": n_recientes})
    except Exception as exc:
        log.warning("No se pudieron cargar simulaciones de agentes: %s", exc)
        return pd.DataFrame()


def _extraer_distribuciones_sinteticas(df_sim: pd.DataFrame) -> dict:
    """Descomprime respuestas JSON de agentes en distribuciones."""
    ideologias = []
    intenciones: dict[str, int] = {}
    economias = []

    for _, row in df_sim.iterrows():
        try:
            resp = json.loads(row["respuestas_json"]) if isinstance(row["respuestas_json"], str) else {}
        except Exception:
            continue

        if "ideologia" in resp:
            ideologias.append(float(resp["ideologia"]))
        if "intencion_voto" in resp:
            p = resp["intencion_voto"]
            intenciones[p] = intenciones.get(p, 0) + 1
        if "economia" in resp:
            economias.append(float(resp["economia"]))

    return {
        "ideologias": np.array(ideologias),
        "intenciones": intenciones,
        "economias": np.array(economias),
    }


def calibrar_agentes(
    engine: Engine,
    guardar_bd: bool = True,
    umbral_ks_pvalue: float = 0.05,
    umbral_mad_voto: float = 5.0,     # pp
) -> ResultadoCalibracion:
    """Compara distribuciones sintéticas de agentes con CIS real."""
    run_id = f"cal_{uuid.uuid4().hex[:8]}"

    df_cis = _cargar_microdatos_cis(engine)
    df_sim = _cargar_simulaciones_agentes(engine)

    if df_cis.empty or df_sim.empty:
        log.warning("Datos insuficientes para calibración (CIS=%d, sim=%d)", len(df_cis), len(df_sim))
        return ResultadoCalibracion(
            run_id=run_id,
            ks_stat_ideologia=0.0,
            ks_pvalue_ideologia=1.0,
            media_ideologia_real=5.0,
            media_ideologia_sintetica=5.0,
            mad_intencion_voto=0.0,
            chi2_stat_intencion=0.0,
            chi2_pvalue_intencion=1.0,
            mad_economia=0.0,
            n_real=len(df_cis),
            n_sintetico=len(df_sim),
            agentes_calibrados=False,
            detalles={"advertencia": "Datos insuficientes; imposible calibrar"},
        )

    dist_sint = _extraer_distribuciones_sinteticas(df_sim)

    # ── Ideología ──
    ideo_real = df_cis["ideo_escala"].dropna().values
    ideo_sint = dist_sint["ideologias"]

    if len(ideo_real) > 0 and len(ideo_sint) > 0:
        ks_stat, ks_pval = stats.ks_2samp(ideo_real, ideo_sint)
        media_real = float(np.average(ideo_real, weights=df_cis["ponderacion"].fillna(1).values[: len(ideo_real)]))
        media_sint = float(np.mean(ideo_sint))
    else:
        ks_stat, ks_pval = 0.0, 1.0
        media_real = 5.0
        media_sint = 5.0

    # ── Intención de voto ──
    intencion_real = (
        df_cis["partido_siglas"].value_counts(normalize=True).mul(100).to_dict()
        if "partido_siglas" in df_cis.columns
        else {}
    )
    intencion_sint = {
        k: v / max(sum(dist_sint["intenciones"].values()), 1) * 100
        for k, v in dist_sint["intenciones"].items()
    }

    todos_partidos = sorted(set(intencion_real) | set(intencion_sint))
    if todos_partidos:
        vec_real = np.array([intencion_real.get(p, 0.0) for p in todos_partidos]) + 0.01
        vec_sint = np.array([intencion_sint.get(p, 0.0) for p in todos_partidos]) + 0.01
        mad_intencion = float(np.mean(np.abs(vec_real - vec_sint)))
        # Chi-cuadrado de Pearson (frecuencias absolutas)
        n_real_total = len(df_cis)
        n_sint_total = max(sum(dist_sint["intenciones"].values()), 1)
        obs_real = vec_real / 100 * n_real_total
        obs_sint = vec_sint / 100 * n_sint_total
        chi2, chi2_pval = stats.chisquare(obs_sint / obs_sint.sum() * obs_real.sum(), f_exp=obs_real)
    else:
        mad_intencion = 0.0
        chi2, chi2_pval = 0.0, 1.0

    # ── Economía ──
    eco_real = df_cis["valoracion_situacion_economica"].dropna().values if "valoracion_situacion_economica" in df_cis.columns else np.array([])
    eco_sint = dist_sint["economias"]
    if len(eco_real) > 0 and len(eco_sint) > 0:
        mad_eco = float(np.mean(np.abs(eco_real.mean() - eco_sint.mean())))
    else:
        mad_eco = 0.0

    agentes_ok = (
        ks_pval >= umbral_ks_pvalue
        and mad_intencion <= umbral_mad_voto
    )

    resultado = ResultadoCalibracion(
        run_id=run_id,
        ks_stat_ideologia=round(ks_stat, 6),
        ks_pvalue_ideologia=round(ks_pval, 6),
        media_ideologia_real=round(media_real, 3),
        media_ideologia_sintetica=round(media_sint, 3),
        mad_intencion_voto=round(mad_intencion, 3),
        chi2_stat_intencion=round(float(chi2), 4),
        chi2_pvalue_intencion=round(float(chi2_pval), 6),
        mad_economia=round(mad_eco, 3),
        n_real=len(df_cis),
        n_sintetico=len(df_sim),
        agentes_calibrados=agentes_ok,
        detalles={
            "partidos_comparados": todos_partidos,
            "intencion_real_pct": intencion_real,
            "intencion_sint_pct": intencion_sint,
            "interpretacion": (
                "Agentes bien calibrados" if agentes_ok
                else "Agentes descalibrados: revisar perfiles_votante y prompts"
            ),
        },
    )

    if guardar_bd:
        _guardar_calibracion(engine, resultado)

    log.info(
        "Calibración: KS_ideo=%.4f(p=%.3f) MAD_voto=%.2fpp calibrado=%s",
        ks_stat, ks_pval, mad_intencion, agentes_ok,
    )
    return resultado


def _guardar_calibracion(engine: Engine, r: ResultadoCalibracion) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO resultados_validacion
                    (run_id, tipo, modelo, ks_stat_ideologia, ks_pvalue_ideologia,
                     mad_intencion_voto, detalle_json)
                VALUES
                    (:run_id, 'calibracion', 'agentes_llm',
                     :ks_s, :ks_p, :mad, :detalle)
                ON CONFLICT (run_id) DO NOTHING
            """),
            {
                "run_id": r.run_id,
                "ks_s": r.ks_stat_ideologia,
                "ks_p": r.ks_pvalue_ideologia,
                "mad": r.mad_intencion_voto,
                "detalle": json.dumps(r.detalles, ensure_ascii=False, default=str),
            },
        )
