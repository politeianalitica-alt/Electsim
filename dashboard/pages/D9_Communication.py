"""D9 — Communication Intelligence
Módulo de inteligencia de comunicación con radar de mensajes, testeo,
tracker de consistencia y estrategia.
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
)

# ── page config ────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Communication Intelligence · Politeia",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ── LLM optional ───────────────────────────────────────────────────────────────
try:
    from dashboard.services.llm_local import chat as llm_chat, disponible as llm_disponible
    _LLM_OK = llm_disponible().get("brain", False)
except Exception:
    _LLM_OK = False

# ── helpers ────────────────────────────────────────────────────────────────────
PARTIDOS = ["PSOE", "PP", "Vox", "Sumar", "Junts", "PNV", "ERC"]
CANALES = ["Twitter/X", "Instagram", "TV", "Radio", "Prensa Digital", "WhatsApp", "YouTube"]
AUDIENCIAS_POLITICO = [
    "Jóvenes Precarios Urbanos (14%)",
    "Clase Media Consolidada (22%)",
    "Jubilados Conservadores (18%)",
    "Trabajadores Industriales (11%)",
    "Profesionales Liberales (16%)",
    "Mujeres Periurbanas (13%)",
    "Otros (6%)",
]
AUDIENCIAS_CORP = [
    "Inversores institucionales",
    "Reguladores y AAPP",
    "Medios especializados",
    "Consumidores finales",
    "Empleados y sindicatos",
    "Comunidades locales",
    "ONGs y grupos de presión",
]
TEMAS = ["Economía", "Seguridad", "Sanidad", "Educación", "Vivienda", "Inmigración", "Clima"]

# ── seed demo data ──────────────────────────────────────────────────────────────
rng = np.random.default_rng(42)

def _gen_mensajes(partido: str, n: int = 12) -> pd.DataFrame:
    frases = [
        f"España necesita estabilidad para crecer",
        f"Bajada de impuestos para las familias",
        f"La seguridad de los españoles es prioridad",
        f"Inversión en infraestructuras verdes",
        f"Reforma del sistema educativo urgente",
        f"Proteger las pensiones de los mayores",
        f"Vivienda asequible para los jóvenes",
        f"Lucha contra la corrupción real",
        f"España en el centro de Europa",
        f"Servicios públicos de calidad para todos",
        f"Empleo de calidad para la clase trabajadora",
        f"Apoyo a las PYMES y autónomos",
    ]
    fechas = [datetime.now() - timedelta(days=int(rng.integers(1, 30))) for _ in range(n)]
    return pd.DataFrame({
        "mensaje": frases[:n],
        "canal": rng.choice(CANALES, n),
        "audiencia": rng.choice(AUDIENCIAS_POLITICO, n),
        "alcance": rng.integers(5000, 500000, n),
        "engagement": rng.uniform(1.2, 8.5, n).round(2),
        "impacto_opinion": rng.uniform(-2, 10, n).round(1),
        "sentimiento": rng.choice(["Positivo", "Neutro", "Negativo"], n, p=[0.55, 0.30, 0.15]),
        "fecha": fechas,
        "spread_viral": rng.integers(0, 1000, n),
    })

def _gen_consistencia() -> pd.DataFrame:
    mensajes_tipo = [
        ("Eje Económico", "Bajar impuestos para familias y empresas", 0.92),
        ("Eje Económico", "Reducir el déficit público manteniendo servicios", 0.71),
        ("Eje Económico", "Aumentar el gasto social en sanidad y educación", 0.38),
        ("Eje Social", "Reforzar los servicios públicos de calidad", 0.88),
        ("Eje Social", "Privatizar la gestión sanitaria para mejorarla", 0.22),
        ("Eje Social", "Igualdad de oportunidades para todos los españoles", 0.79),
        ("Eje Seguridad", "Mano dura con la delincuencia y la inmigración ilegal", 0.91),
        ("Eje Seguridad", "Integración y cohesión social como solución", 0.34),
        ("Eje Europa", "España líder en la construcción europea", 0.85),
        ("Eje Europa", "Soberanía nacional frente a imposiciones de Bruselas", 0.29),
    ]
    return pd.DataFrame(mensajes_tipo, columns=["eje", "mensaje", "coherencia"])


# ── PAGE HEADER ────────────────────────────────────────────────────────────────
st.markdown("""
<div style='background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);
     padding:1.5rem 2rem;border-radius:12px;margin-bottom:1.5rem;
     border-left:4px solid #e94560;'>
  <h1 style='color:#fff;margin:0;font-size:1.8rem;'> Communication Intelligence</h1>
  <p style='color:#aaa;margin:0.4rem 0 0;font-size:0.9rem;'>
    Radar de mensajes · Testeo de impacto · Consistencia narrativa · Estrategia
  </p>
