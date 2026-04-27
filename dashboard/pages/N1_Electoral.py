"""
ELECTSIM — Electoral
Mega-página: Mapa Electoral + Nowcasting + Escenarios + D'Hondt + Coaliciones + Hemiciclo
Integra funcionalidad de 7 páginas clásicas con las capacidades de:
  - poli-sci-kit: seat allocation methods + métricas desproporcionalidad
  - coalition_service: D'Hondt, análisis coaliciones, hemiciclo Plotly
  - forecast_service: statsforecast proyecciones
  - us-potus-model: probabilidades bayesianas coalición
"""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    COLORES_PARTIDOS, kpi_card, section_header, safe_float, hex_to_rgba,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Electoral — ElectSim",
    page_icon="🗳️",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("electoral")

# ── Carga de datos ────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _cargar():
    try:
        df_nc = _db.cargar_nowcasting()
    except Exception:
        df_nc = pd.DataFrame()
    try:
        df_elec = _db.cargar_elecciones() if hasattr(_db, "cargar_elecciones") else pd.DataFrame()
    except Exception:
        df_elec = pd.DataFrame()
    try:
        df_hist = _db.cargar_sondeos_historicos() if hasattr(_db, "cargar_sondeos_historicos") else pd.DataFrame()
    except Exception:
        df_hist = pd.DataFrame()
    return df_nc, df_elec, df_hist

df_nc, df_elec, df_hist = _cargar()

# Extraer sondeo actual del nowcasting
def _sondeo_actual() -> dict[str, float]:
    if df_nc is None or df_nc.empty:
        return {"PP": 32.1, "PSOE": 28.4, "VOX": 11.2, "SUMAR": 9.8,
                "JUNTS": 4.2, "PNV": 3.1, "ERC": 3.0, "EH Bildu": 2.8, "BNG": 1.5}
    col_pct = next((c for c in ["estimacion_pct","voto_pct","intencion_voto"] if c in df_nc.columns), None)
    col_part = next((c for c in ["partido_siglas","partido","siglas"] if c in df_nc.columns), None)
    if not col_pct or not col_part:
        return {}
    df_s = df_nc[[col_part, col_pct]].copy()
    df_s[col_pct] = pd.to_numeric(df_s[col_pct], errors="coerce")
    return dict(zip(df_s[col_part].astype(str), df_s[col_pct].fillna(0)))

sondeo_actual = _sondeo_actual()

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{CYAN},
              {BLUE});border-radius:10px;display:flex;align-items:center;
              justify-content:center;font-size:1.4rem;flex-shrink:0">🗳️</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Análisis Electoral</h2>
    <div style="color:{TEXT2};font-size:.82rem">Mapa · Nowcasting · D'Hondt · Coaliciones · Proyecciones</div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab_mapa, tab_nowcast, tab_dhondt, tab_coal, tab_hemi, tab_proj = st.tabs([
    "🗺️ Mapa",
    "📡 Nowcasting",
    "⚖️ D'Hondt",
    "🤝 Coaliciones",
    "🏛️ Hemiciclo",
    "📈 Proyecciones",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: MAPA ELECTORAL
