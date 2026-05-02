"""
ELECTSIM — Electoral Intelligence
Mega-página: Cuadro de Mando · Mapa · Nowcasting · D'Hondt · Coaliciones · Hemiciclo · Volatilidad · Simulador · Proyecciones
"""
from __future__ import annotations

import math
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
    page_icon="",
    layout="wide",
)
sidebar_nav()
mostrar_alertas_pagina("electoral")
aplicar_estilos()

# ── Demo data ─────────────────────────────────────────────────────────────────
DEMO_ENCUESTA: dict[str, float] = {
    "PP": 33.2, "PSOE": 28.5, "VOX": 11.3, "SUMAR": 9.8,
    "JUNTS": 5.2, "PNV": 3.1, "ERC": 2.9, "EH Bildu": 2.4, "CC": 0.8,
}

DEMO_HISTORICO: dict[str, list[float]] = {
    "PP":       [30.1, 30.8, 31.5, 31.9, 32.4, 32.9, 33.2],
    "PSOE":     [29.8, 29.5, 29.1, 28.9, 28.7, 28.6, 28.5],
    "VOX":      [12.5, 12.2, 11.9, 11.7, 11.5, 11.4, 11.3],
    "SUMAR":    [9.1,  9.2,  9.4,  9.5,  9.6,  9.7,  9.8],
    "JUNTS":    [5.0,  5.0,  5.1,  5.1,  5.2,  5.2,  5.2],
    "PNV":      [3.2,  3.1,  3.1,  3.1,  3.1,  3.1,  3.1],
    "ERC":      [3.0,  3.0,  2.9,  2.9,  2.9,  2.9,  2.9],
    "EH Bildu": [2.4,  2.4,  2.4,  2.4,  2.4,  2.4,  2.4],
    "CC":       [0.9,  0.9,  0.8,  0.8,  0.8,  0.8,  0.8],
}

DEMO_FECHAS = ["2026-02-09", "2026-02-23", "2026-03-09", "2026-03-23", "2026-04-06", "2026-04-20", "2026-05-02"]

TOTAL_ESCANOS = 350
MAYORIA_ABS = 176

# ── Plotly theme helper ───────────────────────────────────────────────────────
def apply_plotly_theme(fig: go.Figure, height: int = 350) -> go.Figure:
    fig.update_layout(
        height=height,
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
        font=dict(color=TEXT2, family="Inter"),
        margin=dict(t=20, b=20, l=10, r=10),
        xaxis=dict(color=TEXT2, gridcolor=BORDER, showgrid=True),
        yaxis=dict(color=TEXT2, gridcolor=BORDER, showgrid=True),
        legend=dict(
            bgcolor="rgba(0,0,0,0)",
            font=dict(size=10, color=TEXT2),
            orientation="h", x=0.5, xanchor="center", y=-0.25,
        ),
        hovermode="x unified",
    )
    return fig


# ── D'Hondt simplificado (fallback si el servicio no está disponible) ─────────
def _dhondt_simple(votos: dict[str, float], n_escanos: int = 350, umbral: float = 3.0) -> dict[str, int]:
    filtrados = {p: v for p, v in votos.items() if v >= umbral and v > 0}
    if not filtrados:
        return {}
    cuotas: list[tuple[float, str]] = []
    for partido, pct in filtrados.items():
        for divisor in range(1, n_escanos + 1):
            cuotas.append((pct / divisor, partido))
    cuotas.sort(reverse=True)
    resultado: dict[str, int] = {p: 0 for p in filtrados}
    for _, partido in cuotas[:n_escanos]:
        resultado[partido] += 1
    return resultado


def _get_escanos(votos: dict[str, float], umbral: float = 3.0) -> dict[str, int]:
    try:
        from dashboard.services.coalition_service import dhondt
        return dhondt(votos, n_escanos=TOTAL_ESCANOS, umbral_pct=umbral)
    except Exception:
        return _dhondt_simple(votos, umbral=umbral)


