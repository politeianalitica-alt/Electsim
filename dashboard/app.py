"""
ElectSim España — Dashboard Principal (Politeia Edition · Dark Tech v3)
Rediseño profesional con animaciones, glassmorphism y visualización avanzada.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    COLORES_PARTIDOS,
    BG, BG2, BG3, BORDER, BORDER2,
    CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED,
    GREEN, AMBER, RED,
)

st.set_page_config(
    page_title="ElectSim España — Politeia",
    layout="wide",
    initial_sidebar_state="expanded",
)

sidebar_nav()

# ── Data ──────────────────────────────────────────────────────────────────────
from dashboard.db import (
    cargar_alertas, cargar_elecciones, cargar_nowcasting,
    cargar_macro_ultimo, cargar_indices_politeia,
)

df_elec    = cargar_elecciones("generales")
df_macro   = cargar_macro_ultimo()
df_alertas = cargar_alertas(solo_no_leidas=False)
df_nc      = cargar_nowcasting()

# ── Intro animation CSS ──────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
  from {{ opacity: 0; transform: translateY(24px); }}
  to   {{ opacity: 1; transform: translateY(0); }}
}}
@keyframes fadeIn {{
  from {{ opacity: 0; }}
  to   {{ opacity: 1; }}
}}
@keyframes shimmer {{
  0% {{ background-position: -200% center; }}
  100% {{ background-position: 200% center; }}
}}
@keyframes pulseGlow {{
  0%, 100% {{ box-shadow: 0 0 0 0 {CYAN}44; }}
  50% {{ box-shadow: 0 0 12px 4px {CYAN}22; }}
}}
@keyframes gradientMove {{
  0% {{ background-position: 0% 50%; }}
  50% {{ background-position: 100% 50%; }}
  100% {{ background-position: 0% 50%; }}
}}
@keyframes dotPulse {{
  0%, 100% {{ opacity: 1; box-shadow: 0 0 0 0 {GREEN}66; }}
  50% {{ opacity: .7; box-shadow: 0 0 0 6px transparent; }}
}}
@keyframes slideInLeft {{
  from {{ opacity: 0; transform: translateX(-20px); }}
  to   {{ opacity: 1; transform: translateX(0); }}
}}

.es-animate {{ animation: fadeInUp .6s ease-out both; }}
.es-animate-d1 {{ animation: fadeInUp .6s ease-out .1s both; }}
.es-animate-d2 {{ animation: fadeInUp .6s ease-out .2s both; }}
.es-animate-d3 {{ animation: fadeInUp .6s ease-out .3s both; }}
.es-animate-d4 {{ animation: fadeInUp .6s ease-out .4s both; }}
.es-animate-d5 {{ animation: fadeInUp .6s ease-out .5s both; }}

.glass-card {{
  background: linear-gradient(135deg, {BG2}ee, {BG3}cc);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid {BORDER};
  border-radius: 14px;
  transition: all .25s ease;
}}
.glass-card:hover {{
  border-color: {CYAN}55;
  box-shadow: 0 4px 24px {CYAN}11;
}}
</style>
""", unsafe_allow_html=True)

# ── Logo Animation + Header ──────────────────────────────────────────────────
n_alertas_criticas = len(df_alertas[df_alertas["severidad"] == "CRITICAL"]) if not df_alertas.empty else 0

