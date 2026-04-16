"""Briefing diario automático para decisores."""

from __future__ import annotations

import sys
from pathlib import Path
from datetime import date

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import streamlit as st

from dashboard.shared import sidebar_nav, CYAN, BORDER, BG2, BG3, TEXT, TEXT2
from dashboard.components import inject_base_css, section_header
from dashboard.db import (
    cargar_alertas,
    cargar_agenda_hoy,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_noticias_recientes,
    cargar_nowcasting,
)
from dashboard.services.briefing import (
    top_party,
    macro_value,
    select_critical_news_diversified,
    suggested_actions,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

st.set_page_config(page_title="Briefing Diario — ElectSim", layout="wide")
sidebar_nav()
inject_base_css()

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:1.4rem 1.8rem;margin-bottom:1rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="font-size:1.55rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Briefing <span style="color:{CYAN}">Diario</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.35rem">
            Resumen automático de situación política, institucional, mediática y de riesgo.
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

audiencia = st.selectbox(
    "Audiencia objetivo",
    ["Dirección política", "Comunicación", "Equipo técnico"],
)

# Inputs base
with st.spinner("Cargando datos de briefing..."):
    df_nc = cargar_nowcasting()
    df_macro = cargar_macro_ultimo()
    df_indices = cargar_indices_politeia()
    df_alert = cargar_alertas(solo_no_leidas=True, limit=20)
    df_news = cargar_noticias_recientes(dias=2, limit=80)
    df_agenda = cargar_agenda_hoy()
    try:
        agenda_oficial = pd.DataFrame(fetch_all_agendas(max_items_per_source=8))
    except Exception:
        agenda_oficial = pd.DataFrame()

col1, col2, col3, col4 = st.columns(4)
col1.metric("Partido líder nowcasting", top_party(df_nc))
col2.metric("Alertas activas", len(df_alert) if not df_alert.empty else 0)
col3.metric("Noticias analizadas (48h)", len(df_news) if not df_news.empty else 0)
col4.metric("Eventos oficiales detectados", len(agenda_oficial) if not agenda_oficial.empty else 0)

# Resumen ejecutivo
briefing_lines: list[str] = []
briefing_lines.append(f"- Pulso electoral: liderazgo estimado para {top_party(df_nc)} en nowcasting.")
briefing_lines.append(
    "- Macro clave: "
    f"IPC {macro_value(df_macro, 'IPC General (%)')}%, "
    f"paro {macro_value(df_macro, 'Tasa de Paro (%)')}%, "
    f"prima {macro_value(df_macro, 'Prima Riesgo (pb)')} pb."
)
if not df_indices.empty:
    top_risk = df_indices.sort_values("valor", ascending=False).head(3)[["indice_codigo", "valor"]]
    riesgos_txt = ", ".join([f"{r['indice_codigo']}={float(r['valor']):.1f}" for _, r in top_risk.iterrows()])
    briefing_lines.append(f"- Índices Politeia: focos prioritarios {riesgos_txt}.")
if not df_alert.empty:
    alerts_txt = "; ".join(df_alert["titulo"].astype(str).head(3).tolist())
    briefing_lines.append(f"- Alertas de sistema: {alerts_txt}.")
if not df_agenda.empty:
    agenda_txt = ", ".join(df_agenda["tema"].astype(str).head(4).tolist())
    briefing_lines.append(f"- Agenda mediática: {agenda_txt}.")

section_header("Resumen Ejecutivo")
st.markdown("\n".join(briefing_lines))

section_header(f"Acciones sugeridas · {audiencia}")
actions = suggested_actions(audiencia)
for a in actions:
    st.markdown(f"- {a}")

# Export markdown
brief_md = [
    f"# Briefing Diario ElectSim ({date.today().isoformat()})",
    f"**Audiencia:** {audiencia}",
    "",
    "## Resumen Ejecutivo",
]
brief_md.extend(briefing_lines)
brief_md.append("")
brief_md.append("## Acciones sugeridas")
brief_md.extend([f"- {a}" for a in actions])

if not df_alert.empty:
    brief_md.append("")
    brief_md.append("## Alertas críticas")
    for _, r in df_alert.head(5).iterrows():
        brief_md.append(
            f"- [{str(r.get('severidad', 'INFO'))}] {str(r.get('titulo', ''))}: {str(r.get('descripcion', ''))[:180]}"
        )

if not df_news.empty:
    df_news_div = select_critical_news_diversified(df_news, max_total=12, max_per_source=2)
    brief_md.append("")
    brief_md.append("## Noticias críticas")
    for _, r in df_news_div.head(8).iterrows():
        brief_md.append(f"- {str(r.get('titular', ''))} ({str(r.get('fuente', ''))})")

st.download_button(
    "Descargar briefing (.md)",
    data=("\n".join(brief_md)).encode("utf-8"),
    file_name=f"briefing_electsim_{date.today().isoformat()}.md",
    mime="text/markdown",
)

# Tabs
tab1, tab2, tab3 = st.tabs(["Agenda Oficial", "Alertas", "Noticias críticas"])

with tab1:
    section_header("Agenda Oficial")
    if agenda_oficial.empty:
        st.info("No se ha podido cargar agenda oficial en tiempo real.")
    else:
        cols = [c for c in ["fuente", "actor", "fecha", "titulo", "url"] if c in agenda_oficial.columns]
        st.dataframe(agenda_oficial[cols], hide_index=True, use_container_width=True)

with tab2:
    section_header("Alertas")
    if df_alert.empty:
        st.success("Sin alertas activas.")
    else:
        cols = [c for c in ["severidad", "tipo", "titulo", "descripcion", "created_at"] if c in df_alert.columns]
        st.dataframe(df_alert[cols], hide_index=True, use_container_width=True)

with tab3:
    section_header("Noticias críticas")
    if df_news.empty:
        st.info("Sin noticias recientes.")
    else:
        df_news_div = select_critical_news_diversified(df_news, max_total=25, max_per_source=2)
        cols = [
            c
            for c in [
                "fuente",
                "titular",
                "fecha_publicacion",
                "sentimiento_label",
                "sentimiento_score",
                "url",
            ]
            if c in df_news_div.columns
        ]
        st.dataframe(df_news_div[cols], hide_index=True, use_container_width=True)
