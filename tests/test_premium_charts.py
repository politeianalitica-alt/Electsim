"""Tests para dashboard.ui.premium_charts."""

from __future__ import annotations

import plotly.graph_objects as go
import pytest

from dashboard.ui import premium_charts as pc
from dashboard.ui import premium_charts_demo as demo


# ── 1-4: cada chart devuelve Figure con tema aplicado ─────────────────────


def test_apply_premium_theme_sets_dark_bg():
    fig = go.Figure()
    pc.apply_premium_theme(fig)
    assert fig.layout.paper_bgcolor == pc.BG
    assert fig.layout.plot_bgcolor == pc.BG


def test_electoral_bar_chart_returns_figure():
    fig = pc.electoral_bar_chart(demo.demo_electoral_data(), title="Sondeo")
    assert fig is not None
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    assert len(fig.data) >= 1


def test_electoral_evolution_line_with_dataframe():
    fig = pc.electoral_evolution_line(demo.demo_polling_history(), title="Evolución")
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    # 4 partidos demo → 4 trazas
    assert len(fig.data) == 4


def test_electoral_evolution_line_with_dict():
    data = {
        "PP": {"2026-01-01": 30, "2026-02-01": 31},
        "PSOE": {"2026-01-01": 28, "2026-02-01": 27},
    }
    fig = pc.electoral_evolution_line(data)
    assert isinstance(fig, go.Figure)
    assert len(fig.data) == 2


# ── 5-8: hemiciclo, narrativas, heatmap, radar ────────────────────────────


def test_congress_hemicycle_total_seats():
    seats = demo.demo_congress_seats()
    fig = pc.congress_hemicycle(seats, total=350)
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    # una traza por partido con escaños > 0
    assert len(fig.data) >= 1


def test_narrative_timeline():
    fig = pc.narrative_timeline(demo.demo_narratives())
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    assert len(fig.data) == len(demo.demo_narratives())


def test_risk_heatmap():
    matrix, rows, cols = demo.demo_risk_matrix()
    fig = pc.risk_heatmap(matrix, rows, cols, title="Riesgo")
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    assert len(fig.data) == 1


def test_sentiment_radar():
    fig = pc.sentiment_radar(demo.demo_sentiment_radar(), title="Sentimiento")
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    assert fig.data[0].type == "scatterpolar"


# ── 9-12: red, sankey, treemap, sunburst ──────────────────────────────────


def test_actor_network_with_edges():
    nodes, edges = demo.demo_actor_network()
    fig = pc.actor_network(nodes, edges)
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG


def test_actor_network_handles_empty_edges():
    nodes, _ = demo.demo_actor_network()
    fig = pc.actor_network(nodes, [])
    assert isinstance(fig, go.Figure)
    # Solo la traza de nodos (no la de aristas) cuando edges está vacío
    assert len(fig.data) == 1


def test_sankey_voter_flow():
    src, tgt, val, labels = demo.demo_voter_flow()
    fig = pc.sankey_voter_flow(src, tgt, val, labels)
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG
    assert fig.data[0].type == "sankey"


def test_treemap_legislative_topics():
    fig = pc.treemap_legislative_topics(demo.demo_legislative_topics())
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "treemap"


def test_sunburst_actor_relations():
    items = [
        {"label": "Gobierno", "parent": "", "value": 10, "color": pc.BLUE},
        {"label": "Hacienda", "parent": "Gobierno", "value": 5, "color": pc.CYAN},
        {"label": "Interior", "parent": "Gobierno", "value": 5, "color": pc.PURPLE},
    ]
    fig = pc.sunburst_actor_relations(items)
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "sunburst"


# ── 13-16: calendar, gauge, funnel, polar clock, bullet ───────────────────


def test_calendar_heatmap_partial_year():
    events = {"2026-01-01": 3, "2026-03-15": 7, "2026-06-30": 2}
    fig = pc.calendar_heatmap(events, year=2026, title="Actividad")
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG


def test_gauge_kpi_with_thresholds():
    fig = pc.gauge_kpi(
        72.5,
        label="Riesgo agregado",
        max_value=100.0,
        thresholds={"low": 30, "medium": 60, "high": 100},
    )
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "indicator"


def test_gauge_kpi_default_thresholds():
    fig = pc.gauge_kpi(45.0, label="KPI")
    assert isinstance(fig, go.Figure)


def test_funnel_pipeline():
    fig = pc.funnel_pipeline(
        ["Leads", "Cualificados", "Demos", "Cerrados"],
        [200, 120, 60, 24],
        title="Embudo",
    )
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "funnel"


def test_polar_clock_alerts():
    fig = pc.polar_clock_alerts(demo.demo_alerts_hourly(), title="24h")
    assert isinstance(fig, go.Figure)
    assert fig.data[0].type == "barpolar"


def test_comparison_bullet():
    fig = pc.comparison_bullet(
        actuals=[78, 45, 92],
        targets=[80, 60, 85],
        labels=["Cobertura", "Engagement", "Conversión"],
    )
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG


# ── Robustez con entradas vacías ──────────────────────────────────────────


@pytest.mark.parametrize(
    "fn, args",
    [
        (pc.electoral_bar_chart, ({},)),
        (pc.electoral_evolution_line, ({},)),
        (pc.congress_hemicycle, ({},)),
        (pc.narrative_timeline, ([],)),
        (pc.risk_heatmap, ([], [], [])),
        (pc.sentiment_radar, ({},)),
        (pc.actor_network, ([], [])),
        (pc.sankey_voter_flow, ([], [], [], [])),
        (pc.treemap_legislative_topics, ([],)),
        (pc.sunburst_actor_relations, ([],)),
        (pc.calendar_heatmap, ({},)),
        (pc.funnel_pipeline, ([], [])),
        (pc.polar_clock_alerts, ([],)),
        (pc.comparison_bullet, ([], [], [])),
    ],
)
def test_charts_handle_empty_inputs(fn, args):
    fig = fn(*args)
    assert isinstance(fig, go.Figure)
    assert fig.layout.paper_bgcolor == pc.BG


# ── Demo data shapes ──────────────────────────────────────────────────────


def test_demo_data_shapes():
    assert isinstance(demo.demo_electoral_data(), dict)
    assert len(demo.demo_electoral_data()) >= 4

    df = demo.demo_polling_history()
    assert {"date", "party", "value"}.issubset(df.columns)
    assert len(df) > 0

    seats = demo.demo_congress_seats()
    assert sum(seats.values()) == 350

    assert isinstance(demo.demo_narratives(), list)
    assert all("name" in n for n in demo.demo_narratives())

    matrix, rows, cols = demo.demo_risk_matrix()
    assert len(matrix) == len(rows)
    assert len(matrix[0]) == len(cols)

    nodes, edges = demo.demo_actor_network()
    assert len(nodes) > 0 and len(edges) > 0

    src, tgt, val, labels = demo.demo_voter_flow()
    assert len(src) == len(tgt) == len(val)

    hours = demo.demo_alerts_hourly()
    assert len(hours) == 24