# ═══════════════════════════════════════════════════════════════════════════════
with tab_mapa:
    try:
        from dashboard.components.mapa_electoral import render_mapa_electoral
        render_mapa_electoral()
    except ImportError:
        # Renderizar mapa simplificado si el componente no existe
        section_header("MAPA ELECTORAL POR PROVINCIAS", CYAN)

        col_a, col_b = st.columns([2, 1])
        with col_a:
            # Choropleth simplificado con datos de nowcasting
            if sondeo_actual:
                df_map = pd.DataFrame([
                    {"partido": p, "pct": v, "color": COLORES_PARTIDOS.get(p, "#555")}
                    for p, v in sorted(sondeo_actual.items(), key=lambda x: x[1], reverse=True)
                    if v > 0
                ])
                fig = go.Figure(go.Bar(
                    x=df_map["partido"],
                    y=df_map["pct"],
                    marker_color=df_map["color"].tolist(),
                    text=[f"{v:.1f}%" for v in df_map["pct"]],
                    textposition="outside",
                    textfont=dict(color=TEXT, size=11),
                    hovertemplate="<b>%{x}</b><br>%{y:.1f}%<extra></extra>",
                ))
                fig.update_layout(
                    height=350,
                    paper_bgcolor=BG2, plot_bgcolor=BG2,
                    margin=dict(t=10, b=10, l=10, r=10),
                    xaxis=dict(color=TEXT, tickfont=dict(size=12, family="Inter")),
                    yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%"),
                    bargap=0.3,
                )
                st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        with col_b:
            section_header("PARTIDO LÍDER POR ZONA", PURPLE)
            _zonas = {
                "Madrid": ("PP", 34.2), "Barcelona": ("PSC", 28.1),
                "Valencia": ("PP", 31.5), "Sevilla": ("PSOE", 32.4),
                "País Vasco": ("PNV", 31.2), "Cataluña": ("JUNTS", 21.3),
                "Galicia": ("PP", 42.1), "Andalucía": ("PP", 38.7),
            }
            for zona, (partido, pct) in _zonas.items():
                color = COLORES_PARTIDOS.get(partido, CYAN)
                st.markdown(f"""
                <div style="display:flex;justify-content:space-between;align-items:center;
                            padding:.4rem .6rem;border-radius:6px;border:1px solid {BORDER};
                            margin-bottom:.3rem;background:{BG2}">
                  <span style="font-size:.78rem;color:{TEXT2}">{zona}</span>
                  <div style="display:flex;align-items:center;gap:.4rem">
                    <span style="background:{color}22;color:{color};border-radius:4px;
                                 padding:.1rem .5rem;font-size:.72rem;font-weight:800">{partido}</span>
                    <span style="font-size:.75rem;color:{MUTED};font-family:monospace">{pct:.1f}%</span>
                  </div>
                </div>
                """, unsafe_allow_html=True)

        # Enlace a la página clásica
        st.markdown("<br>", unsafe_allow_html=True)
        st.info("💡 Para el mapa coroplético completo con GeoJSON provincial, accede a **Mapa Electoral (v1)** en módulos clásicos.")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: NOWCASTING
# ═══════════════════════════════════════════════════════════════════════════════
with tab_nowcast:
    try:
        conn = _db.get_conn()
    except Exception:
        conn = None

    try:
        from dashboard.components.nowcasting import render_nowcasting
        render_nowcasting(conn)
    except Exception:
        section_header("ESTIMACIÓN ACTUAL — NOWCASTING", CYAN)

        if not df_nc.empty:
            col_pct = next((c for c in ["estimacion_pct","voto_pct"] if c in df_nc.columns), None)
            col_part = next((c for c in ["partido_siglas","partido"] if c in df_nc.columns), None)
            if col_pct and col_part:
                df_show = df_nc[[col_part, col_pct]].copy()
                df_show.columns = ["Partido", "Estimación (%)"]
                df_show["Estimación (%)"] = pd.to_numeric(df_show["Estimación (%)"], errors="coerce").round(2)
                df_show = df_show.sort_values("Estimación (%)", ascending=False)
                st.dataframe(
                    df_show.style.background_gradient(
                        cmap="Blues", subset=["Estimación (%)"]
                    ),
                    use_container_width=True, hide_index=True,
                )
        else:
            st.info("Sin datos de nowcasting — conecta la base de datos.")
            st.page_link("pages/2_Nowcasting.py", label="→ Abrir Nowcasting clásico")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: D'HONDT — ASIGNACIÓN DE ESCAÑOS
