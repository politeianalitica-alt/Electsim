"""
Página: Simulador de Escenarios

Selector de elección, Monte Carlo de Escaños (D'Hondt), Escenarios Morfológicos
y Variables Estructurales.
"""

from __future__ import annotations

import sys
from collections import defaultdict
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import cargar_elecciones, cargar_nowcasting, cargar_macro_ultimo

st.set_page_config(page_title="Escenarios — ElectSim", layout="wide")
sidebar_nav()

# ── Colores de partidos ────────────────────────────────────────────────────────
COLORES_PARTIDO = {
    "PP":       "#009FDB",
    "PSOE":     "#E30613",
    "VOX":      "#63BE21",
    "SUMAR":    "#E4007C",
    "Junts":    "#00AEEF",
    "PNV":      "#007A3D",
    "ERC":      "#F4B20A",
    "EH Bildu": "#A9C55A",
    "BNG":      "#73C6E0",
    "CC":       "#FFCB00",
    "Otros":    "#64748B",
}

BLOQUE_COLOR = {
    "derecha":   RED,
    "izquierda": BLUE,
    "centro":    CYAN,
    "bloqueo":   AMBER,
}
BLOQUE_LABEL = {
    "derecha":   "Bloque Derecha",
    "izquierda": "Bloque Izquierda",
    "centro":    "Centro / Gran Pacto",
    "bloqueo":   "Bloqueo / Repetición",
}

# ── CSS dark tech ──────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(16px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%     {{ opacity:1; transform:scale(1.3); }}
}}

/* ── Section headers ─────────────────────────────────────────── */
.sec-hdr {{
    display:flex; align-items:center; gap:.7rem;
    margin: 1.6rem 0 .9rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{
    font-size:.65rem; font-weight:700;
    letter-spacing:.14em; text-transform:uppercase; color:{MUTED};
}}
.sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}

/* ── Info / warning boxes ─────────────────────────────────────── */
.info-box {{
    background:{BG2}; border:1px solid {BORDER};
    border-left:3px solid {CYAN};
    border-radius:8px; padding:1rem 1.2rem;
    font-size:.88rem; color:{TEXT2}; margin:.6rem 0 1rem;
}}
.warn-box {{
    background:{BG2}; border:1px solid {AMBER}44;
    border-left:3px solid {AMBER};
    border-radius:8px; padding:.8rem 1.1rem;
    font-size:.85rem; color:{TEXT2}; margin:.4rem 0;
}}

/* ── Scenario cards ───────────────────────────────────────────── */
.esc-card {{
    background:{BG2}; border:1px solid {BORDER};
    border-radius:12px; padding:1.3rem 1.4rem;
    animation:fadeInUp .45s ease both;
    transition:box-shadow .2s, border-color .2s;
    height:100%;
}}
.esc-card:hover {{
    box-shadow:0 4px 24px {CYAN}18;
    border-color:{CYAN}33;
}}
.blq-badge {{
    display:inline-block;
    padding:.18rem .65rem;
    border-radius:999px;
    font-size:.66rem;
    font-weight:700;
    letter-spacing:.06em;
}}
.prob-track {{
    background:{BG3}; border-radius:4px;
    height:5px; margin:.5rem 0;
    overflow:hidden;
}}
.prob-fill {{
    height:5px; border-radius:4px;
    transition:width .6s ease;
}}
.cond-item {{
    display:flex; align-items:flex-start; gap:.5rem;
    font-size:.82rem; color:{TEXT2}; margin:.3rem 0;
    line-height:1.45;
}}
.cond-dot {{
    width:5px; height:5px; border-radius:50%;
    background:{CYAN}; flex-shrink:0; margin-top:.45rem;
}}

