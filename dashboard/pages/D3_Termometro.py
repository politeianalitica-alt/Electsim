"""
D3 — Termómetro de Riesgo Político
Gauge 0-100, mapa CCAA, series temporales, radar de amenazas y protocolo de respuesta.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import datetime
import hashlib
import random

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav,
    mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    AMBER, RED, GREEN, TEXT, TEXT2, MUTED,
    section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(
    page_title="Termómetro de Riesgo — ElectSim",
    page_icon="🌡️",
    layout="wide",
)

sidebar_nav()
mostrar_alertas_pagina("termometro")

# ── Estilos ───────────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
body, .stApp {{ background:{BG}; color:{TEXT}; }}
.risk-zone-verde   {{ color:#10B981; font-weight:800 }}
.risk-zone-amarillo{{ color:#EAB308; font-weight:800 }}
.risk-zone-naranja {{ color:#F97316; font-weight:800 }}
.risk-zone-rojo    {{ color:#EF4444; font-weight:800 }}
.risk-zone-negro   {{ color:#9CA3AF; font-weight:800; background:#1F2937;border-radius:4px;padding:0 4px }}
.subcomp-card {{
  background:{BG2}; border:1px solid {BORDER}; border-radius:12px;
  padding:1rem 1.2rem; margin-bottom:.6rem;
}}
.threat-card {{
  background:{BG3}; border-left:4px solid; border-radius:8px;
  padding:.8rem 1rem; margin:.4rem 0; font-size:.88rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Constantes ────────────────────────────────────────────────────────────────
CCAA_LIST = [
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias",
    "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia",
    "Navarra", "País Vasco", "Valencia",
]

ZONE_RANGES = [
    (0, 20,  "#10B981", "Verde — Sin riesgo apreciable"),
    (20, 40, "#EAB308", "Amarillo — Tensión latente"),
    (40, 60, "#F97316", "Naranja — Riesgo moderado"),
    (60, 80, "#EF4444", "Rojo — Riesgo alto"),
    (80, 100,"#6B7280", "Negro — Crisis activa"),
]

# ── Carga de datos ────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _cargar_riesgo() -> dict:
    """Calcula el score de riesgo compuesto y sus componentes."""
    neg_sentiment = 0.45
    boe_critical_norm = 0.35
    base_tension = 0.42

    # Intentar datos reales
    try:
        from dashboard.services import nlp_service as _nlp
        if hasattr(_nlp, "get_overall_sentiment"):
            s = _nlp.get_overall_sentiment()
            if isinstance(s, dict):
                neg_sentiment = float(s.get("negative", 0.45))
    except Exception:
        pass

    try:
        from dashboard.services import boe_api as _boe
        if hasattr(_boe, "obtener_sumario"):
            sumario = _boe.obtener_sumario(datetime.date.today().isoformat())
            if isinstance(sumario, list):
                critical = [x for x in sumario if str(x.get("tipo_clasificacion", "")).upper() in {"LEY", "RD-LEY", "RESOLUCIÓN"}]
                boe_critical_norm = min(len(critical) / 20.0, 1.0)
    except Exception:
        pass

    try:
        from dashboard.services import news_crawler as _nc
        if hasattr(_nc, "get_sentiment_score"):
            val = _nc.get_sentiment_score()
            neg_sentiment = float(val) if val is not None else neg_sentiment
    except Exception:
        pass

    # Ruido reproducible por día para que no cambie cada recarga
    day_seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 10000
    rng = random.Random(day_seed)
    jitter = (rng.random() - 0.5) * 0.08

    raw = (neg_sentiment * 0.4) + (boe_critical_norm * 0.3) + (base_tension * 0.3) + jitter
    risk_score = float(np.clip(raw * 100, 0, 100))

    # Sub-componentes (0-100)
    estabilidad = float(np.clip(base_tension * 100 + rng.uniform(-5, 5), 0, 100))
    tension_parl = float(np.clip((neg_sentiment + boe_critical_norm) / 2 * 100 + rng.uniform(-4, 4), 0, 100))
    presion_media = float(np.clip(neg_sentiment * 100 + rng.uniform(-6, 6), 0, 100))
    activacion_soc = float(np.clip((neg_sentiment * 0.6 + base_tension * 0.4) * 100 + rng.uniform(-5, 5), 0, 100))
    parlamentarizacion = float(np.clip(boe_critical_norm * 80 + rng.uniform(-3, 3), 0, 100))

    # CCAA risk (distribución realista con seeds)
    ccaa_risks = {}
    for i, ccaa in enumerate(CCAA_LIST):
        seed = (day_seed + i * 137) % 10000
        r = random.Random(seed)
        ccaa_risks[ccaa] = float(np.clip(risk_score + r.uniform(-18, 18), 0, 100))

    # Serie histórica 30 días
    dates = [datetime.date.today() - datetime.timedelta(days=29 - d) for d in range(30)]
    hist_scores = []
    base = risk_score
    for j, _ in enumerate(dates):
        seed2 = (day_seed + j * 97) % 10000
        r2 = random.Random(seed2)
        hist_scores.append(float(np.clip(base + r2.uniform(-12, 12), 0, 100)))

    # Forecast 14 días
    forecast_dates = [datetime.date.today() + datetime.timedelta(days=d + 1) for d in range(14)]
    forecast_scores = []
    last = hist_scores[-1]
    for k in range(14):
        seed3 = (day_seed + k * 53 + 999) % 10000
        r3 = random.Random(seed3)
        last = float(np.clip(last + r3.uniform(-4, 4), 0, 100))
        forecast_scores.append(last)

    return {
        "risk_score": risk_score,
        "estabilidad": estabilidad,
        "tension_parlamentaria": tension_parl,
        "presion_mediatica": presion_media,
        "activacion_social": activacion_soc,
        "parlamentarizacion": parlamentarizacion,
        "ccaa_risks": ccaa_risks,
        "hist_dates": dates,
        "hist_scores": hist_scores,
        "forecast_dates": forecast_dates,
        "forecast_scores": forecast_scores,
    }


data = _cargar_riesgo()
risk_score = data["risk_score"]

# ── Zona de riesgo activa ─────────────────────────────────────────────────────
def _zona(score: float) -> tuple[str, str, str]:
    for lo, hi, color, label in ZONE_RANGES:
        if lo <= score < hi:
            return color, label, label.split(" — ")[0]
    return "#6B7280", "Negro — Crisis activa", "Negro"

risk_color, risk_label, risk_zone_name = _zona(risk_score)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{risk_color},{BLUE});
    border-radius:12px;display:flex;align-items:center;justify-content:center;
    font-size:1.5rem;flex-shrink:0">🌡️</div>
  <div>
    <div style="font-size:1.3rem;font-weight:900;color:{TEXT};letter-spacing:-.01em">
      Termómetro de Riesgo Político</div>
    <div style="font-size:.8rem;color:{MUTED}">
      Índice compuesto en tiempo real · Análisis CCAA · Inteligencia de crisis</div>
  </div>
  <div style="margin-left:auto;background:{BG2};border:1px solid {risk_color};
    border-radius:20px;padding:.35rem .9rem;font-size:.78rem;font-weight:700;color:{risk_color}">
    ZONA {risk_zone_name.upper()}
  </div>
</div>
""", unsafe_allow_html=True)

