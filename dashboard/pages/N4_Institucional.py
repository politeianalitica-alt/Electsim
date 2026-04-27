"""
ELECTSIM — Actividad Institucional
Tabs: Congreso · BOE · Agenda de Líderes · Memoria Institucional
Integra funcionalidad de páginas 11, 15, 23 más capacidades BOE.
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

st.set_page_config(page_title="Institucional — ElectSim", page_icon="🏛️", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("institucional")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{BLUE},{PURPLE});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">🏛️</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Actividad Institucional</h2>
    <div style="color:{TEXT2};font-size:.82rem">Congreso · BOE · Agenda · Legislación</div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_congreso, tab_boe, tab_agenda, tab_memoria, tab_eu = st.tabs([
    "🏛️ Congreso",
    "📋 BOE",
    "📅 Agenda Líderes",
    "📚 Memoria Institucional",
    "🇪🇺 Parlamento Europeo",
])

# ═══════════════════════════════════════════════════════════════════════════════
with tab_congreso:
    try:
        from pages._11_Congreso_Institucional import _render_congreso_tab
        _render_congreso_tab()
    except Exception:
        section_header("ACTIVIDAD DEL CONGRESO DE LOS DIPUTADOS", CYAN)

        @st.cache_data(ttl=300)
        def _cargar_congreso():
            try:
                conn = _db.get_conn()
                ini = pd.read_sql(
                    "SELECT titulo, tipo, partido_proponente, estado, fecha_presentacion "
                    "FROM iniciativas_parlamentarias ORDER BY fecha_presentacion DESC LIMIT 50",
                    conn
                )
            except Exception:
                ini = pd.DataFrame()
            return ini

        df_ini = _cargar_congreso()

        if df_ini.empty:
            col_a, col_b = st.columns(2)
            with col_a:
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.5rem">
                  <div style="font-size:1.1rem;font-weight:700;color:{TEXT};margin-bottom:.8rem">Estado del hemiciclo</div>
                  <div style="font-size:.85rem;color:{TEXT2};line-height:1.8">
                    <div>🔵 PP — 137 escaños</div>
                    <div>🔴 PSOE — 121 escaños</div>
                    <div>🟢 VOX — 33 escaños</div>
                    <div>💗 SUMAR — 31 escaños</div>
                    <div>📊 Otros — 28 escaños</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)
            with col_b:
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.5rem">
                  <div style="font-size:1.1rem;font-weight:700;color:{TEXT};margin-bottom:.8rem">Calendario legislativo</div>
                  <div style="font-size:.85rem;color:{TEXT2};line-height:1.8">
                    <div>📅 Próximo pleno: pendiente</div>
                    <div>📋 Proyectos en tramitación: —</div>
                    <div>⚖️ Comisiones activas: —</div>
                  </div>
                </div>
                """, unsafe_allow_html=True)
            st.info("Para datos reales del Congreso, ejecuta los ETL de iniciativas parlamentarias.")
            st.page_link("pages/11_Congreso_Institucional.py", label="→ Congreso Institucional (v1)")
        else:
            # Filtros
            col_f1, col_f2, col_f3 = st.columns(3)
            with col_f1:
                tipo_f = st.selectbox("Tipo", ["Todos"] + sorted(df_ini["tipo"].unique().tolist()) if "tipo" in df_ini.columns else ["Todos"])
            with col_f2:
                partido_f_c = st.selectbox("Partido", ["Todos"] + sorted(df_ini["partido_proponente"].dropna().unique().tolist()) if "partido_proponente" in df_ini.columns else ["Todos"])
            with col_f3:
                estado_f = st.selectbox("Estado", ["Todos"] + sorted(df_ini["estado"].dropna().unique().tolist()) if "estado" in df_ini.columns else ["Todos"])

            df_f_ini = df_ini.copy()
            if tipo_f != "Todos" and "tipo" in df_f_ini.columns:
                df_f_ini = df_f_ini[df_f_ini["tipo"] == tipo_f]
            if partido_f_c != "Todos" and "partido_proponente" in df_f_ini.columns:
                df_f_ini = df_f_ini[df_f_ini["partido_proponente"] == partido_f_c]

            st.dataframe(df_f_ini.head(20), use_container_width=True, hide_index=True)


