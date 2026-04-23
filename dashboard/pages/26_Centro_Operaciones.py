from __future__ import annotations

import pandas as pd
import streamlit as st

from dashboard.shared import (
    AMBER,
    CYAN,
    GREEN,
    RED,
    kpi_card,
    section_header,
    sidebar_nav,
)
from dashboard.services.ops_center import (
    acciones_recomendadas,
    estado_datasets,
    health_api,
    resumen_fases,
)

st.set_page_config(page_title="Centro de Operaciones", layout="wide")
sidebar_nav()

section_header("Centro de Operaciones", color=CYAN)
st.caption(
    "Vista única de salud del producto por fases: ingesta, procesamiento, análisis y visualización."
)

if st.button("Actualizar estado", type="primary"):
    st.cache_data.clear()
    st.rerun()

df_estado = estado_datasets()
df_fases = resumen_fases(df_estado)
api = health_api()

if df_estado.empty:
    st.warning("No hay datos operativos disponibles. Revisa conexión DB y migraciones.")
    st.stop()

score_global = float(df_fases["score_pct"].mean()) if not df_fases.empty else 0.0
n_crit = int((df_estado["estado"] == "critical").sum())
n_warn = int((df_estado["estado"] == "warning").sum())
n_ok = int((df_estado["estado"] == "ok").sum())

c1, c2, c3, c4 = st.columns(4)
c1.markdown(kpi_card("Score global", f"{score_global:.1f}%", "salud operativa"), unsafe_allow_html=True)
c2.markdown(kpi_card("Datasets OK", str(n_ok), "en SLA", color=GREEN), unsafe_allow_html=True)
c3.markdown(kpi_card("Warnings", str(n_warn), "seguimiento", color=AMBER), unsafe_allow_html=True)
c4.markdown(kpi_card("Críticos", str(n_crit), "bloqueos", color=RED), unsafe_allow_html=True)

st.markdown("---")

section_header("API y fases", color=CYAN)
a1, a2 = st.columns([1, 2])
with a1:
    if api.get("ok"):
        st.success(f"API OK · {api.get('status_code')} · {api.get('latency_ms')} ms")
    else:
        st.error(
            f"API KO · {api.get('status_code') or 'sin respuesta'} · {api.get('latency_ms')} ms"
        )
        if api.get("error"):
            st.caption(str(api["error"]))

with a2:
    st.dataframe(
        df_fases[["fase", "score_pct", "datasets", "ok", "warning", "critical"]]
        .rename(
            columns={
                "fase": "Fase",
                "score_pct": "Score (%)",
                "datasets": "Datasets",
                "ok": "OK",
                "warning": "Warning",
                "critical": "Crítico",
            }
        ),
        use_container_width=True,
        hide_index=True,
    )

tab_ing, tab_proc, tab_ana, tab_vis = st.tabs(
    ["Ingesta", "Procesamiento", "Análisis", "Visualización"]
)

def _render_phase(phase: str):
    df = df_estado[df_estado["fase"] == phase].copy()
    if df.empty:
        st.info("Sin datasets configurados para esta fase.")
        return
    estado_icon = {"ok": "🟢", "warning": "🟡", "critical": "🔴"}
    df["Estado"] = df["estado"].map(lambda s: f"{estado_icon.get(s, '⚪')} {s}")
    show = df[
        ["Estado", "dataset", "tabla", "edad_horas", "sla_horas", "rows_24h", "rows_total", "detalle"]
    ].rename(
        columns={
            "dataset": "Dataset",
            "tabla": "Tabla",
            "edad_horas": "Edad (h)",
            "sla_horas": "SLA (h)",
            "rows_24h": "Rows 24h",
            "rows_total": "Rows total",
            "detalle": "Detalle",
        }
    )
    st.dataframe(show, use_container_width=True, hide_index=True)


with tab_ing:
    _render_phase("ingesta")
with tab_proc:
    _render_phase("procesamiento")
with tab_ana:
    _render_phase("analisis")
with tab_vis:
    _render_phase("visualizacion")

st.markdown("---")
section_header("Acciones recomendadas", color=CYAN)
for action in acciones_recomendadas(df_estado):
    st.markdown(f"- {action}")
