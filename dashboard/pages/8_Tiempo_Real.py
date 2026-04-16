"""
Página: Tiempo Real

Monitor de scrapers, alertas del sistema e indicadores macroeconómicos.
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
    MUTED,
    GREEN,
    AMBER,
    RED,
)
from dashboard.components import inject_base_css, section_header, alert_card
from dashboard.db import (
    cargar_alertas,
    cargar_macro_serie,
    cargar_macro_ultimo,
    cargar_scraping_log,
    cargar_nowcasting,
)

st.set_page_config(page_title="Tiempo Real — ElectSim", layout="wide")
sidebar_nav()
inject_base_css()

with st.sidebar:
    st.header("Configuración")
    auto_refresh = st.checkbox("Auto-refresh (30s)", value=False)
    solo_no_leidas = st.checkbox("Solo alertas no leidas", value=True)
    dias_macro = st.slider("Ventana macro (dias)", 30, 730, 180)

if auto_refresh:
    st.markdown(
        """
        <script>
        setTimeout(function(){ window.location.reload(); }, 30000);
        </script>
        """,
        unsafe_allow_html=True,
    )

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:1rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{CYAN}">EN VIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Monitor <span style="color:{CYAN}">Tiempo Real</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Estado de scrapers, alertas del sistema y feed de indicadores económicos
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

df_alertas = cargar_alertas(solo_no_leidas, limit=200)
df_log = cargar_scraping_log(150)
df_macro_last = cargar_macro_ultimo()
df_nc = cargar_nowcasting()

# KPIs globales
section_header("KPIs Globales del Sistema")
k1, k2, k3, k4 = st.columns(4)
with k1:
    crit = int((df_alertas.get("severidad", pd.Series(dtype=str)).astype(str) == "CRITICAL").sum()) if not df_alertas.empty else 0
    st.metric("Alertas críticas abiertas", crit)
with k2:
    if not df_log.empty and "duracion_segundos" in df_log.columns:
        lat = pd.to_numeric(df_log["duracion_segundos"], errors="coerce").dropna().head(30)
        st.metric("Latencia media ETL", f"{lat.mean():.1f}s" if not lat.empty else "—")
    else:
        st.metric("Latencia media ETL", "—")
with k3:
    if not df_log.empty and "created_at" in df_log.columns:
        ult = pd.to_datetime(df_log["created_at"], errors="coerce").max()
        st.metric("Última actividad pipeline", str(ult)[:16] if pd.notna(ult) else "—")
    else:
        st.metric("Última actividad pipeline", "—")
with k4:
    lider = "N/D"
    if not df_nc.empty and "estimacion_pct" in df_nc.columns:
        top = df_nc.sort_values("estimacion_pct", ascending=False).head(1)
        if not top.empty:
            lider = str(top.iloc[0].get("partido_siglas", "N/D"))
    st.metric("Líder nowcasting", lider)

col_scrapers, col_alertas = st.columns([1, 1])

with col_scrapers:
    section_header("Estado de Scrapers")
    if df_log.empty:
        st.info("Sin datos de scraping. Los scrapers están en modo dry_run por defecto.")
        st.code(
            "ELECTSIM_DRY_RUN=false python -m etl.realtime.cis_monitor\n"
            "python pipelines/realtime_scheduler.py --flow diario"
        )
    else:
        df_resumen = (
            df_log.groupby("fuente", dropna=False)
            .agg(
                ultimo_estado=("estado", "first"),
                n_nuevos_total=("n_registros_nuevos", "sum"),
                n_ejecuciones=("estado", "count"),
                ultimo_scrape=("created_at", "max"),
            )
            .reset_index()
            .sort_values("ultimo_scrape", ascending=False)
        )
        for _, row in df_resumen.iterrows():
            ok = str(row["ultimo_estado"]).lower() == "ok"
            color = GREEN if ok else RED
            status = "OK" if ok else "ERROR"
            st.markdown(
                f"<div class='data-card' style='border-left:3px solid {color};margin-bottom:.35rem'>"
                f"<span style='color:{color};font-weight:700'>[{status}]</span> "
                f"<strong style='color:{TEXT}'>{row['fuente']}</strong><br>"
                f"<small style='color:{TEXT2}'>{int(row['n_nuevos_total'] or 0)} registros · "
                f"{int(row['n_ejecuciones'] or 0)} ejecuciones · último: {str(row['ultimo_scrape'])[:16]}</small>"
                f"</div>",
                unsafe_allow_html=True,
            )

        section_header("Log detallado")
        cols_log = [
            c
            for c in [
                "fuente",
                "tipo",
                "estado",
                "n_registros_nuevos",
                "duracion_segundos",
                "created_at",
            ]
            if c in df_log.columns
        ]
        st.dataframe(df_log[cols_log].head(20), hide_index=True, use_container_width=True)

with col_alertas:
    section_header("Alertas del Sistema")
    if df_alertas.empty:
        st.success("Sin alertas activas")
    else:
        for _, row in df_alertas.head(20).iterrows():
            alert_card(
                str(row.get("severidad", "INFO")),
                str(row.get("titulo", "")),
                str(row.get("descripcion", ""))[:180],
                f"{str(row.get('created_at', ''))[:16]} · {str(row.get('tipo', ''))}",
            )

section_header("Distribución temporal de alertas")
if not df_alertas.empty and "created_at" in df_alertas.columns:
    dt = pd.to_datetime(df_alertas["created_at"], errors="coerce")
    tmp = df_alertas.copy()
    tmp["hora"] = dt.dt.floor("h")
    tmp["sev"] = tmp.get("severidad", "INFO").astype(str)
    df_count = tmp.dropna(subset=["hora"]).groupby(["hora", "sev"]).size().reset_index(name="n")

    fig_alert_tl = go.Figure()
    sev_cfg = [("CRITICAL", RED), ("WARNING", AMBER), ("INFO", BLUE)]
    for sev, color in sev_cfg:
        d = df_count[df_count["sev"] == sev]
        if not d.empty:
            fig_alert_tl.add_trace(go.Bar(x=d["hora"], y=d["n"], name=sev, marker_color=color))

    fig_alert_tl.update_layout(
        barmode="stack",
        height=260,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        xaxis_title="Hora",
        yaxis_title="Nº alertas",
        font=dict(color=TEXT2),
        legend=dict(orientation="h", y=-0.2),
        margin=dict(t=10, b=30),
    )
    st.plotly_chart(fig_alert_tl, use_container_width=True)
else:
    st.info("Sin datos temporales de alertas.")

section_header("Indicadores Macroeconómicos")
if not df_macro_last.empty:
    indicadores_config = {
        "IPC General (%)": ("IPC Inflación", "%"),
        "Tasa de Paro (%)": ("Tasa de Paro", "%"),
        "Prima Riesgo (pb)": ("Prima de Riesgo", " pb"),
        "Crec. PIB (%)": ("PIB YoY", "%"),
    }
    cols_kpi = st.columns(4)
    for i, (ind, (label, unidad)) in enumerate(indicadores_config.items()):
        fila = df_macro_last[df_macro_last["indicador"] == ind]
        with cols_kpi[i]:
            if not fila.empty:
                val = float(fila.iloc[0]["valor"])
                fecha = str(fila.iloc[0].get("fecha", ""))[:10]
                st.metric(label, f"{val:.1f}{unidad}", help=f"Fecha: {fecha}")
            else:
                st.metric(label, "—")

indicadores_disponibles = [
    ("ipc_general", "Inflación IPC (%)"),
    ("tasa_paro", "Tasa de Paro (%)"),
    ("prima_riesgo_bono10", "Prima de Riesgo (pb)"),
    ("crecimiento_pib", "PIB YoY (%)"),
]

ind_sel = st.multiselect(
    "Indicadores a mostrar",
    [k for k, _ in indicadores_disponibles],
    default=["ipc_general", "tasa_paro"],
    format_func=lambda x: dict(indicadores_disponibles).get(x, x),
)

if ind_sel:
    fig_macro = go.Figure()
    colores = [CYAN, BLUE, GREEN, AMBER]

    for i, ind in enumerate(ind_sel):
        label = dict(indicadores_disponibles).get(ind, ind)
        df_serie = cargar_macro_serie(ind, anios=dias_macro // 365 + 1)
        if not df_serie.empty:
            fig_macro.add_trace(
                go.Scatter(
                    x=df_serie["fecha"],
                    y=df_serie["valor"],
                    name=label,
                    mode="lines",
                    line=dict(color=colores[i % len(colores)], width=2),
                )
            )

    if fig_macro.data:
        fig_macro.update_layout(
            height=400,
            xaxis_title="Fecha",
            yaxis_title="Valor",
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            hovermode="x unified",
            legend=dict(orientation="h", y=-0.2, font=dict(color=TEXT2)),
            margin=dict(t=20, b=60),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_macro, use_container_width=True)
    else:
        st.info("Sin series temporales macroeconómicas.")

section_header("Monitor CIS")
df_cis = pd.DataFrame()
if not df_log.empty and "fuente" in df_log.columns:
    df_cis = df_log[df_log["fuente"].astype(str).str.contains("cis", case=False, na=False)]

if not df_cis.empty:
    st.dataframe(
        df_cis[["estado", "n_registros_nuevos", "duracion_segundos", "created_at"]].head(8),
        hide_index=True,
        use_container_width=True,
    )
else:
    st.info("El scraper CIS no ha ejecutado aún en modo live (o no hay logs).")

section_header("Monitor Noche Electoral")
st.code("ELECTSIM_DRY_RUN=false python pipelines/realtime_scheduler.py --flow noche")
st.caption(
    "Actualiza `resultados_electorales` incrementalmente conforme avanza el escrutinio "
    "y lanza alertas si se producen vuelcos significativos en escaños."
)
