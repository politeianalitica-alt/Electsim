"""
D3 — Termómetro de Riesgo Político
Risk Intelligence Hub — War-room director view.
Composite ITPE gauge, 5-dimension cards, risk matrix, threat analysis, temporal series,
CCAA map, response protocol and scenario fan chart.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import datetime
import hashlib
import random

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    mostrar_alertas_pagina,
    apply_plotly_theme,
    intel_header,
    signal_card,
    section_header,
    kpi_card,
    BG, BG2, BG3, BORDER,
    CYAN, BLUE, PURPLE,
    AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)

st.set_page_config(
    page_title="Risk Intelligence — ElectSim",
    page_icon="🌡",
    layout="wide",
)

sidebar_nav()
mostrar_alertas_pagina("termometro")

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
body, .stApp {{ background:{BG}; color:{TEXT}; }}
.dim-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:12px;
  padding:1rem 1rem .9rem;position:relative;overflow:hidden;
}}
.dim-card .top-border {{
  position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0;
}}
.dim-score {{
  font-size:2.2rem;font-weight:900;line-height:1;
  font-family:'JetBrains Mono',monospace;
}}
.dim-weight {{
  display:inline-block;background:{BG3};border:1px solid {BORDER};
  border-radius:20px;padding:.1rem .5rem;font-size:.6rem;
  color:{MUTED};font-weight:600;letter-spacing:.06em;
}}
.matrix-quad {{
  background:{BG2};border:1px solid {BORDER};border-radius:10px;
  padding:.6rem .8rem;font-size:.7rem;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;
}}
.risk-badge {{
  display:inline-block;border-radius:4px;padding:.15rem .5rem;
  font-size:.62rem;font-weight:700;letter-spacing:.06em;
}}
</style>
""", unsafe_allow_html=True)

# ── Constantes ────────────────────────────────────────────────────────────────
ZONE_RANGES = [
    (0,  20,  "#10B981", "Verde",   "Sin riesgo apreciable"),
    (20, 40,  "#EAB308", "Amarillo","Tensión latente"),
    (40, 60,  "#F97316", "Naranja", "Riesgo moderado"),
    (60, 80,  "#EF4444", "Rojo",    "Riesgo alto"),
    (80, 100, "#6B7280", "Crisis",  "Crisis activa"),
]

CCAA_DATA = [
    ("Cataluña",          68, "Tensión territorial", "PSC"),
    ("Madrid",            55, "Conflicto competencial", "PP"),
    ("País Vasco",        44, "Negociación estatutaria", "PNV"),
    ("Valencia",          62, "Crisis hídrica y vivienda", "PSPV-PSOE"),
    ("Andalucía",         41, "Reforma laboral local", "PP"),
    ("Galicia",           38, "Pesca y economía costera", "PP"),
    ("Castilla y León",   47, "Demografía rural y UE", "PP"),
    ("Aragón",            39, "Infraestructuras pendientes", "PP"),
    ("Murcia",            52, "Agua y Mar Menor", "PP"),
    ("Navarra",           49, "Cupo y financiación foral", "PSN"),
    ("Asturias",          43, "Reconversión industrial", "PSOE"),
    ("Canarias",          56, "Migración y turismo", "CC-PSOE"),
    ("Extremadura",       45, "Fondos europeos FEDER", "PP"),
    ("Castilla-La Mancha",40, "Despoblación y sequía", "PSOE"),
    ("Baleares",          51, "Turismo y vivienda", "PP"),
    ("Cantabria",         36, "Industria y empleo", "PP-PRC"),
    ("La Rioja",          34, "Sector vitivinícola", "PP"),
]

DEMO_RISKS = [
    {"titulo": "Fractura coalición investidura",    "dim": "Político",    "prob": 0.65, "impacto": 9, "nivel": "critico", "tendencia": "↑",
     "desc": "Tensiones internas en el gobierno de coalición amenazan la estabilidad parlamentaria con votos críticos pendientes."},
    {"titulo": "Crisis vivienda — tensión social",  "dim": "Social",      "prob": 0.82, "impacto": 7, "nivel": "alto",    "tendencia": "↑",
     "desc": "La emergencia habitacional impulsa movilización ciudadana con presión creciente sobre el ejecutivo central."},
    {"titulo": "Déficit fiscal — incumplimiento UE","dim": "Fiscal",      "prob": 0.41, "impacto": 8, "nivel": "alto",    "tendencia": "→",
     "desc": "El déficit estructural supera los límites del Pacto de Estabilidad; riesgo de procedimiento de déficit excesivo."},
    {"titulo": "Escalada tensión territorial Cataluña","dim": "Político", "prob": 0.55, "impacto": 8, "nivel": "alto",    "tendencia": "↑",
     "desc": "El proceso de negociación sobre la financiación singular enfrenta resistencia parlamentaria en el Congreso."},
    {"titulo": "Impacto aranceles EEUU-UE",         "dim": "Geopolítico", "prob": 0.73, "impacto": 6, "nivel": "alto",    "tendencia": "↑",
     "desc": "Las tensiones comerciales transatlánticas golpean sectores exportadores clave: automóvil, agroalimentario, acero."},
    {"titulo": "Reforma judicial — crisis institucional","dim": "Institucional","prob": 0.38,"impacto": 9,"nivel": "medio","tendencia": "→",
     "desc": "La renovación del CGPJ y cambios en el TC generan fricción entre poderes con potencial crisis constitucional."},
    {"titulo": "Inflación residual — encuesta CIS", "dim": "Social",      "prob": 0.60, "impacto": 5, "nivel": "medio",  "tendencia": "↓",
     "desc": "El IPC subyacente persiste, erosionando la valoración del ejecutivo según el último barómetro del CIS."},
    {"titulo": "Volatilidad energética Q3",         "dim": "Fiscal",      "prob": 0.45, "impacto": 6, "nivel": "medio",  "tendencia": "→",
     "desc": "Tensión en mercados de gas natural y electricidad anticipan presión en el coste de vida del tercer trimestre."},
]

