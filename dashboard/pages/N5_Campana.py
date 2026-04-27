"""
ELECTSIM — Campaña Electoral
Tabs: War Room · Simulador Avanzado · Coordinación · Voto Blando · Centro Operaciones
Integra toda la funcionalidad de campaña en una sola mega-página.
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
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS, kpi_card, section_header,
)
import dashboard.db as _db

st.set_page_config(page_title="Campaña — ElectSim", page_icon="⚔️", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("campana")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{RED},{AMBER});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">⚔️</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Campaña Electoral</h2>
    <div style="color:{TEXT2};font-size:.82rem">War Room · Simulador · Coordinación · Voto Blando</div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_warroom, tab_sim, tab_voto_blando, tab_coord, tab_ops = st.tabs([
    "⚔️ War Room",
    "⚡ Simulador Impacto",
    "🫧 Voto Blando",
    "📋 Coordinación",
    "🎯 Operaciones",
])

# ═══════════════════════════════════════════════════════════════════════════════
with tab_warroom:
    try:
        from dashboard.components.war_room import render_war_room
        render_war_room()
    except Exception:
        section_header("WAR ROOM — CENTRO DE MANDO DE CAMPAÑA", RED)

        col_wr1, col_wr2, col_wr3 = st.columns(3)
        with col_wr1:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {RED}44;border-radius:12px;padding:1.2rem">
              <div style="font-size:.65rem;color:{RED};font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">
                ALERTAS ACTIVAS
              </div>
              <div style="font-size:2rem;font-weight:900;color:{RED};font-family:monospace">0</div>
              <div style="font-size:.75rem;color:{MUTED}">Crisis sin gestionar</div>
            </div>
            """, unsafe_allow_html=True)
        with col_wr2:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {AMBER}44;border-radius:12px;padding:1.2rem">
              <div style="font-size:.65rem;color:{AMBER};font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">
                DÍAS PARA ELECCIONES
              </div>
              <div style="font-size:2rem;font-weight:900;color:{AMBER};font-family:monospace">—</div>
              <div style="font-size:.75rem;color:{MUTED}">Configura fecha electoral</div>
            </div>
            """, unsafe_allow_html=True)
        with col_wr3:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {GREEN}44;border-radius:12px;padding:1.2rem">
              <div style="font-size:.65rem;color:{GREEN};font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem">
                ESTADO CAMPAÑA
              </div>
              <div style="font-size:2rem;font-weight:900;color:{GREEN};font-family:monospace">●</div>
              <div style="font-size:.75rem;color:{MUTED}">Sistema operativo</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Acciones rápidas War Room
        section_header("ACCIONES RÁPIDAS", CYAN)
        col_act1, col_act2 = st.columns(2)
        with col_act1:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem;margin-bottom:.8rem">
              <div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-bottom:.5rem">📡 Monitoreo de medios</div>
              <div style="font-size:.8rem;color:{TEXT2}">
                Seguimiento en tiempo real de menciones y sentimiento en 12 medios españoles.
              </div>
            </div>
            """, unsafe_allow_html=True)
            st.page_link("pages/N3_Medios.py", label="→ Ir a Medios & Narrativa")

        with col_act2:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem;margin-bottom:.8rem">
              <div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-bottom:.5rem">🔍 Opposition Research</div>
              <div style="font-size:.8rem;color:{TEXT2}">
                Contradicciones detectadas, declaraciones archivadas y análisis NLI.
              </div>
            </div>
            """, unsafe_allow_html=True)
            st.page_link("pages/N2_Inteligencia.py", label="→ Ir a Inteligencia Política")

        st.page_link("pages/18_War_Room_Espana.py", label="→ War Room completo (v1)")


# ═══════════════════════════════════════════════════════════════════════════════
with tab_sim:
    section_header("SIMULADOR DE IMPACTO DE CAMPAÑA", CYAN)

    try:
        from dashboard.services.campaign_simulator import simular_impacto_tema
        from dashboard.models.voter_profiles import PERFILES, TEMAS_IMPACTO
        from dashboard.models.timing_model import timing_weight, saturation_decay
        from dashboard.models.transfer_vectors import calcular_flujos, flujos_para_sankey
        _SIM_OK = True
    except Exception:
        _SIM_OK = False
        PERFILES = {}
        TEMAS_IMPACTO = []

    if not _SIM_OK:
        st.warning("Simulador no disponible.")
        st.page_link("pages/5_Agentes_LLM.py", label="→ Simulador clásico")
    else:
        col_s1, col_s2 = st.columns([1, 2])

        with col_s1:
            partido_em = st.selectbox("Partido emisor", list(COLORES_PARTIDOS.keys())[:8], key="campana_partido")
            tema_em = st.selectbox("Tema de campaña", TEMAS_IMPACTO or ["Bajada de impuestos a clase media"], key="campana_tema")
            semana_em = st.slider("Semana de campaña", 1, 7, 3, key="campana_semana")
            veces_em = st.session_state.get("sim_tema_uso", {}).get(tema_em, 0)

            tw = timing_weight(semana_em)
            sd = saturation_decay(veces_em)
            tw_c = GREEN if tw >= 0.8 else (AMBER if tw >= 0.5 else RED)
            sd_c = GREEN if sd >= 0.8 else (AMBER if sd >= 0.5 else RED)

            st.markdown(f"""
            <div style="display:flex;gap:.5rem;margin:.5rem 0">
              <span style="background:{tw_c}22;color:{tw_c};border:1px solid {tw_c}44;border-radius:20px;
                           padding:.2rem .6rem;font-size:.7rem;font-weight:700">⏱ {tw:.0%}</span>
              <span style="background:{sd_c}22;color:{sd_c};border:1px solid {sd_c}44;border-radius:20px;
                           padding:.2rem .6rem;font-size:.7rem;font-weight:700">🔄 ×{veces_em+1}</span>
            </div>
            """, unsafe_allow_html=True)

            if st.button("▶ Simular", type="primary", key="btn_sim_campana"):
                with st.spinner("Simulando..."):
                    try:
                        res = simular_impacto_tema(
                            tema=tema_em, partido_emisor=partido_em,
                            perfiles_unificados=PERFILES,
                            semana_campana=semana_em,
                            veces_tema_usado=veces_em,
                        )
                        st.session_state["campana_sim_res"] = res
                        if "sim_tema_uso" not in st.session_state:
                            st.session_state["sim_tema_uso"] = {}
                        st.session_state["sim_tema_uso"][tema_em] = veces_em + 1
                    except Exception as exc:
                        st.error(f"Error: {exc}")

        with col_s2:
            res = st.session_state.get("campana_sim_res")
            if res:
                impactos = res.get("impactos_partido", {})
                if impactos:
                    df_imp = pd.DataFrame([
                        {"Partido": p, "Impacto (pp)": v}
                        for p, v in sorted(impactos.items(), key=lambda x: abs(x[1]), reverse=True)
                    ])
                    fig = go.Figure(go.Bar(
                        x=df_imp["Partido"], y=df_imp["Impacto (pp)"],
                        marker_color=[GREEN if v > 0 else RED for v in df_imp["Impacto (pp)"]],
                        text=[f"{v:+.2f}pp" for v in df_imp["Impacto (pp)"]],
                        textposition="outside",
                        textfont=dict(color=TEXT, size=11),
                    ))
                    fig.update_layout(
                        height=250, paper_bgcolor=BG2, plot_bgcolor=BG2,
                        margin=dict(t=10, b=10, l=10, r=10),
                        xaxis=dict(color=TEXT), yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="pp"),
                    )
                    st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

                    # Sankey
                    sankey = res.get("sankey_data", {})
                    if sankey and sankey.get("labels"):
                        fig_sk = go.Figure(go.Sankey(
                            node=dict(pad=10, thickness=16, label=sankey["labels"],
                                      color=[COLORES_PARTIDOS.get(l, "#666") for l in sankey["labels"]]),
                            link=dict(source=sankey["source"], target=sankey["target"],
                                      value=sankey["value"], color=[f"{CYAN}33"]*len(sankey["value"])),
                        ))
                        fig_sk.update_layout(height=180, paper_bgcolor=BG3,
                                             margin=dict(t=5, b=5, l=5, r=5),
                                             font=dict(color=TEXT2, size=10))
                        st.plotly_chart(fig_sk, use_container_width=True, config={"displayModeBar": False})
            else:
                st.markdown(f"""
                <div style="background:{BG3};border:1px dashed {BORDER};border-radius:10px;
                            padding:2rem;text-align:center;color:{MUTED}">
                  Configura y ejecuta la simulación
                </div>
                """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
with tab_voto_blando:
    section_header("ANÁLISIS DE VOTO BLANDO", PURPLE)

    @st.cache_data(ttl=300)
    def _cargar_voto_blando():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT partido_siglas, pct_voto_blando, pct_decidido, fecha "
                "FROM voto_blando ORDER BY fecha DESC LIMIT 20",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_vb = _cargar_voto_blando()

    if df_vb.empty:
        # Demo voto blando
        _demo_vb = {
            "PP": {"decidido": 72, "blando": 28},
            "PSOE": {"decidido": 68, "blando": 32},
            "VOX": {"decidido": 81, "blando": 19},
            "SUMAR": {"decidido": 55, "blando": 45},
            "JUNTS": {"decidido": 78, "blando": 22},
        }
        fig_vb = go.Figure()
        for partido, data in _demo_vb.items():
            color = COLORES_PARTIDOS.get(partido, "#555")
            fig_vb.add_trace(go.Bar(
                name=partido, x=["Decidido", "Blando"],
                y=[data["decidido"], data["blando"]],
                marker_color=[color, f"{color}66"],
                showlegend=True,
                hovertemplate=f"<b>{partido}</b><br>%{{x}}: %{{y:.0f}}%<extra></extra>",
            ))
        fig_vb.update_layout(
            barmode="group", height=280,
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT), yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%"),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.2,
                        font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_vb, use_container_width=True, config={"displayModeBar": False})
        st.caption("📊 Datos demo")
        st.page_link("pages/25_Voto_Blando.py", label="→ Análisis Voto Blando (v1)")
    else:
        st.dataframe(df_vb, use_container_width=True, hide_index=True)


# ═══════════════════════════════════════════════════════════════════════════════
with tab_coord:
    section_header("COORDINACIÓN DE CAMPAÑA", AMBER)
    st.page_link("pages/22_Coordinacion_Campana.py", label="→ Coordinación Campaña (v1)")
    st.info("Accede al módulo de coordinación para gestionar equipos, recursos y calendario de campaña.")


with tab_ops:
    section_header("CENTRO DE OPERACIONES", CYAN)
    st.page_link("pages/26_Centro_Operaciones.py", label="→ Centro de Operaciones (v1)")
    st.page_link("pages/19_Impacto_Campana.py", label="→ Impacto de Campaña (v1)")
    st.info("Centro de operaciones electoral — seguimiento en tiempo real de resultados y proyecciones.")