with tab_boe:
    section_header("BOE — BOLETÍN OFICIAL DEL ESTADO", AMBER)

    @st.cache_data(ttl=1800)
    def _cargar_boe():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT titulo, fecha_publicacion, departamento, rango, url "
                "FROM boe_items ORDER BY fecha_publicacion DESC LIMIT 30",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_boe = _cargar_boe()

    if df_boe.empty:
        st.info("Sin datos del BOE en base de datos. Ejecuta el ETL de BOE para importar datos.")

        # Panel BOE estático
        hoy = pd.Timestamp.today().strftime("%d/%m/%Y")
        st.markdown(f"""
        <div style="background:{AMBER}12;border:1px solid {AMBER}33;border-radius:12px;padding:1.5rem">
          <div style="font-size:1rem;font-weight:700;color:{AMBER};margin-bottom:.5rem">
            📋 BOE del {hoy}
          </div>
          <div style="font-size:.85rem;color:{TEXT2}">
            El BOE publica diariamente las disposiciones del Estado: leyes, decretos,
            resoluciones, convocatorias y demás actos oficiales.
          </div>
          <div style="margin-top:.8rem">
            <a href="https://www.boe.es" target="_blank" style="color:{CYAN};font-size:.82rem">
              🔗 Acceder al BOE oficial →
            </a>
          </div>
        </div>
        """, unsafe_allow_html=True)
        st.page_link("pages/10_Prensa_Agenda.py", label="→ Prensa & Agenda (v1)")
    else:
        for _, row in df_boe.head(15).iterrows():
            titulo = str(row.get("titulo", "—"))[:100]
            fecha = str(row.get("fecha_publicacion", ""))[:10]
            depto = str(row.get("departamento", "—"))
            rango = str(row.get("rango", "—"))
            url = str(row.get("url", "#"))

            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.8rem 1rem;margin-bottom:.4rem;border-left:3px solid {AMBER}">
              <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
                <span style="font-size:.8rem;font-weight:700;color:{TEXT}">{titulo}</span>
                <span style="font-size:.65rem;color:{MUTED}">{fecha}</span>
              </div>
              <div style="display:flex;gap:.5rem;align-items:center">
                <span style="background:{AMBER}22;color:{AMBER};border-radius:4px;
                             padding:.05rem .4rem;font-size:.65rem;font-weight:600">{rango}</span>
                <span style="font-size:.7rem;color:{TEXT2}">{depto}</span>
                <a href="{url}" target="_blank" style="color:{CYAN};font-size:.65rem;margin-left:auto">→ Ver</a>
              </div>
            </div>
            """, unsafe_allow_html=True)


with tab_agenda:
    section_header("AGENDA DE LÍDERES POLÍTICOS", BLUE)

    @st.cache_data(ttl=300)
    def _cargar_agenda():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT nombre_lider, partido, tipo_acto, descripcion, fecha, lugar "
                "FROM agenda_lideres ORDER BY fecha DESC LIMIT 30",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_agenda = _cargar_agenda()

    if df_agenda.empty:
        st.info("Sin datos de agenda en BD.")
        st.page_link("pages/15_Agenda_Lideres.py", label="→ Agenda de Líderes (v1)")
    else:
        for _, row in df_agenda.head(15).iterrows():
            lider = str(row.get("nombre_lider", "—"))
            partido = str(row.get("partido", "—"))
            tipo = str(row.get("tipo_acto", "—"))
            desc = str(row.get("descripcion", ""))[:200]
            fecha = str(row.get("fecha", ""))[:10]
            lugar = str(row.get("lugar", ""))

            color_p = COLORES_PARTIDOS.get(partido, CYAN)
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.8rem 1rem;margin-bottom:.4rem;border-left:3px solid {color_p}">
              <div style="display:flex;justify-content:space-between">
                <div>
                  <span style="font-size:.85rem;font-weight:800;color:{TEXT}">{lider}</span>
                  <span style="margin-left:.5rem;background:{color_p}22;color:{color_p};
                               border-radius:4px;padding:.1rem .4rem;font-size:.7rem;font-weight:700">{partido}</span>
                </div>
                <div style="text-align:right">
                  <div style="font-size:.7rem;font-weight:600;color:{CYAN}">{tipo}</div>
                  <div style="font-size:.65rem;color:{MUTED}">{fecha}</div>
                </div>
              </div>
              {f'<div style="font-size:.8rem;color:{TEXT2};margin-top:.3rem">{desc}</div>' if desc else ''}
              {f'<div style="font-size:.65rem;color:{MUTED};margin-top:.2rem">📍 {lugar}</div>' if lugar else ''}
            </div>
            """, unsafe_allow_html=True)


with tab_memoria:
    section_header("MEMORIA INSTITUCIONAL", PURPLE)
    st.info("Módulo de memoria institucional — historial de legislaturas, composición del gobierno, etc.")
    st.page_link("pages/23_Memoria_Institucional.py", label="→ Memoria Institucional (v1)")


with tab_eu:
    section_header("PARLAMENTO EUROPEO — DELEGACIÓN ESPAÑOLA", BLUE)
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.5rem">
      <div style="font-size:1rem;font-weight:700;color:{TEXT};margin-bottom:.8rem">
        🇪🇺 Representación española en el PE
      </div>
      <div style="font-size:.85rem;color:{TEXT2};line-height:1.8">
        <div>🔵 PP (PPE) — 22 eurodiputados</div>
        <div>🔴 PSOE (S&D) — 20 eurodiputados</div>
        <div>🟢 VOX (ECR) — 6 eurodiputados</div>
        <div>💗 SUMAR / IU — 5 eurodiputados</div>
        <div>🔵 Renovar — 2 eurodiputados</div>
      </div>
    </div>
    """, unsafe_allow_html=True)
    st.markdown(f"""
    <div style="margin-top:1rem;font-size:.8rem;color:{MUTED}">
      Datos del Parlamento Europeo disponibles vía el MCP Server europeo.
      Próximamente: integración con euparliamentmonitor-main y parltrack-master.
    </div>
    """, unsafe_allow_html=True)
