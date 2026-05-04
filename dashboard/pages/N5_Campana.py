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
    COLORES_PARTIDOS, kpi_card, section_header, hex_to_rgba,
)
import dashboard.db as _db

# ── campaign_core (Bloque 6) ──────────────────────────────────────────────────
try:
    from dashboard.services.campaign_core import (
        cargar_voto_blando as _cc_voto_blando,
        cargar_segmentos_votante as _cc_segmentos,
        simular_mensaje_campana as _cc_simular,
        recomendar_mensajes as _cc_recomendar,
        cargar_oportunidades_campana as _cc_oportunidades,
        cargar_kpis_campana as _cc_kpis,
    )
    _HAY_DATOS_CAMPANA = True
except Exception:
    _HAY_DATOS_CAMPANA = False
    def _cc_voto_blando(*a, **kw): return __import__("pandas").DataFrame()
    def _cc_segmentos(*a, **kw): return __import__("pandas").DataFrame()
    def _cc_simular(*a, **kw): return {"hay_datos": False}
    def _cc_recomendar(*a, **kw): return []
    def _cc_oportunidades(*a, **kw): return []
    def _cc_kpis(*a, **kw): return {"hay_datos": False}

st.set_page_config(page_title="Campaña — ElectSim", page_icon="", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("campana")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{RED},{AMBER});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0"></div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Campaña Electoral</h2>
    <div style="color:{TEXT2};font-size:.82rem">War Room · Simulador · Coordinación · Voto Blando</div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_warroom, tab_sim, tab_voto_blando, tab_coord, tab_ops, tab_territorial = st.tabs([
    "War Room",
    "! Simulador Impacto",
    "Voto Blando",
    "Coordinación",
    "Operaciones",
    "🗺️ Territorial",
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
              <div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-bottom:.5rem"> Monitoreo de medios</div>
              <div style="font-size:.8rem;color:{TEXT2}">
                Seguimiento en tiempo real de menciones y sentimiento en 12 medios españoles.
              </div>
            </div>
            """, unsafe_allow_html=True)
            st.page_link("pages/N3_Medios.py", label="→ Ir a Medios & Narrativa")

        with col_act2:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem;margin-bottom:.8rem">
              <div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-bottom:.5rem"> Opposition Research</div>
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
                           padding:.2rem .6rem;font-size:.7rem;font-weight:700"> {tw:.0%}</span>
              <span style="background:{sd_c}22;color:{sd_c};border:1px solid {sd_c}44;border-radius:20px;
                           padding:.2rem .6rem;font-size:.7rem;font-weight:700"> ×{veces_em+1}</span>
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
                        if "sim_tema_uso"not in st.session_state:
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
                        text=[f"{v:+.2f}pp"for v in df_imp["Impacto (pp)"]],
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
                                      value=sankey["value"], color=["rgba(0,212,255,0.200)"]*len(sankey["value"])),
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

    # Prioridad: campaign_core (Bloque 6) → legacy DB → demo
    df_vb = _cc_voto_blando(geography="ES") if _HAY_DATOS_CAMPANA else pd.DataFrame()
    if df_vb.empty:
        df_vb = _cargar_voto_blando()

    # ── Partido selector ──────────────────────────────────────────────────────
    _vb_partidos = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS"]
    _vb_col1, _vb_col2 = st.columns([3, 1])
    with _vb_col2:
        _vb_partido_sel = st.selectbox(
            "Partido objetivo", _vb_partidos, key="vb_partido_sel"
        )

    with _vb_col1:
        # KPIs de voto blando
        _kpis_vb = _cc_kpis(_vb_partido_sel) if _HAY_DATOS_CAMPANA else {"hay_datos": False}
        kv1, kv2, kv3 = st.columns(3)
        with kv1:
            _voto_dec = _kpis_vb.get("voto_decidido_pct", 0) if _kpis_vb.get("hay_datos") else 72.0
            st.markdown(kpi_card("Voto decidido", f"{_voto_dec:.0f}%", color=GREEN), unsafe_allow_html=True)
        with kv2:
            _voto_bl = _kpis_vb.get("voto_blando_pct", 0) if _kpis_vb.get("hay_datos") else 28.0
            st.markdown(kpi_card("Voto blando", f"{_voto_bl:.0f}%", color=AMBER), unsafe_allow_html=True)
        with kv3:
            _n_op = _kpis_vb.get("n_oportunidades", 0) if _kpis_vb.get("hay_datos") else 0
            st.markdown(kpi_card("Oportunidades", str(_n_op), color=CYAN), unsafe_allow_html=True)

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
                marker_color=[color, hex_to_rgba(color, 0.40)],
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
        st.caption("Datos demo · Bloque 6 requiere polls cargadas")
    else:
        # Mostrar datos reales
        _cols_show = [c for c in ["party_id", "decided_pct", "soft_pct", "estimate_date"] if c in df_vb.columns]
        if not _cols_show:
            _cols_show = df_vb.columns.tolist()
        st.dataframe(df_vb[_cols_show], use_container_width=True, hide_index=True)

    # ── Oportunidades ──────────────────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    section_header(f"OPORTUNIDADES DE CAPTACIÓN — {_vb_partido_sel}", PURPLE)
    _opps = _cc_oportunidades(_vb_partido_sel) if _HAY_DATOS_CAMPANA else []
    if _opps:
        _df_opps = pd.DataFrame(_opps)
        st.dataframe(_df_opps, use_container_width=True, hide_index=True)
    else:
        st.caption("Oportunidades disponibles tras cargar encuestas recientes.")

    # ── Recomendaciones de mensajes ────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    section_header(f"TEMAS RECOMENDADOS — {_vb_partido_sel}", CYAN)
    _recs = _cc_recomendar(_vb_partido_sel, top_n=5) if _HAY_DATOS_CAMPANA else []
    if _recs:
        _df_recs = pd.DataFrame(_recs)
        st.dataframe(_df_recs, use_container_width=True, hide_index=True)
    else:
        st.caption("Recomendaciones disponibles tras cargar nowcast electoral.")


# ═══════════════════════════════════════════════════════════════════════════════
with tab_coord:
    import datetime as _dt
    section_header("COORDINACIÓN DE CAMPAÑA", AMBER)

    # ── KPIs de equipo ────────────────────────────────────────────────────────
    kc1, kc2, kc3, kc4 = st.columns(4)
    with kc1:
        st.markdown(kpi_card("Equipos activos", "8", color=AMBER), unsafe_allow_html=True)
    with kc2:
        st.markdown(kpi_card("Voluntarios", "342", color=GREEN), unsafe_allow_html=True)
    with kc3:
        st.markdown(kpi_card("Eventos programados", "27", color=CYAN), unsafe_allow_html=True)
    with kc4:
        st.markdown(kpi_card("Mensajes pilares", "5", color=PURPLE), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_gantt, col_pillars = st.columns([3, 2])

    with col_gantt:
        section_header("CALENDARIO DE CAMPAÑA — GANTT", CYAN)

        _today = _dt.date.today()
        _base = _today - _dt.timedelta(days=7)

        _tareas = [
            {"tarea": "Arranque digital", "equipo": "Digital",
             "ini": 0, "dur": 5, "color": CYAN},
            {"tarea": "Gira provincial norte", "equipo": "Logistica",
             "ini": 2, "dur": 8, "color": BLUE},
            {"tarea": "Debate candidatos", "equipo": "Comunicacion",
             "ini": 5, "dur": 1, "color": RED},
            {"tarea": "Publicidad TV/Radio", "equipo": "Media",
             "ini": 4, "dur": 12, "color": AMBER},
            {"tarea": "Movilizacion RRSS", "equipo": "Digital",
             "ini": 1, "dur": 20, "color": PURPLE},
            {"tarea": "Contacto puerta a puerta", "equipo": "Terreno",
             "ini": 7, "dur": 10, "color": GREEN},
            {"tarea": "Mitin central Madrid", "equipo": "Logistica",
             "ini": 14, "dur": 1, "color": RED},
            {"tarea": "Cierre de campaña", "equipo": "Comunicacion",
             "ini": 18, "dur": 2, "color": AMBER},
        ]

        fig_gantt = go.Figure()
        for i, t in enumerate(_tareas):
            x_ini = (_base + _dt.timedelta(days=t["ini"])).isoformat()
            x_fin = (_base + _dt.timedelta(days=t["ini"] + t["dur"])).isoformat()
            fig_gantt.add_trace(go.Bar(
                name=t["equipo"],
                y=[t["tarea"]],
                x=[t["dur"]],
                base=[x_ini],
                orientation="h",
                marker_color=hex_to_rgba(t["color"], 0.80),
                hovertemplate=(
                    f"<b>{t['tarea']}</b><br>"
                    f"Equipo: {t['equipo']}<br>"
                    f"Inicio: {x_ini}<br>"
                    f"Duracion: {t['dur']} dias<extra></extra>"
                ),
                showlegend=False,
            ))

        # Linea "hoy"
        fig_gantt.add_vline(
            x=_today.isoformat(), line_dash="dot",
            line_color=RED, opacity=0.7,
        )
        fig_gantt.add_annotation(
            x=_today.isoformat(), y=len(_tareas) - 0.5,
            text="HOY", showarrow=False,
            font=dict(color=RED, size=9),
            bgcolor=BG2, bordercolor=RED, borderwidth=1,
        )

        fig_gantt.update_layout(
            barmode="overlay",
            height=320,
            paper_bgcolor=BG2,
            plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(
                type="date", color=TEXT2,
                gridcolor=BORDER, tickfont=dict(size=10),
            ),
            yaxis=dict(color=TEXT, autorange="reversed", tickfont=dict(size=10)),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_gantt, use_container_width=True, config={"displayModeBar": False})

    with col_pillars:
        section_header("PILARES MENSAJEROS", PURPLE)

        _pilares = [
            {"pilar": "Economia y empleo", "estado": "Activo", "reach_k": 2800, "pct": 88, "color": GREEN},
            {"pilar": "Sanidad publica", "estado": "Activo", "reach_k": 2100, "pct": 74, "color": GREEN},
            {"pilar": "Vivienda asequible", "estado": "Activo", "reach_k": 1950, "pct": 69, "color": AMBER},
            {"pilar": "Seguridad y orden", "estado": "Revision", "reach_k": 1400, "pct": 52, "color": AMBER},
            {"pilar": "Politica exterior", "estado": "Pendiente", "reach_k": 620, "pct": 31, "color": RED},
        ]

        for p in _pilares:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.75rem 1rem;margin-bottom:.5rem;border-left:3px solid {p['color']}">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                <span style="font-size:.85rem;font-weight:700;color:{TEXT}">{p['pilar']}</span>
                <span style="background:{p['color']}22;color:{p['color']};border-radius:4px;
                             padding:.1rem .45rem;font-size:.65rem;font-weight:700">{p['estado']}</span>
              </div>
              <div style="height:5px;background:{BORDER};border-radius:3px;margin-bottom:.35rem">
                <div style="width:{p['pct']}%;height:5px;border-radius:3px;background:{p['color']}"></div>
              </div>
              <div style="font-size:.68rem;color:{MUTED}">Alcance estimado: {p['reach_k']:,}K impresiones</div>
            </div>
            """, unsafe_allow_html=True)

    # ── Asignación de equipos ─────────────────────────────────────────────────
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("ASIGNACION DE EQUIPOS", AMBER)

    _equipos_data = {
        "Equipo": ["Digital", "Comunicacion", "Logistica", "Terreno",
                   "Media", "Datos & Analitica", "Legal", "Finanzas"],
        "Responsable": ["M. Garcia", "A. Lopez", "R. Martinez", "S. Fernandez",
                        "C. Ruiz", "P. Sanchez", "L. Torres", "J. Navarro"],
        "Voluntarios": [45, 12, 38, 124, 8, 6, 4, 5],
        "Tareas activas": [14, 9, 11, 22, 6, 8, 3, 4],
        "Completado %": [72, 65, 58, 41, 80, 88, 95, 76],
        "Estado": ["OK", "OK", "OK", "Alerta", "OK", "OK", "OK", "OK"],
    }
    df_eq = pd.DataFrame(_equipos_data)
    st.dataframe(
        df_eq,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Completado %": st.column_config.ProgressColumn(
                "Completado %", min_value=0, max_value=100, format="%d%%"
            ),
        },
    )


