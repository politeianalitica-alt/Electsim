import pandas as pd
from unittest.mock import MagicMock, patch

import networkx as nx

from agents.red_social import (
    UMBRAL_INFLUENCIA,
    construir_grafo_perfiles,
    detectar_estructuras_red,
    friedkin_johnsen,
    simular_propagacion_campana,
)


def test_construir_grafo_3_nodos():
    df = pd.DataFrame(
        {
            "cluster_id": [1, 2, 3],
            "ideologia_media": [2.0, 5.0, 9.0],
            "peso_demografico_pct": [10, 10, 10],
            "label": ["a", "b", "c"],
        }
    )
    engine = MagicMock()
    cm = MagicMock()
    cm.__enter__.return_value = MagicMock()
    cm.__exit__.return_value = None
    engine.connect.return_value = cm
    with patch("agents.red_social.pd.read_sql", return_value=df):
        G = construir_grafo_perfiles(engine)

    assert G.number_of_nodes() == 3
    w_12 = round(max(0.0, 1.0 - abs(2.0 - 5.0) / 10.0), 9)
    w_29 = round(max(0.0, 1.0 - abs(2.0 - 9.0) / 10.0), 9)
    w_59 = round(max(0.0, 1.0 - abs(5.0 - 9.0) / 10.0), 9)
    assert w_12 > UMBRAL_INFLUENCIA
    assert w_59 > UMBRAL_INFLUENCIA
    assert not (w_29 > UMBRAL_INFLUENCIA)
    assert G.number_of_edges() == 4


def test_friedkin_johnsen_convergencia():
    G = nx.DiGraph()
    for n in [1, 2, 3]:
        G.add_node(n, ideologia_media=5.0)
    G.add_edge(1, 2, weight=0.8)
    G.add_edge(2, 1, weight=0.8)
    G.add_edge(2, 3, weight=0.8)
    G.add_edge(3, 2, weight=0.8)

    z0 = {1: 2.0, 2: 6.0, 3: 8.0}
    s = {1: 0.4, 2: 0.4, 3: 0.4}
    z200 = friedkin_johnsen(G, z0, s, n_iter=200)
    z400 = friedkin_johnsen(G, z0, s, n_iter=400)
    mx = max(abs(z400[k] - z200[k]) for k in z0)
    assert mx < 1e-5


def test_friedkin_johnsen_stubborn():
    G = nx.DiGraph()
    G.add_node(1, ideologia_media=3.0)
    G.add_node(2, ideologia_media=7.0)
    G.add_edge(2, 1, weight=0.9)
    z0 = {1: 3.0, 2: 7.0}
    s = {1: 0.0, 2: 0.5}
    zf = friedkin_johnsen(G, z0, s, n_iter=50)
    assert abs(zf[1] - 3.0) < 1e-6


def test_friedkin_johnsen_totalmente_abierto_consenso():
    G = nx.DiGraph()
    for i in [1, 2, 3]:
        G.add_node(i)
    for i in [1, 2, 3]:
        for j in [1, 2, 3]:
            if i != j:
                G.add_edge(j, i, weight=1.0)
    z0 = {1: 0.0, 2: 10.0, 3: 5.0}
    s = {1: 1.0, 2: 1.0, 3: 1.0}
    zf = friedkin_johnsen(G, z0, s, n_iter=500, tolerancia=1e-8)
    media = sum(z0.values()) / 3.0
    assert abs(zf[1] - media) < 0.15
    assert abs(zf[2] - media) < 0.15
    assert abs(zf[3] - media) < 0.15


def test_detectar_camaras_eco():
    G = nx.DiGraph()
    for n, ideo in [(1, 1.0), (2, 2.0), (8, 8.0), (9, 9.0)]:
        G.add_node(n, ideologia_media=ideo, peso=1.0, label=str(n))
    for i in [1, 2]:
        for j in [1, 2]:
            if i != j:
                G.add_edge(j, i, weight=0.9)
    for i in [8, 9]:
        for j in [8, 9]:
            if i != j:
                G.add_edge(j, i, weight=0.9)
    est = detectar_estructuras_red(G)
    assert len(est["comunidades"]) >= 2


def test_propagacion_campana_mock():
    G = nx.DiGraph()
    for n, ideo in [(1, 5.0), (2, 5.0), (3, 5.0)]:
        G.add_node(n, ideologia_media=ideo, peso=1.0, label=str(n))
    G.add_edge(1, 2, weight=0.8)
    G.add_edge(2, 3, weight=0.8)
    G.add_edge(1, 3, weight=0.5)
    eng = MagicMock()
    df = simular_propagacion_campana(G, {1: 2.0}, eng, n_iter=80)
    row2 = df[df["cluster_id"] == 2].iloc[0]
    row3 = df[df["cluster_id"] == 3].iloc[0]
    assert row2["opinion_final"] > row2["opinion_inicial"] - 1e-6
    assert row3["opinion_final"] > row3["opinion_inicial"] - 1e-6
