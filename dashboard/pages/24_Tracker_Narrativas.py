from __future__ import annotations

import os
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import kpi_card, section_header, sidebar_nav
from dashboard.services import tracker as svc

st.set_page_config(page_title="Tracker de Narrativas", layout="wide")
sidebar_nav()

if os.getenv("ELECTSIM_FEATURE_TRACKER", "1") != "1":
    st.info("Modulo tracker desactivado por feature flag.")
    st.stop()

cliente_id = st.session_state.get("cliente_id_activo")

section_header("Tracker de Narrativas")
st.caption("Seguimiento de palabras, narrativas y actores por canal.")

TIPOS_OBJETO = [
    "palabra",
    "narrativa",
    "persona",
    "partido",
    "grupo_social",
    "evento",
    "hashtag",
]
CANALES = ["prensa", "rrss", "legislacion", "agenda"]


def _fmt(v: float | int | None) -> str:
    if v is None:
        return "0"
    try:
        return f"{float(v):,.0f}" if float(v).is_integer() else f"{float(v):,.2f}"
    except Exception:
        return str(v)


df_alertas = svc.cargar_alertas_pendientes(cliente_id, limite=8)
if not df_alertas.empty:
    with st.sidebar:
        st.markdown("### Alertas tracker")
        for _, a in df_alertas.iterrows():
            icon = "🔴" if str(a.get("tipo_alerta")) == "pico_menciones" else "🟠"
            with st.expander(f"{icon} {a.get('objeto_valor', 'objeto')}"):
                st.caption(str(a.get("descripcion", "")))
                if st.button("Marcar leida", key=f"track_alert_{a.get('id')}"):
                    svc.marcar_alerta_leida(int(a["id"]))
                    st.rerun()


tab_monitor, tab_sov, tab_menciones, tab_obj = st.tabs(
    ["Monitor temporal", "Share of Voice", "Ultimas menciones", "Gestion de objetos"]
)

with tab_monitor:
    df_obj = svc.listar_objetos(cliente_id=cliente_id, solo_activos=True)
    if df_obj.empty:
        st.info("No hay objetos activos. Crea uno en la pestaña de gestion.")
    else:
        c1, c2, c3 = st.columns([2, 1, 1])
        with c1:
            obj_label = st.selectbox(
                "Objeto",
                [f"{r['id']} - {r['tipo']}: {r['valor']}" for _, r in df_obj.iterrows()],
            )
        with c2:
            dias = st.selectbox("Ventana", [7, 14, 30, 60, 90], index=2)
        with c3:
            canales = st.multiselect("Canales", CANALES, default=["prensa", "rrss"])

        objeto_id = int(str(obj_label).split(" - ", 1)[0])
        df_serie = svc.cargar_serie_objeto(objeto_id=objeto_id, dias=dias, canales=canales or None)

        if df_serie.empty:
            st.warning("No hay serie para ese objeto en el rango seleccionado.")
        else:
            df_serie["fecha"] = pd.to_datetime(df_serie["fecha"], errors="coerce")
            df_serie = df_serie.dropna(subset=["fecha"]).sort_values("fecha")

            total = float(pd.to_numeric(df_serie["n_menciones"], errors="coerce").fillna(0).sum())
            sent = float(pd.to_numeric(df_serie["sentiment_medio"], errors="coerce").mean())
            alcance = float(pd.to_numeric(df_serie["alcance_total"], errors="coerce").fillna(0).sum())

            k1, k2, k3 = st.columns(3)
            k1.markdown(kpi_card("Menciones", _fmt(total), f"{dias} dias"), unsafe_allow_html=True)
            k2.markdown(kpi_card("Sentimiento", f"{sent:+.2f}", "media"), unsafe_allow_html=True)
            k3.markdown(kpi_card("Alcance", _fmt(alcance), "estimado"), unsafe_allow_html=True)

            pivot = (
                df_serie.pivot_table(
                    index="fecha", columns="canal", values="n_menciones", aggfunc="sum", fill_value=0
                )
                .sort_index()
                .reset_index()
            )

            fig = go.Figure()
            for canal in [c for c in pivot.columns if c != "fecha"]:
                fig.add_trace(
                    go.Scatter(
                        x=pivot["fecha"],
                        y=pivot[canal],
                        mode="lines+markers",
                        name=str(canal),
                    )
                )
            fig.update_layout(
                title="Menciones por canal",
                height=360,
                margin=dict(t=40, b=10),
                hovermode="x unified",
            )
            st.plotly_chart(fig, width="stretch")

            df_sent = df_serie.groupby("fecha", as_index=False)["sentiment_medio"].mean()
            fig_s = px.line(df_sent, x="fecha", y="sentiment_medio", title="Evolucion de sentimiento")
            fig_s.add_hline(y=0.0, line_dash="dot", line_color="#94a3b8")
            fig_s.update_layout(height=280, margin=dict(t=40, b=10), yaxis_range=[-1, 1])
            st.plotly_chart(fig_s, width="stretch")

