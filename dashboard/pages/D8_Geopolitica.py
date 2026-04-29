"""
POLITEIA — Geopolítica & RRII (Doc 8)
Teatro Global · España en el Mundo · OSINT Intelligence · Impacto Doméstico
"""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import json
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
import streamlit.components.v1 as components

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, section_header, kpi_card, COLORES_PARTIDOS,
)
import dashboard.db as _db

st.set_page_config(page_title="Geopolítica — Politeia", page_icon="🌍", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("geopolitica")

try:
    from dashboard.services import llm_local as _brain
    _BRAIN_OK = _brain.esta_disponible()
except Exception:
    _brain = None  # type: ignore
    _BRAIN_OK = False

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:44px;height:44px;background:linear-gradient(135deg,{BLUE},{CYAN});
              border-radius:12px;display:flex;align-items:center;justify-content:center;
              font-size:1.6rem;flex-shrink:0;box-shadow:0 0 20px {BLUE}55">🌍</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Geopolítica & RRII</h2>
    <div style="color:{TEXT2};font-size:.8rem">
      Teatro Global · España en el Mundo · OSINT · Impacto Doméstico
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_teatro, tab_espana, tab_osint, tab_impacto = st.tabs([
    "🗺️ Teatro Global",
    "🇪🇸 España en el Mundo",
    "🔍 OSINT Intelligence",
    "📊 Impacto Doméstico",
])

# ─── Datos demo realistas ─────────────────────────────────────────────────────
EVENTOS_GEO = [
    {"pais": "Ukraine",     "lat": 49.0, "lon": 32.0,  "riesgo": 95, "tipo": "Conflicto",   "desc": "Guerra Rusia-Ucrania: ofensiva en Donetsk"},
    {"pais": "Israel",      "lat": 31.5, "lon": 35.0,  "riesgo": 88, "tipo": "Conflicto",   "desc": "Gaza: negociaciones de alto el fuego"},
    {"pais": "Taiwan",      "lat": 25.0, "lon": 121.5, "riesgo": 72, "tipo": "Tensión",     "desc": "Maniobras militares PLA en estrecho"},
    {"pais": "Venezuela",   "lat": 8.0,  "lon": -66.0, "riesgo": 65, "tipo": "Elecciones",  "desc": "Crisis política post-electoral"},
    {"pais": "Turquía",     "lat": 39.0, "lon": 35.0,  "riesgo": 55, "tipo": "Tensión",     "desc": "Tensiones con Grecia en Egeo"},
    {"pais": "Sahel",       "lat": 15.0, "lon": -5.0,  "riesgo": 78, "tipo": "Conflicto",   "desc": "Expansión grupos yihadistas en Mali/Níger"},
    {"pais": "Marruecos",   "lat": 32.0, "lon": -5.0,  "riesgo": 48, "tipo": "Diplomacia",  "desc": "Normalización relaciones con España"},
    {"pais": "Argelia",     "lat": 28.0, "lon": 2.0,   "riesgo": 52, "tipo": "Energía",     "desc": "Renegociación contratos gas natural"},
    {"pais": "Moldavia",    "lat": 47.0, "lon": 28.5,  "riesgo": 60, "tipo": "Tensión",     "desc": "Presión rusa en Transnistria"},
    {"pais": "Venezuela",   "lat": 8.0,  "lon": -66.0, "riesgo": 65, "tipo": "Migración",   "desc": "Flujos migratorios hacia Europa"},
    {"pais": "Senegal",     "lat": 14.5, "lon": -14.5, "riesgo": 42, "tipo": "Elecciones",  "desc": "Transición democrática en curso"},
    {"pais": "China",       "lat": 35.0, "lon": 105.0, "riesgo": 60, "tipo": "Comercio",    "desc": "Aranceles UE sobre EVs chinos"},
]

TIPO_COLORS = {
    "Conflicto": RED, "Tensión": AMBER, "Elecciones": CYAN,
    "Energía": "#F97316", "Diplomacia": GREEN, "Comercio": BLUE,
    "Migración": PURPLE,
}

# ══════════════════════════════════════════════════════════════════════════════
with tab_teatro:
    # Ticker geopolítico
    ticker_items = " &nbsp;│&nbsp; ".join(
        f"<span style='color:{TIPO_COLORS.get(e['tipo'],MUTED)}'>"
        f"[{e['tipo'].upper()}] {e['pais']}: {e['desc']}</span>"
        for e in EVENTOS_GEO[:8]
    )
    st.markdown(f"""
    <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                padding:.5rem 1rem;overflow:hidden;white-space:nowrap;margin-bottom:1rem">
      <span style="font-size:.68rem;color:{MUTED};font-weight:700;margin-right:1rem">
        TICKER GEOPOLÍTICO
      </span>
      <span style="font-size:.7rem">{ticker_items}</span>
    </div>
    """, unsafe_allow_html=True)

    col_map, col_list = st.columns([3, 1])
    with col_map:
        section_header("MAPA DE EVENTOS GLOBALES", BLUE)

        # Capas activas
        capas = st.multiselect(
            "Capas activas",
            ["Conflictos", "Elecciones", "Energía", "Comercio", "Tensiones", "Diplomacia"],
            default=["Conflictos", "Tensiones", "Elecciones"],
            key="geo_capas",
        )

        tipos_activos = []
        if "Conflictos" in capas:
            tipos_activos.append("Conflicto")
        if "Tensiones" in capas:
            tipos_activos.append("Tensión")
        if "Elecciones" in capas:
            tipos_activos.append("Elecciones")
        if "Energía" in capas:
            tipos_activos.append("Energía")
        if "Comercio" in capas:
            tipos_activos.append("Comercio")
        if "Diplomacia" in capas:
            tipos_activos.append("Diplomacia")

        ev_fil = [e for e in EVENTOS_GEO if e["tipo"] in tipos_activos] if tipos_activos else EVENTOS_GEO

        fig_map = go.Figure()
        for tipo in set(e["tipo"] for e in ev_fil):
            evs = [e for e in ev_fil if e["tipo"] == tipo]
            fig_map.add_trace(go.Scattergeo(
                lat=[e["lat"] for e in evs],
                lon=[e["lon"] for e in evs],
                mode="markers+text",
                marker=dict(
                    size=[8 + e["riesgo"] / 10 for e in evs],
                    color=TIPO_COLORS.get(tipo, MUTED),
                    opacity=0.85,
                    line=dict(width=1, color="rgba(255,255,255,0.3)"),
                ),
                text=[e["pais"] for e in evs],
                textposition="top center",
                textfont=dict(size=9, color=TEXT2),
                hovertemplate=(
                    "<b>%{text}</b><br>"
                    "Riesgo: %{customdata[0]}/100<br>"
                    "%{customdata[1]}<extra></extra>"
                ),
                customdata=[[e["riesgo"], e["desc"]] for e in evs],
                name=tipo,
            ))

        fig_map.update_geos(
            projection_type="natural earth",
            showland=True, landcolor="#0D1320",
            showocean=True, oceancolor="#080C14",
            showcoastlines=True, coastlinecolor=BORDER,
            showframe=False,
            bgcolor=BG2,
        )
        fig_map.update_layout(
            height=420, paper_bgcolor=BG2, margin=dict(t=5, b=5, l=5, r=5),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.05,
                        font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_map, use_container_width=True, config={"displayModeBar": False})

    with col_list:
        section_header("EVENTOS ACTIVOS", RED)
        for e in sorted(ev_fil, key=lambda x: -x["riesgo"])[:8]:
            tc = TIPO_COLORS.get(e["tipo"], MUTED)
            riesgo_c = RED if e["riesgo"] > 70 else AMBER if e["riesgo"] > 45 else GREEN
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {tc}33;border-radius:8px;
                        padding:.5rem .7rem;margin-bottom:.4rem;border-left:3px solid {tc}">
              <div style="display:flex;justify-content:space-between;margin-bottom:.15rem">
                <span style="font-size:.72rem;font-weight:700;color:{TEXT}">{e['pais']}</span>
                <span style="font-size:.65rem;font-weight:700;color:{riesgo_c}">{e['riesgo']}</span>
              </div>
              <div style="font-size:.62rem;color:{TEXT2};line-height:1.3">{e['desc'][:60]}</div>
              <span style="background:{tc}22;color:{tc};border-radius:3px;
                           padding:.05rem .3rem;font-size:.58rem;font-weight:700">{e['tipo']}</span>
            </div>
            """, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
with tab_espana:
    col_e1, col_e2 = st.columns(2)

    with col_e1:
        section_header("POSICIONAMIENTO UE — CONSEJO EUROPEO", BLUE)

        EU_PAISES = [
            ("Alemania", "conservador", 0), ("Francia", "conservador", 1),
            ("Italia", "populista", 2), ("España", "progresista", 3),
            ("Polonia", "conservador", 4), ("Países Bajos", "liberal", 5),
            ("Suecia", "conservador", 6), ("Bélgica", "liberal", 7),
            ("Austria", "conservador", 8), ("Portugal", "progresista", 9),
            ("Grecia", "conservador", 10), ("Hungría", "populista", 11),
            ("Rep.Checa", "conservador", 12), ("Rumanía", "conservador", 13),
            ("Dinamarca", "liberal", 14), ("Finlandia", "conservador", 15),
            ("Eslovaquia", "populista", 16), ("Irlanda", "progresista", 17),
            ("Croacia", "conservador", 18), ("Bulgaria", "conservador", 19),
            ("Lituania", "liberal", 20), ("Letonia", "liberal", 21),
            ("Eslovenia", "conservador", 22), ("Estonia", "liberal", 23),
            ("Chipre", "conservador", 24), ("Luxemburgo", "progresista", 25),
            ("Malta", "progresista", 26),
        ]
        ALIGN_COLORS = {"progresista": RED, "conservador": BLUE, "liberal": AMBER, "populista": PURPLE}

        n = len(EU_PAISES)
        angles = np.linspace(np.pi, 2 * np.pi, n)
        r = 1.0
        fig_eu = go.Figure()
        for (nombre, alineacion, idx) in EU_PAISES:
            ang = angles[idx]
            x, y = r * np.cos(ang), r * np.sin(ang)
            color = ALIGN_COLORS.get(alineacion, MUTED)
            highlight = nombre == "España"
            fig_eu.add_trace(go.Scatter(
                x=[x], y=[y], mode="markers+text",
                marker=dict(size=22 if highlight else 14, color=color,
                            line=dict(width=3 if highlight else 1,
                                      color=TEXT if highlight else "rgba(0,0,0,0)")),
                text=[nombre[:3].upper()],
                textposition="middle center",
                textfont=dict(size=7 if not highlight else 8, color="white"),
                hovertemplate=f"<b>{nombre}</b><br>{alineacion.title()}<extra></extra>",
                showlegend=False,
            ))

        for alin, col in ALIGN_COLORS.items():
            fig_eu.add_trace(go.Scatter(
                x=[None], y=[None], mode="markers",
                marker=dict(size=10, color=col),
                name=alin.title(), showlegend=True,
            ))

        fig_eu.update_layout(
            height=320, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(showgrid=False, zeroline=False, visible=False, range=[-1.3, 1.3]),
            yaxis=dict(showgrid=False, zeroline=False, visible=False, range=[-0.1, 1.3]),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.05,
                        font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        )
        st.plotly_chart(fig_eu, use_container_width=True, config={"displayModeBar": False})

        section_header("NATO — COMPROMISOS 2% PIB", AMBER)
        nato_data = {
            "EEUU": 3.5, "Polonia": 4.1, "Grecia": 2.9, "Estonia": 2.8,
            "Letonia": 2.4, "Lituania": 2.5, "Alemania": 2.1, "Francia": 2.1,
            "Reino Unido": 2.3, "España": 1.3, "Italia": 1.5, "Bélgica": 1.3,
        }
        df_nato = pd.DataFrame(list(nato_data.items()), columns=["país", "pct"])
        df_nato["color"] = df_nato["pct"].apply(
            lambda x: GREEN if x >= 2.0 else AMBER if x >= 1.5 else RED
        )
        df_nato = df_nato.sort_values("pct")
        fig_nato = go.Figure()
        for _, row in df_nato.iterrows():
            fig_nato.add_trace(go.Bar(
                x=[row["pct"]], y=[row["país"]], orientation="h",
                marker_color=row["color"],
                text=[f"{row['pct']:.1f}%"], textposition="outside",
                textfont=dict(size=9, color=TEXT2),
                showlegend=False,
                hovertemplate=f"<b>{row['país']}</b>: {row['pct']:.1f}% PIB<extra></extra>",
            ))
        fig_nato.add_vline(x=2.0, line_dash="dash", line_color=AMBER,
                           annotation_text="Objetivo 2%", annotation_font_color=AMBER)
        fig_nato.update_layout(
            height=300, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=80, r=40),
            xaxis=dict(color=TEXT2, gridcolor=BORDER, ticksuffix="%"),
            yaxis=dict(color=TEXT, tickfont=dict(size=9)),
            bargap=0.25,
        )
        st.plotly_chart(fig_nato, use_container_width=True, config={"displayModeBar": False})

    with col_e2:
        section_header("ACUERDOS BILATERALES CLAVE", GREEN)
        acuerdos = [
            ("Marruecos", "🇲🇦", "Energía, migración, Sahara", GREEN, 2024),
            ("Francia",   "🇫🇷", "Defensa, infraestructuras, migración", BLUE, 2023),
            ("Alemania",  "🇩🇪", "Industria, transición energética", AMBER, 2023),
            ("EEUU",      "🇺🇸", "Defensa, comercio, tecnología", CYAN, 2022),
            ("Portugal",  "🇵🇹", "Agua, energía, movilidad", GREEN, 2024),
            ("Argelia",   "🇩🇿", "Gas natural, migración", RED, 2022),
            ("México",    "🇲🇽", "Iberoamérica, comercio", PURPLE, 2023),
            ("Brasil",    "🇧🇷", "Comercio, inversiones", AMBER, 2024),
            ("China",     "🇨🇳", "Comercio, REITs, turismo", BLUE, 2023),
            ("India",     "🇮🇳", "IT, farmacia, comercio", CYAN, 2024),
        ]
        for pais, flag, desc, color, year in acuerdos:
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {color}22;border-radius:8px;
                        padding:.55rem .85rem;margin-bottom:.35rem;border-left:3px solid {color}">
              <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.2rem">
                <span style="font-size:1rem">{flag}</span>
                <span style="font-size:.78rem;font-weight:700;color:{TEXT}">{pais}</span>
                <span style="margin-left:auto;font-size:.62rem;color:{MUTED}">{year}</span>
              </div>
              <div style="font-size:.68rem;color:{TEXT2}">{desc}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        section_header("EXPOSICIÓN ESPAÑOLA — ZONAS RIESGO", RED)
        exposiciones = {
            "Marruecos/Argelia (gas)": 85,
            "Ucrania (exportaciones)": 42,
            "Sahel (migración)": 78,
            "Venezuela (diáspora)": 55,
            "Oriente Medio (turismo)": 38,
            "China (comercio)": 60,
        }
        for area, exp in exposiciones.items():
            col_exp = RED if exp > 70 else AMBER if exp > 45 else GREEN
            st.markdown(f"""
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">
              <span style="font-size:.72rem;color:{TEXT2};width:200px;flex-shrink:0">{area}</span>
              <div style="flex:1;height:6px;background:{BG3};border-radius:3px;overflow:hidden">
                <div style="width:{exp}%;height:100%;background:{col_exp};border-radius:3px"></div>
              </div>
              <span style="font-size:.68rem;color:{col_exp};font-weight:700;width:30px;text-align:right">{exp}</span>
            </div>
            """, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
with tab_osint:
    section_header("SEÑALES OSINT — INTELIGENCIA DE FUENTES ABIERTAS", PURPLE)

    TIERS = {1: ("Oficial/Gubernamental", GREEN), 2: ("Think-tank/Academia", CYAN),
             3: ("Medios especializados", BLUE), 4: ("Social/Blogs", AMBER), 5: ("Indeterminado", MUTED)}

    col_tier_legend = st.columns(5)
    for col_t, (tier, (label, col)) in zip(col_tier_legend, TIERS.items()):
        with col_t:
            st.markdown(f"""
            <div style="text-align:center;background:{col}11;border:1px solid {col}33;
                        border-radius:6px;padding:.3rem">
              <div style="font-size:.9rem;font-weight:700;color:{col}">T{tier}</div>
              <div style="font-size:.58rem;color:{TEXT2}">{label}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    OSINT_SIGNALS = [
        {"tier": 1, "fuente": "NATO HQ Brussels", "titulo": "Cumbre NATO: España aumentará presupuesto defensa a 2% PIB en 2029",
         "confianza": 92, "fecha": "2026-04-28", "tipo": "Defensa"},
        {"tier": 2, "fuente": "Real Instituto Elcano", "titulo": "España y el gas argelino: vulnerabilidad estratégica en el Mediterráneo sur",
         "confianza": 88, "fecha": "2026-04-27", "tipo": "Energía"},
        {"tier": 1, "fuente": "Eurostat", "titulo": "Inflación española cede al 2.8%, por debajo de la media UE",
         "confianza": 99, "fecha": "2026-04-28", "tipo": "Economía"},
        {"tier": 2, "fuente": "CIDOB Barcelona", "titulo": "Flujos migratorios Atlántico: Canarias como punto de presión geopolítica",
         "confianza": 85, "fecha": "2026-04-26", "tipo": "Migración"},
        {"tier": 3, "fuente": "Politico.eu", "titulo": "Spain's coalition tensions put EU cohesion vote at risk",
         "confianza": 72, "fecha": "2026-04-28", "tipo": "UE"},
        {"tier": 3, "fuente": "Le Monde Diplomatique", "titulo": "El giro atlántico de España: entre EEUU y la autonomía estratégica europea",
         "confianza": 78, "fecha": "2026-04-25", "tipo": "Diplomacia"},
        {"tier": 4, "fuente": "Blog defensa.com", "titulo": "Ejercicios navales hispano-marroquíes en el Mediterráneo occidental",
         "confianza": 55, "fecha": "2026-04-27", "tipo": "Defensa"},
        {"tier": 2, "fuente": "IISS London", "titulo": "Iberian Peninsula: emerging hub for transatlantic green hydrogen",
         "confianza": 82, "fecha": "2026-04-24", "tipo": "Energía"},
    ]

    col_search, col_filter = st.columns([2, 1])
    with col_search:
        osint_q = st.text_input("🔍 Búsqueda semántica OSINT", placeholder="Buscar en señales OSINT...", key="osint_search")
    with col_filter:
        tier_fil = st.multiselect("Tier", [1, 2, 3, 4], default=[1, 2, 3], key="osint_tier")

    signals_fil = [s for s in OSINT_SIGNALS if s["tier"] in (tier_fil or [1,2,3,4])]
    if osint_q:
        signals_fil = [s for s in signals_fil
                       if osint_q.lower() in s["titulo"].lower() or osint_q.lower() in s["tipo"].lower()]

    for sig in signals_fil:
        tier_label, tier_col = TIERS[sig["tier"]]
        conf = sig["confianza"]
        conf_c = GREEN if conf >= 85 else AMBER if conf >= 65 else RED
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {tier_col}33;border-radius:10px;
                    padding:.85rem 1.1rem;margin-bottom:.5rem;border-left:4px solid {tier_col}">
          <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem;flex-wrap:wrap">
            <span style="background:{tier_col}22;color:{tier_col};border-radius:4px;
                         padding:.1rem .5rem;font-size:.62rem;font-weight:700">T{sig['tier']} · {tier_label}</span>
            <span style="background:{BG3};color:{TEXT2};border-radius:4px;
                         padding:.1rem .5rem;font-size:.62rem">{sig['tipo']}</span>
            <span style="margin-left:auto;font-size:.65rem;font-weight:700;color:{conf_c}">
              Confianza: {conf}%
            </span>
            <span style="font-size:.62rem;color:{MUTED}">{sig['fecha']}</span>
          </div>
          <div style="font-size:.82rem;font-weight:700;color:{TEXT};line-height:1.4;margin-bottom:.3rem">
            {sig['titulo']}
          </div>
          <div style="font-size:.68rem;color:{TEXT2}">📡 {sig['fuente']}</div>
        </div>
        """, unsafe_allow_html=True)

    if _BRAIN_OK and osint_q:
        if st.button("🧠 Analizar con Politeia Brain", key="btn_osint_brain"):
            with st.spinner("Analizando señales OSINT..."):
                contexto = "\n".join([f"- {s['titulo']} [{s['fuente']}]" for s in signals_fil[:5]])
                resp = _brain.chat(
                    f"Analiza estas señales OSINT relacionadas con '{osint_q}' "
                    f"y su impacto en España:\n{contexto}",
                )
            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {PURPLE}33;border-radius:10px;
                        padding:1rem;margin-top:.8rem;border-left:4px solid {PURPLE}">
              <div style="font-size:.65rem;color:{PURPLE};font-weight:700;margin-bottom:.4rem">
                🧠 ANÁLISIS POLITEIA BRAIN
              </div>
              <div style="font-size:.83rem;color:{TEXT};line-height:1.6">{resp}</div>
            </div>
            """, unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
with tab_impacto:
    section_header("MATRIZ DE TRANSMISIÓN — GEOPOLÍTICA → ESPAÑA", AMBER)

    EVENTOS_MATRIX = ["Conf. Rusia-Ucr.", "Crisis Gaza", "Tensión Taiwan", "Migración Sahel",
                      "Gas Argelia", "Aranceles UE-China", "Crisis Venezuela", "OTAN/Defensa"]
    SECTORES_MATRIX = ["Energía", "Defensa", "Turismo", "Agricultura", "Banca", "Exportaciones", "Migración", "Bolsa"]

    np.random.seed(42)
    base = np.array([
        [2, 8, 4, 3, 9, 5, 2, 7],
        [3, 9, 2, 2, 4, 3, 3, 6],
        [5, 6, 3, 2, 6, 8, 1, 9],
        [3, 5, 6, 7, 2, 2, 9, 3],
        [9, 4, 5, 6, 8, 3, 2, 6],
        [4, 2, 5, 7, 3, 9, 2, 7],
        [2, 3, 7, 4, 2, 3, 8, 4],
        [3, 9, 4, 2, 5, 4, 2, 6],
    ], dtype=float)

    fig_matrix = go.Figure(go.Heatmap(
        z=base,
        x=SECTORES_MATRIX,
        y=EVENTOS_MATRIX,
        colorscale=[[0, "rgba(16,185,129,0.13)"], [0.4, "rgba(245,158,11,0.67)"], [1, RED]],
        showscale=True,
        text=base.astype(int),
        texttemplate="%{text}",
        textfont=dict(size=11, color=TEXT),
        hovertemplate=(
            "<b>%{y}</b> → <b>%{x}</b><br>"
            "Impacto: %{z:.0f}/10<extra></extra>"
        ),
        colorbar=dict(
            title=dict(text="Impacto", font=dict(color=TEXT2, size=10)),
            tickfont=dict(color=TEXT2, size=9),
        ),
    ))
    fig_matrix.update_layout(
        height=380, paper_bgcolor=BG2, plot_bgcolor=BG2,
        margin=dict(t=10, b=10, l=140, r=10),
        xaxis=dict(color=TEXT, tickfont=dict(size=9), side="bottom"),
        yaxis=dict(color=TEXT, tickfont=dict(size=9)),
    )
    st.plotly_chart(fig_matrix, use_container_width=True, config={"displayModeBar": False})

    st.markdown(f"""
    <div style="font-size:.75rem;color:{MUTED};margin-top:.3rem">
      Valores 1-10: impacto sobre sector doméstico español.
      Haz clic en una celda para análisis IA detallado.
    </div>
    """, unsafe_allow_html=True)

    col_sel1, col_sel2, col_btn = st.columns([1, 1, 1])
    with col_sel1:
        ev_sel = st.selectbox("Evento geopolítico", EVENTOS_MATRIX, key="matrix_ev")
    with col_sel2:
        sec_sel = st.selectbox("Sector doméstico", SECTORES_MATRIX, key="matrix_sec")
    with col_btn:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("🧠 Analizar impacto", key="btn_matrix_brain", disabled=not _BRAIN_OK):
            with st.spinner("Analizando impacto..."):
                resp = _brain.chat(
                    f"Analiza el impacto de '{ev_sel}' sobre el sector '{sec_sel}' en España. "
                    "Incluye: mecanismo de transmisión, magnitud estimada, horizonte temporal "
                    "y medidas de mitigación disponibles. Máximo 200 palabras."
                )
                st.session_state["matrix_resp"] = resp

    if "matrix_resp" in st.session_state:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {AMBER}33;border-radius:10px;
                    padding:1rem;margin-top:.5rem;border-left:4px solid {AMBER}">
          <div style="font-size:.65rem;color:{AMBER};font-weight:700;margin-bottom:.4rem">
            🧠 {ev_sel.upper()} → {sec_sel.upper()}
          </div>
          <div style="font-size:.83rem;color:{TEXT};line-height:1.6">
            {st.session_state['matrix_resp']}
          </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)
    section_header("PROYECCIÓN 90 DÍAS — IMPACTO POR SECTOR", PURPLE)

    np.random.seed(7)
    fechas_90 = pd.date_range(pd.Timestamp.today(), periods=90, freq="D")
    fig_proj = go.Figure()
    sectores_top = ["Energía", "Turismo", "Exportaciones", "Migración"]
    proj_colors = [RED, GREEN, CYAN, AMBER]
    for sector, color in zip(sectores_top, proj_colors):
        base_v = np.random.randint(40, 75)
        trend = np.linspace(0, np.random.choice([-10, 10, 5]), 90)
        noise = np.random.randn(90) * 4
        vals = np.clip(base_v + trend + noise, 0, 100)
        fig_proj.add_trace(go.Scatter(
            x=fechas_90, y=vals, name=sector,
            line=dict(color=color, width=2),
            hovertemplate=f"{sector}: %{{y:.0f}}/100<extra></extra>",
        ))
    fig_proj.update_layout(
        height=240, paper_bgcolor=BG2, plot_bgcolor=BG2,
        margin=dict(t=10, b=10, l=10, r=10),
        xaxis=dict(color=TEXT2, gridcolor=BORDER),
        yaxis=dict(color=TEXT2, gridcolor=BORDER, title="Presión (0-100)", range=[0, 100]),
        legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.3,
                    font=dict(size=9, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
        hovermode="x unified",
    )
    st.plotly_chart(fig_proj, use_container_width=True, config={"displayModeBar": False})
