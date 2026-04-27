"""
ELECTSIM — Economía & Finanzas
Tabs: Indicadores Macro · OpenBB · ESG · Correlaciones Política-Economía
Integra: OpenBB, FinanceToolkit, statsforecast para proyecciones económicas
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
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS, kpi_card, section_header, safe_float,
)
import dashboard.db as _db

st.set_page_config(page_title="Economía — ElectSim", page_icon="📈", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("economia")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{GREEN},{CYAN});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">📈</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Economía & Finanzas</h2>
    <div style="color:{TEXT2};font-size:.82rem">Macro · OpenBB · ESG · Correlaciones</div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_macro, tab_openbb, tab_esg, tab_corr = st.tabs([
    "📊 Macro España",
    "💹 Mercados (OpenBB)",
    "🌿 ESG",
    "🔗 Correlaciones",
])

# ═══════════════════════════════════════════════════════════════════════════════
with tab_macro:
    try:
        from dashboard.components.macroeconomia import render_macroeconomia
        render_macroeconomia()
    except Exception:
        section_header("INDICADORES MACROECONÓMICOS ESPAÑA", GREEN)

        @st.cache_data(ttl=1800)
        def _cargar_macro():
            try:
                conn = _db.get_conn()
                return pd.read_sql(
                    "SELECT indicador, valor, variacion, fecha, fuente "
                    "FROM indicadores_macro ORDER BY fecha DESC LIMIT 50",
                    conn
                )
            except Exception:
                return pd.DataFrame()

        df_macro = _cargar_macro()

        # KPIs macroeconómicos
        _MACRO_DEMO = {
            "PIB (var. anual)": ("2.7%", "+0.3pp", GREEN),
            "IPC (inflación)": ("3.2%", "-0.1pp", AMBER),
            "Desempleo EPA": ("11.8%", "-0.4pp", GREEN),
            "Prima de riesgo": ("82pb", "+5pb", AMBER),
            "Deuda/PIB": ("109.5%", "-1.2pp", GREEN),
            "Saldo presupuestario": ("-3.5%", "+0.2pp", AMBER),
        }

        if df_macro.empty:
            st.caption("Datos demo — conecta la base de datos para datos reales del INE/BCE/Eurostat")
            cols_macro = st.columns(3)
            for i, (label, (val, delta, color)) in enumerate(_MACRO_DEMO.items()):
                with cols_macro[i % 3]:
                    st.markdown(kpi_card(label, val, delta, color=color), unsafe_allow_html=True)

            st.markdown("<br>", unsafe_allow_html=True)

            # Gráfico demo paro + PIB
            section_header("EVOLUCIÓN HISTÓRICA (DEMO)", CYAN)
            _dates = pd.date_range("2020-01", periods=20, freq="Q")
            _paro = [14.4, 15.3, 16.0, 16.1, 15.3, 14.7, 13.6, 13.0, 12.7, 12.4,
                     12.9, 13.2, 12.8, 12.5, 12.1, 11.8, 11.6, 11.9, 11.8, 11.8]
            _ipc = [0.3, 0.2, -0.3, 0.5, 0.5, 0.9, 2.1, 3.2, 5.8, 8.4,
                    7.6, 6.1, 5.7, 4.2, 3.8, 3.5, 3.3, 3.1, 3.2, 3.2]

            fig_macro = go.Figure()
            fig_macro.add_trace(go.Scatter(
                x=_dates, y=_paro, name="Desempleo EPA (%)",
                line=dict(color=RED, width=2.5), fill="tozeroy", fillcolor=f"{RED}0A",
                hovertemplate="Desempleo: %{y:.1f}%<extra></extra>",
            ))
            fig_macro.add_trace(go.Scatter(
                x=_dates, y=_ipc, name="IPC (inflación %)",
                line=dict(color=AMBER, width=2.5, dash="dash"),
                hovertemplate="IPC: %{y:.1f}%<extra></extra>",
                yaxis="y2",
            ))
            fig_macro.update_layout(
                height=300, paper_bgcolor=BG2, plot_bgcolor=BG2,
                margin=dict(t=10, b=10, l=10, r=60),
                xaxis=dict(color=TEXT2, gridcolor=BORDER),
                yaxis=dict(color=RED, gridcolor=BORDER, title="Desempleo %", side="left"),
                yaxis2=dict(color=AMBER, title="IPC %", overlaying="y", side="right"),
                legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25,
                            font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                hovermode="x unified",
            )
            st.plotly_chart(fig_macro, use_container_width=True, config={"displayModeBar": False})
        else:
            # Datos reales
            st.dataframe(df_macro, use_container_width=True, hide_index=True)

        st.page_link("pages/12_Macroeconomia.py", label="→ Macroeconomía completa (v1)")


with tab_openbb:
    section_header("MERCADOS FINANCIEROS — OPENBB", BLUE)

    try:
        from openbb import obb  # type: ignore
        _OBB_OK = True
    except ImportError:
        _OBB_OK = False

    if not _OBB_OK:
        st.info("OpenBB no disponible. Instala con: `pip install openbb`")
        # Demo IBEX-35
        section_header("IBEX-35 (DEMO)", CYAN)
        _dates = pd.date_range(end=pd.Timestamp.today(), periods=60, freq="B")
        np.random.seed(42)
        _ibex = np.cumsum(np.random.randn(60) * 100) + 10000
        _ibex_vol = np.abs(np.random.randn(60) * 80) + 20

        fig_ibex = go.Figure()
        fig_ibex.add_trace(go.Scatter(
            x=_dates, y=_ibex, name="IBEX-35",
            line=dict(color=CYAN, width=2),
            fill="tozeroy", fillcolor=f"{CYAN}0A",
        ))
        fig_ibex.update_layout(
            height=280, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2, gridcolor=BORDER, title="Puntos"),
            showlegend=False,
        )
        st.plotly_chart(fig_ibex, use_container_width=True, config={"displayModeBar": False})

        # Empresas IBEX con relevancia política
        section_header("EMPRESAS POLÍTICAMENTE RELEVANTES", PURPLE)
        _empresas = {
            "BBVA": ("Banca", "+2.3%", GREEN),
            "Santander": ("Banca", "-0.8%", RED),
            "Iberdrola": ("Energía", "+1.2%", GREEN),
            "Repsol": ("Energía", "-1.5%", RED),
            "Inditex": ("Retail", "+3.1%", GREEN),
            "Telefónica": ("Telecos", "+0.4%", GREEN),
            "Endesa": ("Energía", "-0.3%", RED),
            "Ferrovial": ("Infra.", "+1.8%", GREEN),
        }
        cols_emp = st.columns(4)
        for i, (empresa, (sector, var, color)) in enumerate(_empresas.items()):
            with cols_emp[i % 4]:
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                            padding:.7rem;text-align:center;margin-bottom:.4rem">
                  <div style="font-size:.8rem;font-weight:800;color:{TEXT}">{empresa}</div>
                  <div style="font-size:.65rem;color:{MUTED}">{sector}</div>
                  <div style="font-size:.9rem;font-weight:900;color:{color};font-family:monospace">{var}</div>
                </div>
                """, unsafe_allow_html=True)
    else:
        # OpenBB real
        try:
            ticker_input = st.text_input("Ticker bursátil", value="SAN", key="obb_ticker")
            if ticker_input:
                with st.spinner("Cargando datos..."):
                    hist = obb.equity.price.historical(ticker_input.upper())
                    df_obb = hist.to_dataframe() if hasattr(hist, "to_dataframe") else pd.DataFrame()
                    if not df_obb.empty:
                        close_col = next((c for c in ["close", "Close", "adj_close"] if c in df_obb.columns), None)
                        if close_col:
                            fig_obb = go.Figure(go.Scatter(
                                x=df_obb.index, y=df_obb[close_col],
                                line=dict(color=CYAN, width=2),
                                fill="tozeroy", fillcolor=f"{CYAN}0A",
                            ))
                            fig_obb.update_layout(
                                height=280, paper_bgcolor=BG2, plot_bgcolor=BG2,
                                margin=dict(t=10, b=10, l=10, r=10),
                                title=dict(text=ticker_input.upper(), font=dict(color=TEXT), x=0.5),
                            )
                            st.plotly_chart(fig_obb, use_container_width=True,
                                           config={"displayModeBar": False})
        except Exception as exc:
            st.error(f"Error OpenBB: {exc}")


