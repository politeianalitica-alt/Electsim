"""Generadores de datos de demo (realistas, política española) para premium_charts."""

from __future__ import annotations

import random
from datetime import date, timedelta

import pandas as pd


def demo_electoral_data() -> dict[str, float]:
    """Sondeo actual estilizado."""
    return {
        "PP": 33.4,
        "PSOE": 28.1,
        "VOX": 12.6,
        "SUMAR": 7.2,
        "ERC": 2.1,
        "JUNTS": 1.8,
        "PNV": 1.2,
        "EH Bildu": 1.4,
        "BNG": 1.1,
        "CUP": 0.6,
    }


def demo_polling_history() -> pd.DataFrame:
    """90 días, columnas: date, party, value (DataFrame)."""
    rng = random.Random(42)
    parties = ["PP", "PSOE", "VOX", "SUMAR"]
    base = {"PP": 33.0, "PSOE": 28.5, "VOX": 13.0, "SUMAR": 7.5}
    end = date(2026, 5, 1)
    rows = []
    state = dict(base)
    for i in range(90):
        d = end - timedelta(days=89 - i)
        for p in parties:
            state[p] = max(0.5, state[p] + rng.uniform(-0.4, 0.4))
            rows.append({"date": d.isoformat(), "party": p, "value": round(state[p], 2)})
    return pd.DataFrame(rows)


def demo_congress_seats() -> dict[str, int]:
    """Distribución estilizada de 350 escaños."""
    return {
        "PP": 137,
        "PSOE": 121,
        "VOX": 33,
        "SUMAR": 27,
        "ERC": 7,
        "JUNTS": 7,
        "PNV": 5,
        "EH Bildu": 6,
        "BNG": 1,
        "CUP": 1,
        "CC": 1,
        "UPN": 1,
        "PRC": 1,
        "OTROS": 2,
    }


def demo_narratives() -> list[dict]:
    return [
        {
            "name": "Reforma fiscal",
            "start": "2026-04-01",
            "end": "2026-05-01",
            "intensity": 0.82,
            "mentions": 240,
        },
        {
            "name": "Vivienda asequible",
            "start": "2026-03-15",
            "end": "2026-04-25",
            "intensity": 0.65,
            "mentions": 180,
        },
        {
            "name": "Energía renovable",
            "start": "2026-02-20",
            "end": "2026-04-10",
            "intensity": 0.45,
            "mentions": 95,
        },
        {
            "name": "Inmigración",
            "start": "2026-04-10",
            "end": "2026-05-05",
            "intensity": 0.75,
            "mentions": 320,
        },
        {
            "name": "Sanidad pública",
            "start": "2026-03-05",
            "end": "2026-04-30",
            "intensity": 0.55,
            "mentions": 140,
        },
    ]


def demo_risk_matrix() -> tuple[list[list[float]], list[str], list[str]]:
    rows = ["Económico", "Social", "Político", "Geopolítico", "Reputacional"]
    cols = ["Q1", "Q2", "Q3", "Q4"]
    matrix = [
        [0.32, 0.45, 0.61, 0.55],
        [0.41, 0.52, 0.48, 0.58],
        [0.78, 0.82, 0.71, 0.68],
        [0.55, 0.48, 0.62, 0.71],
        [0.28, 0.35, 0.51, 0.45],
    ]
    return matrix, rows, cols


def demo_sentiment_radar() -> dict[str, float]:
    return {
        "Economía": 0.62,
        "Sanidad": 0.41,
        "Educación": 0.58,
        "Vivienda": 0.32,
        "Empleo": 0.71,
        "Seguridad": 0.49,
        "Medio Ambiente": 0.66,
    }


