"""
Briefing diario automático para decisores.
"""

from __future__ import annotations


import pandas as pd
import streamlit as st
from dashboard.shared import macro_value, sidebar_nav, top_partido

from dashboard.db import (
    cargar_alertas,
    cargar_agenda_hoy,
    cargar_indices_politeia,
    cargar_macro_ultimo,
    cargar_noticias_recientes,
    cargar_nowcasting,
)
from etl.sources.agendas_dinamicas import fetch_all_agendas

st.set_page_config(page_title="Briefing Diario — ElectSim", layout="wide")

sidebar_nav()
st.title("Briefing Diario")
st.caption("Resumen automático de situación política, institucional, mediática y de riesgo.")


def _top_party(df_nc: pd.DataFrame) -> str:
    siglas, _ = top_partido(df_nc)
    return siglas if siglas != "—" else "N/D"


def _macro(df_macro: pd.DataFrame, indicador: str) -> str:
    return macro_value(df_macro, indicador, fmt=".2f", default="N/D")


def _noticias_criticas_diversificadas(df_news: pd.DataFrame, max_total: int = 24, max_por_fuente: int = 3) -> pd.DataFrame:
    if df_news.empty:
        return df_news
    df = df_news.copy()
    if "sentimiento_score" in df.columns:
        df["abs_score"] = pd.to_numeric(df["sentimiento_score"], errors="coerce").fillna(0.0).abs()
        df = df.sort_values(["abs_score", "fecha_publicacion"], ascending=[False, False])
    # Limitar antes de iterar para evitar recorrer datasets enormes.
    df_head = df.head(max_total * max(2, max_por_fuente))
    out = []
    counts: dict[str, int] = {}
    for _, row in df_head.iterrows():
        fuente = str(row.get("fuente") or "desconocida")
        if counts.get(fuente, 0) >= max_por_fuente:
            continue
        out.append(row)
        counts[fuente] = counts.get(fuente, 0) + 1
        if len(out) >= max_total:
            break
    if not out:
        return df.head(max_total)
    return pd.DataFrame(out)


df_nc = cargar_nowcasting()
df_macro = cargar_macro_ultimo()
df_indices = cargar_indices_politeia()
df_alert = cargar_alertas(solo_no_leidas=True, limit=20)
df_news = cargar_noticias_recientes(dias=2, limit=60)
df_agenda = cargar_agenda_hoy()
agenda_oficial = pd.DataFrame(fetch_all_agendas(max_items_per_source=8))

col1, col2, col3, col4 = st.columns(4)
col1.metric("Partido líder nowcasting", _top_party(df_nc))
col2.metric("Alertas activas", len(df_alert) if not df_alert.empty else 0)
col3.metric("Noticias analizadas (48h)", len(df_news) if not df_news.empty else 0)
col4.metric("Eventos oficiales detectados", len(agenda_oficial) if not agenda_oficial.empty else 0)

st.divider()

briefing = []
briefing.append(f"- **Pulso electoral:** liderazgo estimado para `{_top_party(df_nc)}` en nowcasting.")
briefing.append(f"- **Macro clave:** IPC `{_macro(df_macro, 'IPC General (%)')}%`, paro `{_macro(df_macro, 'Tasa de Paro (%)')}%`, prima `{_macro(df_macro, 'Prima Riesgo (pb)')} pb`.")
if not df_indices.empty:
    _ind = df_indices.copy()
    _ind["valor"] = pd.to_numeric(_ind["valor"], errors="coerce").fillna(0.0)
    top_risk = _ind.sort_values("valor", ascending=False).head(3)[["indice_codigo", "valor"]]
    riesgos_txt = ", ".join([f"{r['indice_codigo']}={r['valor']:.1f}" for _, r in top_risk.iterrows()])
    briefing.append(f"- **Índices Politeia:** focos prioritarios `{riesgos_txt}`.")
if not df_alert.empty:
    alerts_txt = "; ".join(df_alert["titulo"].astype(str).head(3).tolist())
    briefing.append(f"- **Alertas de sistema:** {alerts_txt}.")
if not df_agenda.empty:
    agenda_txt = ", ".join(df_agenda["tema"].astype(str).head(4).tolist())
    briefing.append(f"- **Agenda mediática hoy:** {agenda_txt}.")

st.subheader("Resumen Ejecutivo")
st.markdown("\n".join(briefing))

st.subheader("Acciones sugeridas")
st.markdown(
    "- Priorizar mensajes sobre economía del hogar y vivienda en ventanas de alta audiencia.\n"
    "- Vigilar temas de tensión territorial e institucional cuando se activen alertas rojas.\n"
    "- Sincronizar agenda pública de decisores con agenda mediática para maximizar cobertura."
)

tab1, tab2, tab3 = st.tabs(["Agenda Oficial", "Alertas", "Noticias críticas"])

with tab1:
    if agenda_oficial.empty:
        st.info("No se ha podido cargar agenda oficial en tiempo real.")
    else:
        st.dataframe(
            agenda_oficial[["fuente", "actor", "fecha", "titulo", "url"]] if "actor" in agenda_oficial.columns else agenda_oficial,
            hide_index=True,
            use_container_width=True,
        )

with tab2:
    if df_alert.empty:
        st.success("Sin alertas activas.")
    else:
        st.dataframe(df_alert[["severidad", "tipo", "titulo", "descripcion", "created_at"]], hide_index=True, use_container_width=True)

with tab3:
    if df_news.empty:
        st.info("Sin noticias recientes.")
    else:
        df_news_div = _noticias_criticas_diversificadas(df_news, max_total=25, max_por_fuente=2)
        cols = [c for c in ["fuente", "titular", "fecha_publicacion", "sentimiento_label", "sentimiento_score", "url"] if c in df_news.columns]
        st.dataframe(df_news_div[cols], hide_index=True, use_container_width=True)