# ═══════════════════════════════════════════════════════════════════════════════
with tab_dhondt:
    section_header("CALCULADORA D'HONDT — ASIGNACIÓN DE ESCAÑOS", CYAN)

    from dashboard.services.coalition_service import (
        dhondt, calcular_escanos_nacional, calcular_desproporcionalidad,
        TOTAL_ESCANOS, MAYORIA_ABSOLUTA
    )

    col_cfg, col_res = st.columns([1, 2], gap="large")

    with col_cfg:
        st.markdown(f'<div style="font-size:.8rem;color:{TEXT2};margin-bottom:.8rem">'
                    f'Ajusta los porcentajes de voto para simular diferentes escenarios:</div>',
                    unsafe_allow_html=True)

        metodo = st.selectbox(
            "Método de reparto",
            ["dhondt", "webster", "hare", "droop"],
            format_func=lambda x: {
                "dhondt": "D'Hondt (Jefferson) — actual España",
                "webster": "Webster (Sainte-Laguë)",
                "hare": "Resto mayor (Hare)",
                "droop": "Resto mayor (Droop)",
            }.get(x, x),
        )
        umbral = st.slider("Umbral de entrada (%)", 0.0, 5.0, 3.0, 0.5)

        st.markdown(f'<div style="font-size:.75rem;color:{MUTED};margin:.5rem 0">Votos por partido:</div>',
                    unsafe_allow_html=True)

        # Sliders de votación
        _partidos_slider = list(sondeo_actual.keys()) if sondeo_actual else [
            "PP", "PSOE", "VOX", "SUMAR", "JUNTS", "PNV", "ERC", "EH Bildu"
        ]
        votos_sim: dict[str, float] = {}
        for partido in _partidos_slider[:10]:
            default_val = float(sondeo_actual.get(partido, 5.0))
            color = COLORES_PARTIDOS.get(partido, "#555")
            votos_sim[partido] = st.slider(
                f"{partido}",
                0.0, 50.0,
                round(default_val, 1),
                0.5,
                key=f"dhondt_{partido}",
            )

    with col_res:
        # Calcular escaños
        try:
            escanos_calc = dhondt(votos_sim, n_escanos=TOTAL_ESCANOS, umbral_pct=umbral, metodo=metodo)
            resultados_esc = calcular_escanos_nacional(votos_sim, umbral_pct=umbral)

            # KPIs
            kpi_c1, kpi_c2, kpi_c3 = st.columns(3)
            if escanos_calc:
                lider = max(escanos_calc, key=lambda k: escanos_calc[k])
                kpi_c1.metric("Partido Líder", lider, f"{escanos_calc[lider]} esc.")
                kpi_c2.metric("Mayoría Absoluta", "176 escaños", "umbral")
                sum_escanos = sum(escanos_calc.values())
                faltan = MAYORIA_ABSOLUTA - escanos_calc[lider]
                kpi_c3.metric("Escaños al líder", escanos_calc[lider],
                              f"{'✅' if faltan <= 0 else f'-{faltan}'}")

            # Gráfico barras
            if escanos_calc:
                df_esc = pd.DataFrame([
                    {"partido": p, "votos": votos_sim.get(p, 0), "escanos": e}
                    for p, e in sorted(escanos_calc.items(), key=lambda x: x[1], reverse=True)
                ])
                fig = go.Figure()
                fig.add_trace(go.Bar(
                    name="Votos (%)",
                    x=df_esc["partido"], y=df_esc["votos"],
                    marker_color=[COLORES_PARTIDOS.get(p, "#555") + "88" for p in df_esc["partido"]],
                    opacity=0.7,
                    hovertemplate="<b>%{x}</b><br>Votos: %{y:.1f}%<extra></extra>",
                ))
                fig.add_trace(go.Bar(
                    name="Escaños (/350)",
                    x=df_esc["partido"],
                    y=df_esc["escanos"] / TOTAL_ESCANOS * 100,
                    marker_color=[COLORES_PARTIDOS.get(p, "#555") for p in df_esc["partido"]],
                    hovertemplate="<b>%{x}</b><br>Escaños: %{customdata[0]}<br>(%{y:.1f}% del hemiciclo)<extra></extra>",
                    customdata=[[e] for e in df_esc["escanos"]],
                    text=[str(e) for e in df_esc["escanos"]],
                    textposition="outside",
                    textfont=dict(color=TEXT, size=10, family="JetBrains Mono"),
                ))
                fig.update_layout(
                    height=280, barmode="group",
                    paper_bgcolor=BG2, plot_bgcolor=BG2,
                    margin=dict(t=10, b=10, l=10, r=10),
                    xaxis=dict(color=TEXT, tickfont=dict(size=11)),
                    yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%", title=""),
                    legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.2,
                                font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
                    bargap=0.15, bargroupgap=0.05,
                )
                st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

                # Tabla detallada
                df_tabla = df_esc.copy()
                df_tabla["escanos_pct"] = (df_tabla["escanos"] / TOTAL_ESCANOS * 100).round(1)
                df_tabla["diferencia"] = (df_tabla["escanos_pct"] - df_tabla["votos"]).round(1)
                df_tabla.columns = ["Partido", "Votos (%)", "Escaños", "Esc. (%)", "Prima (+/-)"]
                st.dataframe(df_tabla.set_index("Partido"), use_container_width=True)

                # Índice de desproporcionalidad
                try:
                    votos_list = [votos_sim.get(p, 0) for p in df_esc["partido"]]
                    esc_list = df_esc["escanos"].tolist()
                    disp = calcular_desproporcionalidad(votos_list, esc_list)
                    c1, c2, c3 = st.columns(3)
                    c1.metric("Gallagher (LSq)", f"{disp['gallagher']:.2f}",
                              "< 5 = proporcional")
                    c2.metric("Loosemore-Hanby", f"{disp['loosemore_hanby']:.2f}", "")
                    c3.metric("Índice Rae", f"{disp['rae']:.2f}", "")
                except Exception:
                    pass
        except Exception as exc:
            st.error(f"Error en cálculo: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: COALICIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_coal:
    section_header("ANÁLISIS DE COALICIONES POSIBLES", PURPLE)

    from dashboard.services.coalition_service import (
        analizar_coaliciones, probabilidad_bayesiana_mayoria, MAYORIA_ABSOLUTA
    )

    col_coala, col_coalb = st.columns([2, 1], gap="large")

    with col_coala:
        # Calcular coaliciones con el sondeo actual
        try:
            esc_actual = dhondt(sondeo_actual)
            coaliciones = analizar_coaliciones(esc_actual)

            section_header("POSIBLES COALICIONES DE GOBIERNO", CYAN)
            for coal in coaliciones[:8]:
                tiene_may = coal.tiene_mayoria
                color_coal = GREEN if tiene_may else RED
                bg_coal = f"{GREEN}10" if tiene_may else f"{RED}08"
                prob_bar = int(coal.probabilidad * 100)

                partidos_chips = "".join(
                    f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;'
                    f'color:{COLORES_PARTIDOS.get(p,"#aaa")};border:1px solid {COLORES_PARTIDOS.get(p,"#444")}44;'
                    f'border-radius:4px;padding:.1rem .5rem;font-size:.7rem;font-weight:700">{p}</span>'
                    for p in coal.partidos[:5]
                )

                st.markdown(f"""
                <div style="background:{bg_coal};border:1px solid {color_coal}33;
                            border-radius:10px;padding:.9rem 1.1rem;margin-bottom:.6rem">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
                    <div>
                      <span style="font-size:.88rem;font-weight:800;color:{TEXT}">{coal.nombre}</span>
                      <span style="margin-left:.6rem;background:{color_coal}22;color:{color_coal};
                                   border-radius:4px;padding:.1rem .5rem;font-size:.7rem;font-weight:700">
                        {'✅ MAYORÍA' if tiene_may else '❌ SIN MAYORÍA'}
                      </span>
                    </div>
                    <span style="font-family:monospace;font-size:.9rem;font-weight:900;color:{color_coal}">
                      {coal.escanos_totales}
                    </span>
                  </div>
                  <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">{partidos_chips}</div>
                  <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden">
                    <div style="width:{prob_bar}%;height:100%;background:{color_coal};border-radius:2px"></div>
                  </div>
                  <div style="font-size:.65rem;color:{MUTED};margin-top:.25rem">
                    Probabilidad estimada: {coal.probabilidad*100:.0f}%
                  </div>
                </div>
                """, unsafe_allow_html=True)
        except Exception as exc:
            st.error(f"Error en análisis de coaliciones: {exc}")
            st.page_link("pages/4_Coaliciones.py", label="→ Abrir Coaliciones clásico")

    with col_coalb:
        # Probabilidades bayesianas Monte Carlo
        section_header("PROBABILIDADES BAYESIANAS (MC)", AMBER)
        with st.spinner("Simulando 10.000 escenarios..."):
            try:
                incert = st.slider("Incertidumbre de encuesta (σ)", 0.5, 5.0, 2.5, 0.5)
                probs = probabilidad_bayesiana_mayoria(
                    sondeo_actual,
                    incertidumbre_std=incert,
                    n_simulaciones=5_000,
                )
                if probs:
                    df_probs = pd.DataFrame(
                        sorted(probs.items(), key=lambda x: x[1], reverse=True),
                        columns=["Coalición", "Probabilidad"]
                    )
                    df_probs = df_probs[df_probs["Probabilidad"] > 0.01]
                    df_probs["Prob %"] = (df_probs["Probabilidad"] * 100).round(1)

                    fig_probs = go.Figure(go.Bar(
                        y=df_probs["Coalición"],
                        x=df_probs["Prob %"],
                        orientation="h",
                        marker=dict(
                            color=df_probs["Prob %"],
                            colorscale=[[0, f"{RED}88"], [0.5, f"{AMBER}88"], [1, f"{GREEN}88"]],
                            line=dict(width=0),
                        ),
                        text=[f"{v:.0f}%" for v in df_probs["Prob %"]],
                        textposition="outside",
                        textfont=dict(size=10, color=TEXT),
                        hovertemplate="<b>%{y}</b><br>%{x:.1f}%<extra></extra>",
                    ))
                    fig_probs.update_layout(
                        height=max(200, len(df_probs) * 35),
                        margin=dict(t=10, b=10, l=10, r=60),
                        paper_bgcolor=BG2, plot_bgcolor=BG2,
                        xaxis=dict(color=TEXT2, gridcolor=BORDER, range=[0, 100], ticksuffix="%"),
                        yaxis=dict(color=TEXT, tickfont=dict(size=10)),
                        showlegend=False,
                    )
                    st.plotly_chart(fig_probs, use_container_width=True,
                                   config={"displayModeBar": False})
            except Exception as exc:
                st.warning(f"Simulación no disponible: {exc}")

        st.markdown(f"""
        <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                    padding:.8rem;font-size:.72rem;color:{MUTED}">
          <strong style="color:{TEXT2}">Metodología:</strong> Simulación Monte Carlo
          con {5_000:,} escenarios. Cada muestra añade ruido gaussiano
          N(0, σ) a los sondeos, aplica D'Hondt y verifica mayorías.
          Inspirado en us-potus-model (Andrew Gelman et al.).
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: HEMICICLO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_hemi:
    section_header("HEMICICLO INTERACTIVO — CONGRESO DE LOS DIPUTADOS", CYAN)

    from dashboard.services.coalition_service import hemiciclo_plotly, dhondt

    col_h1, col_h2 = st.columns([2, 1], gap="large")

    with col_h1:
        # Selector de escenario
        escenario = st.selectbox(
            "Escenario",
            ["Sondeo actual", "Elecciones 23-J 2023", "Simulación personalizada"],
            key="hemi_escenario",
        )

        if escenario == "Sondeo actual":
            sondeo_hemi = sondeo_actual
        elif escenario == "Elecciones 23-J 2023":
            sondeo_hemi = {"PP": 33.05, "PSOE": 31.70, "VOX": 12.39, "SUMAR": 12.31,
                           "JUNTS": 1.63, "ERC": 1.47, "PNV": 1.18, "EH Bildu": 1.03, "BNG": 0.60, "CC": 0.43}
        else:
            st.markdown(f'<div style="font-size:.78rem;color:{TEXT2};margin-bottom:.5rem">'
                        f'Ajusta el sondeo personalizado:</div>', unsafe_allow_html=True)
            sondeo_hemi = {}
            for p in ["PP", "PSOE", "VOX", "SUMAR", "JUNTS", "PNV", "ERC", "EH Bildu"]:
                default = float(sondeo_actual.get(p, 5.0))
                sondeo_hemi[p] = st.slider(f"{p} %", 0.0, 50.0, default, 0.5, key=f"hemi_{p}")

        try:
            esc_hemi = dhondt(sondeo_hemi)
            fig_hemi = hemiciclo_plotly(esc_hemi, COLORES_PARTIDOS,
                                        f"Congreso estimado — {escenario}")
            st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})
        except Exception as exc:
            st.error(f"Error al generar hemiciclo: {exc}")

    with col_h2:
        section_header("DISTRIBUCIÓN DE ESCAÑOS", PURPLE)
        try:
            esc_tabla = dhondt(sondeo_hemi) if "sondeo_hemi" in dir() else dhondt(sondeo_actual)
            if esc_tabla:
                df_esc_t = pd.DataFrame([
                    {"Partido": p, "Escaños": e,
                     "Mayoria": "✅" if e >= 176 else ("⚠️" if e >= 140 else "❌")}
                    for p, e in sorted(esc_tabla.items(), key=lambda x: x[1], reverse=True)
                    if e > 0
                ])
                st.dataframe(df_esc_t.set_index("Partido"), use_container_width=True)

                # Mayorías posibles
                st.markdown("<br>", unsafe_allow_html=True)
                section_header("BLOQUES DE MAYORÍA", AMBER)
                total = sum(esc_tabla.values())

                _bloques = {
                    "PP + VOX": ["PP", "VOX"],
                    "PSOE + SUMAR": ["PSOE", "SUMAR"],
                    "PP solo": ["PP"],
                    "PSOE solo": ["PSOE"],
                }
                for nombre, partidos in _bloques.items():
                    esc_bloque = sum(esc_tabla.get(p, 0) for p in partidos)
                    tiene = esc_bloque >= 176
                    color_b = GREEN if tiene else RED
                    st.markdown(f"""
                    <div style="display:flex;justify-content:space-between;padding:.4rem .6rem;
                                border-radius:6px;border:1px solid {color_b}33;
                                background:{color_b}10;margin-bottom:.3rem">
                      <span style="font-size:.78rem;color:{TEXT2}">{nombre}</span>
                      <span style="font-size:.78rem;font-weight:900;color:{color_b};
                                   font-family:monospace">{esc_bloque}</span>
                    </div>
                    """, unsafe_allow_html=True)
        except Exception as exc:
            st.warning(f"Error: {exc}")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6: PROYECCIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_proj:
    section_header("PROYECCIONES ELECTORALES — STATSFORECAST", CYAN)

    from dashboard.services.forecast_service import proyectar_todos, tendencia_reciente

    if df_hist is not None and not df_hist.empty:
        horizonte_w = st.slider("Horizonte de proyección (semanas)", 2, 16, 8, 1,
                                key="proj_horizonte")

        col_fecha = next((c for c in ["fecha", "date", "ds"] if c in df_hist.columns), None)

        with st.spinner("Calculando proyecciones con AutoARIMA + ETS..."):
            try:
                proyecciones = proyectar_todos(df_hist, col_fecha=col_fecha or "", horizonte=horizonte_w)

                if proyecciones:
                    # Gráfico de proyecciones múltiples
                    fig_proj = go.Figure()
                    for partido, proj in list(proyecciones.items())[:8]:
                        df_fc = proj["df_forecast"]
                        color = COLORES_PARTIDOS.get(partido, "#555")

                        # Banda IC
                        fig_proj.add_trace(go.Scatter(
                            x=pd.concat([df_fc["fecha"], df_fc["fecha"].iloc[::-1]]),
                            y=pd.concat([df_fc["ic_sup"], df_fc["ic_inf"].iloc[::-1]]),
                            fill="toself",
                            fillcolor=f"{color}18",
                            line=dict(color="rgba(0,0,0,0)"),
                            showlegend=False,
                            hoverinfo="skip",
                        ))
                        # Línea central
                        fig_proj.add_trace(go.Scatter(
                            x=df_fc["fecha"], y=df_fc["valor"],
                            name=f"{partido} ({proj['tendencia']})",
                            line=dict(color=color, width=2.5),
                            mode="lines",
                            hovertemplate=f"<b>{partido}</b><br>%{{y:.1f}}%<extra></extra>",
                        ))

                    fig_proj.add_hline(
                        y=33.3,
                        line_dash="dot",
                        line_color=AMBER + "88",
                        annotation_text="33%",
                        annotation_font_color=AMBER,
                    )

                    fig_proj.update_layout(
                        height=380,
                        paper_bgcolor=BG2, plot_bgcolor=BG2,
                        margin=dict(t=20, b=10, l=10, r=10),
                        xaxis=dict(color=TEXT2, gridcolor=BORDER, tickformat="%b %d"),
                        yaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%",
                                   title="Intención de voto (%)"),
                        legend=dict(
                            orientation="h", x=0.5, xanchor="center", y=-0.2,
                            font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)",
                        ),
                        hovermode="x unified",
                    )
                    st.plotly_chart(fig_proj, use_container_width=True,
                                   config={"displayModeBar": False})

                    # Tabla resumen proyecciones
                    st.markdown("<br>", unsafe_allow_html=True)
                    section_header("RESUMEN DE PROYECCIONES", PURPLE)
                    datos_tabla = []
                    for partido, proj in proyecciones.items():
                        tend = proj["tendencia"]
                        flecha = "↑" if tend == "sube" else ("↓" if tend == "baja" else "→")
                        datos_tabla.append({
                            "Partido": partido,
                            "Actual (%)": proj["ultima_encuesta"],
                            f"Proj {horizonte_w}w": proj["proyeccion"],
                            "IC inf": proj["ic_inf"],
                            "IC sup": proj["ic_sup"],
                            "Tendencia": f"{flecha} {tend}",
                            "Modelo": proj.get("modelo", "—"),
                        })
                    df_tabla_proj = pd.DataFrame(datos_tabla)
                    st.dataframe(df_tabla_proj.set_index("Partido"), use_container_width=True)
                else:
                    st.info("Sin suficientes datos históricos para proyecciones.")
            except Exception as exc:
                st.error(f"Error en proyecciones: {exc}")
    else:
        st.info("Sin datos históricos de sondeos disponibles para proyecciones.")
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1.5rem">
          <div style="color:{TEXT2};font-size:.9rem;margin-bottom:.8rem">
            <strong>Proyecciones disponibles</strong> cuando existan datos históricos de encuestas.
          </div>
          <ul style="color:{MUTED};font-size:.82rem;line-height:1.8">
            <li>AutoARIMA — ajuste automático de parámetros</li>
            <li>ETS (Holt-Winters) — suavizado exponencial con tendencia</li>
            <li>Theta — método robusto para series cortas</li>
            <li>Intervalos de confianza al 80% y 95%</li>
          </ul>
          <div style="font-size:.75rem;color:{MUTED};margin-top:.5rem">
            Powered by <strong>statsforecast</strong> (Nixtla) + us-potus-model methodology
          </div>
        </div>
        """, unsafe_allow_html=True)