</div>
""", unsafe_allow_html=True)

# ── MODO SELECTOR ──────────────────────────────────────────────────────────────
st.markdown("### Modo de Trabajo")
modo_col1, modo_col2, modo_col3 = st.columns(3)
with modo_col1:
    if st.button("Político / Electoral",
                 type="primary"if st.session_state.get("modo_comm") == "Político"else "secondary",
                 use_container_width=True):
        st.session_state["modo_comm"] = "Político"
        st.rerun()
with modo_col2:
    if st.button("Corporativo / Institucional",
                 type="primary"if st.session_state.get("modo_comm") == "Corporativo"else "secondary",
                 use_container_width=True):
        st.session_state["modo_comm"] = "Corporativo"
        st.rerun()
with modo_col3:
    if st.button("Campaña de Comunicación",
                 type="primary"if st.session_state.get("modo_comm") == "Campaña"else "secondary",
                 use_container_width=True):
        st.session_state["modo_comm"] = "Campaña"
        st.rerun()

modo = st.session_state.get("modo_comm", "Político")
audiencias = AUDIENCIAS_POLITICO if modo == "Político"else (
    AUDIENCIAS_CORP if modo == "Corporativo"else
    ["Decisores B2B", "Influencers del sector", "Público general 35-55", "Jóvenes 18-35", "Stakeholders clave"]
)

st.markdown(f"""
<div style='background:#0f3460;padding:0.5rem 1rem;border-radius:8px;
     margin:0.5rem 0 1.5rem;display:inline-block;'>
  <span style='color:#e94560;font-weight:700;'>Modo activo:</span>
  <span style='color:#fff;'> {modo}</span>
  {'<span style="color:#aaa;font-size:0.85rem;"> · Clusters CIS microdatos activados</span>'if modo == "Político"else
   '<span style="color:#aaa;font-size:0.85rem;"> · Stakeholders corporativos activos</span>'if modo == "Corporativo"else
   '<span style="color:#aaa;font-size:0.85rem;"> · Segmentos de campaña activos</span>'}
