"""
Monte Carlo de escaños al Congreso (d'Hondt provincial, barrera 3%).
"""

from __future__ import annotations

import logging
import os

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

from models.estrategicos.coaliciones import ley_dhondt

logger = logging.getLogger(__name__)


def escanos_por_provincia_desde_bd(engine) -> dict[str, int]:
    sql = text("SELECT codigo_ine, escanos_congreso FROM provincias")
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    out: dict[str, int] = {}
    for cod, esc in rows:
        if esc is None:
            logger.warning("Provincia %s sin escanos_congreso en BD", cod)
            continue
        out[str(cod).zfill(2)] = int(esc)
    return out


def factor_provincial_historico(engine) -> pd.DataFrame:
    sql = text(
        """
        WITH ult AS (
            SELECT MAX(e.fecha) AS fmax FROM elecciones e WHERE e.tipo = 'generales'
        ),
        nat AS (
            SELECT p.siglas, SUM(re.votos)::float AS v
            FROM resultados_electorales re
            JOIN elecciones e ON re.eleccion_id = e.id
            JOIN partidos p ON re.partido_id = p.id
            CROSS JOIN ult
            WHERE e.tipo = 'generales' AND e.fecha = ult.fmax
            GROUP BY p.siglas
        ),
        prov AS (
            SELECT pr.codigo_ine AS prov, p.siglas, SUM(re.votos)::float AS v
            FROM resultados_electorales re
            JOIN elecciones e ON re.eleccion_id = e.id
            JOIN partidos p ON re.partido_id = p.id
            JOIN provincias pr ON re.provincia_id = pr.id
            CROSS JOIN ult
            WHERE e.tipo = 'generales' AND e.fecha = ult.fmax
            GROUP BY pr.codigo_ine, p.siglas
        )
        SELECT prov.prov, prov.siglas,
               (prov.v / NULLIF(nat.v, 0)) AS factor
        FROM prov
        JOIN nat ON nat.siglas = prov.siglas
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)
    if df.empty:
        return pd.DataFrame()
    return df.pivot(index="siglas", columns="prov", values="factor").fillna(1.0)


def simular_congreso(
    estimaciones: pd.DataFrame,
    escanos_por_provincia: dict[str, int],
    factor_provincial: pd.DataFrame,
    n_simulaciones: int = 5000,
    umbral_nacional_pct: float = 3.0,
    seed: int = 42,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    partidos = estimaciones["partido"].tolist()
    medias = estimaciones.set_index("partido")["estimacion_pct"].astype(float)
    sigmas = {}
    for _, row in estimaciones.iterrows():
        p = row["partido"]
        lo = float(row["ic_95_inf"])
        hi = float(row["ic_95_sup"])
        sigmas[p] = max((hi - lo) / (2 * 1.96), 0.01)

    acum = {p: [] for p in partidos}
    primer_p: list[str | None] = []

    for _ in range(n_simulaciones):
        muestras = {p: max(0.0, float(rng.normal(medias[p], sigmas[p]))) for p in partidos}
        tot = sum(muestras.values()) or 1.0
        nat = {p: muestras[p] / tot * 100.0 for p in partidos}
        validos = {p: v for p, v in nat.items() if v >= umbral_nacional_pct}
        escanos_sim = {p: 0 for p in partidos}

        for prov, n_esc in escanos_por_provincia.items():
            votos_prov: dict[str, float] = {}
            for p, vn in validos.items():
                fac = 1.0
                if not factor_provincial.empty and p in factor_provincial.index and prov in factor_provincial.columns:
                    fac = float(factor_provincial.loc[p, prov])
                elif not factor_provincial.empty and p in factor_provincial.index:
                    rowm = factor_provincial.loc[p].mean()
                    fac = float(rowm) if pd.notna(rowm) else 1.0
                votos_prov[p] = vn * fac
            dh = ley_dhondt(votos_prov, n_esc)
            for p, e in dh.items():
                escanos_sim[p] = escanos_sim.get(p, 0) + int(e)

        mx = max(escanos_sim.values()) if escanos_sim else 0
        win = [x for x, v in escanos_sim.items() if v == mx]
        primer_p.append(win[0] if len(win) == 1 else None)

        for p in partidos:
            acum[p].append(escanos_sim.get(p, 0))

    resumen = []
    for p in partidos:
        arr = np.array(acum[p], dtype=float)
        pm = float(np.mean(arr >= 176))
        counts = np.array([1.0 if primer_p[i] == p else 0.0 for i in range(n_simulaciones)])
        resumen.append(
            {
                "partido": p,
                "escanos_media": float(np.mean(arr)),
                "escanos_mediana": float(np.median(arr)),
                "escanos_p5": float(np.percentile(arr, 5)),
                "escanos_p25": float(np.percentile(arr, 25)),
                "escanos_p75": float(np.percentile(arr, 75)),
                "escanos_p95": float(np.percentile(arr, 95)),
                "prob_mayoria_absoluta": pm,
                "prob_primer_partido": float(np.mean(counts)),
            }
        )
    return pd.DataFrame(resumen).sort_values("escanos_media", ascending=False)


def guardar_simulacion(
    df: pd.DataFrame,
    engine,
    n_simulaciones: int,
    escenario_id: str | None = None,
) -> None:
    sql = text(
        """
        INSERT INTO simulaciones_mc_escanos (
            partido_id, n_simulaciones, escanos_media, escanos_mediana,
            escanos_p5, escanos_p25, escanos_p75, escanos_p95,
            prob_mayoria_absoluta, prob_primer_partido, escenario_id
        ) VALUES (
            (SELECT id FROM partidos WHERE siglas = :sig LIMIT 1),
            :n_sim, :m, :med, :p5, :p25, :p75, :p95, :pma, :ppp, :eid
        )
        """
    )
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                sql,
                {
                    "sig": row["partido"],
                    "n_sim": n_simulaciones,
                    "m": row["escanos_media"],
                    "med": row["escanos_mediana"],
                    "p5": row["escanos_p5"],
                    "p25": row["escanos_p25"],
                    "p75": row["escanos_p75"],
                    "p95": row["escanos_p95"],
                    "pma": row["prob_mayoria_absoluta"],
                    "ppp": row["prob_primer_partido"],
                    "eid": escenario_id,
                },
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models.estadisticos.nowcasting import agregar_encuestas, cargar_encuestas_bd

    engine = create_engine(os.environ["DATABASE_URL"])
    df_enc = cargar_encuestas_bd(engine)
    if df_enc.empty:
        print("Sin estimaciones en BD. Ejecuta primero nowcasting.")
        raise SystemExit(1)
    est = agregar_encuestas(df_enc)
    prov = escanos_por_provincia_desde_bd(engine)
    fac = factor_provincial_historico(engine)
    res = simular_congreso(est, prov, fac)
    guardar_simulacion(res, engine, n_simulaciones=5000)
    print(res[["partido", "escanos_media", "escanos_p5", "escanos_p95", "prob_mayoria_absoluta"]].to_string())