with tab_sov:
    c1, c2, c3 = st.columns(3)
    with c1:
        tipo = st.selectbox("Tipo", TIPOS_OBJETO, index=3)
    with c2:
        dias_sov = st.selectbox("Periodo", [7, 14, 30, 60], index=2)
    with c3:
        canal = st.selectbox("Canal", ["Todos"] + CANALES)

    df_sov = svc.cargar_share_of_voice(
        cliente_id=cliente_id,
        tipo=tipo,
        dias=int(dias_sov),
        canal=None if canal == "Todos" else canal,
    )

    if df_sov.empty:
        st.info("Sin datos de share of voice para los filtros actuales.")
    else:
        c1, c2 = st.columns(2)
        with c1:
            fig_pie = px.pie(
                df_sov,
                names="valor",
                values="total_menciones",
                title="Distribucion de menciones",
            )
            fig_pie.update_layout(height=340, margin=dict(t=40, b=10))
            st.plotly_chart(fig_pie, width="stretch")

        with c2:
            fig_bar = px.bar(
                df_sov,
                x="share_pct",
                y="valor",
                orientation="h",
                color="sentiment_medio",
                color_continuous_scale="RdYlGn",
                title="Share % y sentimiento",
            )
            fig_bar.update_layout(height=340, margin=dict(t=40, b=10))
            st.plotly_chart(fig_bar, width="stretch")

with tab_menciones:
    df_obj = svc.listar_objetos(cliente_id=cliente_id, solo_activos=True)
    if df_obj.empty:
        st.info("No hay objetos activos.")
    else:
        col1, col2 = st.columns([2, 1])
        with col1:
            obj_label = st.selectbox(
                "Objeto", [f"{r['id']} - {r['tipo']}: {r['valor']}" for _, r in df_obj.iterrows()], key="obj_mentions"
            )
        with col2:
            dias = st.selectbox("Periodo", [3, 7, 14, 30], index=1, key="obj_mentions_days")

        objeto_id = int(str(obj_label).split(" - ", 1)[0])
        df_top = svc.cargar_top_contenido(objeto_id=objeto_id, dias=int(dias), limite=20)

        if df_top.empty:
            st.info("No hay menciones recientes para ese objeto.")
        else:
            for _, row in df_top.iterrows():
                titulo = str(row.get("titulo") or "Sin titular")
                medio = str(row.get("medio") or "medio")
                fecha = str(row.get("fecha_pub") or "")[:10]
                sent = row.get("sentiment")
                tono = str(row.get("tono") or "neutro")
                with st.expander(f"{fecha} | {medio} | {tono} | {titulo[:120]}"):
                    st.caption(f"Sentimiento: {sent}")
                    if row.get("url"):
                        st.markdown(f"[Abrir enlace]({row['url']})")

with tab_obj:
    col_add, col_list = st.columns([1, 2])

    with col_add:
        st.markdown("### Nuevo objeto")
        with st.form("form_objeto_tracker"):
            tipo = st.selectbox("Tipo", TIPOS_OBJETO)
            valor = st.text_input("Valor *", placeholder="Ej: PSOE")
            submit = st.form_submit_button("Guardar")
            if submit:
                if not valor.strip():
                    st.error("El valor es obligatorio")
                else:
                    obj_id = svc.crear_objeto(cliente_id=cliente_id, tipo=tipo, valor=valor.strip())
                    st.success(f"Objeto guardado (ID {obj_id})")
                    st.rerun()

    with col_list:
        st.markdown("### Objetos activos")
        df_obj = svc.listar_objetos(cliente_id=cliente_id, solo_activos=True)
        if df_obj.empty:
            st.info("No hay objetos de seguimiento")
        else:
            for _, row in df_obj.iterrows():
                c1, c2, c3 = st.columns([1, 3, 1])
                c1.caption(str(row.get("tipo", "")))
                c2.markdown(f"**{row.get('valor', '')}**")
                if c3.button("Desactivar", key=f"del_obj_{row.get('id')}"):
                    svc.eliminar_objeto(int(row["id"]))
                    st.rerun()
