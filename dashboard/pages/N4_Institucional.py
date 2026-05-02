"""
ELECTSIM — Actividad Institucional v2
Tabs: Congreso · BOE · Agenda Líderes · Memoria · Parlamento Europeo
Diseño premium con análisis legislativo completo, hemiciclo interactivo,
pipeline BOE, radar de agenda y delegación española en el PE.
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime, timedelta

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS, kpi_card, section_header, hex_to_rgba,
    apply_plotly_theme,
)
import dashboard.db as _db

st.set_page_config(page_title="Institucional — ElectSim", page_icon="🏛", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("institucional")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;
              background:linear-gradient(135deg,{BLUE},{PURPLE});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">🏛</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Actividad Institucional</h2>
    <div style="color:{TEXT2};font-size:.82rem">
      Congreso · BOE · Agenda · Memoria · Parlamento Europeo
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_congreso, tab_boe, tab_agenda, tab_memoria, tab_eu = st.tabs([
    "🏛 Congreso",
    "📋 BOE",
    "📅 Agenda Líderes",
    "🗄 Memoria Institucional",
    "🇪🇺 Parlamento Europeo",
])

# ═══════════════════════════════════════════════════════════════════════════════
with tab_congreso:
    section_header("CONGRESO DE LOS DIPUTADOS — ACTIVIDAD LEGISLATIVA", BLUE)

    # KPI row
    _composicion = {
        "PP": {"escanos": 137, "color": BLUE},
        "PSOE": {"escanos": 121, "color": RED},
        "VOX": {"escanos": 33, "color": GREEN},
        "SUMAR": {"escanos": 31, "color": PURPLE},
        "JUNTS": {"escanos": 7, "color": AMBER},
        "ERC": {"escanos": 7, "color": AMBER},
        "EH BILDU": {"escanos": 6, "color": GREEN},
        "PNV": {"escanos": 5, "color": AMBER},
        "Otros": {"escanos": 3, "color": MUTED},
    }
    TOTAL_ESCANOS = 350
    MAYORIA_ABS = 176

    kpi_cols = st.columns(4)
    _bloq_prog = sum(v["escanos"] for k, v in _composicion.items() if k in ["PSOE", "SUMAR", "ERC", "EH BILDU", "PNV", "Junts"])
    _bloq_dere = sum(v["escanos"] for k, v in _composicion.items() if k in ["PP", "VOX"])
    with kpi_cols[0]:
        st.markdown(kpi_card("Escaños en juego", "350", "Congreso de los Diputados", color=BLUE),
                    unsafe_allow_html=True)
    with kpi_cols[1]:
        st.markdown(kpi_card("Mayoría absoluta", "176", "escaños necesarios", color=AMBER),
                    unsafe_allow_html=True)
    with kpi_cols[2]:
        st.markdown(kpi_card("Bloque gobierno", str(_bloq_prog), "PSOE + socios", color=RED),
                    unsafe_allow_html=True)
    with kpi_cols[3]:
        st.markdown(kpi_card("Bloque oposición", str(_bloq_dere), "PP + VOX", color=BLUE),
                    unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_hemi, col_ini = st.columns([1, 1])

    with col_hemi:
        section_header("HEMICICLO — DISTRIBUCIÓN DE ESCAÑOS", CYAN)
        # Semicircle hemiciclo
        fig_hemi = go.Figure()
        partidos_sorted = sorted(_composicion.items(), key=lambda x: -x[1]["escanos"])
        total_filled = sum(v["escanos"] for _, v in partidos_sorted)

        angle_start = 180.0
        for partido, data in partidos_sorted:
            angle_span = (data["escanos"] / total_filled) * 180.0
            theta = np.linspace(np.radians(angle_start),
                                np.radians(angle_start - angle_span), 30)
            r_outer, r_inner = 1.0, 0.55
            x_arc = list(np.cos(theta) * r_outer) + list(np.cos(theta[::-1]) * r_inner)
            y_arc = list(np.sin(theta) * r_outer) + list(np.sin(theta[::-1]) * r_inner)
            color = COLORES_PARTIDOS.get(partido, data["color"])
            fig_hemi.add_trace(go.Scatter(
                x=x_arc, y=y_arc, fill="toself",
                fillcolor=color,
                line=dict(color=BG, width=1.5),
                name=f"{partido} ({data['escanos']})",
                hovertemplate=f"<b>{partido}</b><br>{data['escanos']} escaños<extra></extra>",
                mode="lines",
            ))
            angle_start -= angle_span

        # Majority line
        fig_hemi.add_shape(type="line", x0=0, y0=0, x1=0, y1=1.05,
                           line=dict(color=AMBER, width=2, dash="dash"))
        fig_hemi.add_annotation(x=0.02, y=1.08, text="176 (mayoría abs.)",
                                 font=dict(color=AMBER, size=9), showarrow=False)
        fig_hemi.update_layout(
            height=260, showlegend=True, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=5, l=10, r=10),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-1.2, 1.2]),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False, range=[-0.1, 1.2],
                       scaleanchor="x"),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.08,
                        font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})

    with col_ini:
        section_header("INICIATIVAS PARLAMENTARIAS", AMBER)

        @st.cache_data(ttl=300)
        def _cargar_iniciativas():
            try:
                conn = _db.get_conn()
                return pd.read_sql(
                    "SELECT titulo, tipo, partido_proponente, estado, fecha_presentacion "
                    "FROM iniciativas_parlamentarias ORDER BY fecha_presentacion DESC LIMIT 50",
                    conn
                )
            except Exception:
                return pd.DataFrame()

        df_ini = _cargar_iniciativas()

        if df_ini.empty:
            # Pipeline demo
            _pipeline = [
                {"tipo": "Ley Orgánica", "n": 8, "color": BLUE},
                {"tipo": "Proyecto de Ley", "n": 23, "color": CYAN},
                {"tipo": "Proposición", "n": 47, "color": PURPLE},
                {"tipo": "Interpelación", "n": 31, "color": AMBER},
                {"tipo": "Pregunta", "n": 124, "color": MUTED},
            ]
            fig_pipe = go.Figure(go.Bar(
                x=[p["n"] for p in _pipeline],
                y=[p["tipo"] for p in _pipeline],
                orientation="h",
                marker_color=[p["color"] for p in _pipeline],
                text=[str(p["n"]) for p in _pipeline],
                textposition="outside",
                textfont=dict(color=TEXT, size=11),
                hovertemplate="<b>%{y}</b><br>%{x} iniciativas<extra></extra>",
            ))
            fig_pipe.update_layout(
                height=220, paper_bgcolor=BG2, plot_bgcolor=BG2,
                margin=dict(t=5, b=5, l=10, r=40),
                xaxis=dict(color=TEXT2, gridcolor=BORDER, showticklabels=False),
                yaxis=dict(color=TEXT, tickfont=dict(size=11)),
            )
            st.plotly_chart(fig_pipe, use_container_width=True, config={"displayModeBar": False})
            st.caption("Datos demo — ejecuta ETL para datos reales")
            st.page_link("pages/11_Congreso_Institucional.py", label="→ Congreso Institucional (v1)")
        else:
            col_f1, col_f2 = st.columns(2)
            with col_f1:
                tipo_f = st.selectbox("Tipo", ["Todos"] + sorted(df_ini["tipo"].dropna().unique().tolist()) if "tipo" in df_ini.columns else ["Todos"], key="ini_tipo")
            with col_f2:
                partido_f = st.selectbox("Partido", ["Todos"] + sorted(df_ini["partido_proponente"].dropna().unique().tolist()) if "partido_proponente" in df_ini.columns else ["Todos"], key="ini_partido")
            df_f = df_ini.copy()
            if tipo_f != "Todos" and "tipo" in df_f.columns:
                df_f = df_f[df_f["tipo"] == tipo_f]
            if partido_f != "Todos" and "partido_proponente" in df_f.columns:
                df_f = df_f[df_f["partido_proponente"] == partido_f]
            st.dataframe(df_f.head(20), use_container_width=True, hide_index=True)

    # Voting heatmap
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("MAPA DE VOTACIONES — COALICIONES LEGISLATIVAS", PURPLE)

    _votos = {
        "PP": {"PSOE": 12, "VOX": 45, "SUMAR": 3, "JUNTS": 8, "PNV": 18},
        "PSOE": {"PP": 12, "VOX": 0, "SUMAR": 87, "JUNTS": 62, "PNV": 91},
        "VOX": {"PP": 45, "PSOE": 0, "SUMAR": 0, "JUNTS": 0, "PNV": 5},
        "SUMAR": {"PP": 3, "PSOE": 87, "VOX": 0, "JUNTS": 41, "PNV": 78},
        "JUNTS": {"PP": 8, "PSOE": 62, "VOX": 0, "SUMAR": 41, "PNV": 55},
    }
    partidos_v = list(_votos.keys())
    z_vals = [[_votos[r].get(c, 0) for c in partidos_v] for r in partidos_v]

    fig_heat = go.Figure(go.Heatmap(
        z=z_vals, x=partidos_v, y=partidos_v,
        colorscale=[[0, BG3], [0.5, hex_to_rgba(CYAN, 0.50)], [1, CYAN]],
        hoverongaps=False,
        hovertemplate="<b>%{y} + %{x}</b><br>%{z}% coincidencia<extra></extra>",
        showscale=True,
        colorbar=dict(
            tickfont=dict(color=TEXT2, size=10),
            title=dict(text="% coincidencia", font=dict(color=TEXT2, size=10)),
            bgcolor=BG2, bordercolor=BORDER,
        ),
    ))
    for i, row in enumerate(partidos_v):
        for j, col_p in enumerate(partidos_v):
            v = z_vals[i][j]
            fig_heat.add_annotation(
                x=col_p, y=row, text=f"{v}%",
                showarrow=False, font=dict(size=10, color=TEXT if v < 50 else BG),
            )
    fig_heat.update_layout(
        height=260, paper_bgcolor=BG2, plot_bgcolor=BG2,
        margin=dict(t=10, b=10, l=10, r=80),
        xaxis=dict(color=TEXT, side="bottom"),
        yaxis=dict(color=TEXT),
    )
    st.plotly_chart(fig_heat, use_container_width=True, config={"displayModeBar": False})


# ═══════════════════════════════════════════════════════════════════════════════
with tab_boe:
    section_header("BOE — BOLETÍN OFICIAL DEL ESTADO", AMBER)

    @st.cache_data(ttl=1800)
    def _cargar_boe():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT titulo, fecha_publicacion, departamento, rango, url "
                "FROM boe_items ORDER BY fecha_publicacion DESC LIMIT 50",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_boe = _cargar_boe()

    # Filtros top
    col_bflt1, col_bflt2, col_bflt3 = st.columns([2, 2, 1])
    hoy_ts = pd.Timestamp.today()

    with col_bflt1:
        _rangos_boe = ["Todos", "Ley Orgánica", "Real Decreto-ley", "Real Decreto",
                       "Orden", "Resolución", "Anuncio"]
        rango_sel = st.selectbox("Rango", _rangos_boe, key="boe_rango")
    with col_bflt2:
        _deptos = ["Todos", "Ministerio de Hacienda", "Ministerio del Interior",
                   "Ministerio de Justicia", "Jefatura del Estado", "Tribunal Constitucional"]
        depto_sel = st.selectbox("Departamento", _deptos, key="boe_depto")
    with col_bflt3:
        dias_boe = st.slider("Días", 1, 30, 7, key="boe_dias")

    if df_boe.empty:
        # Demo BOE con timeline
        section_header("ACTIVIDAD LEGISLATIVA — ÚLTIMOS 30 DÍAS", AMBER)
        _tipos_boe = ["Ley Orgánica", "Real Decreto-ley", "Real Decreto", "Orden", "Resolución"]
        _color_boe = [BLUE, RED, AMBER, CYAN, MUTED]
        _counts_boe = [2, 5, 18, 34, 67]

        fig_boe_bar = go.Figure(go.Bar(
            x=_tipos_boe, y=_counts_boe,
            marker_color=_color_boe,
            text=_counts_boe, textposition="outside",
            textfont=dict(color=TEXT, size=12),
            hovertemplate="<b>%{x}</b><br>%{y} publicaciones<extra></extra>",
        ))
        fig_boe_bar.update_layout(
            height=240, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT), yaxis=dict(color=TEXT2, gridcolor=BORDER),
        )
        st.plotly_chart(fig_boe_bar, use_container_width=True, config={"displayModeBar": False})

        # BOE items demo
        _boe_demo = [
            {"rango": "Real Decreto-ley", "titulo": "Medidas urgentes en materia de vivienda y alquiler", "depto": "Jefatura del Estado", "fecha": "2026-05-01", "color": RED},
            {"rango": "Ley Orgánica", "titulo": "Regulación de la inteligencia artificial en la Administración Pública", "depto": "Ministerio de Transformación Digital", "fecha": "2026-04-28", "color": BLUE},
            {"rango": "Real Decreto", "titulo": "Estructura orgánica del Ministerio de Hacienda", "depto": "Ministerio de Hacienda", "fecha": "2026-04-25", "color": AMBER},
            {"rango": "Resolución", "titulo": "Convocatoria de subvenciones para digitalización PYME", "depto": "Ministerio de Industria", "fecha": "2026-04-22", "color": CYAN},
            {"rango": "Orden", "titulo": "Regulación de emisiones en sectores industriales", "depto": "Ministerio de Transición Ecológica", "fecha": "2026-04-20", "color": GREEN},
        ]
        for item in _boe_demo:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.9rem 1.1rem;margin-bottom:.5rem;
                        border-left:4px solid {item['color']}">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem">
                <span style="font-size:.8rem;font-weight:700;color:{TEXT};flex:1;margin-right:.8rem">
                  {item['titulo']}
                </span>
                <span style="font-size:.65rem;color:{MUTED};white-space:nowrap">{item['fecha']}</span>
              </div>
              <div style="display:flex;gap:.5rem;align-items:center">
                <span style="background:{item['color']}22;color:{item['color']};border-radius:4px;
                             padding:.1rem .45rem;font-size:.65rem;font-weight:700">{item['rango']}</span>
                <span style="font-size:.7rem;color:{TEXT2}">{item['depto']}</span>
                <a href="https://www.boe.es" target="_blank"
                   style="color:{CYAN};font-size:.65rem;margin-left:auto;text-decoration:none">
                  Ver en BOE →
                </a>
              </div>
            </div>
            """, unsafe_allow_html=True)

        st.caption("Datos demo — ejecuta ETL de BOE para datos reales")
        st.page_link("pages/10_Prensa_Agenda.py", label="→ Prensa & Agenda (v1)")
    else:
        df_b = df_boe.copy()
        if rango_sel != "Todos" and "rango" in df_b.columns:
            df_b = df_b[df_b["rango"].str.contains(rango_sel, na=False)]
        if depto_sel != "Todos" and "departamento" in df_b.columns:
            df_b = df_b[df_b["departamento"].str.contains(depto_sel, na=False)]

        import html as _html
        for _, row in df_b.head(20).iterrows():
            titulo = _html.escape(str(row.get("titulo", "—"))[:120])
            fecha = str(row.get("fecha_publicacion", ""))[:10]
            depto = _html.escape(str(row.get("departamento", "—")))
            rango_v = _html.escape(str(row.get("rango", "—")))
            url_raw = str(row.get("url", "https://www.boe.es"))
            url_safe = url_raw.replace("&", "&amp;").replace('"', "%22")
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.8rem 1rem;margin-bottom:.4rem;border-left:3px solid {AMBER}">
              <div style="display:flex;justify-content:space-between;margin-bottom:.3rem">
                <span style="font-size:.8rem;font-weight:700;color:{TEXT}">{titulo}</span>
                <span style="font-size:.65rem;color:{MUTED}">{fecha}</span>
              </div>
              <div style="display:flex;gap:.5rem;align-items:center">
                <span style="background:{AMBER}22;color:{AMBER};border-radius:4px;
                             padding:.05rem .4rem;font-size:.65rem;font-weight:600">{rango_v}</span>
                <span style="font-size:.7rem;color:{TEXT2}">{depto}</span>
                <a href="{url_safe}" target="_blank"
                   style="color:{CYAN};font-size:.65rem;margin-left:auto">Ver →</a>
              </div>
            </div>
            """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
with tab_agenda:
    section_header("AGENDA DE LÍDERES POLÍTICOS", BLUE)

    @st.cache_data(ttl=300)
    def _cargar_agenda():
        try:
            conn = _db.get_conn()
            return pd.read_sql(
                "SELECT nombre_lider, partido, tipo_acto, descripcion, fecha, lugar "
                "FROM agenda_lideres ORDER BY fecha DESC LIMIT 50",
                conn
            )
        except Exception:
            return pd.DataFrame()

    df_agenda = _cargar_agenda()

    # Calendarioview demo
    today = datetime.today()
    week_days = [today + timedelta(days=i) for i in range(7)]

    _agenda_demo = [
        {"lider": "Pedro Sánchez", "partido": "PSOE", "tipo": "Consejo de Ministros", "lugar": "La Moncloa", "dia": 0, "hora": "10:00", "nivel": "alto"},
        {"lider": "Alberto Núñez Feijóo", "partido": "PP", "tipo": "Rueda de prensa", "lugar": "Congreso", "dia": 0, "hora": "12:30", "nivel": "medio"},
        {"lider": "Yolanda Díaz", "partido": "SUMAR", "tipo": "Comparecencia Senado", "lugar": "Senado", "dia": 1, "hora": "11:00", "nivel": "medio"},
        {"lider": "Santiago Abascal", "partido": "VOX", "tipo": "Mitin", "lugar": "Madrid", "dia": 2, "hora": "19:00", "nivel": "bajo"},
        {"lider": "Carles Puigdemont", "partido": "JUNTS", "tipo": "Declaración institucional", "lugar": "Bruselas", "dia": 3, "hora": "14:00", "nivel": "alto"},
        {"lider": "Pedro Sánchez", "partido": "PSOE", "tipo": "Cumbre bilateral", "lugar": "París", "dia": 4, "hora": "09:00", "nivel": "alto"},
        {"lider": "Alberto Núñez Feijóo", "partido": "PP", "tipo": "Congreso del partido", "lugar": "Madrid", "dia": 5, "hora": "10:00", "nivel": "alto"},
    ]

    col_cal, col_feed = st.columns([3, 2])

    with col_cal:
        section_header("CALENDARIO SEMANAL", CYAN)
        # Timeline chart
        fig_timeline = go.Figure()

        nivel_colors = {"alto": RED, "medio": AMBER, "bajo": GREEN}
        for ev in _agenda_demo:
            color = COLORES_PARTIDOS.get(ev["partido"], CYAN)
            day_label = week_days[ev["dia"]].strftime("%a %d/%m")
            fig_timeline.add_trace(go.Scatter(
                x=[day_label],
                y=[ev["lider"]],
                mode="markers+text",
                marker=dict(
                    size=18,
                    color=color,
                    symbol="square",
                    line=dict(width=2, color=nivel_colors.get(ev["nivel"], MUTED)),
                ),
                text=[ev["hora"]],
                textposition="middle center",
                textfont=dict(size=7, color=BG),
                name=ev["partido"],
                customdata=[[ev["tipo"], ev["lugar"], ev["nivel"]]],
                hovertemplate=(
                    "<b>%{y}</b> — %{x}<br>"
                    "Tipo: %{customdata[0]}<br>"
                    "Lugar: %{customdata[1]}<br>"
                    "Nivel: %{customdata[2]}<extra></extra>"
                ),
                showlegend=False,
            ))

        day_labels = [d.strftime("%a %d/%m") for d in week_days]
        fig_timeline.update_layout(
            height=300, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=120, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER, categoryorder="array",
                       categoryarray=day_labels),
            yaxis=dict(color=TEXT, gridcolor=BORDER),
        )
        st.plotly_chart(fig_timeline, use_container_width=True, config={"displayModeBar": False})

    with col_feed:
        section_header("FEED DE ACTOS", AMBER)
        if df_agenda.empty:
            for ev in _agenda_demo[:5]:
                color_p = COLORES_PARTIDOS.get(ev["partido"], CYAN)
                nivel_c = {"alto": RED, "medio": AMBER, "bajo": GREEN}.get(ev["nivel"], MUTED)
                dia_str = week_days[ev["dia"]].strftime("%d/%m")
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                            padding:.7rem .9rem;margin-bottom:.5rem;
                            border-left:3px solid {color_p}">
                  <div style="display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <span style="font-size:.82rem;font-weight:700;color:{TEXT}">{ev['lider']}</span>
                      <span style="margin-left:.4rem;background:{color_p}22;color:{color_p};
                                   border-radius:4px;padding:.05rem .35rem;font-size:.65rem;
                                   font-weight:700">{ev['partido']}</span>
                    </div>
                    <div style="text-align:right">
                      <div style="font-size:.7rem;color:{CYAN};font-weight:600">{dia_str} {ev['hora']}</div>
                      <div style="width:8px;height:8px;background:{nivel_c};border-radius:50%;
                                  display:inline-block;margin-top:.2rem"></div>
                    </div>
                  </div>
                  <div style="font-size:.77rem;color:{TEXT2};margin-top:.3rem">{ev['tipo']}</div>
                  <div style="font-size:.68rem;color:{MUTED}">📍 {ev['lugar']}</div>
                </div>
                """, unsafe_allow_html=True)
            st.caption("Datos demo — conecta ETL agenda para datos reales")
        else:
            for _, row in df_agenda.head(10).iterrows():
                lider = str(row.get("nombre_lider", "—"))
                partido = str(row.get("partido", "—"))
                tipo = str(row.get("tipo_acto", "—"))
                desc = str(row.get("descripcion", ""))[:150]
                fecha = str(row.get("fecha", ""))[:10]
                lugar = str(row.get("lugar", ""))
                color_p = COLORES_PARTIDOS.get(partido, CYAN)
                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                            padding:.7rem .9rem;margin-bottom:.4rem;border-left:3px solid {color_p}">
                  <div style="display:flex;justify-content:space-between">
                    <span style="font-size:.82rem;font-weight:700;color:{TEXT}">{lider}</span>
                    <span style="font-size:.68rem;color:{MUTED}">{fecha}</span>
                  </div>
                  <div style="font-size:.75rem;color:{CYAN};font-weight:600">{tipo}</div>
                  {f'<div style="font-size:.73rem;color:{TEXT2};margin-top:.2rem">{desc}</div>' if desc else ''}
                  {f'<div style="font-size:.65rem;color:{MUTED}">📍 {lugar}</div>' if lugar else ''}
                </div>
                """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
with tab_memoria:
    section_header("MEMORIA INSTITUCIONAL — ARCHIVO LEGISLATIVO", PURPLE)

    col_m1, col_m2 = st.columns(2)

    with col_m1:
        section_header("LEGISLATURAS XIV — XVI", BLUE)
        _legislaturas = [
            {"num": "XVI", "inicio": "Nov 2023", "fin": "Presente", "presidente": "Pedro Sánchez", "partido": "PSOE", "escanos": 121, "color": RED},
            {"num": "XV", "inicio": "Dic 2021", "fin": "Oct 2023", "presidente": "Pedro Sánchez", "partido": "PSOE+UP", "escanos": 155, "color": PURPLE},
            {"num": "XIV", "inicio": "Ene 2020", "fin": "Dic 2021", "presidente": "Pedro Sánchez", "partido": "PSOE+UP", "escanos": 155, "color": PURPLE},
        ]
        for leg in _legislaturas:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {leg['color']}44;
                        border-radius:12px;padding:1rem 1.2rem;margin-bottom:.6rem">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <span style="font-size:1rem;font-weight:900;color:{leg['color']}">
                    Legislatura {leg['num']}
                  </span>
                  <div style="font-size:.75rem;color:{TEXT2};margin-top:.2rem">
                    {leg['inicio']} → {leg['fin']}
                  </div>
                </div>
                <div style="text-align:right">
                  <div style="font-size:.8rem;font-weight:700;color:{TEXT}">{leg['presidente']}</div>
                  <div style="background:{leg['color']}22;color:{leg['color']};border-radius:4px;
                              padding:.1rem .4rem;font-size:.65rem;margin-top:.2rem">{leg['partido']}</div>
                </div>
              </div>
              <div style="font-size:.72rem;color:{MUTED};margin-top:.4rem">
                Escaños de apoyo: {leg['escanos']}/350
              </div>
            </div>
            """, unsafe_allow_html=True)

    with col_m2:
        section_header("GOBIERNO ACTUAL — ESTRUCTURA", BLUE)
        _ministerios = [
            {"nombre": "Vicepresidencia Primera / Hacienda", "titular": "María Jesús Montero", "partido": "PSOE"},
            {"nombre": "Interior", "titular": "Fernando Grande-Marlaska", "partido": "PSOE"},
            {"nombre": "Exteriores", "titular": "José Manuel Albares", "partido": "PSOE"},
            {"nombre": "Trabajo", "titular": "Yolanda Díaz", "partido": "SUMAR"},
            {"nombre": "Cultura", "titular": "Ernest Urtasun", "partido": "SUMAR"},
            {"nombre": "Igualdad", "titular": "Ana Redondo", "partido": "PSOE"},
            {"nombre": "Sanidad", "titular": "Mónica García", "partido": "MÁS MADRID"},
        ]
        for m in _ministerios:
            color_m = COLORES_PARTIDOS.get(m["partido"], BLUE)
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                        padding:.6rem .9rem;margin-bottom:.3rem;display:flex;
                        justify-content:space-between;align-items:center">
              <div>
                <div style="font-size:.77rem;font-weight:600;color:{TEXT}">{m['nombre']}</div>
                <div style="font-size:.7rem;color:{TEXT2};margin-top:.1rem">{m['titular']}</div>
              </div>
              <span style="background:{color_m}22;color:{color_m};border-radius:4px;
                           padding:.1rem .4rem;font-size:.65rem;font-weight:700;white-space:nowrap">
                {m['partido']}
              </span>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    st.page_link("pages/23_Memoria_Institucional.py", label="→ Memoria Institucional (v1) — archivo completo")