DIMENSIONS = [
    {"key": "fiscal",        "label": "Fiscal",        "peso": "25%", "score": 58, "tendencia": "↑",
     "driver": "Déficit 3,2% PIB", "color": RED},
    {"key": "social",        "label": "Social",        "peso": "25%", "score": 61, "tendencia": "↑",
     "driver": "Crisis vivienda + CIS", "color": "#EF4444"},
    {"key": "politico",      "label": "Político",      "peso": "25%", "score": 47, "tendencia": "→",
     "driver": "Coalición investidura", "color": AMBER},
    {"key": "geopolitico",   "label": "Geopolítico",   "peso": "15%", "score": 42, "tendencia": "↑",
     "driver": "Aranceles EEUU-UE", "color": "#F97316"},
    {"key": "institucional", "label": "Institucional", "peso": "10%", "score": 38, "tendencia": "→",
     "driver": "CGPJ renovación", "color": CYAN},
]

ITPE_DEMO = 52.3

# ── Helpers ───────────────────────────────────────────────────────────────────
def _zona(score: float) -> tuple[str, str, str]:
    for lo, hi, color, name, desc in ZONE_RANGES:
        if lo <= score < hi:
            return color, name, desc
    return "#6B7280", "Crisis", "Crisis activa"


def _day_rng(extra: int = 0) -> random.Random:
    seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 100000
    return random.Random(seed + extra)


def _hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


# ── Data loading ──────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _cargar_datos() -> dict:
    itpe = ITPE_DEMO
    dims = {d["key"]: d["score"] for d in DIMENSIONS}

    # Try ITPEEngine
    try:
        from agents.analysis.itpe_engine import ITPEEngine  # type: ignore
        engine = ITPEEngine()
        result = engine.compute()
        if result and isinstance(result, dict):
            itpe = float(result.get("composite", itpe))
            for k in dims:
                if k in result:
                    dims[k] = float(result[k])
    except Exception:
        pass

    rng = _day_rng()
    itpe_jitter = itpe + rng.uniform(-2, 2)
    itpe = float(np.clip(itpe_jitter, 0, 100))

    # 90-day historical series (composite + dims)
    today = datetime.date.today()
    dates_90 = [today - datetime.timedelta(days=89 - i) for i in range(90)]

    def _series(base: float, vol: float, seed_off: int) -> list[float]:
        r = _day_rng(seed_off)
        vals: list[float] = []
        v = base + r.uniform(-5, 5)
        for i in range(90):
            # Seasonal sine wave + random walk
            season = 4 * np.sin(2 * np.pi * i / 30)
            v = float(np.clip(v + r.uniform(-vol, vol) + 0.1 * season, 0, 100))
            vals.append(v)
        return vals

    hist = {
        "itpe":        _series(itpe, 2.5, 0),
        "fiscal":      _series(dims["fiscal"], 2.0, 100),
        "social":      _series(dims["social"], 2.0, 200),
        "politico":    _series(dims["politico"], 3.0, 300),
        "geopolitico": _series(dims["geopolitico"], 2.5, 400),
        "institucional":_series(dims["institucional"], 1.5, 500),
    }

    # Align last value to current score
    hist["itpe"][-1] = itpe
    for k in dims:
        hist[k][-1] = dims[k]

    # 7-day ago delta
    delta_7 = itpe - hist["itpe"][-8]

    # Sparklines (last 30 days per dimension)
    sparklines = {k: hist[k][-30:] for k in hist}

    # CCAA scores with deterministic jitter
    ccaa_scored = []
    for i, (ccaa, base_s, driver, partido) in enumerate(CCAA_DATA):
        r2 = _day_rng(i * 137 + 77)
        s = float(np.clip(base_s + r2.uniform(-5, 5), 0, 100))
        ccaa_scored.append({"ccaa": ccaa, "score": s, "driver": driver, "partido": partido})
    ccaa_scored.sort(key=lambda x: x["score"], reverse=True)

    return {
        "itpe": itpe,
        "delta_7": delta_7,
        "dims": dims,
        "dims_meta": DIMENSIONS,
        "sparklines": sparklines,
        "dates_90": dates_90,
        "hist": hist,
        "ccaa": ccaa_scored,
    }


data = _cargar_datos()
itpe = data["itpe"]
delta_7 = data["delta_7"]
risk_color, risk_zone, risk_desc = _zona(itpe)

# ── Header ────────────────────────────────────────────────────────────────────
now_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
intel_header(
    title="Termómetro de Riesgo Político",
    subtitle="Risk Intelligence",
    status="LIVE",
    time_str=now_str,
)

# ── COMPOSITE GAUGE + DIMENSION KPI ROW ───────────────────────────────────────
col_gauge, col_dims = st.columns([5, 7])

