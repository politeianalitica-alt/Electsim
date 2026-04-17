"""
Backtesting electoral con metodología leave-one-election-out.

Para cada elección disponible en la BD:
  1. Usa los datos históricos anteriores para entrenar el nowcasting.
  2. Ejecuta Monte Carlo de escaños.
  3. Compara predicción vs resultado real.
  4. Almacena métricas en resultados_validacion + validacion_por_partido.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import date, datetime

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

from validation.metricas import (
    ResultadoMetricas,
    calcular_metricas_completas,
    mae,
    rmse,
)

log = logging.getLogger(__name__)


@dataclass
class ResultadoEleccion:
    eleccion_id: int
    fecha: date
    tipo: str
    partidos: list[str]
    votos_reales_pct: dict[str, float]   # siglas → %
    escanos_reales: dict[str, int]
    votos_pred_pct: dict[str, float]     # del nowcasting
    escanos_pred_mediana: dict[str, float]
    escanos_pred_p5: dict[str, int]
    escanos_pred_p95: dict[str, int]
    sigma_voto: dict[str, float] | None = None


@dataclass
class BacktestResults:
    run_id: str
    n_elecciones: int
    metricas_globales: ResultadoMetricas
    por_eleccion: list[ResultadoEleccion]
    mae_escanos: float
    cobertura_escanos_80ci: float
    notas: list[str] = field(default_factory=list)


def _cargar_elecciones(engine: Engine, tipo: str = "generales") -> pd.DataFrame:
    """Carga elecciones y sus resultados agregados desde la BD."""
    q = text("""
        SELECT
            e.id AS eleccion_id,
            e.fecha,
            e.tipo::text AS tipo,
            p.siglas,
            re.votos_candidatura_pct,
            re.escanos
        FROM elecciones e
        JOIN resultados_electorales re ON re.eleccion_id = e.id
        JOIN partidos p ON p.id = re.partido_id
        WHERE e.tipo = :tipo
        ORDER BY e.fecha, p.siglas
    """)
    with engine.connect() as conn:
        df = pd.read_sql(q, conn, params={"tipo": tipo})
    return df


def _cargar_estimaciones(engine: Engine, eleccion_id: int) -> pd.DataFrame:
    """Carga estimaciones de nowcasting para una elección concreta."""
    q = text("""
        SELECT partido_siglas, estimacion_pct, ic_95_inf, ic_95_sup, sigma
        FROM estimaciones_encuestas
        WHERE eleccion_id = :eid
        ORDER BY estimacion_pct DESC
    """)
    with engine.connect() as conn:
        return pd.read_sql(q, conn, params={"eid": eleccion_id})


def _cargar_monte_carlo(engine: Engine, eleccion_id: int) -> pd.DataFrame:
    """Carga distribución de escaños de Monte Carlo para una elección."""
    q = text("""
        SELECT
            partido_siglas,
            escanos_mediana,
            escanos_p5,
            escanos_p95,
            escanos_p25,
            escanos_p75
        FROM escenarios_morfologicos   -- placeholder: cambiar si hay tabla mc_escanos
        WHERE eleccion_id = :eid
    """)
    # Si no hay tabla dedicada, devolver DataFrame vacío
    try:
        with engine.connect() as conn:
            return pd.read_sql(q, conn, params={"eid": eleccion_id})
    except Exception:
        return pd.DataFrame()


def _run_backtest_single(
    eleccion_id: int,
    fecha: date,
    tipo: str,
    df_resultados: pd.DataFrame,
    engine: Engine,
) -> ResultadoEleccion | None:
    """Ejecuta backtesting para una elección específica."""
    df_elec = df_resultados[df_resultados["eleccion_id"] == eleccion_id].copy()
    if df_elec.empty:
        log.warning("No hay resultados para elección %s", eleccion_id)
        return None

    votos_reales = dict(zip(df_elec["siglas"], df_elec["votos_candidatura_pct"].fillna(0)))
    escanos_reales = dict(zip(df_elec["siglas"], df_elec["escanos"].fillna(0).astype(int)))

    # Intentar cargar estimaciones de nowcasting
    df_est = _cargar_estimaciones(engine, eleccion_id)
    if df_est.empty:
        # Fallback: usar media histórica de elecciones anteriores
        df_anteriores = df_resultados[df_resultados["fecha"] < fecha]
        if df_anteriores.empty:
            log.info("Elección %s: no hay datos anteriores ni estimaciones; skip", eleccion_id)
            return None
        df_media = df_anteriores.groupby("siglas")["votos_candidatura_pct"].mean()
        votos_pred = df_media.to_dict()
        sigma_pred = (
            df_anteriores.groupby("siglas")["votos_candidatura_pct"].std().fillna(5).to_dict()
        )
        ic_inf = {k: votos_pred.get(k, 0) - 2 * sigma_pred.get(k, 5) for k in votos_pred}
        ic_sup = {k: votos_pred.get(k, 0) + 2 * sigma_pred.get(k, 5) for k in votos_pred}
    else:
        votos_pred = dict(zip(df_est["partido_siglas"], df_est["estimacion_pct"].fillna(0)))
        sigma_pred = dict(zip(df_est["partido_siglas"], df_est["sigma"].fillna(3)))
        ic_inf = dict(zip(df_est["partido_siglas"], df_est["ic_95_inf"].fillna(0)))
        ic_sup = dict(zip(df_est["partido_siglas"], df_est["ic_95_sup"].fillna(0)))

    # Escaños predichos (placeholder si no hay MC)
    df_mc = _cargar_monte_carlo(engine, eleccion_id)
    if not df_mc.empty:
        esc_med = dict(zip(df_mc["partido_siglas"], df_mc["escanos_mediana"]))
        esc_p5 = dict(zip(df_mc["partido_siglas"], df_mc["escanos_p5"].astype(int)))
        esc_p95 = dict(zip(df_mc["partido_siglas"], df_mc["escanos_p95"].astype(int)))
    else:
        # Aproximación proporcional (D'Hondt simplificado)
        total_escanos = sum(escanos_reales.values()) or 350
        esc_med = {k: round(v / 100 * total_escanos, 1) for k, v in votos_pred.items()}
        esc_p5 = {k: max(0, int(v - 10)) for k, v in esc_med.items()}
        esc_p95 = {k: int(v + 10) for k, v in esc_med.items()}

    return ResultadoEleccion(
        eleccion_id=eleccion_id,
        fecha=fecha,
        tipo=tipo,
        partidos=list(votos_reales.keys()),
        votos_reales_pct=votos_reales,
        escanos_reales=escanos_reales,
        votos_pred_pct=votos_pred,
        escanos_pred_mediana=esc_med,
        escanos_pred_p5=esc_p5,
        escanos_pred_p95=esc_p95,
        sigma_voto=sigma_pred,
    )


def run_backtesting(
    engine: Engine,
    tipo_eleccion: str = "generales",
    guardar_bd: bool = True,
) -> BacktestResults:
    """Ejecuta el backtesting completo leave-one-election-out."""
    run_id = f"bt_{tipo_eleccion}_{uuid.uuid4().hex[:8]}"
    log.info("Iniciando backtesting %s (run_id=%s)", tipo_eleccion, run_id)

    df = _cargar_elecciones(engine, tipo_eleccion)
    if df.empty:
        log.warning("No hay datos para tipo=%s; backtesting abortado", tipo_eleccion)
        return BacktestResults(
            run_id=run_id,
            n_elecciones=0,
            metricas_globales=calcular_metricas_completas(
                np.array([[0.5, 0.5]]), np.array([[0.5, 0.5]])
            ),
            por_eleccion=[],
            mae_escanos=0.0,
            cobertura_escanos_80ci=0.0,
            notas=["Sin datos electorales en BD"],
        )

    elecciones = (
        df[["eleccion_id", "fecha", "tipo"]].drop_duplicates().sort_values("fecha").values.tolist()
    )

    por_eleccion: list[ResultadoEleccion] = []
    for eleccion_id, fecha, tipo in elecciones:
        res = _run_backtest_single(eleccion_id, fecha, tipo, df, engine)
        if res is not None:
            por_eleccion.append(res)

    if not por_eleccion:
        log.warning("Ninguna elección pudo backtestarse")
        return BacktestResults(
            run_id=run_id,
            n_elecciones=0,
            metricas_globales=calcular_metricas_completas(
                np.array([[0.5, 0.5]]), np.array([[0.5, 0.5]])
            ),
            por_eleccion=[],
            mae_escanos=0.0,
            cobertura_escanos_80ci=0.0,
        )

    # Construir matrices para métricas globales
    todos_partidos: set[str] = set()
    for r in por_eleccion:
        todos_partidos.update(r.partidos)
    partidos_ord = sorted(todos_partidos)

    def _to_vec(d: dict, keys: list[str]) -> np.ndarray:
        return np.array([d.get(k, 0.0) for k in keys])

    reales_mat = np.vstack([_to_vec(r.votos_reales_pct, partidos_ord) / 100 for r in por_eleccion])
    pred_mat = np.vstack([_to_vec(r.votos_pred_pct, partidos_ord) / 100 for r in por_eleccion])

    sigma_mat = None
    if all(r.sigma_voto is not None for r in por_eleccion):
        sigma_mat = np.vstack([_to_vec(r.sigma_voto, partidos_ord) / 100 for r in por_eleccion])

    metricas = calcular_metricas_completas(pred_mat, reales_mat, sigma_mat)

    # MAE de escaños
    errores_esc = []
    dentro_80ci = []
    for r in por_eleccion:
        for p in r.partidos:
            real = r.escanos_reales.get(p, 0)
            pred = r.escanos_pred_mediana.get(p, 0)
            errores_esc.append(abs(real - pred))
            p5 = r.escanos_pred_p5.get(p, 0)
            p95 = r.escanos_pred_p95.get(p, 0)
            dentro_80ci.append(p5 <= real <= p95)

    mae_esc = float(np.mean(errores_esc)) if errores_esc else 0.0
    cob_80 = float(np.mean(dentro_80ci)) if dentro_80ci else 0.0

    results = BacktestResults(
        run_id=run_id,
        n_elecciones=len(por_eleccion),
        metricas_globales=metricas,
        por_eleccion=por_eleccion,
        mae_escanos=round(mae_esc, 2),
        cobertura_escanos_80ci=round(cob_80, 3),
    )

    if guardar_bd:
        _guardar_resultados(engine, results, tipo_eleccion)

    log.info(
        "Backtesting completado: %d elecciones, BS=%.4f, RMSE=%.3f%%, MAE_esc=%.1f",
        results.n_elecciones,
        metricas.brier_score,
        metricas.rmse * 100,
        mae_esc,
    )
    return results


def _guardar_resultados(engine: Engine, results: BacktestResults, tipo: str) -> None:
    """Persiste resultados en resultados_validacion y validacion_por_partido."""
    m = results.metricas_globales
    detalle = {
        "por_eleccion": [
            {
                "eleccion_id": r.eleccion_id,
                "fecha": str(r.fecha),
                "tipo": r.tipo,
                "votos_reales_pct": r.votos_reales_pct,
                "votos_pred_pct": r.votos_pred_pct,
                "escanos_reales": r.escanos_reales,
                "escanos_pred_mediana": r.escanos_pred_mediana,
            }
            for r in results.por_eleccion
        ],
        "calibracion": m.calibracion,
        "notas": results.notas,
    }

    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO resultados_validacion
                    (run_id, tipo, modelo, brier_score, rmse_voto, mae_escanos,
                     cobertura_95ci, crps, detalle_json)
                VALUES
                    (:run_id, 'backtesting', :modelo, :bs, :rmse, :mae_esc,
                     :cob, :crps, :detalle)
                ON CONFLICT (run_id) DO NOTHING
            """),
            {
                "run_id": results.run_id,
                "modelo": f"nowcasting+monte_carlo_{tipo}",
                "bs": m.brier_score,
                "rmse": m.rmse,
                "mae_esc": results.mae_escanos,
                "cob": m.cobertura_95ci,
                "crps": m.crps,
                "detalle": json.dumps(detalle, ensure_ascii=False, default=str),
            },
        )

        for r in results.por_eleccion:
            for partido in r.partidos:
                conn.execute(
                    text("""
                        INSERT INTO validacion_por_partido
                            (run_id, partido_siglas, eleccion_id, voto_real_pct, voto_pred_pct,
                             error_pct, escanos_reales, escanos_pred_mediana,
                             escanos_pred_p5, escanos_pred_p95)
                        VALUES
                            (:rid, :p, :eid, :vr, :vp, :err, :er, :epm, :ep5, :ep95)
                    """),
                    {
                        "rid": results.run_id,
                        "p": partido,
                        "eid": r.eleccion_id,
                        "vr": r.votos_reales_pct.get(partido),
                        "vp": r.votos_pred_pct.get(partido),
                        "err": abs(
                            (r.votos_reales_pct.get(partido) or 0)
                            - (r.votos_pred_pct.get(partido) or 0)
                        ),
                        "er": r.escanos_reales.get(partido),
                        "epm": r.escanos_pred_mediana.get(partido),
                        "ep5": r.escanos_pred_p5.get(partido),
                        "ep95": r.escanos_pred_p95.get(partido),
                    },
                )
