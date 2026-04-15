"""
ElectSim España — Dashboard Principal (Politeia Edition · Dark Tech)
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

# ── Header ────────────────────────────────────────────────────────────────────
n_alertas_criticas = len(df_alertas[df_alertas["severidad"] == "CRITICAL"]) if not df_alertas.empty else 0

st.markdown(f"""
<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);
            border:1px solid {BORDER};border-left:3px solid {CYAN};
            border-radius:12px;padding:1.6rem 2rem;margin-bottom:1.5rem;
            position:relative;overflow:hidden">
    <!-- glow accent -->
    <div style="position:absolute;top:-60px;right:-60px;width:220px;height:220px;
                background:radial-gradient({CYAN}18,transparent 70%);pointer-events:none"></div>
    <div style="display:flex;justify-content:space-between;align-items:center;position:relative">
        <div>
            <div style="font-size:.68rem;font-weight:700;letter-spacing:.2em;color:{CYAN};
                        text-transform:uppercase;margin-bottom:.5rem">Gemelo Digital Político · Social · Económico</div>
            <div style="font-size:2rem;font-weight:900;color:{TEXT};letter-spacing:-.03em;line-height:1">
                ElectSim <span style="color:{CYAN}">España</span>
            </div>
            <div style="font-size:.82rem;color:{TEXT2};margin-top:.35rem;font-weight:400">
                Politeia Analytics &nbsp;·&nbsp; Modelos electorales en tiempo real
            </div>
        </div>
        <div style="text-align:right">
            <div style="display:inline-flex;align-items:center;gap:.4rem;
                        background:{GREEN}18;border:1px solid {GREEN}44;
                        border-radius:20px;padding:.3rem .8rem">
                <span style="display:inline-block;width:7px;height:7px;background:{GREEN};
                              border-radius:50%;animation:pulse 2s infinite"></span>
                <span style="font-size:.72rem;font-weight:700;color:{GREEN};letter-spacing:.08em;
                              text-transform:uppercase">Sistema activo</span>
            </div>
            <div style="font-size:.7rem;color:{MUTED};margin-top:.5rem">Datos en tiempo real</div>
        </div>
    </div>
