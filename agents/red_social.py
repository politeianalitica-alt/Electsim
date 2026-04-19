<<<<<<< HEAD
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
=======
from __future__ import annotations

import json
import logging
from typing import Any

import networkx as nx
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)

UMBRAL_INFLUENCIA = 0.55


def _table_columns(engine: Engine, table: str) -> set[str]:
    sql = text(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=:t
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn, params={"t": table})
    return set(df["column_name"].astype(str).tolist())


def construir_grafo_perfiles(engine: Engine) -> nx.DiGraph:
    """
    Construye grafo de influencia entre perfiles usando distancia multidimensional:
      - Ideología (peso 0.5)
      - CCAA / region (peso 0.25)
      - Clase social (peso 0.15)
      - Edad (peso 0.10)

    Umbral de conexión: similitud_compuesta > UMBRAL_INFLUENCIA
    """
    cols = _table_columns(engine, "perfiles_votante")

    ccaa_expr = "ccaa" if "ccaa" in cols else (
        "comunidad_autonoma" if "comunidad_autonoma" in cols else "NULL"
    )
    clase_expr = "clase_social" if "clase_social" in cols else (
        "clase_social_subjetiva" if "clase_social_subjetiva" in cols else "NULL"
    )
    edad_expr = "edad_media" if "edad_media" in cols else "40.0"

    sql = text(
        f"""
        SELECT cluster_id, ideologia_media, peso_demografico_pct, label,
               COALESCE({ccaa_expr}, '') AS ccaa,
               COALESCE({clase_expr}, '') AS clase_social,
               COALESCE({edad_expr}, 40.0) AS edad_media
        FROM perfiles_votante
        ORDER BY cluster_id
>>>>>>> 6fda6ff (agentes 1)
        """
    )
    with engine.connect() as conn:
        df = pd.read_sql(sql, conn)