with tab_esg:
    section_header("ANÁLISIS ESG — EMPRESAS Y POLÍTICA", GREEN)
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.5rem;margin-bottom:1rem">
      <div style="font-size:1rem;font-weight:700;color:{TEXT};margin-bottom:.5rem">
        🌿 Índice ESG y Política
      </div>
      <div style="font-size:.85rem;color:{TEXT2};line-height:1.6">
        Correlación entre políticas medioambientales de los partidos (Green New Deal, carbono neutro,
        energías renovables) y su impacto en el índice ESG de empresas del IBEX-35.
      </div>
    </div>
    """, unsafe_allow_html=True)

    # Demo ESG por partido
    _esg_scores = {
        "PP": {"E": 45, "S": 52, "G": 68, "Total": 55},
        "PSOE": {"E": 72, "S": 75, "G": 65, "Total": 71},
        "VOX": {"E": 22, "S": 35, "G": 58, "Total": 38},
        "SUMAR": {"E": 88, "S": 85, "G": 72, "Total": 82},
        "PNV": {"E": 68, "S": 70, "G": 75, "Total": 71},
    }

    categories = ["Medioambiente (E)", "Social (S)", "Gobernanza (G)"]
    fig_esg = go.Figure()
    for partido, scores in _esg_scores.items():
        color = COLORES_PARTIDOS.get(partido, "#555")
        fig_esg.add_trace(go.Scatterpolar(
            r=[scores["E"], scores["S"], scores["G"], scores["E"]],
            theta=categories + [categories[0]],
            name=partido,
            line=dict(color=color, width=2),
            fill="toself",
            fillcolor=f"{color}22",
        ))
    fig_esg.update_layout(
        polar=dict(
            bgcolor=BG2,
            radialaxis=dict(range=[0, 100], color=TEXT2, gridcolor=BORDER),
            angularaxis=dict(color=TEXT2),
        ),
        height=350, paper_bgcolor=BG2,
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.1,
                    font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        margin=dict(t=20, b=40),
    )
    st.plotly_chart(fig_esg, use_container_width=True, config={"displayModeBar": False})
    st.caption("Scores ESG de posiciones programáticas (demo). Basado en patrones de ESG-Scorecard-Dashboard.")


with tab_corr:
    section_header("CORRELACIONES POLÍTICA — ECONOMÍA", PURPLE)
    st.markdown(f"""
    <div style="font-size:.85rem;color:{TEXT2};margin-bottom:1rem">
      Análisis de correlación entre indicadores de intención de voto y variables macroeconómicas.
      Inspirado en CausalPy (PyMC-Labs) e Interrupted Time Series.
    </div>
    """, unsafe_allow_html=True)

    # Demo correlaciones
    np.random.seed(42)
    n = 40
    paro = 12 + np.random.randn(n) * 1.5
    voto_gov = 32 - 0.8 * (paro - 12) + np.random.randn(n) * 2

    fig_corr = go.Figure()
    fig_corr.add_trace(go.Scatter(
        x=paro, y=voto_gov,
        mode="markers",
        marker=dict(size=8, color=CYAN + "BB", line=dict(width=1, color=CYAN)),
        hovertemplate="Paro: %{x:.1f}%<br>Voto PSOE: %{y:.1f}%<extra></extra>",
        name="Observaciones",
    ))
    # Línea de regresión
    z = np.polyfit(paro, voto_gov, 1)
    p_line = np.poly1d(z)
    x_line = np.linspace(paro.min(), paro.max(), 50)
    fig_corr.add_trace(go.Scatter(
        x=x_line, y=p_line(x_line),
        mode="lines", name="Regresión OLS",
        line=dict(color=RED, width=2, dash="dash"),
    ))
    corr_coef = float(np.corrcoef(paro, voto_gov)[0, 1])
    fig_corr.update_layout(
        height=320,
        title=dict(text=f"Desempleo EPA vs. Voto partido en gobierno (ρ={corr_coef:.2f})",
                   font=dict(size=12, color=TEXT), x=0.5),
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        margin=dict(t=40, b=10, l=10, r=10),
        xaxis=dict(color=TEXT2, gridcolor=BORDER, title="Tasa de desempleo EPA (%)"),
        yaxis=dict(color=TEXT2, gridcolor=BORDER, title="Intención de voto (%)", ticksuffix="%"),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.2,
                    font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
    )
    st.plotly_chart(fig_corr, use_container_width=True, config={"displayModeBar": False})

    st.markdown(f"""
    <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                padding:.8rem;font-size:.72rem;color:{MUTED};margin-top:.5rem">
      <strong style="color:{TEXT2}">Próximamente:</strong> Análisis causal con CausalPy
      (DiD, Synthetic Control, Interrupted Time Series) para cuantificar el impacto
      real de eventos políticos en indicadores económicos.
    </div>
    """, unsafe_allow_html=True)