</div>
""", unsafe_allow_html=True)

# ── TABS ───────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "Radar de Mensajes",
    "Testeo",
    "Tracker de Consistencia",
    "Estrategia",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — RADAR DE MENSAJES
# ══════════════════════════════════════════════════════════════════════════════
with tab1:
    col_left, col_center, col_right = st.columns([1.2, 2.5, 1.5])

    # ── LEFT: selector ─────────────────────────────────────────────────────────
    with col_left:
        st.markdown("####  Entidad a analizar")
        if modo == "Político":
            entidad = st.selectbox("Partido", PARTIDOS, key="radar_partido")
        elif modo == "Corporativo":
            entidad = st.selectbox("Empresa / Cliente",
                ["Mi empresa", "Competidor A", "Competidor B", "Todo el sector"], key="radar_corp")
        else:
            entidad = st.selectbox("Campaña activa",
                ["Lanzamiento producto X", "Campaña imagen 2026", "Acto Mayo"], key="radar_camp")

        periodo = st.selectbox("Período", [
            "Últimas 24h", "Última semana", "Últimas 2 semanas",
            "Últimas 4 semanas", "Último trimestre",
        ], index=3, key="radar_periodo")
        segmento = st.selectbox("Segmento / Audiencia",
            ["Todos"] + audiencias, key="radar_seg")
        tema = st.selectbox("Tema", ["Todos"] + TEMAS, key="radar_tema")

        st.markdown("---")
        st.markdown("####  Clusters activos")
        for a in audiencias[:6]:
            pct = rng.integers(8, 25)
            st.markdown(
                f"<div style='display:flex;justify-content:space-between;"
                f"font-size:0.8rem;margin:2px 0;'>"
                f"<span style='color:#ccc;'>{a[:28]}{'…'if len(a)>28 else ''}</span>"
                f"<span style='color:#e94560;font-weight:700;'>{pct}%</span></div>",
                unsafe_allow_html=True,
            )

    # ── CENTER: dashboard ───────────────────────────────────────────────────────
    with col_center:
        df_msgs = _gen_mensajes(entidad if modo == "Político"else "Demo")

        st.markdown("####  Efectividad de mensajes")
        # Bubble chart: alcance vs impacto vs engagement
        fig_bubble = px.scatter(
            df_msgs,
            x="engagement",
            y="impacto_opinion",
            size="alcance",
            color="canal",
            hover_name="mensaje",
            text=df_msgs["canal"],
            title=f"Efectividad mensajes — {entidad}",
            labels={"engagement": "Engagement (%)", "impacto_opinion": "Impacto en opinión (+/-)"},
            height=320,
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        fig_bubble.update_traces(textposition="top center", textfont_size=9)
        fig_bubble.update_layout(
            paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
            font_color="#ccc", showlegend=True,
            legend=dict(bgcolor="#0d1117", font_color="#ccc"),
        )
        st.plotly_chart(fig_bubble, use_container_width=True)

        # Heatmap: canal × audiencia
        st.markdown("####  Matriz Canal × Audiencia")
        aud_short = [a.split(" (")[0][:22] for a in audiencias[:6]]
        hm_data = rng.uniform(0, 10, (len(aud_short), len(CANALES[:5]))).round(1)
        fig_hm = go.Figure(go.Heatmap(
            z=hm_data,
            x=CANALES[:5],
            y=aud_short,
            colorscale="RdYlGn",
            zmin=0, zmax=10,
            text=hm_data,
            texttemplate="%{text}",
            textfont_size=11,
            hoverongaps=False,
        ))
        fig_hm.update_layout(
            height=260,
            paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
            font_color="#ccc",
            title=dict(text="Impacto por canal y audiencia (0-10)", font_color="#ccc"),
            margin=dict(l=160, r=20, t=40, b=60),
        )
        st.plotly_chart(fig_hm, use_container_width=True)

        # Top 5 mensajes tabla
        st.markdown("####  Top mensajes por impacto")
        top5 = df_msgs.nlargest(5, "impacto_opinion")[
            ["mensaje", "canal", "alcance", "engagement", "impacto_opinion", "sentimiento"]
        ].reset_index(drop=True)
        top5["alcance"] = top5["alcance"].apply(lambda x: f"{x:,}")
        top5["engagement"] = top5["engagement"].apply(lambda x: f"{x}%")
        st.dataframe(top5, use_container_width=True, height=200)

    # ── RIGHT: análisis causal ──────────────────────────────────────────────────
    with col_right:
        st.markdown("####  Análisis Causal")
        msg_sel = st.selectbox(
            "Seleccionar mensaje",
            df_msgs["mensaje"].tolist(),
            key="radar_msg_sel",
        )
        row = df_msgs[df_msgs["mensaje"] == msg_sel].iloc[0]

        st.markdown(f"""