<<<<<<< HEAD
    G = nx.DiGraph()
    for _, r in df.iterrows():
        cid = int(r["cluster_id"])
        ideo = float(r["ideologia_media"]) if pd.notna(r["ideologia_media"]) else 5.0
        G.add_node(
            cid,
            ideologia_media=ideo,
            peso=float(r["peso_demografico_pct"] or 0.0),
            label=str(r.get("label") or ""),
=======
    _CLASE_ORDEN = {"baja": 1, "media-baja": 2, "media": 3, "media-alta": 4, "alta": 5}

    G = nx.DiGraph()
    for _, r in df.iterrows():
        cid = int(r["cluster_id"])
        G.add_node(
            cid,
            ideologia_media=float(r["ideologia_media"]) if pd.notna(r["ideologia_media"]) else 5.0,
            peso=float(r["peso_demografico_pct"] or 0.0),
            label=str(r.get("label") or ""),
            ccaa=str(r.get("ccaa") or ""),
            clase_social=str(r.get("clase_social") or "").lower(),
            edad_media=float(r.get("edad_media") or 40.0),
>>>>>>> 6fda6ff (agentes 1)
        )

    nodes = list(G.nodes())
    for i in nodes:
        for j in nodes:
            if i == j:
                continue
<<<<<<< HEAD
            di = float(G.nodes[i]["ideologia_media"])
            dj = float(G.nodes[j]["ideologia_media"])
            w = round(max(0.0, 1.0 - abs(di - dj) / 10.0), 9)
            if w > UMBRAL_INFLUENCIA:
=======
            ni = G.nodes[i]
            nj = G.nodes[j]

            d_ideo = abs(ni["ideologia_media"] - nj["ideologia_media"]) / 10.0
            sim_ideo = 1.0 - d_ideo

            sim_ccaa = 1.0 if (ni["ccaa"] and ni["ccaa"] == nj["ccaa"]) else 0.0

            ci = _CLASE_ORDEN.get(ni["clase_social"], 3)
            cj = _CLASE_ORDEN.get(nj["clase_social"], 3)
            sim_clase = 1.0 - abs(ci - cj) / 4.0

            d_edad = min(abs(ni["edad_media"] - nj["edad_media"]) / 50.0, 1.0)
            sim_edad = 1.0 - d_edad

            w = round(0.50 * sim_ideo + 0.25 * sim_ccaa + 0.15 * sim_clase + 0.10 * sim_edad, 6)
            if w > UMBRAL_INFLUENCIA:
                # j -> i: j influye a i
>>>>>>> 6fda6ff (agentes 1)
                G.add_edge(j, i, weight=w)

    return G


<<<<<<< HEAD
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
=======
def cargar_susceptibilidad(engine: Engine) -> dict[int, float]:
    """
    Lee susceptibilidad desde perfiles_votante.susceptibilidad si existe,
    o calcula proxy por ideología.

    Formula: susceptibilidad = 0.8 - 0.06 * abs(ideologia_media - 5.0)
    Resultado clamp en [0.2, 0.8].
    """
    try:
        cols = _table_columns(engine, "perfiles_votante")
        if "susceptibilidad" in cols:
            sql = text(
                """
                SELECT cluster_id,
                       COALESCE(susceptibilidad, 0.8 - 0.06 * ABS(COALESCE(ideologia_media,5) - 5.0)) AS s
                FROM perfiles_votante
                ORDER BY cluster_id
                """
            )
        else:
            sql = text(
                """
                SELECT cluster_id,
                       (0.8 - 0.06 * ABS(COALESCE(ideologia_media,5) - 5.0)) AS s
                FROM perfiles_votante
                ORDER BY cluster_id
                """
            )
        with engine.connect() as conn:
            df = pd.read_sql(sql, conn)
        return {
            int(r["cluster_id"]): float(min(max(float(r["s"]), 0.2), 0.8))
            for _, r in df.iterrows()
        }
    except Exception as exc:
        logger.warning("cargar_susceptibilidad: usando default 0.5 (%s)", exc)
        return {}
>>>>>>> 6fda6ff (agentes 1)


def simular_propagacion_campana(
    grafo: nx.DiGraph,
<<<<<<< HEAD
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
=======
    impactos_iniciales: dict[int, float] | dict[str, float],
    n_iteraciones: int = 8,
    engine: Engine | None = None,
) -> dict[str, Any]:
    """Simula difusión de impacto usando actualización tipo Friedkin–Johnsen."""
    if grafo.number_of_nodes() == 0:
        return {"final": {}, "trayectoria": [], "n_iteraciones": 0}

    base: dict[int, float] = {}
    for n in grafo.nodes():
        if n in impactos_iniciales:
            base[n] = float(impactos_iniciales[n])
        elif str(n) in impactos_iniciales:
            base[n] = float(impactos_iniciales[str(n)])
        else:
            base[n] = 0.0

    susc_bd = cargar_susceptibilidad(engine) if engine is not None else {}
    susc = {n: susc_bd.get(int(n), 0.5) for n in grafo.nodes()}

    x_prev = dict(base)
    trayectorias: list[dict[str, Any]] = []
    trayectorias.append({"iter": 0, **{str(k): v for k, v in x_prev.items()}})

    for t in range(1, int(n_iteraciones) + 1):
        x_new: dict[int, float] = {}
        for i in grafo.nodes():
            incoming = list(grafo.predecessors(i))
            if incoming:
                weights = [float(grafo[p][i].get("weight", 0.0)) for p in incoming]
                denom = sum(weights)
                if denom > 0:
                    social = sum(x_prev[p] * w for p, w in zip(incoming, weights)) / denom
                else:
                    social = x_prev[i]
            else:
                social = x_prev[i]

            s = float(susc.get(i, 0.5))
            # FJ: mezcla entre ancla inicial y presión social
            x_new[i] = (1.0 - s) * base[i] + s * social

        x_prev = x_new
        trayectorias.append({"iter": t, **{str(k): v for k, v in x_prev.items()}})

    metricas = {
        "n_nodos": grafo.number_of_nodes(),
        "n_aristas": grafo.number_of_edges(),
        "densidad": float(nx.density(grafo)),
    }

    return {
        "final": {int(k): float(v) for k, v in x_prev.items()},
        "trayectoria": trayectorias,
        "n_iteraciones": int(n_iteraciones),
        "metricas_red": metricas,
    }


def metricas_grafo(grafo: nx.DiGraph) -> dict[str, Any]:
    if grafo.number_of_nodes() == 0:
        return {"n_nodos": 0, "n_aristas": 0, "densidad": 0.0}
    return {
        "n_nodos": grafo.number_of_nodes(),
        "n_aristas": grafo.number_of_edges(),
        "densidad": float(nx.density(grafo)),
        "in_degree_centrality": nx.in_degree_centrality(grafo),
        "out_degree_centrality": nx.out_degree_centrality(grafo),
    }


if __name__ == "__main__":  # pragma: no cover
    import argparse
    import os
    from sqlalchemy import create_engine

    parser = argparse.ArgumentParser(description="Simulación de propagación en red")
    parser.add_argument("--simular-campana", type=str, default="")
    parser.add_argument("--iter", type=int, default=8)
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL no definida")

    eng = create_engine(db_url, pool_pre_ping=True)
    G = construir_grafo_perfiles(eng)
    impactos = json.loads(args.simular_campana) if args.simular_campana else {}
    out = simular_propagacion_campana(G, impactos, n_iteraciones=args.iter, engine=eng)
    print(json.dumps(out, ensure_ascii=False, indent=2))
>>>>>>> 6fda6ff (agentes 1)