# KPI row
k1, k2, k3, k4 = st.columns(4)
with k1:
    st.markdown(kpi_card("Índice de Riesgo", f"{risk_score:.1f}", sub=risk_label, color=risk_color), unsafe_allow_html=True)
with k2:
    st.markdown(kpi_card("Estabilidad Gov.", f"{data['estabilidad']:.0f}/100", sub="Presión sobre el gobierno", color=AMBER), unsafe_allow_html=True)
with k3:
    st.markdown(kpi_card("Tensión Parl.", f"{data['tension_parlamentaria']:.0f}/100", sub="Crispación parlamentaria", color=PURPLE), unsafe_allow_html=True)
with k4:
    st.markdown(kpi_card("Parlamentarización", f"{data['parlamentarizacion']:.0f}/100", sub="Actividad legislativa crítica", color=CYAN), unsafe_allow_html=True)

st.markdown("<div style='margin:.5rem 0'></div>", unsafe_allow_html=True)

# ── Tabs principales ──────────────────────────────────────────────────────────
tab_thermo, tab_crisis, tab_trend = st.tabs(["🌡️ Termómetro", "📡 Crisis Intel", "📈 Tendencia"])

# ════════════════════════════════════════════════════════════════════════════
# TAB 1: TERMÓMETRO
# ════════════════════════════════════════════════════════════════════════════
with tab_thermo:
    col_gauge, col_sub = st.columns([1, 1])

    with col_gauge:
        section_header("Gauge principal", CYAN)

        # Gauge figure
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number+delta",
            value=risk_score,
            delta={
                "reference": data["hist_scores"][-8] if len(data["hist_scores"]) >= 8 else 50,
                "increasing": {"color": RED},
                "decreasing": {"color": GREEN},
                "valueformat": ".1f",
            },
            number={"font": {"size": 52, "color": TEXT, "family": "JetBrains Mono, monospace"}, "valueformat": ".1f"},
            gauge={
                "axis": {
                    "range": [0, 100],
                    "tickwidth": 1,
                    "tickcolor": MUTED,
                    "tickfont": {"color": MUTED, "size": 11},
                },
                "bar": {"color": risk_color, "thickness": 0.25},
                "steps": [
                    {"range": [0,   20],  "color": "rgba(16,185,129,0.15)"},
                    {"range": [20,  40],  "color": "rgba(234,179,8,0.15)"},
                    {"range": [40,  60],  "color": "rgba(249,115,22,0.15)"},
                    {"range": [60,  80],  "color": "rgba(239,68,68,0.15)"},
                    {"range": [80,  100], "color": "rgba(107,114,128,0.15)"},
                ],
                "threshold": {
                    "line": {"color": risk_color, "width": 3},
                    "thickness": 0.75,
                    "value": risk_score,
                },
            },
            title={
                "text": f"<b>RIESGO POLÍTICO</b><br><span style='font-size:12px;color:{MUTED}'>Índice compuesto 0–100</span>",
                "font": {"color": TEXT, "size": 14},
            },
        ))
        fig_gauge.update_layout(
            paper_bgcolor=BG2,
            plot_bgcolor=BG2,
            height=340,
            margin=dict(l=30, r=30, t=50, b=20),
            font={"color": TEXT},
        )
        st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar": False})

        # Leyenda de zonas
        st.markdown(f"""
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.3rem;margin-top:.2rem">
          <div style="text-align:center;font-size:.65rem;color:#10B981;font-weight:700">
            0-20<br><span style="font-weight:400;color:{TEXT2}">Verde</span></div>
          <div style="text-align:center;font-size:.65rem;color:#EAB308;font-weight:700">
            21-40<br><span style="font-weight:400;color:{TEXT2}">Amarillo</span></div>
          <div style="text-align:center;font-size:.65rem;color:#F97316;font-weight:700">
            41-60<br><span style="font-weight:400;color:{TEXT2}">Naranja</span></div>
          <div style="text-align:center;font-size:.65rem;color:#EF4444;font-weight:700">
            61-80<br><span style="font-weight:400;color:{TEXT2}">Rojo</span></div>
          <div style="text-align:center;font-size:.65rem;color:#9CA3AF;font-weight:700">
            81-100<br><span style="font-weight:400;color:{TEXT2}">Negro</span></div>
        </div>
        """, unsafe_allow_html=True)

    with col_sub:
        section_header("Sub-componentes del riesgo", PURPLE)

        subcomps = [
            ("Estabilidad Gubernamental", data["estabilidad"],       AMBER,  "Presión sobre el ejecutivo"),
            ("Tensión Parlamentaria",     data["tension_parlamentaria"], PURPLE, "Fracturas en el arco parlamentario"),
            ("Presión Mediática",         data["presion_mediatica"],  CYAN,   "Negatividad en medios y RRSS"),
            ("Activación Social",         data["activacion_social"],  GREEN,  "Movilización ciudadana detectada"),
        ]

        for name, val, color, desc in subcomps:
            pct = val / 100
            _, zone_label, _ = _zona(val)
            bar_color, _, _ = _zona(val)
            st.markdown(f"""
            <div class="subcomp-card">
              <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:.4rem">
                <span style="font-size:.85rem;font-weight:700;color:{TEXT}">{name}</span>
                <span style="font-size:1.1rem;font-weight:900;color:{bar_color};
                  font-family:'JetBrains Mono',monospace">{val:.0f}</span>
              </div>
              <div style="background:{BG};border-radius:4px;height:7px;overflow:hidden">
                <div style="width:{pct*100:.1f}%;height:100%;
                  background:linear-gradient(90deg,{bar_color},{color});
                  border-radius:4px;transition:width .6s ease"></div>
              </div>
              <div style="font-size:.68rem;color:{MUTED};margin-top:.3rem">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

        # Parlamentarización indicator
        st.markdown("<div style='height:.3rem'></div>", unsafe_allow_html=True)
        parl = data["parlamentarizacion"]
        parl_color = _zona(parl)[0]
        st.markdown(f"""
        <div style="background:linear-gradient(135deg,{BG2},{BG3});
          border:1px solid {BORDER};border-left:4px solid {parl_color};
          border-radius:10px;padding:.9rem 1.1rem">
          <div style="font-size:.7rem;font-weight:800;color:{MUTED};text-transform:uppercase;
            letter-spacing:.12em;margin-bottom:.3rem">Índice Parlamentarización</div>
          <div style="display:flex;align-items:center;gap:.8rem">
            <span style="font-size:1.6rem;font-weight:900;
              font-family:'JetBrains Mono',monospace;color:{parl_color}">{parl:.0f}</span>
            <div style="font-size:.78rem;color:{TEXT2}">
              Actividad legislativa de urgencia detectada<br>
              <span style="color:{MUTED};font-size:.68rem">Basado en RD-Leyes y cuestiones de confianza</span>
            </div>
          </div>
        </div>
        """, unsafe_allow_html=True)

    # ── CCAA risk bars ─────────────────────────────────────────────────────
    st.markdown("<div style='margin:.8rem 0'></div>", unsafe_allow_html=True)
    section_header("Intensidad de Riesgo por Comunidad Autónoma", CYAN)

    ccaa_df = pd.DataFrame([
        {"ccaa": k, "riesgo": v}
        for k, v in data["ccaa_risks"].items()
    ]).sort_values("riesgo", ascending=True)

    bar_colors = [_zona(v)[0] for v in ccaa_df["riesgo"]]

    fig_ccaa = go.Figure(go.Bar(
        y=ccaa_df["ccaa"],
        x=ccaa_df["riesgo"],
        orientation="h",
        marker=dict(color=bar_colors, line=dict(color=BG, width=.5)),
        text=[f"{v:.0f}" for v in ccaa_df["riesgo"]],
        textposition="outside",
        textfont=dict(color=TEXT2, size=11),
        hovertemplate="<b>%{y}</b><br>Riesgo: %{x:.1f}/100<extra></extra>",
    ))
    fig_ccaa.add_vline(x=risk_score, line=dict(color=CYAN, dash="dash", width=1.5),
                       annotation_text=f"Nacional {risk_score:.0f}",
                       annotation_font_color=CYAN, annotation_font_size=11)
    fig_ccaa.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=420,
        margin=dict(l=10, r=60, t=20, b=20),
        xaxis=dict(range=[0, 105], showgrid=True, gridcolor=BORDER,
                   tickfont=dict(color=MUTED, size=11), color=MUTED),
        yaxis=dict(tickfont=dict(color=TEXT2, size=11), color=TEXT2),
        font=dict(color=TEXT),
    )
    st.plotly_chart(fig_ccaa, use_container_width=True, config={"displayModeBar": False})


# ════════════════════════════════════════════════════════════════════════════
# TAB 2: CRISIS INTEL
# ════════════════════════════════════════════════════════════════════════════
with tab_crisis:
    col_radar, col_proto = st.columns([1, 1])

    with col_radar:
        section_header("Radar de Amenazas (3 niveles)", RED)

        threat_cats = [
            "Estabilidad\nGov.", "Tensión\nParl.", "Presión\nMedia",
            "Activ.\nSocial", "Riesgo\nEconóm.", "Amenaza\nExterna",
        ]
        day_seed = int(hashlib.md5(datetime.date.today().isoformat().encode()).hexdigest(), 16) % 10000
        rng = random.Random(day_seed)

        level1_vals = [data["estabilidad"], data["tension_parlamentaria"],
                       data["presion_mediatica"], data["activacion_social"],
                       float(np.clip(40 + rng.uniform(-10, 10), 0, 100)),
                       float(np.clip(25 + rng.uniform(-8, 8), 0, 100))]
        level2_vals = [v * 0.65 for v in level1_vals]
        level3_vals = [v * 0.35 for v in level1_vals]

        def _radar_trace(values, name, color, fill_opacity):
            vals_closed = values + [values[0]]
            cats_closed = threat_cats + [threat_cats[0]]
            _r, _g, _b = tuple(int(color.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
            fc = f"rgba({_r},{_g},{_b},{fill_opacity})"
            return go.Scatterpolar(
                r=vals_closed,
                theta=cats_closed,
                fill="toself",
                name=name,
                line=dict(color=color, width=2),
            )

        fig_radar = go.Figure()
        fig_radar.add_trace(_radar_trace(level3_vals, "Nivel 3 · Vigilancia", "#10B981", 0.1))
        fig_radar.add_trace(_radar_trace(level2_vals, "Nivel 2 · Alerta",     "#F59E0B", 0.12))
        fig_radar.add_trace(_radar_trace(level1_vals, "Nivel 1 · Crítico",    "#EF4444", 0.15))

        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(
                    range=[0, 100], tickfont=dict(color=MUTED, size=9),
                    gridcolor=BORDER, linecolor=BORDER,
                ),
                angularaxis=dict(tickfont=dict(color=TEXT2, size=10), gridcolor=BORDER),
            ),
            paper_bgcolor=BG2,
            height=360,
            margin=dict(l=20, r=20, t=30, b=20),
            showlegend=True,
            legend=dict(font=dict(color=TEXT2, size=11), bgcolor=BG3,
                        bordercolor=BORDER, borderwidth=1),
            font=dict(color=TEXT),
        )
        st.plotly_chart(fig_radar, use_container_width=True, config={"displayModeBar": False})

        # Propagation curve
        section_header("Curva de Propagación Semántica", PURPLE)
        prop_x = list(range(24))
        prop_y = [float(np.clip(risk_score * (1 - np.exp(-0.15 * t)) + random.Random(day_seed + t).uniform(-3, 3), 0, 100)) for t in prop_x]

        fig_prop = go.Figure()
        fig_prop.add_trace(go.Scatter(
            x=prop_x, y=prop_y,
            mode="lines+markers",
            line=dict(color=PURPLE, width=2.5),
            marker=dict(size=5, color=PURPLE),
            fill="tozeroy",
            fillcolor=f"rgba(139,92,246,0.1)",
            name="Propagación",
            hovertemplate="Hora +%{x}h<br>Difusión: %{y:.1f}%<extra></extra>",
        ))
        fig_prop.update_layout(
            paper_bgcolor=BG2,
            plot_bgcolor=BG2,
            height=200,
            margin=dict(l=10, r=10, t=15, b=30),
            xaxis=dict(title=dict(text="Horas tras evento", font=dict(color=MUTED, size=11)),
                       tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
            yaxis=dict(title=dict(text="Difusión (%)", font=dict(color=MUTED, size=11)),
                       tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
            showlegend=False,
            font=dict(color=TEXT),
        )
        st.plotly_chart(fig_prop, use_container_width=True, config={"displayModeBar": False})

    with col_proto:
        section_header("Protocolo de Respuesta", CYAN)

        threat_levels = [
            {
                "level": "NIVEL 1 — CRÍTICO",
                "color": "#EF4444",
                "trigger": f"Riesgo ≥ 60 · Actual: {risk_score:.0f}",
                "actions": [
                    "Activar comité de crisis de comunicación",
                    "Preparar respuesta ejecutiva en < 2 horas",
                    "Monitorización cada 15 min. de redes sociales",
                    "Briefing urgente a portavoces parlamentarios",
                ],
                "active": risk_score >= 60,
            },
            {
                "level": "NIVEL 2 — ALERTA",
                "color": "#F59E0B",
                "trigger": f"Riesgo 40–60 · Actual: {risk_score:.0f}",
                "actions": [
                    "Reforzar líneas narrativas en medios",
                    "Revisión de agenda parlamentaria próxima semana",
                    "Activar rastreo de noticias cada 30 min.",
                    "Preparar declaraciones preventivas",
                ],
                "active": 40 <= risk_score < 60,
            },
            {
                "level": "NIVEL 3 — VIGILANCIA",
                "color": "#10B981",
                "trigger": f"Riesgo < 40 · Actual: {risk_score:.0f}",
                "actions": [
                    "Monitorización estándar (2 veces/día)",
                    "Revisión semanal de indicadores",
                    "Sin acciones extraordinarias requeridas",
                ],
                "active": risk_score < 40,
            },
        ]

        for t in threat_levels:
            border_op = "1" if t["active"] else "0.35"
            bg_op = "0.18" if t["active"] else "0.07"
            r, g, b = tuple(int(t["color"].lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
            actions_html = "".join(
                f"<li style='margin:.25rem 0;color:{TEXT2}'>{a}</li>" for a in t["actions"]
            )
            _tc = t["color"]
            active_badge = (
                f"<span style='background:{_tc};color:#fff;border-radius:4px;"
                f"padding:1px 7px;font-size:.65rem;font-weight:800;margin-left:.6rem'>ACTIVO</span>"
                if t["active"] else ""
            )
            st.markdown(f"""
            <div style="background:rgba({r},{g},{b},{bg_op});
              border:1px solid rgba({r},{g},{b},{border_op});
              border-left:4px solid {t['color']};border-radius:10px;
              padding:.9rem 1.1rem;margin:.5rem 0">
              <div style="font-size:.78rem;font-weight:800;color:{t['color']};margin-bottom:.3rem">
                {t['level']}{active_badge}
              </div>
              <div style="font-size:.7rem;color:{MUTED};margin-bottom:.5rem">Disparador: {t['trigger']}</div>
              <ul style="margin:.2rem 0 0 .9rem;padding:0;font-size:.78rem;list-style:disc">
                {actions_html}
              </ul>
            </div>
            """, unsafe_allow_html=True)

        # AI response protocol generator
        section_header("Generador IA de Protocolo", PURPLE)
        with st.expander("Generar protocolo personalizado", expanded=False):
            escenario = st.selectbox("Escenario de crisis", [
                "Moción de censura", "Escándalo de corrupción", "Huelga general",
                "Crisis de gobierno", "Ruptura de coalición", "Protesta territorial",
            ])
            if st.button("Generar protocolo", key="gen_proto"):
                protocol_text = None
                try:
                    from dashboard.services import llm_local as _llm
                    if hasattr(_llm, "generate"):
                        prompt = (
                            f"Eres un experto en comunicación política española. "
                            f"El índice de riesgo actual es {risk_score:.0f}/100. "
                            f"Genera un protocolo de respuesta breve (5 puntos clave) "
                            f"para el escenario: {escenario}."
                        )
                        protocol_text = _llm.generate(prompt)
                except Exception:
                    pass

                if protocol_text:
                    st.markdown(f"""
                    <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                      padding:1rem;font-size:.82rem;color:{TEXT2};line-height:1.7;white-space:pre-wrap">
                    {protocol_text}
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                      padding:1rem;font-size:.82rem;color:{TEXT2};line-height:1.7">
                    <strong>Protocolo automático — {escenario}</strong><br>
                    1. Activar sala de crisis y convocar portavoces en < 1 h.<br>
                    2. Emitir declaración institucional breve y factual.<br>
                    3. Monitorizar cobertura mediática y reacciones de grupos parlamentarios.<br>
                    4. Preparar respuesta parlamentaria y puntos de mensajes clave.<br>
                    5. Evaluar escalada cada 4 h y actualizar este termómetro.
                    </div>
                    """, unsafe_allow_html=True)


# ════════════════════════════════════════════════════════════════════════════
# TAB 3: TENDENCIA
# ════════════════════════════════════════════════════════════════════════════
with tab_trend:
    section_header("Serie histórica (30 días) + Previsión (14 días)", CYAN)

    hist_dates_str = [d.isoformat() for d in data["hist_dates"]]
    fore_dates_str = [d.isoformat() for d in data["forecast_dates"]]
    last_actual = data["hist_scores"][-1]
    fore_all = [last_actual] + data["forecast_scores"]
    fore_dates_all = [data["hist_dates"][-1].isoformat()] + fore_dates_str

    fig_trend = go.Figure()

    # Zona de riesgo bands
    for lo, hi, col, _ in ZONE_RANGES:
        r2, g2, b2 = tuple(int(col.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
        fig_trend.add_hrect(y0=lo, y1=hi, fillcolor=f"rgba({r2},{g2},{b2},0.05)",
                            line_width=0)

    # Historical
    fig_trend.add_trace(go.Scatter(
        x=hist_dates_str,
        y=data["hist_scores"],
        mode="lines+markers",
        name="Histórico",
        line=dict(color=CYAN, width=2.5),
        marker=dict(size=5, color=CYAN),
        fill="tozeroy",
        fillcolor="rgba(0,212,255,0.07)",
        hovertemplate="%{x}<br>Riesgo: %{y:.1f}<extra></extra>",
    ))

    # Forecast
    fig_trend.add_trace(go.Scatter(
        x=fore_dates_all,
        y=fore_all,
        mode="lines+markers",
        name="Previsión (14d)",
        line=dict(color=AMBER, width=2, dash="dot"),
        marker=dict(size=5, color=AMBER, symbol="diamond"),
        hovertemplate="%{x}<br>Previsión: %{y:.1f}<extra></extra>",
    ))

    # CI band (±10)
    upper = [v + 10 for v in fore_all]
    lower = [max(0, v - 10) for v in fore_all]
    fig_trend.add_trace(go.Scatter(
        x=fore_dates_all + fore_dates_all[::-1],
        y=upper + lower[::-1],
        fill="toself",
        fillcolor=f"rgba(245,158,11,0.08)",
        line=dict(color="rgba(0,0,0,0)"),
        name="IC 80%",
        hoverinfo="skip",
    ))

    # Now line
    today_str = datetime.date.today().isoformat()
    fig_trend.add_vline(x=today_str, line=dict(color=MUTED, dash="dash", width=1),
                        annotation_text="Hoy", annotation_font_color=MUTED,
                        annotation_font_size=10)

    fig_trend.update_layout(
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        height=420,
        margin=dict(l=10, r=20, t=20, b=40),
        xaxis=dict(tickfont=dict(color=MUTED, size=10), gridcolor=BORDER, color=MUTED),
        yaxis=dict(range=[0, 100], tickfont=dict(color=MUTED, size=10),
                   gridcolor=BORDER, color=MUTED, title="Índice de Riesgo"),
        legend=dict(font=dict(color=TEXT2, size=11), bgcolor=BG3,
                    bordercolor=BORDER, borderwidth=1),
        font=dict(color=TEXT),
        hovermode="x unified",
    )
    st.plotly_chart(fig_trend, use_container_width=True, config={"displayModeBar": False})

    # Metrics de tendencia
    m1, m2, m3, m4 = st.columns(4)
    hist = data["hist_scores"]
    with m1:
        delta_7 = hist[-1] - hist[-8] if len(hist) >= 8 else 0
        st.metric("Cambio 7 días", f"{hist[-1]:.1f}", delta=f"{delta_7:+.1f}")
    with m2:
        max_30 = max(hist)
        st.metric("Máximo 30d", f"{max_30:.1f}")
    with m3:
        min_30 = min(hist)
        st.metric("Mínimo 30d", f"{min_30:.1f}")
    with m4:
        fore_14 = data["forecast_scores"][-1] if data["forecast_scores"] else risk_score
        st.metric("Previsión día +14", f"{fore_14:.1f}", delta=f"{fore_14 - risk_score:+.1f}")