with tab_ops:
    import datetime as _dt2
    section_header("CENTRO DE OPERACIONES", CYAN)

    # ── Countdown ─────────────────────────────────────────────────────────────
    _election_date = _dt2.date(2026, 5, 31)
    _days_left = (_election_date - _dt2.date.today()).days

    col_cd1, col_cd2, col_cd3, col_cd4 = st.columns(4)
    with col_cd1:
        _color_cd = RED if _days_left <= 7 else AMBER if _days_left <= 21 else CYAN
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {_color_cd}55;border-radius:14px;
                    padding:1.2rem;text-align:center">
          <div style="font-size:.65rem;color:{_color_cd};font-weight:700;text-transform:uppercase;
                      letter-spacing:.1em;margin-bottom:.3rem">DIAS PARA ELECCIONES</div>
          <div style="font-size:2.8rem;font-weight:900;color:{_color_cd};font-family:monospace;
                      line-height:1">{_days_left}</div>
          <div style="font-size:.7rem;color:{MUTED};margin-top:.3rem">{_election_date.strftime('%d %b %Y')}</div>
        </div>
        """, unsafe_allow_html=True)
    with col_cd2:
        st.markdown(kpi_card("Puertas contactadas", "18,450", color=GREEN), unsafe_allow_html=True)
    with col_cd3:
        st.markdown(kpi_card("Voluntarios movilizados", "342 / 500", color=AMBER), unsafe_allow_html=True)
    with col_cd4:
        st.markdown(kpi_card("Colegios cubiertos", "74%", color=CYAN), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_ops_l, col_ops_r = st.columns([3, 2])

    with col_ops_l:
        section_header("SIMULACION RESULTADOS EN TIEMPO REAL", CYAN)

        # Simulacion escenarios resultado election day
        import numpy as _np
        _np.random.seed(42)
        _partidos_sim = ["PP", "PSOE", "VOX", "SUMAR", "JUNTS", "PNV", "Bildu", "Otros"]
        _base_voto = [33.2, 27.4, 12.1, 9.8, 5.6, 3.2, 2.4, 6.3]

        _n_colegios_rep = [0, 5, 12, 28, 47, 63, 81, 94, 100]
        _horas = [f"{8+i}:00" for i in range(len(_n_colegios_rep))]

        fig_rt = go.Figure()
        _colores_partidos_local = {
            "PP": "#1e7fd4", "PSOE": "#e84c4c", "VOX": "#5aba3f",
            "SUMAR": "#9b59b6", "JUNTS": "#f2a622", "PNV": "#3daf2c",
            "Bildu": "#00b89f", "Otros": "#888888",
        }
        for partido, base in zip(_partidos_sim[:5], _base_voto[:5]):
            _curve = []
            for pct_escrutado in _n_colegios_rep:
                _noise = _np.random.normal(0, max(0.1, (100 - pct_escrutado) * 0.04))
                _curve.append(round(base + _noise, 2))
            fig_rt.add_trace(go.Scatter(
                x=_horas, y=_curve,
                name=partido,
                mode="lines+markers",
                line=dict(color=_colores_partidos_local.get(partido, CYAN), width=2),
                marker=dict(size=5),
                hovertemplate=f"<b>{partido}</b><br>%{{x}}: %{{y:.1f}}%<extra></extra>",
            ))

        fig_rt.update_layout(
            height=280,
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER, title="Hora escrutinio"),
            yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%", title="% Voto"),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.18,
                        font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_rt, use_container_width=True, config={"displayModeBar": False})
        st.caption("Demo — simulacion de escrutinio progresivo")

        # Barra de escrutinio
        _pct_escrut = 63
        st.markdown(f"""
        <div style="margin-top:.5rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
            <span style="font-size:.75rem;color:{TEXT2}">Escrutinio</span>
            <span style="font-size:.75rem;font-weight:700;color:{CYAN}">{_pct_escrut}%</span>
          </div>
          <div style="height:8px;background:{BORDER};border-radius:4px">
            <div style="width:{_pct_escrut}%;height:8px;border-radius:4px;
                        background:linear-gradient(90deg,{CYAN},{BLUE})"></div>
          </div>
        </div>
        """, unsafe_allow_html=True)

    with col_ops_r:
        section_header("MOVILIZACION VOLUNTARIOS", GREEN)

        _provincias = ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza",
                       "Malaga", "Bilbao", "Alicante"]
        _vol_asig = [85, 72, 58, 61, 34, 29, 22, 18]
        _vol_max = [100, 90, 70, 75, 45, 40, 30, 25]

        fig_vol = go.Figure()
        fig_vol.add_trace(go.Bar(
            name="Objetivo",
            x=_provincias,
            y=_vol_max,
            marker_color=hex_to_rgba(BORDER, 0.50),
            showlegend=True,
        ))
        fig_vol.add_trace(go.Bar(
            name="Desplegados",
            x=_provincias,
            y=_vol_asig,
            marker_color=[GREEN if v / m >= 0.75 else AMBER if v / m >= 0.5 else RED
                          for v, m in zip(_vol_asig, _vol_max)],
            showlegend=True,
        ))
        fig_vol.update_layout(
            barmode="overlay",
            height=220,
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, tickfont=dict(size=9)),
            yaxis=dict(color=TEXT2, gridcolor=BORDER),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.20,
                        font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_vol, use_container_width=True, config={"displayModeBar": False})

        section_header("KPIs PUERTA A PUERTA", AMBER)

        _dap_data = [
            {"zona": "Madrid Norte", "contactos": 3420, "positivos": 62, "meta": 5000},
            {"zona": "Madrid Sur", "contactos": 2810, "positivos": 58, "meta": 4500},
            {"zona": "Valencia Este", "contactos": 1940, "positivos": 71, "meta": 3000},
            {"zona": "Sevilla Centro", "contactos": 1650, "positivos": 54, "meta": 2500},
        ]
        for d in _dap_data:
            _pct_meta = min(100, int(d["contactos"] / d["meta"] * 100))
            _c = GREEN if _pct_meta >= 80 else AMBER if _pct_meta >= 50 else RED
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                        padding:.6rem .9rem;margin-bottom:.4rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:.25rem">
                <span style="font-size:.78rem;font-weight:700;color:{TEXT}">{d['zona']}</span>
                <span style="font-size:.72rem;color:{_c};font-weight:700">{_pct_meta}% meta</span>
              </div>
              <div style="height:4px;background:{BORDER};border-radius:2px;margin-bottom:.25rem">
                <div style="width:{_pct_meta}%;height:4px;border-radius:2px;background:{_c}"></div>
              </div>
              <div style="font-size:.65rem;color:{MUTED}">
                {d['contactos']:,} contactos · {d['positivos']}% positivos
              </div>
            </div>
            """, unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# TAB: TERRITORIAL (Bloque 7)
