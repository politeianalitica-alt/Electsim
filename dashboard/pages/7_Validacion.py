"""
Página: Validación del Sistema.

Muestra métricas de backtesting, calibración de agentes,
calidad de datos y evolución temporal de rendimiento.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    BG2,
    BG3,
    BORDER,
    CYAN,
    BLUE,
    TEXT,
    TEXT2,
    GREEN,
    AMBER,
    RED,
    MUTED,
)
from dashboard.components import inject_base_css, section_header

try:
    from dashboard.db import cargar_historial_validacion, cargar_validacion_por_partido
except ImportError:
    import pandas as _pd

    def cargar_historial_validacion() -> "_pd.DataFrame":  # type: ignore[return]
        return _pd.DataFrame()

    def cargar_validacion_por_partido(run_id: str) -> "_pd.DataFrame":  # type: ignore[return]
        return _pd.DataFrame()


st.set_page_config(page_title="Validación — ElectSim", layout="wide")
sidebar_nav()
inject_base_css()

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{BLUE}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{GREEN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{GREEN}">SISTEMA VALIDADO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Validación del <span style="color:{CYAN}">Sistema</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Precisión histórica, calibración y control de calidad de datos
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Historial
df_hist = cargar_historial_validacion()
if df_hist.empty or "tipo" not in df_hist.columns:
    st.info("Sin resultados de validación. Ejecuta la fase de validación para poblar métricas.")
    st.stop()

# Filtros contextuales (se aplican sólo si existen columnas en BD)
with st.sidebar:
    st.subheader("Filtros de validación")
    modelo_opts = ["Todos"] + sorted(df_hist["modelo"].dropna().astype(str).unique().tolist()) if "modelo" in df_hist.columns else ["Todos"]
    modelo_sel = st.selectbox("Modelo", modelo_opts)

    tipo_eleccion_opts = ["Todas"]
    if "tipo_eleccion" in df_hist.columns:
        tipo_eleccion_opts += sorted(df_hist["tipo_eleccion"].dropna().astype(str).unique().tolist())
    tipo_eleccion_sel = st.selectbox("Tipo de elección", tipo_eleccion_opts)

    ambito_opts = ["Todos"]
    if "ambito" in df_hist.columns:
        ambito_opts += sorted(df_hist["ambito"].dropna().astype(str).unique().tolist())
    ambito_sel = st.selectbox("Ámbito", ambito_opts)

if modelo_sel != "Todos" and "modelo" in df_hist.columns:
    df_hist = df_hist[df_hist["modelo"].astype(str) == modelo_sel]
if tipo_eleccion_sel != "Todas" and "tipo_eleccion" in df_hist.columns:
    df_hist = df_hist[df_hist["tipo_eleccion"].astype(str) == tipo_eleccion_sel]
if ambito_sel != "Todos" and "ambito" in df_hist.columns:
    df_hist = df_hist[df_hist["ambito"].astype(str) == ambito_sel]

if df_hist.empty:
    st.warning("No hay datos con la combinación de filtros actual.")
    st.stop()

ultimo_bt = df_hist[df_hist["tipo"].astype(str) == "backtesting"].head(1)
ultimo_cal = df_hist[df_hist["tipo"].astype(str) == "calibracion"].head(1)
ultimo_qc = df_hist[df_hist["tipo"].astype(str) == "calidad"].head(1)

# KPIs
section_header("Última Ejecución de Validación")
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("brier_score")):
        bs = float(ultimo_bt.iloc[0]["brier_score"])
        st.metric("Brier Score", f"{bs:.4f}", help="0 = perfecto. Recomendable < 0.10")
    else:
        st.metric("Brier Score", "—")

with col2:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("rmse_voto")):
        rmse = float(ultimo_bt.iloc[0]["rmse_voto"])
        st.metric("RMSE Voto", f"{rmse*100:.2f} pp")
    else:
        st.metric("RMSE Voto", "—")

with col3:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("mae_escanos")):
        mae_esc = float(ultimo_bt.iloc[0]["mae_escanos"])
        st.metric("MAE Escaños", f"{mae_esc:.1f}")
    else:
        st.metric("MAE Escaños", "—")

with col4:
    if not ultimo_qc.empty and pd.notna(ultimo_qc.iloc[0].get("pct_completitud")):
        pct = float(ultimo_qc.iloc[0]["pct_completitud"])
        delta_color = "normal" if pct >= 90 else "off" if pct >= 70 else "inverse"
        st.metric("Calidad de datos", f"{pct:.1f}%", delta_color=delta_color)
    else:
        st.metric("Calidad de datos", "—")

with col5:
    if not ultimo_bt.empty and pd.notna(ultimo_bt.iloc[0].get("cobertura_95ci")):
        cob = float(ultimo_bt.iloc[0]["cobertura_95ci"])
        st.metric("Cobertura IC95", f"{cob*100:.1f}%", help="Objetivo aproximado: 95%")
    else:
        st.metric("Cobertura IC95", "—")

tab1, tab2, tab3, tab4 = st.tabs(["Backtesting", "Calibración Agentes", "Calidad de Datos", "Calibración y Sesgo"])

with tab1:
    df_bt = df_hist[df_hist["tipo"].astype(str) == "backtesting"].copy()
    if df_bt.empty:
        st.info("Sin resultados de backtesting")
    else:
        if len(df_bt) > 1:
            section_header("Evolución del Brier Score")
            fig_ev = go.Figure()
            fig_ev.add_trace(
                go.Scatter(
                    x=df_bt["created_at"],
                    y=df_bt["brier_score"],
                    mode="lines+markers",
                    name="Brier Score",
                    line=dict(color=RED, width=2),
                )
            )
            fig_ev.update_layout(
                height=300,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                xaxis_title="Fecha",
                yaxis_title="Brier Score",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_ev, use_container_width=True)

        section_header("Error por Partido (última ejecución)")
        run_id_last = str(df_bt.iloc[0]["run_id"])
        df_part = cargar_validacion_por_partido(run_id_last)

        if not df_part.empty:
            err_abs = pd.to_numeric(df_part["error_pct"], errors="coerce").abs().fillna(0.0)
            fig_part = go.Figure(
                go.Bar(
                    x=df_part["partido_siglas"],
                    y=err_abs,
                    marker_color=err_abs.apply(lambda x: GREEN if x < 2 else AMBER if x < 5 else RED),
                    text=pd.to_numeric(df_part["error_pct"], errors="coerce").fillna(0.0).round(2).astype(str) + " pp",
                    textposition="outside",
                )
            )
            fig_part.update_layout(
                xaxis_title="Partido",
                yaxis_title="Error absoluto (pp)",
                height=360,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_part, use_container_width=True)

            section_header("Detalle real vs predicho")
            cols_show = [
                c
                for c in [
                    "partido_siglas",
                    "voto_real_pct",
                    "voto_pred_pct",
                    "error_pct",
                    "escanos_reales",
                    "escanos_pred_mediana",
                    "escanos_pred_p5",
                    "escanos_pred_p95",
                ]
                if c in df_part.columns
            ]
            st.dataframe(
                df_part[cols_show].rename(
                    columns={
                        "partido_siglas": "Partido",
                        "voto_real_pct": "Voto Real (%)",
                        "voto_pred_pct": "Voto Pred. (%)",
                        "error_pct": "Error (pp)",
                        "escanos_reales": "Esc. Real",
                        "escanos_pred_mediana": "Esc. Pred.",
                        "escanos_pred_p5": "Esc. P5",
                        "escanos_pred_p95": "Esc. P95",
                    }
                ).round(2),
                hide_index=True,
                use_container_width=True,
            )

with tab2:
    df_cal = df_hist[df_hist["tipo"].astype(str) == "calibracion"].copy()
    if df_cal.empty:
        st.info("Sin resultados de calibración de agentes")
    else:
        for _, row in df_cal.head(10).iterrows():
            n_ok = row.get("n_checks_ok")
            n_fail = row.get("n_checks_fail")
            calibrado = n_fail is not None and int(n_fail) == 0
            estado = "Calibrado" if calibrado else "Descalibrado"
            with st.expander(f"{estado} — {row['created_at']}"):
                c1, c2, c3 = st.columns(3)
                with c1:
                    st.metric("Checks OK", int(n_ok) if n_ok is not None else "—")
                with c2:
                    st.metric("Checks Fail", int(n_fail) if n_fail is not None else "—")
                with c3:
                    st.metric("Modelo", row.get("modelo", "—"))

with tab3:
    df_qc = df_hist[df_hist["tipo"].astype(str) == "calidad"].copy()
    if df_qc.empty:
        st.info("Sin resultados de calidad de datos")
    else:
        if len(df_qc) > 1:
            section_header("Evolución de checks OK")
            fig_qc = go.Figure()
            fig_qc.add_trace(
                go.Scatter(
                    x=df_qc["created_at"],
                    y=pd.to_numeric(df_qc["pct_completitud"], errors="coerce"),
                    mode="lines+markers",
                    name="% Checks OK",
                    fill="tozeroy",
                    fillcolor="rgba(39, 174, 96, 0.15)",
                    line=dict(color=GREEN),
                )
            )
            fig_qc.add_hline(y=90, line_dash="dash", line_color=GREEN, annotation_text="Objetivo 90%")
            fig_qc.add_hline(y=70, line_dash="dash", line_color=AMBER, annotation_text="Mínimo 70%")
            fig_qc.update_layout(
                height=300,
                plot_bgcolor="rgba(0,0,0,0)",
                paper_bgcolor="rgba(0,0,0,0)",
                xaxis_title="Fecha",
                yaxis_title="% Checks OK",
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_qc, use_container_width=True)

        ultimo_qc_row = df_qc.iloc[0]
        c1, c2 = st.columns(2)
        with c1:
            st.metric("% Checks OK", f"{float(ultimo_qc_row['pct_completitud']):.1f}%")
        with c2:
            n_ok = int(ultimo_qc_row.get("n_checks_ok") or 0)
            n_fail = int(ultimo_qc_row.get("n_checks_fail") or 0)
            st.metric("Checks OK / Fail", f"{n_ok} / {n_fail}")

with tab4:
    section_header("Predicción vs Real por partido")
    df_bt = df_hist[df_hist["tipo"].astype(str) == "backtesting"].copy()
    if df_bt.empty:
        st.info("Sin backtesting para análisis de sesgo")
    else:
        run_id_last = str(df_bt.iloc[0]["run_id"])
        df_part = cargar_validacion_por_partido(run_id_last)
        if df_part.empty:
            st.info("Sin detalle por partido en esta ejecución.")
        else:
            df_plot = df_part.copy()
            df_plot["voto_real_pct"] = pd.to_numeric(df_plot["voto_real_pct"], errors="coerce")
            df_plot["voto_pred_pct"] = pd.to_numeric(df_plot["voto_pred_pct"], errors="coerce")
            df_plot = df_plot.dropna(subset=["voto_real_pct", "voto_pred_pct"])
            if df_plot.empty:
                st.info("Sin datos numéricos válidos para calibración.")
            else:
                fig_cal = go.Figure()
                fig_cal.add_trace(
                    go.Scatter(
                        x=df_plot["voto_pred_pct"],
                        y=df_plot["voto_real_pct"],
                        mode="markers+text",
                        text=df_plot["partido_siglas"],
                        textposition="top center",
                        marker=dict(size=10, color=CYAN),
                        name="Partidos",
                    )
                )
                m = max(df_plot["voto_pred_pct"].max(), df_plot["voto_real_pct"].max(), 1)
                fig_cal.add_trace(
                    go.Scatter(
                        x=[0, m],
                        y=[0, m],
                        mode="lines",
                        line=dict(color=MUTED, dash="dash"),
                        name="Perfecto",
                    )
                )
                fig_cal.update_layout(
                    height=340,
                    plot_bgcolor="rgba(0,0,0,0)",
                    paper_bgcolor="rgba(0,0,0,0)",
                    xaxis_title="Voto predicho (%)",
                    yaxis_title="Voto real (%)",
                    font=dict(color=TEXT2),
                    legend=dict(orientation="h", y=-0.2),
                )
                st.plotly_chart(fig_cal, use_container_width=True)

                sesgo = (df_plot["voto_pred_pct"] - df_plot["voto_real_pct"]).mean()
                st.metric("Sesgo medio (pred - real)", f"{sesgo:+.2f} pp")
