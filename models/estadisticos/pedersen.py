"""
Índice de volatilidad electoral Pedersen a partir de ``resultados_electorales``.
"""

from __future__ import annotations

import logging
import os

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

BLOQUES_IDEOLOGICOS: dict[str, list[str]] = {
    "izquierda": ["PSOE", "SUMAR", "PODEMOS", "IU", "EH-BILDU", "BNG"],
    "derecha": ["PP", "VOX", "CS", "UCD", "AP"],
    "nacionalista": ["PNV", "JUNTS", "CIU", "ERC", "CC"],
}

_SQL_VOTOS_NACIONALES = text(
    """
    WITH tot AS (
        SELECT re.eleccion_id, SUM(re.votos)::double precision AS total_votos
        FROM resultados_electorales re
        JOIN elecciones e ON re.eleccion_id = e.id
        WHERE e.tipo = 'generales'
        GROUP BY re.eleccion_id
    )
    SELECT e.fecha AS fecha,
           p.siglas AS siglas,
           SUM(re.votos)::double precision / NULLIF(t.total_votos, 0) * 100 AS pct_voto
    FROM resultados_electorales re
    JOIN elecciones e ON re.eleccion_id = e.id
    JOIN partidos p ON re.partido_id = p.id
    JOIN tot t ON t.eleccion_id = e.id
    WHERE e.tipo = 'generales'
    GROUP BY e.id, e.fecha, p.siglas, t.total_votos
    ORDER BY e.fecha, p.siglas
    """
)


def interpretar_pedersen(vt: float) -> str:
    if vt < 10:
        return "BAJA — sistema estable"
    if vt < 20:
        return "MODERADA — fluctuación normal"
    if vt < 30:
        return "ALTA — cambio sistémico significativo"
    return "MUY ALTA — realineamiento electoral profundo"


def _volatilidad_bloques(comp: pd.DataFrame) -> float:
    vb = 0.0
    for _nombre, partidos in BLOQUES_IDEOLOGICOS.items():
        pct_t0 = comp.loc[comp["siglas"].isin(partidos), "pct_t0"].sum()
        pct_t1 = comp.loc[comp["siglas"].isin(partidos), "pct_t1"].sum()
        vb += abs(float(pct_t1) - float(pct_t0)) / 2.0
    return vb


def calcular_pedersen_serie(engine) -> pd.DataFrame:
    """
    Lee votos agregados a nivel nacional por partido para cada elección general
    y calcula Pedersen entre pares consecutivos de fechas.
    """
    with engine.connect() as conn:
        df = pd.read_sql(_SQL_VOTOS_NACIONALES, conn)

    if df.empty:
        return pd.DataFrame(
            columns=[
                "eleccion_anterior",
                "eleccion_actual",
                "volatilidad_total",
                "volatilidad_bloques",
                "volatilidad_interna",
                "interpretacion",
            ]
        )

    fechas = sorted(df["fecha"].unique())
    resultados: list[dict] = []

    for i in range(1, len(fechas)):
        t0 = df[df["fecha"] == fechas[i - 1]][["siglas", "pct_voto"]].rename(
            columns={"pct_voto": "pct_t0"}
        )
        t1 = df[df["fecha"] == fechas[i]][["siglas", "pct_voto"]].rename(
            columns={"pct_voto": "pct_t1"}
        )
        comp = pd.merge(t0, t1, on="siglas", how="outer").fillna(0.0)
        vt = float(comp.assign(delta=lambda x: (x["pct_t1"] - x["pct_t0"]).abs())["delta"].sum() / 2.0)
        vb = _volatilidad_bloques(comp)
        vi = vt - vb
        resultados.append(
            {
                "eleccion_anterior": fechas[i - 1],
                "eleccion_actual": fechas[i],
                "volatilidad_total": round(vt, 3),
                "volatilidad_bloques": round(vb, 3),
                "volatilidad_interna": round(vi, 3),
                "interpretacion": interpretar_pedersen(vt),
            }
        )

    return pd.DataFrame(resultados)


def guardar_pedersen(df: pd.DataFrame, engine) -> None:
    """Upsert en ``volatilidad_electoral_historica``."""
    if df.empty:
        return
    stmt = text(
        """
        INSERT INTO volatilidad_electoral_historica (
            eleccion_anterior, eleccion_actual,
            volatilidad_total, volatilidad_bloques, volatilidad_interna, interpretacion
        ) VALUES (
            :eleccion_anterior, :eleccion_actual,
            :volatilidad_total, :volatilidad_bloques, :volatilidad_interna, :interpretacion
        )
        ON CONFLICT (eleccion_anterior, eleccion_actual) DO UPDATE SET
            volatilidad_total = EXCLUDED.volatilidad_total,
            volatilidad_bloques = EXCLUDED.volatilidad_bloques,
            volatilidad_interna = EXCLUDED.volatilidad_interna,
            interpretacion = EXCLUDED.interpretacion
        """
    )
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                stmt,
                {
                    "eleccion_anterior": row["eleccion_anterior"],
                    "eleccion_actual": row["eleccion_actual"],
                    "volatilidad_total": row["volatilidad_total"],
                    "volatilidad_bloques": row["volatilidad_bloques"],
                    "volatilidad_interna": row["volatilidad_interna"],
                    "interpretacion": row["interpretacion"],
                },
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    out = calcular_pedersen_serie(engine)
    guardar_pedersen(out, engine)
    print(out.to_string())