st.markdown(f"""
<div class="es-animate" style="
    background: linear-gradient(135deg, {BG2} 0%, #0a1628 40%, {BG3} 100%);
    border: 1px solid {BORDER};
    border-radius: 16px;
    padding: 2rem 2.5rem;
    margin-bottom: 1.8rem;
    position: relative;
    overflow: hidden;
">
    <!-- Animated gradient orb -->
    <div style="position:absolute;top:-80px;right:-40px;width:280px;height:280px;
                background:radial-gradient(circle, {CYAN}15 0%, {BLUE}08 40%, transparent 70%);
                pointer-events:none;animation:gradientMove 8s ease infinite;
                background-size:200% 200%"></div>
    <div style="position:absolute;bottom:-60px;left:20%;width:200px;height:200px;
                background:radial-gradient(circle, {PURPLE}10 0%, transparent 70%);
                pointer-events:none"></div>

    <div style="display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:1.4rem">
            <!-- Logo placeholder -->
            <div style="width:56px;height:56px;
                        background:linear-gradient(135deg,{CYAN},{BLUE},{PURPLE});
                        border-radius:14px;display:flex;align-items:center;justify-content:center;
                        font-weight:900;font-size:1.2rem;color:{BG};
                        box-shadow:0 4px 20px {CYAN}33;
                        animation:pulseGlow 3s ease infinite;flex-shrink:0">
                ES
            </div>
            <div>
                <div style="font-size:.62rem;font-weight:700;letter-spacing:.25em;color:{CYAN}aa;
                            text-transform:uppercase;margin-bottom:.4rem">
                    Gemelo Digital Politico &middot; Social &middot; Economico
                </div>
                <div style="font-size:2.2rem;font-weight:900;color:{TEXT};letter-spacing:-.04em;line-height:1.05">
                    Elect<span style="background:linear-gradient(90deg,{CYAN},{BLUE});
                    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                    background-clip:text">Sim</span>
                    <span style="font-weight:400;color:{TEXT2};font-size:1.4rem;margin-left:.15rem">Espana</span>
                </div>
                <div style="font-size:.78rem;color:{TEXT2};margin-top:.3rem;font-weight:400">
                    Politeia Analytics &mdash; Modelos electorales en tiempo real
                </div>
            </div>
        </div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:.5rem">
            <div style="display:inline-flex;align-items:center;gap:.45rem;
                        background:{GREEN}12;border:1px solid {GREEN}33;
                        border-radius:24px;padding:.35rem .9rem">
                <span style="display:inline-block;width:8px;height:8px;background:{GREEN};
                              border-radius:50%;animation:dotPulse 2s ease infinite"></span>
                <span style="font-size:.68rem;font-weight:700;color:{GREEN};letter-spacing:.1em;
                              text-transform:uppercase">Sistema activo</span>
            </div>
            <div style="font-size:.65rem;color:{MUTED};font-family:'JetBrains Mono',monospace">
                v2.0 &middot; Real-time
            </div>
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── KPI Cards ────────────────────────────────────────────────────────────────
kpi_data = []

# 1 - Elecciones
n_elec = len(df_elec) if not df_elec.empty else 0
kpi_data.append(("Elecciones en BD", str(n_elec), CYAN, "Base de datos historica"))

# 2 - Nowcasting
n_nc = len(df_nc) if not df_nc.empty else 0
kpi_data.append(("Estimaciones activas", str(n_nc), BLUE, "Partidos con nowcasting"))

# 3 - IPC
if not df_macro.empty:
    fila = df_macro[df_macro["indicador"] == "IPC General (%)"]
    ipc_val = f"{fila.iloc[0]['valor']:.1f}%" if not fila.empty else "---"
else:
    ipc_val = "---"
kpi_data.append(("IPC General", ipc_val, AMBER, "Ultimo dato disponible"))

# 4 - Prima Riesgo
if not df_macro.empty:
    fila = df_macro[df_macro["indicador"] == "Prima Riesgo (pb)"]
    prima_val = f"{fila.iloc[0]['valor']:.0f} pb" if not fila.empty else "---"
else:
    prima_val = "---"
kpi_data.append(("Prima de Riesgo", prima_val, PURPLE, "Diferencial bono 10Y"))

# 5 - Alertas
n_alertas = len(df_alertas) if not df_alertas.empty else 0
alert_color = RED if n_alertas_criticas > 0 else GREEN
kpi_data.append(("Alertas del sistema", str(n_alertas), alert_color,
                 f"{n_alertas_criticas} criticas" if n_alertas_criticas > 0 else "Sin alertas criticas"))

cols_kpi = st.columns(5, gap="medium")
for idx, (label, value, color, subtitle) in enumerate(kpi_data):
    with cols_kpi[idx]:
        st.markdown(f"""
        <div class="glass-card es-animate-d{idx+1}" style="
            padding: 1.2rem 1.3rem;
            border-top: 2px solid {color}55;
            position: relative;
            overflow: hidden;
        ">
            <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;
                        background:radial-gradient({color}0a, transparent 70%);pointer-events:none"></div>
            <div style="font-size:.62rem;font-weight:700;letter-spacing:.12em;color:{MUTED};
                        text-transform:uppercase;margin-bottom:.5rem">{label}</div>
            <div style="font-size:1.7rem;font-weight:900;color:{TEXT};
                        font-family:'JetBrains Mono',monospace;line-height:1">{value}</div>
            <div style="font-size:.6rem;color:{color};margin-top:.4rem;font-weight:600;
                        letter-spacing:.04em">{subtitle}</div>
        </div>
        """, unsafe_allow_html=True)

st.markdown("<div style='height:1.2rem'></div>", unsafe_allow_html=True)

# ── Nowcasting Panel ─────────────────────────────────────────────────────────
col_nc, col_right = st.columns([1.7, 1], gap="large")

with col_nc:
    st.markdown(f"""
    <div class="es-animate-d2" style="display:flex;align-items:center;gap:.7rem;margin-bottom:1rem">
        <div style="width:4px;height:20px;background:linear-gradient({CYAN},{BLUE});border-radius:2px"></div>
        <span style="font-size:.75rem;font-weight:700;color:{CYAN};
                     letter-spacing:.15em;text-transform:uppercase">Estimacion Electoral &middot; Nowcasting</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)

    if not df_nc.empty:
        df_top = df_nc.sort_values("estimacion_pct", ascending=False).copy()

        fig = go.Figure()
        for _, row in df_top.iterrows():
            color = COLORES_PARTIDOS.get(row["partido_siglas"].upper(), "#888888")
            r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
            fig.add_trace(go.Bar(
                x=[row["partido_siglas"]],
                y=[row["estimacion_pct"]],
                name=row["partido_siglas"],
                marker=dict(
                    color=f"rgba({r},{g},{b},0.75)",
                    line=dict(color=color, width=1.5),
                    pattern=dict(shape="", solidity=0.1),
                ),
                error_y=dict(
                    type="data", symmetric=False,
                    array=[max(0, row["ic_95_sup"] - row["estimacion_pct"])],
                    arrayminus=[max(0, row["estimacion_pct"] - row["ic_95_inf"])],
                    color=f"rgba({r},{g},{b},0.5)", thickness=1.5, width=4,
                ),
                text=[f"{row['estimacion_pct']:.1f}%"],
                textposition="outside",
                textfont=dict(color=TEXT, size=11, family="JetBrains Mono, monospace"),
            ))

        fig.update_layout(
            height=340, barmode="group",
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(
                showgrid=False, tickfont=dict(size=11, color=TEXT2, family="Inter, sans-serif"),
                categoryorder="array",
                categoryarray=df_top["partido_siglas"].tolist(),
                fixedrange=True,
            ),
            yaxis=dict(
                gridcolor="rgba(30,41,59,0.53)", gridwidth=1,
                color=TEXT2,
                range=[0, df_top["ic_95_sup"].max() + 6],
                tickfont=dict(size=10, color=MUTED),
                ticksuffix="%",
                fixedrange=True,
            ),
            showlegend=False,
            margin=dict(t=15, b=5, l=5, r=5),
            font=dict(family="Inter, sans-serif"),
            hoverlabel=dict(
                bgcolor=BG2,
                font=dict(size=12, family="JetBrains Mono, monospace"),
                bordercolor=BORDER,
            ),
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})

        # ── Party metric strip ───────────────────────────────────────────────
        cols_p = st.columns(len(df_top))
        for i, (_, row) in enumerate(df_top.iterrows()):
            color = COLORES_PARTIDOS.get(row["partido_siglas"].upper(), "#888888")
            r, g, b = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
            with cols_p[i]:
                st.markdown(f"""
                <div style="text-align:center;padding:.55rem .15rem;
                            background:linear-gradient(180deg,rgba({r},{g},{b},0.08),{BG2});
                            border:1px solid {BORDER};
                            border-top:3px solid {color};border-radius:0 0 8px 8px;
                            transition:all .2s ease">
                    <div style="font-size:.55rem;font-weight:700;color:{MUTED};
                                letter-spacing:.08em;margin-bottom:.2rem">{row['partido_siglas']}</div>
                    <div style="font-size:1.1rem;font-weight:900;color:{color};
                                font-family:'JetBrains Mono',monospace">{row['estimacion_pct']:.1f}%</div>
                    <div style="font-size:.48rem;color:{MUTED};margin-top:.15rem;
                                font-family:'JetBrains Mono',monospace">
                        [{row['ic_95_inf']:.1f} - {row['ic_95_sup']:.1f}]
                    </div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("Sin datos de nowcasting.")

with col_right:
    # ── Alertas ──────────────────────────────────────────────────────────────
    st.markdown(f"""
    <div class="es-animate-d3" style="display:flex;align-items:center;gap:.7rem;margin-bottom:1rem">
        <div style="width:4px;height:20px;background:linear-gradient({RED},{AMBER});border-radius:2px"></div>
        <span style="font-size:.75rem;font-weight:700;color:{RED};
                     letter-spacing:.15em;text-transform:uppercase">Alertas</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
        <span style="font-size:.6rem;font-weight:700;color:{MUTED};
                     background:{BG3};padding:.2rem .5rem;border-radius:10px;
                     border:1px solid {BORDER}">{n_alertas} total</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_alertas.empty:
        for idx, (_, a) in enumerate(df_alertas.head(7).iterrows()):
            sev = a.get("severidad", "INFO")
            if sev == "CRITICAL":
                bc, icon = RED, "!!"
            elif sev == "WARNING":
                bc, icon = AMBER, "!"
            else:
                bc, icon = CYAN, "i"
            st.markdown(f"""
            <div class="es-animate" style="
                border-left:3px solid {bc};
                padding:.5rem .85rem;margin:.3rem 0;
                background:linear-gradient(90deg,{bc}08,{BG2});
                border-radius:0 10px 10px 0;
                border-top:1px solid {BORDER};border-right:1px solid {BORDER};
                border-bottom:1px solid {BORDER};
                transition:all .2s ease;
            ">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <div style="display:flex;align-items:center;gap:.45rem;flex:1;min-width:0">
                        <span style="font-size:.58rem;font-weight:900;color:{bc};
                                     background:{bc}15;width:18px;height:18px;
                                     display:flex;align-items:center;justify-content:center;
                                     border-radius:5px;flex-shrink:0;border:1px solid {bc}33">{icon}</span>
                        <span style="font-size:.74rem;font-weight:600;color:{TEXT};
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                            {str(a.get('titulo',''))[:42]}
                        </span>
                    </div>
                    <span style="font-size:.52rem;font-weight:700;color:{bc};
                                 background:{bc}12;border:1px solid {bc}33;
                                 padding:.12rem .4rem;border-radius:5px;white-space:nowrap;
                                 margin-left:.3rem;letter-spacing:.08em">{sev}</span>
                </div>
                <div style="font-size:.58rem;color:{MUTED};margin-top:.2rem;margin-left:1.6rem;
                            font-family:'JetBrains Mono',monospace">{str(a.get('created_at',''))[:10]}</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="glass-card" style="padding:1.8rem;text-align:center">
            <div style="width:36px;height:36px;background:{GREEN}15;border:2px solid {GREEN}33;
                        border-radius:10px;margin:0 auto .6rem;display:flex;align-items:center;
                        justify-content:center;font-size:1rem;color:{GREEN}">&#10003;</div>
            <div style="color:{GREEN};font-weight:700;font-size:.78rem;letter-spacing:.08em;
                        text-transform:uppercase">Sin alertas activas</div>
            <div style="color:{MUTED};font-size:.62rem;margin-top:.3rem">
                Todos los sistemas operativos
            </div>
        </div>
        """, unsafe_allow_html=True)

st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);
            margin:1.5rem 0"></div>
