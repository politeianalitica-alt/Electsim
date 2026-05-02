"""
D5 — Gobierno & Coalición
Coalition Intelligence: estabilidad, pactos, escenarios, moción de censura.
"""
from __future__ import annotations
import sys
import itertools
from pathlib import Path
from datetime import datetime

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
    intel_header, apply_plotly_theme, signal_card, confidence_badge,
    hex_to_rgba,
)

st.set_page_config(
    page_title="Gobierno & Coalición — ElectSim",
    page_icon="🏛",
    layout="wide",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("coalicion")

# ── Constantes ────────────────────────────────────────────────────────────────
TOTAL_ESCANOS = 350
MAYORIA_ABS = 176

# ── Datos de coalición actual ─────────────────────────────────────────────────
SOCIOS = [
    {"partido": "PSOE",     "escanos": 120, "apoyo": 100, "tipo": "gobierno",       "exigencias": "Agenda progresista",           "ultimo_incidente": "Tensión interna presupuestos",  "color": "#E30613"},
    {"partido": "SUMAR",    "escanos": 31,  "apoyo": 87,  "tipo": "gobierno",       "exigencias": "Reducción jornada laboral",     "ultimo_incidente": "Discrepancias vivienda",        "color": "#E4007C"},
    {"partido": "ERC",      "escanos": 7,   "apoyo": 62,  "tipo": "apoyo_externo",  "exigencias": "Financiación singular Cataluña","ultimo_incidente": "Bloqueo decreto ómnibus",       "color": "#F4B20A"},
    {"partido": "JUNTS",    "escanos": 7,   "apoyo": 41,  "tipo": "apoyo_externo",  "exigencias": "Amnistía / referéndum",         "ultimo_incidente": "Ultimátum sobre extradición",  "color": "#00AEEF"},
    {"partido": "PNV",      "escanos": 5,   "apoyo": 78,  "tipo": "apoyo_externo",  "exigencias": "Concierto económico",           "ultimo_incidente": "Negociación cupo vasco",        "color": "#007A3D"},
    {"partido": "EH Bildu", "escanos": 4,   "apoyo": 71,  "tipo": "apoyo_externo",  "exigencias": "Políticas sociales",            "ultimo_incidente": "Declaración sobre violencia",  "color": "#A9C55A"},
    {"partido": "CC",       "escanos": 1,   "apoyo": 55,  "tipo": "apoyo_externo",  "exigencias": "REF canario",                   "ultimo_incidente": "Demanda infraestructuras",     "color": "#FFCB00"},
]

ESCANOS_OPOSICION = {
    "PP": 137, "VOX": 33,
}

# Partidos fuera del bloque de investidura
RESTO = {"BNG": 1, "UPN": 1, "PRC": 1}

# ── Calcular índice de estabilidad ────────────────────────────────────────────
def _indice_estabilidad() -> float:
    """Índice compuesto 0-100 basado en apoyo ponderado por escaños."""
    total_esc = sum(s["escanos"] for s in SOCIOS)
    ponderado = sum(s["escanos"] * s["apoyo"] / 100 for s in SOCIOS)
    return round(ponderado / total_esc * 100, 1)


def _escanos_gobierno() -> int:
    return sum(s["escanos"] for s in SOCIOS)


def _color_estabilidad(idx: float) -> str:
    if idx >= 70:
        return GREEN
    if idx >= 50:
        return AMBER
    return RED


# ── Header ────────────────────────────────────────────────────────────────────
intel_header(
    title="Gobierno & Coalición",
    subtitle="Coalition Intelligence",
    status="ACTIVO",
    time_str=datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# ── TOP SECTION — Estado actual del gobierno ──────────────────────────────────
estabilidad = _indice_estabilidad()
escanos_gov = _escanos_gobierno()
faltan = max(0, MAYORIA_ABS - escanos_gov)
c_est = _color_estabilidad(estabilidad)

col_gauge, col_socios, col_riesgo = st.columns(3)

with col_gauge:
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=estabilidad,
        number={"suffix": "", "font": {"color": c_est, "size": 38}},
        delta={"reference": 65, "increasing": {"color": GREEN}, "decreasing": {"color": RED}},
        title={"text": "Índice de Estabilidad", "font": {"size": 11, "color": TEXT2}},
        gauge={
            "axis": {"range": [0, 100], "tickcolor": MUTED, "tickfont": {"size": 9, "color": MUTED}},
            "bar": {"color": c_est, "thickness": 0.28},
            "steps": [
                {"range": [0, 40],   "color": "rgba(239,68,68,0.12)"},
                {"range": [40, 65],  "color": "rgba(245,158,11,0.10)"},
                {"range": [65, 100], "color": "rgba(16,185,129,0.10)"},
            ],
            "threshold": {"line": {"color": CYAN, "width": 2}, "thickness": 0.8, "value": 65},
        },
    ))
    fig_gauge.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        font=dict(color=TEXT), height=200,
        margin=dict(t=50, b=10, l=20, r=20),
    )
    st.plotly_chart(fig_gauge, use_container_width=True)

