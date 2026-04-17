"""
Propagación de opinión Friedkin–Johnsen entre perfiles (red sintética).
"""

from __future__ import annotations

import argparse
import json
import logging
from typing import TYPE_CHECKING, Any

import networkx as nx
import numpy as np
import pandas as pd
from networkx.algorithms.community import greedy_modularity_communities
from sqlalchemy import text

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

UMBRAL_INFLUENCIA = 0.3


def construir_grafo_perfiles(engine) -> nx.DiGraph:
    sql = text(
        """
        SELECT cluster_id, ideologia_media, peso_demografico_pct, label
        FROM perfiles_votante ORDER BY cluster_id
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)

    G = nx.DiGraph()
    for _, r in df.iterrows():
        cid = int(r["cluster_id"])
        ideo = float(r["ideologia_media"]) if pd.notna(r["ideologia_media"]) else 5.0
        G.add_node(
            cid,
            ideologia_media=ideo,
            peso=float(r["peso_demografico_pct"] or 0.0),
            label=str(r.get("label") or ""),
        )

    nodes = list(G.nodes())
    for i in nodes:
        for j in nodes:
            if i == j:
                continue
            di = float(G.nodes[i]["ideologia_media"])
            dj = float(G.nodes[j]["ideologia_media"])
            w = round(max(0.0, 1.0 - abs(di - dj) / 10.0), 9)
            if w > UMBRAL_INFLUENCIA:
                G.add_edge(j, i, weight=w)

    return G


def friedkin_johnsen(
    grafo: nx.DiGraph,
    opiniones_iniciales: dict[int, float],
    susceptibilidad: dict[int, float],
    n_iter: int = 100,
    tolerancia: float = 1e-6,
) -> dict[int, float]:
    nodes = list(grafo.nodes())
    z0 = {n: float(opiniones_iniciales.get(n, 5.0)) for n in nodes}
    z = {n: z0[n] for n in nodes}
    s = {n: float(susceptibilidad.get(n, 0.5)) for n in nodes}

    for _ in range(n_iter):
        z_new: dict[int, float] = {}
        max_delta = 0.0
        for i in nodes:
            preds = list(grafo.predecessors(i))
            if not preds:
                z_new[i] = z0[i]
            else:
                weights = [float(grafo[p][i].get("weight", 1.0)) for p in preds]
                ws = sum(weights) or 1.0
                inf = sum(weights[k] * z[preds[k]] for k in range(len(preds))) / ws
                z_new[i] = (1.0 - s[i]) * z0[i] + s[i] * inf
            max_delta = max(max_delta, abs(z_new[i] - z[i]))
        z = z_new
        if max_delta < tolerancia:
            break
    return z


def simular_propagacion_campana(
    grafo: nx.DiGraph,
    mensaje_impacto: dict[Any, float],
    engine,
    n_iter: int = 100,
) -> pd.DataFrame:
    _ = engine
    baseline: dict[int, float] = {}
    for n in grafo.nodes():
        baseline[n] = float(grafo.nodes[n].get("ideologia_media", 5.0))

    z_ancla = dict(baseline)
    for k, delta in mensaje_impacto.items():
        kk = int(k) if not isinstance(k, int) else k
        if kk in z_ancla:
            z_ancla[kk] = float(np.clip(z_ancla[kk] + float(delta), 0.0, 10.0))

    susc = {n: 0.5 for n in grafo.nodes()}
    z_final = friedkin_johnsen(grafo, z_ancla, susc, n_iter=n_iter)

    filas = []
    for n in grafo.nodes():
        ini = baseline[n]
        fin = float(z_final.get(n, ini))
        cambio = fin - ini
        pct = (cambio / ini * 100.0) if abs(ini) > 1e-6 else 0.0
        centro = 5.0
        es_eco = abs(fin - centro) > abs(ini - centro) + 1e-6
        filas.append(
            {
                "cluster_id": n,
                "label": grafo.nodes[n].get("label", ""),
                "opinion_inicial": round(ini, 3),
                "opinion_final": round(fin, 3),
                "cambio_absoluto": round(cambio, 3),
                "cambio_pct": round(pct, 3),
                "es_camara_eco": bool(es_eco),
            }
        )
    return pd.DataFrame(filas)


def detectar_estructuras_red(grafo: nx.DiGraph) -> dict[str, Any]:
    if grafo.number_of_nodes() == 0:
        return {
            "betweenness_centrality": {},
            "pagerank": {},
            "comunidades": [],
            "diametro": None,
        }

    U = grafo.to_undirected()
    bc = nx.betweenness_centrality(U)
    pr = nx.pagerank(grafo)

    try:
        comms = list(greedy_modularity_communities(U))
        comunidades = [[int(x) for x in sorted(c)] for c in comms]
    except Exception as exc:
        logger.warning("comunidades: %s", exc)
        comunidades = []

    diam = None
    try:
        if U.number_of_nodes() > 0:
            largest = max(nx.connected_components(U), key=len)
            sub = U.subgraph(largest)
            if sub.number_of_nodes() > 1:
                diam = nx.diameter(sub)
    except Exception as exc:
        logger.debug("diametro: %s", exc)

    return {
        "betweenness_centrality": {int(k): round(float(v), 4) for k, v in bc.items()},
        "pagerank": {int(k): round(float(v), 6) for k, v in pr.items()},
        "comunidades": comunidades,
        "diametro": diam,
    }


def main() -> None:
    import os

    from sqlalchemy import create_engine

    logging.basicConfig(level=logging.INFO)
    p = argparse.ArgumentParser()
    p.add_argument("--simular-campana", type=str, default=None, help="JSON {cluster_id: delta}")
    args = p.parse_args()

    engine = create_engine(os.environ["DATABASE_URL"])
    G = construir_grafo_perfiles(engine)
    est = detectar_estructuras_red(G)
    print(json.dumps(est, indent=2, ensure_ascii=False))

    if args.simular_campana:
        impacto = json.loads(args.simular_campana)
        impacto = {int(k): float(v) for k, v in impacto.items()}
        df = simular_propagacion_campana(G, impacto, engine)
        print(df.to_string())


if __name__ == "__main__":
    main()
