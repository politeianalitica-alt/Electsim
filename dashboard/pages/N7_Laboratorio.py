"""
ELECTSIM — Laboratorio Analítico
Tabs: Nowcasting Avanzado · Índices Politeia · Briefing IA · Modelos Causales · Validación
Integra las herramientas de análisis más avanzadas:
  - CausalPy: Difference-in-Differences, Synthetic Control, ITS
  - Bayesian inference (BDA, PyMC)
  - Índices compuestos Politeia
  - Briefing generativo con Claude
  - Validación de modelos
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
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED,
    COLORES_PARTIDOS, kpi_card, section_header,
)
import dashboard.db as _db

st.set_page_config(page_title="Laboratorio — ElectSim", page_icon="🔬", layout="wide")
sidebar_nav()
mostrar_alertas_pagina("laboratorio")

st.markdown(f"""
<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.2rem">
  <div style="width:40px;height:40px;background:linear-gradient(135deg,{PURPLE},{CYAN});
              border-radius:10px;display:flex;align-items:center;justify-content:center;
              font-size:1.4rem;flex-shrink:0">🔬</div>
  <div>
    <h2 style="margin:0;color:{TEXT};font-size:1.5rem;font-weight:900">Laboratorio Analítico</h2>
    <div style="color:{TEXT2};font-size:.82rem">Modelos avanzados · Causalidad · Briefing IA · Validación</div>
  </div>