<div style='background:#0d1117;border:1px solid #333;border-radius:8px;padding:1rem;margin-top:0.5rem;'>
  <p style='color:#e94560;font-weight:700;margin:0 0 0.5rem;font-size:0.85rem;'>MENSAJE SELECCIONADO</p>
  <p style='color:#fff;font-size:0.9rem;margin:0 0 1rem;'>"{msg_sel}"</p>
  <div style='display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;'>
    <div style='background:#16213e;border-radius:6px;padding:0.5rem;text-align:center;'>
      <div style='color:#aaa;font-size:0.75rem;'>ALCANCE</div>
      <div style='color:#4ecdc4;font-size:1.2rem;font-weight:700;'>{int(row["alcance"]):,}</div>
    </div>
    <div style='background:#16213e;border-radius:6px;padding:0.5rem;text-align:center;'>
      <div style='color:#aaa;font-size:0.75rem;'>ENGAGEMENT</div>
      <div style='color:#f7971e;font-size:1.2rem;font-weight:700;'>{row["engagement"]}%</div>
    </div>
    <div style='background:#16213e;border-radius:6px;padding:0.5rem;text-align:center;'>
      <div style='color:#aaa;font-size:0.75rem;'>IMPACTO</div>
      <div style='color:{"#45b7d1"if row["impacto_opinion"] > 0 else "#e94560"};font-size:1.2rem;font-weight:700;'>
        {row["impacto_opinion"]:+.1f}
      </div>
    </div>
    <div style='background:#16213e;border-radius:6px;padding:0.5rem;text-align:center;'>
      <div style='color:#aaa;font-size:0.75rem;'>SENTIMIENTO</div>
      <div style='color:{"#4ecdc4"if row["sentimiento"] == "Positivo"else "#f39c12"if row["sentimiento"] == "Neutro"else "#e94560"};font-size:1rem;font-weight:700;'>
        {row["sentimiento"]}
      </div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

        st.markdown("---")
        st.markdown("** Evolución del impacto**")
        dias = pd.date_range(end=datetime.now(), periods=14)
        vals = rng.uniform(-1, 8, 14)
        vals = pd.Series(vals).ewm(span=3).mean().values
        fig_evo = go.Figure(go.Scatter(
            x=dias, y=vals, mode="lines+markers",
            line=dict(color="#e94560", width=2),
            marker=dict(size=5),
            fill="tozeroy",
            fillcolor="rgba(233,69,96,0.15)",
        ))
        fig_evo.update_layout(
            height=140, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
            font_color="#ccc", margin=dict(l=30, r=10, t=10, b=30),
            showlegend=False,
        )
        st.plotly_chart(fig_evo, use_container_width=True)

        st.markdown("** Análisis IA**")
        if st.button("Analizar con IA", key="btn_analizar_msg", use_container_width=True):
            if _LLM_OK:
                with st.spinner("Analizando..."):
                    prompt = (
                        f"Analiza el mensaje político '{msg_sel}'en contexto español. "
                        f"Canal: {row['canal']}, alcance: {int(row['alcance']):,}, "
                        f"impacto: {row['impacto_opinion']:+.1f}. "
                        "Explica brevemente por qué funciona o no, y sugiere una mejora. Sé conciso (3-4 líneas)."
                    )
                    resp = llm_chat(prompt, sistema="Eres un experto en comunicación política española.")
                    st.markdown(
                        f"<div style='background:#0d1117;border:1px solid #e94560;border-radius:6px;"
                        f"padding:0.75rem;font-size:0.85rem;color:#ccc;'>{resp}</div>",
                        unsafe_allow_html=True,
                    )
            else:
                sentimiento_txt = row["sentimiento"].lower()
                canal_txt = row["canal"]
                impacto_val = row["impacto_opinion"]
                alcance_val = int(row["alcance"])
                st.info(
                    f"Mensaje con sentimiento {sentimiento_txt} en {canal_txt}. "
                    f"Impacto {impacto_val:+.1f} con {alcance_val:,} impresiones. "
                    "Conecta Ollama (politeia-brain) para análisis profundo."
                )

# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — TESTEO DE MENSAJES
# ══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.markdown("###  Simulador de Testeo de Mensajes")
    st.markdown(
        "Simula el impacto de un mensaje antes de lanzarlo. "
        "El sistema estima recepción por audiencia, riesgo y viralidad."
    )

    tcol1, tcol2 = st.columns([1.5, 1])

    with tcol1:
        msg_test = st.text_area(
            "Introduce el mensaje a testear",
            placeholder="Ej: 'Vamos a garantizar que ningún español pague más del 30% de su sueldo en vivienda'",
            height=100,
            key="msg_testeo",
        )
        tcols = st.columns(3)
        canal_test = tcols[0].selectbox("Canal objetivo", CANALES, key="test_canal")
        aud_test = tcols[1].selectbox("Audiencia objetivo", audiencias, key="test_aud")
        tema_test = tcols[2].selectbox("Tema", TEMAS, key="test_tema")

        btn_test = st.button(
            "Ejecutar simulación", type="primary", use_container_width=True, key="btn_test"
        )

        if btn_test and msg_test:
            with st.spinner("Simulando impacto... (~3-8s)"):
                # Simulated scores
                words = len(msg_test.split())
                base = min(words / 20, 1.0)
                scores = {
                    "Impacto potencial": round(base * rng.uniform(6, 9.5), 1),
                    "Viralidad estimada": round(rng.uniform(3, 8.5), 1),
                    "Riesgo de malinterpretación": round(rng.uniform(1, 5), 1),
                    "Consistencia con línea editorial": round(rng.uniform(5, 9.5), 1),
                    "Resonancia emocional": round(rng.uniform(4, 9), 1),
                    "Claridad del mensaje": round(base * rng.uniform(6, 10), 1),
                }

                # Radar chart
                cats = list(scores.keys())
                vals_radar = list(scores.values())
                vals_radar.append(vals_radar[0])
                cats.append(cats[0])

                fig_radar = go.Figure(go.Scatterpolar(
                    r=vals_radar,
                    theta=cats,
                    fill="toself",
                    line=dict(color="#e94560", width=2),
                    name="Mensaje testeado",
                ))
                fig_radar.update_layout(
                    polar=dict(
                        radialaxis=dict(visible=True, range=[0, 10], color="#555", gridcolor="#333"),
                        angularaxis=dict(color="#ccc", gridcolor="#333"),
                    ),
                    paper_bgcolor="#0d1117",
                    font_color="#ccc",
                    height=350,
                    title=dict(text="Perfil del mensaje testeado", font_color="#ccc"),
                )
                st.plotly_chart(fig_radar, use_container_width=True)

                # Score breakdown
                st.markdown("**Puntuación por dimensión:**")
                for dim, val in scores.items():
                    color = "#4ecdc4"if val >= 7 else "#f39c12"if val >= 5 else "#e94560"
                    st.markdown(
                        f"<div style='display:flex;align-items:center;gap:0.5rem;margin:3px 0;'>"
                        f"<span style='color:#ccc;font-size:0.85rem;width:240px;'>{dim}</span>"
                        f"<div style='flex:1;background:#222;border-radius:4px;height:12px;'>"
                        f"<div style='width:{val*10}%;background:{color};height:12px;border-radius:4px;'></div></div>"
                        f"<span style='color:{color};font-weight:700;width:30px;text-align:right;'>{val}</span></div>",
                        unsafe_allow_html=True,
                    )

                if _LLM_OK:
                    st.markdown("---")
                    st.markdown("** Diagnóstico IA:**")
                    resp = llm_chat(
                        f"Evalúa este mensaje político para España: '{msg_test}'. "
                        f"Canal: {canal_test}, Audiencia: {aud_test}, Tema: {tema_test}. "
                        "En 3-5 puntos breves: ¿funciona? ¿qué riesgos tiene? ¿cómo mejorarlo?",
                        sistema="Eres experto en comunicación política y consultoría electoral española.",
                    )
                    st.markdown(
                        f"<div style='background:#0d1117;border:1px solid #4ecdc4;border-radius:8px;"
                        f"padding:1rem;color:#ccc;font-size:0.9rem;'>{resp}</div>",
                        unsafe_allow_html=True,
                    )

    with tcol2:
        st.markdown("####  Historial de testeos")
        if "historial_test"not in st.session_state:
            st.session_state["historial_test"] = [
                {"mensaje": "La sanidad pública es sagrada para nosotros", "score": 8.2, "riesgo": 1.5},
                {"mensaje": "Reduciremos el paro juvenil a la mitad", "score": 7.6, "riesgo": 3.1},
                {"mensaje": "Tolerancia cero con la corrupción política", "score": 9.1, "riesgo": 2.0},
                {"mensaje": "Europa nos protege de los riesgos globales", "score": 6.3, "riesgo": 2.8},
            ]
        for item in st.session_state["historial_test"]:
            color = "#4ecdc4"if item["score"] >= 7 else "#f39c12"
            st.markdown(
                f"<div style='background:#0d1117;border:1px solid #333;border-radius:6px;"
                f"padding:0.5rem 0.75rem;margin:4px 0;'>"
                f"<p style='color:#ccc;font-size:0.8rem;margin:0 0 4px;'>«{item['mensaje'][:50]}…»</p>"
                f"<span style='color:{color};font-weight:700;'>Score: {item['score']}</span>"
                f" &nbsp;·&nbsp; <span style='color:#f39c12;'>Riesgo: {item['riesgo']}</span></div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")
        st.markdown("####  A/B Testing")
        st.markdown(
            "<p style='color:#aaa;font-size:0.85rem;'>Compara dos versiones del mismo mensaje</p>",
            unsafe_allow_html=True,
        )
        msg_a = st.text_input("Versión A", "España necesita estabilidad política", key="ab_a")
        msg_b = st.text_input("Versión B", "España merece un gobierno estable", key="ab_b")
        if st.button("Comparar A/B", use_container_width=True, key="btn_ab"):
            score_a = round(rng.uniform(5, 9.5), 1)
            score_b = round(rng.uniform(5, 9.5), 1)
            ganador = "A"if score_a > score_b else "B"
            gcol1, gcol2 = st.columns(2)
            gcol1.metric("Versión A", score_a, delta=f"{score_a - score_b:+.1f} vs B")
            gcol2.metric("Versión B", score_b, delta=f"{score_b - score_a:+.1f} vs A")
            st.success(f"✓ Versión **{ganador}** más efectiva según simulación")

# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — TRACKER DE CONSISTENCIA
# ══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.markdown("###  Tracker de Consistencia Narrativa")
    st.markdown(
        "Detecta contradicciones en el discurso. "
        "La distancia semántica entre mensajes del mismo eje revela incoherencias."
    )

    df_cons = _gen_consistencia()

    cons_col1, cons_col2 = st.columns([1.5, 1])

    with cons_col1:
        st.markdown("#### Coherencia por eje de comunicación")

        for eje in df_cons["eje"].unique():
            sub = df_cons[df_cons["eje"] == eje]
            st.markdown(f"**{eje}**")
            for _, row in sub.iterrows():
                coh = row["coherencia"]
                color = "#4ecdc4"if coh >= 0.7 else "#f39c12"if coh >= 0.4 else "#e94560"
                label = "✓ Consistente"if coh >= 0.7 else "⚠ Tensión"if coh >= 0.4 else "✗ Contradictorio"
                st.markdown(
                    f"<div style='background:#0d1117;border-left:3px solid {color};"
                    f"border-radius:0 6px 6px 0;padding:0.4rem 0.75rem;margin:3px 0;'>"
                    f"<div style='display:flex;justify-content:space-between;'>"
                    f"<span style='color:#ccc;font-size:0.85rem;'>{row['mensaje']}</span>"
                    f"<span style='color:{color};font-size:0.8rem;font-weight:700;'>"
                    f"{label} ({coh:.0%})</span></div>"
                    f"<div style='margin-top:4px;background:#222;border-radius:3px;height:6px;'>"
                    f"<div style='width:{coh*100:.0f}%;background:{color};height:6px;border-radius:3px;'></div>"
                    f"</div></div>",
                    unsafe_allow_html=True,
                )
            st.markdown("")

        # Timeline de coherencia
        st.markdown("####  Evolución de consistencia global (30 días)")
        dias_c = pd.date_range(end=datetime.now(), periods=30)
        coh_series = pd.Series(rng.uniform(0.5, 0.9, 30)).ewm(span=5).mean()
        fig_coh = go.Figure()
        fig_coh.add_trace(go.Scatter(
            x=dias_c, y=coh_series, mode="lines",
            line=dict(color="#4ecdc4", width=2),
            fill="tozeroy", fillcolor="rgba(78,205,196,0.1)",
            name="Consistencia",
        ))
        fig_coh.add_hline(y=0.7, line_dash="dash", line_color="#f39c12",
                          annotation_text="Umbral óptimo (70%)")
        fig_coh.update_layout(
            height=200, paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
            font_color="#ccc", yaxis=dict(tickformat=".0%", range=[0, 1]),
            margin=dict(l=50, r=20, t=20, b=40),
        )
        st.plotly_chart(fig_coh, use_container_width=True)

    with cons_col2:
        st.markdown("#### ⚠ Alertas de Inconsistencia")

        alertas_inc = [
            {"severidad": "ALTA", "eje": "Eje Económico", "msg1": "Bajar impuestos", "msg2": "Aumentar gasto social", "dias": 3},
            {"severidad": "MEDIA", "eje": "Eje Seguridad", "msg1": "Mano dura", "msg2": "Integración social", "dias": 7},
            {"severidad": "BAJA", "eje": "Eje Europa", "msg1": "España líder UE", "msg2": "Soberanía nacional", "dias": 12},
        ]
        for a in alertas_inc:
            col_a = "#e94560"if a["severidad"] == "ALTA"else "#f39c12"if a["severidad"] == "MEDIA"else "#aaa"
            st.markdown(
                f"<div style='background:#0d1117;border:1px solid {col_a};border-radius:8px;"
                f"padding:0.75rem;margin:6px 0;'>"
                f"<div style='display:flex;justify-content:space-between;margin-bottom:0.3rem;'>"
                f"<span style='color:{col_a};font-weight:700;font-size:0.8rem;'> {a['severidad']}</span>"
                f"<span style='color:#555;font-size:0.75rem;'>hace {a['dias']} días</span></div>"
                f"<p style='color:#aaa;font-size:0.8rem;margin:0;'><b>{a['eje']}</b></p>"
                f"<p style='color:#ccc;font-size:0.8rem;margin:2px 0;'>«{a['msg1']}» ↔ «{a['msg2']}»</p>"
                f"</div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")
        st.markdown("####  Buscar inconsistencias")
        query_inc = st.text_input(
            "Introduce un mensaje para comparar",
            placeholder="Ej: Reformar el sistema fiscal...",
            key="buscar_inc",
        )
        if st.button("Analizar inconsistencias", key="btn_inc", use_container_width=True):
            if query_inc:
                scores_inc = [rng.uniform(0.1, 0.95) for _ in TEMAS]
                for tema_i, score_i in zip(TEMAS, scores_inc):
                    color_i = "#4ecdc4"if score_i > 0.7 else "#f39c12"if score_i > 0.4 else "#e94560"
                    st.markdown(
                        f"<div style='display:flex;justify-content:space-between;font-size:0.82rem;"
                        f"margin:2px 0;'><span style='color:#ccc;'>{tema_i}</span>"
                        f"<span style='color:{color_i};'>{score_i:.0%}</span></div>",
                        unsafe_allow_html=True,
                    )

# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — ESTRATEGIA
# ══════════════════════════════════════════════════════════════════════════════
with tab4:
    st.markdown("###  Constructor de Estrategia de Comunicación")

    st_col1, st_col2 = st.columns([1, 1])

    with st_col1:
        st.markdown("####  Configurar estrategia")
        objetivo = st.selectbox(
            "Objetivo principal",
            [
                "Recuperar votantes perdidos",
                "Conquistar indecisos",
                "Consolidar base fiel",
                "Reposicionar marca",
                "Gestionar crisis reputacional",
                "Lanzar nueva propuesta",
            ],
            key="str_objetivo",
        )
        horizonte = st.selectbox(
            "Horizonte temporal",
            ["2 semanas", "1 mes", "3 meses", "6 meses", "Hasta próximas elecciones"],
            key="str_horizonte",
        )
        presupuesto = st.select_slider(
            "Nivel de inversión",
            options=["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"],
            value="Medio",
            key="str_presupuesto",
        )
        canales_sel = st.multiselect(
            "Canales disponibles",
            CANALES,
            default=CANALES[:4],
            key="str_canales",
        )
        audiencia_obj = st.multiselect(
            "Audiencias objetivo",
            audiencias,
            default=audiencias[:3],
            key="str_aud",
        )

        if st.button("Generar estrategia IA", type="primary", use_container_width=True, key="btn_gen_str"):
            with st.spinner("Construyendo estrategia..."):
                if _LLM_OK:
                    prompt_str = (
                        f"Diseña una estrategia de comunicación {modo.lower()} española para: "
                        f"objetivo='{objetivo}', horizonte={horizonte}, "
                        f"canales={', '.join(canales_sel)}, "
                        f"audiencias={', '.join(str(a) for a in audiencia_obj[:2])}. "
                        "Estructura: 1) Ejes narrativos clave (3) 2) Plan por canal (2-3 acciones) "
                        "3) Métricas de éxito 4) Riesgos. Sé concreto y breve."
                    )
                    resp_str = llm_chat(
                        prompt_str,
                        sistema="Eres un estratega de comunicación política con 20 años de experiencia en España.",
                    )
                    st.session_state["estrategia_generada"] = resp_str
                else:
                    st.session_state["estrategia_generada"] = (
                        f"**Estrategia para: {objetivo}**\n\n"
                        f"**Ejes narrativos:**\n"
                        f"1. Cercanía y autenticidad — mensajes cortos, directos, cotidianos\n"
                        f"2. Propuesta concreta — evitar abstracciones, cifras reales\n"
                        f"3. Contraposición — definir adversario, marcar diferencia clara\n\n"
                        f"**Plan por canal ({', '.join(canales_sel[:2])}):**\n"
                        f"- Twitter/X: 3-4 tweets/día, horario 8-9h y 20-22h\n"
                        f"- Instagram: stories diarias + 3 posts/semana con infografías\n\n"
                        f"**Métricas:** Engagement >4%, alcance +20%, intención de voto +2pts\n\n"
                        f"**Riesgos:** Sobreexposición, mensajes contradictorios, crisis inesperada\n\n"
                        f"_Conecta Ollama para estrategia personalizada._"
                    )

    with st_col2:
        st.markdown("####  Plan estratégico")

        if "estrategia_generada"in st.session_state:
            st.markdown(
                f"<div style='background:#0d1117;border:1px solid #4ecdc4;border-radius:8px;"
                f"padding:1.25rem;color:#ccc;font-size:0.88rem;line-height:1.6;'>"
                f"{st.session_state['estrategia_generada'].replace(chr(10), '<br>')}</div>",
                unsafe_allow_html=True,
            )

        st.markdown("---")
        st.markdown("####  Calendario de publicaciones")
        # Mini calendar: 4 weeks × 7 days
        semanas = 4
        dias_cal = []
        for s in range(semanas):
            fila = []
            for d in range(7):
                actividad = rng.choice(["", "Tweet", "IG Post", "Story", "Rueda prensa", "Video"], p=[0.35, 0.2, 0.15, 0.15, 0.05, 0.1])
                fila.append(actividad)
            dias_cal.append(fila)

        dias_semana = ["L", "M", "X", "J", "V", "S", "D"]
        df_cal = pd.DataFrame(dias_cal, columns=dias_semana, index=[f"Sem {i+1}"for i in range(semanas)])
        color_map = {
            "": "#111", "Tweet": "#1da1f2", "IG Post": "#e1306c",
            "Story": "#f56040", "Rueda prensa": "#e94560", "Video": "#ff0000",
        }

        fig_cal = go.Figure()
        for j, dia in enumerate(dias_semana):
            for i, sem in enumerate([f"Sem {k+1}"for k in range(semanas)]):
                val = df_cal.loc[sem, dia]
                bg = color_map.get(val, "#111")
                fig_cal.add_trace(go.Scatter(
                    x=[j], y=[i],
                    mode="markers+text",
                    marker=dict(symbol="square", size=36, color=bg, line=dict(color="#333", width=1)),
                    text=val[:4] if val else "",
                    textfont=dict(size=8, color="#fff"),
                    textposition="middle center",
                    showlegend=False,
                    hovertext=f"{dia} {sem}: {val or 'Sin actividad'}",
                    hoverinfo="text",
                ))

        fig_cal.update_layout(
            height=200,
            paper_bgcolor="#0d1117", plot_bgcolor="#0d1117",
            font_color="#ccc",
            xaxis=dict(tickmode="array", tickvals=list(range(7)), ticktext=dias_semana, gridcolor="#222"),
            yaxis=dict(tickmode="array", tickvals=list(range(4)), ticktext=[f"Sem {k+1}"for k in range(4)], gridcolor="#222"),
            margin=dict(l=60, r=20, t=20, b=40),
        )
        st.plotly_chart(fig_cal, use_container_width=True)