</div>
<style>
@keyframes pulse {{
  0%, 100% {{ opacity:1; box-shadow:0 0 0 0 {GREEN}44; }}
  50% {{ opacity:.8; box-shadow:0 0 0 5px transparent; }}
}}
</style>
""", unsafe_allow_html=True)

# ── KPIs ──────────────────────────────────────────────────────────────────────
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    st.metric("Elecciones en BD", len(df_elec) if not df_elec.empty else "—")
with col2:
    st.metric("Estimaciones voto", len(df_nc) if not df_nc.empty else "—",
              help="Partidos con nowcasting activo")
with col3:
    if not df_macro.empty:
        fila = df_macro[df_macro["indicador"] == "IPC General (%)"]
        st.metric("IPC General", f"{fila.iloc[0]['valor']:.1f}%" if not fila.empty else "—")
    else:
        st.metric("IPC General", "—")
with col4:
    if not df_macro.empty:
        fila = df_macro[df_macro["indicador"] == "Prima Riesgo (pb)"]
        st.metric("Prima de Riesgo", f"{fila.iloc[0]['valor']:.0f} pb" if not fila.empty else "—")
    else:
        st.metric("Prima de Riesgo", "—")
with col5:
    delta_alertas = f"{n_alertas_criticas} críticas" if n_alertas_criticas > 0 else None
    st.metric("Alertas totales",
              len(df_alertas) if not df_alertas.empty else 0,
              delta=delta_alertas, delta_color="inverse")

st.divider()

# ── Nowcasting + Alertas ──────────────────────────────────────────────────────
col_nc, col_alertas = st.columns([1.65, 1])

with col_nc:
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
        <div style="width:3px;height:16px;background:{CYAN};border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{CYAN};
                     letter-spacing:.14em;text-transform:uppercase">Estimación Electoral · Nowcasting</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_nc.empty:
        df_top = df_nc.sort_values("estimacion_pct", ascending=False).copy()

        fig = go.Figure()
        for _, row in df_top.iterrows():
            color = COLORES_PARTIDOS.get(row["partido_siglas"].upper(), "#888888")
            r, g, b = int(color[1:3],16), int(color[3:5],16), int(color[5:7],16)
            fig.add_trace(go.Bar(
                x=[row["partido_siglas"]],
                y=[row["estimacion_pct"]],
                name=row["partido_siglas"],
                marker=dict(
                    color=f"rgba({r},{g},{b},0.85)",
                    line=dict(color=color, width=1),
                ),
                error_y=dict(
                    type="data", symmetric=False,
                    array=[max(0, row["ic_95_sup"] - row["estimacion_pct"])],
                    arrayminus=[max(0, row["estimacion_pct"] - row["ic_95_inf"])],
                    color=TEXT2, thickness=1.5,
                ),
                text=[f"{row['estimacion_pct']:.1f}%"],
                textposition="outside",
                textfont=dict(color=TEXT, size=11, family="JetBrains Mono, monospace"),
            ))

        fig.update_layout(
            height=320, barmode="group",
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            xaxis=dict(showgrid=False, color=TEXT2, tickfont=dict(size=10, color=TEXT2),
                       categoryorder="array",
                       categoryarray=df_top["partido_siglas"].tolist()),
            yaxis=dict(gridcolor=BORDER, gridwidth=1, color=TEXT2,
                       range=[0, df_top["ic_95_sup"].max() + 6],
                       tickfont=dict(size=10, color=MUTED)),
            showlegend=False,
            margin=dict(t=15, b=5, l=5, r=5),
            font=dict(family="Inter, sans-serif"),
        )
        st.plotly_chart(fig, use_container_width=True)

        # Strip de métricas por partido
        cols_p = st.columns(len(df_top))
        for i, (_, row) in enumerate(df_top.iterrows()):
            color = COLORES_PARTIDOS.get(row["partido_siglas"].upper(), "#888888")
            with cols_p[i]:
                st.markdown(f"""
                <div style="text-align:center;padding:.5rem .2rem;
                            background:{BG2};border:1px solid {BORDER};
                            border-top:2px solid {color};border-radius:0 0 6px 6px">
                    <div style="font-size:.62rem;font-weight:700;color:{MUTED};
                                letter-spacing:.06em">{row['partido_siglas']}</div>
                    <div style="font-size:1.05rem;font-weight:800;color:{color};
                                font-family:'JetBrains Mono',monospace">{row['estimacion_pct']:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("Sin datos de nowcasting.")

with col_alertas:
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
        <div style="width:3px;height:16px;background:{RED};border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{RED};
                     letter-spacing:.14em;text-transform:uppercase">Alertas del Sistema</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_alertas.empty:
        for _, a in df_alertas.head(8).iterrows():
            sev = a.get("severidad", "INFO")
            border_color = RED if sev == "CRITICAL" else AMBER if sev == "WARNING" else CYAN
            dot_color    = RED if sev == "CRITICAL" else AMBER if sev == "WARNING" else CYAN
            st.markdown(f"""
            <div style="border-left:3px solid {border_color};padding:.45rem .8rem;margin:.25rem 0;
                        background:{BG2};border-radius:0 8px 8px 0;
                        border-top:1px solid {BORDER};border-right:1px solid {BORDER};
                        border-bottom:1px solid {BORDER}">
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span style="font-size:.76rem;font-weight:600;color:{TEXT}">{str(a.get('titulo',''))[:48]}</span>
                    <span style="font-size:.58rem;font-weight:700;color:{border_color};
                                 background:{border_color}18;border:1px solid {border_color}44;
                                 padding:.1rem .4rem;border-radius:4px;white-space:nowrap;margin-left:.4rem;
                                 letter-spacing:.06em">{sev}</span>
                </div>
                <div style="font-size:.64rem;color:{MUTED};margin-top:.15rem;
                            font-family:'JetBrains Mono',monospace">{str(a.get('created_at',''))[:10]}</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div style="background:{GREEN}0F;border:1px solid {GREEN}33;border-radius:10px;
                    padding:1.4rem;text-align:center">
            <div style="font-size:1.5rem;margin-bottom:.3rem">✓</div>
            <div style="color:{GREEN};font-weight:700;font-size:.82rem;letter-spacing:.06em;
                        text-transform:uppercase">Sin alertas activas</div>
        </div>
        """, unsafe_allow_html=True)