</div>
""", unsafe_allow_html=True)

tab_nc, tab_indices, tab_briefing, tab_causal, tab_val = st.tabs([
    "📡 Nowcasting Avanzado",
    "🧮 Índices Politeia",
    "📄 Briefing Diario IA",
    "⚗️ Modelos Causales",
    "✅ Validación",
])

# ═══════════════════════════════════════════════════════════════════════════════
with tab_nc:
    try:
        conn = _db.get_conn()
    except Exception:
        conn = None
    try:
        from dashboard.components.nowcasting import render_nowcasting
        render_nowcasting(conn)
    except Exception:
        section_header("NOWCASTING ELECTORAL AVANZADO", CYAN)
        st.page_link("pages/17_Nowcasting_Component.py", label="→ Nowcasting Avanzado (v1)")
        st.page_link("pages/2_Nowcasting.py", label="→ Nowcasting básico (v1)")

        # Proyecciones demo con statsforecast
        section_header("PROYECCIONES STATSFORECAST", PURPLE)
        from dashboard.services.forecast_service import disponible as _fc_disp
        fc_caps = _fc_disp()

        def _fc_row(k, v):
            c = GREEN if v else RED
            txt = "✅ Disponible" if v else "❌ No instalado"
            return (f'<div style="display:flex;justify-content:space-between;padding:.3rem 0;'
                    f'border-bottom:1px solid {BORDER}"><span style="font-size:.8rem;color:{TEXT2}">{k}</span>'
                    f'<span style="color:{c};font-size:.8rem">{txt}</span></div>')
        fc_rows_html = "".join(_fc_row(k, v) for k, v in fc_caps.items())
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.2rem">'
            f'<div style="font-size:.9rem;font-weight:700;color:{TEXT};margin-bottom:.8rem">'
            f'Capacidades de proyección disponibles</div>{fc_rows_html}</div>',
            unsafe_allow_html=True,
        )

        if fc_caps.get("statsforecast"):
            st.markdown(f"""
            <div style="background:{GREEN}12;border:1px solid {GREEN}33;border-radius:8px;
                        padding:.8rem;font-size:.82rem;color:{GREEN};margin-top:.8rem">
              ✅ statsforecast disponible — Modelos: AutoARIMA · ETS · Theta · CES
            </div>
            """, unsafe_allow_html=True)
        else:
            st.code("pip install statsforecast", language="bash")


with tab_indices:
    try:
        from dashboard.components.indices_politeia import render_indices
        render_indices()
    except Exception:
        section_header("ÍNDICES POLITEIA", AMBER)
        st.page_link("pages/9_Indices_Politeia.py", label="→ Índices Politeia (v1)")

        # Demo índices
        _indices_demo = {
            "Índice de Polarización": (68.4, RED, "Alto"),
            "Índice de Gobernabilidad": (41.2, AMBER, "Medio"),
            "Índice de Credibilidad": (52.8, AMBER, "Medio"),
            "Cohesión Social": (58.3, AMBER, "Medio"),
            "Índice Electoral": (72.1, GREEN, "Alto"),
        }

        cols_ind = st.columns(3)
        for i, (nombre, (valor, color, nivel)) in enumerate(_indices_demo.items()):
            with cols_ind[i % 3]:
                st.markdown(kpi_card(nombre, f"{valor:.1f}", f"Nivel: {nivel}", color=color),
                            unsafe_allow_html=True)
                st.markdown("<br>", unsafe_allow_html=True)


with tab_briefing:
    section_header("BRIEFING DIARIO GENERADO POR IA", CYAN)

    # Prioridad: Ollama local (politeia-brain) > Claude API
    try:
        from dashboard.services import llm_local as _brain_lab
        _LLM_OK = _brain_lab.esta_disponible()
        _BRAIN_MODELO = _brain_lab.modelo_principal() if _LLM_OK else ""
    except Exception:
        _brain_lab = None  # type: ignore
        _LLM_OK = False
        _BRAIN_MODELO = ""

    # Fallback a narrativas (Claude API)
    if not _LLM_OK:
        try:
            from dashboard.services import llm_narrativas as _llm_narr
            _LLM_OK = _llm_narr.llm_disponible()
            _BRAIN_MODELO = "Claude API"
        except Exception:
            pass

    today_str = pd.Timestamp.today().strftime("%d de %B de %Y")

    # Indicador del modelo activo
    if _LLM_OK:
        st.markdown(f"""
        <div style="background:{GREEN}11;border:1px solid {GREEN}33;border-radius:8px;
                    padding:.5rem 1rem;margin-bottom:.8rem;font-size:.78rem;color:{GREEN}">
          🧠 Modelo activo: <strong>{_BRAIN_MODELO}</strong> — sin coste de API
        </div>
        """, unsafe_allow_html=True)

    if not _LLM_OK:
        st.warning("Activa Ollama (`ollama serve`) o configura ANTHROPIC_API_KEY para el briefing.")
        st.page_link("pages/13_Briefing_Diario.py", label="→ Briefing Diario (v1)")
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {CYAN}33;border-radius:12px;
                    padding:1.5rem;border-left:4px solid {CYAN}">
          <div style="font-size:.6rem;color:{CYAN};font-weight:700;letter-spacing:.15em;
                       text-transform:uppercase;margin-bottom:.6rem">
            BRIEFING DEMO — {today_str.upper()}
          </div>
          <h3 style="color:{TEXT};margin:.5rem 0">Análisis Electoral Semanal</h3>
          <div style="font-size:.85rem;color:{TEXT2};line-height:1.7">
            <p><strong>Escenario general:</strong> El panorama electoral español continúa
            marcado por la fragmentación parlamentaria y la necesidad de coaliciones complejas
            para alcanzar la mayoría absoluta de 176 escaños.</p>
            <p><strong>Tendencias:</strong> El PP mantiene su ventaja en intención de voto,
            aunque sin capacidad para gobernar en solitario. El PSOE consolida su posición
            como segunda fuerza gracias al apoyo de socios de gobierno.</p>
            <p><strong>Vectores de riesgo:</strong> La situación en Cataluña, la negociación
            de los presupuestos y la evolución del desempleo son los factores con mayor
            potencial de impacto en la correlación de fuerzas.</p>
          </div>
        </div>
        """, unsafe_allow_html=True)
    else:
        col_bf1, col_bf2 = st.columns(2)
        with col_bf1:
            if st.button("🤖 Generar briefing del día", type="primary", key="btn_briefing"):
                _bk = f"briefing_{today_str}"
                with st.spinner(f"🧠 {_BRAIN_MODELO} generando briefing para {today_str}..."):
                    prompt = (
                        f"Genera un briefing ejecutivo del panorama político español para {today_str}. "
                        "Incluye: 1) Estado del escenario electoral, 2) Principales vectores de riesgo, "
                        "3) Tendencias en medios, 4) Calendario clave próximo. "
                        "Formato: ejecutivo, estructurado con headers markdown, máximo 400 palabras."
                    )
                    if _brain_lab:
                        resp = _brain_lab.chat(prompt)
                    else:
                        resp = _llm_narr._llamar(prompt, max_tokens=600)
                    st.session_state[_bk] = resp
        with col_bf2:
            if st.button("📰 Briefing desde noticias reales", key="btn_briefing_news"):
                _bk2 = f"briefing_news_{today_str}"
                with st.spinner("Cargando noticias y generando briefing..."):
                    try:
                        from dashboard.services.news_crawler import cargar_noticias
                        news = cargar_noticias(max_noticias=20)
                        resp2 = _brain_lab.resumir_noticias(news) if _brain_lab else ""
                        st.session_state[_bk2] = resp2
                    except Exception as e:
                        st.session_state[_bk2] = f"Error: {e}"

        briefing = st.session_state.get(f"briefing_{today_str}", "") or st.session_state.get(f"briefing_news_{today_str}", "")
        if briefing:
            st.markdown(f"""
<div style="background:{BG2};border:1px solid {CYAN}33;border-radius:12px;
            padding:1.5rem;border-left:4px solid {CYAN}">
  <div style="font-size:.6rem;color:{CYAN};font-weight:700;letter-spacing:.15em;
               text-transform:uppercase;margin-bottom:.6rem">
    BRIEFING — {today_str.upper()} · {_BRAIN_MODELO.upper()}
  </div>
""", unsafe_allow_html=True)
            st.markdown(briefing)
            st.markdown("</div>", unsafe_allow_html=True)
        else:
            st.info("Pulsa los botones de arriba para generar un briefing.")