def demo_actor_network() -> tuple[list[dict], list[dict]]:
    nodes = [
        {"id": "moncloa", "label": "Moncloa", "x": 0.0, "y": 0.0, "size": 30, "color": "#E30613"},
        {"id": "psoe", "label": "PSOE", "x": -1.5, "y": 1.0, "size": 24, "color": "#E30613"},
        {"id": "sumar", "label": "Sumar", "x": -1.2, "y": -1.0, "size": 20, "color": "#E4007C"},
        {"id": "pp", "label": "PP", "x": 1.5, "y": 1.0, "size": 26, "color": "#009FDB"},
        {"id": "vox", "label": "Vox", "x": 1.8, "y": -0.6, "size": 18, "color": "#63BE21"},
        {"id": "junts", "label": "Junts", "x": -0.5, "y": 1.8, "size": 14, "color": "#00AEEF"},
        {"id": "erc", "label": "ERC", "x": -2.0, "y": 0.0, "size": 14, "color": "#F4B20A"},
    ]
    edges = [
        {"source": "moncloa", "target": "psoe"},
        {"source": "moncloa", "target": "sumar"},
        {"source": "psoe", "target": "junts"},
        {"source": "psoe", "target": "erc"},
        {"source": "pp", "target": "vox"},
        {"source": "psoe", "target": "pp"},
    ]
    return nodes, edges


def demo_voter_flow() -> tuple[list, list, list, list[str]]:
    # 0=PSOE_2023, 1=PP_2023, 2=VOX_2023, 3=SUMAR_2023
    # 4=PSOE_2026, 5=PP_2026, 6=VOX_2026, 7=SUMAR_2026, 8=ABSTENCIÓN
    labels = [
        "PSOE 23",
        "PP 23",
        "VOX 23",
        "SUMAR 23",
        "PSOE 26",
        "PP 26",
        "VOX 26",
        "SUMAR 26",
        "Abstención",
    ]
    source = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3]
    target = [4, 5, 8, 5, 6, 8, 5, 6, 7, 8]
    value = [62, 8, 12, 70, 6, 8, 18, 64, 55, 14]
    return source, target, value, labels


def demo_legislative_topics() -> list[dict]:
    return [
        {"label": "Iniciativas", "parent": "", "value": 0, "color": "#0D1320"},
        {"label": "Economía", "parent": "Iniciativas", "value": 0, "color": "#3B82F6"},
        {"label": "Social", "parent": "Iniciativas", "value": 0, "color": "#8B5CF6"},
        {"label": "Justicia", "parent": "Iniciativas", "value": 0, "color": "#00D4FF"},
        {"label": "PP / Economía", "parent": "Economía", "value": 22, "color": "#009FDB"},
        {"label": "PSOE / Economía", "parent": "Economía", "value": 18, "color": "#E30613"},
        {"label": "VOX / Economía", "parent": "Economía", "value": 9, "color": "#63BE21"},
        {"label": "PSOE / Social", "parent": "Social", "value": 26, "color": "#E30613"},
        {"label": "SUMAR / Social", "parent": "Social", "value": 17, "color": "#E4007C"},
        {"label": "PP / Justicia", "parent": "Justicia", "value": 11, "color": "#009FDB"},
        {"label": "VOX / Justicia", "parent": "Justicia", "value": 7, "color": "#63BE21"},
    ]


def demo_calendar_events() -> dict[str, int]:
    rng = random.Random(7)
    events: dict[str, int] = {}
    start = date(2026, 1, 1)
    for i in range(180):
        d = start + timedelta(days=i)
        # picos los lunes y viernes
        weight = 4 if d.weekday() in (0, 4) else 2
        events[d.isoformat()] = max(0, rng.randint(0, weight) + rng.choice([0, 0, 1, 2]))
    return events


def demo_alerts_hourly() -> list[int]:
    # Patrón realista: bajo de noche, picos a las 9, 14 y 20
    return [
        2, 1, 0, 0, 1, 1,
        3, 6, 12, 18, 14, 10,
        9, 13, 21, 17, 12, 11,
        16, 22, 24, 18, 9, 5,
    ]


__all__ = [
    "demo_electoral_data",
    "demo_polling_history",
    "demo_congress_seats",
    "demo_narratives",
    "demo_risk_matrix",
    "demo_sentiment_radar",
    "demo_actor_network",
    "demo_voter_flow",
    "demo_legislative_topics",
    "demo_calendar_events",
    "demo_alerts_hourly",
]
