"""
N6 — Inteligencia Económica
Economic Intelligence: macro, voto económico, sectorial, nowcasting, riesgo económico-político.
"""
from __future__ import annotations
import sys
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
    TEXT, TEXT2, MUTED, section_header, kpi_card, hex_to_rgba,
    intel_header, apply_plotly_theme, signal_card, metric_delta_card,
    confidence_badge,
)

st.set_page_config(page_title="Inteligencia Económica — ElectSim", page_icon="📊", layout="wide")
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("economia")

# ── Datos demo ────────────────────────────────────────────────────────────────
DEMO_MACRO = {
    "pib_yoy":       2.1,
    "ipc":           2.8,
    "paro":          11.4,
    "deuda_pib":     108.3,
    "prima_riesgo":  87,
    "itpe_economico": 58,
}

# ── Header ─────────────────────────────────────────────────────────────────────
intel_header(
    title="Inteligencia Económica",
    subtitle="Economic Intelligence",
    status="ACTIVO",
    time_str=datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# ── TOP KPI ROW ───────────────────────────────────────────────────────────────
c_pib    = GREEN if DEMO_MACRO["pib_yoy"] >= 2.0 else (AMBER if DEMO_MACRO["pib_yoy"] >= 0 else RED)
c_ipc    = GREEN if DEMO_MACRO["ipc"] <= 2.0 else (AMBER if DEMO_MACRO["ipc"] <= 3.5 else RED)
c_paro   = GREEN if DEMO_MACRO["paro"] <= 10 else (AMBER if DEMO_MACRO["paro"] <= 13 else RED)
c_deuda  = RED if DEMO_MACRO["deuda_pib"] >= 100 else (AMBER if DEMO_MACRO["deuda_pib"] >= 80 else GREEN)
c_prima  = GREEN if DEMO_MACRO["prima_riesgo"] <= 100 else (AMBER if DEMO_MACRO["prima_riesgo"] <= 150 else RED)
c_itpe   = GREEN if DEMO_MACRO["itpe_economico"] >= 65 else (AMBER if DEMO_MACRO["itpe_economico"] >= 45 else RED)

kpi_row = st.columns(6)
with kpi_row[0]:
    st.markdown(kpi_card("PIB (var. anual)", f"{DEMO_MACRO['pib_yoy']}%", "+0.2pp vs. 2024", c_pib), unsafe_allow_html=True)
with kpi_row[1]:
    st.markdown(kpi_card("IPC (Inflación)", f"{DEMO_MACRO['ipc']}%", "Objetivo BCE: 2.0%", c_ipc), unsafe_allow_html=True)
with kpi_row[2]:
    st.markdown(kpi_card("Tasa de Paro EPA", f"{DEMO_MACRO['paro']}%", "-0.5pp trimestral", c_paro), unsafe_allow_html=True)
with kpi_row[3]:
    st.markdown(kpi_card("Deuda / PIB", f"{DEMO_MACRO['deuda_pib']}%", "Reducción desde 120%", c_deuda), unsafe_allow_html=True)
with kpi_row[4]:
    st.markdown(kpi_card("Prima de Riesgo", f"{DEMO_MACRO['prima_riesgo']} pb", "+5pb vs. mes anterior", c_prima), unsafe_allow_html=True)
with kpi_row[5]:
    st.markdown(kpi_card("ITPE Económico", f"{DEMO_MACRO['itpe_economico']}", "Índice Tensión Político-Econ.", c_itpe), unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── TABS ──────────────────────────────────────────────────────────────────────
tab_macro, tab_voto, tab_sectorial, tab_nowcast, tab_riesgo = st.tabs([
    "INDICADORES MACRO",
    "IMPACTO ELECTORAL",
    "ANÁLISIS SECTORIAL",
    "NOWCASTING",
    "RIESGO ECONÓMICO-POLÍTICO",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — INDICADORES MACRO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_macro:
    section_header("EVOLUCIÓN MACROECONÓMICA — ÚLTIMOS 24 MESES", GREEN)

    fechas_macro = pd.date_range(end=datetime.now(), periods=24, freq="ME")
    np.random.seed(42)

    pib_ts   = np.clip(2.1  + np.cumsum(np.random.randn(24) * 0.15), -1.0, 5.0)
    ipc_ts   = np.clip(2.8  + np.cumsum(np.random.randn(24) * 0.12), 0.5, 8.5)
    paro_ts  = np.clip(11.4 + np.cumsum(np.random.randn(24) * 0.18), 8.0, 16.0)
    prima_ts = np.clip(87   + np.cumsum(np.random.randn(24) * 4.5),  40, 220)

    fig_macro = go.Figure()
    fig_macro.add_trace(go.Scatter(
        x=fechas_macro, y=pib_ts, name="PIB YoY (%)",
        line=dict(color=GREEN, width=2.5),
        hovertemplate="PIB: %{y:.2f}%<extra></extra>",
    ))
    fig_macro.add_trace(go.Scatter(
        x=fechas_macro, y=ipc_ts, name="IPC (%)",
        line=dict(color=AMBER, width=2.5, dash="dash"),
        hovertemplate="IPC: %{y:.2f}%<extra></extra>",
    ))
    fig_macro.add_trace(go.Scatter(
        x=fechas_macro, y=paro_ts, name="Paro EPA (%)",
        line=dict(color=RED, width=2.5, dash="dot"),
        yaxis="y2",
        hovertemplate="Paro: %{y:.2f}%<extra></extra>",
    ))
    fig_macro.add_trace(go.Scatter(
        x=fechas_macro, y=prima_ts / 10, name="Prima riesgo (÷10)",
        line=dict(color=CYAN, width=1.8, dash="longdash"),
        hovertemplate="Prima riesgo: %{y:.1f}×10 pb<extra></extra>",
    ))
    fig_macro.add_hline(y=2.0, line_dash="dot", line_color="rgba(16,185,129,0.333)",
                        annotation_text="Objetivo BCE 2%", annotation_font_color=GREEN, annotation_font_size=9)
    fig_macro.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=320, margin=dict(t=20, b=20, l=40, r=60),
        xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="PIB / IPC / Prima (%)"),
        yaxis2=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="Paro (%)", overlaying="y", side="right"),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25, font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        hovermode="x unified",
    )
    st.plotly_chart(fig_macro, use_container_width=True)

    # Semáforo macro — comparativa EU27
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("SEMÁFORO MACRO — ESPAÑA vs. EU27", CYAN)
    EU27 = {"PIB YoY (%)": (2.1, 1.1), "IPC (%)": (2.8, 2.6), "Paro (%)": (11.4, 6.1), "Deuda/PIB (%)": (108.3, 82.0), "Prima riesgo (pb)": (87, 55)}
    higher_better = {"PIB YoY (%)": True, "IPC (%)": False, "Paro (%)": False, "Deuda/PIB (%)": False, "Prima riesgo (pb)": False}

    cols_sem = st.columns(5)
    for ci, (ind, (esp, eu)) in enumerate(EU27.items()):
        hb = higher_better[ind]
        mejor_es = (esp > eu) if hb else (esp < eu)
        c_ind = GREEN if mejor_es else RED
        icon = "✓" if mejor_es else "✗"
        with cols_sem[ci]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {c_ind};'
                f'border-radius:10px;padding:.8rem;text-align:center">'
                f'<div style="font-size:.6rem;color:{MUTED};letter-spacing:.08em;text-transform:uppercase;margin-bottom:.4rem">{ind}</div>'
                f'<div style="font-size:1.3rem;font-weight:900;color:{c_ind};font-family:monospace">{icon}</div>'
                f'<div style="font-size:.9rem;font-weight:700;color:{TEXT};margin:.2rem 0">{esp}</div>'
                f'<div style="font-size:.65rem;color:{MUTED}">EU27: {eu}</div>'
                f'<div style="font-size:.62rem;color:{c_ind};margin-top:.3rem">{"MEJOR" if mejor_es else "PEOR"} que UE</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Comparativa economías UE principales
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("COMPARATIVA CON PRINCIPALES ECONOMÍAS UE", BLUE)
    COMPARATIVA = {
        "País": ["España", "Alemania", "Francia", "Italia", "Portugal"],
        "PIB YoY (%)": [2.1, -0.3, 1.1, 0.7, 1.8],
        "IPC (%)": [2.8, 2.4, 2.2, 1.9, 2.3],
        "Paro (%)": [11.4, 3.2, 7.3, 6.8, 6.6],
        "Deuda/PIB (%)": [108.3, 64.3, 110.6, 137.3, 100.0],
    }
    df_comp = pd.DataFrame(COMPARATIVA)
    fig_comp = go.Figure()
    indicadores_comp = ["PIB YoY (%)", "IPC (%)", "Paro (%)", "Deuda/PIB (%)"]
    colors_comp = [GREEN, AMBER, RED, PURPLE]
    for i, (ind, cc) in enumerate(zip(indicadores_comp, colors_comp)):
        fig_comp.add_trace(go.Bar(
            name=ind,
            x=df_comp["País"],
            y=df_comp[ind],
            marker_color=cc,
            offsetgroup=i,
            hovertemplate=f"<b>%{{x}}</b><br>{ind}: %{{y:.1f}}<extra></extra>",
        ))
    fig_comp.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=300, margin=dict(t=20, b=20, l=30, r=10),
        barmode="group",
        xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25, font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
    )
    st.plotly_chart(fig_comp, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — IMPACTO ELECTORAL DE LA ECONOMÍA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_voto:
    section_header("MODELO DE VOTO ECONÓMICO — LEWIS-BECK", PURPLE)

    # Intentar importar del módulo real
    economic_vote_pred = None
    try:
        from agents.analysis.political_trends import economic_vote_model
        economic_vote_pred = economic_vote_model(DEMO_MACRO)
    except Exception:
        pass

    col_model, col_pred = st.columns([1, 1])
    with col_model:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {PURPLE};'
            f'border-radius:12px;padding:1.2rem 1.4rem;margin-bottom:.8rem">'
            f'<div style="font-size:.65rem;font-weight:800;color:{MUTED};letter-spacing:.12em;text-transform:uppercase;margin-bottom:.5rem">MODELO LEWIS-BECK (VOTO ECONÓMICO)</div>'
            f'<div style="font-size:.8rem;color:{TEXT2};line-height:1.6">'
            f'El modelo Lewis-Beck establece que la intención de voto al partido en el gobierno se correlaciona '
            f'negativamente con la tasa de desempleo y la inflación, y positivamente con el crecimiento del PIB. '
            f'</div>'
            f'<div style="font-size:.72rem;color:{MUTED};margin-top:.6rem;font-family:monospace;">'
            f'Voto_gov = α + β₁·PIB - β₂·Paro - β₃·IPC + ε'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Cálculo simplificado del modelo
        pib_w   = 1.8
        paro_w  = -0.9
        ipc_w   = -0.6
        base    = 28.0
        pred_voto = base + pib_w * DEMO_MACRO["pib_yoy"] + paro_w * (DEMO_MACRO["paro"] - 10) + ipc_w * (DEMO_MACRO["ipc"] - 2)
        pred_voto = round(max(15, min(55, pred_voto)), 1)

        c_pred = GREEN if pred_voto >= 32 else (AMBER if pred_voto >= 27 else RED)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {c_pred};'
            f'border-radius:10px;padding:1rem 1.2rem;text-align:center">'
            f'<div style="font-size:.65rem;color:{MUTED};letter-spacing:.1em">PREDICCIÓN MODELO (PSOE)</div>'
            f'<div style="font-size:3rem;font-weight:900;color:{c_pred};font-family:monospace">{pred_voto}%</div>'
            f'<div style="font-size:.72rem;color:{TEXT2}">Intención de voto estimada partido de gobierno</div>'
            f'<div style="margin-top:.5rem">{confidence_badge(0.62)}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

    with col_pred:
        st.markdown(f'<div style="font-size:.72rem;color:{MUTED};margin-bottom:.5rem">Contribución de cada indicador al voto del gobierno:</div>', unsafe_allow_html=True)
        CONTRIBUCIONES = [
            {"ind": "PIB (crecimiento)", "valor": DEMO_MACRO["pib_yoy"], "contrib": round(pib_w * DEMO_MACRO["pib_yoy"], 2), "color": GREEN},
            {"ind": "Paro (penalización)", "valor": DEMO_MACRO["paro"], "contrib": round(paro_w * (DEMO_MACRO["paro"] - 10), 2), "color": RED},
            {"ind": "IPC (penalización)", "valor": DEMO_MACRO["ipc"], "contrib": round(ipc_w * (DEMO_MACRO["ipc"] - 2), 2), "color": AMBER},
            {"ind": "Constante", "valor": base, "contrib": base, "color": MUTED},
        ]
        for c_item in CONTRIBUCIONES:
            contrib = c_item["contrib"]
            contrib_pct = abs(contrib) / (abs(pib_w * DEMO_MACRO["pib_yoy"]) + abs(paro_w * (DEMO_MACRO["paro"] - 10)) + abs(ipc_w * (DEMO_MACRO["ipc"] - 2)) + base) * 100
            sign = "+" if contrib >= 0 else ""
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {c_item["color"]};'
                f'border-radius:8px;padding:.6rem .9rem;margin-bottom:.4rem;'
                f'display:flex;align-items:center;gap:.8rem">'
                f'<div style="flex:1">'
                f'<div style="font-size:.75rem;font-weight:700;color:{TEXT}">{c_item["ind"]}</div>'
                f'<div style="font-size:.65rem;color:{MUTED}">Valor actual: {c_item["valor"]}</div>'
                f'</div>'
                f'<div style="font-size:1rem;font-weight:800;color:{c_item["color"]};font-family:monospace">{sign}{contrib:.1f}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Scatter: aprobación económica vs. popularidad gobierno
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("APROBACIÓN ECONÓMICA vs. POPULARIDAD GOBIERNO — HISTÓRICO", BLUE)
    np.random.seed(55)
    n_obs = 48
    aprobacion_eco = 30 + np.random.randn(n_obs) * 8
    popularidad_gov = 28 + 0.55 * aprobacion_eco + np.random.randn(n_obs) * 4
    fechas_scatter = pd.date_range(end=datetime.now(), periods=n_obs, freq="ME")

    fig_scatter = go.Figure()
    colorscale_time = [f"rgb({int(255*(1-i/n_obs))},{int(100+100*i/n_obs)},{int(200*i/n_obs)})" for i in range(n_obs)]
    fig_scatter.add_trace(go.Scatter(
        x=aprobacion_eco, y=popularidad_gov,
        mode="markers",
        marker=dict(size=8, color=list(range(n_obs)), colorscale="Viridis",
                    showscale=True, colorbar=dict(title="Meses atrás", tickfont=dict(color=TEXT2, size=8))),
        hovertemplate="Aprobación económica: %{x:.1f}%<br>Popularidad gobierno: %{y:.1f}%<extra></extra>",
        name="Observaciones",
    ))
    z = np.polyfit(aprobacion_eco, popularidad_gov, 1)
    p_line = np.poly1d(z)
    x_line = np.linspace(aprobacion_eco.min(), aprobacion_eco.max(), 50)
    fig_scatter.add_trace(go.Scatter(
        x=x_line, y=p_line(x_line),
        mode="lines", name="Regresión OLS",
        line=dict(color=CYAN, width=2, dash="dash"),
    ))
    rho = float(np.corrcoef(aprobacion_eco, popularidad_gov)[0, 1])
    fig_scatter.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=300,
        title=dict(text=f"Correlación (ρ={rho:.2f}): aprobación económica → popularidad gobierno", font=dict(size=11, color=TEXT2), x=0.5),
        margin=dict(t=40, b=20, l=30, r=80),
        xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="Aprobación económica (%)"),
        yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="Popularidad gobierno (%)"),
        showlegend=False,
    )
    st.plotly_chart(fig_scatter, use_container_width=True)

    # Indicadores líderes
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("INDICADORES LÍDERES DE INTENCIÓN DE VOTO", AMBER)
    LIDERS = [
        {"ind": "Confianza del consumidor (ICC)", "lag_meses": 2, "corr": 0.72, "tendencia": "up",   "descripcion": "Adelanta 2 meses cambios en intención de voto al gobierno"},
        {"ind": "Creación de empleo neto (SS)", "lag_meses": 1, "corr": 0.68, "tendencia": "up",   "descripcion": "Correlación más fuerte en electorado de renta baja-media"},
        {"ind": "IPC subyacente (sin energía)", "lag_meses": 3, "corr": -0.61, "tendencia": "down", "descripcion": "Inflación persistente penaliza más que la energética"},
        {"ind": "Ventas al por menor YoY (%)", "lag_meses": 2, "corr": 0.58, "tendencia": "up",   "descripcion": "Proxy de confianza económica real de los hogares"},
        {"ind": "Prima de riesgo (bps)",         "lag_meses": 4, "corr": -0.54, "tendencia": "down", "descripcion": "Nerviosismo de mercados anticipa 4 meses deterioro político"},
    ]
    for lid in LIDERS:
        c_lid = GREEN if lid["corr"] > 0 else RED
        t_icon = "↑" if lid["tendencia"] == "up" else "↓"
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {c_lid};'
            f'border-radius:8px;padding:.7rem 1rem;margin-bottom:.4rem;'
            f'display:grid;grid-template-columns:2fr 80px 80px 3fr;align-items:center;gap:.8rem">'
            f'<div style="font-size:.78rem;font-weight:700;color:{TEXT}">{lid["ind"]}</div>'
            f'<div style="text-align:center">'
            f'<div style="font-size:.6rem;color:{MUTED}">Lag</div>'
            f'<div style="font-size:.9rem;font-weight:800;color:{CYAN}">{lid["lag_meses"]}m</div>'
            f'</div>'
            f'<div style="text-align:center">'
            f'<div style="font-size:.6rem;color:{MUTED}">Correlación</div>'
            f'<div style="font-size:.9rem;font-weight:800;color:{c_lid}">{lid["corr"]:+.2f} {t_icon}</div>'
            f'</div>'
            f'<div style="font-size:.7rem;color:{TEXT2}">{lid["descripcion"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — ANÁLISIS SECTORIAL
