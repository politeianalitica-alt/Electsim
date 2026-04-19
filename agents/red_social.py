from __future__ import annotations

import json
import logging
from typing import Any

import networkx as nx
import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

UMBRAL_INFLUENCIA = 0.55


def construir_grafo_perfiles(engine: Engine) -> nx.DiGraph:
    sql = text(
        """
        SELECT cluster_id, ideologia_media, peso_demografico_pct, label,
               COALESCE(ccaa, '') AS ccaa,
               COALESCE(clase_social, '') AS clase_social,
               COALESCE(edad_media, 40.0) AS edad_media
        FROM perfiles_votante ORDER BY cluster_id
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)

    G = nx.DiGraph()
    for _, r in df.iterrows():
        cid = int(r["cluster_id"])
        G.add_node(
            cid,
            ideologia_media=float(r["ideologia_media"]) if pd.notna(r["ideologia_media"]) else 5.0,
            peso=float(r.get("peso_demografico_pct") or 0.0),
            label=str(r.get("label") or ""),
            ccaa=str(r.get("ccaa") or ""),
            clase_social=str(r.get("clase_social") or ""),
            edad_media=float(r.get("edad_media") or 40.0),
        )

    nodes = list(G.nodes())
    for i in nodes:
        for j in nodes:
            if i == j:
                continue
            sim = max(0.0, 1.0 - abs(G.nodes[i]["ideologia_media"] - G.nodes[j]["ideologia_media"]) / 10.0)
            if sim > UMBRAL_INFLUENCIA:
                G.add_edge(j, i, weight=round(sim, 9))
    return G


def friedkin_johnsen(
    grafo: nx.DiGraph,
    z0: dict[int, float],
    s: dict[int, float],
    n_iter: int = 100,
    tolerancia: float = 1e-6,
) -> dict[int, float]:
    z = {int(k): float(v) for k, v in z0.items()}
    for _ in range(max(1, int(n_iter))):
        z_new: dict[int, float] = {}
        delta_max = 0.0
        for i in grafo.nodes():
            incoming = list(grafo.predecessors(i))
            if incoming:
                w = np.array([float(grafo[p][i].get("weight", 0.0)) for p in incoming], dtype=float)
                den = float(w.sum())
                social = float(np.dot(np.array([z.get(p, 5.0) for p in incoming], dtype=float), w) / den) if den > 0 else z.get(i, 5.0)
            else:
                social = z.get(i, 5.0)
            si = float(s.get(i, 0.5))
            si = min(1.0, max(0.0, si))
            new_val = (1.0 - si) * float(z0.get(i, z.get(i, 5.0))) + si * social
            z_new[i] = new_val
            delta_max = max(delta_max, abs(new_val - z.get(i, new_val)))
        z = z_new
        if delta_max < tolerancia:
            break
    return z


def detectar_estructuras_red(grafo: nx.DiGraph) -> dict[str, Any]:
    if grafo.number_of_nodes() == 0:
        return {"comunidades": [], "densidad": 0.0}

    und = grafo.to_undirected()
    comunidades = [sorted(list(c)) for c in nx.connected_components(und)]
    return {
        "comunidades": comunidades,
        "densidad": float(nx.density(grafo)),
        "n_nodos": grafo.number_of_nodes(),
        "n_aristas": grafo.number_of_edges(),
    }


def cargar_susceptibilidad(engine: Engine) -> dict[int, float]:
    try:
        sql = text(
            """
            SELECT cluster_id,
                   COALESCE(susceptibilidad, 0.8 - 0.06 * ABS(COALESCE(ideologia_media,5) - 5.0)) AS s
            FROM perfiles_votante ORDER BY cluster_id
            """
        )
        with engine.connect() as conn:
            df = pd.read_sql(sql, conn)
        return {int(r["cluster_id"]): float(min(max(r["s"], 0.2), 0.8)) for _, r in df.iterrows()}
    except Exception as exc:
        logger.warning("cargar_susceptibilidad: usando default 0.5 (%s)", exc)
        return {}


def simular_propagacion_campana(
    grafo: nx.DiGraph,
    impactos_iniciales: dict[int, float] | dict[str, float],
    engine: Engine,
    n_iter: int = 80,
) -> pd.DataFrame:
    if grafo.number_of_nodes() == 0:
        return pd.DataFrame(columns=["cluster_id", "opinion_inicial", "opinion_final", "delta"])

    z0 = {int(n): float(impactos_iniciales.get(n, impactos_iniciales.get(str(n), 0.0))) for n in grafo.nodes()}
    susc_bd = cargar_susceptibilidad(engine)
    s = {int(n): float(susc_bd.get(int(n), 0.5)) for n in grafo.nodes()}

    zf = friedkin_johnsen(grafo, z0, s, n_iter=n_iter)
    rows = []
    for n in grafo.nodes():
        zi = float(z0.get(int(n), 0.0))
        zfin = float(zf.get(int(n), zi))
        rows.append(
            {
                "cluster_id": int(n),
                "opinion_inicial": zi,
                "opinion_final": zfin,
                "delta": zfin - zi,
            }
        )
    return pd.DataFrame(rows).sort_values("cluster_id")


def metricas_grafo(grafo: nx.DiGraph) -> dict[str, Any]:
    if grafo.number_of_nodes() == 0:
        return {"n_nodos": 0, "n_aristas": 0, "densidad": 0.0}
    return {
        "n_nodos": grafo.number_of_nodes(),
        "n_aristas": grafo.number_of_edges(),
        "densidad": float(nx.density(grafo)),
    }


if __name__ == "__main__":  # pragma: no cover
    import argparse
    import os
    from sqlalchemy import create_engine

    parser = argparse.ArgumentParser()
    parser.add_argument("--simular-campana", type=str, default="{}")
    parser.add_argument("--iter", type=int, default=80)
    args = parser.parse_args()

    eng = create_engine(os.environ["DATABASE_URL"], pool_pre_ping=True)
    G = construir_grafo_perfiles(eng)
    impactos = json.loads(args.simular_campana)
    df = simular_propagacion_campana(G, impactos, eng, n_iter=args.iter)
    print(df.to_string(index=False))
