"""
ELECTSIM ESPAÑA — Página de Inicio
Dashboard ejecutivo: pulso electoral, noticias, sentimiento, estado del sistema.
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime, timezone

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st

from dashboard.shared import (
    sidebar_nav, aplicar_estilos,
    BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    COLORES_PARTIDOS, kpi_card, section_header, safe_float,
)
import dashboard.db as _db

st.set_page_config(
    page_title="ElectSim España",
    page_icon="🗳️",
    layout="wide",
    initial_sidebar_state="expanded",
)
sidebar_nav()

# ── Estado y datos ────────────────────────────────────────────────────────────
@st.cache_data(ttl=300)
def _cargar_datos_inicio():
    try:
        df_nc = _db.cargar_nowcasting()
    except Exception:
        df_nc = pd.DataFrame()
    try:
        df_hist = _db.cargar_sondeos_historicos() if hasattr(_db, "cargar_sondeos_historicos") else pd.DataFrame()
    except Exception:
        df_hist = pd.DataFrame()
    try:
        df_macro = _db.cargar_macro() if hasattr(_db, "cargar_macro") else pd.DataFrame()
    except Exception:
        df_macro = pd.DataFrame()
    return df_nc, df_hist, df_macro

df_nc, df_hist, df_macro = _cargar_datos_inicio()

# ── Cargar noticias ───────────────────────────────────────────────────────────
@st.cache_data(ttl=600)
def _cargar_noticias_inicio():
    try:
        from dashboard.services.news_crawler import cargar_noticias
        return cargar_noticias(max_noticias=18)
    except Exception:
        return []

noticias = _cargar_noticias_inicio()

# ── Header principal ──────────────────────────────────────────────────────────
ahora = datetime.now(tz=timezone.utc)
st.markdown(f"""
<div style="
    background: linear-gradient(135deg, {BG2} 0%, #0A0F1C 50%, {BG3} 100%);
    border: 1px solid {BORDER};
    border-radius: 16px;
    padding: 2rem 2.5rem 1.8rem;
    margin-bottom: 1.5rem;
    position: relative;
    overflow: hidden;
">
  <div style="
      position:absolute; top:0; right:0; width:300px; height:300px;
      background: radial-gradient(circle at 70% 20%, {CYAN}10 0%, transparent 65%);
      pointer-events:none;
  "></div>
  <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem">
    <div>
      <div style="font-size:.6rem; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:{CYAN}; margin-bottom:.4rem">
        SISTEMA ANALÍTICO ELECTORAL
      </div>
      <h1 style="margin:0; font-size:2.2rem; font-weight:900; color:{TEXT}; line-height:1.1;">
        ElectSim <span style="color:{CYAN}">España</span>
      </h1>
      <div style="color:{TEXT2}; font-size:.92rem; margin-top:.5rem">
        Inteligencia electoral en tiempo real · Powered by Anthropic Claude
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:.65rem; color:{MUTED}; font-family:'JetBrains Mono',monospace">
        {ahora.strftime('%d %b %Y — %H:%M UTC')}
      </div>
      <div style="margin-top:.3rem">
        <span style="background:{GREEN}22; color:{GREEN}; border:1px solid {GREEN}44;
               border-radius:20px; padding:.2rem .7rem; font-size:.7rem; font-weight:700">
          ● ACTIVO
        </span>
      </div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── KPIs principales ──────────────────────────────────────────────────────────
def _get_top_partido():
    if df_nc is None or df_nc.empty:
        return "—", 0, "—", 0
    col_pct = next((c for c in ["estimacion_pct", "voto_pct", "intencion_voto"] if c in df_nc.columns), None)
    col_part = next((c for c in ["partido_siglas", "partido", "siglas"] if c in df_nc.columns), None)
    if not col_pct or not col_part:
        return "—", 0, "—", 0
    df_s = df_nc.copy()
    df_s[col_pct] = pd.to_numeric(df_s[col_pct], errors="coerce")
    df_s = df_s.dropna(subset=[col_pct]).sort_values(col_pct, ascending=False)
    if df_s.empty:
        return "—", 0, "—", 0
    p1 = str(df_s.iloc[0][col_part])
    v1 = float(df_s.iloc[0][col_pct])
    p2 = str(df_s.iloc[1][col_part]) if len(df_s) > 1 else "—"
    v2 = float(df_s.iloc[1][col_pct]) if len(df_s) > 1 else 0.0
    return p1, v1, p2, v2

partido1, voto1, partido2, voto2 = _get_top_partido()
escanos_est = 0
try:
    from dashboard.services.coalition_service import dhondt
    if not df_nc.empty:
        col_pct = next((c for c in ["estimacion_pct", "voto_pct"] if c in df_nc.columns), None)
        col_part = next((c for c in ["partido_siglas", "partido"] if c in df_nc.columns), None)
        if col_pct and col_part:
            sondeo = dict(zip(df_nc[col_part].astype(str), pd.to_numeric(df_nc[col_pct], errors="coerce").fillna(0)))
            escanos = dhondt(sondeo)
            escanos_est = escanos.get(partido1, 0)
except Exception:
    pass

col1, col2, col3, col4 = st.columns(4)
with col1:
    color1 = COLORES_PARTIDOS.get(partido1, CYAN)
    st.markdown(kpi_card("Partido Líder", partido1, f"{voto1:.1f}% estimado", color=color1),
                unsafe_allow_html=True)
with col2:
    color2 = COLORES_PARTIDOS.get(partido2, PURPLE)
    st.markdown(kpi_card("Segundo", partido2, f"{voto2:.1f}% estimado", color=color2),
                unsafe_allow_html=True)
with col3:
    diff = voto1 - voto2
    st.markdown(kpi_card("Diferencia", f"{diff:+.1f}pp", "Líder vs. 2º partido", color=AMBER),
                unsafe_allow_html=True)
with col4:
    est_str = f"{escanos_est}" if escanos_est > 0 else "—"
    color_esc = GREEN if escanos_est >= 176 else AMBER if escanos_est >= 140 else RED
    st.markdown(kpi_card("Escaños Líder", est_str, "Estimación D'Hondt", color=color_esc),
                unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# ── Dos columnas: gráfico + noticias ─────────────────────────────────────────
col_left, col_right = st.columns([3, 2], gap="large")

with col_left:
    section_header("PULSO ELECTORAL — TENDENCIAS", CYAN)

    # Gráfico de barras horizontales con nowcasting
    if not df_nc.empty:
        col_pct = next((c for c in ["estimacion_pct", "voto_pct", "intencion_voto"] if c in df_nc.columns), None)
        col_part = next((c for c in ["partido_siglas", "partido", "siglas"] if c in df_nc.columns), None)

        if col_pct and col_part:
            df_plot = df_nc[[col_part, col_pct]].copy()
            df_plot.columns = ["partido", "pct"]
            df_plot["pct"] = pd.to_numeric(df_plot["pct"], errors="coerce")
            df_plot = df_plot.dropna().sort_values("pct", ascending=True).tail(10)
            df_plot["color"] = df_plot["partido"].map(lambda p: COLORES_PARTIDOS.get(p, "#555"))

            fig = go.Figure()
            for _, row in df_plot.iterrows():
                fig.add_trace(go.Bar(
                    y=[row["partido"]],
                    x=[row["pct"]],
                    orientation="h",
                    marker=dict(
                        color=row["color"],
                        line=dict(width=0),
                        pattern_shape="",
                    ),
                    text=[f"{row['pct']:.1f}%"],
                    textposition="outside",
                    textfont=dict(size=11, color=TEXT, family="JetBrains Mono"),
                    name=row["partido"],
                    showlegend=False,
                    hovertemplate=f"<b>{row['partido']}</b><br>{row['pct']:.1f}%<extra></extra>",
                ))

            fig.update_layout(
                height=320,
                margin=dict(t=10, b=10, l=10, r=60),
                paper_bgcolor=BG2,
                plot_bgcolor=BG2,
                xaxis=dict(
                    showgrid=True,
                    gridcolor=BORDER,
                    color=TEXT2,
                    range=[0, max(df_plot["pct"].max() + 5, 40)],
                    ticksuffix="%",
                    tickfont=dict(size=9),
                ),
                yaxis=dict(
                    color=TEXT,
                    tickfont=dict(size=12, family="Inter", color=TEXT),
                    categoryorder="total ascending",
                ),
                bargap=0.3,
            )
            st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        else:
            st.info("Sin datos de nowcasting disponibles")
    else:
        # Demo placeholder
        _demo_partidos = {"PP": 32.1, "PSOE": 28.4, "VOX": 11.2, "SUMAR": 9.8, "JUNTS": 4.2, "PNV": 3.1}
        df_demo = pd.DataFrame(list(_demo_partidos.items()), columns=["partido", "pct"])
        df_demo = df_demo.sort_values("pct")

        fig = go.Figure()
        for _, row in df_demo.iterrows():
            fig.add_trace(go.Bar(
                y=[row["partido"]], x=[row["pct"]], orientation="h",
                marker_color=COLORES_PARTIDOS.get(row["partido"], "#555"),
                text=[f"{row['pct']:.1f}%"], textposition="outside",
                textfont=dict(size=11, color=TEXT),
                showlegend=False,
                hovertemplate=f"<b>{row['partido']}</b><br>{row['pct']:.1f}%<extra></extra>",
            ))
        fig.update_layout(
            height=300, margin=dict(t=5, b=5, l=10, r=50),
            paper_bgcolor=BG2, plot_bgcolor=BG2,
            xaxis=dict(showgrid=True, gridcolor=BORDER, color=TEXT2, ticksuffix="%", range=[0, 40]),
            yaxis=dict(color=TEXT, tickfont=dict(size=12), categoryorder="total ascending"),
            bargap=0.3,
        )
        st.plotly_chart(fig, use_container_width=True, config={"displayModeBar": False})
        st.caption("📊 Datos demo — conecta la base de datos para datos reales")

    # Hemiciclo estimado
    section_header("HEMICICLO ESTIMADO", PURPLE)
    try:
        from dashboard.services.coalition_service import hemiciclo_plotly, dhondt
        if not df_nc.empty and col_pct and col_part:
            sondeo_d = dict(zip(
                df_nc[col_part].astype(str),
                pd.to_numeric(df_nc[col_pct], errors="coerce").fillna(0)
            ))
            esc = dhondt(sondeo_d)
            if esc:
                fig_hemi = hemiciclo_plotly(esc, COLORES_PARTIDOS, "Congreso Estimado")
                st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})
        else:
            _demo_esc = {"PP": 132, "PSOE": 110, "VOX": 38, "SUMAR": 31, "JUNTS": 14, "PNV": 5, "ERC": 7, "EH Bildu": 6, "BNG": 1, "CC": 2}
            fig_hemi = hemiciclo_plotly(_demo_esc, COLORES_PARTIDOS, "Congreso Estimado (Demo)")
            st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})
    except Exception as exc:
        st.caption(f"Hemiciclo no disponible: {exc}")

