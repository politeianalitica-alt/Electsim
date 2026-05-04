"""
ELECTSIM — Inteligencia Política
Mega-página: Agentes IA + Perfiles + Opposition Research + Simulador Campaña + Grafo Político
Integra:
  - pydantic-ai: agentes estructurados tipados
  - Anthropic Claude: LLM para análisis
  - campaign_simulator + transfer_vectors + timing_model
  - opposition.py: contradicciones, declaraciones
  - pysentimiento: análisis de discurso
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

st.set_page_config(
    page_title="Inteligencia — ElectSim",
    page_icon="",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("inteligencia")

# ── Imports de servicios ──────────────────────────────────────────────────────
try:
    from dashboard.services import llm_narrativas as _llm
    _LLM_OK = True
except Exception:
    _LLM_OK = False

try:
    from dashboard.services.campaign_simulator import simular_impacto_tema
    from dashboard.models.voter_profiles import PERFILES, TEMAS_IMPACTO
    _SIM_OK = True
except Exception:
    _SIM_OK = False
    PERFILES = {}
    TEMAS_IMPACTO = []

try:
    from dashboard.services.opposition import buscar_contradicciones
    _OPP_OK = True
except Exception:
    _OPP_OK = False

# Session state
if "sim_tema_uso"not in st.session_state:
    st.session_state["sim_tema_uso"] = {}
if "intel_llm_cache"not in st.session_state:
    st.session_state["intel_llm_cache"] = {}

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{PURPLE},{BLUE});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0"></div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Inteligencia Política</h2>
    <div style="color:{TEXT2};font-size:.82rem">Agentes IA · Perfiles · Simulador · Opposition Research</div>
  </div>
  <div style="margin-left:auto">
    {'<span style="background:' + GREEN + '22;color:' + GREEN + ';border:1px solid ' + GREEN + '44;border-radius:20px;padding:.2rem .7rem;font-size:.7rem;font-weight:700">● Claude API activa</span>'if _LLM_OK and _llm.llm_disponible() else '<span style="background:' + AMBER + '22;color:' + AMBER + ';border:1px solid ' + AMBER + '44;border-radius:20px;padding:.2rem .7rem;font-size:.7rem;font-weight:700">! Sin API key</span>'}
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_perfiles, tab_simulador, tab_opp, tab_agente, tab_analisis = st.tabs([
    "Perfiles de Votante",
    "! Simulador Campaña",
    "Opposition Research",
    "Agente Estratégico",
    "Análisis de Discurso",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: PERFILES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_perfiles:
    # Intentar cargar desde el módulo Agentes LLM clásico
    try:
        from pages.N5_Campana import _render_perfiles_tab  # type: ignore
    except ImportError:
        pass

    section_header("PERFILES DE VOTANTE — SEGMENTACIÓN CIS", CYAN)

    # DataSourceStatus
    try:
        obtener_oleada = getattr(_db, "obtener_oleada_activa", lambda fuente="CIS": {})
        oleada_info = obtener_oleada("CIS")
        if oleada_info:
            oleada_id = oleada_info.get("oleada", "—")
            n_reg = oleada_info.get("n_registros", 0)
            fecha_d = oleada_info.get("fecha_datos", "—")
            st.markdown(f"""
            <div style="background:{GREEN}12;border:1px solid {GREEN}33;border-radius:8px;
                        padding:.6rem 1rem;margin-bottom:.8rem;font-size:.78rem;color:{GREEN}">
              Perfiles CIS — Oleada {oleada_id} | {n_reg:,} registros | {fecha_d}
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div style="background:{BLUE}12;border:1px solid {BLUE}33;border-radius:8px;
                        padding:.6rem 1rem;margin-bottom:.8rem;font-size:.78rem;color:{CYAN}">
              ℹ Usando perfiles sintéticos calibrados.
              Para perfiles reales, sube el fichero SAV del CIS en la sección de Microdatos.
            </div>
            """, unsafe_allow_html=True)
    except Exception:
        pass

    # Render perfiles
    if not PERFILES:
        st.info("No hay perfiles cargados. Comprueba `dashboard/models/voter_profiles.py`.")
    else:
        cols_perfiles = st.columns(min(3, len(PERFILES)))
        for i, (nombre, perfil) in enumerate(PERFILES.items()):
            with cols_perfiles[i % len(cols_perfiles)]:
                peso = perfil.get("peso_electoral", 0) if isinstance(perfil, dict) else getattr(perfil, "peso_electoral", 0)
                ideo = perfil.get("ideologia", "—") if isinstance(perfil, dict) else getattr(perfil, "ideologia", "—")
                preoc = perfil.get("preocupaciones", []) if isinstance(perfil, dict) else getattr(perfil, "preocupaciones", [])
                partido_lider = perfil.get("partido_lider", "—") if isinstance(perfil, dict) else getattr(perfil, "partido_lider", "—")

                color_p = COLORES_PARTIDOS.get(partido_lider, CYAN)
                preoc_html = ""
                if preoc:
                    chips = "".join(
                        f'<span style="background:{BORDER};color:{TEXT2};border-radius:4px;'
                        f'padding:.1rem .4rem;font-size:.62rem">{p[:20]}</span>'
                        for p in (preoc[:3] if isinstance(preoc, list) else [])
                    )
                    preoc_html = f'<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.4rem">{chips}</div>'

                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;
                            padding:1rem;border-top:3px solid {color_p};margin-bottom:.5rem">
                  <div style="font-size:1rem;font-weight:800;color:{TEXT};margin-bottom:.3rem">
                    {nombre}
                  </div>
                  <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
                    <span style="font-size:.72rem;color:{MUTED}">{ideo}</span>
                    <span style="background:{color_p}22;color:{color_p};border-radius:4px;
                                 padding:.1rem .5rem;font-size:.7rem;font-weight:700">{partido_lider}</span>
                  </div>
                  <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden;margin-bottom:.3rem">
                    <div style="width:{min(100, peso)}%;height:100%;background:{color_p}"></div>
                  </div>
                  <div style="font-size:.65rem;color:{MUTED}">{peso:.1f}% del electorado</div>
                  {preoc_html}
                </div>
                """, unsafe_allow_html=True)

                # Botón análisis IA
                _key_llm = f"perfil_llm_{nombre}"
                if _LLM_OK and _llm.llm_disponible():
                    if st.button(f"Análisis IA", key=f"btn_llm_{nombre}"):
                        with st.spinner("Analizando..."):
                            cohorte = perfil.get("cohorte", "") if isinstance(perfil, dict) else ""
                            resp = _llm.narrativa_perfil(
                                nombre=nombre, ideologia=ideo,
                                peso_pct=peso, preocupaciones=preoc if isinstance(preoc, list) else [],
                                partido_lider=partido_lider, cohorte=cohorte,
                            )
                            st.session_state["intel_llm_cache"][_key_llm] = resp

                cached = st.session_state["intel_llm_cache"].get(_key_llm)
                if cached:
                    with st.expander("Ver análisis IA", expanded=False):
                        st.markdown(cached)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: SIMULADOR DE CAMPAÑA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_simulador:
    section_header("SIMULADOR DE IMPACTO DE CAMPAÑA", CYAN)

    if not _SIM_OK:
        st.warning("Simulador no disponible — comprueba `dashboard/services/campaign_simulator.py`")
        st.page_link("pages/5_Agentes_LLM.py", label="→ Simulador clásico")
    else:
        col_sim1, col_sim2 = st.columns([1, 2], gap="large")
        with col_sim1:
            partido_sel = st.selectbox(
                "Partido emisor",
                options=list(COLORES_PARTIDOS.keys())[:8],
                key="sim_partido",
            )
            tema_sel = st.selectbox(
                "Tema de campaña",
                options=TEMAS_IMPACTO if TEMAS_IMPACTO else ["Bajada de impuestos a clase media"],
                key="sim_tema",
            )
            semana_sel = st.slider("Semana de campaña (1=inicio, 7=final)", 1, 7, 3, key="sim_semana")
            veces_usado = st.session_state["sim_tema_uso"].get(tema_sel, 0)

            # Badges timing y saturación
            try:
                from dashboard.models.timing_model import timing_weight, saturation_decay
                tw = timing_weight(semana_sel)
                sd = saturation_decay(veces_usado)
                tw_color = GREEN if tw >= 0.8 else (AMBER if tw >= 0.5 else RED)
                sd_color = GREEN if sd >= 0.8 else (AMBER if sd >= 0.5 else RED)
                st.markdown(f"""
                <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin:.5rem 0">
                  <span style="background:{tw_color}22;color:{tw_color};border:1px solid {tw_color}44;
                               border-radius:20px;padding:.2rem .7rem;font-size:.72rem;font-weight:700">
                     Timing {tw:.0%}
                  </span>
                  <span style="background:{sd_color}22;color:{sd_color};border:1px solid {sd_color}44;
                               border-radius:20px;padding:.2rem .7rem;font-size:.72rem;font-weight:700">
                     Saturación {sd:.0%} (×{veces_usado+1})
                  </span>
                </div>
                """, unsafe_allow_html=True)
            except Exception:
                pass

            simular = st.button("▶ Simular impacto", type="primary", key="btn_simular")

        with col_sim2:
            if simular or st.session_state.get("sim_ultimo_resultado"):
                if simular:
                    with st.spinner("Simulando..."):
                        try:
                            resultado = simular_impacto_tema(
                                tema=tema_sel,
                                partido_emisor=partido_sel,
                                perfiles_unificados=PERFILES,
                                semana_campana=semana_sel,
                                veces_tema_usado=veces_usado,
                            )
                            st.session_state["sim_ultimo_resultado"] = resultado
                            st.session_state["sim_tema_uso"][tema_sel] = veces_usado + 1
                        except Exception as exc:
                            st.error(f"Error en simulación: {exc}")
                            resultado = None
                else:
                    resultado = st.session_state.get("sim_ultimo_resultado")

                if resultado:
                    impactos = resultado.get("impactos_partido", {})
                    sankey_data = resultado.get("sankey_data", {})

                    # Gráfico de impactos
                    if impactos:
                        df_imp = pd.DataFrame([
                            {"partido": p, "impacto": v}
                            for p, v in sorted(impactos.items(), key=lambda x: abs(x[1]), reverse=True)
                            if v != 0
                        ])
                        fig_imp = go.Figure(go.Bar(
                            x=df_imp["partido"],
                            y=df_imp["impacto"],
                            marker_color=[
                                GREEN if v > 0 else RED
                                for v in df_imp["impacto"]
                            ],
                            text=[f"{v:+.2f}pp"for v in df_imp["impacto"]],
                            textposition="outside",
                            textfont=dict(color=TEXT, size=11),
                            hovertemplate="<b>%{x}</b><br>%{y:+.2f}pp<extra></extra>",
                        ))
                        fig_imp.update_layout(
                            height=260, title=dict(
                                text=f"Impacto: {tema_sel[:40]}",
                                font=dict(size=12, color=TEXT), x=0.5
                            ),
                            paper_bgcolor=BG2, plot_bgcolor=BG2,
                            margin=dict(t=35, b=10, l=10, r=10),
                            xaxis=dict(color=TEXT, tickfont=dict(size=11)),
                            yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="pp"),
                        )
                        st.plotly_chart(fig_imp, use_container_width=True,
                                       config={"displayModeBar": False})

                    # Sankey de transferencias
                    if sankey_data and sankey_data.get("labels"):
                        try:
                            fig_sk = go.Figure(go.Sankey(
                                arrangement="snap",
                                node=dict(
                                    pad=12, thickness=18,
                                    label=sankey_data["labels"],
                                    color=[COLORES_PARTIDOS.get(l, "#666")
                                           for l in sankey_data["labels"]],
                                ),
                                link=dict(
                                    source=sankey_data["source"],
                                    target=sankey_data["target"],
                                    value=sankey_data["value"],
                                    color=["rgba(0,212,255,0.200)"] * len(sankey_data["value"]),
                                ),
                            ))
                            fig_sk.update_layout(
                                height=220,
                                paper_bgcolor=BG3, margin=dict(t=5, b=5, l=5, r=5),
                                font=dict(color=TEXT2, size=11),
                            )
                            st.plotly_chart(fig_sk, use_container_width=True,
                                           config={"displayModeBar": False})
                        except Exception:
                            pass

                    # Análisis LLM
                    if _LLM_OK and _llm.llm_disponible():
                        if st.button("Análisis estratégico IA", key="btn_sim_llm"):
                            with st.spinner("Generando análisis..."):
                                _key_sim = f"sim_llm_{tema_sel}_{partido_sel}"
                                resp = _llm.narrativa_impacto_campana(
                                    tema=tema_sel,
                                    partido_emisor=partido_sel,
                                    impactos=impactos,
                                    perfiles_afectados=list(PERFILES.keys()),
                                )
                                st.session_state["intel_llm_cache"][_key_sim] = resp
                        cached_sim = st.session_state["intel_llm_cache"].get(
                            f"sim_llm_{tema_sel}_{partido_sel}"
                        )
                        if cached_sim:
                            with st.expander("Análisis estratégico", expanded=True):
                                st.markdown(cached_sim)
            else:
                st.markdown(f"""
                <div style="background:{BG3};border:1px dashed {BORDER};border-radius:12px;
                            padding:2.5rem;text-align:center;color:{MUTED}">
                  <div style="font-size:2rem;margin-bottom:.5rem">!</div>
                  <div>Configura un escenario y pulsa <strong>Simular impacto</strong></div>
                </div>
                """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: OPPOSITION RESEARCH
# ═══════════════════════════════════════════════════════════════════════════════
with tab_opp:
    section_header("OPPOSITION RESEARCH — CONTRADICCIONES Y DECLARACIONES", PURPLE)

    # Cargar datos de opposition
    @st.cache_data(ttl=300)
    def _cargar_opp():
        try:
            conn = _db.get_conn()
            declaraciones = pd.read_sql(
                "SELECT persona, partido, fecha, texto, tema_principal, alcance_est "
                "FROM declaraciones_politicas ORDER BY fecha DESC LIMIT 50",
                conn
            )
        except Exception:
            declaraciones = pd.DataFrame()
        try:
            conn = _db.get_conn()
            contradicciones = pd.read_sql(
                "SELECT d1.persona, d1.texto as texto_antes, d2.texto as texto_despues, "
                "c.score_nli, c.verificada, c.dias_entre "
                "FROM contradicciones c "
                "JOIN declaraciones_politicas d1 ON c.declaracion_id_1=d1.id "
                "JOIN declaraciones_politicas d2 ON c.declaracion_id_2=d2.id "
                "ORDER BY c.score_nli DESC LIMIT 20",
                conn
            )
        except Exception:
            contradicciones = pd.DataFrame()
        return declaraciones, contradicciones

    df_decl, df_contra = _cargar_opp()

    tab_opp_d, tab_opp_c = st.tabs(["Declaraciones", "Contradicciones"])

    with tab_opp_d:
        if df_decl.empty:
            # Demo declaraciones cuando no hay BD
            _demo_decl = [
                {"persona": "Alberto Nunez Feijoo", "partido": "PP", "fecha": "2026-04-28",
                 "texto": "El gobierno de Sanchez ha llevado a la ruina la economia espanola con sus politicas de gasto descontrolado. Necesitamos reducir impuestos y apostar por el empleo privado.",
                 "tema_principal": "economia", "alcance_est": 1240000},
                {"persona": "Pedro Sanchez", "partido": "PSOE", "fecha": "2026-04-27",
                 "texto": "Hemos creado mas de 500.000 empleos en el ultimo ano. La derecha quiere desmantelar el estado del bienestar y privatizar la sanidad publica.",
                 "tema_principal": "economia", "alcance_est": 980000},
                {"persona": "Santiago Abascal", "partido": "VOX", "fecha": "2026-04-26",
                 "texto": "La politica de inmigracion del gobierno es un fracaso absoluto. Exigimos el control de nuestras fronteras y la deportacion inmediata de ilegales.",
                 "tema_principal": "migracion", "alcance_est": 760000},
                {"persona": "Yolanda Diaz", "partido": "SUMAR", "fecha": "2026-04-25",
                 "texto": "Vamos a subir el salario minimo a 1.300 euros. Las grandes empresas deben pagar su parte justa de impuestos.",
                 "tema_principal": "laboral", "alcance_est": 540000},
                {"persona": "Alberto Nunez Feijoo", "partido": "PP", "fecha": "2026-04-22",
                 "texto": "Espana necesita un gobierno serio que baje el IRPF a las clases medias y facilite el acceso a la vivienda.",
                 "tema_principal": "vivienda", "alcance_est": 890000},
                {"persona": "Pedro Sanchez", "partido": "PSOE", "fecha": "2026-04-20",
                 "texto": "Nuestra ley de vivienda protege a los inquilinos frente a los especuladores. Construiremos 40.000 viviendas de proteccion oficial.",
                 "tema_principal": "vivienda", "alcance_est": 720000},
                {"persona": "Carles Puigdemont", "partido": "JUNTS", "fecha": "2026-04-19",
                 "texto": "Catalunya debe decidir su futuro. Seguiremos negociando con el gobierno hasta conseguir el referendum pactado.",
                 "tema_principal": "territorial", "alcance_est": 480000},
                {"persona": "Yolanda Diaz", "partido": "SUMAR", "fecha": "2026-04-18",
                 "texto": "La jornada de 37.5 horas es irrenunciable. La conciliacion familiar es una cuestion de justicia social.",
                 "tema_principal": "laboral", "alcance_est": 410000},
            ]
            df_decl_demo = pd.DataFrame(_demo_decl)
            _col_fa, _col_fb, _col_fc = st.columns(3)
            with _col_fa:
                _partido_f2 = st.selectbox("Partido", ["Todos"] + sorted(df_decl_demo["partido"].unique().tolist()), key="opp_partido_demo")
            with _col_fb:
                _tema_f2 = st.selectbox("Tema", ["Todos"] + sorted(df_decl_demo["tema_principal"].unique().tolist()), key="opp_tema_demo")
            with _col_fc:
                _persona_f2 = st.text_input("Buscar persona", placeholder="ej. Feijoo", key="opp_persona_demo")

            _df_filtered = df_decl_demo.copy()
            if _partido_f2 != "Todos":
                _df_filtered = _df_filtered[_df_filtered["partido"] == _partido_f2]
            if _tema_f2 != "Todos":
                _df_filtered = _df_filtered[_df_filtered["tema_principal"] == _tema_f2]
            if _persona_f2:
                _df_filtered = _df_filtered[_df_filtered["persona"].str.contains(_persona_f2, case=False, na=False)]

            for _, row in _df_filtered.iterrows():
                _partido = str(row.get("partido", ""))
                _color_p = {"PP": "#1e7fd4", "PSOE": "#e84c4c", "VOX": "#5aba3f",
                            "SUMAR": "#9b59b6", "JUNTS": "#f2a622"}.get(_partido, CYAN)
                _alcance = int(row.get("alcance_est", 0) or 0)
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                            padding:.9rem 1.1rem;margin-bottom:.5rem;border-left:3px solid {_color_p}">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                    <div>
                      <span style="font-size:.85rem;font-weight:800;color:{TEXT}">{row.get('persona','')}</span>
                      <span style="margin-left:.5rem;background:{_color_p}22;color:{_color_p};
                                   border-radius:4px;padding:.1rem .4rem;font-size:.7rem;font-weight:700">{_partido}</span>
                    </div>
                    <div style="text-align:right">
                      <span style="font-size:.68rem;color:{MUTED}">{row.get('fecha','')}</span>
                      {f'<span style="font-size:.65rem;color:{MUTED};margin-left:.5rem">{_alcance:,} impresiones</span>' if _alcance else ''}
                    </div>
                  </div>
                  <div style="font-size:.8rem;color:{TEXT2};line-height:1.5">"{row.get('texto','')}"</div>
                  <div style="margin-top:.3rem">
                    <span style="background:{BORDER};color:{TEXT2};border-radius:4px;
                                 padding:.05rem .4rem;font-size:.62rem">{row.get('tema_principal','')}</span>
                  </div>
                </div>
                """, unsafe_allow_html=True)
            st.caption("Datos demo — conecta la BD para datos reales")
        else:
            # Filtros
            col_fa, col_fb, col_fc = st.columns(3)
            with col_fa:
                partido_f = st.selectbox("Partido", ["Todos"] + sorted(df_decl["partido"].unique().tolist() if "partido"in df_decl.columns else []), key="opp_partido")
            with col_fb:
                tema_f = st.selectbox("Tema", ["Todos"] + sorted(df_decl["tema_principal"].unique().tolist() if "tema_principal"in df_decl.columns else []), key="opp_tema")
            with col_fc:
                persona_f = st.text_input("Buscar persona", placeholder="ej. Feijóo", key="opp_persona")

            df_f = df_decl.copy()
            if partido_f != "Todos"and "partido"in df_f.columns:
                df_f = df_f[df_f["partido"] == partido_f]
            if tema_f != "Todos"and "tema_principal"in df_f.columns:
                df_f = df_f[df_f["tema_principal"] == tema_f]
            if persona_f and "persona"in df_f.columns:
                df_f = df_f[df_f["persona"].str.contains(persona_f, case=False, na=False)]

            # Tarjetas de declaraciones
            for _, row in df_f.head(10).iterrows():
                partido = str(row.get("partido", "—"))
                color_p = COLORES_PARTIDOS.get(partido, CYAN)
                persona = str(row.get("persona", "—"))
                fecha = str(row.get("fecha", "—"))[:10]
                texto = str(row.get("texto", ""))[:300]
                tema = str(row.get("tema_principal", ""))
                alcance = int(row.get("alcance_est", 0) or 0)

                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                            padding:.9rem 1.1rem;margin-bottom:.5rem;border-left:3px solid {color_p}">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                    <div>
                      <span style="font-size:.85rem;font-weight:800;color:{TEXT}">{persona}</span>
                      <span style="margin-left:.5rem;background:{color_p}22;color:{color_p};border-radius:4px;
                                   padding:.1rem .4rem;font-size:.7rem;font-weight:700">{partido}</span>
                    </div>
                    <div style="text-align:right">
                      <span style="font-size:.68rem;color:{MUTED}">{fecha}</span>
                      {f'<span style="font-size:.65rem;color:{MUTED};margin-left:.5rem"> {alcance:,}</span>'if alcance else ''}
                    </div>
                  </div>
                  <div style="font-size:.8rem;color:{TEXT2};line-height:1.5">"{texto}..."</div>
                  {f'<div style="margin-top:.3rem"><span style="background:{BORDER};color:{TEXT2};border-radius:4px;padding:.05rem .4rem;font-size:.62rem">{tema}</span></div>'if tema else ''}
                </div>
                """, unsafe_allow_html=True)

    with tab_opp_c:
        if df_contra.empty:
            # Demo contradicciones
            _demo_contra = [
                {
                    "persona": "Alberto Nunez Feijoo",
                    "texto_antes": "La subida del salario minimo es imprescindible para las clases mas vulnerables. (Galicia, 2019)",
                    "texto_despues": "La subida del SMI destruye empleo y pone en riesgo a las pequenas empresas. (Congreso, 2024)",
                    "score_nli": 0.87, "verificada": True, "dias_entre": 1826,
                },
                {
                    "persona": "Pedro Sanchez",
                    "texto_antes": "Nunca pactare con Bildu ni con los independentistas para llegar al poder. (2019)",
                    "texto_despues": "Los acuerdos con todos los partidos democraticos son necesarios para la gobernabilidad. (2023)",
                    "score_nli": 0.81, "verificada": True, "dias_entre": 1460,
                },
                {
                    "persona": "Santiago Abascal",
                    "texto_antes": "El referéndum de autodeterminación es un derecho democratico que hay que respetar. (2013)",
                    "texto_despues": "La unidad de Espana es innegociable. No permitiremos ningun referéndum ilegal. (2024)",
                    "score_nli": 0.94, "verificada": False, "dias_entre": 4015,
                },
                {
                    "persona": "Yolanda Diaz",
                    "texto_antes": "No subiremos el IVA en ningun caso durante esta legislatura. (2021)",
                    "texto_despues": "Estamos analizando ajustes fiscales necesarios para financiar politicas sociales. (2023)",
                    "score_nli": 0.62, "verificada": False, "dias_entre": 730,
                },
            ]
            st.metric("Contradicciones detectadas (demo)", len(_demo_contra))
            for _c in _demo_contra:
                _score = float(_c.get("score_nli", 0))
                _ver = bool(_c.get("verificada", False))
                _dias = int(_c.get("dias_entre", 0))
                _color_s = GREEN if _score > 0.8 else (AMBER if _score > 0.5 else RED)
                with st.expander(
                    f"{_c['persona']} — Score {_score:.2f} {'(verificada)' if _ver else ''}"
                ):
                    _ca, _cb = st.columns(2)
                    with _ca:
                        st.markdown(f"""
                        <div style="background:{RED}10;border:1px solid {RED}33;border-radius:8px;padding:.8rem">
                          <div style="font-size:.7rem;color:{RED};font-weight:700;margin-bottom:.3rem">ANTES</div>
                          <div style="font-size:.8rem;color:{TEXT2}">{_c['texto_antes']}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with _cb:
                        st.markdown(f"""
                        <div style="background:{GREEN}10;border:1px solid {GREEN}33;border-radius:8px;padding:.8rem">
                          <div style="font-size:.7rem;color:{GREEN};font-weight:700;margin-bottom:.3rem">DESPUES ({_dias} dias)</div>
                          <div style="font-size:.8rem;color:{TEXT2}">{_c['texto_despues']}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    st.progress(_score, text=f"Indice de contradiccion NLI: {_score:.2%}")
            st.caption("Datos demo — conecta la BD para contradicciones reales")
        else:
            st.metric("Contradicciones encontradas", len(df_contra))
            for _, row in df_contra.iterrows():
                persona = str(row.get("persona", "—"))
                t_antes = str(row.get("texto_antes", ""))[:200]
                t_despues = str(row.get("texto_despues", ""))[:200]
                score = float(row.get("score_nli", 0) or 0)
                verificada = bool(row.get("verificada", False))
                dias = int(row.get("dias_entre", 0) or 0)

                color_s = GREEN if score > 0.8 else (AMBER if score > 0.5 else RED)

                with st.expander(f"{persona} — Score {score:.2f} {''if verificada else ''}"):
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.markdown(f"""
                        <div style="background:{RED}10;border:1px solid {RED}33;border-radius:8px;padding:.8rem">
                          <div style="font-size:.7rem;color:{RED};font-weight:700;margin-bottom:.3rem">ANTES</div>
                          <div style="font-size:.8rem;color:{TEXT2}">{t_antes}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    with col_b:
                        st.markdown(f"""
                        <div style="background:{GREEN}10;border:1px solid {GREEN}33;border-radius:8px;padding:.8rem">
                          <div style="font-size:.7rem;color:{GREEN};font-weight:700;margin-bottom:.3rem">DESPUÉS ({dias} días)</div>
                          <div style="font-size:.8rem;color:{TEXT2}">{t_despues}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    st.progress(score, text=f"Índice de contradicción NLI: {score:.2%}")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: AGENTE ESTRATÉGICO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_agente:
    section_header("AGENTE ESTRATÉGICO — CLAUDE AI", CYAN)

    if not _LLM_OK or not _llm.llm_disponible():
        st.markdown(f"""
        <div style="background:{AMBER}12;border:1px solid {AMBER}33;border-radius:12px;padding:1.5rem">
          <div style="font-size:1rem;font-weight:700;color:{AMBER};margin-bottom:.5rem">
            ! API Key no configurada
          </div>
          <div style="font-size:.85rem;color:{TEXT2}">
            Para usar el Agente Estratégico, configura <code>ANTHROPIC_API_KEY</code>
            en el archivo <code>.env</code> del proyecto.
          </div>
          <div style="margin-top:.8rem;font-size:.78rem;color:{MUTED}">
            El agente usa Claude claude-sonnet-4-5 para análisis estratégico electoral, narrativas de campaña
            y síntesis de escenarios. Sin API key, las funciones de IA están deshabilitadas
            pero todas las demás funcionalidades del dashboard siguen operativas.
          </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        # Interfaz del agente
        _prompt_tipos = {
            "Análisis de escenario electoral": "Analiza el escenario electoral actual en España. "
                "¿Cuáles son los principales vectores de riesgo y oportunidad para cada partido?",
            "Estrategia de campaña": "Diseña una estrategia de campaña para las próximas 4 semanas. "
                "¿En qué temas debe enfocarse el partido para maximizar su voto?",
            "Análisis de coaliciones": "¿Qué coalición de gobierno es más probable después de las elecciones? "
                "Analiza la viabilidad política e ideológica de cada opción.",
            "Narrativa de comunicación": "Desarrolla mensajes clave y narrativas de comunicación "
                "para conectar con los principales segmentos de votantes.",
            "Pregunta personalizada": "",
        }
        tipo_prompt = st.selectbox("Tipo de análisis", list(_prompt_tipos.keys()), key="agente_tipo")
        if tipo_prompt == "Pregunta personalizada":
            prompt_txt = st.text_area("Tu pregunta estratégica", height=100, key="agente_custom")
        else:
            prompt_txt = _prompt_tipos[tipo_prompt]
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                        padding:.8rem 1rem;font-size:.82rem;color:{TEXT2};margin:.5rem 0">
              {prompt_txt}
            </div>
            """, unsafe_allow_html=True)

        partido_ctx = st.selectbox("Contexto de partido", ["PP", "PSOE", "VOX", "SUMAR", "Independiente"],
                                   key="agente_partido")

        if st.button("Ejecutar análisis", type="primary", key="btn_agente"):
            _cache_key = f"agente_{tipo_prompt}_{partido_ctx}"
            if _cache_key not in st.session_state["intel_llm_cache"]:
                with st.spinner("Consultando Claude AI..."):
                    contexto_sistema = (
                        f"Eres un analista electoral especializado en política española. "
                        f"Tu análisis es para el equipo de {partido_ctx}. "
                        "Sé conciso, estratégico y basado en datos. Usa español castellano."
                    )
                    resp = _llm._llamar(prompt_txt, max_tokens=1200, system=contexto_sistema)
                    st.session_state["intel_llm_cache"][_cache_key] = resp
            else:
                resp = st.session_state["intel_llm_cache"][_cache_key]

            if resp:
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {CYAN}33;border-radius:12px;
                            padding:1.5rem;margin-top:.5rem;border-left:4px solid {CYAN}">
                  <div style="font-size:.65rem;color:{CYAN};font-weight:700;letter-spacing:.1em;
                               text-transform:uppercase;margin-bottom:.8rem">
                    Análisis · Claude claude-sonnet-4-5
                  </div>
                  <div style="font-size:.88rem;color:{TEXT};line-height:1.7">
                """, unsafe_allow_html=True)
                st.markdown(resp)
                st.markdown("</div></div>", unsafe_allow_html=True)
            else:
                st.warning("Sin respuesta del modelo")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: ANÁLISIS DE DISCURSO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_analisis:
    section_header("ANÁLISIS NLP DEL DISCURSO POLÍTICO", PURPLE)

    try:
        from dashboard.services.nlp_service import (
            analizar_sentimiento, analizar_emocion, detectar_partidos,
            extraer_keywords, clasificar_tema, disponible as _nlp_disp
        )
        _NLP_OK = True
        nlp_caps = _nlp_disp()
    except Exception:
        _NLP_OK = False
        nlp_caps = {}

    # Status NLP
    def _nlp_cap_chip(k, v):
        c = GREEN if v else RED
        icon = "si" if v else "no"
        return (f'<span style="background:{c}22;color:{c};border:1px solid {c}44;'
                f'border-radius:20px;padding:.2rem .7rem;font-size:.68rem;font-weight:700">'
                f'{icon} {k}</span>')
    caps_html = "".join(_nlp_cap_chip(k, v) for k, v in nlp_caps.items())
    st.markdown(f'<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">{caps_html}</div>',
                unsafe_allow_html=True)

    texto_analizar = st.text_area(
        "Introduce un texto político para analizar",
        height=120,
        placeholder="Pedro Sánchez anunció hoy nuevas medidas para reducir el precio del alquiler...",
        key="nlp_texto",
    )

    if _NLP_OK and texto_analizar and st.button("Analizar texto", key="btn_nlp"):
        col_nlp1, col_nlp2, col_nlp3 = st.columns(3)

        sent = analizar_sentimiento(texto_analizar)
        emo = analizar_emocion(texto_analizar)
        partidos = detectar_partidos(texto_analizar)
        kws = extraer_keywords(texto_analizar, n_keywords=8)
        tema, conf = clasificar_tema(texto_analizar)

        with col_nlp1:
            color_sent = sent["color"]
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem;text-align:center">
              <div style="font-size:2rem">{sent['emoji']}</div>
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin:.3rem 0">Sentimiento</div>
              <div style="font-size:1.3rem;font-weight:900;color:{color_sent}">{sent['label']}</div>
              <div style="font-size:.7rem;color:{MUTED}">{sent['score']:.0%} confianza</div>
              <div style="font-size:.6rem;color:{MUTED};margin-top:.2rem">{sent['fuente']}</div>
            </div>
            """, unsafe_allow_html=True)

        with col_nlp2:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.5rem">Emoción dominante</div>
              <div style="font-size:1.1rem;font-weight:800;color:{AMBER}">{emo.get('label_es', '—')}</div>
              <hr style="border-color:{BORDER};margin:.5rem 0">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Tema detectado</div>
              <div style="font-size:.9rem;font-weight:700;color:{CYAN}">{tema}</div>
              <div style="font-size:.65rem;color:{MUTED}">{conf:.0%} confianza</div>
            </div>
            """, unsafe_allow_html=True)

        with col_nlp3:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.4rem">Partidos detectados</div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem">
                {''.join(f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;color:{COLORES_PARTIDOS.get(p,"#aaa")};border:1px solid {COLORES_PARTIDOS.get(p,"#444")}44;border-radius:4px;padding:.1rem .4rem;font-size:.72rem;font-weight:700">{p}</span>'for p in partidos) if partidos else '<span style="color:' + MUTED + ';font-size:.75rem">Ninguno</span>'}
              </div>
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Keywords (YAKE)</div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap">
                {''.join(f'<span style="background:{BORDER};color:{TEXT2};border-radius:4px;padding:.05rem .4rem;font-size:.65rem">{kw}</span>'for kw, _ in kws[:6])}
              </div>
            </div>
            """, unsafe_allow_html=True)

    elif not _NLP_OK:
        # Demo NLP cuando las librerias no estan instaladas
        st.markdown(f"""
        <div style="background:{AMBER}12;border:1px solid {AMBER}33;border-radius:8px;
                    padding:.6rem 1rem;margin-bottom:1rem;font-size:.78rem;color:{AMBER}">
          pysentimiento / yake no instalados — mostrando analisis demo
        </div>
        """, unsafe_allow_html=True)

        _demo_texto = (
            "Pedro Sanchez ha anunciado hoy medidas urgentes para frenar la subida del precio del alquiler "
            "en las grandes ciudades. El presidente critico duramente al PP por bloquear la ley de vivienda "
            "en el Senado. PSOE presentara enmiendas para reforzar la regulacion."
        )
        st.text_area(
            "Texto de ejemplo analizado",
            value=_demo_texto,
            height=90,
            disabled=True,
            key="nlp_demo_txt",
        )

        _dcol1, _dcol2, _dcol3 = st.columns(3)
        with _dcol1:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem;text-align:center">
              <div style="font-size:2rem">-</div>
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin:.3rem 0">Sentimiento</div>
              <div style="font-size:1.3rem;font-weight:900;color:{RED}">NEGATIVO</div>
              <div style="font-size:.7rem;color:{MUTED}">74% confianza</div>
              <div style="font-size:.6rem;color:{MUTED};margin-top:.2rem">pysentimiento (demo)</div>
            </div>
            """, unsafe_allow_html=True)
        with _dcol2:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.5rem">Emocion dominante</div>
              <div style="font-size:1.1rem;font-weight:800;color:{AMBER}">Enfado</div>
              <hr style="border-color:{BORDER};margin:.5rem 0">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Tema detectado</div>
              <div style="font-size:.9rem;font-weight:700;color:{CYAN}">Vivienda</div>
              <div style="font-size:.65rem;color:{MUTED}">88% confianza</div>
            </div>
            """, unsafe_allow_html=True)
        with _dcol3:
            _demo_partidos_det = ["PSOE", "PP"]
            _demo_kws = ["vivienda", "alquiler", "Sanchez", "Senado", "medidas", "regulacion"]
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1rem">
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.4rem">Partidos detectados</div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.6rem">
                {''.join('<span style="background:#e84c4c22;color:#e84c4c;border:1px solid #e84c4c44;border-radius:4px;padding:.1rem .4rem;font-size:.72rem;font-weight:700">PSOE</span>' if p == "PSOE" else '<span style="background:#1e7fd422;color:#1e7fd4;border:1px solid #1e7fd444;border-radius:4px;padding:.1rem .4rem;font-size:.72rem;font-weight:700">PP</span>' for p in _demo_partidos_det)}
              </div>
              <div style="font-size:.65rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.3rem">Keywords (YAKE)</div>
              <div style="display:flex;gap:.3rem;flex-wrap:wrap">
                {''.join(f'<span style="background:{BORDER};color:{TEXT2};border-radius:4px;padding:.05rem .4rem;font-size:.65rem">{kw}</span>' for kw in _demo_kws)}
              </div>
            </div>
            """, unsafe_allow_html=True)

        # Mini grafico de distribucion de sentimiento en corpus demo
        st.markdown("<br>", unsafe_allow_html=True)
        section_header("DISTRIBUCION DE SENTIMIENTO — CORPUS DEMO", PURPLE)
        _sent_labels = ["Positivo", "Neutro", "Negativo"]
        _sent_vals = [28, 42, 30]
        _sent_colors = [GREEN, TEXT2, RED]
        fig_sent = go.Figure(go.Bar(
            x=_sent_labels, y=_sent_vals,
            marker_color=_sent_colors,
            text=[f"{v}%" for v in _sent_vals],
            textposition="outside",
            textfont=dict(color=TEXT, size=11),
        ))
        fig_sent.update_layout(
            height=200, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT), yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%"),
            showlegend=False,
        )
        st.plotly_chart(fig_sent, use_container_width=True, config={"displayModeBar": False})
        st.caption("Instala pysentimiento y yake para analisis en tiempo real: pip install pysentimiento yake")
    elif not texto_analizar:
        st.markdown(f"""
        <div style="background:{BG3};border:1px dashed {BORDER};border-radius:10px;
                    padding:1.5rem;text-align:center;color:{MUTED}">
          Introduce un texto político para analizar con NLP
        </div>
        """, unsafe_allow_html=True)
