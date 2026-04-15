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

import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import sidebar_nav

from dashboard.db import cargar_alertas, cargar_macro_serie, cargar_macro_ultimo, cargar_scraping_log

st.set_page_config(page_title="Tiempo Real — ElectSim", layout="wide")

sidebar_nav()
st.title("Tiempo Real")
st.markdown("Estado de scrapers, alertas del sistema y feed de indicadores económicos.")

with st.sidebar:
    st.header("Configuración")
    auto_refresh = st.checkbox("Auto-refresh (30s)", value=False)
    if auto_refresh:
        import time
        st.info("La página se recarga cada 30 segundos")
        time.sleep(30)
        st.rerun()

    solo_no_leidas = st.checkbox("Solo alertas no leidas", value=True)
    dias_macro = st.slider("Ventana macro (dias)", 30, 730, 180)

# ── Estado de scrapers ────────────────────────────────────────────────────────
col_scrapers, col_alertas = st.columns([1, 1])

with col_scrapers:
    st.subheader("Estado de Scrapers")
    df_log = cargar_scraping_log(30)

    if df_log.empty:
        st.info("Sin datos de scraping. Los scrapers estan en modo dry_run por defecto.")
        st.markdown("""
        Para activar scrapers reales:
        ```bash
        ELECTSIM_DRY_RUN=false python -m etl.realtime.cis_monitor
        python pipelines/realtime_scheduler.py --flow diario
        ```
        """)
    else:
        df_resumen = (
            df_log.groupby("fuente")
            .agg(
                ultimo_estado=("estado", "first"),
                n_nuevos_total=("n_registros_nuevos", "sum"),
                n_ejecuciones=("estado", "count"),
                ultimo_scrape=("created_at", "max"),
            )
            .reset_index()
        )

        for _, row in df_resumen.iterrows():
            status = "OK" if row["ultimo_estado"] == "ok" else "ERROR"
            color = "#27ae60" if row["ultimo_estado"] == "ok" else "#e74c3c"
            st.markdown(
                f'<span style="color:{color};font-weight:600">[{status}]</span> '
                f'**{row["fuente"]}** — {row["n_nuevos_total"]} registros · '
                f'{row["n_ejecuciones"]} ejecuciones · ultimo: {str(row["ultimo_scrape"])[:16]}',
                unsafe_allow_html=True,
            )

        st.subheader("Log detallado")
        cols_log = [c for c in ["fuente", "tipo", "estado", "n_registros_nuevos", "duracion_segundos", "created_at"] if c in df_log.columns]
        st.dataframe(df_log[cols_log].head(20), hide_index=True, use_container_width=True)

with col_alertas:
    st.subheader("Alertas del Sistema")
    df_alertas = cargar_alertas(solo_no_leidas)

    if df_alertas.empty:
        st.success("Sin alertas activas")
    else:
        for _, row in df_alertas.iterrows():
            sev = row.get("severidad", "INFO")
            border = {"CRITICAL": "#e74c3c", "WARNING": "#f39c12"}.get(sev, "#3498db")
            tipo_alerta = row.get("tipo", "")
            st.markdown(f"""
            <div style="border-left:4px solid {border};padding:0.5rem 1rem;
                        margin:0.3rem 0;background:#fafafa;border-radius:0 4px 4px 0">
                <strong>[{sev}]</strong> {row.get('titulo', '')}
                <br><small style="color:#666">{str(row.get('descripcion', ''))[:150]}</small>
                <br><small style="color:#999">{str(row.get('created_at', ''))[:16]} · {tipo_alerta}</small>
            </div>
            """, unsafe_allow_html=True)

st.divider()

# ── Indicadores macroeconómicos ───────────────────────────────────────────────
st.subheader("Indicadores Macroeconómicos")

df_macro_last = cargar_macro_ultimo()
if not df_macro_last.empty:
    indicadores_config = {
        "IPC General (%)": ("IPC Inflacion", "%", "ipc_general"),
        "Tasa de Paro (%)": ("Tasa de Paro", "%", "tasa_paro"),
        "Prima Riesgo (pb)": ("Prima de Riesgo", " pb", "prima_riesgo_bono10"),
        "Crec. PIB (%)": ("PIB YoY", "%", "crecimiento_pib"),
    }
    cols_kpi = st.columns(4)
    for i, (ind, (label, unidad, col_serie)) in enumerate(indicadores_config.items()):
        fila = df_macro_last[df_macro_last["indicador"] == ind]
        with cols_kpi[i]:
            if not fila.empty:
                val = float(fila.iloc[0]["valor"])
                fecha = str(fila.iloc[0].get("fecha", ""))[:10]
                st.metric(label, f"{val:.1f}{unidad}", help=f"Fecha: {fecha}")
            else:
                st.metric(label, "—")

# Series temporales
indicadores_disponibles = [
    ("ipc_general", "Inflacion IPC (%)"),
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
    colores = ["#C60B1E", "#1a5276", "#117a65", "#7d6608"]

    for i, ind in enumerate(ind_sel):
        label = dict(indicadores_disponibles).get(ind, ind)
        df_serie = cargar_macro_serie(ind, anios=dias_macro // 365 + 1)
        if not df_serie.empty:
            fig_macro.add_trace(go.Scatter(
                x=df_serie["fecha"],
                y=df_serie["valor"],
                name=label,
                mode="lines",
                line=dict(color=colores[i % len(colores)], width=2),
            ))

    if len(fig_macro.data) > 0:
        fig_macro.update_layout(
            height=400,
            xaxis_title="Fecha",
            yaxis_title="Valor",
            plot_bgcolor="white",
            paper_bgcolor="white",
            hovermode="x unified",
            legend=dict(orientation="h", y=-0.2),
            margin=dict(t=20, b=60),
        )
        st.plotly_chart(fig_macro, use_container_width=True)
    else:
        st.info("Sin series temporales macroeconómicas.")

st.divider()

# ── Monitor CIS ───────────────────────────────────────────────────────────────
st.subheader("Monitor CIS")
st.markdown("""
El monitor CIS detecta nuevas públicaciones de barometros y estudios preelectorales
y los ingesta automaticamente.
""")

df_cis_log = cargar_scraping_log(10)
if not df_cis_log.empty:
    df_cis = df_cis_log[df_cis_log["fuente"].str.contains("cis", case=False, na=False)]
    if not df_cis.empty:
        st.dataframe(
            df_cis[["estado", "n_registros_nuevos", "duracion_segundos", "created_at"]].head(5),
            hide_index=True,
        )
    else:
        st.info("El scraper CIS no ha ejecutado aun en modo live (dry_run activo)")
else:
    st.info("Sin logs de scraping")

st.divider()

# ── Noche electoral ───────────────────────────────────────────────────────────
st.subheader("Monitor Noche Electoral")
st.markdown("""
Activalo durante una noche electoral para seguir el escrutinio en tiempo real:
```bash
ELECTSIM_DRY_RUN=false python pipelines/realtime_scheduler.py --flow noche
```
Actualiza `resultados_electorales` incrementalmente conforme avanza el escrutinio
y lanza alertas si se producen vuelcos significativos en escanos.
""")