with col_right:
    section_header("ÚLTIMAS NOTICIAS", AMBER)

    if noticias:
        for n in noticias[:8]:
            titulo = n.get("titulo", "Sin título")[:90]
            medio = n.get("medio", "—")
            tema = n.get("tema", "")
            partidos = n.get("partidos", [])
            url = n.get("url", "#")
            sesgo = n.get("sesgo", "")

            # Color del tema
            tema_colors = {
                "Economía": "#F59E0B", "Vivienda": "#10B981", "Sanidad": "#EF4444",
                "Cataluña": "#8B5CF6", "Seguridad": "#3B82F6", "Educación": "#00D4FF",
                "Migración": "#F97316", "Exterior": "#06B6D4", "Corrupción": "#DC2626",
            }
            tema_color = tema_colors.get(tema, MUTED)

            partidos_html = ""
            if partidos:
                chips = "".join(
                    f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;'
                    f'color:{COLORES_PARTIDOS.get(p,"#aaa")};border:1px solid {COLORES_PARTIDOS.get(p,"#444")}44;'
                    f'border-radius:4px;padding:.05rem .4rem;font-size:.65rem;font-weight:700">{p}</span>'
                    for p in partidos[:3]
                )
                partidos_html = f'<div style="display:flex;gap:.3rem;flex-wrap:wrap;margin-top:.3rem">{chips}</div>'

            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;
                        padding:.75rem 1rem;margin-bottom:.5rem;
                        border-left:3px solid {tema_color};
                        transition:border-color .2s">
              <div style="font-size:.72rem;font-weight:800;color:{TEXT};line-height:1.35;margin-bottom:.25rem">
                <a href="{url}" target="_blank" style="color:{TEXT};text-decoration:none;">{titulo}</a>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:.62rem;color:{MUTED};font-weight:600">{medio}</span>
                <span style="background:{tema_color}20;color:{tema_color};border-radius:4px;
                             padding:.05rem .4rem;font-size:.6rem;font-weight:700">{tema}</span>
              </div>
              {partidos_html}
            </div>
            """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div style="background:{BG2};border:1px dashed {BORDER};border-radius:12px;
                    padding:2rem;text-align:center">
          <div style="font-size:2rem;margin-bottom:.5rem">📰</div>
          <div style="color:{TEXT2};font-size:.85rem">Sin noticias cargadas</div>
          <div style="color:{MUTED};font-size:.75rem;margin-top:.3rem">
            Activa el crawler RSS en Medios & Narrativa
          </div>
        </div>
        """, unsafe_allow_html=True)

    # Sentimiento por partido
    st.markdown("<br>", unsafe_allow_html=True)
    section_header("SENTIMIENTO EN MEDIOS", GREEN)

    if noticias:
        try:
            from dashboard.services.nlp_service import resumen_sentimiento_partidos
            sent_map = resumen_sentimiento_partidos(noticias)
        except Exception:
            sent_map = {}

        if sent_map:
            for partido, stats in list(sent_map.items())[:6]:
                color_p = COLORES_PARTIDOS.get(partido, CYAN)
                pos = stats.get("positivo", 0)
                neg = stats.get("negativo", 0)
                neu = stats.get("neutral", 0)
                total = stats.get("total", 0)
                st.markdown(f"""
                <div style="margin-bottom:.5rem">
                  <div style="display:flex;justify-content:space-between;margin-bottom:.2rem">
                    <span style="font-size:.75rem;font-weight:700;color:{color_p}">{partido}</span>
                    <span style="font-size:.65rem;color:{MUTED}">{total} menciones</span>
                  </div>
                  <div style="height:6px;border-radius:3px;overflow:hidden;display:flex">
                    <div style="width:{pos}%;background:{GREEN};"></div>
                    <div style="width:{neu}%;background:{MUTED}33;"></div>
                    <div style="width:{neg}%;background:{RED};"></div>
                  </div>
                  <div style="display:flex;gap:.8rem;margin-top:.15rem">
                    <span style="font-size:.58rem;color:{GREEN}">+{pos:.0f}%</span>
                    <span style="font-size:.58rem;color:{MUTED}">{neu:.0f}% neu</span>
                    <span style="font-size:.58rem;color:{RED}">{neg:.0f}%−</span>
                  </div>
                </div>
                """, unsafe_allow_html=True)
        else:
            st.caption("Sin datos de sentimiento — cargando noticias...")
    else:
        # Demo sentimiento
        _demo_sent = {
            "PP": {"positivo": 45, "negativo": 30, "neutral": 25, "total": 12},
            "PSOE": {"positivo": 38, "negativo": 42, "neutral": 20, "total": 10},
            "VOX": {"positivo": 25, "negativo": 55, "neutral": 20, "total": 8},
        }
        for partido, stats in _demo_sent.items():
            color_p = COLORES_PARTIDOS.get(partido, CYAN)
            st.markdown(f"""
            <div style="margin-bottom:.5rem">
              <div style="display:flex;justify-content:space-between;margin-bottom:.2rem">
                <span style="font-size:.75rem;font-weight:700;color:{color_p}">{partido}</span>
                <span style="font-size:.65rem;color:{MUTED};font-style:italic">demo</span>
              </div>
              <div style="height:6px;border-radius:3px;overflow:hidden;display:flex">
                <div style="width:{stats['positivo']}%;background:{GREEN}"></div>
                <div style="width:{stats['neutral']}%;background:{MUTED}33"></div>
                <div style="width:{stats['negativo']}%;background:{RED}"></div>
              </div>
            </div>
            """, unsafe_allow_html=True)

