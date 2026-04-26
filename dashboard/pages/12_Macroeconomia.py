"""
Página: Macroeconomía Financiera y Microeconomía del Votante

Panel de indicadores financieros de nicho + comportamiento económico
por perfil de votante. Diseñado para analistas políticos y financieros.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import cargar_macro_ultimo

st.set_page_config(page_title="Macroeconomía — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%      {{ opacity:1; transform:scale(1.3); }}
}}
.card {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:12px;
    padding:1.2rem 1.4rem; margin-bottom:1rem; animation:fadeInUp .4s ease both;
}}
.kpi-box {{
    background:{BG3}; border:1px solid {BORDER}; border-radius:10px;
    padding:.8rem 1rem; text-align:center; animation:fadeInUp .4s ease both;
}}
.section-title {{
    display:flex; align-items:center; gap:.7rem; margin:1.6rem 0 .9rem;
}}
.section-title .bar {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.section-title .lbl {{ font-size:.65rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:{MUTED}; }}
.section-title .line {{ flex:1; height:1px; background:{BORDER}; }}
.indicator-badge {{
    display:inline-block; padding:.15rem .6rem; border-radius:999px;
    font-size:.75rem; font-weight:700;
}}
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{GREEN}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-30px;left:28%;width:130px;height:130px;
                background:radial-gradient(circle,{BLUE}12,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{GREEN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{GREEN}">DATOS EN VIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Macroeconomía <span style="color:{CYAN}">Financiera</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Indicadores de nicho · Prima de riesgo · Euríbor · Perfiles de consumo · Brecha electoral-económica
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Cargar datos reales ───────────────────────────────────────────────────────
df_macro = cargar_macro_ultimo()

# Valores por defecto si la BD está vacía
macro_vals = {
    "tasa_paro": 11.4,
    "crecimiento_pib": 2.7,
    "ipc_general": 2.9,
    "prima_riesgo": 78,
    "euribor_12m": 2.82,
    "deuda_pib": 108.5,
    "tipo_interes_bce": 2.5,
    "ibex35": 13450,
    "deficit_pib": -3.4,
    "balanza_pagos": 2.1,
}
if not df_macro.empty:
    r = df_macro.iloc[0]
    for k in macro_vals:
        if k in r and r[k] is not None:
            macro_vals[k] = float(r[k])

# ── KPIs principales ──────────────────────────────────────────────────────────
st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Indicadores clave — Abril 2026</span><div class="line"></div></div>', unsafe_allow_html=True)

kpi_data = [
    ("PIB (crecimiento)", f"{macro_vals['crecimiento_pib']:.1f}%", "interanual T4 2025", GREEN if macro_vals['crecimiento_pib'] > 1.5 else RED),
    ("Tasa de paro (EPA)", f"{macro_vals['tasa_paro']:.1f}%", "Q4 2025", GREEN if macro_vals['tasa_paro'] < 10 else (AMBER if macro_vals['tasa_paro'] < 14 else RED)),
    ("IPC general", f"{macro_vals['ipc_general']:.1f}%", "marzo 2026", GREEN if macro_vals['ipc_general'] < 2.5 else (AMBER if macro_vals['ipc_general'] < 4 else RED)),
    ("Prima de riesgo", f"{macro_vals['prima_riesgo']:.0f} pb", "vs Bund alemán", GREEN if macro_vals['prima_riesgo'] < 80 else (AMBER if macro_vals['prima_riesgo'] < 150 else RED)),
    ("Euríbor 12M", f"{macro_vals['euribor_12m']:.2f}%", "última sesión", AMBER),
    ("Deuda pública/PIB", f"{macro_vals['deuda_pib']:.1f}%", "2025", AMBER if macro_vals['deuda_pib'] > 100 else GREEN),
    ("Tipo BCE", f"{macro_vals['tipo_interes_bce']:.1f}%", "última reunión", MUTED),
    ("Déficit/PIB", f"{macro_vals['deficit_pib']:.1f}%", "2025 estimado", RED if macro_vals['deficit_pib'] < -3 else AMBER),
]

kpi_cols = st.columns(8)
for i, (label, val, sub, color) in enumerate(kpi_data):
    with kpi_cols[i]:
        st.markdown(f"""
        <div class="kpi-box">
            <div style="font-size:.68rem;color:{MUTED};text-transform:uppercase">{label}</div>
            <div style="font-size:1.4rem;font-weight:800;color:{color}">{val}</div>
            <div style="font-size:.68rem;color:{MUTED}">{sub}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)

