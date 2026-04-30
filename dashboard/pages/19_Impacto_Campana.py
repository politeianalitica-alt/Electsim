from __future__ import annotations

import os
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.services.impacto_campana import (
    TIPOS_EVENTO,
    calcular_y_guardar_impacto,
    get_eventos,
    get_resultados_guardados,
    registrar_evento,
    registrar_snapshot,
)
from dashboard.shared import kpi_card, section_header, sidebar_nav

st.set_page_config(page_title="Impacto de Campana", layout="wide")
sidebar_nav()

if os.getenv("ELECTSIM_FEATURE_IMPACTO", "1") != "1":
    st.info("Modulo de impacto desactivado por feature flag.")
    st.stop()

cliente_id = st.session_state.get("cliente_id_activo")

section_header("Impacto de Campana")
st.caption("Medicion pre/post de acciones de campana sobre encuesta, prensa y RRSS.")


def _safe(v: object, nd: int = 3) -> float:
    try:
        return round(float(v), nd)
    except Exception:
        return 0.0


tab_eventos, tab_snapshots, tab_analisis = st.tabs([
    "Eventos",
    "Registrar metricas",
    "Analisis",
])

with tab_eventos:
    df_ev = get_eventos(cliente_id=cliente_id)

    if df_ev.empty:
        st.info("No hay eventos registrados.")
    else:
        st.dataframe(
            df_ev[
                [
                    "id",
                    "tipo",
                    "titulo",
                    "fecha_inicio",
                    "localizacion",
                    "coste_estimado_eur",
                    "alcance_estimado",
                ]
            ],
            use_container_width=True,
            hide_index=True,
        )

    with st.expander("Nuevo evento"):
        with st.form("form_evento_impacto"):
            c1, c2 = st.columns(2)
            tipo = c1.selectbox("Tipo", TIPOS_EVENTO)
            titulo = c2.text_input("Titulo *")
            descripcion = st.text_area("Descripcion")

            c3, c4 = st.columns(2)
            fecha_inicio = c3.date_input("Fecha inicio", value=date.today())
            fecha_fin = c4.date_input("Fecha fin", value=date.today())

            c5, c6, c7 = st.columns(3)
            localizacion = c5.text_input("Localizacion")
            ccaa = c6.text_input("CCAA")
            provincia = c7.text_input("Provincia")

            c8, c9 = st.columns(2)
            coste = c8.number_input("Coste estimado (EUR)", min_value=0.0, step=100.0)
            alcance = c9.number_input("Alcance estimado", min_value=0, step=500)

            submit = st.form_submit_button("Guardar evento")
            if submit:
                if not titulo.strip():
                    st.error("El titulo es obligatorio.")
                else:
                    payload = {
                        "cliente_id": int(cliente_id) if cliente_id is not None else None,
                        "tipo": tipo,
                        "titulo": titulo.strip(),
                        "descripcion": descripcion.strip() or None,
                        "localizacion": localizacion.strip() or None,
                        "ccaa": ccaa.strip() or None,
                        "provincia": provincia.strip() or None,
                        "fecha_inicio": fecha_inicio,
                        "fecha_fin": fecha_fin if fecha_fin != fecha_inicio else None,
                        "coste_estimado_eur": coste if coste > 0 else None,
                        "alcance_estimado": int(alcance) if alcance > 0 else None,
                    }
                    new_id = registrar_evento(payload)
                    st.success(f"Evento registrado (ID {new_id})")
                    st.rerun()