/* ── KPI pill (stat box) ──────────────────────────────────────── */
.kpi-pill {{
    background:{BG2}; border:1px solid {BORDER};
    border-top:2px solid {CYAN}55;
    border-radius:10px; padding:.9rem 1.1rem;
    text-align:center;
}}
.kpi-pill .val {{
    font-size:1.6rem; font-weight:800;
    font-family:'JetBrains Mono',monospace; color:{TEXT};
}}
.kpi-pill .lbl {{
    font-size:.65rem; font-weight:700; color:{MUTED};
    letter-spacing:.1em; text-transform:uppercase;
    margin-bottom:.25rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:1.8rem;
            overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{CYAN}18,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-30px;left:25%;width:130px;height:130px;
                background:radial-gradient(circle,{BLUE}12,transparent 65%);
                border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{CYAN};
                        animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;
                         text-transform:uppercase;color:{CYAN}">SIMULACIÓN ACTIVA</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;
                    color:{TEXT};line-height:1.1">
            Simulador de <span style="color:{CYAN}">Escenarios Electorales</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Monte Carlo D'Hondt · Escenarios morfológicos · Variables estructurales
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Selector de elección ───────────────────────────────────────────────────────
with st.spinner("Cargando datos..."):
    df_elec = cargar_elecciones("generales")
opciones_elec: dict[str, int | None] = {}
if not df_elec.empty:
    for _, row in df_elec.iterrows():
        etq = row.get("descripcion") or str(row["fecha"])
        opciones_elec[etq] = row["id"]

if not opciones_elec:
    opciones_elec["Próximas elecciones generales (estimado)"] = None

eleccion_sel = st.selectbox(
    "Elección de referencia",
    list(opciones_elec.keys()),
    help="Selecciona la elección sobre la que ejecutar las simulaciones.",
)
eleccion_id = opciones_elec[eleccion_sel]

st.markdown(f'<hr style="border:none;border-top:1px solid {BORDER};margin:1rem 0">',
            unsafe_allow_html=True)

# ── Datos nowcasting ───────────────────────────────────────────────────────────
with st.spinner("Cargando estimaciones..."):
    df_nc = cargar_nowcasting()

ESTIMACIONES_SINTETICAS = {
    "PP": 33.0, "PSOE": 28.5, "VOX": 12.0, "SUMAR": 10.5,
    "Junts": 3.5, "PNV": 2.8, "ERC": 2.5, "EH Bildu": 2.2,
    "CC": 1.0, "Otros": 4.0,
}

if not df_nc.empty:
    estimaciones_base = {
        row["partido_siglas"]: float(row["estimacion_pct"])
        for _, row in df_nc.iterrows()
        if float(row["estimacion_pct"]) >= 1.0
    }
else:
    estimaciones_base = ESTIMACIONES_SINTETICAS.copy()


# ── Funciones D'Hondt ──────────────────────────────────────────────────────────
def dhondt_provincia(votos_pct: dict, escanos: int, umbral: float = 3.0) -> dict:
    elegibles = {p: v for p, v in votos_pct.items() if v >= umbral}
    if not elegibles:
        return {}
    totales = sum(elegibles.values())
    votos_abs = {p: v / totales * 100_000 for p, v in elegibles.items()}
    asignados: dict[str, int] = defaultdict(int)
    for _ in range(escanos):
        cocientes = {p: votos_abs[p] / (asignados[p] + 1) for p in elegibles}
        ganador = max(cocientes, key=cocientes.get)  # type: ignore[arg-type]
        asignados[ganador] += 1
    return dict(asignados)


def monte_carlo_escanos(estimaciones: dict, n_sims: int = 5000, sigma: float = 2.5) -> dict:
    resultados: dict[str, list[int]] = defaultdict(list)
    for _ in range(n_sims):
        muestreado = {}
        for partido, pct in estimaciones.items():
            noise = np.random.normal(0, sigma * (pct / 100) ** 0.5)
            muestreado[partido] = max(0.5, pct + noise)
        total = sum(muestreado.values())
        norm = {p: v / total * 100 for p, v in muestreado.items()}
        escanos = dhondt_provincia(norm, 350, umbral=3.0)
        for partido, n in escanos.items():
            resultados[partido].append(n)
        for partido in estimaciones:
            if partido not in escanos:
                resultados[partido].append(0)
    return dict(resultados)


# ── Tabs ───────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "◉  Monte Carlo de Escaños",
    "◇  Escenarios Morfológicos",
    "≡  Variables Estructurales",
])