# ── Fila inferior: accesos rápidos ───────────────────────────────────────────
st.markdown("<br>", unsafe_allow_html=True)
section_header("ACCESOS RÁPIDOS", CYAN)

_QUICK_LINKS = [
    ("pages/N1_Electoral.py",    "🗳️",  "Electoral",     "Mapas, D'Hondt, nowcasting, coaliciones",   CYAN),
    ("pages/N2_Inteligencia.py", "🧠",  "Inteligencia",  "Agentes IA, perfiles, opposition research",  PURPLE),
    ("pages/N3_Medios.py",       "📰",  "Medios",        "Noticias, NLP, sentimiento, temas BERTopic", AMBER),
    ("pages/N4_Institucional.py","🏛️",  "Institucional", "Congreso, BOE, agenda, legislación",        BLUE),
    ("pages/N5_Campana.py",      "⚔️",  "Campaña",       "War Room, simulador, voto blando",          RED),
    ("pages/N6_Economia.py",     "📈",  "Economía",      "Macro, indicadores, ESG, correlaciones",    GREEN),
    ("pages/N7_Laboratorio.py",  "🔬",  "Laboratorio",   "Modelos causales, Bayesianos, validación",  "#F97316"),
]

cols_ql = st.columns(len(_QUICK_LINKS))
for col, (page, icon, label, desc, color) in zip(cols_ql, _QUICK_LINKS):
    with col:
        page_path = _ROOT / page
        if page_path.exists():
            st.page_link(page, label=f"{icon} **{label}**")
        st.markdown(
            f'<div style="font-size:.65rem;color:{MUTED};margin-top:-.3rem;line-height:1.3">{desc}</div>',
            unsafe_allow_html=True,
        )