st.divider()

# ── Macro + Últimas Elecciones ────────────────────────────────────────────────
col_macro, col_elec = st.columns([1, 1])

with col_macro:
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
        <div style="width:3px;height:16px;background:{BLUE};border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{BLUE};
                     letter-spacing:.14em;text-transform:uppercase">Indicadores Macroeconómicos</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_macro.empty:
        indicadores_show = [
            "IPC General (%)", "Crec. PIB (%)", "Prima Riesgo (pb)",
            "Euribor 12m (%)", "IBEX 35", "Deuda Pública (% PIB)"
        ]
        cols_m = st.columns(3)
        shown = 0
        for ind in indicadores_show:
            fila = df_macro[df_macro["indicador"] == ind]
            if not fila.empty:
                val    = float(fila.iloc[0]["valor"])
                unidad = "%" if "%" in ind else (" pb" if "pb" in ind else "")
                label  = ind.replace(" (%)", "").replace(" (pb)", "")
                with cols_m[shown % 3]:
                    st.metric(label, f"{val:.1f}{unidad}")
                shown += 1
    else:
        st.info("Sin datos macro. Ejecuta el ETL de INE/BDE.")

with col_elec:
    st.markdown(f"""
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">
        <div style="width:3px;height:16px;background:{PURPLE};border-radius:2px"></div>
        <span style="font-size:.72rem;font-weight:700;color:{PURPLE};
                     letter-spacing:.14em;text-transform:uppercase">Últimas Elecciones Generales</span>
    </div>
    """, unsafe_allow_html=True)

    if not df_elec.empty:
        for _, e in df_elec.head(6).iterrows():
            fecha = str(e.get("fecha", ""))[:10]
            desc  = str(e.get("descripcion", "Elecciones Generales"))
            st.markdown(f"""
            <div style="display:flex;justify-content:space-between;align-items:center;
                        padding:.55rem .9rem;background:{BG2};
                        border:1px solid {BORDER};border-radius:8px;
                        margin-bottom:.3rem;transition:border-color .2s">
                <div style="display:flex;align-items:center;gap:.6rem">
                    <div style="width:6px;height:6px;background:{PURPLE};border-radius:50%;flex-shrink:0"></div>
                    <span style="font-size:.8rem;font-weight:600;color:{TEXT}">{desc[:52]}</span>
                </div>
                <span style="font-size:.68rem;color:{MUTED};white-space:nowrap;margin-left:.5rem;
                             font-family:'JetBrains Mono',monospace">{fecha}</span>
            </div>
            """, unsafe_allow_html=True)
        if st.button("Ver mapa electoral completo →"):
            st.switch_page("pages/1_Mapa_Electoral.py")
    else:
        st.info("Sin datos de elecciones.")

st.divider()

# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;justify-content:space-between;align-items:center;
            padding:.6rem 0;font-size:.65rem;color:{MUTED}">
    <span>ElectSim España v2.0 · Politeia Analytics</span>
    <span style="font-family:'JetBrains Mono',monospace;color:{CYAN}55">
        {len(df_elec) if not df_elec.empty else 0} elecciones &nbsp;·&nbsp;
        {len(df_nc) if not df_nc.empty else 0} estimaciones activas
    </span>
</div>
""", unsafe_allow_html=True)
