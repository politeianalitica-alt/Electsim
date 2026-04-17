"""
Agregación ponderada de encuestas (nowcasting) con house effects y decaimiento temporal.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

HOUSE_RATINGS: dict[str, dict] = {
    "CIS": {"rating": 4.0, "sesgo": {}},
    "40dB": {"rating": 4.5, "sesgo": {"PP": -0.5, "VOX": 0.3}},
    "GAD3": {"rating": 4.0, "sesgo": {"PP": 0.8, "PSOE": -0.4}},
    "Metroscopia": {"rating": 4.2, "sesgo": {}},
    "IMOP": {"rating": 3.8, "sesgo": {}},
    "NC Report": {"rating": 3.5, "sesgo": {"VOX": 0.5}},
    "SigmaDos": {"rating": 3.7, "sesgo": {}},
    "Celeste-Tel": {"rating": 3.2, "sesgo": {"PP": 1.0}},
}


def calcular_peso_encuesta(
    fecha_campo: datetime,
    n_entrevistas: int,
    nombre_casa: str,
    fecha_referencia: datetime | None = None,
    lambda_decay: float = 0.05,
) -> float:
    if fecha_referencia is None:
        fecha_referencia = datetime.now()
    dias = (fecha_referencia - fecha_campo).days
    peso_temporal = float(np.exp(-lambda_decay * max(dias, 0)))
    peso_muestral = float(np.sqrt(max(n_entrevistas, 1)))
    rating = float(HOUSE_RATINGS.get(nombre_casa, {"rating": 3.0})["rating"])
    return peso_muestral * rating * peso_temporal


def agregar_encuestas(
    df_encuestas: pd.DataFrame,
    fecha_ref: datetime | None = None,
    ventana_dias: int = 60,
) -> pd.DataFrame:
    if df_encuestas.empty:
        return pd.DataFrame(
            columns=[
                "partido",
                "estimacion_pct",
                "ic_95_inf",
                "ic_95_sup",
                "n_encuestas",
                "peso_total",
                "fecha_mas_reciente",
            ]
        )

    if fecha_ref is None:
        fecha_ref = datetime.now()

    df = df_encuestas.copy()
    df["fecha"] = pd.to_datetime(df["fecha"])
    corte = fecha_ref - timedelta(days=ventana_dias)
    df = df[df["fecha"] >= corte]

    if df.empty:
        return pd.DataFrame(
            columns=[
                "partido",
                "estimacion_pct",
                "ic_95_inf",
                "ic_95_sup",
                "n_encuestas",
                "peso_total",
                "fecha_mas_reciente",
            ]
        )

    df["porcentaje"] = df["porcentaje"].astype(float)

    for casa, info in HOUSE_RATINGS.items():
        mask = df["casa"] == casa
        for partido, sesgo in info.get("sesgo", {}).items():
            m = mask & (df["partido"] == partido)
            df.loc[m, "porcentaje"] = df.loc[m, "porcentaje"] - sesgo

    df["peso"] = df.apply(
        lambda r: calcular_peso_encuesta(
            r["fecha"].to_pydatetime() if hasattr(r["fecha"], "to_pydatetime") else r["fecha"],
            int(r["n"]),
            str(r["casa"]),
            fecha_ref,
        ),
        axis=1,
    )

    filas: list[dict] = []
    for partido in df["partido"].unique():
        dfp = df[df["partido"] == partido]
        if dfp.empty:
            continue
        w = dfp["peso"].values.astype(float)
        v = dfp["porcentaje"].values.astype(float)
        wn = w / w.sum()
        media_pond = float(np.average(v, weights=wn))
        varianza_enc = float(np.average((v - media_pond) ** 2, weights=wn))
        err_muestral = np.sqrt(
            np.average(
                (1.96 * np.sqrt(np.clip(v / 100.0 * (1 - v / 100.0), 0, 0.25) / dfp["n"].values))
                ** 2,
                weights=wn,
            )
        )
        error_total = float(np.sqrt(varianza_enc + err_muestral**2))
        filas.append(
            {
                "partido": partido,
                "estimacion_pct": round(media_pond, 2),
                "ic_95_inf": round(max(0.0, media_pond - 1.96 * error_total), 2),
                "ic_95_sup": round(min(100.0, media_pond + 1.96 * error_total), 2),
                "n_encuestas": len(dfp),
                "peso_total": float(w.sum()),
                "fecha_mas_reciente": dfp["fecha"].max(),
            }
        )

    return pd.DataFrame(filas).sort_values("estimacion_pct", ascending=False)


_SQL_ENCUESTAS = text(
    """
    SELECT
        enc.fecha_publicacion::timestamp AS fecha,
        fe.nombre AS casa,
        COALESCE(enc.n_entrevistas, 1000) AS n,
        rae.categoria AS partido,
        rae.porcentaje::float AS porcentaje
    FROM resultados_agregados_encuesta rae
    JOIN encuestas enc ON rae.encuesta_id = enc.id
    JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
    JOIN preguntas_encuesta pe ON rae.pregunta_id = pe.id
    WHERE pe.categoria_tematica = 'intencion_voto'
      AND enc.fecha_publicacion >= CURRENT_DATE - (:ventana_dias::int * INTERVAL '1 day')
    """
)


def cargar_encuestas_bd(engine, ventana_dias: int = 60) -> pd.DataFrame:
    with engine.connect() as conn:
        df = pd.read_sql(_SQL_ENCUESTAS, conn, params={"ventana_dias": ventana_dias})
    if df.empty:
        return df
    df["fecha"] = pd.to_datetime(df["fecha"])
    return df


def guardar_estimaciones(
    df: pd.DataFrame,
    engine,
    modelo: str = "agregador_ponderado",
    ventana_dias: int = 60,
) -> None:
    if df.empty:
        return
    fecha_est = datetime.now().date()
    upsert = text(
        """
        INSERT INTO estimaciones_voto_agregadas (
            fecha_estimacion, partido_id, estimacion_pct, ic_95_inf, ic_95_sup,
            n_encuestas, modelo, ventana_dias
        ) VALUES (
            :fecha_estimacion,
            (SELECT id FROM partidos WHERE siglas = :siglas LIMIT 1),
            :estimacion_pct, :ic_95_inf, :ic_95_sup,
            :n_encuestas, :modelo, :ventana_dias
        )
        ON CONFLICT (fecha_estimacion, partido_id, modelo) DO UPDATE SET
            estimacion_pct = EXCLUDED.estimacion_pct,
            ic_95_inf = EXCLUDED.ic_95_inf,
            ic_95_sup = EXCLUDED.ic_95_sup,
            n_encuestas = EXCLUDED.n_encuestas,
            ventana_dias = EXCLUDED.ventana_dias
        """
    )
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                upsert,
                {
                    "fecha_estimacion": fecha_est,
                    "siglas": row["partido"],
                    "estimacion_pct": row["estimacion_pct"],
                    "ic_95_inf": row["ic_95_inf"],
                    "ic_95_sup": row["ic_95_sup"],
                    "n_encuestas": int(row["n_encuestas"]),
                    "modelo": modelo,
                    "ventana_dias": ventana_dias,
                },
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    raw = cargar_encuestas_bd(engine)
    if raw.empty:
        print("Sin encuestas en BD. Carga primero datos CIS.")
    else:
        res = agregar_encuestas(raw)
        guardar_estimaciones(res, engine)
        print(res.to_string())