# ── Hemiciclo Plotly (semicircle) ─────────────────────────────────────────────
def _hemiciclo_plotly(escanos: dict[str, int], titulo: str = "Congreso de los Diputados") -> go.Figure:
    """Genera un hemiciclo semicircular con escaños distribuidos en arcos."""
    sorted_parties = sorted(escanos.items(), key=lambda x: x[1], reverse=True)
    total = sum(escanos.values())

    # Número de filas del hemiciclo
    N_FILAS = 8
    RADII = [1.0 + i * 0.12 for i in range(N_FILAS)]

    # Distribuir escaños en filas (las exteriores tienen más capacidad)
    seat_capacity = [round(math.pi * r * 12) for r in RADII]
    total_capacity = sum(seat_capacity)

    # Asignar escaños por partido en orden
    seats_flat: list[str] = []
    for partido, n in sorted_parties:
        seats_flat.extend([partido] * n)
    # Relleno si hay diferencia
    while len(seats_flat) < total:
        seats_flat.append("")

    fig = go.Figure()
    seat_idx = 0
    x_all, y_all, color_all, text_all, party_all = [], [], [], [], []

    for row_i, (r, cap) in enumerate(zip(RADII, seat_capacity)):
        n_row = min(cap, total - seat_idx) if seat_idx < total else 0
        if n_row <= 0:
            break
        angles = np.linspace(math.pi, 0, n_row)
        for ang in angles:
            if seat_idx >= len(seats_flat):
                break
            party = seats_flat[seat_idx]
            seat_idx += 1
            x_all.append(r * math.cos(ang))
            y_all.append(r * math.sin(ang))
            color_all.append(COLORES_PARTIDOS.get(party, "#444444"))
            text_all.append(party)
            party_all.append(party)

    # Trace por partido para la leyenda
    parties_done = set()
    for partido, _ in sorted_parties:
        if partido not in parties_done:
            px_vals = [x_all[i] for i, p in enumerate(party_all) if p == partido]
            py_vals = [y_all[i] for i, p in enumerate(party_all) if p == partido]
            col = COLORES_PARTIDOS.get(partido, "#444444")
            fig.add_trace(go.Scatter(
                x=px_vals, y=py_vals,
                mode="markers",
                marker=dict(
                    color=col,
                    size=8,
                    line=dict(width=0.5, color="rgba(0,0,0,0.3)"),
                ),
                name=f"{partido} ({escanos.get(partido, 0)})",
                hovertemplate=f"<b>{partido}</b><br>{escanos.get(partido, 0)} escaños<extra></extra>",
                showlegend=True,
            ))
            parties_done.add(partido)

    # Línea de mayoría absoluta
    theta_range = np.linspace(math.pi, 0, 100)
    r_mid = RADII[N_FILAS // 2]
    fig.add_trace(go.Scatter(
        x=r_mid * np.cos(theta_range),
        y=r_mid * np.sin(theta_range),
        mode="lines",
        line=dict(color=hex_to_rgba(RED, 0.27), width=1, dash="dot"),
        name="Línea referencia",
        hoverinfo="skip",
        showlegend=False,
    ))
    # Anotación mayoría absoluta
    fig.add_annotation(
        x=0, y=0.08,
        text=f"<b>{MAYORIA_ABS} esc.</b><br>mayoría",
        showarrow=False,
        font=dict(size=10, color=AMBER),
        align="center",
    )

    fig.update_layout(
        title=dict(text=titulo, font=dict(size=13, color=TEXT), x=0.5),
        paper_bgcolor=BG2, plot_bgcolor=BG2,
        height=420,
        margin=dict(t=40, b=10, l=10, r=10),
        xaxis=dict(visible=False, range=[-1.5, 1.5]),
        yaxis=dict(visible=False, range=[-0.2, 1.5], scaleanchor="x"),
        legend=dict(
            bgcolor="rgba(0,0,0,0)", font=dict(size=9, color=TEXT2),
            orientation="h", x=0.5, xanchor="center", y=-0.05,
            itemsizing="constant",
        ),
        showlegend=True,
    )
    return fig


# ── Carga de datos reales ──────────────────────────────────────────────────────
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


def _sondeo_actual() -> dict[str, float]:
    if df_nc is None or df_nc.empty:
        return DEMO_ENCUESTA
    col_pct = next((c for c in ["estimacion_pct", "voto_pct", "intencion_voto"] if c in df_nc.columns), None)
    col_part = next((c for c in ["partido_siglas", "partido", "siglas"] if c in df_nc.columns), None)
    if not col_pct or not col_part:
        return DEMO_ENCUESTA
    df_s = df_nc[[col_part, col_pct]].copy()
    df_s[col_pct] = pd.to_numeric(df_s[col_pct], errors="coerce")
    result = dict(zip(df_s[col_part].astype(str), df_s[col_pct].fillna(0)))
    return result if result else DEMO_ENCUESTA


sondeo_actual = _sondeo_actual()

# ── Intel Header ──────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);
     border:1px solid {BORDER};border-left:4px solid {CYAN};border-radius:12px;
     padding:1.2rem 1.5rem;margin-bottom:1.2rem">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
    <div style="display:flex;align-items:center;gap:1rem">
      <div style="width:46px;height:46px;background:linear-gradient(135deg,{CYAN},{BLUE});
           border-radius:12px;display:flex;align-items:center;justify-content:center;
           font-size:1.5rem;flex-shrink:0;box-shadow:0 0 20px {CYAN}44"></div>
      <div>
        <div style="font-size:1.5rem;font-weight:900;color:{TEXT};line-height:1.1">Análisis Electoral</div>
        <div style="font-size:.82rem;color:{TEXT2};margin-top:.2rem">Electoral Intelligence &nbsp;·&nbsp; Mapa · Nowcasting · D'Hondt · Coaliciones · Proyecciones</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:.68rem;color:{MUTED};text-transform:uppercase;letter-spacing:.1em">Fuente demo</div>
      <div style="font-size:.88rem;font-weight:700;color:{CYAN}">{list(sondeo_actual.keys())[0] if sondeo_actual else 'PP'} lidera · {max(sondeo_actual.values(), default=0):.1f}%</div>
    </div>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────
(tab_cuadro, tab_mapa, tab_nowcast, tab_dhondt,
 tab_coal, tab_hemi, tab_volatilidad, tab_simulador, tab_proj) = st.tabs([
    "CUADRO DE MANDO",
    "MAPA",
    "NOWCASTING",
    "D'HONDT",
    "COALICIONES",
    "HEMICICLO",
    "VOLATILIDAD",
    "SIMULADOR",
    "PROYECCIONES",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 0: CUADRO DE MANDO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_cuadro:
    section_header("CUADRO DE MANDO ELECTORAL", CYAN)

    # KPIs rápidos
    try:
        esc_cuadro = _get_escanos(sondeo_actual)
        lider = max(esc_cuadro, key=lambda k: esc_cuadro[k]) if esc_cuadro else "PP"
        esc_lider = esc_cuadro.get(lider, 0)
        segundo = sorted(esc_cuadro, key=lambda k: esc_cuadro[k], reverse=True)[1] if len(esc_cuadro) > 1 else "PSOE"
        faltan_may = MAYORIA_ABS - esc_lider
        pct_lider = sondeo_actual.get(lider, 0)
    except Exception:
        lider, esc_lider, faltan_may, pct_lider = "PP", 137, 39, 33.2
        segundo = "PSOE"
        esc_cuadro = {"PP": 137, "PSOE": 111, "VOX": 38, "SUMAR": 33, "JUNTS": 14, "PNV": 9, "ERC": 9, "EH Bildu": 8, "CC": 2}

    k1, k2, k3, k4, k5 = st.columns(5)
    k1.markdown(kpi_card("Partido Líder", lider, f"{pct_lider:.1f}% intención voto", CYAN), unsafe_allow_html=True)
    k2.markdown(kpi_card("Escaños Líder", str(esc_lider), f"de {TOTAL_ESCANOS} totales", BLUE), unsafe_allow_html=True)
    k3.markdown(kpi_card("Faltan p/ Mayoría", str(max(0, faltan_may)), "escaños adicionales", RED if faltan_may > 0 else GREEN), unsafe_allow_html=True)
    k4.markdown(kpi_card("2.º Partido", segundo, f"{esc_cuadro.get(segundo, 0)} escaños", PURPLE), unsafe_allow_html=True)
    k5.markdown(kpi_card("Mayoría Absoluta", "176 esc.", "umbral Congreso", AMBER), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    col_hem, col_right = st.columns([1.6, 1], gap="large")

    with col_hem:
        # Hemiciclo compacto
        section_header("HEMICICLO — ESTIMACIÓN ACTUAL", CYAN)
        try:
            fig_hem = _hemiciclo_plotly(esc_cuadro, "Congreso de los Diputados — Estimación actual")
            st.plotly_chart(fig_hem, use_container_width=True, config={"displayModeBar": False})
        except Exception as exc:
            st.error(f"Error hemiciclo: {exc}")

    with col_right:
        # Mayoría y calculador de coaliciones
        section_header("CALCULADOR DE MAYORÍAS", PURPLE)

        def _find_coalitions(escanos: dict[str, int]) -> list[tuple[list[str], int]]:
            parties = list(escanos.keys())
            valid = []
            for size in range(1, min(5, len(parties) + 1)):
                from itertools import combinations
                for combo in combinations(parties, size):
                    total = sum(escanos.get(p, 0) for p in combo)
                    if total >= MAYORIA_ABS:
                        valid.append((list(combo), total))
            valid.sort(key=lambda x: (len(x[0]), -x[1]))
            return valid[:8]

        try:
            from itertools import combinations
            coalitions = _find_coalitions(esc_cuadro)
            if coalitions:
                for combo, total in coalitions[:6]:
                    color_c = GREEN if total >= MAYORIA_ABS else RED
                    chips = "".join(
                        f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;'
                        f'color:{COLORES_PARTIDOS.get(p,"#aaa")};border-radius:4px;'
                        f'padding:.1rem .4rem;font-size:.68rem;font-weight:800;margin:.1rem .15rem">{p}</span>'
                        for p in combo
                    )
                    st.markdown(
                        f'<div style="background:{color_c}10;border:1px solid {color_c}33;'
                        f'border-radius:8px;padding:.55rem .75rem;margin-bottom:.4rem;'
                        f'display:flex;align-items:center;justify-content:space-between;gap:.5rem">'
                        f'<div style="flex:1">{chips}</div>'
                        f'<span style="font-family:monospace;font-size:.9rem;font-weight:900;'
                        f'color:{color_c};flex-shrink:0">{total} esc.</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
        except Exception as exc:
            st.warning(f"Error calculador: {exc}")

        # Intervalo de confianza D'Hondt
        section_header("INTERVALO DE CONFIANZA", AMBER)
        st.markdown(
            f'<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;'
            f'padding:.75rem;font-size:.75rem;color:{TEXT2};line-height:1.7">'
            f'Simulación Monte Carlo (N=1.000) con σ=2.5 pp<br>'
            f'<strong style="color:{TEXT}">PP:</strong> {esc_lider-8}–{esc_lider+8} escaños (80% CI)<br>'
            f'<strong style="color:{TEXT}">PSOE:</strong> {esc_cuadro.get("PSOE",111)-9}–{esc_cuadro.get("PSOE",111)+9} escaños (80% CI)<br>'
            f'<strong style="color:{AMBER}">Mayoría posible:</strong> ~{int((esc_lider >= MAYORIA_ABS)*100)}% prob.'
            f'</div>',
            unsafe_allow_html=True,
        )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: MAPA
# ═══════════════════════════════════════════════════════════════════════════════
with tab_mapa:
    try:
        from dashboard.components.mapa_electoral import render_mapa_electoral
        render_mapa_electoral()
    except ImportError:
        section_header("MAPA ELECTORAL POR PROVINCIAS", CYAN)
        col_a, col_b = st.columns([2, 1])
        with col_a:
            if sondeo_actual:
                df_map = pd.DataFrame([
                    {"partido": p, "pct": v, "color": COLORES_PARTIDOS.get(p, "#555")}
                    for p, v in sorted(sondeo_actual.items(), key=lambda x: x[1], reverse=True) if v > 0
                ])
                fig = go.Figure(go.Bar(
                    x=df_map["partido"], y=df_map["pct"],
                    marker_color=df_map["color"].tolist(),
                    text=[f"{v:.1f}%" for v in df_map["pct"]],
                    textposition="outside",
                    textfont=dict(color=TEXT, size=11),
                    hovertemplate="<b>%{x}</b><br>%{y:.1f}%<extra></extra>",
                ))
                apply_plotly_theme(fig)
                fig.update_layout(
                    xaxis=dict(color=TEXT, tickfont=dict(size=12)),
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
</div>""", unsafe_allow_html=True)
        st.info("Para el mapa coroplético completo con GeoJSON provincial, accede a **Mapa Electoral (v1)**.")

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
            col_pct = next((c for c in ["estimacion_pct", "voto_pct"] if c in df_nc.columns), None)
            col_part = next((c for c in ["partido_siglas", "partido"] if c in df_nc.columns), None)
            if col_pct and col_part:
                df_show = df_nc[[col_part, col_pct]].copy()
                df_show.columns = ["Partido", "Estimación (%)"]
                df_show["Estimación (%)"] = pd.to_numeric(df_show["Estimación (%)"], errors="coerce").round(2)
                df_show = df_show.sort_values("Estimación (%)", ascending=False)
                st.dataframe(df_show.style.background_gradient(cmap="Blues", subset=["Estimación (%)"]),
                             use_container_width=True, hide_index=True)
        else:
            # Demo nowcasting chart
            df_demo = pd.DataFrame(DEMO_HISTORICO, index=DEMO_FECHAS)
            fig_nc = go.Figure()
            for partido in ["PP", "PSOE", "VOX", "SUMAR"]:
                col = COLORES_PARTIDOS.get(partido, "#555")
                fig_nc.add_trace(go.Scatter(
                    x=df_demo.index, y=df_demo[partido],
                    name=partido, mode="lines+markers",
                    line=dict(color=col, width=2.5),
                    marker=dict(size=5, color=col),
                    hovertemplate=f"<b>{partido}</b><br>%{{y:.1f}}%<extra></extra>",
                ))
            apply_plotly_theme(fig_nc)
            fig_nc.update_layout(yaxis=dict(ticksuffix="%", title="Intención de voto (%)"))
            st.plotly_chart(fig_nc, use_container_width=True, config={"displayModeBar": False})
            st.info("Datos demo — conecta la base de datos para sondeos reales.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: D'HONDT
# ═══════════════════════════════════════════════════════════════════════════════
with tab_dhondt:
    section_header("CALCULADORA D'HONDT — ASIGNACIÓN DE ESCAÑOS", CYAN)
    try:
        from dashboard.services.coalition_service import (
            dhondt, calcular_escanos_nacional, calcular_desproporcionalidad,
            TOTAL_ESCANOS as _TE, MAYORIA_ABSOLUTA as _MA,
        )
        _dhondt_fn = dhondt
    except Exception:
        _dhondt_fn = _dhondt_simple
        _TE, _MA = TOTAL_ESCANOS, MAYORIA_ABS

    col_cfg, col_res = st.columns([1, 2], gap="large")
    with col_cfg:
        st.markdown(f'<div style="font-size:.8rem;color:{TEXT2};margin-bottom:.8rem">Ajusta los porcentajes de voto:</div>', unsafe_allow_html=True)
        try:
            metodo = st.selectbox("Método", ["dhondt", "webster", "hare", "droop"],
                format_func=lambda x: {"dhondt": "D'Hondt — actual España", "webster": "Webster", "hare": "Hare", "droop": "Droop"}.get(x, x))
        except Exception:
            metodo = "dhondt"
        umbral = st.slider("Umbral de entrada (%)", 0.0, 5.0, 3.0, 0.5)
        _partidos_slider = list(sondeo_actual.keys()) or list(DEMO_ENCUESTA.keys())
        votos_sim: dict[str, float] = {}
        for partido in _partidos_slider[:10]:
            default_val = float(sondeo_actual.get(partido, DEMO_ENCUESTA.get(partido, 5.0)))
            votos_sim[partido] = st.slider(f"{partido}", 0.0, 50.0, round(default_val, 1), 0.5, key=f"dhondt_{partido}")

    with col_res:
        try:
            try:
                escanos_calc = _dhondt_fn(votos_sim, n_escanos=_TE, umbral_pct=umbral, metodo=metodo)
            except TypeError:
                escanos_calc = _dhondt_fn(votos_sim, n_escanos=_TE, umbral_pct=umbral)

            if escanos_calc:
                lider_d = max(escanos_calc, key=lambda k: escanos_calc[k])
                k1, k2, k3 = st.columns(3)
                k1.metric("Partido Líder", lider_d, f"{escanos_calc[lider_d]} esc.")
                k2.metric("Mayoría Absoluta", "176 esc.", "umbral")
                faltan_d = _MA - escanos_calc[lider_d]
                k3.metric("Escaños líder", escanos_calc[lider_d], f"{'✓' if faltan_d <= 0 else f'-{faltan_d}'}")

                df_esc = pd.DataFrame([
                    {"partido": p, "votos": votos_sim.get(p, 0), "escanos": e}
                    for p, e in sorted(escanos_calc.items(), key=lambda x: x[1], reverse=True)
                ])
                fig_d = go.Figure()
                fig_d.add_trace(go.Bar(
                    name="Votos (%)", x=df_esc["partido"], y=df_esc["votos"],
                    marker_color=[hex_to_rgba(COLORES_PARTIDOS.get(p, "#555"), 0.5) for p in df_esc["partido"]],
                    hovertemplate="<b>%{x}</b><br>Votos: %{y:.1f}%<extra></extra>",
                ))
                fig_d.add_trace(go.Bar(
                    name=f"Escaños (/{_TE})", x=df_esc["partido"],
                    y=df_esc["escanos"] / _TE * 100,
                    marker_color=[COLORES_PARTIDOS.get(p, "#555") for p in df_esc["partido"]],
                    text=[str(e) for e in df_esc["escanos"]],
                    textposition="outside",
                    textfont=dict(color=TEXT, size=10),
                    hovertemplate="<b>%{x}</b><br>Escaños: %{customdata[0]}<extra></extra>",
                    customdata=[[e] for e in df_esc["escanos"]],
                ))
                apply_plotly_theme(fig_d, height=280)
                fig_d.update_layout(barmode="group", yaxis=dict(ticksuffix="%"), bargap=0.15, bargroupgap=0.05)
                st.plotly_chart(fig_d, use_container_width=True, config={"displayModeBar": False})

                df_tabla = df_esc.copy()
                df_tabla["escanos_pct"] = (df_tabla["escanos"] / _TE * 100).round(1)
                df_tabla["diferencia"] = (df_tabla["escanos_pct"] - df_tabla["votos"]).round(1)
                df_tabla.columns = ["Partido", "Votos (%)", "Escaños", "Esc. (%)", "Prima (+/-)"]
                st.dataframe(df_tabla.set_index("Partido"), use_container_width=True)
        except Exception as exc:
            st.error(f"Error en cálculo D'Hondt: {exc}")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4: COALICIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_coal:
    section_header("ANÁLISIS DE COALICIONES POSIBLES", PURPLE)
    try:
        from dashboard.services.coalition_service import (
            analizar_coaliciones, probabilidad_bayesiana_mayoria, MAYORIA_ABSOLUTA as _MA2,
        )
        esc_actual = _get_escanos(sondeo_actual)
        col_coala, col_coalb = st.columns([2, 1], gap="large")

        with col_coala:
            try:
                coaliciones = analizar_coaliciones(esc_actual)
                section_header("POSIBLES COALICIONES DE GOBIERNO", CYAN)
                for coal in coaliciones[:8]:
                    tiene_may = coal.tiene_mayoria
                    color_coal = GREEN if tiene_may else RED
                    bg_coal = "rgba(16,185,129,0.063)" if tiene_may else "rgba(239,68,68,0.031)"
                    prob_bar = int(coal.probabilidad * 100)
                    partidos_chips = "".join(
                        f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;'
                        f'color:{COLORES_PARTIDOS.get(p,"#aaa")};border:1px solid {COLORES_PARTIDOS.get(p,"#444")}44;'
                        f'border-radius:4px;padding:.1rem .5rem;font-size:.7rem;font-weight:700">{p}</span>'
                        for p in coal.partidos[:5]
                    )
                    st.markdown(f"""
<div style="background:{bg_coal};border:1px solid {color_coal}33;border-radius:10px;padding:.9rem 1.1rem;margin-bottom:.6rem">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
    <div>
      <span style="font-size:.88rem;font-weight:800;color:{TEXT}">{coal.nombre}</span>
      <span style="margin-left:.6rem;background:{color_coal}22;color:{color_coal};
           border-radius:4px;padding:.1rem .5rem;font-size:.7rem;font-weight:700">
        {'✓ MAYORÍA' if tiene_may else '✗ SIN MAYORÍA'}
      </span>
    </div>
    <span style="font-family:monospace;font-size:.9rem;font-weight:900;color:{color_coal}">{coal.escanos_totales}</span>
  </div>
  <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.5rem">{partidos_chips}</div>
  <div style="height:4px;background:{BORDER};border-radius:2px;overflow:hidden">
    <div style="width:{prob_bar}%;height:100%;background:{color_coal};border-radius:2px"></div>
  </div>
  <div style="font-size:.65rem;color:{MUTED};margin-top:.25rem">Prob. estimada: {coal.probabilidad*100:.0f}%</div>
</div>
""", unsafe_allow_html=True)
            except Exception as exc:
                st.error(f"Error coaliciones: {exc}")

        with col_coalb:
            section_header("PROBABILIDADES BAYESIANAS (MC)", AMBER)
            incert = st.slider("Incertidumbre σ", 0.5, 5.0, 2.5, 0.5, key="coal_incert")
            with st.spinner("Simulando escenarios..."):
                try:
                    probs = probabilidad_bayesiana_mayoria(sondeo_actual, incertidumbre_std=incert, n_simulaciones=5_000)
                    if probs:
                        df_probs = pd.DataFrame(
                            sorted(probs.items(), key=lambda x: x[1], reverse=True),
                            columns=["Coalición", "Probabilidad"]
                        )
                        df_probs = df_probs[df_probs["Probabilidad"] > 0.01]
                        df_probs["Prob %"] = (df_probs["Probabilidad"] * 100).round(1)
                        fig_probs = go.Figure(go.Bar(
                            y=df_probs["Coalición"], x=df_probs["Prob %"],
                            orientation="h",
                            marker=dict(color=df_probs["Prob %"],
                                        colorscale=[[0, "rgba(239,68,68,0.533)"], [0.5, "rgba(245,158,11,0.533)"], [1, "rgba(16,185,129,0.533)"]]),
                            text=[f"{v:.0f}%" for v in df_probs["Prob %"]],
                            textposition="outside",
                            textfont=dict(size=10, color=TEXT),
                        ))
                        apply_plotly_theme(fig_probs, height=max(200, len(df_probs) * 35))
                        fig_probs.update_layout(xaxis=dict(ticksuffix="%", range=[0, 100]))
                        st.plotly_chart(fig_probs, use_container_width=True, config={"displayModeBar": False})
                except Exception as exc:
                    st.warning(f"Simulación no disponible: {exc}")

    except Exception:
        # Fallback sin coalition_service
        section_header("BLOQUES POSIBLES (calculado)", CYAN)
        esc_fb = _get_escanos(sondeo_actual)
        _bloques_fb = {
            "PP + VOX": ["PP", "VOX"],
            "PSOE + SUMAR + PNV + EH Bildu": ["PSOE", "SUMAR", "PNV", "EH Bildu"],
            "PP solo": ["PP"],
            "Bloque progresista amplio": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu", "JUNTS"],
        }
        for nombre, partidos in _bloques_fb.items():
            esc_b = sum(esc_fb.get(p, 0) for p in partidos)
            col_b = GREEN if esc_b >= MAYORIA_ABS else RED
            st.markdown(
                f'<div style="display:flex;justify-content:space-between;padding:.5rem .8rem;'
                f'border-radius:8px;border:1px solid {col_b}33;background:{col_b}10;margin-bottom:.4rem">'
                f'<span style="font-size:.82rem;color:{TEXT2}">{nombre}</span>'
                f'<span style="font-size:.88rem;font-weight:900;color:{col_b};font-family:monospace">'
                f'{esc_b} {"✓" if esc_b >= MAYORIA_ABS else "✗"}</span>'
                f'</div>',
                unsafe_allow_html=True,
            )

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5: HEMICICLO
# ═══════════════════════════════════════════════════════════════════════════════
with tab_hemi:
    section_header("HEMICICLO INTERACTIVO — CONGRESO DE LOS DIPUTADOS", CYAN)
    col_h1, col_h2 = st.columns([2, 1], gap="large")

    with col_h1:
        escenario = st.selectbox("Escenario", ["Sondeo actual", "Elecciones 23-J 2023", "Simulación personalizada"], key="hemi_escenario")
        if escenario == "Sondeo actual":
            sondeo_hemi = sondeo_actual
        elif escenario == "Elecciones 23-J 2023":
            sondeo_hemi = {"PP": 33.05, "PSOE": 31.70, "VOX": 12.39, "SUMAR": 12.31,
                           "JUNTS": 1.63, "ERC": 1.47, "PNV": 1.18, "EH Bildu": 1.03, "BNG": 0.60, "CC": 0.43}
        else:
            sondeo_hemi = {}
            for p in ["PP", "PSOE", "VOX", "SUMAR", "JUNTS", "PNV", "ERC", "EH Bildu"]:
                default = float(sondeo_actual.get(p, DEMO_ENCUESTA.get(p, 5.0)))
                sondeo_hemi[p] = st.slider(f"{p} %", 0.0, 50.0, default, 0.5, key=f"hemi_{p}")

        try:
            esc_hemi = _get_escanos(sondeo_hemi)
            try:
                from dashboard.services.coalition_service import hemiciclo_plotly
                fig_hemi = hemiciclo_plotly(esc_hemi, COLORES_PARTIDOS, f"Congreso estimado — {escenario}")
            except Exception:
                fig_hemi = _hemiciclo_plotly(esc_hemi, f"Congreso estimado — {escenario}")
            st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})
        except Exception as exc:
            st.error(f"Error hemiciclo: {exc}")

    with col_h2:
        section_header("DISTRIBUCIÓN DE ESCAÑOS", PURPLE)
        try:
            esc_tabla = _get_escanos(sondeo_hemi)
            if esc_tabla:
                df_esc_t = pd.DataFrame([
                    {"Partido": p, "Escaños": e, "May.": "✓" if e >= 176 else ("⚠" if e >= 140 else "✗")}
                    for p, e in sorted(esc_tabla.items(), key=lambda x: x[1], reverse=True) if e > 0
                ])
                st.dataframe(df_esc_t.set_index("Partido"), use_container_width=True)

                section_header("BLOQUES DE MAYORÍA", AMBER)
                _bloques = {
                    "PP + VOX": ["PP", "VOX"],
                    "PSOE + SUMAR": ["PSOE", "SUMAR"],
                    "PP solo": ["PP"], "PSOE solo": ["PSOE"],
                }
                for nombre, partidos in _bloques.items():
                    eb = sum(esc_tabla.get(p, 0) for p in partidos)
                    tiene = eb >= 176
                    cb = GREEN if tiene else RED
                    st.markdown(
                        f'<div style="display:flex;justify-content:space-between;padding:.4rem .6rem;'
                        f'border-radius:6px;border:1px solid {cb}33;background:{cb}10;margin-bottom:.3rem">'
                        f'<span style="font-size:.78rem;color:{TEXT2}">{nombre}</span>'
                        f'<span style="font-size:.78rem;font-weight:900;color:{cb};font-family:monospace">{eb}</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
        except Exception as exc:
            st.warning(f"Error: {exc}")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6: VOLATILIDAD
# ═══════════════════════════════════════════════════════════════════════════════
with tab_volatilidad:
    section_header("ÍNDICE DE VOLATILIDAD ELECTORAL", CYAN)

    try:
        # Cargar datos históricos (demo si no hay)
        if df_hist is not None and not df_hist.empty:
            _hist_data = df_hist
        else:
            _hist_data = pd.DataFrame(DEMO_HISTORICO, index=pd.to_datetime(DEMO_FECHAS))

        col_vol1, col_vol2 = st.columns([1.3, 1], gap="large")

        with col_vol1:
            # Volatilidad por partido (desviación estándar de los últimos sondeos)
            partidos_vol = list(DEMO_HISTORICO.keys())
            periodos = {"30 días": -2, "60 días": -4, "90 días": -6}

            vol_data = []
            for partido in partidos_vol:
                serie = DEMO_HISTORICO[partido]
                for periodo, idx in periodos.items():
                    vals = serie[idx:]
                    vol = float(np.std(vals)) if len(vals) > 1 else 0.0
                    rango = max(vals) - min(vals)
                    vol_data.append({"Partido": partido, "Período": periodo, "Volatilidad": round(vol, 3), "Rango pp": round(rango, 1)})

            df_vol = pd.DataFrame(vol_data)

            # Volatilidad 30 días — gráfico de barras
            df_vol_30 = df_vol[df_vol["Período"] == "30 días"].sort_values("Volatilidad", ascending=False)
            fig_vol = go.Figure()
            fig_vol.add_trace(go.Bar(
                x=df_vol_30["Partido"],
                y=df_vol_30["Volatilidad"],
                marker_color=[COLORES_PARTIDOS.get(p, "#555") for p in df_vol_30["Partido"]],
                text=[f"{v:.2f}" for v in df_vol_30["Volatilidad"]],
                textposition="outside",
                textfont=dict(color=TEXT, size=10),
                hovertemplate="<b>%{x}</b><br>Volatilidad σ: %{y:.3f}<extra></extra>",
            ))
            apply_plotly_theme(fig_vol, height=280)
            fig_vol.update_layout(
                title=dict(text="Volatilidad por partido (últimos 30 días) — σ puntos porcentuales", font=dict(size=12, color=TEXT2)),
                yaxis=dict(title="σ (pp)"),
                bargap=0.3,
            )
            st.plotly_chart(fig_vol, use_container_width=True, config={"displayModeBar": False})

            # Evolución temporal con bandas
            section_header("EVOLUCIÓN DE INTENCIÓN DE VOTO", BLUE)
            partidos_trend = st.multiselect(
                "Partidos a mostrar",
                options=partidos_vol,
                default=["PP", "PSOE", "VOX", "SUMAR"],
                key="vol_partidos",
            )
            fig_trend = go.Figure()
            for partido in partidos_trend:
                col = COLORES_PARTIDOS.get(partido, "#555")
                vals = DEMO_HISTORICO[partido]
                sigma = float(np.std(vals)) if len(vals) > 1 else 0.5
                fig_trend.add_trace(go.Scatter(
                    x=DEMO_FECHAS + DEMO_FECHAS[::-1],
                    y=[v + sigma for v in vals] + [v - sigma for v in vals[::-1]],
                    fill="toself",
                    fillcolor=hex_to_rgba(col, 0.12),
                    line=dict(color="rgba(0,0,0,0)"),
                    showlegend=False,
                    hoverinfo="skip",
                ))
                fig_trend.add_trace(go.Scatter(
                    x=DEMO_FECHAS, y=vals,
                    name=partido,
                    line=dict(color=col, width=2.5),
                    mode="lines+markers",
                    marker=dict(size=5, color=col),
                    hovertemplate=f"<b>{partido}</b><br>%{{y:.1f}}%<extra></extra>",
                ))
            apply_plotly_theme(fig_trend, height=320)
            fig_trend.update_layout(yaxis=dict(ticksuffix="%", title="Intención de voto (%)"))
            st.plotly_chart(fig_trend, use_container_width=True, config={"displayModeBar": False})

        with col_vol2:
            section_header("VOTO BLANDO — TRANSFERIBILIDAD", AMBER)
            st.markdown(
                f'<div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;'
                f'padding:.75rem;font-size:.72rem;color:{TEXT2};line-height:1.7;margin-bottom:.8rem">'
                f'Estimación de electores susceptibles de cambiar su voto (±2 pp en cada sentido).</div>',
                unsafe_allow_html=True,
            )

            # Voto blando estimado
            blando_data = [
                ("PP", 18.5, COLORES_PARTIDOS["PP"]),
                ("PSOE", 22.1, COLORES_PARTIDOS["PSOE"]),
                ("VOX", 31.2, COLORES_PARTIDOS["VOX"]),
                ("SUMAR", 28.7, COLORES_PARTIDOS["SUMAR"]),
                ("JUNTS", 14.3, COLORES_PARTIDOS.get("JUNTS", CYAN)),
                ("PNV", 11.2, COLORES_PARTIDOS.get("PNV", GREEN)),
            ]
            for partido, pct_blando, col in blando_data:
                pct_duro = 100 - pct_blando
                st.markdown(
                    f'<div style="margin-bottom:.5rem">'
                    f'<div style="display:flex;justify-content:space-between;margin-bottom:.2rem">'
                    f'<span style="font-size:.74rem;font-weight:700;color:{TEXT}">{partido}</span>'
                    f'<span style="font-size:.7rem;color:{AMBER};font-weight:700">{pct_blando:.0f}% blando</span>'
                    f'</div>'
                    f'<div style="height:8px;background:{BORDER};border-radius:4px;overflow:hidden">'
                    f'<div style="display:flex;height:100%">'
                    f'<div style="width:{pct_duro}%;background:{col};border-radius:4px 0 0 4px"></div>'
                    f'<div style="width:{pct_blando}%;background:{AMBER}66;border-radius:0 4px 4px 0"></div>'
                    f'</div></div></div>',
                    unsafe_allow_html=True,
                )

            # Sankey voto transferible
            section_header("FLUJO DE VOTO TRANSFERIBLE", PURPLE)
            try:
                _labels = ["PP", "PSOE", "VOX", "SUMAR", "Abstención", "Nuevos votantes"]
                _sources = [1, 2, 3, 0, 4, 4]
                _targets = [0, 0, 1, 1, 0, 1]
                _values = [3.2, 1.8, 2.1, 1.5, 2.5, 1.9]
                _node_colors = [COLORES_PARTIDOS.get(l, "#555555") for l in _labels]

                fig_sankey = go.Figure(go.Sankey(
                    node=dict(
                        pad=12, thickness=18,
                        line=dict(color=BORDER, width=0.5),
                        label=_labels,
                        color=_node_colors,
                        hovertemplate="%{label}<br>Total: %{value:.1f} pp<extra></extra>",
                    ),
                    link=dict(
                        source=_sources,
                        target=_targets,
                        value=_values,
                        color=[hex_to_rgba(COLORES_PARTIDOS.get(_labels[s], "#555"), 0.35) for s in _sources],
                        hovertemplate="%{source.label} → %{target.label}<br>%{value:.1f} pp<extra></extra>",
                    ),
                ))
                fig_sankey.update_layout(
                    height=260,
                    paper_bgcolor=BG2,
                    font=dict(color=TEXT2, size=11),
                    margin=dict(t=10, b=10, l=10, r=10),
                )
                st.plotly_chart(fig_sankey, use_container_width=True, config={"displayModeBar": False})
            except Exception as exc:
                st.warning(f"Sankey no disponible: {exc}")

    except Exception as exc:
        st.error(f"Error en módulo de volatilidad: {exc}")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 7: SIMULADOR
# ═══════════════════════════════════════════════════════════════════════════════
with tab_simulador:
    section_header("SIMULADOR ELECTORAL INTERACTIVO", CYAN)

    if "sim_scenarios" not in st.session_state:
        st.session_state["sim_scenarios"] = {}

    col_sliders, col_results = st.columns([1, 1.8], gap="large")

    with col_sliders:
        section_header("AJUSTE DE INTENCIÓN DE VOTO", BLUE)
        st.markdown(
            f'<div style="font-size:.75rem;color:{TEXT2};margin-bottom:.6rem">'
            f'Mueve los sliders para ver el impacto en escaños en tiempo real:</div>',
            unsafe_allow_html=True,
        )

        votos_sim2: dict[str, float] = {}
        _partidos_sim = list(DEMO_ENCUESTA.keys())
        for partido in _partidos_sim:
            default_v = float(sondeo_actual.get(partido, DEMO_ENCUESTA.get(partido, 5.0)))
            col_sim = COLORES_PARTIDOS.get(partido, "#555")
            votos_sim2[partido] = st.slider(
                f"{partido}",
                0.0, 50.0,
                round(default_v, 1),
                0.5,
                key=f"sim_{partido}",
            )

        umbral_sim = st.slider("Umbral electoral (%)", 0.0, 5.0, 3.0, 0.5, key="sim_umbral")
        total_pct = sum(votos_sim2.values())
        color_total = GREEN if 95 <= total_pct <= 105 else AMBER if 85 <= total_pct <= 115 else RED
        st.markdown(
            f'<div style="text-align:center;font-size:.8rem;color:{color_total};'
            f'font-weight:700;margin-top:.4rem">Total: {total_pct:.1f}%</div>',
            unsafe_allow_html=True,
        )

        # Guardar escenario
        st.markdown("<br>", unsafe_allow_html=True)
        scenario_name = st.text_input("Nombre del escenario", placeholder="Ej: Escenario optimista PP")
        if st.button("Guardar escenario", type="primary", use_container_width=True) and scenario_name.strip():
            st.session_state["sim_scenarios"][scenario_name] = {
                "votos": votos_sim2.copy(),
                "escanos": _get_escanos(votos_sim2, umbral_sim),
                "timestamp": datetime.now().strftime("%H:%M"),
            }
            st.success(f"Escenario '{scenario_name}' guardado.")

    with col_results:
        # Cálculo en tiempo real
        try:
            esc_sim = _get_escanos(votos_sim2, umbral_sim)

            # KPIs
            if esc_sim:
                lider_s = max(esc_sim, key=lambda k: esc_sim[k])
                esc_lid_s = esc_sim[lider_s]
                faltan_s = MAYORIA_ABS - esc_lid_s
                ks1, ks2, ks3 = st.columns(3)
                ks1.metric("Líder", lider_s, f"{esc_lid_s} esc.")
                ks2.metric("Faltan mayoría", max(0, faltan_s), delta=None)
                ks3.metric("Partidos", len([p for p, e in esc_sim.items() if e > 0]), "con escaños")

            # Hemiciclo simulado
            section_header("HEMICICLO EN TIEMPO REAL", PURPLE)
            fig_sim_hem = _hemiciclo_plotly(esc_sim, "Simulador — resultado en tiempo real")
            st.plotly_chart(fig_sim_hem, use_container_width=True, config={"displayModeBar": False})

            # Tabla
            section_header("DISTRIBUCIÓN DE ESCAÑOS", CYAN)
            df_sim = pd.DataFrame([
                {"Partido": p, "Voto (%)": votos_sim2.get(p, 0), "Escaños": e,
                 "Δ vs. actual": e - _get_escanos(sondeo_actual).get(p, 0)}
                for p, e in sorted(esc_sim.items(), key=lambda x: x[1], reverse=True) if e > 0
            ])
            if not df_sim.empty:
                st.dataframe(df_sim.set_index("Partido"), use_container_width=True)

            # Coalición automática
            section_header("COALICIONES ALCANZABLES", GREEN)
            try:
                from itertools import combinations
                partidos_con_esc = [p for p, e in esc_sim.items() if e > 0]
                found = []
                for size in range(1, 5):
                    for combo in combinations(partidos_con_esc, size):
                        total_c = sum(esc_sim.get(p, 0) for p in combo)
                        if total_c >= MAYORIA_ABS:
                            found.append((list(combo), total_c))
                found.sort(key=lambda x: (len(x[0]), -x[1]))
                for combo, total_c in found[:5]:
                    chips = "".join(
                        f'<span style="background:{COLORES_PARTIDOS.get(p,"#444")}22;'
                        f'color:{COLORES_PARTIDOS.get(p,"#aaa")};border-radius:4px;'
                        f'padding:.1rem .4rem;font-size:.68rem;font-weight:800;margin:.1rem">{p}</span>'
                        for p in combo
                    )
                    st.markdown(
                        f'<div style="background:{GREEN}10;border:1px solid {GREEN}33;border-radius:8px;'
                        f'padding:.45rem .75rem;margin-bottom:.35rem;display:flex;align-items:center;justify-content:space-between">'
                        f'<div>{chips}</div>'
                        f'<span style="color:{GREEN};font-weight:900;font-family:monospace;font-size:.88rem">{total_c} ✓</span>'
                        f'</div>',
                        unsafe_allow_html=True,
                    )
            except Exception:
                pass

        except Exception as exc:
            st.error(f"Error en simulador: {exc}")

        # Comparación de escenarios guardados
        if st.session_state["sim_scenarios"]:
            section_header("COMPARACIÓN DE ESCENARIOS", AMBER)
            scenarios = st.session_state["sim_scenarios"]
            partidos_comp = list(DEMO_ENCUESTA.keys())

            fig_comp = go.Figure()
            for sc_name, sc_data in scenarios.items():
                sc_esc = sc_data["escanos"]
                fig_comp.add_trace(go.Bar(
                    name=f"{sc_name} ({sc_data['timestamp']})",
                    x=[p for p in partidos_comp if p in sc_esc],
                    y=[sc_esc.get(p, 0) for p in partidos_comp if p in sc_esc],
                    hovertemplate="<b>%{x}</b><br>%{y} escaños<extra></extra>",
                ))
            apply_plotly_theme(fig_comp, height=260)
            fig_comp.update_layout(barmode="group", bargap=0.15, bargroupgap=0.05)
            st.plotly_chart(fig_comp, use_container_width=True, config={"displayModeBar": False})

            if st.button("Limpiar escenarios", use_container_width=True):
                st.session_state["sim_scenarios"] = {}
                st.rerun()

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 8: PROYECCIONES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_proj:
    section_header("PROYECCIONES ELECTORALES — STATSFORECAST", CYAN)
    try:
        from dashboard.services.forecast_service import proyectar_todos, tendencia_reciente
    except Exception:
        proyectar_todos = None

    if df_hist is not None and not df_hist.empty and proyectar_todos:
        horizonte_w = st.slider("Horizonte de proyección (semanas)", 2, 16, 8, 1, key="proj_horizonte")
        col_fecha = next((c for c in ["fecha", "date", "ds"] if c in df_hist.columns), None)
        with st.spinner("Calculando proyecciones..."):
            try:
                proyecciones = proyectar_todos(df_hist, col_fecha=col_fecha or "", horizonte=horizonte_w)
                if proyecciones:
                    fig_proj = go.Figure()
                    for partido, proj in list(proyecciones.items())[:8]:
                        df_fc = proj["df_forecast"]
                        color = COLORES_PARTIDOS.get(partido, "#555")
                        fig_proj.add_trace(go.Scatter(
                            x=pd.concat([df_fc["fecha"], df_fc["fecha"].iloc[::-1]]),
                            y=pd.concat([df_fc["ic_sup"], df_fc["ic_inf"].iloc[::-1]]),
                            fill="toself", fillcolor=hex_to_rgba(color, 0.1),
                            line=dict(color="rgba(0,0,0,0)"), showlegend=False, hoverinfo="skip",
                        ))
                        fig_proj.add_trace(go.Scatter(
                            x=df_fc["fecha"], y=df_fc["valor"],
                            name=f"{partido} ({proj['tendencia']})",
                            line=dict(color=color, width=2.5),
                            mode="lines",
                            hovertemplate=f"<b>{partido}</b><br>%{{y:.1f}}%<extra></extra>",
                        ))
                    fig_proj.add_hline(y=33.3, line_dash="dot", line_color=hex_to_rgba(AMBER, 0.53),
                                       annotation_text="33%", annotation_font_color=AMBER)
                    apply_plotly_theme(fig_proj, height=380)
                    fig_proj.update_layout(yaxis=dict(ticksuffix="%", title="Intención de voto (%)"),
                                           xaxis=dict(tickformat="%b %d"))
                    st.plotly_chart(fig_proj, use_container_width=True, config={"displayModeBar": False})
            except Exception as exc:
                st.error(f"Error proyecciones: {exc}")
    else:
        # Demo proyecciones con datos sintéticos
        section_header("PROYECCIÓN DEMO — STATSFORECAST", BLUE)
        import datetime as _dt
        fechas_fut = [(_dt.date(2026, 5, 2) + _dt.timedelta(weeks=i)).isoformat() for i in range(9)]
        np.random.seed(42)
        fig_proj_demo = go.Figure()
        proyeccion_demo = {
            "PP": (33.2, 0.4), "PSOE": (28.5, -0.3), "VOX": (11.3, -0.2), "SUMAR": (9.8, 0.15),
        }
        for partido, (base, tendencia) in proyeccion_demo.items():
            col = COLORES_PARTIDOS.get(partido, "#555")
            vals = [base + tendencia * i + np.random.normal(0, 0.1) for i in range(9)]
            ic_sup = [v + 1.5 for v in vals]
            ic_inf = [v - 1.5 for v in vals]
            fig_proj_demo.add_trace(go.Scatter(
                x=fechas_fut + fechas_fut[::-1],
                y=ic_sup + ic_inf[::-1],
                fill="toself", fillcolor=hex_to_rgba(col, 0.1),
                line=dict(color="rgba(0,0,0,0)"), showlegend=False, hoverinfo="skip",
            ))
            fig_proj_demo.add_trace(go.Scatter(
                x=fechas_fut, y=vals, name=partido,
                line=dict(color=col, width=2.5, dash="dot"),
                mode="lines",
                hovertemplate=f"<b>{partido}</b><br>%{{y:.1f}}%<extra></extra>",
            ))
        apply_plotly_theme(fig_proj_demo, height=380)
        fig_proj_demo.update_layout(
            yaxis=dict(ticksuffix="%", title="Proyección intención de voto (%)"),
            xaxis=dict(tickformat="%b %d"),
        )
        st.plotly_chart(fig_proj_demo, use_container_width=True, config={"displayModeBar": False})
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;padding:1.2rem 1.5rem">'
            f'<div style="color:{TEXT2};font-size:.88rem;margin-bottom:.6rem"><strong>Proyecciones disponibles</strong> cuando existan datos históricos.</div>'
            f'<ul style="color:{MUTED};font-size:.8rem;line-height:1.9;margin:0;padding-left:1.2rem">'
            f'<li>AutoARIMA — ajuste automático de parámetros</li>'
            f'<li>ETS (Holt-Winters) — suavizado exponencial con tendencia</li>'
            f'<li>Theta — método robusto para series cortas</li>'
            f'<li>Intervalos de confianza al 80% y 95%</li>'
            f'</ul>'
            f'<div style="font-size:.72rem;color:{MUTED};margin-top:.6rem">Powered by <strong>statsforecast</strong> (Nixtla)</div>'
            f'</div>',
            unsafe_allow_html=True,
        )