with col_gauge:
    ref_7 = itpe - delta_7
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=itpe,
        delta={
            "reference": ref_7,
            "increasing": {"color": RED},
            "decreasing": {"color": GREEN},
            "valueformat": ".1f",
        },
        number={
            "font": {"size": 58, "color": TEXT, "family": "JetBrains Mono, monospace"},
            "valueformat": ".1f",
            "suffix": "",
        },
        gauge={
            "axis": {
                "range": [0, 100],
                "tickwidth": 1,
                "tickcolor": MUTED,
                "tickfont": {"color": MUTED, "size": 10},
                "nticks": 6,
            },
            "bar": {"color": risk_color, "thickness": 0.28},
            "bgcolor": BG3,
            "borderwidth": 0,
            "steps": [
                {"range": [0,  20],  "color": "rgba(16,185,129,0.14)"},
                {"range": [20, 40],  "color": "rgba(234,179,8,0.14)"},
                {"range": [40, 60],  "color": "rgba(249,115,22,0.14)"},
                {"range": [60, 80],  "color": "rgba(239,68,68,0.14)"},
                {"range": [80, 100], "color": "rgba(107,114,128,0.14)"},
            ],
            "threshold": {
                "line": {"color": risk_color, "width": 4},
                "thickness": 0.82,
                "value": itpe,
            },
        },
        title={
            "text": (
                f"<b style='color:{TEXT}'>ÍNDICE ITPE</b>"
                f"<br><span style='font-size:11px;color:{MUTED}'>Tensión Político-Económica</span>"
            ),
            "font": {"color": TEXT, "size": 13},
        },
        domain={"x": [0, 1], "y": [0, 1]},
    ))
    fig_gauge.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=300,
        margin=dict(l=20, r=20, t=55, b=10),
        font={"color": TEXT, "family": "Inter, sans-serif"},
        annotations=[{
            "text": f"<b style='color:{risk_color}'>ZONA {risk_zone.upper()}</b>"
                    f"<br><span style='color:{TEXT2};font-size:11px'>{risk_desc}</span>",
            "x": 0.5, "y": -0.05,
            "xref": "paper", "yref": "paper",
            "showarrow": False,
            "font": {"size": 13, "color": risk_color},
            "align": "center",
        }],
    )
    st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar": False}, key="itpe_gauge")

    # Zone legend
    zone_cols = st.columns(5)
    for zi, (_, _, zc, zn, _) in enumerate(ZONE_RANGES):
        with zone_cols[zi]:
            active = risk_zone == zn
            st.markdown(
                f'<div style="text-align:center;padding:.3rem .2rem;border-radius:6px;'
                f'background:{"" + zc + "22" if active else "transparent"};'
                f'border:{"1px solid " + zc if active else "1px solid transparent"}">'
                f'<div style="font-size:.65rem;font-weight:{"900" if active else "600"};color:{zc}">{zn}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

with col_dims:
    section_header("DIMENSIONES DEL RIESGO", CYAN)
    dim_cols = st.columns(5)
    for ci, dim in enumerate(data["dims_meta"]):
        sc = data["dims"][dim["key"]]
        dc, dz, _ = _zona(sc)
        sp = data["sparklines"][dim["key"]]
        # Build inline sparkline via Plotly
        fig_sp = go.Figure(go.Scatter(
            y=sp, mode="lines",
            line=dict(color=dc, width=1.5),
            fill="tozeroy",
            fillcolor=f"rgba{(*_hex_rgb(dc), 0.12)}",
        ))
        fig_sp.update_layout(
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            height=50,
            margin=dict(l=0, r=0, t=0, b=0),
            xaxis=dict(visible=False), yaxis=dict(visible=False, range=[0, 100]),
            showlegend=False,
        )
        with dim_cols[ci]:
            st.markdown(
                f'<div class="dim-card">'
                f'<div class="top-border" style="background:{dc}"></div>'
                f'<div style="font-size:.58rem;font-weight:800;color:{MUTED};'
                f'letter-spacing:.12em;text-transform:uppercase;margin-bottom:.3rem">'
                f'{dim["label"]}</div>'
                f'<div class="dim-score" style="color:{dc}">{sc:.0f}</div>'
                f'<div style="margin:.25rem 0;font-size:1rem;color:{dc}">{dim["tendencia"]}</div>'
                f'<div style="font-size:.62rem;color:{TEXT2};margin-bottom:.4rem;'
                f'min-height:2rem;line-height:1.35">{dim["driver"]}</div>'
                f'<span class="dim-weight">peso {dim["peso"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )
            st.plotly_chart(fig_sp, use_container_width=True,
                            config={"displayModeBar": False},
                            key=f"sparkline_{dim['key']}")

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ── RISK MATRIX ───────────────────────────────────────────────────────────────
section_header("MATRIZ DE RIESGO — Probabilidad × Impacto", RED)

_level_colors = {
    "critico": "#EF4444",
    "alto":    "#F97316",
    "medio":   "#EAB308",
    "bajo":    "#10B981",
}

fig_matrix = go.Figure()

# Quadrant backgrounds
fig_matrix.add_shape(type="rect", x0=0, y0=0, x1=0.5, y1=5, fillcolor="rgba(16,185,129,0.07)", line_width=0)
fig_matrix.add_shape(type="rect", x0=0.5, y0=0, x1=1.0, y1=5, fillcolor="rgba(234,179,8,0.07)", line_width=0)
fig_matrix.add_shape(type="rect", x0=0, y0=5, x1=0.5, y1=10, fillcolor="rgba(249,115,22,0.07)", line_width=0)
fig_matrix.add_shape(type="rect", x0=0.5, y0=5, x1=1.0, y1=10, fillcolor="rgba(239,68,68,0.10)", line_width=0)

# Quadrant labels
for (tx, ty, lbl, col) in [
    (0.25, 1.2, "Q1 · MONITORIZAR", GREEN),
    (0.75, 1.2, "Q2 · GESTIONAR", AMBER),
    (0.25, 9.1, "Q3 · VIGILAR", "#F97316"),
    (0.75, 9.1, "Q4 · ACCIÓN INMEDIATA", RED),
]:
    fig_matrix.add_annotation(
        x=tx, y=ty, text=f"<b>{lbl}</b>",
        showarrow=False, font=dict(size=9, color=col),
        xanchor="center", yanchor="bottom",
    )

# Divider lines
fig_matrix.add_shape(type="line", x0=0.5, y0=0, x1=0.5, y1=10,
                     line=dict(color=BORDER, dash="dot", width=1))
fig_matrix.add_shape(type="line", x0=0, y0=5, x1=1.0, y1=5,
                     line=dict(color=BORDER, dash="dot", width=1))

# Risk points
for risk in DEMO_RISKS:
    rc = _level_colors.get(risk["nivel"], MUTED)
    r2, g2, b2 = _hex_rgb(rc)
    fig_matrix.add_trace(go.Scatter(
        x=[risk["prob"]],
        y=[risk["impacto"]],
        mode="markers+text",
        marker=dict(
            size=18,
            color=f"rgba({r2},{g2},{b2},0.25)",
            line=dict(color=rc, width=2.5),
        ),
        text=[risk["tendencia"]],
        textfont=dict(size=10, color=TEXT),
        textposition="middle center",
        name=risk["titulo"],
        hovertemplate=(
            f"<b>{risk['titulo']}</b><br>"
            f"Dimensión: {risk['dim']}<br>"
            f"Probabilidad: {risk['prob']*100:.0f}%<br>"
            f"Impacto: {risk['impacto']}/10<br>"
            f"Nivel: {risk['nivel'].upper()}"
            "<extra></extra>"
        ),
        showlegend=False,
    ))
    fig_matrix.add_annotation(
        x=risk["prob"],
        y=risk["impacto"],
        text=risk["titulo"][:28] + ("…" if len(risk["titulo"]) > 28 else ""),
        showarrow=True,
        arrowhead=0,
        arrowwidth=1,
        arrowcolor=f"rgba({r2},{g2},{b2},0.5)",
        font=dict(size=8, color=TEXT2),
        bgcolor=BG3,
        bordercolor=rc,
        borderwidth=1,
        borderpad=2,
        ax=30 if risk["prob"] < 0.5 else -30,
        ay=-18,
    )

fig_matrix.update_layout(
    paper_bgcolor=BG2,
    plot_bgcolor=BG2,
    height=400,
    margin=dict(l=40, r=40, t=20, b=50),
    xaxis=dict(
        title="Probabilidad",
        range=[0, 1.02],
        tickformat=".0%",
        tickfont=dict(color=MUTED, size=10),
        gridcolor=BORDER,
        color=MUTED,
        showgrid=True,
    ),
    yaxis=dict(
        title="Impacto (1-10)",
        range=[0, 10.5],
        tickfont=dict(color=MUTED, size=10),
        gridcolor=BORDER,
        color=MUTED,
        showgrid=True,
    ),
    font=dict(color=TEXT),
    showlegend=False,
)
apply_plotly_theme(fig_matrix)
st.plotly_chart(fig_matrix, use_container_width=True,
                config={"displayModeBar": False}, key="risk_matrix")

# ── TABS ──────────────────────────────────────────────────────────────────────
tab_threats, tab_temporal, tab_ccaa, tab_protocolo, tab_escenarios = st.tabs([
    "AMENAZAS ACTIVAS",
    "ANÁLISIS TEMPORAL",
    "MAPA CCAA",
    "PROTOCOLO DE RESPUESTA",
    "ESCENARIOS",
])

# ════════════════════════════════════════════════════════════════════════════
# TAB 1 — AMENAZAS ACTIVAS
# ════════════════════════════════════════════════════════════════════════════
with tab_threats:
    f_col1, f_col2 = st.columns([2, 2])
    with f_col1:
        dims_opts = ["Todas"] + sorted(set(r["dim"] for r in DEMO_RISKS))
        dim_filter = st.selectbox("Filtrar por dimensión", dims_opts, key="threat_dim_filter")
    with f_col2:
        sev_opts = ["Todos", "critico", "alto", "medio"]
        sev_filter = st.selectbox("Filtrar por severidad", sev_opts, key="threat_sev_filter")

    filtered = [
        r for r in DEMO_RISKS
        if (dim_filter == "Todas" or r["dim"] == dim_filter)
        and (sev_filter == "Todos" or r["nivel"] == sev_filter)
    ]
    filtered_sorted = sorted(filtered, key=lambda x: (-x["impacto"], -x["prob"]))

    st.markdown(f'<div style="color:{MUTED};font-size:.72rem;margin:.4rem 0 .8rem">Mostrando {len(filtered_sorted)} amenazas activas</div>', unsafe_allow_html=True)

    _level_signal_map = {
        "critico": "critical",
        "alto":    "high",
        "medio":   "medium",
        "bajo":    "low",
    }

    for risk in filtered_sorted:
        rc = _level_colors.get(risk["nivel"], MUTED)
        level_signal = _level_signal_map.get(risk["nivel"], "medium")
        body = (
            f"{risk['desc']} — "
            f"<b>Probabilidad: {risk['prob']*100:.0f}%</b> · "
            f"<b>Impacto: {risk['impacto']}/10</b> · "
            f"Tendencia: {risk['tendencia']}"
        )
        st.markdown(
            signal_card(
                title=f"{risk['titulo']}",
                body=body,
                level=level_signal,
                source=f"Dimensión: {risk['dim']}",
                time_ago="Actualizado hoy",
            ),
            unsafe_allow_html=True,
        )

# ════════════════════════════════════════════════════════════════════════════
# TAB 2 — ANÁLISIS TEMPORAL (90 días)
# ════════════════════════════════════════════════════════════════════════════
with tab_temporal:
    section_header("EVOLUCIÓN ITPE + DIMENSIONES — Últimos 90 días", CYAN)

    dates_str = [d.isoformat() for d in data["dates_90"]]
    hist = data["hist"]

    view_mode = st.radio("Vista", ["Líneas", "Área"], horizontal=True, key="temporal_view")

    fig_temporal = go.Figure()

    # Background zone bands
    for lo, hi, col, nm, _ in ZONE_RANGES:
        r2, g2, b2 = _hex_rgb(col)
        fig_temporal.add_hrect(y0=lo, y1=hi,
                               fillcolor=f"rgba({r2},{g2},{b2},0.05)",
                               line_width=0)

    dim_colors_map = {
        "itpe":         CYAN,
        "fiscal":       RED,
        "social":       "#EF4444",
        "politico":     AMBER,
        "geopolitico":  "#F97316",
        "institucional":PURPLE,
    }
    dim_labels_map = {
        "itpe":         "ITPE Compuesto",
        "fiscal":       "Fiscal",
        "social":       "Social",
        "politico":     "Político",
        "geopolitico":  "Geopolítico",
        "institucional":"Institucional",
    }
    dim_widths = {
        "itpe": 3.5,
        "fiscal": 1.5,
        "social": 1.5,
        "politico": 1.5,
        "geopolitico": 1.5,
        "institucional": 1.5,
    }

    for key in ["institucional", "geopolitico", "politico", "social", "fiscal", "itpe"]:
        col = dim_colors_map[key]
        r2, g2, b2 = _hex_rgb(col)
        fill_mode = "tozeroy" if view_mode == "Área" and key == "itpe" else "none"
        fig_temporal.add_trace(go.Scatter(
            x=dates_str,
            y=hist[key],
            name=dim_labels_map[key],
            mode="lines",
            line=dict(
                color=col,
                width=dim_widths[key],
                dash="solid" if key == "itpe" else "dot" if key in ("fiscal", "social") else "solid",
            ),
            fill=fill_mode,
            fillcolor=f"rgba({r2},{g2},{b2},0.06)" if fill_mode != "none" else None,
            opacity=1.0 if key == "itpe" else 0.75,
            hovertemplate=f"<b>{dim_labels_map[key]}</b><br>%{{x}}<br>Score: %{{y:.1f}}<extra></extra>",
        ))

    # Annotate major events
    events = [
        (datetime.date.today() - datetime.timedelta(days=75), "Debate parlamentario presupuestos", 82),
        (datetime.date.today() - datetime.timedelta(days=55), "Publicación barómetro CIS", 88),
        (datetime.date.today() - datetime.timedelta(days=38), "Crisis territorial Cataluña", 92),
        (datetime.date.today() - datetime.timedelta(days=18), "Reunión Consejo de Ministros", 78),
        (datetime.date.today() - datetime.timedelta(days=7),  "Votación Congreso — ley vivienda", 85),
    ]
    for ev_date, ev_label, ev_y in events:
        ev_str = ev_date.isoformat()
        if ev_str in dates_str:
            fig_temporal.add_shape(
                type="line", x0=ev_str, x1=ev_str, y0=0, y1=1,
                xref="x", yref="paper",
                line=dict(color=MUTED, dash="dash", width=1),
            )
            fig_temporal.add_annotation(
                x=ev_str, y=1.0, xref="x", yref="paper",
                text=ev_label, showarrow=False,
                font=dict(color=TEXT2, size=9),
                yanchor="bottom", textangle=-90,
            )

    fig_temporal.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=440,
        margin=dict(l=10, r=20, t=20, b=50),
        xaxis=dict(
            tickfont=dict(color=MUTED, size=10),
            gridcolor=BORDER,
            color=MUTED,
        ),
        yaxis=dict(
            range=[0, 100],
            tickfont=dict(color=MUTED, size=10),
            gridcolor=BORDER,
            color=MUTED,
            title="Score (0-100)",
        ),
        legend=dict(
            font=dict(color=TEXT2, size=10),
            bgcolor=BG3,
            bordercolor=BORDER,
            borderwidth=1,
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="left",
            x=0,
        ),
        font=dict(color=TEXT),
        hovermode="x unified",
    )
    apply_plotly_theme(fig_temporal)
    st.plotly_chart(fig_temporal, use_container_width=True,
                    config={"displayModeBar": False}, key="temporal_chart")

    # Summary metrics
    m1, m2, m3, m4, m5 = st.columns(5)
    hist_itpe = hist["itpe"]
    with m1:
        d7 = hist_itpe[-1] - hist_itpe[-8]
        st.metric("Cambio 7 días", f"{hist_itpe[-1]:.1f}", delta=f"{d7:+.1f}")
    with m2:
        st.metric("Máximo 90d", f"{max(hist_itpe):.1f}")
    with m3:
        st.metric("Mínimo 90d", f"{min(hist_itpe):.1f}")
    with m4:
        avg = float(np.mean(hist_itpe[-30:]))
        st.metric("Media 30d", f"{avg:.1f}", delta=f"{hist_itpe[-1]-avg:+.1f}")
    with m5:
        trend = float(np.polyfit(range(14), hist_itpe[-14:], 1)[0])
        trend_label = "↑ Creciente" if trend > 0.2 else ("↓ Decreciente" if trend < -0.2 else "→ Estable")
        st.metric("Tendencia 14d", trend_label)

# ════════════════════════════════════════════════════════════════════════════
# TAB 3 — MAPA CCAA
# ════════════════════════════════════════════════════════════════════════════
with tab_ccaa:
    section_header("RIESGO POR COMUNIDAD AUTÓNOMA", PURPLE)
    st.markdown(f'<div style="color:{MUTED};font-size:.72rem;margin-bottom:.8rem">Ordenadas por score de riesgo descendente · Actualización diaria</div>', unsafe_allow_html=True)

    header_html = (
        f'<div style="display:grid;grid-template-columns:2fr 80px 2fr 1fr;gap:.5rem;'
        f'padding:.4rem .8rem;background:{BG3};border-radius:6px;margin-bottom:.4rem;'
        f'font-size:.62rem;font-weight:800;color:{MUTED};letter-spacing:.1em;text-transform:uppercase">'
        f'<div>Comunidad Autónoma</div><div style="text-align:center">Score</div>'
        f'<div>Principal riesgo</div><div>Gobierno</div></div>'
    )
    st.markdown(header_html, unsafe_allow_html=True)

    for row in data["ccaa"]:
        sc = row["score"]
        rc, rz, _ = _zona(sc)
        r2, g2, b2 = _hex_rgb(rc)
        bar_w = int(sc)
        row_html = (
            f'<div style="display:grid;grid-template-columns:2fr 80px 2fr 1fr;gap:.5rem;'
            f'padding:.55rem .8rem;background:{BG2};border:1px solid {BORDER};'
            f'border-left:3px solid {rc};border-radius:8px;margin-bottom:.3rem;'
            f'align-items:center">'
            f'<div style="font-size:.83rem;font-weight:600;color:{TEXT}">{row["ccaa"]}</div>'
            f'<div style="text-align:center">'
            f'<div style="font-size:1.05rem;font-weight:900;color:{rc};'
            f'font-family:\'JetBrains Mono\',monospace;line-height:1">{sc:.0f}</div>'
            f'<div style="height:4px;background:{BG3};border-radius:2px;margin-top:.3rem">'
            f'<div style="width:{bar_w}%;height:4px;background:{rc};border-radius:2px"></div></div>'
            f'</div>'
            f'<div style="font-size:.75rem;color:{TEXT2}">{row["driver"]}</div>'
            f'<div style="font-size:.72rem;color:{MUTED};font-weight:600">{row["partido"]}</div>'
            f'</div>'
        )
        st.markdown(row_html, unsafe_allow_html=True)

# ════════════════════════════════════════════════════════════════════════════
# TAB 4 — PROTOCOLO DE RESPUESTA
# ════════════════════════════════════════════════════════════════════════════
with tab_protocolo:
    section_header("PROTOCOLO DE RESPUESTA SEGÚN NIVEL ITPE", CYAN)

    current_level = risk_zone

    protocols = [
        {
            "zone": "Verde",
            "color": "#10B981",
            "trigger": "ITPE 0-20",
            "title": "VIGILANCIA ESTÁNDAR",
            "responsable": "Equipo de análisis",
            "plazo": "Rutina semanal",
            "acciones": [
                "Monitorización pasiva: revisar dashboard 2 veces/día",
                "Actualizar informe semanal de riesgo",
                "Mantener canales de comunicación abiertos con portavoces",
                "Revisar indicadores macroeconómicos semanalmente",
            ],
        },
        {
            "zone": "Amarillo",
            "color": "#EAB308",
            "trigger": "ITPE 20-40",
            "title": "ALERTA TEMPRANA",
            "responsable": "Director de comunicación + analistas",
            "plazo": "Revisión cada 48h",
            "acciones": [
                "Activar seguimiento intensivo de medios y redes sociales",
                "Preparar líneas narrativas preventivas para portavoces",
                "Convocar reunión de coordinación semanal del equipo de crisis",
                "Identificar y mapear posibles vectores de escalada",
                "Revisar agenda parlamentaria de las próximas 2 semanas",
            ],
        },
        {
            "zone": "Naranja",
            "color": "#F97316",
            "trigger": "ITPE 40-60",
            "title": "PREPARACIÓN DE CRISIS",
            "responsable": "Comité de crisis + dirección política",
            "plazo": "Reunión diaria obligatoria",
            "acciones": [
                "Activar sala de crisis: reunión diaria a las 08:00",
                "Preparar declaraciones institucionales contingentes",
                "Monitorización de medios cada 4 horas (h8/h12/h16/h20)",
                "Alertar a parlamentarios del grupo sobre posibles votaciones críticas",
                "Preparar respuestas a los 3 escenarios de escalada más probables",
                "Coordinar con asesores jurídicos sobre posiciones institucionales",
            ],
        },
        {
            "zone": "Rojo",
            "color": "#EF4444",
            "trigger": "ITPE 60-80",
            "title": "RESPUESTA DE CRISIS",
            "responsable": "Gabinete completo + Secretaría de Estado",
            "plazo": "Tiempo real — respuesta < 2h",
            "acciones": [
                "Activar comité de crisis de nivel máximo (gabinete)",
                "Emitir declaración institucional en < 1 hora",
                "Comparecencia pública del portavoz autorizado",
                "Monitorización de redes cada 30 minutos",
                "Preparar comparecencia parlamentaria urgente si aplica",
                "Activar red de aliados institucionales para apoyo narrativo",
                "Coordinar con medios afines para encuadre del mensaje",
                "Evaluar escalada cada 4 horas y actualizar protocolo",
            ],
        },
        {
            "zone": "Crisis",
            "color": "#6B7280",
            "trigger": "ITPE 80-100",
            "title": "PROTOCOLO DE EMERGENCIA",
            "responsable": "Presidencia + todos los ministros",
            "plazo": "Activación inmediata — 24/7",
            "acciones": [
                "ALERTA MÁXIMA: activar protocolo de continuidad de gobierno",
                "Reunión de emergencia del Consejo de Ministros",
                "Comunicación directa con Jefatura del Estado",
                "Convocatoria extraordinaria del Congreso si procede legalmente",
                "Gestión de comunicación centralizada desde la Moncloa",
                "Activar contactos internacionales (UE, socios estratégicos)",
                "Evaluation de escenarios constitucionales extremos",
                "Revisión cada hora con el Gabinete de Crisis",
            ],
        },
    ]

    for proto in protocols:
        active = proto["zone"] == current_level
        zc = proto["color"]
        r2, g2, b2 = _hex_rgb(zc)
        bg_op = 0.15 if active else 0.06
        border_op = 1.0 if active else 0.35

        badge_html = ""
        if active:
            badge_html = (
                f'<span style="background:{zc};color:#fff;border-radius:4px;'
                f'padding:.15rem .6rem;font-size:.6rem;font-weight:900;'
                f'letter-spacing:.1em;margin-left:.7rem">NIVEL ACTUAL</span>'
            )

        acciones_checks = ""
        for acc in proto["acciones"]:
            chk_key = f"chk_{proto['zone']}_{proto['acciones'].index(acc)}"
            checked = st.session_state.get(chk_key, False)
            check_html = "&#9745;" if checked else "&#9744;"
            acciones_checks += (
                f'<div style="display:flex;align-items:flex-start;gap:.5rem;'
                f'margin:.3rem 0;font-size:.8rem;color:{TEXT2};cursor:pointer">'
                f'<span style="color:{zc};font-size:.9rem;flex-shrink:0">{check_html}</span>'
                f'<span>{acc}</span></div>'
            )

        st.markdown(
            f'<div style="background:rgba({r2},{g2},{b2},{bg_op});'
            f'border:1px solid rgba({r2},{g2},{b2},{border_op});'
            f'border-left:5px solid {zc};border-radius:12px;padding:1.1rem 1.3rem;margin:.7rem 0">'
            f'<div style="display:flex;align-items:center;margin-bottom:.3rem;flex-wrap:wrap;gap:.3rem">'
            f'<span style="font-size:.65rem;font-weight:900;color:{zc};'
            f'letter-spacing:.1em;text-transform:uppercase">{proto["trigger"]}</span>'
            f'{badge_html}</div>'
            f'<div style="font-size:1rem;font-weight:800;color:{TEXT};margin-bottom:.2rem">'
            f'{proto["title"]}</div>'
            f'<div style="font-size:.72rem;color:{MUTED};margin-bottom:.8rem">'
            f'Responsable: <b style="color:{TEXT2}">{proto["responsable"]}</b> · '
            f'Plazo: <b style="color:{TEXT2}">{proto["plazo"]}</b></div>'
            f'{acciones_checks}</div>',
            unsafe_allow_html=True,
        )
        if active:
            with st.expander("Marcar acciones completadas", expanded=False):
                for acc in proto["acciones"]:
                    chk_key = f"chk_{proto['zone']}_{proto['acciones'].index(acc)}"
                    st.checkbox(acc, key=chk_key)

# ════════════════════════════════════════════════════════════════════════════
# TAB 5 — ESCENARIOS
# ════════════════════════════════════════════════════════════════════════════
with tab_escenarios:
    section_header("ESCENARIOS DE RIESGO — Proyección 90 días", PURPLE)

    today = datetime.date.today()
    proj_dates = [today + datetime.timedelta(days=i * 3) for i in range(31)]
    proj_dates_str = [d.isoformat() for d in proj_dates]
    n_pts = len(proj_dates_str)

    rng_base = _day_rng(9999)

    def _scenario_series(start: float, end: float, vol: float, seed_off: int) -> list[float]:
        r = _day_rng(seed_off)
        vals = []
        v = start
        target = end
        for i in range(n_pts):
            pull = (target - v) * 0.05
            v = float(np.clip(v + pull + r.uniform(-vol, vol), 0, 100))
            vals.append(v)
        vals[-1] = end
        return vals

    scenarios = [
        {
            "name":        "Optimista",
            "color":       GREEN,
            "prob":        25,
            "start":       itpe,
            "end":         itpe - 14,
            "vol":         1.2,
            "seed":        1001,
            "assumptions": [
                "Acuerdo presupuestario entre socios de gobierno antes de julio",
                "Moderación de la inflación por debajo del 2,5% en Q3",
                "Negociación territorial Cataluña desbloquea mayorías parlamentarias",
                "Impacto de aranceles EEUU-UE menor al previsto — acuerdo sectorial",
            ],
            "electoral":   "PP pierde 4-5 escaños, PSOE recupera terreno en intención de voto",
            "bifurcacion": "Publicación CIS con mejora de valoración del gobierno > 5p",
        },
        {
            "name":        "Base",
            "color":       AMBER,
            "prob":        55,
            "start":       itpe,
            "end":         itpe + 3,
            "vol":         2.0,
            "seed":        2001,
            "assumptions": [
                "Gobierno mantiene mayoría parlamentaria ajustada con acuerdos puntuales",
                "Déficit fiscal se contiene en el 3,2% con medidas parciales",
                "Tensión territorial latente sin resolución definitiva",
                "Aranceles impactan moderadamente el sector exportador español",
            ],
            "electoral":   "Empate técnico PP-PSOE, sin cambios estructurales en el mapa electoral",
            "bifurcacion": "Resultado de negociaciones presupuestarias en el Congreso (sept.)",
        },
        {
            "name":        "Pesimista",
            "color":       RED,
            "prob":        20,
            "start":       itpe,
            "end":         itpe + 22,
            "vol":         2.8,
            "seed":        3001,
            "assumptions": [
                "Ruptura de la coalición de gobierno — convocatoria electoral anticipada",
                "Escalada aranceles UE-EEUU provoca recesión técnica en Q3-Q4",
                "Crisis constitucional por impasse CGPJ/TC — intervención judicial",
                "Huelga general convocada por sindicatos — paralización sectorial 48h",
            ],
            "electoral":   "PP gana 15-20 escaños en elecciones anticipadas, posible gobierno en minoría PP+VOX",
            "bifurcacion": "Votación de cuestión de confianza o moción de censura en el Congreso",
        },
    ]

    # Fan chart
    fig_fan = go.Figure()

    # Zona bands
    for lo, hi, col, nm, _ in ZONE_RANGES:
        r2, g2, b2 = _hex_rgb(col)
        fig_fan.add_hrect(y0=lo, y1=hi, fillcolor=f"rgba({r2},{g2},{b2},0.04)", line_width=0)

    # Historical anchor (last 30 days)
    anchor_dates = [
        (today - datetime.timedelta(days=29 - i)).isoformat() for i in range(30)
    ]
    fig_fan.add_trace(go.Scatter(
        x=anchor_dates,
        y=data["hist"]["itpe"][-30:],
        mode="lines",
        name="Histórico (30d)",
        line=dict(color=CYAN, width=2.5),
        hovertemplate="Histórico<br>%{x}: %{y:.1f}<extra></extra>",
    ))

    # Scenario series + upper/lower envelope
    scenario_series_all = {}
    for sc in scenarios:
        series = _scenario_series(sc["start"], sc["end"], sc["vol"], sc["seed"])
        scenario_series_all[sc["name"]] = series
        r2, g2, b2 = _hex_rgb(sc["color"])

        fig_fan.add_trace(go.Scatter(
            x=proj_dates_str,
            y=series,
            mode="lines",
            name=f"{sc['name']} ({sc['prob']}%)",
            line=dict(color=sc["color"], width=2.2,
                      dash="solid" if sc["name"] == "Base" else "dot"),
            opacity=0.9,
            hovertemplate=f"<b>{sc['name']}</b><br>%{{x}}: %{{y:.1f}}<extra></extra>",
        ))

    # Fan fill between optimista and pesimista
    opt_series = scenario_series_all["Optimista"]
    pes_series = scenario_series_all["Pesimista"]
    fig_fan.add_trace(go.Scatter(
        x=proj_dates_str + proj_dates_str[::-1],
        y=pes_series + opt_series[::-1],
        fill="toself",
        fillcolor="rgba(245,158,11,0.07)",
        line=dict(color="rgba(0,0,0,0)"),
        name="Rango de incertidumbre",
        showlegend=True,
        hoverinfo="skip",
    ))

    # Today line
    fig_fan.add_shape(
        type="line", x0=today.isoformat(), x1=today.isoformat(), y0=0, y1=1,
        xref="x", yref="paper",
        line=dict(color=MUTED, dash="dash", width=1.5),
    )
    fig_fan.add_annotation(
        x=today.isoformat(), y=1.0, xref="x", yref="paper",
        text="Hoy", showarrow=False,
        font=dict(color=MUTED, size=10),
        yanchor="bottom",
    )

    fig_fan.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=400,
        margin=dict(l=10, r=20, t=20, b=50),
        xaxis=dict(tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
        yaxis=dict(range=[0, 100], tickfont=dict(color=MUTED, size=10),
                   gridcolor=BORDER, color=MUTED, title="ITPE Score"),
        legend=dict(font=dict(color=TEXT2, size=10), bgcolor=BG3,
                    bordercolor=BORDER, borderwidth=1),
        font=dict(color=TEXT),
        hovermode="x unified",
    )
    apply_plotly_theme(fig_fan)
    st.plotly_chart(fig_fan, use_container_width=True,
                    config={"displayModeBar": False}, key="fan_chart")

    # Scenario cards
    sc_cols = st.columns(3)
    for ci, sc in enumerate(scenarios):
        zc = sc["color"]
        r2, g2, b2 = _hex_rgb(zc)
        end_itpe = sc["end"]
        end_color, end_zone, _ = _zona(end_itpe)
        assumptions_html = "".join(
            f'<li style="margin:.3rem 0;color:{TEXT2};font-size:.77rem">{a}</li>'
            for a in sc["assumptions"]
        )
        with sc_cols[ci]:
            st.markdown(
                f'<div style="background:rgba({r2},{g2},{b2},0.1);'
                f'border:1px solid rgba({r2},{g2},{b2},0.6);'
                f'border-top:4px solid {zc};border-radius:12px;padding:1.1rem 1.1rem .9rem">'
                f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
                f'<div>'
                f'<div style="font-size:.6rem;font-weight:900;color:{zc};letter-spacing:.12em;text-transform:uppercase">{sc["name"]}</div>'
                f'<div style="font-size:1.5rem;font-weight:900;color:{TEXT};font-family:\'JetBrains Mono\',monospace;line-height:1;margin-top:.2rem">{sc["prob"]}%</div>'
                f'<div style="font-size:.62rem;color:{MUTED}">probabilidad</div>'
                f'</div>'
                f'<div style="text-align:right">'
                f'<div style="font-size:.6rem;color:{MUTED};margin-bottom:.2rem">ITPE día 90</div>'
                f'<div style="font-size:1.3rem;font-weight:900;color:{end_color};font-family:\'JetBrains Mono\',monospace">{end_itpe:.0f}</div>'
                f'<div style="font-size:.6rem;color:{end_color}">{end_zone}</div>'
                f'</div></div>'
                f'<hr style="border:none;border-top:1px solid {BORDER};margin:.6rem 0">'
                f'<div style="font-size:.65rem;font-weight:800;color:{MUTED};text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem">Supuestos clave</div>'
                f'<ul style="margin:.2rem 0 0 .8rem;padding:0;list-style:disc">{assumptions_html}</ul>'
                f'<hr style="border:none;border-top:1px solid {BORDER};margin:.7rem 0">'
                f'<div style="font-size:.65rem;font-weight:800;color:{MUTED};text-transform:uppercase;letter-spacing:.1em;margin-bottom:.3rem">Impacto electoral</div>'
                f'<div style="font-size:.77rem;color:{TEXT2}">{sc["electoral"]}</div>'
                f'<hr style="border:none;border-top:1px solid {BORDER};margin:.7rem 0">'
                f'<div style="font-size:.65rem;font-weight:800;color:{MUTED};text-transform:uppercase;letter-spacing:.1em;margin-bottom:.3rem">Factor de bifurcación</div>'
                f'<div style="font-size:.77rem;color:{zc};font-weight:600">{sc["bifurcacion"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