# ═══════════════════════════════════════════════════════════════════════════════
with tab_territorial:
    section_header("PRIORIDAD DE CAMPAÑA POR TERRITORIO", AMBER)
    st.caption("Ranking de provincias por score de campaña · Combina swing electoral, voto blando, stress económico e intensidad mediática")

    try:
        from dashboard.services.territorial_core import (
            cargar_ranking_prioridad_campana,
            cargar_geometrias,
            cargar_senales_territoriales,
        )
        from dashboard.components.province_cards import render_hot_territories_cards
        from dashboard.components.choropleth_map import render_choropleth

        _ranking_df = cargar_ranking_prioridad_campana(territory_type="province", top_n=15)
        _geojson_n5 = cargar_geometrias(territory_type="province", resolution="low")

        _col_map_n5, _col_cards_n5 = st.columns([3, 2])

        with _col_map_n5:
            if not _ranking_df.empty and "campaign_priority" in _ranking_df.columns:
                render_choropleth(
                    geojson=_geojson_n5,
                    data=_ranking_df,
                    territory_id_col="territory_id",
                    value_col="campaign_priority",
                    label_col="name" if "name" in _ranking_df.columns else "territory_id",
                    title="Score de prioridad de campaña por provincia",
                    color_scale="priority",
                    height=450,
                )
            else:
                st.info("No hay datos de prioridad territorial disponibles.")

        with _col_cards_n5:
            render_hot_territories_cards(
                df=_ranking_df.head(6) if not _ranking_df.empty else pd.DataFrame(),
                title="Top 6 provincias prioritarias",
                n_cols=2,
                show_signals=False,
            )

        # Señales territoriales por tipo de campaña
        st.markdown("---")
        section_header("SEÑALES ACTIVAS DE CAMPAÑA", CYAN)
        _sigs_n5 = cargar_senales_territoriales(
            signal_type="campaign_priority",
            min_severity="HIGH",
            days_back=7,
            limit=10,
        )
        if not _sigs_n5.empty:
            st.dataframe(
                _sigs_n5[["territory_id", "value", "severity", "explanation"]].head(10),
                hide_index=True,
                use_container_width=True,
            )
        else:
            _sigs_swing = cargar_senales_territoriales(
                signal_type="soft_vote_opportunity",
                min_severity="MEDIUM",
                days_back=7,
                limit=10,
            )
            if not _sigs_swing.empty:
                st.dataframe(
                    _sigs_swing[["territory_id", "value", "severity", "explanation"]].head(10),
                    hide_index=True,
                    use_container_width=True,
                )
            else:
                st.caption("Sin señales de campaña con severidad MEDIUM o superior en los últimos 7 días.")

    except Exception as _e_terr:
        st.info(f"Módulo territorial no disponible: {_e_terr}")

