"""
Coaliciones ganadoras, Ley d'Hondt y valor de Shapley (Congreso, umbral 176 escaños).
"""

from __future__ import annotations

import json
import logging
import math
import os
from itertools import combinations

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

UMBRAL_MAYORIA = 176


def ley_dhondt(votos_dict: dict[str, float], escanos_disponibles: int) -> dict[str, int]:
    if not votos_dict or escanos_disponibles <= 0:
        return {}
    partidos = list(votos_dict.keys())
    votos = np.array([max(0.0, float(votos_dict[p])) for p in partidos], dtype=float)
    escanos = {p: 0 for p in partidos}
    for _ in range(escanos_disponibles):
        cocientes = votos / (np.array([escanos[p] for p in partidos], dtype=float) + 1.0)
        ganador = partidos[int(np.argmax(cocientes))]
        escanos[ganador] += 1
    return escanos


def obtener_escanos_ultima_eleccion(engine) -> dict[str, int]:
    sql = text(
        """
        WITH ult AS (
            SELECT MAX(e.fecha) AS fmax
            FROM elecciones e
            WHERE e.tipo = 'generales'
        )
        SELECT p.siglas AS siglas, SUM(re.escanos)::int AS escanos
        FROM resultados_electorales re
        JOIN elecciones e ON re.eleccion_id = e.id
        JOIN partidos p ON re.partido_id = p.id
        CROSS JOIN ult
        WHERE e.tipo = 'generales' AND e.fecha = ult.fmax
        GROUP BY p.siglas
        HAVING SUM(re.escanos) > 0
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(sql).fetchall()
    return {r[0]: int(r[1]) for r in rows}


def coaliciones_ganadoras_minimas(escanos: dict[str, int]) -> list[dict]:
    filtrados = {p: e for p, e in escanos.items() if e >= 5}
    if not filtrados:
        filtrados = dict(escanos)
    partidos = list(filtrados.keys())
    cgm: list[dict] = []
    for r in range(1, len(partidos) + 1):
        for coal in combinations(partidos, r):
            total = sum(filtrados[p] for p in coal)
            if total < UMBRAL_MAYORIA:
                continue
            es_min = all(
                sum(filtrados[p] for p in coal if p != out) < UMBRAL_MAYORIA for out in coal
            )
            if es_min:
                cgm.append(
                    {
                        "coalicion": tuple(sorted(coal)),
                        "escanos_totales": total,
                        "n_partidos": len(coal),
                    }
                )
    return cgm


def valor_shapley(partidos: list[str], escanos: dict[str, int]) -> dict[str, float]:
    n = len(partidos)
    if n == 0:
        return {}

    def v(sub: frozenset) -> int:
        return 1 if sum(escanos.get(p, 0) for p in sub) >= UMBRAL_MAYORIA else 0

    shapley = {p: 0.0 for p in partidos}
    for p in partidos:
        otros = [x for x in partidos if x != p]
        for k in range(len(otros) + 1):
            for subset in combinations(otros, k):
                s = frozenset(subset)
                s_con = frozenset(subset + (p,))
                marginal = float(v(s_con) - v(s))
                coef = math.factorial(k) * math.factorial(n - k - 1) / math.factorial(n)
                shapley[p] += coef * marginal
    return shapley


def distancia_ideologica_coalicion(partidos: list[str], engine) -> float | None:
    if len(partidos) < 2:
        return 0.0
    sql = text(
        """
        SELECT siglas, eje_izda_dcha, eje_libertario_autoritario
        FROM partidos WHERE siglas = ANY(:siglas)
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"siglas": list(partidos)})
    if len(df) < 2:
        return None
    if df["eje_izda_dcha"].isna().any() or df["eje_libertario_autoritario"].isna().any():
        return None
    pos = df[["eje_izda_dcha", "eje_libertario_autoritario"]].to_numpy(dtype=float)
    dists = []
    for i in range(len(pos)):
        for j in range(i + 1, len(pos)):
            dists.append(float(np.linalg.norm(pos[i] - pos[j])))
    return float(np.mean(dists)) if dists else None


def analisis_completo(engine) -> tuple[pd.DataFrame, dict[str, float]]:
    escanos = obtener_escanos_ultima_eleccion(engine)
    if not escanos:
        return pd.DataFrame(), {}

    top = dict(sorted(escanos.items(), key=lambda x: -x[1])[:10])
    shapley = valor_shapley(list(top.keys()), escanos)

    cgms = coaliciones_ganadoras_minimas(escanos)
    filas: list[dict] = []
    for c in cgms:
        coal = list(c["coalicion"])
        dist = distancia_ideologica_coalicion(coal, engine)
        if dist is None:
            dist_f = 0.0
        else:
            dist_f = float(dist)
        shap_tot = sum(shapley.get(p, 0.0) for p in coal if p in shapley)
        score = shap_tot * 10.0 - dist_f * 2.0 - c["n_partidos"] * 0.5
        filas.append(
            {
                "partidos_coalicion": json.dumps(coal, ensure_ascii=False),
                "escanos_totales": c["escanos_totales"],
                "n_partidos": c["n_partidos"],
                "distancia_ideologica": round(dist_f, 3),
                "valor_shapley_total": round(shap_tot, 4),
                "score_viabilidad": round(score, 3),
                "es_minima": True,
            }
        )

    df_out = pd.DataFrame(filas).sort_values("score_viabilidad", ascending=False)

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM analisis_coaliciones"))

    ins = text(
        """
        INSERT INTO analisis_coaliciones (
            partidos_coalicion, escanos_totales, n_partidos,
            distancia_ideologica, valor_shapley_total, score_viabilidad, es_minima
        ) VALUES (
            :partidos_coalicion, :escanos_totales, :n_partidos,
            :distancia_ideologica, :valor_shapley_total, :score_viabilidad, :es_minima
        )
        """
    )
    with engine.begin() as conn:
        for _, row in df_out.iterrows():
            conn.execute(
                ins,
                {
                    "partidos_coalicion": row["partidos_coalicion"],
                    "escanos_totales": int(row["escanos_totales"]),
                    "n_partidos": int(row["n_partidos"]),
                    "distancia_ideologica": row["distancia_ideologica"],
                    "valor_shapley_total": row["valor_shapley_total"],
                    "score_viabilidad": row["score_viabilidad"],
                    "es_minima": bool(row["es_minima"]),
                },
            )

    return df_out, shapley


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    df, sh = analisis_completo(engine)
    print("=== SHAPLEY (top-10) ===")
    for p, v in sorted(sh.items(), key=lambda x: -x[1]):
        print(f"  {p}: {v:.4f}")
    if not df.empty:
        print("\n=== TOP COALICIONES ===")
        print(
            df.head(5)[
                ["partidos_coalicion", "escanos_totales", "distancia_ideologica", "score_viabilidad"]
            ].to_string()
        )
