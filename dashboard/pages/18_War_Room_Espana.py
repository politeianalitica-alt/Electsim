from __future__ import annotations

import sys
from pathlib import Path

import plotly.express as px
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.db import (  # noqa: E402
    cargar_alertas,
    cargar_contradicciones,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_nowcasting,
    cargar_noticias_recientes,
    cargar_resultados_provinciales,
)
from dashboard.shared import sidebar_nav  # noqa: E402

st.set_page_config(page_title="War Room España", layout="wide")
sidebar_nav()

tabs_nav_18 = st.columns([1, 1, 1, 1, 4])
with tabs_nav_18[0]:
    st.page_link("pages/18_War_Room_Espana.py", label="War Room", icon="⚔")
with tabs_nav_18[1]:
    st.page_link("pages/21_Opposition_Research.py", label="Opposition", icon="🎯")
with tabs_nav_18[2]:
    st.page_link("pages/22_Coordinacion_Campana.py", label="Coordinación", icon="📋")
with tabs_nav_18[3]:
    st.page_link("pages/23_Memoria_Institucional.py", label="Memoria", icon="🧠")

st.title("War Room España Operativa")
st.caption("Centro de mando: señales críticas, riesgo territorial y acciones en 2h/24h/72h.")

col_a, col_b, col_c, col_d = st.columns(4)
df_alertas = cargar_alertas(solo_no_leidas=True, limit=100)
df_indices = cargar_indices_politeia()
df_macro = cargar_macro_ultimo()
df_now = cargar_nowcasting()
df_news = cargar_noticias_recientes(dias=2, limit=100)

with col_a:
    st.metric("Alertas activas", len(df_alertas))
with col_b:
    crit = len(df_alertas[df_alertas.get("severidad", "") == "CRITICAL"]) if not df_alertas.empty else 0
    st.metric("Alertas críticas", crit)
with col_c:
    st.metric("Noticias 48h", len(df_news))
with col_d:
    st.metric("Partidos en nowcast", df_now["partido_siglas"].nunique() if not df_now.empty and "partido_siglas" in df_now.columns else 0)

st.subheader("Semáforo nacional")
if df_indices.empty:
    st.info("Sin índices Politeia disponibles.")
else:
    st.dataframe(
        df_indices[["indice_codigo", "indice_nombre", "valor", "semaforo"]]
        if all(c in df_indices.columns for c in ["indice_codigo", "indice_nombre", "valor", "semaforo"])
        else df_indices.head(10),
        use_container_width=True,
        hide_index=True,
    )

st.subheader("Playbooks sugeridos")
playbooks = {
    "CRITICAL": "Activar célula de crisis, validar fuente, briefing en 15 min, simulación de contra-mensaje.",
    "WARNING": "Monitorizar evolución 2h, simular impacto territorial y preparar respuesta de portavoces.",
    "INFO": "Registrar evento, seguimiento pasivo y revisión en comité diario.",
}
if df_alertas.empty:
    st.success("Sin alertas no leídas.")
else:
    for _, row in df_alertas.head(8).iterrows():
        sev = str(row.get("severidad", "INFO")).upper()
        st.markdown(f"- **[{sev}] {row.get('titulo','')}**: {playbooks.get(sev, playbooks['INFO'])}")

left, right = st.columns(2)
with left:
    st.subheader("Radar macro")
    if not df_macro.empty and {"indicador", "valor"}.issubset(df_macro.columns):
        fig = px.bar(df_macro.head(8), x="indicador", y="valor", title="Últimos indicadores macro")
        fig.update_layout(height=320)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Sin datos macro cargados.")

with right:
    st.subheader("Pulso electoral")
    if not df_now.empty and {"partido_siglas", "estimacion_pct"}.issubset(df_now.columns):
        top = df_now.sort_values("estimacion_pct", ascending=False).head(8)
        fig = px.bar(top, x="partido_siglas", y="estimacion_pct", title="Nowcast - partidos líderes")
        fig.update_layout(height=320)
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Sin datos de nowcasting.")

st.subheader("Alerta de debate rápida")
df_cont_wr = cargar_contradicciones(limite=3)
if not df_cont_wr.empty:
    for _, row in df_cont_wr.iterrows():
        st.markdown(
            f"- **{row.get('persona','')}** ({row.get('partido','')}) · "
            f"{row.get('tema','')} · gravedad {row.get('gravedad','')} · "
            f"{str(row.get('descripcion',''))[:150]}..."
        )
else:
    st.info("No hay contradicciones registradas. Ejecuta Opposition Research para poblarlas.")

st.subheader("Matriz territorial rápida")
try:
    if not df_now.empty and "eleccion_id" in df_now.columns:
        eid = int(df_now["eleccion_id"].dropna().iloc[0])
        df_prov = cargar_resultados_provinciales(eid)
        st.dataframe(df_prov.head(25), use_container_width=True, hide_index=True)
    else:
        st.info("No hay elección activa para ver provincial.")
except Exception:
    st.info("No se pudo cargar la matriz territorial aún.")