# ═══════════════════════════════════════════════════════════════════════════════
with tab_sectorial:
    section_header("ANÁLISIS SECTORIAL — ESPAÑA", BLUE)

    SECTORES = [
        {"sector": "Empleo / RRLL",  "tendencia": +1.2, "sentimiento": "positivo", "riesgo_pol": 45, "empleo_miles": 21200, "descripcion": "Mercado laboral en expansión moderada. Riesgo: reforma jornada laboral"},
        {"sector": "Vivienda",       "tendencia": -0.8, "sentimiento": "negativo",  "riesgo_pol": 78, "empleo_miles": 1450,  "descripcion": "Precios al alza, acceso restringido. Alta polarización política"},
        {"sector": "Energía",        "tendencia": +0.5, "sentimiento": "mixto",     "riesgo_pol": 62, "empleo_miles": 850,   "descripcion": "Transición energética en curso. Riesgo tarifas y dependencia exterior"},
        {"sector": "Turismo",        "tendencia": +3.1, "sentimiento": "positivo",  "riesgo_pol": 28, "empleo_miles": 2800,  "descripcion": "Récord de turistas. Debate sobre saturación y precios vivienda"},
        {"sector": "Industria",      "tendencia": -0.4, "sentimiento": "negativo",  "riesgo_pol": 55, "empleo_miles": 2850,  "descripcion": "Desindustrialización relativa. Riesgo: competencia asiática en EV"},
        {"sector": "Servicios",      "tendencia": +1.8, "sentimiento": "positivo",  "riesgo_pol": 32, "empleo_miles": 13500, "descripcion": "Motor principal. Crecimiento en digitalización y consultoría"},
        {"sector": "Exportaciones",  "tendencia": +2.2, "sentimiento": "positivo",  "riesgo_pol": 41, "empleo_miles": 980,   "descripcion": "Diversificación geográfica. Riesgo: proteccionismo UE vs. China"},
        {"sector": "Agricultura",    "tendencia": -1.1, "sentimiento": "negativo",  "riesgo_pol": 67, "empleo_miles": 780,   "descripcion": "Sequía y competencia desleal. Alta politización en CCAA rurales"},
    ]

    cols_sect = st.columns(4)
    for i, s in enumerate(SECTORES):
        c_idx = i % 4
        t_val = s["tendencia"]
        t_c = GREEN if t_val >= 1.5 else (AMBER if t_val >= 0 else RED)
        t_icon = "▲" if t_val >= 0 else "▼"
        sent_c = {"positivo": GREEN, "negativo": RED, "mixto": AMBER}.get(s["sentimiento"], MUTED)
        riesgo = s["riesgo_pol"]
        r_c = RED if riesgo >= 65 else (AMBER if riesgo >= 40 else GREEN)
        with cols_sect[c_idx]:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {t_c};'
                f'border-radius:10px;padding:.9rem;margin-bottom:.6rem">'
                f'<div style="font-size:.82rem;font-weight:800;color:{TEXT};margin-bottom:.4rem">{s["sector"]}</div>'
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem">'
                f'<span style="font-size:.72rem;color:{MUTED}">3M:</span>'
                f'<span style="font-size:.85rem;font-weight:700;color:{t_c};font-family:monospace">{t_icon}{abs(t_val):.1f}%</span>'
                f'</div>'
                f'<div style="display:flex;gap:.3rem;margin-bottom:.4rem;flex-wrap:wrap">'
                f'<span style="background:{sent_c}18;color:{sent_c};font-size:.58rem;font-weight:700;'
                f'padding:.1rem .4rem;border-radius:4px;border:1px solid {sent_c}33">{s["sentimiento"].upper()}</span>'
                f'<span style="background:{r_c}18;color:{r_c};font-size:.58rem;font-weight:700;'
                f'padding:.1rem .4rem;border-radius:4px;border:1px solid {r_c}33">RIESGO POL {riesgo}</span>'
                f'</div>'
                f'<div style="font-size:.65rem;color:{MUTED};line-height:1.4">{s["descripcion"]}</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Radar sectorial
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("RADAR DE RIESGO POLÍTICO SECTORIAL", RED)
    sectores_radar = [s["sector"] for s in SECTORES]
    riesgos_radar = [s["riesgo_pol"] for s in SECTORES]
    fig_radar = go.Figure()
    fig_radar.add_trace(go.Scatterpolar(
        r=riesgos_radar + [riesgos_radar[0]],
        theta=sectores_radar + [sectores_radar[0]],
        name="Riesgo político",
        line=dict(color=RED, width=2.5),
        fill="toself",
        fillcolor=hex_to_rgba(RED, 0.12),
        hovertemplate="<b>%{theta}</b><br>Riesgo: %{r}<extra></extra>",
    ))
    fig_radar.update_layout(
        polar=dict(
            bgcolor=BG2,
            radialaxis=dict(range=[0, 100], gridcolor=BORDER, tickfont=dict(color=MUTED, size=8)),
            angularaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2, size=9)),
        ),
        height=350, paper_bgcolor=BG2,
        margin=dict(t=20, b=20, l=20, r=20),
        showlegend=False,
    )
    st.plotly_chart(fig_radar, use_container_width=True)

    # Heatmap de importancia sectorial por CCAA (aproximación)
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("IMPORTANCIA SECTORIAL POR CCAA", PURPLE)
    CCAA = ["Cataluña", "Madrid", "Andalucía", "Com. Valenciana", "País Vasco", "Galicia", "Castilla y León"]
    SECT_SHORT = ["Turismo", "Industria", "Servicios", "Empleo", "Energía", "Agri.", "Vivienda"]
    np.random.seed(33)
    # Matriz de importancia relativa (0-100)
    importancia = np.array([
        [85, 70, 95, 80, 55, 30, 90],  # Cataluña
        [65, 55, 98, 75, 45, 20, 95],  # Madrid
        [90, 50, 78, 85, 60, 70, 75],  # Andalucía
        [95, 45, 72, 80, 65, 65, 70],  # Com. Valenciana
        [30, 90, 85, 70, 80, 50, 65],  # País Vasco
        [70, 60, 65, 75, 55, 80, 60],  # Galicia
        [40, 55, 55, 65, 50, 90, 50],  # Castilla y León
    ])
    fig_imp = go.Figure(go.Heatmap(
        z=importancia,
        x=SECT_SHORT,
        y=CCAA,
        colorscale=[[0, f"{BORDER}"], [0.5, f"{BLUE}"], [1.0, f"{CYAN}"]],
        zmin=0, zmax=100,
        text=importancia,
        texttemplate="%{text}",
        textfont=dict(size=9, color=TEXT),
        hovertemplate="<b>%{y}</b><br>%{x}: %{z}<extra></extra>",
        showscale=True,
        colorbar=dict(title=dict(text="Importancia", font=dict(color=TEXT2, size=9)), tickfont=dict(color=TEXT2, size=8)),
    ))
    fig_imp.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=300, margin=dict(t=20, b=20, l=120, r=80),
        xaxis=dict(tickfont=dict(color=TEXT2, size=10)),
        yaxis=dict(tickfont=dict(color=TEXT2, size=10)),
    )
    st.plotly_chart(fig_imp, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — NOWCASTING ECONÓMICO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_nowcast:
    section_header("NOWCASTING PIB — ESTIMACIÓN TRIMESTRE ACTUAL", GREEN)

    # Indicadores de alta frecuencia
    INDICADORES_HF = [
        {"ind": "Google Trends (economía ES)", "valor": 62.3, "peso": 0.15, "trend": +2.1},
        {"ind": "Consumo electricidad (TWh)",  "valor": 24.8, "peso": 0.20, "trend": +0.5},
        {"ind": "Tarjetas bancarias (YoY %)",  "valor": 4.2,  "peso": 0.25, "trend": -0.3},
        {"ind": "Matriculación vehículos (YoY)", "valor": 3.1, "peso": 0.15, "trend": +1.2},
        {"ind": "Exportaciones (YoY %)",       "valor": 2.8,  "peso": 0.15, "trend": +0.4},
        {"ind": "Afiliaciones SS (miles)",     "valor": 21.4, "peso": 0.10, "trend": +0.8},
    ]

    # Nowcast: media ponderada normalizada
    pesos = np.array([i["peso"] for i in INDICADORES_HF])
    vals_norm = np.array([i["trend"] for i in INDICADORES_HF])
    nowcast_pib = round(float(np.dot(pesos, vals_norm) / pesos.sum() + DEMO_MACRO["pib_yoy"] * 0.6), 2)
    nowcast_c = GREEN if nowcast_pib >= 1.5 else (AMBER if nowcast_pib >= 0 else RED)

    col_nc, col_fan = st.columns([1, 2])
    with col_nc:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:4px solid {nowcast_c};'
            f'border-radius:12px;padding:1.2rem;text-align:center;margin-bottom:.8rem">'
            f'<div style="font-size:.62rem;color:{MUTED};letter-spacing:.12em;text-transform:uppercase">NOWCAST PIB</div>'
            f'<div style="font-size:.65rem;color:{TEXT2}">2T 2026 (estimación)</div>'
            f'<div style="font-size:3.5rem;font-weight:900;color:{nowcast_c};font-family:monospace;line-height:1.1;margin:.4rem 0">'
            f'{nowcast_pib:+.2f}%'
            f'</div>'
            f'<div style="font-size:.7rem;color:{TEXT2}">Variación trimestral anualizada</div>'
            f'<div style="margin-top:.7rem">{confidence_badge(0.58)}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

        # Contribución de cada indicador
        for ind in INDICADORES_HF:
            t_c = GREEN if ind["trend"] >= 0 else RED
            t_icon = "▲" if ind["trend"] >= 0 else "▼"
            contrib = round(ind["peso"] * ind["trend"], 3)
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                f'<div style="flex:1">'
                f'<div style="font-size:.68rem;color:{TEXT2}">{ind["ind"]}</div>'
                f'<div style="background:{BORDER};border-radius:2px;height:4px;margin-top:.2rem">'
                f'<div style="background:{t_c};width:{abs(ind["trend"])/4*100:.0f}%;height:100%;border-radius:2px"></div>'
                f'</div>'
                f'</div>'
                f'<span style="font-size:.72rem;color:{t_c};font-weight:700;width:50px;text-align:right">{t_icon}{abs(ind["trend"]):.1f}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with col_fan:
        # Fan chart de nowcasting
        np.random.seed(88)
        trimestres = ["1T25", "2T25", "3T25", "4T25", "1T26", "2T26(E)", "3T26(P)", "4T26(P)"]
        central = [2.5, 2.3, 2.0, 1.9, 2.1, nowcast_pib, nowcast_pib + 0.1, nowcast_pib - 0.2]
        sigma = [0, 0, 0, 0, 0, 0.3, 0.6, 0.9]

        fig_fan = go.Figure()
        # Bandas de confianza
        for s_mult, alpha in [(2.0, 0.08), (1.5, 0.12), (1.0, 0.18)]:
            upper = [c + s * s_mult for c, s in zip(central, sigma)]
            lower = [c - s * s_mult for c, s in zip(central, sigma)]
            fig_fan.add_trace(go.Scatter(
                x=trimestres + trimestres[::-1],
                y=upper + lower[::-1],
                fill="toself",
                fillcolor=hex_to_rgba(GREEN, alpha),
                line=dict(color="rgba(0,0,0,0)"),
                showlegend=False,
                hoverinfo="skip",
            ))
        # Línea central
        fig_fan.add_trace(go.Scatter(
            x=trimestres, y=central,
            name="Estimación central",
            line=dict(color=GREEN, width=2.5),
            mode="lines+markers",
            marker=dict(size=7, color=[BG2] * 6 + [GREEN, GREEN], line=dict(color=GREEN, width=2)),
            hovertemplate="<b>%{x}</b><br>PIB: %{y:.2f}%<extra></extra>",
        ))
        # Separador histórico/proyección
        fig_fan.add_vline(x=5, line_dash="dash", line_color=MUTED, annotation_text="→ Proyección", annotation_font_color=MUTED, annotation_font_size=9)
        fig_fan.add_hline(y=0, line_color="rgba(239,68,68,0.333)", line_dash="dot")
        fig_fan.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
            height=340,
            title=dict(text="Nowcasting PIB — Fan chart con intervalos de confianza", font=dict(size=11, color=TEXT2), x=0.5),
            margin=dict(t=40, b=20, l=40, r=20),
            xaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2)),
            yaxis=dict(gridcolor=BORDER, tickfont=dict(color=TEXT2), title="PIB YoY (%)", ticksuffix="%"),
            showlegend=False,
        )
        st.plotly_chart(fig_fan, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — RIESGO ECONÓMICO-POLÍTICO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_riesgo:
    section_header("ITPE — ÍNDICE DE TENSIÓN POLÍTICO-ECONÓMICA", AMBER)

    col_itpe, col_dim = st.columns([1, 2])
    with col_itpe:
        fig_itpe = go.Figure(go.Indicator(
            mode="gauge+number+delta",
            value=DEMO_MACRO["itpe_economico"],
            number={"font": {"color": c_itpe, "size": 40}},
            delta={"reference": 50, "increasing": {"color": RED}, "decreasing": {"color": GREEN}},
            title={"text": "ITPE Económico", "font": {"size": 11, "color": TEXT2}},
            gauge={
                "axis": {"range": [0, 100], "tickcolor": MUTED, "tickfont": {"size": 9, "color": MUTED}},
                "bar": {"color": c_itpe, "thickness": 0.3},
                "steps": [
                    {"range": [0, 35],   "color": "rgba(16,185,129,0.12)"},
                    {"range": [35, 60],  "color": "rgba(245,158,11,0.10)"},
                    {"range": [60, 100], "color": "rgba(239,68,68,0.12)"},
                ],
                "threshold": {"line": {"color": RED, "width": 2}, "thickness": 0.8, "value": 75},
            },
        ))
        fig_itpe.update_layout(
            paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
            height=210, margin=dict(t=50, b=10, l=20, r=20),
        )
        st.plotly_chart(fig_itpe, use_container_width=True)

        # Dimensiones ITPE
        DIMS_ITPE = [
            {"dim": "Fiscal/Deuda",      "val": 72},
            {"dim": "Empleo",            "val": 48},
            {"dim": "Inflación",         "val": 55},
            {"dim": "Competitividad",    "val": 42},
            {"dim": "Riesgo soberano",   "val": 61},
            {"dim": "Confianza hogares", "val": 58},
        ]
        for d in DIMS_ITPE:
            d_c = RED if d["val"] >= 65 else (AMBER if d["val"] >= 45 else GREEN)
            st.markdown(
                f'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
                f'<span style="font-size:.7rem;color:{TEXT2};flex:1">{d["dim"]}</span>'
                f'<div style="width:80px;background:{BORDER};border-radius:3px;height:5px">'
                f'<div style="background:{d_c};width:{d["val"]}%;height:100%;border-radius:3px"></div>'
                f'</div>'
                f'<span style="font-size:.7rem;color:{d_c};font-family:monospace;width:30px;text-align:right">{d["val"]}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

    with col_dim:
        section_header("VECTORES DE RIESGO ECONÓMICO", RED)
        VECTORES = [
            {"riesgo": "Sostenibilidad de la deuda pública",         "prob": 35, "impacto_pol": 82, "desc": "Deuda/PIB >108% con tipos BCE al alza presiona a los socios de coalición en materia de austeridad"},
            {"riesgo": "Inflación estructural de servicios",          "prob": 48, "impacto_pol": 65, "desc": "IPC servicios >4% erosiona poder adquisitivo de clases medias, base electoral clave"},
            {"riesgo": "Desempleo juvenil persistente",               "prob": 62, "impacto_pol": 71, "desc": "Tasa paro 16-24 años >27% alimenta voto de protesta en SUMAR y partidos alternativos"},
            {"riesgo": "Crisis del mercado inmobiliario",             "prob": 71, "impacto_pol": 88, "desc": "Mayor riesgo electoral: acceso a vivienda es el issue #1 en encuestas de preocupación ciudadana"},
            {"riesgo": "Shocks energéticos externos (OPEP/Rusia)",   "prob": 28, "impacto_pol": 75, "desc": "Dependencia energética exterior: un shock puede reactivar inflación y desestabilizar el gobierno"},
            {"riesgo": "Fragmentación mercado laboral (dualidad)",    "prob": 55, "impacto_pol": 58, "desc": "Brecha creciente entre empleo fijo/temporal genera presión en negociación colectiva"},
        ]
        for v in VECTORES:
            prob_c = RED if v["prob"] >= 60 else (AMBER if v["prob"] >= 35 else GREEN)
            imp_c  = RED if v["impacto_pol"] >= 70 else (AMBER if v["impacto_pol"] >= 50 else GREEN)
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {prob_c};'
                f'border-radius:10px;padding:.85rem 1.1rem;margin-bottom:.5rem;'
                f'display:grid;grid-template-columns:2fr 70px 70px;align-items:start;gap:.8rem">'
                f'<div>'
                f'<div style="font-size:.78rem;font-weight:700;color:{TEXT};margin-bottom:.3rem">{v["riesgo"]}</div>'
                f'<div style="font-size:.7rem;color:{TEXT2}">{v["desc"]}</div>'
                f'</div>'
                f'<div style="text-align:center">'
                f'<div style="font-size:.58rem;color:{MUTED};letter-spacing:.06em">PROB.</div>'
                f'<div style="font-size:1.1rem;font-weight:900;color:{prob_c};font-family:monospace">{v["prob"]}%</div>'
                f'</div>'
                f'<div style="text-align:center">'
                f'<div style="font-size:.58rem;color:{MUTED};letter-spacing:.06em">IMP. POL.</div>'
                f'<div style="font-size:1.1rem;font-weight:900;color:{imp_c};font-family:monospace">{v["impacto_pol"]}</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

    # Matriz de correlación: indicadores económicos × outcomes políticos
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("CORRELACIÓN INDICADORES ECONÓMICOS × OUTCOMES POLÍTICOS", PURPLE)
    econ_vars = ["PIB YoY", "Paro", "IPC", "Prima riesgo", "Confianza"]
    pol_outcomes = ["Voto gobierno", "Aprobación P.M.", "Intención elecciones", "Voto oposición", "Abs. electoral"]
    np.random.seed(44)
    corr_mat = np.array([
        [ 0.68, -0.72, -0.55, -0.61,  0.12],  # PIB YoY
        [-0.61,  0.58,  0.48,  0.53, -0.28],  # Paro
        [-0.52,  0.44,  0.39,  0.41, -0.15],  # IPC
        [-0.58,  0.62,  0.51,  0.55, -0.18],  # Prima riesgo
        [ 0.72, -0.65, -0.58, -0.61,  0.22],  # Confianza
    ])
    fig_corr = go.Figure(go.Heatmap(
        z=corr_mat,
        x=pol_outcomes,
        y=econ_vars,
        colorscale=[[0, RED], [0.5, f"{BG3}"], [1.0, GREEN]],
        zmin=-1, zmax=1,
        text=np.round(corr_mat, 2),
        texttemplate="%{text}",
        textfont=dict(size=10, color=TEXT),
        hovertemplate="<b>%{y}</b> × <b>%{x}</b><br>Correlación: %{z:.2f}<extra></extra>",
        showscale=True,
        colorbar=dict(title=dict(text="ρ", font=dict(color=TEXT2, size=10)), tickfont=dict(color=TEXT2, size=8)),
    ))
    fig_corr.update_layout(
        paper_bgcolor=BG2, plot_bgcolor=BG2, font=dict(color=TEXT),
        height=280, margin=dict(t=20, b=20, l=110, r=80),
        xaxis=dict(tickfont=dict(color=TEXT2, size=9)),
        yaxis=dict(tickfont=dict(color=TEXT2, size=9)),
    )
    st.plotly_chart(fig_corr, use_container_width=True)

    # Riesgo BCE/UE — decisiones próximas
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("RIESGO BCE / UE — DECISIONES PRÓXIMAS", CYAN)
    BCE_RIESGOS = [
        {"evento": "Reunión BCE — revisión tipos",          "fecha": "Jun 2026", "tipo": "Monetario",   "impacto_esp": "Bajo-medio", "detalle": "Tipo esperado estable en 2.25%. Posible bajada si IPC consolida < 2.2%"},
        {"evento": "Revisión deuda/PIB España (Eurostat)",  "fecha": "Jul 2026", "tipo": "Fiscal",      "impacto_esp": "Medio",      "detalle": "Vigilancia bajo el Procedimiento de Déficit Excesivo activo"},
        {"evento": "Pacto de Estabilidad — actualización",  "fecha": "Sep 2026", "tipo": "Regulatorio", "impacto_esp": "Alto",       "detalle": "Nuevas reglas de ajuste fiscal afectan presupuesto 2027"},
        {"evento": "Fondos NextGenEU — evaluación tramos",  "fecha": "Oct 2026", "tipo": "Inversión",   "impacto_esp": "Alto",       "detalle": "España tiene pendiente desembolso de €12.500M condicionado a reformas"},
    ]
    for br in BCE_RIESGOS:
        imp_c = RED if br["impacto_esp"] == "Alto" else (AMBER if br["impacto_esp"] == "Medio" else GREEN)
        tipo_c = BLUE if br["tipo"] == "Monetario" else (GREEN if br["tipo"] == "Inversión" else PURPLE if br["tipo"] == "Regulatorio" else AMBER)
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {tipo_c};'
            f'border-radius:9px;padding:.75rem 1rem;margin-bottom:.4rem;'
            f'display:grid;grid-template-columns:2fr 90px 90px 3fr;align-items:center;gap:.8rem">'
            f'<div style="font-size:.78rem;font-weight:700;color:{TEXT}">{br["evento"]}</div>'
            f'<span style="background:{tipo_c}18;color:{tipo_c};font-size:.62rem;font-weight:700;'
            f'padding:.15rem .4rem;border-radius:4px;text-align:center">{br["tipo"]}</span>'
            f'<div style="text-align:center">'
            f'<div style="font-size:.62rem;color:{MUTED}">Impacto ES</div>'
            f'<div style="font-size:.8rem;font-weight:800;color:{imp_c}">{br["impacto_esp"]}</div>'
            f'<div style="font-size:.62rem;color:{MUTED}">{br["fecha"]}</div>'
            f'</div>'
            f'<div style="font-size:.7rem;color:{TEXT2}">{br["detalle"]}</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