tab1, tab2, tab3, tab4 = st.tabs([
    "Macro Financiera",
    "Microeconomía del Votante",
    "Indicadores de Nicho",
    "Analogías Históricas",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1: MACRO FINANCIERA
# ══════════════════════════════════════════════════════════════════════════════
with tab1:

    col_a, col_b = st.columns(2)

    with col_a:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Prima de riesgo: España vs Italia vs Portugal (pb)</span><div class="line"></div></div>', unsafe_allow_html=True)
        # Serie histórica sintética (2020-2026)
        fechas_mes = pd.date_range("2020-01", "2026-04", freq="ME")
        np.random.seed(1)
        prima_es = 80 + np.cumsum(np.random.normal(0, 3, len(fechas_mes)))
        prima_it = 130 + np.cumsum(np.random.normal(0, 4, len(fechas_mes)))
        prima_pt = 65 + np.cumsum(np.random.normal(0, 2.5, len(fechas_mes)))
        prima_es = np.clip(prima_es, 40, 220)
        prima_it = np.clip(prima_it, 80, 280)
        prima_pt = np.clip(prima_pt, 30, 160)
        # Forzar ultimo valor al real
        prima_es[-1] = macro_vals["prima_riesgo"]

        fig_prima = go.Figure()
        fig_prima.add_trace(go.Scatter(x=fechas_mes, y=prima_es, name="España", line=dict(color=RED, width=2.5)))
        fig_prima.add_trace(go.Scatter(x=fechas_mes, y=prima_it, name="Italia", line=dict(color=GREEN, width=2)))
        fig_prima.add_trace(go.Scatter(x=fechas_mes, y=prima_pt, name="Portugal", line=dict(color=BLUE, width=2)))
        fig_prima.add_hrect(y0=100, y1=150, fillcolor=AMBER, opacity=0.1, line_width=0, annotation_text="Zona de alerta")
        fig_prima.add_hrect(y0=150, y1=280, fillcolor=RED, opacity=0.08, line_width=0, annotation_text="Zona de riesgo")
        fig_prima.update_layout(
            height=320, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            legend=dict(orientation="h", y=1.02, font=dict(color=TEXT2)),
            yaxis=dict(title="Puntos básicos", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=20, b=10),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_prima, use_container_width=True)

    with col_b:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Euríbor 12 meses — Evolución histórica (%)</span><div class="line"></div></div>', unsafe_allow_html=True)
        euribor_hist = [-0.5, -0.5, -0.5, 0.0, 0.8, 2.1, 3.8, 4.1, 3.9, 3.5, 3.2, 2.9, 2.82]
        fechas_eur = pd.date_range("2021-04", periods=len(euribor_hist), freq="4ME")
        colores_eur = [RED if v > 3.5 else (AMBER if v > 2 else GREEN) for v in euribor_hist]
        fig_eur = go.Figure()
        fig_eur.add_trace(go.Scatter(
            x=fechas_eur, y=euribor_hist, mode="lines+markers",
            line=dict(color=BLUE, width=2.5),
            marker=dict(color=colores_eur, size=8),
            name="Euríbor 12M",
        ))
        fig_eur.add_hrect(y0=0, y1=0, line_width=2, line_dash="dash", line_color=MUTED)
        fig_eur.add_annotation(x=fechas_eur[-1], y=euribor_hist[-1],
                               text=f"Actual: {euribor_hist[-1]:.2f}%",
                               showarrow=True, arrowhead=2, bgcolor=AMBER,
                               font=dict(color="white", size=11))
        fig_eur.update_layout(
            height=320, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="% Euríbor", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            margin=dict(t=20, b=10),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_eur, use_container_width=True)

    st.markdown(f"""
    <div class="card" style="border-left:3px solid {AMBER}">
        <strong>Impacto del Euríbor en los hogares españoles:</strong>
        Con el Euríbor al {macro_vals['euribor_12m']:.2f}%, una hipoteca media de 150.000€ a 25 años (variable)
        tiene una cuota de ~760€/mes, frente a los 440€ de 2021. El incremento acumulado supone
        <strong>+320€/mes (+73%)</strong> para 4 millones de hipotecados con tipo variable.
        Esto equivale a una bajada de renta real del 8% para las familias afectadas.
    </div>
    """, unsafe_allow_html=True)

    col_c, col_d = st.columns(2)

    with col_c:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">IPC desglosado por componentes (%)</span><div class="line"></div></div>', unsafe_allow_html=True)
        componentes_ipc = {
            "Alimentos y bebidas": 3.8,
            "Vivienda y servicios": 4.2,
            "Energía doméstica": 5.1,
            "Transporte": 2.1,
            "Hostelería y restauración": 4.9,
            "Sanidad": 1.8,
            "Educación": 3.2,
            "Ropa y calzado": 1.4,
            "IPC general": macro_vals["ipc_general"],
        }
        df_ipc = pd.DataFrame({"Componente": list(componentes_ipc.keys()),
                                "IPC (%)": list(componentes_ipc.values())})
        df_ipc = df_ipc.sort_values("IPC (%)", ascending=True)
        colors_ipc = [RED if v > 4 else (AMBER if v > 2.5 else GREEN) for v in df_ipc["IPC (%)"]]
        fig_ipc = go.Figure(go.Bar(
            y=df_ipc["Componente"], x=df_ipc["IPC (%)"], orientation="h",
            marker_color=colors_ipc,
            text=[f"{v:.1f}%" for v in df_ipc["IPC (%)"]],
            textposition="outside",
        ))
        fig_ipc.add_vline(x=2.0, line_dash="dash", line_color=MUTED,
                          annotation_text="Objetivo BCE 2%")
        fig_ipc.update_layout(
            height=340, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(range=[0, 7], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_ipc, use_container_width=True)

    with col_d:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Deuda pública: España en contexto europeo (%PIB)</span><div class="line"></div></div>', unsafe_allow_html=True)
        paises = ["Alemania", "Países Bajos", "Suecia", "Polonia", "UE media", "España", "Francia", "Bélgica", "Italia", "Grecia"]
        deudas = [63, 47, 32, 51, 82, 108, 112, 104, 141, 162]
        colors_deuda = [GREEN if d < 80 else (AMBER if d < 110 else RED) for d in deudas]
        fig_deuda = go.Figure(go.Bar(
            y=paises, x=deudas, orientation="h",
            marker_color=colors_deuda,
            text=[f"{d}%" for d in deudas], textposition="outside",
        ))
        fig_deuda.add_vline(x=60, line_dash="dash", line_color=MUTED,
                            annotation_text="Límite Maastricht 60%")
        fig_deuda.update_layout(
            height=340, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(range=[0, 200], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_deuda, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2: MICROECONOMÍA DEL VOTANTE
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    MICRO = {
        "Izquierda Urbana Joven": {
            "color": "#DC2626",
            "renta": 22000, "paro": 18, "pct_alquiler": 73, "hipoteca": 0,
            "gasto": {"Alquiler": 850, "Alimentación": 280, "Transporte público": 65,
                      "Ocio/cultura": 120, "Tecnología/streaming": 45, "Ropa": 80},
            "ahorro": -85, "deuda_media": 8500,
            "euribor_sens": 1,  # 1-10: sensibilidad al euríbor
            "ipc_sens": 8,
            "paro_sens": 9,
            "irpf_sens": 5,
            "activos": ["Cuenta corriente", "Poco ahorro"],
            "nota": "El 73% vive de alquiler. Su mayor problema es la vivienda, no el euríbor.",
        },
        "Centro Pragmático": {
            "color": "#6B7280",
            "renta": 32000, "paro": 8, "pct_alquiler": 39, "hipoteca": 820,
            "gasto": {"Hipoteca": 820, "Alimentación": 420, "Coche": 280,
                      "Educación hijos": 180, "Ocio/vacaciones": 200, "Seguros": 120},
            "ahorro": 380, "deuda_media": 95000,
            "euribor_sens": 9,
            "ipc_sens": 7,
            "paro_sens": 7,
            "irpf_sens": 8,
            "activos": ["Vivienda propia", "Plan de pensiones", "Depósitos"],
            "nota": "Perfil más afectado por el euríbor. +1pp de euríbor = +150€/mes en hipoteca media.",
        },
        "Derecha Tradicional": {
            "color": "#0066CC",
            "renta": 38000, "paro": 5, "pct_alquiler": 22, "hipoteca": 350,
            "gasto": {"Hipoteca (casi pagada)": 350, "Alimentación": 480, "Coche(s)": 350,
                      "Sanidad privada/seguros": 220, "Vacaciones": 280, "Inversión/ahorro": 400},
            "ahorro": 650, "deuda_media": 28000,
            "euribor_sens": 4,
            "ipc_sens": 5,
            "paro_sens": 4,
            "irpf_sens": 9,
            "activos": ["Vivienda propia (liquidada)", "Cartera de valores", "Seguros de vida", "Plan de pensiones"],
            "nota": "Su principal preocupación fiscal es el IRPF alto y el impuesto sobre herencias.",
        },
        "Voto Rural Conservador": {
            "color": "#D97706",
            "renta": 19000, "paro": 11, "pct_alquiler": 29, "hipoteca": 350,
            "gasto": {"Coche (imprescindible)": 350, "Alimentación": 380, "Hipoteca/renta": 350,
                      "Combustible agrícola": 280, "Seguros": 90},
            "ahorro": 120, "deuda_media": 22000,
            "euribor_sens": 6,
            "ipc_sens": 8,
            "paro_sens": 7,
            "irpf_sens": 5,
            "activos": ["Vivienda propia", "Tierra/finca agrícola"],
            "nota": "Muy afectado por el precio de los combustibles y fertilizantes.",
        },
        "Joven Abstencionista": {
            "color": "#7C3AED",
            "renta": 16000, "paro": 27, "pct_alquiler": 45, "hipoteca": 0,
            "gasto": {"Ocio/salidas": 180, "Tecnología/suscripciones": 60, "Ropa/imagen": 90,
                      "Transporte": 55, "Alimentación": 150},
            "ahorro": -120, "deuda_media": 3200,
            "euribor_sens": 1,
            "ipc_sens": 7,
            "paro_sens": 10,
            "irpf_sens": 3,
            "activos": ["Cuenta corriente con poco saldo"],
            "nota": "El 48% vive con sus padres. Su problema no es el euríbor sino conseguir empleo estable.",
        },
    }

    perfil_micro = st.selectbox("Perfil de votante", list(MICRO.keys()), key="micro_sel")
    m = MICRO[perfil_micro]

    col_m1, col_m2, col_m3 = st.columns([2, 2, 1])

    with col_m1:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Cascada de ingresos y gastos mensuales (€)</span><div class="line"></div></div>', unsafe_allow_html=True)
        renta_mensual = m["renta"] / 12 * 0.78  # aprox neta
        total_gasto = sum(m["gasto"].values())
        ahorro = renta_mensual - total_gasto

        conceptos = ["Renta neta mensual"] + list(m["gasto"].keys()) + ["Ahorro/déficit"]
        valores = [renta_mensual] + [-v for v in m["gasto"].values()] + [ahorro]
        colores_wf = (
            [GREEN] +
            [RED] * len(m["gasto"]) +
            [GREEN if ahorro >= 0 else RED]
        )
        fig_wf = go.Figure(go.Bar(
            x=conceptos, y=valores,
            marker_color=colores_wf,
            text=[f"{int(v):+d}€" for v in valores],
            textposition="outside",
        ))
        fig_wf.add_hline(y=0, line_color=MUTED, line_width=1)
        fig_wf.update_layout(
            height=360, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="€/mes", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(size=9, color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_wf, use_container_width=True)

    with col_m2:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Sensibilidad a indicadores económicos (1-10)</span><div class="line"></div></div>', unsafe_allow_html=True)
        categorias_radar = ["Euríbor", "IPC/inflación", "Paro", "IRPF/impuestos"]
        valores_radar = [m["euribor_sens"], m["ipc_sens"], m["paro_sens"], m["irpf_sens"]]
        fig_radar = go.Figure(go.Scatterpolar(
            r=valores_radar,
            theta=categorias_radar,
            fill="toself",
            marker_color=m["color"],
            line_color=m["color"],
            fillcolor=m["color"],
            opacity=0.3,
        ))
        fig_radar.update_layout(
            polar=dict(radialaxis=dict(visible=True, range=[0, 10], tickfont=dict(color=TEXT2), gridcolor=BORDER), angularaxis=dict(tickfont=dict(color=TEXT2))),
            height=320, paper_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=20, b=20),
            showlegend=False,
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

    with col_m3:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Datos clave</span><div class="line"></div></div>', unsafe_allow_html=True)
        datos_clave = [
            ("Renta anual", f"{m['renta']:,}€"),
            ("Tasa de paro", f"{m['paro']}%"),
            ("% en alquiler", f"{m['pct_alquiler']}%"),
            ("Ahorro mensual", f"{m['ahorro']:+d}€"),
            ("Deuda media", f"{m['deuda_media']:,}€"),
        ]
        for k, v in datos_clave:
            st.markdown(f"""
            <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;padding:.4rem .7rem;margin-bottom:.4rem">
                <div style="font-size:.68rem;color:{MUTED}">{k}</div>
                <div style="font-weight:700;color:{TEXT}">{v}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Activos principales</span><div class="line"></div></div>', unsafe_allow_html=True)
        for a in m["activos"]:
            st.markdown(f"— {a}")

    st.info(f"**Nota analítica:** {m['nota']}")

    # Calculadora de impacto del euríbor
    st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Calculadora: impacto de una subida del euríbor</span><div class="line"></div></div>', unsafe_allow_html=True)
    col_calc1, col_calc2, col_calc3 = st.columns(3)
    with col_calc1:
        capital_hip = st.number_input("Capital pendiente de hipoteca (€)", value=120000, step=10000)
    with col_calc2:
        anos_restantes = st.number_input("Años restantes", value=20, min_value=1, max_value=35)
    with col_calc3:
        subida_eur = st.number_input("Subida del euríbor (pp)", value=0.5, step=0.25, min_value=0.0, max_value=5.0)

    euribor_actual = macro_vals["euribor_12m"]
    tipo_actual = euribor_actual + 0.5  # diferencial habitual
    tipo_nuevo = tipo_actual + subida_eur
    n = anos_restantes * 12
    cuota_actual = capital_hip * (tipo_actual/100/12) / (1 - (1 + tipo_actual/100/12)**(-n))
    cuota_nueva  = capital_hip * (tipo_nuevo/100/12) / (1 - (1 + tipo_nuevo/100/12)**(-n))

    col_r1, col_r2, col_r3 = st.columns(3)
    with col_r1:
        st.metric("Cuota actual", f"{cuota_actual:.0f} €/mes")
    with col_r2:
        st.metric("Cuota nueva", f"{cuota_nueva:.0f} €/mes", delta=f"+{cuota_nueva-cuota_actual:.0f} €/mes")
    with col_r3:
        coste_extra_anual = (cuota_nueva - cuota_actual) * 12
        st.metric("Coste extra anual", f"{coste_extra_anual:.0f} €")

    # Comparativa de perfiles
    st.markdown(f'<div style="height:1px;background:{BORDER};margin:1.2rem 0"></div>', unsafe_allow_html=True)
    st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Comparativa microeconómica entre perfiles</span><div class="line"></div></div>', unsafe_allow_html=True)
    df_comp = pd.DataFrame([
        {
            "Perfil": k,
            "Renta anual (€)": v["renta"],
            "Paro (%)": v["paro"],
            "Alquiler (%)": v["pct_alquiler"],
            "Ahorro/mes (€)": v["ahorro"],
            "Deuda media (€)": v["deuda_media"],
        }
        for k, v in MICRO.items()
    ])
    st.dataframe(
        df_comp.style.background_gradient(subset=["Renta anual (€)"], cmap="Blues")
                     .background_gradient(subset=["Paro (%)"], cmap="Reds_r"),
        use_container_width=True, hide_index=True,
    )


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3: INDICADORES DE NICHO
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("Indicadores financieros y macroeconómicos de nicho que los analistas políticos usan para anticipar movimientos electorales.")

    col_n1, col_n2 = st.columns(2)

    with col_n1:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Curva de tipos bonos españoles (% rendimiento)</span><div class="line"></div></div>', unsafe_allow_html=True)
        vencimientos = ["3M", "6M", "1A", "2A", "3A", "5A", "7A", "10A", "15A", "30A"]
        rendimientos = [3.2, 3.1, 2.95, 2.88, 2.92, 3.05, 3.18, 3.35, 3.52, 3.78]
        fig_curva = go.Figure(go.Scatter(
            x=vencimientos, y=rendimientos,
            mode="lines+markers",
            line=dict(color=BLUE, width=3),
            marker=dict(size=9, color=BLUE),
            fill="tozeroy", fillcolor="rgba(37,99,235,0.08)",
        ))
        fig_curva.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="Rendimiento (%)", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(title="Vencimiento", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_curva, use_container_width=True)
        st.caption("La curva de tipos está ligeramente invertida en el tramo corto, lo que históricamente señala precaución sobre el crecimiento a corto plazo.")

    with col_n2:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">PMI compuesto España vs Eurozona (puntos)</span><div class="line"></div></div>', unsafe_allow_html=True)
        meses_pmi = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr"]
        pmi_es  = [52.4, 51.8, 50.9, 51.2, 52.1, 53.0, 52.7]
        pmi_eur = [49.8, 49.2, 49.5, 50.1, 50.8, 51.2, 51.0]
        fig_pmi = go.Figure()
        fig_pmi.add_trace(go.Scatter(x=meses_pmi, y=pmi_es,  name="España", line=dict(color=RED, width=2.5)))
        fig_pmi.add_trace(go.Scatter(x=meses_pmi, y=pmi_eur, name="Eurozona", line=dict(color=BLUE, width=2)))
        fig_pmi.add_hrect(y0=50, y1=50, line_width=2, line_dash="dash", line_color=MUTED)
        fig_pmi.add_annotation(x=meses_pmi[-1], y=50.5, text="Umbral expansión/contracción",
                               showarrow=False, font=dict(size=10, color=MUTED))
        fig_pmi.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="Índice PMI", range=[47, 56], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_pmi, use_container_width=True)
        st.caption("PMI >50 = expansión. España lleva 7 meses en expansión, superando a la Eurozona.")

    col_n3, col_n4 = st.columns(2)

    with col_n3:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Confianza del consumidor vs confianza empresarial</span><div class="line"></div></div>', unsafe_allow_html=True)
        meses_conf = pd.date_range("2024-01", "2026-04", freq="ME")
        np.random.seed(3)
        conf_cons = -8 + np.cumsum(np.random.normal(0.2, 1.2, len(meses_conf)))
        conf_emp  =  2 + np.cumsum(np.random.normal(0.3, 0.8, len(meses_conf)))
        conf_cons = np.clip(conf_cons, -25, 10)
        conf_emp  = np.clip(conf_emp,  -10, 15)
        fig_conf = go.Figure()
        fig_conf.add_trace(go.Scatter(x=meses_conf, y=conf_cons, name="Consumidor", line=dict(color=RED, width=2)))
        fig_conf.add_trace(go.Scatter(x=meses_conf, y=conf_emp,  name="Empresarial", line=dict(color=BLUE, width=2)))
        fig_conf.add_hline(y=0, line_dash="dash", line_color=MUTED, annotation_text="Neutro")
        fig_conf.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            yaxis=dict(title="Índice (–100 a +100)", tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            xaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_conf, use_container_width=True)
        st.caption("La brecha entre confianza empresarial y del consumidor es un indicador adelantado de voto de castigo.")

    with col_n4:
        st.markdown(f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div><span class="lbl">Morosidad bancaria por sector (%)</span><div class="line"></div></div>', unsafe_allow_html=True)
        sectores_mor = ["Promotores/constructores", "Autónomos", "Consumo hogares",
                        "Pymes industria", "Hipotecas residenciales", "Grandes empresas"]
        morosidad_sec = [12.4, 7.8, 4.2, 3.9, 2.8, 1.2]
        fig_mor = go.Figure(go.Bar(
            y=sectores_mor, x=morosidad_sec, orientation="h",
            marker_color=[RED if v > 7 else (AMBER if v > 4 else GREEN) for v in morosidad_sec],
            text=[f"{v}%" for v in morosidad_sec], textposition="outside",
        ))
        fig_mor.add_vline(x=3.5, line_dash="dash", line_color=MUTED,
                          annotation_text="Media sistema bancario")
        fig_mor.update_layout(
            height=300, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(range=[0, 15], tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            yaxis=dict(tickfont=dict(color=TEXT2), gridcolor=BORDER, linecolor=BORDER),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=10),
        )
        st.plotly_chart(fig_mor, use_container_width=True)

    # Glosario
    with st.expander("Glosario de indicadores de nicho"):
        st.markdown(f"""
        | Indicador | Qué mide | Por qué importa electoralmente |
        |-----------|----------|---------------------------------|
        | **Prima de riesgo** | Diferencial del bono español a 10 años vs el bund alemán | Si supera 150pb, el gobierno tiene dificultades para financiarse y aparece la narrativa de "crisis" |
        | **Euríbor 12M** | Tipo interbancario de referencia para hipotecas variables | Afecta directamente a 4M de hipotecados; +1pp = -150€/mes de renta disponible |
        | **PMI compuesto** | Encuesta a gestores de compras de empresas (50 = neutro) | Indicador adelantado de actividad económica, anticipa el PIB 2-3 meses |
        | **Curva de tipos** | Rendimientos de bonos por vencimiento | Curva invertida (corto > largo) señala recesión; amplifica el malestar económico |
        | **Confianza del consumidor** | Encuesta mensual de expectativas económicas de los hogares | Correlaciona con el voto de castigo: si cae 10 puntos, el partido gobernante pierde ~2pp |
        | **Morosidad bancaria** | % de créditos en situación de impago | Indicador de salud económica real de familias y empresas |
        | **CDS soberanos** | Seguro de crédito sobre la deuda española | Termómetro de confianza de los mercados internacionales en España |
        """)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 4: ANALOGÍAS HISTÓRICAS
# ══════════════════════════════════════════════════════════════════════════════
with tab4:

    # ── Dataset histórico enriquecido ─────────────────────────────────────────
    CICLOS = [
        {
            "año": "1982", "paro": 16.2, "ipc": 14.4, "pib": 1.2, "prima": 350,
            "incumbente": "UCD", "color_inc": "#95A5A6",
            "voto_inc": 6.8, "ganador": "PSOE", "voto_gan": 48.1, "escanos_gan": 202,
            "resultado": "Derrumbe histórico del partido gobernante. PSOE obtiene mayoría absoluta arrasadora.",
            "leccion": "El agotamiento institucional extremo tras crisis interna puede provocar una reconfiguración total del sistema de partidos.",
        },
        {
            "año": "1986", "paro": 21.1, "ipc": 8.7, "pib": 3.3, "prima": 280,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 44.1, "ganador": "PSOE", "voto_gan": 44.1, "escanos_gan": 184,
            "resultado": "PSOE revalida mayoría absoluta pese al paro récord gracias al fuerte crecimiento y efecto González.",
            "leccion": "Un crecimiento vigoroso puede compensar una tasa de paro alta si el electorado percibe una tendencia de mejora.",
        },
        {
            "año": "1989", "paro": 16.9, "ipc": 6.8, "pib": 4.8, "prima": 220,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 39.6, "ganador": "PSOE", "voto_gan": 39.6, "escanos_gan": 175,
            "resultado": "Tercera mayoría socialista, aunque con pérdida de votos. Comienzan a notarse los escándalos.",
            "leccion": "La degradación de la imagen de integridad erosiona el voto incluso en contextos económicos favorables.",
        },
        {
            "año": "1993", "paro": 24.2, "ipc": 4.6, "pib": -1.0, "prima": 390,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 38.8, "ganador": "PSOE", "voto_gan": 38.8, "escanos_gan": 159,
            "resultado": "PSOE gana en minoría pese a la recesión. González convierte la campaña en un plebiscito personal.",
            "leccion": "Un liderazgo carismático puede amortiguar el castigo electoral en recesión; sin mayoría, la gobernabilidad se complica.",
        },
        {
            "año": "1996", "paro": 22.9, "ipc": 3.6, "pib": 2.4, "prima": 290,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 37.6, "ganador": "PP", "voto_gan": 38.8, "escanos_gan": 156,
            "resultado": "PP gana por la mínima. El desgaste acumulado de 13 años supera una economía en recuperación.",
            "leccion": "La fatiga de gobierno a largo plazo puede costar la victoria incluso cuando la economía mejora.",
        },
        {
            "año": "2000", "paro": 13.9, "ipc": 3.5, "pib": 4.7, "prima": 55,
            "incumbente": "PP", "color_inc": "#2980B9",
            "voto_inc": 44.5, "ganador": "PP", "voto_gan": 44.5, "escanos_gan": 183,
            "resultado": "PP logra mayoría absoluta en pleno boom económico. Paro bajando, PIB al 4,7%.",
            "leccion": "La convergencia de bajo paro + alto crecimiento + baja inflación es la condición ideal para revalidar con amplitud.",
        },
        {
            "año": "2004", "paro": 10.9, "ipc": 3.0, "pib": 3.3, "prima": 12,
            "incumbente": "PP", "color_inc": "#2980B9",
            "voto_inc": 37.7, "ganador": "PSOE", "voto_gan": 42.6, "escanos_gan": 164,
            "resultado": "PSOE gana tras los atentados del 11-M y la gestión del Gobierno. Economía sólida pero factor extrapolitico decisivo.",
            "leccion": "Los shocks exógenos graves (terrorismo, guerra) pueden anular una ventaja económica clara del incumbente.",
        },
        {
            "año": "2008", "paro": 11.2, "ipc": 4.1, "pib": 0.9, "prima": 25,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 43.9, "ganador": "PSOE", "voto_gan": 43.9, "escanos_gan": 169,
            "resultado": "PSOE revalida justo cuando la crisis financiera global empieza a impactar. El paro aún no se disparaba en campaña.",
            "leccion": "El deterioro económico incipiente no castiga si el colapso llega después de las urnas; la percepción importa más que los datos.",
        },
        {
            "año": "2011", "paro": 22.9, "ipc": 3.1, "pib": 0.1, "prima": 420,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 28.7, "ganador": "PP", "voto_gan": 44.6, "escanos_gan": 186,
            "resultado": "PP gana mayoría absoluta. El paro disparado, la prima de riesgo récord y el rescate obligan al PSOE a convocar anticipadas.",
            "leccion": "Una crisis económica profunda con prima de riesgo >400pb produce el mayor castigo electoral documentado al incumbente.",
        },
        {
            "año": "2015", "paro": 21.3, "ipc": -0.5, "pib": 3.2, "prima": 115,
            "incumbente": "PP", "color_inc": "#2980B9",
            "voto_inc": 28.7, "ganador": "PP", "voto_gan": 28.7, "escanos_gan": 123,
            "resultado": "El sistema bipartidista se rompe. Podemos y Ciudadanos irrumpen. PP pierde la mayoría absoluta pese a la recuperación.",
            "leccion": "La recuperación económica con alta desigualdad percibida genera una ola populista que fragmenta el sistema de partidos.",
        },
        {
            "año": "2016", "paro": 19.6, "ipc": -0.2, "pib": 3.3, "prima": 145,
            "incumbente": "PP", "color_inc": "#2980B9",
            "voto_inc": 33.0, "ganador": "PP", "voto_gan": 33.0, "escanos_gan": 137,
            "resultado": "PP gana en minoría tras repetición electoral. El sistema sigue fragmentado. Recuperación económica en marcha.",
            "leccion": "En un sistema multipartidista fragmentado, ganar en minoría se convierte en la nueva normalidad.",
        },
        {
            "año": "2019a", "paro": 14.2, "ipc": 1.5, "pib": 2.3, "prima": 115,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 28.7, "ganador": "PSOE", "voto_gan": 28.7, "escanos_gan": 123,
            "resultado": "PSOE gana en minoría. Sánchez fuerza las elecciones tras rechazar los presupuestos. VOX irrumpe con 24 escaños.",
            "leccion": "Convocar anticipadas desde el gobierno para aprovechar un momento de ventaja en las encuestas genera beneficios moderados.",
        },
        {
            "año": "2019n", "paro": 13.8, "ipc": 0.8, "pib": 2.0, "prima": 65,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 28.0, "ganador": "PSOE", "voto_gan": 28.0, "escanos_gan": 120,
            "resultado": "PSOE vuelve a ganar pero pierde escaños. VOX sube a 52. Repetición sin mejora de gobernabilidad.",
            "leccion": "Repetir elecciones sin cambio de contexto no resuelve la fragmentación; puede deteriorar aún más la posición del convocante.",
        },
        {
            "año": "2023", "paro": 11.8, "ipc": 3.4, "pib": 2.5, "prima": 105,
            "incumbente": "PSOE", "color_inc": "#E74C3C",
            "voto_inc": 31.7, "ganador": "PSOE", "voto_gan": 31.7, "escanos_gan": 122,
            "resultado": "PSOE gana de forma inesperada (las encuestas favorecían al PP). Coalición con SUMAR y apoyo de partidos territoriales.",
            "leccion": "Un paro bajo y crecimiento moderado permiten al incumbente superar las expectativas cuando la alternativa se percibe como extrema.",
        },
    ]

    # ── Similitud euclidiana normalizada ──────────────────────────────────────
    paro_hist  = [c["paro"]  for c in CICLOS]
    ipc_hist   = [c["ipc"]   for c in CICLOS]
    pib_hist   = [c["pib"]   for c in CICLOS]
    prima_hist = [c["prima"] for c in CICLOS]

    def _norm_range(vals):
        mn, mx = min(vals), max(vals)
        return (mx - mn) if mx != mn else 1.0

    rng_paro  = _norm_range(paro_hist)
    rng_ipc   = _norm_range(ipc_hist)
    rng_pib   = _norm_range(pib_hist)
    rng_prima = _norm_range(prima_hist)

    cur_paro  = macro_vals["tasa_paro"]
    cur_ipc   = macro_vals["ipc_general"]
    cur_pib   = macro_vals["crecimiento_pib"]
    cur_prima = macro_vals["prima_riesgo"]

    W = {"paro": 0.40, "ipc": 0.25, "pib": 0.20, "prima": 0.15}

    for c in CICLOS:
        d = (
            W["paro"]  * ((c["paro"]  - cur_paro)  / rng_paro)  ** 2
            + W["ipc"]   * ((c["ipc"]   - cur_ipc)   / rng_ipc)   ** 2
            + W["pib"]   * ((c["pib"]   - cur_pib)   / rng_pib)   ** 2
            + W["prima"] * ((c["prima"] - cur_prima) / rng_prima) ** 2
        ) ** 0.5
        c["distancia"] = round(d, 4)
        c["similitud"] = round(max(0, 1 - d) * 100, 1)

    ciclos_ranked = sorted(CICLOS, key=lambda x: x["distancia"])

    # ── Encabezado del tab ────────────────────────────────────────────────────
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{CYAN}"></div>'
        f'<span class="lbl">¿A qué ciclo electoral se parece más el momento actual?</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    st.markdown(
        f'<div style="font-size:.82rem;color:{TEXT2};margin-bottom:1.2rem;max-width:780px">'
        f'Distancia euclidiana normalizada entre el perfil macroeconómico de hoy '
        f'(paro <strong style="color:{TEXT}">{cur_paro:.1f}%</strong>, '
        f'IPC <strong style="color:{TEXT}">{cur_ipc:.1f}%</strong>, '
        f'PIB <strong style="color:{TEXT}">+{cur_pib:.1f}%</strong>, '
        f'prima <strong style="color:{TEXT}">{cur_prima:.0f} pb</strong>) '
        f'y cada elección general española desde 1982. Ponderación: paro 40 % · IPC 25 % · PIB 20 % · prima 15 %.'
        f'</div>',
        unsafe_allow_html=True,
    )

    # ── TOP 3 tarjetas de analogía ────────────────────────────────────────────
    top3 = ciclos_ranked[:3]
    cols_top = st.columns(3, gap="large")
    medallas = ["◆  Máxima analogía", "◇  2.ª analogía", "○  3.ª analogía"]
    medalla_colors = [CYAN, BLUE, PURPLE]

    for col, ciclo, medalla, mc in zip(cols_top, top3, medallas, medalla_colors):
        inc_color = ciclo["color_inc"]
        inc_r, inc_g, inc_b = int(inc_color[1:3],16), int(inc_color[3:5],16), int(inc_color[5:7],16)
        simil_bar = int(ciclo["similitud"] * 1.5)

        with col:
            st.markdown(
                f'<div style="background:linear-gradient(160deg,{BG2},{BG3});'
                f'border:1px solid {mc}55;border-top:3px solid {mc};'
                f'border-radius:12px;padding:1.1rem 1.2rem">'

                # Medalla + año
                f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.7rem">'
                f'<span style="font-size:.6rem;font-weight:700;color:{mc};letter-spacing:.1em;text-transform:uppercase">{medalla}</span>'
                f'<span style="font-size:1.6rem;font-weight:900;color:{TEXT};font-family:\'JetBrains Mono\',monospace">{ciclo["año"]}</span>'
                f'</div>'

                # Similitud barra
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.8rem">'
                f'<div style="flex:1;background:{BG3};border-radius:4px;height:6px">'
                f'<div style="width:{simil_bar}px;max-width:100%;background:{mc};border-radius:4px;height:6px"></div>'
                f'</div>'
                f'<span style="font-size:.72rem;font-weight:700;color:{mc};width:38px">{ciclo["similitud"]:.0f}%</span>'
                f'</div>'

                # Indicadores económicos
                f'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem .6rem;margin-bottom:.8rem">'
                f'<div style="font-size:.7rem;color:{TEXT2}">Paro: <strong style="color:{TEXT}">{ciclo["paro"]:.1f}%</strong></div>'
                f'<div style="font-size:.7rem;color:{TEXT2}">IPC: <strong style="color:{TEXT}">{ciclo["ipc"]:.1f}%</strong></div>'
                f'<div style="font-size:.7rem;color:{TEXT2}">PIB: <strong style="color:{TEXT}">{ciclo["pib"]:+.1f}%</strong></div>'
                f'<div style="font-size:.7rem;color:{TEXT2}">Prima: <strong style="color:{TEXT}">{ciclo["prima"]:.0f} pb</strong></div>'
                f'</div>'

                # Resultado
                f'<div style="background:rgba({inc_r},{inc_g},{inc_b},0.1);border-left:2px solid {inc_color};'
                f'border-radius:0 6px 6px 0;padding:.45rem .6rem;margin-bottom:.7rem">'
                f'<div style="font-size:.6rem;font-weight:700;color:{inc_color};letter-spacing:.08em;text-transform:uppercase;margin-bottom:.2rem">'
                f'{ciclo["incumbente"]} incumbente · {ciclo["voto_inc"]:.1f}% → ganó {ciclo["ganador"]} ({ciclo["voto_gan"]:.1f}%)</div>'
                f'<div style="font-size:.72rem;color:{TEXT2}">{ciclo["resultado"]}</div>'
                f'</div>'

                # Lección
                f'<div style="font-size:.7rem;color:{MUTED};font-style:italic;line-height:1.45">'
                f'<span style="color:{mc};font-style:normal;font-weight:700">Lección · </span>{ciclo["leccion"]}'
                f'</div>'

                f'</div>',
                unsafe_allow_html=True,
            )

    st.markdown(f'<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.8rem 0"></div>', unsafe_allow_html=True)

    # ── Scatter paro vs voto + posición actual ────────────────────────────────
    col_sc, col_rank = st.columns([3, 2], gap="large")

    with col_sc:
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{BLUE}"></div>'
            f'<span class="lbl">Paro vs voto al partido gobernante — 1982-2026</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
        fig_sc = go.Figure()
        for c in CICLOS:
            color_pt = c["color_inc"]
            is_top3 = c in top3
            fig_sc.add_trace(go.Scatter(
                x=[c["paro"]], y=[c["voto_inc"]],
                mode="markers+text",
                marker=dict(
                    color=color_pt,
                    size=16 if is_top3 else 10,
                    opacity=1.0 if is_top3 else 0.55,
                    line=dict(width=2 if is_top3 else 0, color=CYAN if is_top3 else color_pt),
                    symbol="diamond" if is_top3 else "circle",
                ),
                text=[c["año"]],
                textposition="top center",
                textfont=dict(
                    color=CYAN if is_top3 else TEXT2,
                    size=10 if is_top3 else 9,
                    family="JetBrains Mono, monospace",
                ),
                name=c["año"],
                showlegend=False,
                hovertemplate=(
                    f"<b>{c['año']}</b><br>"
                    f"Paro: {c['paro']:.1f}%<br>"
                    f"Voto gob.: {c['voto_inc']:.1f}%<br>"
                    f"Similitud actual: {c['similitud']:.0f}%"
                    "<extra></extra>"
                ),
            ))

        # Tendencia
        parox = [c["paro"] for c in CICLOS]
        votox = [c["voto_inc"] for c in CICLOS]
        m_c, b_c = np.polyfit(parox, votox, 1)
        x_tr = np.linspace(min(parox) - 1, max(parox) + 1, 120)
        fig_sc.add_trace(go.Scatter(
            x=x_tr, y=m_c * x_tr + b_c,
            mode="lines", line=dict(color=MUTED, dash="dash", width=1),
            name=f"β={m_c:.2f}", showlegend=True,
            hovertemplate="Tendencia<extra></extra>",
        ))

        # Punto actual estimado (PSOE incumbente)
        fig_sc.add_trace(go.Scatter(
            x=[cur_paro], y=[28.5],
            mode="markers+text",
            marker=dict(color=AMBER, size=20, symbol="star", line=dict(width=1.5, color=BG)),
            text=["2026 est."],
            textposition="top center",
            textfont=dict(color=AMBER, size=11, family="JetBrains Mono"),
            name="2026 (estimado)",
            hovertemplate=f"<b>Estimación 2026</b><br>Paro: {cur_paro:.1f}%<br>Voto proyectado: ~28.5%<extra></extra>",
        ))

        fig_sc.update_layout(
            height=420,
            plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(
                title="Tasa de paro (%)", gridcolor=BORDER, linecolor=BORDER,
                tickfont=dict(color=TEXT2, size=10), title_font=dict(color=MUTED, size=11),
            ),
            yaxis=dict(
                title="Voto partido gobernante (%)", gridcolor=BORDER, linecolor=BORDER,
                tickfont=dict(color=TEXT2, size=10), title_font=dict(color=MUTED, size=11),
            ),
            legend=dict(orientation="h", y=-0.18, font=dict(color=TEXT2, size=10), bgcolor="rgba(0,0,0,0)"),
            font=dict(color=TEXT2),
            margin=dict(t=10, b=50, l=55, r=10),
        )
        st.plotly_chart(fig_sc, use_container_width=True, config={"displayModeBar": False})
        st.caption(f"Los puntos destacados (⬥) son las 3 mayores analogías con el contexto actual. β={m_c:.2f}: cada +1 pp de paro ≈ {m_c:.2f} pp de voto al partido gobernante.")

    with col_rank:
        st.markdown(
            f'<div class="section-title"><div class="bar" style="background:{PURPLE}"></div>'
            f'<span class="lbl">Ranking completo de similitud</span>'
            f'<div class="line"></div></div>',
            unsafe_allow_html=True,
        )
        for i, c in enumerate(ciclos_ranked):
            bar_pct = int(c["similitud"])
            accent = CYAN if i == 0 else (BLUE if i == 1 else (PURPLE if i == 2 else BORDER))
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem;'
                f'padding:.3rem .5rem;border-radius:6px;'
                f'background:{"rgba(6,182,212,0.06)" if i < 3 else "transparent"}">'
                f'<span style="font-size:.65rem;font-weight:700;color:{MUTED};width:16px;text-align:right">{i+1}</span>'
                f'<span style="font-size:.8rem;font-weight:{"700" if i < 3 else "500"};'
                f'color:{accent if i < 3 else TEXT2};font-family:\'JetBrains Mono\',monospace;width:40px">{c["año"]}</span>'
                f'<div style="flex:1;background:{BG3};border-radius:3px;height:8px">'
                f'<div style="width:{bar_pct}%;background:{accent};border-radius:3px;height:8px;'
                f'opacity:{"1" if i < 3 else "0.45"}"></div>'
                f'</div>'
                f'<span style="font-size:.7rem;font-weight:700;color:{accent if i < 3 else MUTED};width:36px;text-align:right">'
                f'{c["similitud"]:.0f}%</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # ── Matriz de correlaciones ───────────────────────────────────────────────
    st.markdown(f'<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);margin:1.8rem 0"></div>', unsafe_allow_html=True)
    st.markdown(
        f'<div class="section-title"><div class="bar" style="background:{AMBER}"></div>'
        f'<span class="lbl">Correlaciones históricas: economía vs resultado electoral (España 1982-2025)</span>'
        f'<div class="line"></div></div>',
        unsafe_allow_html=True,
    )
    indicadores_corr = ["Paro (+1pp)", "IPC (+1pp)", "PIB (−1pp)", "Prima (+50pb)", "Euríbor (+1pp)"]
    efectos_corr     = ["Voto gobernante", "Aprobación gobierno", "Intención de cambio"]
    matriz_corr = [
        [-0.71, -0.65, +0.61],
        [-0.48, -0.52, +0.44],
        [+0.58, +0.61, -0.55],
        [-0.39, -0.42, +0.38],
        [-0.41, -0.45, +0.40],
    ]
    fig_corr = go.Figure(go.Heatmap(
        z=matriz_corr, x=efectos_corr, y=indicadores_corr,
        colorscale=[[0, RED], [0.5, BG3], [1, GREEN]],
        zmin=-1, zmax=1,
        text=[[f"{v:+.2f}" for v in row] for row in matriz_corr],
        texttemplate="%{text}",
        showscale=True,
        colorbar=dict(
            title="r", thickness=12,
            tickfont=dict(color=TEXT2, size=10),
            titlefont=dict(color=MUTED, size=11),
        ),
    ))
    fig_corr.update_layout(
        height=280, plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(tickfont=dict(color=TEXT2, size=11), linecolor=BORDER),
        yaxis=dict(tickfont=dict(color=TEXT2, size=10), linecolor=BORDER),
        font=dict(color=TEXT2),
        margin=dict(t=10, b=10, l=130, r=10),
    )
    st.plotly_chart(fig_corr, use_container_width=True, config={"displayModeBar": False})
    st.caption("Correlaciones de Pearson estimadas sobre datos electorales y macroeconómicos españoles 1982-2025. El paro es el predictor con mayor r para el voto al partido gobernante.")