with tab_snapshots:
    df_ev = get_eventos(cliente_id=cliente_id)
    if df_ev.empty:
        st.info("Registra un evento para poder cargar metricas.")
    else:
        opts = {
            f"{r['id']} - {r['titulo']} ({r['fecha_inicio']})": int(r["id"])
            for _, r in df_ev.iterrows()
        }
        sel = st.selectbox("Evento", list(opts.keys()))
        evento_id = opts[sel]

        ventana = st.radio("Ventana", ["pre_7d", "post_7d", "pre_3d", "post_3d"], horizontal=True)
        fecha_snapshot = st.date_input("Fecha snapshot", value=date.today())

        with st.form("form_snapshot_impacto"):
            st.markdown("**Encuestas**")
            c1, c2, c3 = st.columns(3)
            intencion = c1.number_input("Intencion de voto (%)", min_value=0.0, max_value=100.0, step=0.1)
            valoracion = c2.number_input("Valoracion lider (0-10)", min_value=0.0, max_value=10.0, step=0.1)
            conocimiento = c3.number_input("Conocimiento (%)", min_value=0.0, max_value=100.0, step=0.1)

            st.markdown("**Medios y RRSS**")
            c4, c5, c6, c7 = st.columns(4)
            menc_prensa = c4.number_input("Menciones prensa", min_value=0, step=1)
            menc_rrss = c5.number_input("Menciones RRSS", min_value=0, step=1)
            sent = c6.number_input("Sentimiento medio (-1, 1)", min_value=-1.0, max_value=1.0, step=0.01)
            engagement = c7.number_input("Engagement RRSS", min_value=0, step=100)

            submit = st.form_submit_button("Guardar snapshot")
            if submit:
                registrar_snapshot(
                    evento_id,
                    ventana,
                    {
                        "fecha_snapshot": fecha_snapshot,
                        "intencion_voto_pct": intencion if intencion > 0 else None,
                        "valoracion_lider": valoracion if valoracion > 0 else None,
                        "conocimiento_pct": conocimiento if conocimiento > 0 else None,
                        "menciones_prensa": int(menc_prensa) if menc_prensa > 0 else None,
                        "menciones_rrss": int(menc_rrss) if menc_rrss > 0 else None,
                        "sentiment_medio": sent if sent != 0 else None,
                        "engagement_rrss": int(engagement) if engagement > 0 else None,
                    },
                )
                st.success("Snapshot guardado")

with tab_analisis:
    df_ev = get_eventos(cliente_id=cliente_id)
    if df_ev.empty:
        st.info("No hay eventos para analizar.")
    else:
        opts = {
            f"{r['id']} - {r['titulo']} ({r['fecha_inicio']})": int(r["id"])
            for _, r in df_ev.iterrows()
        }
        sel = st.selectbox("Evento a analizar", list(opts.keys()), key="sel_evento_analisis")
        evento_id = opts[sel]

        ev = df_ev[df_ev["id"] == evento_id].iloc[0]
        coste = float(ev.get("coste_estimado_eur") or 0) if ev.get("coste_estimado_eur") is not None else None

        metodo = st.radio("Metodo", ["pre_post", "diff_diff", "bsts"], horizontal=True)

        if st.button("Calcular impacto"):
            with st.spinner("Calculando..."):
                resultados = calcular_y_guardar_impacto(
                    evento_id=evento_id,
                    coste_evento=coste,
                    metodo=metodo,
                )
            if not resultados:
                st.warning("No hay datos suficientes para este metodo.")
            else:
                st.success(f"Impacto calculado para {len(resultados)} metricas.")

        df_res = get_resultados_guardados(evento_id)
        if df_res.empty:
            st.info("Sin resultados guardados para este evento.")
        else:
            cols = st.columns(min(4, len(df_res.index)))
            for i, (_, row) in enumerate(df_res.iterrows()):
                cols[i % len(cols)].markdown(
                    kpi_card(
                        str(row["metrica"]),
                        f"{_safe(row['delta_absoluto']):+,.3f}",
                        f"{str(row.get('metodo') or '')}",
                    ),
                    unsafe_allow_html=True,
                )

            fig = go.Figure(
                data=[
                    go.Bar(
                        x=df_res["metrica"],
                        y=pd.to_numeric(df_res["delta_absoluto"], errors="coerce").fillna(0),
                        marker_color=[
                            "#10B981"if float(v) >= 0 else "#EF4444"
                            for v in pd.to_numeric(df_res["delta_absoluto"], errors="coerce").fillna(0)
                        ],
                    )
                ]
            )
            fig.update_layout(title="Delta por metrica", height=360, margin=dict(t=40, b=10))
            st.plotly_chart(fig, use_container_width=True)

            with st.expander("Tabla completa"):
                st.dataframe(df_res, use_container_width=True, hide_index=True)

            df_cpp = df_res[df_res["coste_por_punto"].notna()].copy()
            if not df_cpp.empty and coste:
                st.caption(f"Coste del evento: {coste:,.0f} EUR")
                fig_cpp = go.Figure(
                    data=[
                        go.Bar(
                            x=df_cpp["metrica"],
                            y=pd.to_numeric(df_cpp["coste_por_punto"], errors="coerce").fillna(0),
                            marker_color="#3B82F6",
                        )
                    ]
                )
                fig_cpp.update_layout(title="Coste por punto", height=300, margin=dict(t=40, b=10))
                st.plotly_chart(fig_cpp, use_container_width=True)