with col_socios:
    st.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.1rem 1.2rem;height:200px;display:flex;flex-direction:column;justify-content:center">'
        f'<div style="font-size:.62rem;font-weight:800;color:{MUTED};letter-spacing:.12em;text-transform:uppercase;margin-bottom:.8rem">ARITMÉTICA DE COALICIÓN</div>',
        unsafe_allow_html=True,
    )
    # Mini barra de escaños
    for s in SOCIOS:
        pct = s["escanos"] / TOTAL_ESCANOS * 100
        c = s["color"]
        st.markdown(
            f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
            f'<span style="font-size:.7rem;color:{c};font-weight:700;width:65px">{s["partido"]}</span>'
            f'<div style="flex:1;background:{BORDER};border-radius:3px;height:5px">'
            f'<div style="background:{c};width:{pct:.1f}%;height:100%;border-radius:3px"></div>'
            f'</div>'
            f'<span style="font-size:.68rem;color:{TEXT2};font-family:monospace;width:30px;text-align:right">{s["escanos"]}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )
    need_color = RED if faltan > 0 else GREEN
    st.markdown(
        f'<div style="margin-top:.6rem;font-size:.72rem;color:{need_color};font-weight:700">'
        f'Total bloque: {escanos_gov} / {MAYORIA_ABS} necesarios'
        f'{"  — FALTAN " + str(faltan) if faltan > 0 else "  — MAYORÍA SUFICIENTE"}</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

with col_riesgo:
    nivel_riesgo = "ALTO" if estabilidad < 50 else ("MEDIO" if estabilidad < 70 else "BAJO")
    riesgo_color = RED if nivel_riesgo == "ALTO" else (AMBER if nivel_riesgo == "MEDIO" else GREEN)
    socio_debil = min(SOCIOS, key=lambda s: s["apoyo"])
    st.markdown(
        f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {riesgo_color};'
        f'border-radius:12px;padding:1.1rem 1.2rem;height:200px;display:flex;flex-direction:column;justify-content:space-between">'
        f'<div>'
        f'<div style="font-size:.62rem;font-weight:800;color:{MUTED};letter-spacing:.12em;text-transform:uppercase">NIVEL DE RIESGO</div>'
        f'<div style="font-size:2.2rem;font-weight:900;color:{riesgo_color};margin:.3rem 0">{nivel_riesgo}</div>'
        f'</div>'
        f'<div>'
        f'<div style="font-size:.72rem;color:{TEXT2};margin-bottom:.4rem">Socio más frágil:</div>'
        f'<div style="background:{socio_debil["color"]}18;border:1px solid {socio_debil["color"]}44;border-radius:8px;padding:.4rem .7rem">'
        f'<span style="font-size:.85rem;font-weight:800;color:{socio_debil["color"]}">{socio_debil["partido"]}</span>'
        f'<span style="font-size:.72rem;color:{TEXT2};margin-left:.5rem">Apoyo: {socio_debil["apoyo"]}%</span>'
        f'</div>'
        f'<div style="font-size:.68rem;color:{MUTED};margin-top:.5rem">Mayoría absoluta: {MAYORIA_ABS} de {TOTAL_ESCANOS}</div>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )

# ── Sankey coalición actual ───────────────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
section_header("FLUJO DE APOYO — COALICIÓN ACTUAL", CYAN)

sankey_labels = [s["partido"] for s in SOCIOS] + ["Gobierno Sánchez"]
gov_idx = len(SOCIOS)
sankey_sources = list(range(len(SOCIOS)))
sankey_targets = [gov_idx] * len(SOCIOS)
sankey_values = [s["escanos"] for s in SOCIOS]
sankey_colors = [hex_to_rgba(s["color"], 0.55) for s in SOCIOS]
node_colors = [s["color"] for s in SOCIOS] + [CYAN]

fig_sankey = go.Figure(go.Sankey(
    node=dict(
        pad=15, thickness=18,
        line=dict(color=BORDER, width=0.5),
        label=sankey_labels,
        color=node_colors,
        hovertemplate="<b>%{label}</b><br>%{value} escaños<extra></extra>",
    ),
    link=dict(
        source=sankey_sources,
        target=sankey_targets,
        value=sankey_values,
        color=sankey_colors,
        hovertemplate="<b>%{source.label}</b> → %{target.label}<br>%{value} escaños<extra></extra>",
    ),
))
fig_sankey.update_layout(
    paper_bgcolor=BG2, plot_bgcolor=BG2,
    font=dict(color=TEXT, size=12),
    height=220,
    margin=dict(t=15, b=15, l=20, r=20),
    title=dict(
        text=f"Escaños totales bloque: {escanos_gov}  |  Mayoría absoluta: {MAYORIA_ABS}  |  {'⚠ MINORÍA' if escanos_gov < MAYORIA_ABS else '✓ MAYORÍA'}",
        font=dict(size=11, color=TEXT2), x=0.5,
    ),
)
st.plotly_chart(fig_sankey, use_container_width=True)

# ── TABS ──────────────────────────────────────────────────────────────────────
tab_actual, tab_alt, tab_temas, tab_escenarios, tab_mocion = st.tabs([
    "GOBIERNO ACTUAL",
    "COALICIONES ALTERNATIVAS",
    "PACTOS POR TEMA",
    "ESCENARIOS DE GOBIERNO",
    "MOCIÓN DE CENSURA",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — GOBIERNO ACTUAL
# ═══════════════════════════════════════════════════════════════════════════════
with tab_actual:
    section_header("SOCIOS DE GOBIERNO Y APOYO PARLAMENTARIO", PURPLE)

    # Tabla de socios
    for s in SOCIOS:
        c = s["color"]
        apoyo = s["apoyo"]
        tipo_label = "Gobierno" if s["tipo"] == "gobierno" else "Apoyo externo"
        tipo_color = BLUE if s["tipo"] == "gobierno" else CYAN
        apoyo_color = GREEN if apoyo >= 75 else (AMBER if apoyo >= 55 else RED)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {c};'
            f'border-radius:10px;padding:.9rem 1.2rem;margin-bottom:.6rem;'
            f'display:grid;grid-template-columns:140px 80px 1fr 2fr;align-items:center;gap:1rem">'
            f'<div>'
            f'<div style="font-size:.95rem;font-weight:900;color:{c}">{s["partido"]}</div>'
            f'<div style="font-size:.68rem;color:{TEXT2}">{s["escanos"]} escaños</div>'
            f'</div>'
            f'<div style="text-align:center">'
            f'<span style="background:{tipo_color}22;color:{tipo_color};font-size:.58rem;font-weight:700;'
            f'padding:.2rem .5rem;border-radius:5px;border:1px solid {tipo_color}44">{tipo_label}</span>'
            f'</div>'
            f'<div>'
            f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
            f'<span style="font-size:.7rem;color:{TEXT2}">Prob. apoyo:</span>'
            f'<span style="font-size:.85rem;font-weight:800;color:{apoyo_color};font-family:monospace">{apoyo}%</span>'
            f'</div>'
            f'<div style="background:{BORDER};border-radius:4px;height:6px;overflow:hidden">'
            f'<div style="background:{apoyo_color};width:{apoyo}%;height:100%;border-radius:4px"></div>'
            f'</div>'
            f'</div>'
            f'<div>'
            f'<div style="font-size:.68rem;color:{MUTED};margin-bottom:.2rem">Última incidencia:</div>'
            f'<div style="font-size:.75rem;color:{TEXT2}">{s["ultimo_incidente"]}</div>'
            f'<div style="font-size:.65rem;color:{MUTED};margin-top:.25rem">Exigencias: {s["exigencias"]}</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Gráfico histórico de apoyo (demo, 30 días)
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("HISTORIAL DE APOYO — ÚLTIMOS 30 DÍAS", BLUE)
    np.random.seed(42)
    fechas = pd.date_range(end=datetime.now(), periods=30, freq="D")
    fig_hist = go.Figure()
    for s in SOCIOS:
        base_val = s["apoyo"]
        ruido = np.random.randn(30) * 3.5
        serie = np.clip(base_val + np.cumsum(ruido * 0.3), 20, 100)
        fig_hist.add_trace(go.Scatter(
            x=fechas, y=serie,
            name=s["partido"],
            line=dict(color=s["color"], width=2),
            mode="lines",
            hovertemplate=f"<b>{s['partido']}</b><br>%{{x|%d/%m}}: %{{y:.1f}}%<extra></extra>",
        ))
    fig_hist.add_hline(y=50, line_dash="dot", line_color=MUTED,
                       annotation_text="Umbral crítico 50%", annotation_font_color=MUTED, annotation_font_size=9)
    fig_hist.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=280, margin=dict(t=20, b=20, l=30, r=10),
        xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="Prob. apoyo (%)", range=[20, 105]),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25, font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        hovermode="x unified",
    )
    st.plotly_chart(fig_hist, use_container_width=True)

    # Puntos de fractura
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("PUNTOS DE FRACTURA — TOP 5 RIESGOS DE RUPTURA", RED)
    FRACTURAS = [
        {"issue": "Presupuestos Generales del Estado 2025", "prob": 68, "socio": "JUNTS/ERC", "mitigacion": "Negociación bilateral con contrapartidas territoriales"},
        {"issue": "Ley de amnistía — aplicación judicial", "prob": 55, "socio": "JUNTS", "mitigacion": "Acuerdo interpretativo con el poder judicial"},
        {"issue": "Reforma sistema de financiación territorial", "prob": 47, "socio": "ERC/PNV", "mitigacion": "Grupo de trabajo técnico intergubernamental"},
        {"issue": "Reducción jornada laboral a 37.5h", "prob": 38, "socio": "SUMAR", "mitigacion": "Acuerdo con patronal CEOE como condición previa"},
        {"issue": "Decreto de vivienda — control de alquileres", "prob": 32, "socio": "SUMAR/ERC", "mitigacion": "Implementación gradual por CCAA"},
    ]
    for i, f in enumerate(FRACTURAS):
        prob_c = RED if f["prob"] > 55 else (AMBER if f["prob"] > 35 else GREEN)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
            f'padding:.85rem 1.1rem;margin-bottom:.5rem;'
            f'display:grid;grid-template-columns:40px 1fr 100px 2fr;align-items:center;gap:1rem">'
            f'<div style="font-size:1.2rem;font-weight:900;color:{MUTED};font-family:monospace">#{i+1}</div>'
            f'<div>'
            f'<div style="font-size:.82rem;font-weight:700;color:{TEXT}">{f["issue"]}</div>'
            f'<div style="font-size:.68rem;color:{MUTED};margin-top:.2rem">Socio clave: <span style="color:{CYAN}">{f["socio"]}</span></div>'
            f'</div>'
            f'<div style="text-align:center">'
            f'<div style="font-size:1.4rem;font-weight:900;color:{prob_c};font-family:monospace">{f["prob"]}%</div>'
            f'<div style="font-size:.6rem;color:{MUTED}">probabilidad</div>'
            f'</div>'
            f'<div>'
            f'<div style="font-size:.62rem;font-weight:700;color:{GREEN};letter-spacing:.08em;margin-bottom:.2rem">MITIGACIÓN</div>'
            f'<div style="font-size:.72rem;color:{TEXT2}">{f["mitigacion"]}</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Monte Carlo supervivencia
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("MODELO DE SUPERVIVENCIA — MONTE CARLO (10.000 SIM.)", PURPLE)
    np.random.seed(99)
    n_sim = 10000
    # Simular ruptura basada en apoyo de socios
    apoyos = np.array([s["apoyo"] for s in SOCIOS])
    escanos_arr = np.array([s["escanos"] for s in SOCIOS])

    def _simular_supervivencia(meses: int) -> float:
        ruido = np.random.normal(0, 5, (n_sim, len(apoyos)))
        apoyo_sim = np.clip(apoyos + ruido * np.sqrt(meses), 0, 100)
        escanos_efectivos = (apoyo_sim / 100) * escanos_arr
        escanos_totales = escanos_efectivos.sum(axis=1)
        sobrevive = (escanos_totales >= MAYORIA_ABS).mean()
        return round(float(sobrevive) * 100, 1)

    surv_3m  = _simular_supervivencia(3)
    surv_6m  = _simular_supervivencia(6)
    surv_12m = _simular_supervivencia(12)

    c3  = GREEN if surv_3m >= 60 else (AMBER if surv_3m >= 40 else RED)
    c6  = GREEN if surv_6m >= 60 else (AMBER if surv_6m >= 40 else RED)
    c12 = GREEN if surv_12m >= 60 else (AMBER if surv_12m >= 40 else RED)

    cols_mc = st.columns(3)
    with cols_mc[0]:
        st.markdown(f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {c3};border-radius:10px;padding:1rem;text-align:center"><div style="font-size:.65rem;color:{MUTED};letter-spacing:.1em">SUPERVIVENCIA 3M</div><div style="font-size:2.2rem;font-weight:900;color:{c3};font-family:monospace">{surv_3m}%</div><div style="font-size:.7rem;color:{TEXT2}">Probabilidad de mantener mayoría</div></div>', unsafe_allow_html=True)
    with cols_mc[1]:
        st.markdown(f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {c6};border-radius:10px;padding:1rem;text-align:center"><div style="font-size:.65rem;color:{MUTED};letter-spacing:.1em">SUPERVIVENCIA 6M</div><div style="font-size:2.2rem;font-weight:900;color:{c6};font-family:monospace">{surv_6m}%</div><div style="font-size:.7rem;color:{TEXT2}">Probabilidad de mantener mayoría</div></div>', unsafe_allow_html=True)
    with cols_mc[2]:
        st.markdown(f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {c12};border-radius:10px;padding:1rem;text-align:center"><div style="font-size:.65rem;color:{MUTED};letter-spacing:.1em">SUPERVIVENCIA 12M</div><div style="font-size:2.2rem;font-weight:900;color:{c12};font-family:monospace">{surv_12m}%</div><div style="font-size:.7rem;color:{TEXT2}">Probabilidad de mantener mayoría</div></div>', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — COALICIONES ALTERNATIVAS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_alt:
    section_header("COALICIONES MATEMÁTICAMENTE POSIBLES", CYAN)

    # Todos los partidos con sus escaños
    TODOS_PARTIDOS = {s["partido"]: s["escanos"] for s in SOCIOS}
    TODOS_PARTIDOS.update(ESCANOS_OPOSICION)
    TODOS_PARTIDOS.update(RESTO)

    COMPAT_SCORES = {
        frozenset(["PP", "VOX"]): 7.2,
        frozenset(["PP", "PSOE"]): 4.1,
        frozenset(["PP", "PNV"]): 5.8,
        frozenset(["PP", "JUNTS"]): 3.2,
        frozenset(["PSOE", "SUMAR", "ERC", "JUNTS", "PNV", "EH Bildu", "CC"]): 5.5,
        frozenset(["PP", "SUMAR"]): 2.8,
        frozenset(["PP", "VOX", "JUNTS"]): 2.1,
    }

    def _compat(partidos: list[str]) -> float:
        key = frozenset(partidos)
        for k, v in COMPAT_SCORES.items():
            if k.issubset(key):
                return v
        derechapartidos = {"PP", "VOX"}
        izquierda = {"PSOE", "SUMAR", "EH Bildu"}
        has_d = bool(set(partidos) & derechapartidos)
        has_i = bool(set(partidos) & izquierda)
        if has_d and has_i:
            return 2.5
        return 5.5

    def _prob_formacion(partidos: list[str], total_esc: int) -> int:
        base = 30 if total_esc >= MAYORIA_ABS + 10 else (20 if total_esc >= MAYORIA_ABS else 5)
        compat = _compat(partidos)
        return min(95, int(base * compat / 5))

    # Calcular todas las coaliciones posibles
    partidos_list = list(TODOS_PARTIDOS.items())
    coaliciones_posibles = []
    for r in range(2, 7):
        for combo in itertools.combinations(partidos_list, r):
            total = sum(e for _, e in combo)
            if total >= MAYORIA_ABS:
                ps = [p for p, _ in combo]
                coaliciones_posibles.append({
                    "partidos": ps,
                    "escanos": total,
                    "compat": _compat(ps),
                    "prob": _prob_formacion(ps, total),
                })

    # Filtrar: tomar la más corta por subconjunto dominante
    coaliciones_posibles.sort(key=lambda x: (len(x["partidos"]), -x["prob"]))
    shown = []
    for coal in coaliciones_posibles:
        if len(shown) >= 8:
            break
        set_coal = set(coal["partidos"])
        if any(set(s["partidos"]).issubset(set_coal) for s in shown):
            continue
        shown.append(coal)

    cols_alt = st.columns(2)
    for ci, coal in enumerate(shown):
        c_idx = ci % 2
        prob = coal["prob"]
        compat = coal["compat"]
        prob_c = GREEN if prob >= 50 else (AMBER if prob >= 25 else RED)
        compat_c = GREEN if compat >= 6 else (AMBER if compat >= 4 else RED)
        tags = "".join(
            f'<span style="background:{COLORES_PARTIDOS.get(p, CYAN)}22;color:{COLORES_PARTIDOS.get(p, CYAN)};'
            f'font-size:.65rem;font-weight:700;padding:.15rem .4rem;border-radius:5px;'
            f'border:1px solid {COLORES_PARTIDOS.get(p, CYAN)}44;margin:.1rem .1rem 0 0;display:inline-block">{p}</span>'
            for p in coal["partidos"]
        )
        exceso = coal["escanos"] - MAYORIA_ABS
        with cols_alt[c_idx]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {prob_c};'
                f'border-radius:12px;padding:1rem 1.1rem;margin-bottom:.7rem">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">'
                f'<span style="font-size:.78rem;font-weight:800;color:{TEXT}">Coalición {ci+1}</span>'
                f'<span style="margin-left:auto;font-size:.72rem;color:{CYAN};font-family:monospace">{coal["escanos"]} esc (+{exceso})</span>'
                f'</div>'
                f'<div style="margin-bottom:.6rem">{tags}</div>'
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">'
                f'<div style="background:{BG3};border-radius:6px;padding:.4rem .6rem">'
                f'<div style="font-size:.58rem;color:{MUTED};letter-spacing:.08em">PROB. FORMACIÓN</div>'
                f'<div style="font-size:1.1rem;font-weight:800;color:{prob_c}">{prob}%</div>'
                f'</div>'
                f'<div style="background:{BG3};border-radius:6px;padding:.4rem .6rem">'
                f'<div style="font-size:.58rem;color:{MUTED};letter-spacing:.08em">COMPATIBILIDAD</div>'
                f'<div style="font-size:1.1rem;font-weight:800;color:{compat_c}">{compat:.1f}/10</div>'
                f'</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Constructor interactivo
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("CONSTRUCTOR DE COALICIÓN INTERACTIVO", PURPLE)
    partidos_opciones = sorted(TODOS_PARTIDOS.keys())
    seleccionados = st.multiselect(
        "Selecciona partidos para construir una coalición:",
        options=partidos_opciones,
        default=["PSOE", "SUMAR", "PNV"],
        key="coal_builder",
    )
    if seleccionados:
        total_sel = sum(TODOS_PARTIDOS.get(p, 0) for p in seleccionados)
        faltan_sel = max(0, MAYORIA_ABS - total_sel)
        c_sel = GREEN if total_sel >= MAYORIA_ABS else (AMBER if total_sel >= MAYORIA_ABS - 15 else RED)
        st.markdown(
            f'<div style="background:{BG2};border:2px solid {c_sel};border-radius:10px;padding:1rem 1.3rem;'
            f'display:flex;align-items:center;gap:1.5rem">'
            f'<div style="font-size:2.5rem;font-weight:900;color:{c_sel};font-family:monospace">{total_sel}</div>'
            f'<div>'
            f'<div style="font-size:.85rem;color:{TEXT}">escaños totales</div>'
            f'<div style="font-size:.72rem;color:{TEXT2}">Mayoría absoluta: {MAYORIA_ABS} · '
            f'{"✓ MAYORÍA" if total_sel >= MAYORIA_ABS else f"Faltan {faltan_sel}"}</div>'
            f'</div>'
            f'<div style="margin-left:auto">{confidence_badge(min(1.0, total_sel / MAYORIA_ABS * 0.8))}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — PACTOS POR TEMA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_temas:
    section_header("MAPA DE ACUERDOS POR ÁREA POLÍTICA", BLUE)

    AREAS = ["Vivienda", "Fiscal", "Laboral", "Energía", "Territorial", "Judicial", "Educación", "Exterior"]
    PARTIDOS_MAPA = ["PSOE", "SUMAR", "ERC", "JUNTS", "PNV", "EH Bildu", "PP", "VOX"]
    # Alineación: 2=acuerdo total, 1=acuerdo parcial, 0=desacuerdo, -1=oposición fuerte
    ALINEACION = {
        "PSOE":     [1, 1,  1,  1,  1,  1,  1,  1],
        "SUMAR":    [2, 2,  2,  2,  0,  1,  1,  0],
        "ERC":      [1, 1,  1,  1,  2,  1,  0,  0],
        "JUNTS":    [0, 1,  0,  0,  2,  2, -1,  0],
        "PNV":      [0, 1,  1,  1,  2,  0,  1,  1],
        "EH Bildu": [1, 2,  2,  2,  2,  1, -1, -1],
        "PP":       [0, -1, 0,  0, -1, -1,  1,  1],
        "VOX":      [-1,-2,-1, -1, -2, -2,  1,  1],
    }

    colorscale = [[0, f"{RED}"], [0.25, f"{AMBER}"], [0.5, f"{MUTED}"], [0.75, f"{CYAN}"], [1.0, f"{GREEN}"]]

    z_vals = [ALINEACION[p] for p in PARTIDOS_MAPA]
    fig_heat = go.Figure(go.Heatmap(
        z=z_vals,
        x=AREAS,
        y=PARTIDOS_MAPA,
        colorscale=colorscale,
        zmin=-2, zmax=2,
        text=[[{-2: "OPONE", -1: "Opone", 0: "Neutro", 1: "Parcial", 2: "Acuerdo"}.get(v, "—") for v in row] for row in z_vals],
        texttemplate="%{text}",
        textfont=dict(size=9, color=TEXT),
        hovertemplate="<b>%{y}</b> — %{x}<br>%{text}<extra></extra>",
        showscale=True,
        colorbar=dict(
            title=dict(text="Alineación", font=dict(color=TEXT2, size=10)),
            tickvals=[-2, -1, 0, 1, 2],
            ticktext=["Opone fuerte", "Opone", "Neutro", "Parcial", "Acuerdo"],
            tickfont=dict(color=TEXT2, size=9),
        ),
    ))
    fig_heat.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=340,
        margin=dict(t=20, b=20, l=80, r=100),
        xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
        yaxis=dict(tickfont=dict(color=TEXT2, size=10)),
    )
    st.plotly_chart(fig_heat, use_container_width=True)

    # Zonas de acuerdo posible
    section_header("ZONAS DE ACUERDO POSIBLE", GREEN)
    ZONAS = [
        {"area": "Laboral", "partidos": ["PSOE", "SUMAR", "EH Bildu", "ERC"], "nivel": "Alto", "nota": "Base amplia para reforma laboral y reducción de jornada"},
        {"area": "Energía", "partidos": ["PSOE", "SUMAR", "EH Bildu", "ERC"], "nivel": "Alto", "nota": "Transición energética con amplio consenso en bloque progresista"},
        {"area": "Territorial", "partidos": ["PSOE", "ERC", "JUNTS", "PNV", "EH Bildu"], "nivel": "Medio", "nota": "Acuerdos posibles en financiación pero con exigencias divergentes"},
        {"area": "Fiscal", "partidos": ["PSOE", "SUMAR", "EH Bildu"], "nivel": "Alto", "nota": "Subida de impuestos a grandes fortunas tiene mayoría sólida"},
        {"area": "Judicial", "partidos": ["PSOE", "ERC", "JUNTS"], "nivel": "Bajo", "nota": "Reforma judicial contentenciosa — obstáculos institucionales"},
    ]
    cols_zonas = st.columns(2)
    for zi, z in enumerate(ZONAS):
        c_idx = zi % 2
        nv_c = GREEN if z["nivel"] == "Alto" else (AMBER if z["nivel"] == "Medio" else RED)
        tags_z = "".join(
            f'<span style="background:{COLORES_PARTIDOS.get(p, CYAN)}22;color:{COLORES_PARTIDOS.get(p, CYAN)};'
            f'font-size:.62rem;font-weight:700;padding:.1rem .35rem;border-radius:4px;margin:.1rem .05rem 0 0;display:inline-block">{p}</span>'
            for p in z["partidos"]
        )
        with cols_zonas[c_idx]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {nv_c};'
                f'border-radius:10px;padding:.85rem 1rem;margin-bottom:.5rem">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">'
                f'<span style="font-size:.9rem;font-weight:800;color:{TEXT}">{z["area"]}</span>'
                f'<span style="background:{nv_c}22;color:{nv_c};font-size:.6rem;font-weight:700;'
                f'padding:.15rem .5rem;border-radius:4px;border:1px solid {nv_c}44">ACUERDO {z["nivel"].upper()}</span>'
                f'</div>'
                f'<div style="margin-bottom:.4rem">{tags_z}</div>'
                f'<div style="font-size:.72rem;color:{TEXT2}">{z["nota"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — ESCENARIOS DE GOBIERNO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_escenarios:
    section_header("ESCENARIOS POLÍTICOS — PROBABILIDAD ESTIMADA", AMBER)

    ESCENARIOS_GOB = [
        {
            "nombre": "Gobierno Sánchez continúa",
            "prob": 45,
            "color": BLUE,
            "triggers": ["Aprobación presupuestos con concesiones", "Normalización relación JUNTS", "Mejora encuestas PSOE"],
            "impacto": "Estabilidad moderada, agenda reformista parcial",
            "timeline": "2025–2027",
            "indicadores": ["Encuesta CIS mensual", "Votaciones en Congreso", "Declaraciones JUNTS"],
        },
        {
            "nombre": "Elecciones anticipadas",
            "prob": 28,
            "color": RED,
            "triggers": ["Rechazo presupuestos en Congreso", "Ruptura JUNTS tras extradición", "Escándalo mayor ejecutivo"],
            "impacto": "Incertidumbre alta, riesgo PP+VOX según sondeos",
            "timeline": "2025 (probable 1T)",
            "indicadores": ["Voto JUNTS en decretos", "Prima de riesgo >120pb", "Encuesta PP>35%"],
        },
        {
            "nombre": "Gobierno PP con apoyos",
            "prob": 18,
            "color": CYAN,
            "triggers": ["Moción de censura exitosa", "Dimisión Sánchez", "PP logra acuerdo con PNV+CC"],
            "impacto": "Giro fiscal y territorial, agenda social regresiva",
            "timeline": "Si elecciones en 2025",
            "indicadores": ["Negociaciones PP-PNV", "Posición JUNTS en moción", "Sondeos PP>38%"],
        },
        {
            "nombre": "Gobierno técnico / Gran coalición",
            "prob": 9,
            "color": PURPLE,
            "triggers": ["Crisis institucional grave", "Bloqueo político total", "Presión BCE/UE"],
            "impacto": "Reformas limitadas, estabilidad forzada, pérdida identidad política",
            "timeline": "Solo en crisis extrema",
            "indicadores": ["Prima de riesgo >200pb", "Paralización total Congreso", "Presión internacional"],
        },
    ]

    cols_esc = st.columns(2)
    for ei, esc in enumerate(ESCENARIOS_GOB):
        c_idx = ei % 2
        c = esc["color"]
        prob = esc["prob"]
        triggers_html = "".join(f'<li style="color:{TEXT2};font-size:.72rem;margin:.2rem 0">{t}</li>' for t in esc["triggers"])
        indicadores_html = "".join(
            f'<span style="background:{CYAN}15;color:{CYAN};font-size:.6rem;padding:.1rem .4rem;'
            f'border-radius:4px;margin:.1rem .05rem 0 0;display:inline-block">{ind}</span>'
            for ind in esc["indicadores"]
        )
        with cols_esc[c_idx]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:4px solid {c};'
                f'border-radius:12px;padding:1.1rem 1.2rem;margin-bottom:.8rem;height:100%">'
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem">'
                f'<span style="font-size:.9rem;font-weight:800;color:{TEXT}">{esc["nombre"]}</span>'
                f'<span style="margin-left:auto;font-size:1.4rem;font-weight:900;color:{c};font-family:monospace">{prob}%</span>'
                f'</div>'
                f'<div style="background:{BORDER};border-radius:3px;height:5px;overflow:hidden;margin-bottom:.7rem">'
                f'<div style="background:{c};width:{prob}%;height:100%;border-radius:3px"></div>'
                f'</div>'
                f'<div style="font-size:.68rem;color:{MUTED};margin-bottom:.3rem"> {esc["timeline"]}</div>'
                f'<div style="font-size:.72rem;color:{TEXT2};margin-bottom:.6rem">{esc["impacto"]}</div>'
                f'<div style="font-size:.6rem;font-weight:700;color:{c};letter-spacing:.08em;margin-bottom:.2rem">DISPARADORES</div>'
                f'<ul style="margin:0;padding-left:1rem;list-style:disc">{triggers_html}</ul>'
                f'<div style="font-size:.6rem;font-weight:700;color:{CYAN};letter-spacing:.08em;margin:.6rem 0 .3rem">INDICADORES A SEGUIR</div>'
                f'<div>{indicadores_html}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Gráfico de evolución de probabilidades
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("EVOLUCIÓN HISTÓRICA DE PROBABILIDADES", PURPLE)
    np.random.seed(77)
    fechas_esc = pd.date_range(end=datetime.now(), periods=90, freq="D")
    fig_evol = go.Figure()
    probs_base = [45, 28, 18, 9]
    for ei, esc in enumerate(ESCENARIOS_GOB):
        ruido = np.random.randn(90) * 2.5
        serie = np.clip(probs_base[ei] + np.cumsum(ruido * 0.15), 2, 80)
        # Normalizar para que sumen ~100
        fig_evol.add_trace(go.Scatter(
            x=fechas_esc, y=serie,
            name=esc["nombre"],
            line=dict(color=esc["color"], width=2),
            mode="lines",
            fill="tozeroy" if ei == 0 else None,
            fillcolor=hex_to_rgba(esc["color"], 0.06),
            hovertemplate=f"<b>{esc['nombre']}</b><br>%{{x|%d/%m}}: %{{y:.1f}}%<extra></extra>",
        ))
    fig_evol.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=280, margin=dict(t=20, b=20, l=30, r=10),
        xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="Probabilidad (%)", range=[0, 80]),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.28, font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        hovermode="x unified",
    )
    st.plotly_chart(fig_evol, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — MOCIÓN DE CENSURA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_mocion:
    section_header("CALCULADORA DE MOCIÓN DE CENSURA", RED)

    col_calc, col_hist = st.columns([1, 1])

    with col_calc:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {RED};'
            f'border-radius:12px;padding:1.2rem 1.4rem">'
            f'<div style="font-size:.65rem;font-weight:800;color:{MUTED};letter-spacing:.12em;text-transform:uppercase;margin-bottom:.8rem">REQUISITOS CONSTITUCIONALES</div>'
            f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-bottom:.8rem">'
            f'<div style="background:{BG3};border-radius:8px;padding:.7rem">'
            f'<div style="font-size:.62rem;color:{MUTED}">Votos necesarios</div>'
            f'<div style="font-size:1.8rem;font-weight:900;color:{RED};font-family:monospace">{MAYORIA_ABS}</div>'
            f'<div style="font-size:.68rem;color:{TEXT2}">Mayoría absoluta</div>'
            f'</div>'
            f'<div style="background:{BG3};border-radius:8px;padding:.7rem">'
            f'<div style="font-size:.62rem;color:{MUTED}">PP + VOX actuales</div>'
            f'<div style="font-size:1.8rem;font-weight:900;color:{AMBER};font-family:monospace">{ESCANOS_OPOSICION["PP"] + ESCANOS_OPOSICION["VOX"]}</div>'
            f'<div style="font-size:.68rem;color:{TEXT2}">Faltan {MAYORIA_ABS - (ESCANOS_OPOSICION["PP"] + ESCANOS_OPOSICION["VOX"])} escaños</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        pp_vox = ESCANOS_OPOSICION["PP"] + ESCANOS_OPOSICION["VOX"]
        faltan_mocion = MAYORIA_ABS - pp_vox

        POSICION_MOCION = [
            {"partido": "PP",      "escanos": 137, "pos": "Promueve",   "color": "#009FDB"},
            {"partido": "VOX",     "escanos": 33,  "pos": "Apoya",      "color": "#63BE21"},
            {"partido": "JUNTS",   "escanos": 7,   "pos": "Indeciso",   "color": "#00AEEF"},
            {"partido": "PNV",     "escanos": 5,   "pos": "Opone",      "color": "#007A3D"},
            {"partido": "ERC",     "escanos": 7,   "pos": "Opone",      "color": "#F4B20A"},
            {"partido": "EH Bildu","escanos": 4,   "pos": "Opone fuerte","color": "#A9C55A"},
            {"partido": "PSOE",    "escanos": 120, "pos": "Opone fuerte","color": "#E30613"},
            {"partido": "SUMAR",   "escanos": 31,  "pos": "Opone fuerte","color": "#E4007C"},
            {"partido": "CC",      "escanos": 1,   "pos": "Indeciso",   "color": "#FFCB00"},
        ]

        for pm in POSICION_MOCION:
            pos = pm["pos"]
            pc = GREEN if "Promueve" in pos or "Apoya" in pos else (AMBER if "Indeciso" in pos else RED)
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.3rem">'
                f'<span style="font-size:.75rem;font-weight:700;color:{pm["color"]};width:70px">{pm["partido"]}</span>'
                f'<span style="font-size:.68rem;color:{TEXT2};width:50px;font-family:monospace">{pm["escanos"]} esc</span>'
                f'<span style="background:{pc}22;color:{pc};font-size:.62rem;font-weight:700;'
                f'padding:.15rem .45rem;border-radius:5px;border:1px solid {pc}44">{pos}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

        votos_favor = pp_vox
        puede_pasar = votos_favor >= MAYORIA_ABS
        c_result = GREEN if puede_pasar else RED
        st.markdown(
            f'<div style="background:{c_result}15;border:1px solid {c_result}44;border-radius:10px;'
            f'padding:.9rem 1.1rem;margin-top:.8rem;text-align:center">'
            f'<div style="font-size:1rem;font-weight:800;color:{c_result}">'
            f'{"✓ MOCIÓN VIABLE" if puede_pasar else "✗ MOCIÓN NO VIABLE ACTUALMENTE"}</div>'
            f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.3rem">'
            f'{votos_favor} votos asegurados · Necesarios: {MAYORIA_ABS} · Faltan: {max(0, faltan_mocion)}'
            f'</div>'
            f'<div style="font-size:.68rem;color:{MUTED};margin-top:.3rem">'
            f'Clave: abstención o voto JUNTS ({TODOS_PARTIDOS.get("JUNTS", 7)} esc.) cambiaría el resultado'
            f'</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    with col_hist:
        section_header("HISTÓRICO MOCIONES DE CENSURA ESPAÑA", PURPLE)
        MOCIONES = [
            {"año": 1980, "promotor": "PSOE (Felipe González)", "contra": "UCD (Suárez)", "resultado": "Rechazada", "votos_favor": 152, "color": RED},
            {"año": 1987, "promotor": "CP (Hernández Mancha)", "contra": "PSOE (González)", "resultado": "Rechazada", "votos_favor": 67, "color": RED},
            {"año": 2017, "promotor": "PP (Mariano Rajoy)", "contra": "PSOE (Rajoy)", "resultado": "Rechazada", "votos_favor": 170, "color": RED},
            {"año": 2018, "promotor": "PSOE (Pedro Sánchez)", "contra": "PP (Rajoy)", "resultado": "APROBADA ✓", "votos_favor": 180, "color": GREEN},
            {"año": 2020, "promotor": "VOX (Abascal)", "contra": "PSOE (Sánchez)", "resultado": "Rechazada", "votos_favor": 52, "color": RED},
        ]
        for m in MOCIONES:
            c_res = GREEN if "APROBADA" in m["resultado"] else RED
            pct_bar = m["votos_favor"] / TOTAL_ESCANOS * 100
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {c_res};'
                f'border-radius:10px;padding:.8rem 1rem;margin-bottom:.5rem">'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                f'<span style="font-size:.75rem;font-weight:800;color:{CYAN};font-family:monospace">{m["año"]}</span>'
                f'<span style="flex:1;font-size:.75rem;color:{TEXT}">{m["promotor"]}</span>'
                f'<span style="background:{c_res}22;color:{c_res};font-size:.62rem;font-weight:700;'
                f'padding:.15rem .5rem;border-radius:4px;border:1px solid {c_res}44">{m["resultado"]}</span>'
                f'</div>'
                f'<div style="font-size:.68rem;color:{TEXT2};margin-bottom:.35rem">vs. {m["contra"]}</div>'
                f'<div style="display:flex;align-items:center;gap:.5rem">'
                f'<div style="flex:1;background:{BORDER};border-radius:3px;height:5px">'
                f'<div style="background:{m["color"]};width:{pct_bar:.1f}%;height:100%;border-radius:3px"></div>'
                f'</div>'
                f'<span style="font-size:.68rem;color:{TEXT2};font-family:monospace">{m["votos_favor"]} votos</span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        # Línea de mayoría en gráfico de barras
        fig_moc = go.Figure()
        fig_moc.add_trace(go.Bar(
            x=[m["año"] for m in MOCIONES],
            y=[m["votos_favor"] for m in MOCIONES],
            marker_color=[m["color"] for m in MOCIONES],
            text=[f'{m["votos_favor"]} ({m["resultado"]})' for m in MOCIONES],
            textposition="outside",
            textfont=dict(size=9, color=TEXT2),
            hovertemplate="<b>%{x}</b><br>Votos: %{y}<extra></extra>",
        ))
        fig_moc.add_hline(y=MAYORIA_ABS, line_dash="dash", line_color=CYAN,
                          annotation_text=f"Mayoría: {MAYORIA_ABS}", annotation_font_color=CYAN, annotation_font_size=9)
        fig_moc.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
            height=220, margin=dict(t=15, b=15, l=30, r=10),
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), type="category"),
            yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), range=[0, TOTAL_ESCANOS // 2 + 20]),
            showlegend=False,
        )
        st.plotly_chart(fig_moc, use_container_width=True)