# ══════════════════════════════════════════════════════════════════════════════
# TAB 1 — Monte Carlo
# ══════════════════════════════════════════════════════════════════════════════
with tab1:

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{CYAN}"></div>
        <span class="lbl">Estimaciones de Voto Base</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="info-box">
        Ajusta las estimaciones de voto y ejecuta <strong style="color:{CYAN}">5.000 simulaciones</strong>
        con D'Hondt nacional para obtener la distribución de escaños con intervalos de confianza.
    </div>
    """, unsafe_allow_html=True)

    partidos_list = list(estimaciones_base.keys())
    cols_sl = st.columns(min(4, len(partidos_list)))
    estimaciones_ajustadas: dict[str, float] = {}
    for i, partido in enumerate(partidos_list):
        with cols_sl[i % 4]:
            val = st.slider(
                partido, min_value=0.5, max_value=50.0,
                value=float(estimaciones_base[partido]),
                step=0.5, format="%.1f%%",
                key=f"slider_{partido}",
            )
            estimaciones_ajustadas[partido] = val

    total_pct = sum(estimaciones_ajustadas.values())
    if abs(total_pct - 100.0) > 5:
        st.markdown(f"""
        <div class="warn-box">
            ⚠ La suma de estimaciones es <strong style="color:{AMBER}">{total_pct:.1f}%</strong>.
            Se normalizará automáticamente al ejecutar.
        </div>
        """, unsafe_allow_html=True)

    col_run, col_sigma = st.columns([2, 1])
    with col_run:
        ejecutar = st.button(
            "Ejecutar simulación (5.000 iteraciones)",
            type="primary", use_container_width=True,
        )
    with col_sigma:
        sigma_val = st.number_input(
            "Incertidumbre (sigma)", min_value=0.5, max_value=6.0,
            value=2.5, step=0.5,
        )

    if ejecutar:
        with st.spinner("Ejecutando 5.000 simulaciones D'Hondt…"):
            resultados_mc = monte_carlo_escanos(
                estimaciones_ajustadas, n_sims=5000, sigma=float(sigma_val)
            )
        st.session_state["mc_resultados"] = resultados_mc

    if "mc_resultados" in st.session_state:
        resultados_mc = st.session_state["mc_resultados"]
        n_sims_total = 5000

        bloques = {
            "izquierda": ["PSOE", "SUMAR", "ERC", "EH Bildu", "BNG"],
            "derecha":   ["PP", "VOX"],
        }
        escanos_izq_sims, escanos_der_sims = [], []
        for sim_i in range(n_sims_total):
            izq_i = sum(
                resultados_mc.get(p, [0] * n_sims_total)[sim_i]
                for p in bloques["izquierda"]
                if sim_i < len(resultados_mc.get(p, []))
            )
            der_i = sum(
                resultados_mc.get(p, [0] * n_sims_total)[sim_i]
                for p in bloques["derecha"]
                if sim_i < len(resultados_mc.get(p, []))
            )
            escanos_izq_sims.append(izq_i)
            escanos_der_sims.append(der_i)

        pp_e   = resultados_mc.get("PP",   [])
        psoe_e = resultados_mc.get("PSOE", [])
        may_pp   = sum(1 for x in pp_e   if x >= 176) / len(pp_e)   * 100 if pp_e   else 0.0
        may_psoe = sum(1 for x in psoe_e if x >= 176) / len(psoe_e) * 100 if psoe_e else 0.0
        may_izq  = sum(1 for x in escanos_izq_sims if x >= 176) / len(escanos_izq_sims) * 100 if escanos_izq_sims else 0.0
        may_der  = sum(1 for x in escanos_der_sims  if x >= 176) / len(escanos_der_sims)  * 100 if escanos_der_sims  else 0.0

        # KPI row
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:1.4rem">
            <div class="bar" style="background:{GREEN}"></div>
            <span class="lbl">Probabilidades de Mayoría Absoluta</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        k1, k2, k3, k4 = st.columns(4)
        for col, lbl, val, accent in [
            (k1, "PP mayoría abs.",         may_pp,   BLUE),
            (k2, "PSOE mayoría abs.",        may_psoe, RED),
            (k3, "Bloque izquierda >176",    may_izq,  CYAN),
            (k4, "Bloque derecha >176",      may_der,  AMBER),
        ]:
            with col:
                st.markdown(f"""
                <div class="kpi-pill" style="border-top-color:{accent}88">
                    <div class="lbl">{lbl}</div>
                    <div class="val" style="color:{accent}">{val:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)

        # Histogramas
        st.markdown(f"""
        <div class="sec-hdr">
            <div class="bar" style="background:{BLUE}"></div>
            <span class="lbl">Distribución de Escaños por Partido</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        partidos_graf = [p for p in resultados_mc if np.mean(resultados_mc[p]) >= 3]
        partidos_graf_sorted = sorted(
            partidos_graf, key=lambda p: np.mean(resultados_mc[p]), reverse=True
        )
        cols_hist = st.columns(min(3, len(partidos_graf_sorted)))
        for i, partido in enumerate(partidos_graf_sorted[:9]):
            sims  = resultados_mc[partido]
            media = np.mean(sims)
            p5    = np.percentile(sims, 5)
            p95   = np.percentile(sims, 95)
            color = COLORES_PARTIDO.get(partido, CYAN)
            cr, cg, cb = int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16)
            fig_h = go.Figure()
            fig_h.add_trace(go.Histogram(
                x=sims, nbinsx=30,
                marker_color=color, opacity=0.75, name=partido,
            ))
            fig_h.add_vrect(
                x0=p5, x1=p95,
                fillcolor=f"rgba({cr},{cg},{cb},0.12)",
                line_width=0,
                annotation_text="IC 90%",
                annotation_font_color=MUTED,
                annotation_position="top left",
            )
            fig_h.add_vline(
                x=media, line_dash="dash", line_color=CYAN, line_width=1.5,
                annotation_text=f"μ {media:.0f}",
                annotation_font_color=CYAN,
                annotation_position="top right",
            )
            fig_h.update_layout(
                title=dict(
                    text=f"{partido}  [{p5:.0f}–{p95:.0f}]",
                    font=dict(size=12, color=TEXT2),
                ),
                height=250, showlegend=False,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                margin=dict(t=38, b=20, l=30, r=10),
                xaxis=dict(
                    title="Escaños", tickfont=dict(color=MUTED),
                    gridcolor=BORDER,
                ),
                yaxis=dict(
                    title="Frecuencia", tickfont=dict(color=MUTED),
                    gridcolor=BORDER,
                ),
                font=dict(color=TEXT2),
            )
            with cols_hist[i % 3]:
                st.plotly_chart(fig_h, use_container_width=True)

        # Tabla IC
        st.markdown(f"""
        <div class="sec-hdr">
            <div class="bar" style="background:{PURPLE}"></div>
            <span class="lbl">Intervalos de Confianza (IC 80 % y IC 95 %)</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        filas_ic = []
        for partido in partidos_graf_sorted:
            sims = resultados_mc[partido]
            filas_ic.append({
                "Partido":    partido,
                "Mediana":    int(np.median(sims)),
                "Media":      round(np.mean(sims), 1),
                "IC 80% inf": int(np.percentile(sims, 10)),
                "IC 80% sup": int(np.percentile(sims, 90)),
                "IC 95% inf": int(np.percentile(sims, 2.5)),
                "IC 95% sup": int(np.percentile(sims, 97.5)),
                "P(>176)":    f"{sum(1 for x in sims if x >= 176)/len(sims)*100:.1f}%",
            })
        st.dataframe(pd.DataFrame(filas_ic), hide_index=True, use_container_width=True)

        # Tabla coaliciones
        st.markdown(f"""
        <div class="sec-hdr">
            <div class="bar" style="background:{AMBER}"></div>
            <span class="lbl">Probabilidad de Coaliciones Principales</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        COALICIONES = {
            "PP + VOX":                           ["PP", "VOX"],
            "PP + VOX + CC":                      ["PP", "VOX", "CC"],
            "PSOE + SUMAR":                       ["PSOE", "SUMAR"],
            "PSOE + SUMAR + ERC + EH Bildu":      ["PSOE", "SUMAR", "ERC", "EH Bildu"],
            "PSOE + SUMAR + Junts":               ["PSOE", "SUMAR", "Junts"],
            "PP + PNV":                           ["PP", "PNV"],
            "Gran coalición PP + PSOE":            ["PP", "PSOE"],
        }
        n_sims_r = len(next(iter(resultados_mc.values())))
        filas_coal = []
        for nombre_c, partidos_c in COALICIONES.items():
            esc_c = [
                sum(resultados_mc.get(p, [0] * n_sims_r)[si] for p in partidos_c)
                for si in range(n_sims_r)
            ]
            prob_may  = sum(1 for x in esc_c if x >= 176) / n_sims_r * 100
            media_esc = np.mean(esc_c)
            filas_coal.append({
                "Coalición":             nombre_c,
                "Escaños medios":        round(media_esc, 0),
                "P(mayoría absoluta)":   f"{prob_may:.1f}%",
                "Viable": ("Sí" if prob_may > 50 else ("Posible" if prob_may > 20 else "Improbable")),
            })
        filas_coal_sorted = sorted(
            filas_coal,
            key=lambda x: float(x["P(mayoría absoluta)"].replace("%", "")),
            reverse=True,
        )
        st.dataframe(pd.DataFrame(filas_coal_sorted), hide_index=True, use_container_width=True)

    else:
        # Vista previa estática
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:1.4rem">
            <div class="bar" style="background:{MUTED}"></div>
            <span class="lbl">Vista Previa — Estimación Proporcional de Escaños</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)
        st.markdown(f"""
        <div class="info-box">
            Ajusta los sliders y pulsa
            <strong style="color:{CYAN}">Ejecutar simulación</strong>
            para ver la distribución completa con intervalos de confianza.
        </div>
        """, unsafe_allow_html=True)
        total_nc  = sum(estimaciones_ajustadas.values())
        esc_prev  = {
            p: round(v / total_nc * 350)
            for p, v in estimaciones_ajustadas.items()
            if v >= 3.0
        }
        fig_prev = go.Figure(go.Bar(
            x=list(esc_prev.keys()),
            y=list(esc_prev.values()),
            text=list(esc_prev.values()),
            textposition="outside",
            textfont=dict(color=TEXT2, size=11),
            marker_color=[COLORES_PARTIDO.get(p, MUTED) for p in esc_prev],
        ))
        fig_prev.add_hline(
            y=176, line_dash="dash", line_color=AMBER, line_width=1.5,
            annotation_text="Mayoría absoluta (176)",
            annotation_font_color=AMBER,
            annotation_position="top right",
        )
        fig_prev.update_layout(
            height=360,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=30, b=20),
            xaxis=dict(title="Partido", tickfont=dict(color=TEXT2)),
            yaxis=dict(
                title="Escaños estimados",
                gridcolor=BORDER,
                tickfont=dict(color=MUTED),
            ),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_prev, use_container_width=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 2 — Escenarios Morfológicos
# ══════════════════════════════════════════════════════════════════════════════
with tab2:

    ESCENARIOS = [
        {
            "nombre": "Mayoría PP-Vox",
            "bloque": "derecha",
            "probabilidad": 0.28,
            "descripcion": (
                "El Partido Popular obtiene entre 155 y 175 escaños y puede sumar mayoría "
                "absoluta con VOX. Gobierno de coalición o acuerdo de legislatura de derechas."
            ),
            "condiciones": [
                "PP supera el 33% del voto nacional",
                "VOX mantiene representación por encima del umbral efectivo",
                "Fragmentación del bloque progresista impide mayoría alternativa",
                "Abstención elevada en electorado joven y de izquierda",
            ],
            "consecuencias": (
                "Política fiscal expansiva (bajada IRPF y Sociedades), endurecimiento de la "
                "política migratoria, revisión de la ley de amnistía, tensión con CCAA gobernadas "
                "por PSOE. Posible conflicto constitucional con Catalunya y País Vasco."
            ),
            "escanos": {"PP": 165, "VOX": 35, "PSOE": 95, "SUMAR": 25, "Otros": 30},
        },
        {
            "nombre": "Mayoría progresista",
            "bloque": "izquierda",
            "probabilidad": 0.22,
            "descripcion": (
                "PSOE lidera un gobierno de coalición con SUMAR, con apoyo parlamentario de "
                "partidos independentistas (ERC, EH Bildu, Junts). Continuidad del actual modelo."
            ),
            "condiciones": [
                "PSOE se mantiene por encima del 27% del voto",
                "SUMAR recupera votos perdidos desde 2023",
                "Partidos independentistas mantienen representación agregada >15 escaños",
                "PNV apoya la investidura a cambio de transferencias",
            ],
            "consecuencias": (
                "Continuidad de reformas laborales y sociales. Avance de la agenda de vivienda. "
                "Concesiones adicionales a independentistas en financiación y competencias. "
                "Tensión interna en SUMAR por ritmo de reformas."
            ),
            "escanos": {"PSOE": 115, "SUMAR": 32, "PP": 140, "VOX": 28,
                        "ERC": 13, "EH Bildu": 9, "Junts": 7, "PNV": 6},
        },
        {
            "nombre": "Gran coalición PP-PSOE",
            "bloque": "centro",
            "probabilidad": 0.08,
            "descripcion": (
                "Ningún bloque suma mayoría. PP y PSOE acuerdan un gobierno de concentración "
                "nacional, situación sin precedentes en democracia española desde 1978."
            ),
            "condiciones": [
                "Bloque derecha y bloque izquierda quedan ambos por debajo de 176 escaños",
                "Tercera elección consecutiva sin gobierno estable",
                "Presión institucional, económica y europea para la estabilidad",
                "Liderazgos renovados en PP o PSOE que faciliten el acuerdo",
            ],
            "consecuencias": (
                "Gobierno tecnocrático de perfil moderado. Reformas estructurales (pensiones, "
                "financiación autonómica) con amplio consenso. Fragmentación de los extremos "
                "ideológicos. Riesgo de emergencia de nuevas formaciones centrales o populistas."
            ),
            "escanos": {"PP": 145, "PSOE": 120, "VOX": 40, "SUMAR": 22,
                        "Junts": 9, "ERC": 8, "PNV": 6},
        },
        {
            "nombre": "Bloqueo parlamentario",
            "bloque": "bloqueo",
            "probabilidad": 0.18,
            "descripcion": (
                "Ninguna candidatura supera la investidura en dos meses. "
                "España entra en período de gobierno en funciones prolongado."
            ),
            "condiciones": [
                "Resultado electoral muy fragmentado y equilibrado entre bloques",
                "Junts exige condiciones inaceptables para PP o PSOE",
                "VOX veta cualquier acuerdo que incluya concesiones territoriales",
                "SUMAR rechaza apoyar un gobierno sin cartera social relevante",
            ],
            "consecuencias": (
                "Gobierno en funciones con capacidad limitada. Presupuestos prorrogados. "
                "Incertidumbre en mercados (prima de riesgo al alza). "
                "Deterioro de imagen exterior. Convocatoria de nuevas elecciones tras 2 meses."
            ),
            "escanos": {"PP": 148, "PSOE": 112, "VOX": 36, "SUMAR": 28,
                        "Junts": 10, "ERC": 8, "EH Bildu": 8},
        },
        {
            "nombre": "Elecciones repetidas",
            "bloque": "bloqueo",
            "probabilidad": 0.12,
            "descripcion": (
                "Tras el bloqueo parlamentario, el Rey propone disolución de Cortes "
                "y convocatoria de nuevas elecciones en un plazo de 54 días."
            ),
            "condiciones": [
                "Ningún candidato propuesto logra investidura en plazo constitucional",
                "Fracaso de negociaciones entre todos los actores relevantes",
                "No hay acuerdo de gran coalición como alternativa de último recurso",
            ],
            "consecuencias": (
                "Mayor consolidación de PP y PSOE (penalización del voto fragmentado). "
                "Posible caída de formaciones más pequeñas por debajo del umbral. "
                "Fatiga electoral con abstención récord. Posible realineamiento del sistema de partidos."
            ),
            "escanos": {"PP": 158, "PSOE": 125, "VOX": 33, "SUMAR": 18,
                        "Junts": 8, "ERC": 5, "PNV": 5},
        },
        {
            "nombre": "Gobierno minoritario",
            "bloque": "centro",
            "probabilidad": 0.12,
            "descripcion": (
                "PP o PSOE gobiernan en minoría con investidura ajustada (abstenciones), "
                "sin acuerdo de coalición formal. Legislatura corta e inestable."
            ),
            "condiciones": [
                "Un partido supera los 150 escaños sin llegar a mayoría absoluta",
                "Abstención de partidos periféricos permite la investidura",
                "No hay bloques alternativos viables",
                "Acuerdo programático mínimo con 2-3 partidos de apoyo externo",
            ],
            "consecuencias": (
                "Gobierno débil con dificultad para aprobar presupuestos. "
                "Dependencia permanente de apoyos puntuales. "
                "Legislatura previsiblemente corta (18-24 meses). "
                "Alta probabilidad de moción de censura o disolución anticipada."
            ),
            "escanos": {"PP": 155, "PSOE": 108, "VOX": 38, "SUMAR": 26,
                        "Junts": 9, "ERC": 7, "PNV": 7},
        },
    ]

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{CYAN}"></div>
        <span class="lbl">Escenarios de Gobierno Posibles</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="info-box">
        Seis escenarios de gobierno posibles tras las próximas elecciones,
        con sus condiciones, probabilidad estimada y distribución de escaños.
    </div>
    """, unsafe_allow_html=True)

    # 2-column card grid
    col_a, col_b = st.columns(2)
    col_pairs = [col_a, col_b]

    for i, esc in enumerate(ESCENARIOS):
        blq_color = BLOQUE_COLOR.get(esc["bloque"], CYAN)
        blq_label = BLOQUE_LABEL.get(esc["bloque"], esc["bloque"])
        prob_pct  = esc["probabilidad"] * 100
        br, bg, bb = int(blq_color[1:3], 16), int(blq_color[3:5], 16), int(blq_color[5:7], 16)

        # Build conditions HTML
        conds_html = "".join(
            f'<div class="cond-item"><div class="cond-dot" style="background:{blq_color}"></div>'
            f'<span>{c}</span></div>'
            for c in esc["condiciones"]
        )

        with col_pairs[i % 2]:
            card_html = (
                f'<div class="esc-card" style="border-top:3px solid {blq_color}">'
                f'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.7rem;flex-wrap:wrap;gap:.4rem">'
                f'<div style="font-size:1rem;font-weight:700;color:{TEXT}">{esc["nombre"]}</div>'
                f'<span class="blq-badge" style="background:rgba({br},{bg},{bb},0.14);color:{blq_color};border:1px solid rgba({br},{bg},{bb},0.3)">{blq_label}</span>'
                f'</div>'
                f'<div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.3rem">'
                f'<div style="font-size:1.5rem;font-weight:800;font-family:\'JetBrains Mono\',monospace;color:{blq_color}">{prob_pct:.0f}%</div>'
                f'<div style="font-size:.72rem;color:{MUTED};font-weight:600">probabilidad estimada</div>'
                f'</div>'
                f'<div class="prob-track"><div class="prob-fill" style="background:{blq_color};width:{prob_pct:.1f}%"></div></div>'
                f'<div style="font-size:.83rem;color:{TEXT2};margin:.75rem 0 .6rem;line-height:1.5">{esc["descripcion"]}</div>'
                f'<div style="font-size:.65rem;font-weight:700;color:{MUTED};letter-spacing:.1em;text-transform:uppercase;margin-bottom:.35rem">Condiciones</div>'
                f'{conds_html}'
                f'</div>'
            )
            st.markdown(card_html, unsafe_allow_html=True)

            # Bar chart of seats
            esc_data  = esc["escanos"]
            partidos_e = list(esc_data.keys())
            escanos_e  = list(esc_data.values())
            colores_e  = [COLORES_PARTIDO.get(p, MUTED) for p in partidos_e]
            fig_esc = go.Figure(go.Bar(
                x=escanos_e, y=partidos_e, orientation="h",
                marker_color=colores_e,
                text=escanos_e, textposition="outside",
                textfont=dict(color=TEXT2, size=10),
            ))
            fig_esc.add_vline(
                x=176, line_dash="dash", line_color=AMBER, line_width=1.5,
                annotation_text="176",
                annotation_font_color=AMBER,
                annotation_position="top right",
            )
            fig_esc.update_layout(
                height=240,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                margin=dict(t=10, b=10, l=80, r=45),
                xaxis=dict(
                    title="Escaños",
                    tickfont=dict(color=MUTED),
                    gridcolor=BORDER,
                ),
                yaxis=dict(
                    autorange="reversed",
                    tickfont=dict(color=TEXT2),
                ),
                font=dict(color=TEXT2),
                showlegend=False,
            )
            st.plotly_chart(fig_esc, use_container_width=True)

            # Consequences in an expander
            with st.expander("Consecuencias esperadas"):
                st.markdown(
                    f"<span style='font-size:.85rem;color:{TEXT2}'>{esc['consecuencias']}</span>",
                    unsafe_allow_html=True,
                )

            st.markdown("<br>", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 3 — Variables Estructurales
# ══════════════════════════════════════════════════════════════════════════════
with tab3:

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{CYAN}"></div>
        <span class="lbl">Variables Macroeconómicas</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="info-box">
        Explora cómo cambios en indicadores macroeconómicos y sociales afectan
        las estimaciones electorales mediante reglas de transferencia calibradas.
    </div>
    """, unsafe_allow_html=True)

    df_macro = cargar_macro_ultimo()
    MACRO_DEFAULT = {
        "Tasa de Paro (%)":              11.2,
        "IPC General (%)":               2.8,
        "Crec. PIB (%)":                 2.1,
        "Sentimiento gobierno (0-10)":   4.2,
        "Prima Riesgo (pb)":             95.0,
    }
    macro_actual: dict[str, float] = {}
    if not df_macro.empty:
        for _, row in df_macro.iterrows():
            ind = row.get("indicador", "")
            val = row.get("valor")
            if ind and val is not None:
                macro_actual[ind] = float(val)
    for k, v in MACRO_DEFAULT.items():
        if k not in macro_actual:
            macro_actual[k] = v

    col_m1, col_m2 = st.columns(2)
    with col_m1:
        paro = st.slider("Tasa de paro (%)", 6.0, 22.0,
                         float(macro_actual.get("Tasa de Paro (%)", 11.2)), 0.5)
        ipc  = st.slider("Inflación IPC (%)", -1.0, 12.0,
                         float(macro_actual.get("IPC General (%)", 2.8)), 0.5)
        pib  = st.slider("Crecimiento PIB (%)", -4.0, 6.0,
                         float(macro_actual.get("Crec. PIB (%)", 2.1)), 0.25)
    with col_m2:
        sent    = st.slider("Sentimiento hacia el gobierno (0-10)", 1.0, 9.0,
                            float(macro_actual.get("Sentimiento gobierno (0-10)", 4.2)), 0.1)
        prima   = st.slider("Prima de riesgo (pb)", 20.0, 400.0,
                            float(macro_actual.get("Prima Riesgo (pb)", 95.0)), 5.0)
        vivienda = st.slider("Preocupación por vivienda (% ciudadanos)", 30.0, 95.0, 72.0, 1.0)

    # Reglas de transferencia
    base = estimaciones_base.copy()
    delta_paro  = paro - 11.2
    delta_ipc   = ipc  - 2.8
    delta_pib   = pib  - 2.1
    delta_sent  = sent - 4.2
    delta_prima = (prima - 95.0) / 50.0
    delta_viv   = (vivienda - 72.0) / 10.0

    ajustes = {
        "PP":    -0.3*delta_paro + 0.2*delta_ipc - 0.1*delta_pib - 0.3*delta_sent + 0.3*delta_prima - 0.2*delta_viv,
        "PSOE":  -0.2*delta_paro - 0.4*delta_ipc + 0.4*delta_pib + 0.6*delta_sent - 0.3*delta_prima + 0.1*delta_viv,
        "VOX":    0.4*delta_paro + 0.2*delta_ipc - 0.3*delta_pib - 0.2*delta_sent + 0.1*delta_prima,
        "SUMAR":  0.2*delta_paro + 0.1*delta_ipc - 0.1*delta_pib + 0.2*delta_sent + 0.4*delta_viv,
    }

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{BLUE}"></div>
        <span class="lbl">Impacto Estimado en la Intención de Voto</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    col_tab_a, col_tab_b = st.columns(2)

    with col_tab_a:
        filas_aj = []
        for partido, delta in ajustes.items():
            base_val  = base.get(partido, 0)
            nuevo_val = max(0.5, base_val + delta)
            filas_aj.append({
                "Partido":      partido,
                "Base (%)":     f"{base_val:.1f}",
                "Ajustado (%)": f"{nuevo_val:.1f}",
                "Delta (pp)":   f"{delta:+.2f}",
            })
        st.dataframe(pd.DataFrame(filas_aj), hide_index=True, use_container_width=True)

    with col_tab_b:
        deltas_vals   = list(ajustes.values())
        deltas_labels = list(ajustes.keys())
        colores_delta = [GREEN if d >= 0 else RED for d in deltas_vals]
        fig_delta = go.Figure()
        fig_delta.add_trace(go.Bar(
            x=deltas_labels,
            y=deltas_vals,
            marker_color=colores_delta,
            text=[f"{d:+.2f}pp" for d in deltas_vals],
            textposition="outside",
            textfont=dict(color=TEXT2, size=11),
        ))
        fig_delta.add_hline(y=0, line_color=BORDER, line_width=1.5)
        fig_delta.update_layout(
            title=dict(text="Variación en pp vs. escenario base",
                       font=dict(size=12, color=TEXT2)),
            height=300,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(t=40, b=20),
            xaxis=dict(tickfont=dict(color=TEXT2)),
            yaxis=dict(
                title="Variación (pp)",
                gridcolor=BORDER,
                tickfont=dict(color=MUTED),
            ),
            font=dict(color=TEXT2),
        )
        st.plotly_chart(fig_delta, use_container_width=True)

    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{AMBER}"></div>
        <span class="lbl">Reglas de Transferencia</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    reglas_info = {
        "Tasa de paro":
            "Un paro elevado penaliza al partido en el gobierno y beneficia a partidos "
            "de oposición extrema (VOX) y a la izquierda alternativa (SUMAR).",
        "Inflación (IPC)":
            "La inflación alta castiga especialmente al PSOE como partido de gobierno. "
            "El PP capitaliza el descontento económico moderado.",
        "Crecimiento del PIB":
            "El crecimiento beneficia directamente al partido en el gobierno (PSOE). "
            "Un PIB fuerte reduce el voto de protesta.",
        "Sentimiento hacia el gobierno":
            "El indicador más directo: mayor valoración del gobierno implica transferencia "
            "de voto hacia PSOE y SUMAR.",
        "Prima de riesgo":
            "Una prima alta señala inestabilidad financiera y beneficia al discurso de "
            "austeridad del PP. Perjudica al gobierno.",
        "Preocupación por vivienda":
            "A mayor preocupación por acceso a vivienda, mayor beneficio para SUMAR y "
            "la izquierda, que han capitalizado este tema.",
    }
    for var, explicacion in reglas_info.items():
        with st.expander(var):
            st.markdown(
                f"<span style='font-size:.88rem;color:{TEXT2}'>{explicacion}</span>",
                unsafe_allow_html=True,
            )
