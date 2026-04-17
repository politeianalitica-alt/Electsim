"""
Índice de riesgo político compuesto (varias dimensiones desde BD).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

COLUMNAS_SHOCK_MACRO: frozenset[str] = frozenset(
    {
        "ipc_general",
        "crecimiento_pib",
        "tasa_paro",
        "prima_riesgo_bono10",
        "precio_luz_kwh_residencial",
    }
)


def detectar_shocks_economicos(
    variable_bd: str,
    engine,
    dias_recientes: int = 7,
    hist_min_filas: int = 8,
    umbral_z: float = 2.0,
) -> list[dict]:
    """
    Compara el último dato en los últimos ``dias_recientes`` con la media histórica previa.
    Devuelve lista de dicts con zscore, valor, fecha y dirección ('alza' / 'baja').
    """
    if variable_bd not in COLUMNAS_SHOCK_MACRO:
        return []
    cast_tp = "DOUBLE PRECISION" if engine.dialect.name == "postgresql" else "REAL"
    sql = text(
        f"""
        SELECT fecha, CAST({variable_bd} AS {cast_tp}) AS v
        FROM indicadores_macroeconomicos
        WHERE {variable_bd} IS NOT NULL
        ORDER BY fecha ASC
        """
    )
    try:
        with engine.connect() as conn:
            df = pd.read_sql(sql, conn)
    except Exception:
        logger.exception("detectar_shocks_economicos: consulta fallida")
        return []
    if df.empty or len(df) < hist_min_filas:
        return []
    df["fecha"] = pd.to_datetime(df["fecha"])
    corte = pd.Timestamp.now().normalize() - pd.Timedelta(days=dias_recientes)
    reciente = df[df["fecha"] >= corte]
    if reciente.empty:
        return []
    ult = reciente.iloc[-1]
    valor = float(ult["v"])
    fecha = ult["fecha"]
    hist = df[df["fecha"] < fecha]
    if len(hist) < hist_min_filas - 1:
        return []
    serie = hist["v"].astype(float)
    mu = float(serie.mean())
    sigma = float(serie.std(ddof=1) or 0.0)
    if sigma < 1e-9:
        return []
    z = (valor - mu) / sigma
    if abs(z) <= umbral_z:
        return []
    return [
        {
            "zscore": round(z, 4),
            "valor": valor,
            "fecha": fecha.isoformat(),
            "direccion": "alza" if z > 0 else "baja",
            "variable": variable_bd,
        }
    ]

PESOS_DIMENSIONES: dict[str, float] = {
    "inestabilidad_gubernamental": 0.25,
    "riesgo_economico_social": 0.30,
    "conflicto_territorial": 0.20,
    "polarizacion_politica": 0.15,
    "riesgo_institucional": 0.10,
}


def calcular_riesgo_inestabilidad_gubernamental(engine) -> float:
    sql_enp = text(
        """
        WITH ult AS (
            SELECT id FROM elecciones WHERE tipo = 'generales' ORDER BY fecha DESC LIMIT 1
        ),
        esc AS (
            SELECT SUM(re.escanos)::float / 350.0 AS prop
            FROM resultados_electorales re
            WHERE re.eleccion_id = (SELECT id FROM ult) AND re.escanos > 0
            GROUP BY re.partido_id
        )
        SELECT 1.0 / NULLIF(SUM(prop * prop), 0) AS enp FROM esc
        """
    )
    try:
        with engine.connect() as conn:
            enp = conn.execute(sql_enp).scalar()
        ped = 10.0
        enp = float(enp or 3.5)
        ped = float(ped or 10.0)
        r_enp = min(100.0, (enp - 2.0) / 6.0 * 100.0)
        r_ped = min(100.0, ped / 25.0 * 100.0)
        sql_dur = text(
            """
            SELECT AVG(
                EXTRACT(EPOCH FROM (COALESCE(fecha_fin, NOW()) - fecha_inicio)) / 2592000
            ) AS meses
            FROM (
                SELECT fecha_inicio, fecha_fin FROM legislaturas
                WHERE ambito = 'nacional' ORDER BY fecha_inicio DESC LIMIT 3
            ) s
            """
        )
        with engine.connect() as conn:
            dur = conn.execute(sql_dur).scalar()
        dur_m = float(dur or 36.0)
        r_dur = min(100.0, max(0.0, (48.0 - dur_m) / 48.0 * 100.0))
        return float(np.mean([r_enp, r_ped, r_dur]))
    except Exception:
        logger.exception("inestabilidad_gubernamental: fallback 50")
        return 50.0


def calcular_riesgo_economico_social(engine) -> float:
    sql = text(
        """
        SELECT
            (SELECT AVG(tasa_paro) FROM mercado_laboral_provincial
             WHERE año = EXTRACT(YEAR FROM CURRENT_DATE)::int - 1 AND trimestre = 4) AS paro,
            (SELECT ipc_general FROM indicadores_macroeconomicos
             WHERE frecuencia = 'mensual' ORDER BY fecha DESC LIMIT 1) AS ipc,
            (SELECT deficit_publico_pib FROM indicadores_macroeconomicos
             WHERE frecuencia = 'anual' ORDER BY fecha DESC LIMIT 1) AS deficit
        """
    )
    try:
        with engine.connect() as conn:
            r = conn.execute(sql).fetchone()
        paro = float(r[0] or 12.0)
        ipc = abs(float(r[1] or 3.0))
        deficit = abs(float(r[2] or 3.5))
        r_paro = min(100.0, paro / 25.0 * 100.0)
        r_ipc = min(100.0, ipc / 10.0 * 100.0)
        r_def = min(100.0, deficit / 8.0 * 100.0)
        sql2 = text(
            """
            SELECT AVG(
                CASE COALESCE(m.situacion_economica_españa, '')
                    WHEN 'muy_mala' THEN 100.0
                    WHEN 'mala' THEN 75.0
                    WHEN 'regular' THEN 50.0
                    WHEN 'buena' THEN 25.0
                    WHEN 'muy_buena' THEN 0.0
                    ELSE 50.0
                END
            ) AS ins
            FROM microdatos_encuesta m
            WHERE m.encuesta_id = (SELECT MAX(id) FROM encuestas)
            """
        )
        with engine.connect() as conn:
            ins = conn.execute(sql2).scalar()
        insatisfaccion = float(ins or 50.0)
        return float(
            np.average([r_paro, r_ipc, r_def, insatisfaccion], weights=[0.35, 0.25, 0.20, 0.20])
        )
    except Exception:
        logger.exception("riesgo_economico_social: fallback 50")
        return 50.0


def calcular_riesgo_polarizacion(engine) -> float:
    sql = text(
        """
        SELECT
            STDDEV(m.escala_ideologica) AS desv,
            AVG(CASE WHEN m.escala_ideologica <= 3 THEN 1.0 ELSE 0 END) * 100 AS pizq,
            AVG(CASE WHEN m.escala_ideologica >= 8 THEN 1.0 ELSE 0 END) * 100 AS pdcha
        FROM microdatos_encuesta m
        WHERE m.escala_ideologica IS NOT NULL
          AND m.encuesta_id = (SELECT id FROM encuestas ORDER BY fecha_publicacion DESC NULLS LAST LIMIT 1)
        """
    )
    try:
        with engine.connect() as conn:
            r = conn.execute(sql).fetchone()
        sigma = float(r[0] or 2.5)
        pct_ext = float((r[1] or 10.0) + (r[2] or 10.0))
        r_sig = min(100.0, (sigma - 1.5) / 2.5 * 100.0)
        r_ext = min(100.0, pct_ext / 50.0 * 100.0)
        return float(np.mean([r_sig, r_ext]))
    except Exception:
        return 50.0


def calcular_riesgo_territorial(engine) -> float:
    """
    Proxy: suma del % de voto nacional a partidos nacionalistas/independentistas
    en la última general (ERC, JUNTS, EH-BILDU, BNG). 0%% → 0 riesgo, 25%%+ → 100.
    No sustituye un índice de conflicto territorial cualitativo.
    """
    siglas = ("ERC", "JUNTS", "EH-BILDU", "BNG")
    try:
        with engine.connect() as conn:
            # Simplificación: agregado por partido en última elección
            df = pd.read_sql(
                text(
                    """
                    WITH ult AS (SELECT MAX(fecha) AS f FROM elecciones WHERE tipo = 'generales')
                    SELECT p.siglas,
                           SUM(re.votos)::float / NULLIF(tot.t, 0) * 100 AS pct
                    FROM resultados_electorales re
                    JOIN elecciones e ON re.eleccion_id = e.id
                    JOIN partidos p ON re.partido_id = p.id
                    CROSS JOIN ult
                    CROSS JOIN (
                        SELECT SUM(re2.votos)::float AS t
                        FROM resultados_electorales re2
                        JOIN elecciones e2 ON re2.eleccion_id = e2.id
                        CROSS JOIN ult u2
                        WHERE e2.tipo = 'generales' AND e2.fecha = u2.f
                    ) tot
                    WHERE e.tipo = 'generales' AND e.fecha = ult.f
                      AND p.siglas = ANY(:sig)
                    GROUP BY p.siglas, tot.t
                    """
                ),
                conn,
                params={"sig": list(siglas)},
            )
        s = float(df["pct"].sum()) if not df.empty else 0.0
        return min(100.0, max(0.0, s / 25.0 * 100.0))
    except Exception:
        return 50.0


def calcular_riesgo_institucional(engine) -> float:
    """
    Proxy vía microdatos: categoría ``confianza_instituciones`` en preguntas/respuestas.
    Si no hay datos, devuelve 50.0 y registra aviso.
    """
    sql = text(
        """
        SELECT COUNT(*) FROM preguntas_encuesta
        WHERE categoria_tematica = 'confianza_instituciones'
        """
    )
    try:
        with engine.connect() as conn:
            n = conn.execute(sql).scalar() or 0
        if int(n) == 0:
            logger.warning("riesgo_institucional: sin preguntas confianza_instituciones → 50.0")
            return 50.0
        return 50.0
    except Exception:
        logger.warning("riesgo_institucional: error consulta → 50.0")
        return 50.0


def _generar_recomendaciones(dimensiones: dict[str, float], semaforo: str) -> list[str]:
    rec: list[str] = []
    if dimensiones.get("inestabilidad_gubernamental", 0) > 60:
        rec.append("Alta fragmentación parlamentaria: vigilar viabilidad de investiduras.")
    if dimensiones.get("riesgo_economico_social", 0) > 60:
        rec.append("Contexto económico adverso: sensibilidad del voto a paro e inflación.")
    if dimensiones.get("polarizacion_politica", 0) > 60:
        rec.append("Polarización elevada: riesgo de voto de castigo y movilización negativa.")
    if not rec:
        rec.append("Riesgo moderado: monitoreo estándar.")
    return rec


def _persistir_informe(informe: dict, engine) -> None:
    stmt = text(
        """
        INSERT INTO informes_riesgo_politico (
            fecha_calculo, indice_compuesto, semaforo,
            dimensiones_json, drivers_json, recomendaciones_json
        ) VALUES (
            :fecha, :indice, :sem, :dim, :drv, :rec
        )
        """
    )
    with engine.begin() as conn:
        conn.execute(
            stmt,
            {
                "fecha": informe["fecha_calculo"],
                "indice": informe["indice_compuesto"],
                "sem": informe["semaforo"],
                "dim": json.dumps(informe["dimensiones"], ensure_ascii=False),
                "drv": json.dumps(informe["top_drivers"], ensure_ascii=False),
                "rec": json.dumps(informe["recomendaciones"], ensure_ascii=False),
            },
        )


def generar_informe_riesgo_politico(engine) -> dict:
    d_inest = calcular_riesgo_inestabilidad_gubernamental(engine)
    d_eco = calcular_riesgo_economico_social(engine)
    d_ter = calcular_riesgo_territorial(engine)
    d_pol = calcular_riesgo_polarizacion(engine)
    d_ins = calcular_riesgo_institucional(engine)

    dimensiones = {
        "inestabilidad_gubernamental": d_inest,
        "riesgo_economico_social": d_eco,
        "conflicto_territorial": d_ter,
        "polarizacion_politica": d_pol,
        "riesgo_institucional": d_ins,
    }
    indice = sum(dimensiones[k] * PESOS_DIMENSIONES[k] for k in PESOS_DIMENSIONES)

    if indice < 25:
        sem = "BAJO"
    elif indice < 50:
        sem = "MEDIO"
    elif indice < 75:
        sem = "ALTO"
    else:
        sem = "MUY ALTO"

    drivers = sorted(dimensiones.items(), key=lambda x: -x[1])[:3]
    informe = {
        "fecha_calculo": datetime.now().isoformat(),
        "indice_compuesto": round(float(indice), 2),
        "semaforo": sem,
        "dimensiones": {k: round(v, 2) for k, v in dimensiones.items()},
        "top_drivers": [{"dimension": d, "puntuacion": round(s, 2)} for d, s in drivers],
        "recomendaciones": _generar_recomendaciones(dimensiones, sem),
    }
    _persistir_informe(informe, engine)
    return informe


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    inf = generar_informe_riesgo_politico(engine)
    print(f"Índice: {inf['indice_compuesto']}/100 — {inf['semaforo']}")
