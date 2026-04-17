"""
Calibración muestral por Iterative Proportional Fitting (IPF).
"""

from __future__ import annotations

import logging
import os
import sys

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


def ipf_calibration(
    df_muestra: pd.DataFrame,
    marginals: dict[str, pd.Series],
    max_iter: int = 200,
    tolerance: float = 1e-6,
    weight_col: str = "peso_muestral",
) -> pd.DataFrame:
    """
    Ajusta multiplicativamente los pesos para aproximar los marginales dados.

    ``marginals``: clave = nombre de columna en ``df_muestra``, valor = Series
    (índice categoría, valor proporción objetivo que suma 1).
    """
    df = df_muestra.copy()
    base = df.get(weight_col, 1.0)
    if isinstance(base, (int, float)):
        df["peso_ipf"] = float(base)
    else:
        df["peso_ipf"] = base.astype(float).fillna(1.0)

    if not marginals:
        return df

    n_original = len(df)

    for iteration in range(max_iter):
        prev = df["peso_ipf"].copy()

        for variable, marginal_objetivo in marginals.items():
            if variable not in df.columns:
                continue
            totales = df.groupby(df[variable], dropna=False)["peso_ipf"].sum()
            target = marginal_objetivo.reindex(totales.index).fillna(0.0)
            denom = totales.replace(0, np.nan).fillna(1e-10)
            factores = (target / denom).fillna(1.0)
            df["peso_ipf"] *= df[variable].map(factores).fillna(1.0).astype(float)

        cambio = float((df["peso_ipf"] - prev).abs().max())
        if cambio < tolerance:
            logger.info("IPF convergió en %s iteraciones", iteration + 1)
            break

    s = df["peso_ipf"].sum()
    if s > 0:
        df["peso_ipf"] = df["peso_ipf"] / s * n_original
    return df


def construir_marginals_desde_bd(engine, año: int = 2023) -> dict[str, pd.Series]:
    """
    Construye marginales de población por código INE de CCAA usando ``demografia_municipal``.

    Para añadir **edad** y **sexo** harían falta tablas con desglose quinquenal del INE
    (p. ej. padrón por grupo de edad y sexo a nivel CCAA o municipal) cargadas en BD;
    ``demografia_municipal`` actual solo agrega estructura amplia (p_0_14, etc.), no microcruce
    edad×sexo×CCAA listo para IPF sin construir primero esas series.
    """
    sql = text(
        """
        WITH nat AS (
            SELECT COALESCE(SUM(poblacion_total), 0)::float AS t
            FROM demografia_municipal
            WHERE año = :año
        )
        SELECT ca.codigo_ine AS ccaa_codigo_ine,
               SUM(d.poblacion_total)::float / NULLIF((SELECT t FROM nat), 0) AS prop
        FROM demografia_municipal d
        JOIN municipios m ON d.municipio_id = m.id
        JOIN comunidades_autonomas ca ON m.ccaa_id = ca.id
        WHERE d.año = :año
        GROUP BY ca.codigo_ine
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"año": año})
    if df.empty:
        return {}
    s = df.set_index("ccaa_codigo_ine")["prop"].astype(float)
    if s.sum() > 0:
        s = s / s.sum()
    return {"ccaa_codigo_ine": s}


def aplicar_ipf_a_encuesta(encuesta_id: int, engine, año_marginals: int = 2023) -> None:
    sql_micro = text(
        """
        SELECT m.id, m.peso_muestral, ca.codigo_ine AS ccaa_codigo_ine
        FROM microdatos_encuesta m
        LEFT JOIN comunidades_autonomas ca ON m.ccaa_id = ca.id
        WHERE m.encuesta_id = :eid
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql_micro, conn, params={"eid": encuesta_id})
    if df.empty:
        logger.warning("Sin microdatos para encuesta_id=%s", encuesta_id)
        return
    marginals = construir_marginals_desde_bd(engine, año=año_marginals)
    out = ipf_calibration(df, marginals, weight_col="peso_muestral")
    upd = text("UPDATE microdatos_encuesta SET peso_muestral = :p WHERE id = :id")
    with engine.begin() as conn:
        for _, row in out.iterrows():
            conn.execute(upd, {"p": float(row["peso_ipf"]), "id": int(row["id"])})


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    eid = int(sys.argv[1]) if len(sys.argv) > 1 else None
    if eid is None:
        print("Uso: python -m models.estadisticos.ipf <encuesta_id>")
        sys.exit(1)
    aplicar_ipf_a_encuesta(eid, engine)