with tab_causal:
    section_header("MODELOS DE INFERENCIA CAUSAL", PURPLE)

    try:
        import causalpy  # type: ignore
        _CAUSAL_OK = True
    except ImportError:
        _CAUSAL_OK = False

    if not _CAUSAL_OK:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-radius:12px;padding:1.5rem">
          <div style="font-size:1rem;font-weight:700;color:{TEXT};margin-bottom:.8rem">
            Modelos de Inferencia Causal — CausalPy (PyMC-Labs)
          </div>
          <div style="font-size:.85rem;color:{TEXT2};line-height:1.6">
            CausalPy proporciona estimadores quasi-experimentales con cuantificación bayesiana
            de incertidumbre para analizar el impacto de eventos políticos.
          </div>
          <div style="margin-top:1rem">
            <div style="font-size:.75rem;color:{MUTED};font-weight:700;text-transform:uppercase;margin-bottom:.5rem">
              Diseños disponibles:
            </div>
            <ul style="color:{TEXT2};font-size:.82rem;line-height:1.8">
              <li><strong>Interrupted Time Series (ITS)</strong> — impacto de cambios de legislación en encuestas</li>
              <li><strong>Difference-in-Differences (DiD)</strong> — comparar regiones con/sin medidas políticas</li>
              <li><strong>Synthetic Control</strong> — counterfactual de España vs. países europeos</li>
              <li><strong>Regression Discontinuity (RD)</strong> — umbrales electorales y efectos de barrera</li>
            </ul>
          </div>
        </div>
        """, unsafe_allow_html=True)
        st.code("pip install causalpy", language="bash")

        # Demo ITS conceptual
        section_header("EJEMPLO: ITS — IMPACTO DE UN EVENTO POLÍTICO", AMBER)
        np.random.seed(42)
        _dates_its = pd.date_range("2024-01", periods=24, freq="ME")
        _pre = 32 + np.random.randn(12) * 0.8
        _post = 29.5 + np.random.randn(12) * 0.9
        _vals = np.concatenate([_pre, _post])
        _evento = _dates_its[12]

        fig_its = go.Figure()
        fig_its.add_vrect(
            x0=_evento, x1=_dates_its[-1],
            fillcolor=AMBER + "18", line_width=0,
            annotation_text="Post-evento", annotation_position="top right",
            annotation_font_color=AMBER,
        )
        fig_its.add_vline(x=_evento, line_dash="dash", line_color=AMBER)
        fig_its.add_trace(go.Scatter(
            x=_dates_its, y=_vals, mode="lines+markers",
            line=dict(color=CYAN, width=2.5),
            marker=dict(size=6),
            name="Intención de voto (%)",
            hovertemplate="%{x|%b %Y}<br>%{y:.1f}%<extra></extra>",
        ))
        # Counterfactual
        trend_pre = np.polyfit(range(12), _pre, 1)
        counterfactual = np.polyval(trend_pre, range(12, 24))
        fig_its.add_trace(go.Scatter(
            x=_dates_its[12:], y=counterfactual,
            mode="lines", name="Contrafactual (sin evento)",
            line=dict(color=MUTED, width=2, dash="dot"),
        ))
        fig_its.update_layout(
            height=280, paper_bgcolor=BG2, plot_bgcolor=BG2,
            margin=dict(t=10, b=10, l=10, r=10),
            xaxis=dict(color=TEXT2, gridcolor=BORDER),
            yaxis=dict(color=TEXT2, gridcolor=BORDER, title="Intención voto (%)", ticksuffix="%"),
            legend=dict(orientation="h", x=0.5, xanchor="center", y=-0.25,
                        font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)"),
            hovermode="x unified",
        )
        st.plotly_chart(fig_its, use_container_width=True, config={"displayModeBar": False})
        st.caption("Demo conceptual de ITS — instala CausalPy para análisis Bayesiano completo")
    else:
        # CausalPy disponible
        st.success("CausalPy disponible — usa los modelos causales con datos reales")


with tab_val:
    try:
        from pages._7_Validacion import render_validacion  # type: ignore
        render_validacion()
    except Exception:
        section_header("VALIDACIÓN DE MODELOS PREDICTIVOS", GREEN)
        st.page_link("pages/7_Validacion.py", label="→ Validación (v1)")
        st.page_link("pages/6_Riesgo.py", label="→ Riesgo Político (v1)")

        # Métricas demo de validación
        section_header("MÉTRICAS DE CALIDAD DEL MODELO", CYAN)
        _metrics_val = {
            "MAE encuestas": ("1.8pp", "< 2.5pp = bueno", GREEN),
            "RMSE nowcasting": ("2.3pp", "< 3pp = aceptable", AMBER),
            "Calibración IC 95%": ("91%", "objetivo: 95%", AMBER),
            "Sesgo sistemático": ("-0.3pp", "< ±1pp = ok", GREEN),
        }
        cols_val = st.columns(2)
        for i, (label, (val, ref, color)) in enumerate(_metrics_val.items()):
            with cols_val[i % 2]:
                st.markdown(kpi_card(label, val, ref, color=color), unsafe_allow_html=True)
                st.markdown("<br>", unsafe_allow_html=True)