# ═══════════════════════════════════════════════════════════════════════════════
with tab_eu:
    section_header("PARLAMENTO EUROPEO — DELEGACIÓN ESPAÑOLA", BLUE)

    # KPIs
    _eu_kpis = [
        ("Eurodiputados españoles", "61", "de 720 totales", BLUE),
        ("Grupos políticos", "8", "grupos en el PE", CYAN),
        ("Mayoría PE", "361", "escaños necesarios", AMBER),
        ("Mandato actual", "2024–29", "9ª legislatura", PURPLE),
    ]
    eu_cols = st.columns(4)
    for i, (label, val, sub, color) in enumerate(_eu_kpis):
        with eu_cols[i]:
            st.markdown(kpi_card(label, val, sub, color=color), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_eu1, col_eu2 = st.columns([1, 1])

    with col_eu1:
        section_header("DELEGACIÓN ESPAÑOLA POR GRUPO", CYAN)
        _eu_delegacion = [
            {"grupo": "PPE", "partido": "PP", "eudiputados": 22, "color": BLUE, "desc": "Grupo mayoritario de centroderecha"},
            {"grupo": "S&D", "partido": "PSOE", "eudiputados": 20, "color": RED, "desc": "Socialistas y Demócratas"},
            {"grupo": "RE", "partido": "Ciudadanos/PNV", "eudiputados": 4, "color": CYAN, "desc": "Renovar Europa"},
            {"grupo": "Verdes/ALE", "partido": "SUMAR/BNG", "eudiputados": 5, "color": GREEN, "desc": "Grupo verde"},
            {"grupo": "ECR", "partido": "VOX", "eudiputados": 6, "color": "#15803D", "desc": "Conservadores y Reformistas"},
            {"grupo": "GUE/NGL", "partido": "Podemos/IU", "eudiputados": 4, "color": PURPLE, "desc": "Izquierda unitaria"},
        ]
        total_eu = sum(d["eudiputados"] for d in _eu_delegacion)

        fig_eu = go.Figure(go.Bar(
            x=[d["eudiputados"] for d in _eu_delegacion],
            y=[f"{d['grupo']} ({d['partido']})" for d in _eu_delegacion],
            orientation="h",
            marker_color=[d["color"] for d in _eu_delegacion],
            text=[str(d["eudiputados"]) for d in _eu_delegacion],
            textposition="outside",
            textfont=dict(color=TEXT, size=11),
            hovertemplate="<b>%{y}</b><br>%{x} eurodiputados<extra></extra>",
        ))
        fig_eu.update_layout(
            height=240, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=5, b=5, l=10, r=40),
            xaxis=dict(color=TEXT2, gridcolor=BORDER, showticklabels=False),
            yaxis=dict(color=TEXT, tickfont=dict(size=10)),
        )
        st.plotly_chart(fig_eu, use_container_width=True, config={"displayModeBar": False})

    with col_eu2:
        section_header("VOTACIONES CLAVE — POSICIÓN ESPAÑOLA", AMBER)
        _votaciones_eu = [
            {"tema": "AI Act", "fecha": "Mar 2024", "pp": "A favor", "psoe": "A favor", "vox": "Abstención", "resultado": "APROBADO", "res_c": GREEN},
            {"tema": "Pacto Verde Europeo", "fecha": "Feb 2024", "pp": "En contra", "psoe": "A favor", "vox": "En contra", "resultado": "APROBADO", "res_c": GREEN},
            {"tema": "Reforma Pacto de Estabilidad", "fecha": "Nov 2023", "pp": "A favor", "psoe": "A favor", "vox": "En contra", "resultado": "APROBADO", "res_c": GREEN},
            {"tema": "Directiva CSRD sostenibilidad", "fecha": "Oct 2023", "pp": "Abstención", "psoe": "A favor", "vox": "En contra", "resultado": "APROBADO", "res_c": GREEN},
        ]
        for vt in _votaciones_eu:
            def _pill(pos: str) -> str:
                c = GREEN if pos == "A favor" else (RED if pos == "En contra" else AMBER)
                return (f'<span style="background:{c}22;color:{c};border-radius:4px;'
                        f'padding:.05rem .3rem;font-size:.6rem;font-weight:700">{pos}</span>')
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.75rem 1rem;margin-bottom:.5rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem">
                <span style="font-size:.82rem;font-weight:700;color:{TEXT}">{vt['tema']}</span>
                <span style="background:{vt['res_c']}22;color:{vt['res_c']};border-radius:4px;
                             padding:.1rem .4rem;font-size:.65rem;font-weight:700">
                  {vt['resultado']}
                </span>
              </div>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
                <span style="font-size:.68rem;color:{MUTED}">{vt['fecha']}</span>
                <span style="font-size:.7rem;color:{TEXT2}">PP: {_pill(vt['pp'])}</span>
                <span style="font-size:.7rem;color:{TEXT2}">PSOE: {_pill(vt['psoe'])}</span>
                <span style="font-size:.7rem;color:{TEXT2}">VOX: {_pill(vt['vox'])}</span>
              </div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown(f"""
    <div style="margin-top:1.2rem;background:{BG2};border:1px solid {BORDER};
                border-radius:12px;padding:1rem 1.2rem">
      <div style="font-size:.75rem;font-weight:700;color:{TEXT2};text-transform:uppercase;
                  letter-spacing:.08em;margin-bottom:.5rem">PRÓXIMA INTEGRACIÓN</div>
      <div style="font-size:.82rem;color:{TEXT2};line-height:1.6">
        Integración directa con <strong style="color:{CYAN}">euparliamentmonitor</strong> y
        <strong style="color:{CYAN}">parltrack</strong> para datos en tiempo real:
        votaciones, enmiendas, informes y posiciones de los grupos.
      </div>
    </div>
    """, unsafe_allow_html=True)