""", unsafe_allow_html=True)

# ── Macro + Ultimas Elecciones ────────────────────────────────────────────────
col_macro, col_elec = st.columns([1, 1], gap="large")

with col_macro:
    st.markdown(f"""
    <div class="es-animate-d3" style="display:flex;align-items:center;gap:.7rem;margin-bottom:1rem">
        <div style="width:4px;height:20px;background:linear-gradient({BLUE},{PURPLE});border-radius:2px"></div>
        <span style="font-size:.75rem;font-weight:700;color:{BLUE};
                     letter-spacing:.15em;text-transform:uppercase">Indicadores Macro</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)

    if not df_macro.empty:
        indicadores_show = [
            ("IPC General (%)",        AMBER, "%"),
            ("Crec. PIB (%)",          GREEN, "%"),
            ("Prima Riesgo (pb)",      RED,   " pb"),
            ("Euribor 12m (%)",        CYAN,  "%"),
            ("IBEX 35",                BLUE,  ""),
            ("Deuda Publica (% PIB)",  PURPLE, "%"),
        ]
        cols_m = st.columns(3)
        shown = 0
        for ind, ind_color, suffix in indicadores_show:
            fila = df_macro[df_macro["indicador"] == ind]
            if not fila.empty:
                val = float(fila.iloc[0]["valor"])
                label = ind.replace(" (%)", "").replace(" (pb)", "").replace(" (% PIB)", "")
                if ind == "IBEX 35":
                    display_val = f"{val:,.0f}"
                else:
                    display_val = f"{val:.1f}{suffix}"
                with cols_m[shown % 3]:
                    st.markdown(f"""
                    <div class="glass-card" style="padding:1rem 1.1rem;margin-bottom:.5rem;
                                border-top:2px solid {ind_color}44">
                        <div style="font-size:.58rem;font-weight:700;letter-spacing:.1em;
                                    color:{MUTED};text-transform:uppercase;margin-bottom:.35rem">{label}</div>
                        <div style="font-size:1.35rem;font-weight:800;color:{TEXT};
                                    font-family:'JetBrains Mono',monospace">{display_val}</div>
                    </div>
                    """, unsafe_allow_html=True)
                shown += 1
    else:
        st.info("Sin datos macro. Ejecuta el ETL de INE/BDE.")

