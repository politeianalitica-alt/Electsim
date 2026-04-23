from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import dashboard.db as _db
from dashboard.models.transferencia import (
    calcular_captacion_potencial,
    calcular_transferencia_heuristica,
    pivot_matriz_transferencia,
)
from dashboard.models.voto_blando import (
    calcular_voto_blando_provincial,
    calcular_voto_blando_segmentos,
)
from dashboard.shared import (
    AMBER,
    BG,
    BG2,
    BG3,
    BLUE,
    BORDER,
    CYAN,
    GREEN,
    RED,
    TEXT,
    TEXT2,
    kpi_card,
    mostrar_alertas_pagina,
    section_header,
    sidebar_nav,
)

st.set_page_config(page_title="Voto Blando | ElectSim", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("25_Voto_Blando")

st.markdown(
    f"""
<div style="background:linear-gradient(135deg,{BG2} 0%,#0d1a2e 50%,{BG3} 100%);
    border:1px solid {BORDER};border-radius:16px;padding:1.7rem 2.2rem;margin-bottom:1.2rem">
    <div style="display:flex;align-items:center;gap:1rem">
        <div style="width:42px;height:42px;background:linear-gradient(135deg,{AMBER},{RED});
                    border-radius:12px;display:flex;align-items:center;justify-content:center;
                    font-size:1.05rem;flex-shrink:0">◆</div>
        <div>
            <div style="font-size:1.45rem;font-weight:900;color:{TEXT};letter-spacing:-.02em">
                Detector de Voto Blando y Transferible
            </div>
            <div style="font-size:.76rem;color:{TEXT2};margin-top:.2rem">
                Propensión al cambio, flujos de transferencia y votos captables por territorio.
            </div>
        </div>
    </div>
</div>
""",
    unsafe_allow_html=True,
)

with st.sidebar:
    st.markdown("---")
    st.subheader("Configuración")
    partido_propio = st.selectbox(
        "Partido de referencia",
        ["PSOE", "PP", "VOX", "SUMAR", "PODEMOS", "ERC", "JUNTS", "PNV"],
        index=0,
    )
    tipo_eleccion = st.selectbox("Tipo elección", ["generales", "autonomicas", "municipales"], index=0)
    partidos_sistema = st.multiselect(
        "Partidos sistema",
        ["PSOE", "PP", "SUMAR", "VOX", "PODEMOS", "ERC", "JUNTS", "PNV", "EH Bildu", "CC", "BNG"],
        default=["PSOE", "PP", "SUMAR", "VOX"],
    )
    cliente_id = st.session_state.get("cliente_id_activo")
    recalc = st.button("Recalcular modelos", type="primary", use_container_width=True)


def _safe_mean(series: pd.Series | None) -> float:
    if series is None or series.empty:
        return 0.0
    return float(pd.to_numeric(series, errors="coerce").fillna(0.0).mean())


if recalc or "vb_df_prov" not in st.session_state or st.session_state.get("vb_partido") != partido_propio:
    with st.spinner("Calculando voto blando..."):
        df_now = _db.cargar_nowcasting()
        df_vb_prov = calcular_voto_blando_provincial(
            partido_ref=partido_propio,
            tipo_eleccion=tipo_eleccion,
            df_encuestas=df_now if not df_now.empty else None,
            df_macro=None,
        )
        df_vb_seg = calcular_voto_blando_segmentos(partido_ref=partido_propio)

        # Persistencia en tabla nueva (si existe)
        try:
            _db.guardar_voto_blando(
                registros=df_vb_prov,
                partido_ref=partido_propio,
                tipo_eleccion=tipo_eleccion,
                cliente_id=cliente_id,
            )
        except Exception:
            pass

        df_trans = calcular_transferencia_heuristica(partidos=partidos_sistema or None).rename(
            columns={"prob_transicion": "prob_transferencia"}
        )
        try:
            _db.guardar_transferencia_voto(
                df_matriz=df_trans,
                tipo_eleccion=tipo_eleccion,
                cliente_id=cliente_id,
                metodo="heuristico",
            )
        except Exception:
            pass

        st.session_state["vb_df_prov"] = df_vb_prov
        st.session_state["vb_df_seg"] = df_vb_seg
        st.session_state["vb_df_trans"] = df_trans
        st.session_state["vb_partido"] = partido_propio

# Cargar (preferencia por DB si existe y hay datos)
df_vb_prov = _db.cargar_voto_blando(partido_ref=partido_propio, tipo_eleccion=tipo_eleccion, cliente_id=cliente_id)
if df_vb_prov.empty:
    df_vb_prov = st.session_state.get("vb_df_prov", pd.DataFrame())

df_vb_seg = st.session_state.get("vb_df_seg", pd.DataFrame())
df_trans = _db.cargar_transferencia_voto(tipo_eleccion=tipo_eleccion, cliente_id=cliente_id)
if df_trans.empty:
    df_trans = st.session_state.get("vb_df_trans", pd.DataFrame())

if df_vb_prov.empty:
    st.info("No hay datos de voto blando calculados. Pulsa Recalcular modelos.")
    st.stop()

# Normalizar escala (permite 0..1 o 0..100)
for col in ["pct_voto_blando", "pct_probable_abst", "pct_transferible"]:
    if col in df_vb_prov.columns:
        s = pd.to_numeric(df_vb_prov[col], errors="coerce").fillna(0.0)
        if float(s.max()) <= 1.0:
            df_vb_prov[col] = s * 100.0
        else:
            df_vb_prov[col] = s

section_header("Resumen nacional", color=AMBER)

k1, k2, k3, k4 = st.columns(4)
mean_blando = _safe_mean(df_vb_prov.get("pct_voto_blando"))
mean_trans = _safe_mean(df_vb_prov.get("pct_transferible"))
mean_abst = _safe_mean(df_vb_prov.get("pct_probable_abst"))
prov_crit = "—"
if "pct_voto_blando" in df_vb_prov.columns and not df_vb_prov.empty:
    idx = pd.to_numeric(df_vb_prov["pct_voto_blando"], errors="coerce").fillna(0).idxmax()
    prov_crit = str(df_vb_prov.iloc[idx].get("circunscripcion", "—"))

k1.markdown(kpi_card("% Voto blando medio", f"{mean_blando:.1f}%"), unsafe_allow_html=True)
k2.markdown(kpi_card("% Transferible medio", f"{mean_trans:.1f}%"), unsafe_allow_html=True)
k3.markdown(kpi_card("% Probable abstención", f"{mean_abst:.1f}%"), unsafe_allow_html=True)
k4.markdown(kpi_card("Provincia crítica", prov_crit), unsafe_allow_html=True)

tab1, tab2, tab3, tab4 = st.tabs(["Por provincia", "Por segmento", "Matriz transferencia", "Votos captables"])

with tab1:
    section_header("Voto blando por circunscripción", color=CYAN)
    df_plot = df_vb_prov.copy()
    if "circunscripcion" not in df_plot.columns:
        df_plot["circunscripcion"] = df_plot.get("provincia", "nacional")

    fig_bar = px.bar(
        df_plot.sort_values("pct_voto_blando", ascending=False).head(25),
        x="circunscripcion",
        y="pct_voto_blando",
        color="pct_transferible" if "pct_transferible" in df_plot.columns else None,
        color_continuous_scale=["#cedcd8", "#01696f"],
        labels={"circunscripcion": "Provincia", "pct_voto_blando": "% Voto blando"},
        title=f"Top provincias de voto blando — {partido_propio}",
    )
    fig_bar.update_layout(height=420, xaxis_tickangle=-45)
    st.plotly_chart(fig_bar, use_container_width=True)

    show_cols = [c for c in [
        "circunscripcion",
        "etiqueta",
        "pct_voto_blando",
        "pct_transferible",
        "pct_probable_abst",
        "score_medio_blando",
    ] if c in df_plot.columns]
    st.dataframe(df_plot[show_cols].sort_values("pct_transferible", ascending=False), use_container_width=True)

with tab2:
    section_header("Voto blando por segmento", color=BLUE)
    if df_vb_seg.empty:
        st.info("Sin segmentación calculada. Recalcula modelos.")
    else:
        tipo_seg = st.radio("Dimensión", ["edad", "estudios", "ideologia"], horizontal=True)
        df_seg = df_vb_seg[df_vb_seg["tipo"] == tipo_seg].copy()

        fig_seg = go.Figure()
        fig_seg.add_trace(go.Bar(name="% Blando", x=df_seg["valor"], y=df_seg["pct_voto_blando"], marker_color=AMBER))
        fig_seg.add_trace(go.Bar(name="% Transferible", x=df_seg["valor"], y=df_seg["pct_transferible"], marker_color=CYAN))
        fig_seg.add_trace(go.Bar(name="% Abstención", x=df_seg["valor"], y=df_seg["pct_probable_abst"], marker_color=RED))
        fig_seg.update_layout(barmode="group", height=380, plot_bgcolor=BG2, paper_bgcolor=BG, font_color=TEXT)
        st.plotly_chart(fig_seg, use_container_width=True)

        st.dataframe(
            df_seg[["segmento", "etiqueta", "pct_voto_blando", "votos_blandos_absolutos", "n_electores_est"]]
            .sort_values("votos_blandos_absolutos", ascending=False),
            use_container_width=True,
        )

with tab3:
    section_header("Flujos de transferencia", color=GREEN)
    if df_trans.empty:
        st.info("No hay matriz de transferencia disponible.")
    else:
        df_t = df_trans.copy()
        if "prob_transferencia" not in df_t.columns and "prob_transicion" in df_t.columns:
            df_t["prob_transferencia"] = df_t["prob_transicion"]

        if "partido_origen" in df_t.columns and "partido_destino" in df_t.columns and "prob_transferencia" in df_t.columns:
            pv = pivot_matriz_transferencia(df_t)
            if not pv.empty:
                fig_heat = px.imshow(
                    pv,
                    color_continuous_scale=[[0, "#f7f6f2"], [0.5, "#4f98a3"], [1, "#01696f"]],
                    text_auto=".2f",
                    aspect="auto",
                    labels=dict(x="Destino", y="Origen", color="P(transferencia)"),
                )
                fig_heat.update_layout(height=430)
                st.plotly_chart(fig_heat, use_container_width=True)

        st.dataframe(df_t, use_container_width=True)

with tab4:
    section_header("Votos captables", color=AMBER)
    if df_trans.empty or df_vb_prov.empty:
        st.info("No hay datos suficientes para estimar captación.")
    else:
        if "prob_transferencia" not in df_trans.columns and "prob_transicion" in df_trans.columns:
            df_trans = df_trans.rename(columns={"prob_transicion": "prob_transferencia"})

        df_cap = calcular_captacion_potencial(
            df_transferencia=df_trans,
            df_voto_blando=df_vb_prov,
            partido_destino=partido_propio,
            partidos_origen=[p for p in (partidos_sistema or []) if p != partido_propio],
        )
        if df_cap.empty:
            st.info("No se encontraron flujos captables para el partido destino.")
        else:
            df_ag = (
                df_cap.groupby("partido_origen", as_index=False)["votos_captables_est"]
                .sum()
                .sort_values("votos_captables_est", ascending=False)
            )
            fig_cap = px.bar(
                df_ag,
                x="partido_origen",
                y="votos_captables_est",
                labels={"partido_origen": "Partido origen", "votos_captables_est": "Votos captables"},
                title=f"Votos captables hacia {partido_propio}",
                color_discrete_sequence=["#01696f"],
            )
            fig_cap.update_layout(height=360)
            st.plotly_chart(fig_cap, use_container_width=True)
            st.dataframe(df_cap.head(80), use_container_width=True)