with col_elec:
    st.markdown(f"""
    <div class="es-animate-d4" style="display:flex;align-items:center;gap:.7rem;margin-bottom:1rem">
        <div style="width:4px;height:20px;background:linear-gradient({PURPLE},{CYAN});border-radius:2px"></div>
        <span style="font-size:.75rem;font-weight:700;color:{PURPLE};
                     letter-spacing:.15em;text-transform:uppercase">Ultimas Elecciones</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,{BORDER},{BG})"></div>
    </div>
    """, unsafe_allow_html=True)

    if not df_elec.empty:
        for idx, (_, e) in enumerate(df_elec.head(6).iterrows()):
            fecha = str(e.get("fecha", ""))[:10]
            desc  = str(e.get("descripcion", "Elecciones Generales"))
            st.markdown(f"""
            <div class="glass-card" style="
                display:flex;justify-content:space-between;align-items:center;
                padding:.6rem 1rem;margin-bottom:.35rem;
                border-left:3px solid {PURPLE}55;
            ">
                <div style="display:flex;align-items:center;gap:.6rem;flex:1;min-width:0">
                    <div style="width:7px;height:7px;background:{PURPLE};border-radius:50%;
                                flex-shrink:0;box-shadow:0 0 6px {PURPLE}44"></div>
                    <span style="font-size:.78rem;font-weight:600;color:{TEXT};
                                 overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{desc[:55]}</span>
                </div>
                <span style="font-size:.65rem;color:{MUTED};white-space:nowrap;margin-left:.6rem;
                             font-family:'JetBrains Mono',monospace;
                             background:{BG3};padding:.15rem .5rem;border-radius:6px;
                             border:1px solid {BORDER}">{fecha}</span>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        if st.button("Ver mapa electoral completo  ->", use_container_width=True):
            st.switch_page("pages/1_Mapa_Electoral.py")
    else:
        st.info("Sin datos de elecciones.")

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="height:1px;background:linear-gradient(90deg,transparent,{BORDER},transparent);
            margin:1.5rem 0 .8rem"></div>
<div style="display:flex;justify-content:space-between;align-items:center;
            padding:.4rem 0;font-size:.6rem;color:{MUTED}">
    <span>ElectSim Espana v2.0 &middot; Politeia Analytics</span>
    <span style="font-family:'JetBrains Mono',monospace;color:{CYAN}66">
        {len(df_elec) if not df_elec.empty else 0} elecciones &nbsp;&middot;&nbsp;
        {len(df_nc) if not df_nc.empty else 0} estimaciones
    </span>
</div>
""", unsafe_allow_html=True)
