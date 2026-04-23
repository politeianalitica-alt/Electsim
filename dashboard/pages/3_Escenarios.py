"""
Página: Simulador de Escenarios

Selector de elección, Monte Carlo de Escaños (D'Hondt), Escenarios Morfológicos
y Variables Estructurales.
"""

from __future__ import annotations

import sys
from collections import defaultdict
from dataclasses import asdict
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

from dashboard.db import (
    cargar_elecciones, cargar_nowcasting, cargar_macro_ultimo,
    cargar_macro_serie,
    cargar_opciones_perfil_microdatos,
    cargar_resumen_perfil_microdatos,
    cargar_intencion_perfil_microdatos,
    cargar_distribucion_campo_perfil_microdatos,
    cargar_elecciones_historicas,
    cargar_snapshots_analogia,
    guardar_snapshot_analogia,
)
from dashboard.models.analogias_historicas import (
    ContextoElectoral,
    FEATURES_CONFIG,
    MotorAnalogias,
)

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
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "⬡  Monte Carlo de Escaños",
    "◈  Escenarios Morfológicos",
    "◎  Variables Estructurales",
    "◉  Perfiles de Votante",
    "⊛  Análogos Históricos",
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
            △  La suma de estimaciones es <strong style="color:{AMBER}">{total_pct:.1f}%</strong>.
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

# ══════════════════════════════════════════════════════════════════════════════
# TAB 4 — PERFILES DE VOTANTE (MICRODATOS)
# ══════════════════════════════════════════════════════════════════════════════

# ── Modelo sintético de scoring ────────────────────────────────────────────────
_EDAD_ADJ = {
    "18-24": {"SUMAR": 14, "PSOE": 4, "Abstención": 18, "PP": -9, "VOX": -6},
    "25-34": {"SUMAR": 9, "PSOE": 5, "Abstención": 10, "PP": -6, "VOX": -4},
    "35-44": {"SUMAR": 3, "PSOE": 3, "PP": 1},
    "45-54": {"PSOE": 2, "PP": 3, "VOX": 2, "SUMAR": -2},
    "55-64": {"PP": 5, "PSOE": 3, "VOX": 3, "SUMAR": -6, "Abstención": -3},
    "65+":   {"PP": 9, "PSOE": 5, "VOX": 4, "SUMAR": -9, "Abstención": -5},
}
_HABITAT_ADJ = {
    "Rural (<2.000 hab.)":         {"PP": 6, "VOX": 5, "PSOE": 2, "SUMAR": -6},
    "Pequeño (2.001–10.000)":      {"PP": 4, "VOX": 4, "PSOE": 2, "SUMAR": -3},
    "Mediano (10.001–50.000)":     {},
    "Grande (50.001–100.000)":     {"PSOE": 2, "SUMAR": 2, "PP": -1},
    "Ciudad (100.001–400.000)":    {"PSOE": 4, "SUMAR": 5, "PP": -3, "VOX": -2},
    "Gran ciudad (>400.000)":      {"SUMAR": 8, "PSOE": 6, "PP": -5, "VOX": -5, "Abstención": 4},
}
_ESTUDIOS_ADJ = {
    "Sin estudios / Primaria":      {"PP": 3, "PSOE": 3, "VOX": 2, "SUMAR": -3, "Abstención": 5},
    "Secundaria / ESO":             {},
    "Bachillerato / FP":            {"SUMAR": 3, "PP": 1, "PSOE": 1},
    "Universitarios / Posgrado":    {"SUMAR": 7, "PSOE": 5, "PP": -3, "VOX": -7},
}
_INGRESOS_ADJ = {
    "Menos de 900 €/mes":   {"SUMAR": 10, "PSOE": 3, "Abstención": 12, "PP": -5, "VOX": 2},
    "900 – 1.200 €/mes":    {"SUMAR": 6,  "PSOE": 4, "Abstención": 6,  "PP": -2},
    "1.200 – 1.800 €/mes":  {"SUMAR": 2,  "PSOE": 3, "PP": 1},
    "1.800 – 2.700 €/mes":  {"PP": 3,     "PSOE": 3, "SUMAR": -1},
    "2.700 – 4.500 €/mes":  {"PP": 7,     "PSOE": 1, "SUMAR": -4, "VOX": 1},
    "Más de 4.500 €/mes":   {"PP": 12,    "VOX": 3,  "SUMAR": -8, "PSOE": -2},
}
_SITLAB_ADJ = {
    "Trabaja":           {},
    "Jubilado/a":        {"PP": 7,  "PSOE": 4, "VOX": 3, "SUMAR": -7},
    "Parado/a":          {"SUMAR": 7, "VOX": 5, "Abstención": 10, "PSOE": 2, "PP": -4},
    "Estudiante":        {"SUMAR": 12, "Abstención": 16, "PSOE": 3, "PP": -7, "VOX": -6},
    "Tareas del hogar":  {"PP": 2, "PSOE": 3},
}
_IDEO_ADJ = {
    "Muy izquierda (1-2)":  {"SUMAR": 22, "PSOE": 8,  "PP": -16, "VOX": -22},
    "Izquierda (3-4)":      {"SUMAR": 12, "PSOE": 13, "PP": -9,  "VOX": -16},
    "Centro (5-6)":         {"PSOE": 5,   "PP": 5,    "SUMAR": -3, "VOX": -5},
    "Derecha (7-8)":        {"PP": 14,    "VOX": 7,   "PSOE": -9, "SUMAR": -16},
    "Muy derecha (9-10)":   {"PP": 9,     "VOX": 22,  "PSOE": -16, "SUMAR": -22},
}
_SEXO_ADJ = {
    "Hombre": {"PP": 1, "VOX": 4, "SUMAR": -1, "Abstención": 1},
    "Mujer":  {"PSOE": 4, "SUMAR": 3, "VOX": -5, "PP": -1},
}

_MENSAJES: dict[str, dict[str, str]] = {
    "PP": {
        "Vivienda y alquiler":      "Liberalizar el suelo y eliminar trabas a la construcción + bonificaciones fiscales al propietario",
        "Empleo y economía":        "Bajada de IRPF a rentas medias, reducir cotizaciones a pymes y autonomía fiscal de las CCAA",
        "Sanidad pública":          "Reducir listas de espera con gestión mixta eficiente; más plazas MIR y médicos de familia",
        "Pensiones":                "Garantizar la sostenibilidad sin subir impuestos: modelo mixto y capitalización complementaria",
        "Inmigración":              "Inmigración legal ordenada; expulsión efectiva y sin trabas judiciales de los irregulares",
        "Seguridad ciudadana":      "Más inversión en Policía y GC; derogar leyes que favorecen al delincuente frente a la víctima",
        "Corrupción":               "Transparencia total, comisión de ética interna y apoyo a la independencia judicial",
        "Infraestructuras":         "Plan nacional de AVE convencional y banda ancha para la España vaciada",
        "Unidad de España":         "La Constitución no se negocia; no más cesiones a independentistas a cambio de escaños",
        "Cambio climático":         "Transición energética ordenada sin destruir empleo; nuclear como puente hacia las renovables",
        "Despoblación rural":       "Incentivos fiscales para fijar residencia en municipios <5.000 hab.; servicios digitales en el campo",
        "Desigualdad social":       "El empleo es la mejor política social: menos trabas para contratar y crecer",
        "default":                  "Gobierno estable y fiable: gestión responsable, fin de la polarización y presupuestos reales",
    },
    "PSOE": {
        "Vivienda y alquiler":      "Parque público de alquiler asequible y tope de precios en zonas tensionadas",
        "Empleo y economía":        "SMI creciente, negociación colectiva fuerte y empleo de calidad para la clase trabajadora",
        "Sanidad pública":          "Inversión directa en plantillas del SNS y cierre de la brecha de listas de espera",
        "Pensiones":                "Revalorización automática con IPC; refuerzo de las pensiones mínimas",
        "Cambio climático":         "Transición justa: 500.000 empleos verdes, renovables al 100 % en 2040",
        "Desigualdad social":       "Impuesto sobre grandes fortunas + renta de emancipación para jóvenes",
        "Igualdad de género":       "Paridad real, ampliación del permiso de paternidad y cierre de brecha salarial",
        "Educación":                "Más inversión en educación pública; ratio máximo de 20 alumnos por aula",
        "Infraestructuras":         "Inversión en ferrocarril convencional y digitalización de zonas rurales",
        "Corrupción":               "Transparencia, protección de denunciantes y agilización de la justicia",
        "Despoblación rural":       "Servicios públicos garantizados en el medio rural: el derecho a quedarse",
        "default":                  "España avanzando: derechos sociales, empleo de calidad y Estado del bienestar reforzado",
    },
    "VOX": {
        "Inmigración":              "Cierre de la frontera sur, expulsiones inmediatas y fin al efecto llamada de las políticas actuales",
        "Seguridad ciudadana":      "Cadena perpetua revisable, tolerancia cero al reincidente; más policía en la calle",
        "Pensiones":                "Sistema de capitalización individual: tus cotizaciones son tuyas, no del Estado",
        "Empleo y economía":        "Eliminar impuesto de sucesiones y patrimonio; simplificación fiscal radical para empresas",
        "Unidad de España":         "Ilegali­zar partidos independentistas; estado central fuerte frente a privilegios autonómicos",
        "Sanidad pública":          "Atención prioritaria para quienes cotizan; acabar con el turismo sanitario",
        "Desigualdad social":       "La meritocracia y no las cuotas como motor de ascenso social",
        "Cambio climático":         "No al Pacto Verde que destruye el empleo agrícola e industrial español",
        "Vivienda y alquiler":      "Desahucio inmediato y sin burocracia de los ocupas ilegales",
        "Despoblación rural":       "Bajar impuestos al campo y eliminar trabas medioambientales al sector agrario",
        "default":                  "España primero: seguridad, fronteras controladas y fin a la agenda ideológica de izquierdas",
    },
    "SUMAR": {
        "Vivienda y alquiler":      "Alquiler social masivo y expropiación temporal de viviendas vacías de grandes tenedores",
        "Empleo y economía":        "Jornada de 32h sin bajada salarial + salario mínimo vital universal",
        "Cambio climático":         "100 % renovables en 2040 con transición justa y 500.000 empleos verdes",
        "Desigualdad social":       "Impuesto a la riqueza y las herencias; renta básica universal incondicional",
        "Igualdad de género":       "Aborto como derecho en la sanidad pública, paridad real en empresas e instituciones",
        "Sanidad pública":          "Reversión de todas las privatizaciones sanitarias; sanidad universal sin excepciones",
        "Educación":                "Universidad pública gratuita para todos y eliminación de las tasas de matrícula",
        "Movilidad y transporte":   "Transporte público gratuito en ciudades y grandes áreas metropolitanas",
        "Pensiones":                "Jubilación flexible desde los 60 para trabajos duros o con trayectoria larga",
        "Despoblación rural":       "Servicios públicos garantizados en municipios rurales; incentivos para vivir en el campo",
        "default":                  "Más derechos, menos desigualdad: que la economía trabaje para la mayoría y no solo para unos pocos",
    },
}

_VULNERABILIDADES: dict[str, str] = {
    "PP":    "Casos de corrupción interna y percepción de defender solo a rentas altas pueden alejar al votante de clase media",
    "PSOE":  "Dependencia de socios independentistas y gestión del coste de la vida erosionan la credibilidad económica",
    "VOX":   "Discurso percibido como extremo aleja al elector moderado y le cierra puertas en gobiernos de coalición",
    "SUMAR": "Imagen de radicalismo económico y divisiones internas generan desconfianza en el votante pragmático",
    "Abstención": "Perfil con alta probabilidad de no votar; el mensaje debe ser de utilidad directa y cambio tangible",
}


def _score_sintetico(edad, habitat, estudios, ingresos, sitlab, ideo, sexo) -> dict[str, float]:
    scores: dict[str, float] = {"PP": 33.0, "PSOE": 28.5, "VOX": 12.0,
                                  "SUMAR": 10.5, "Abstención": 8.0, "Otros": 7.5}
    for adj_map, sel in [
        (_EDAD_ADJ, edad), (_HABITAT_ADJ, habitat), (_ESTUDIOS_ADJ, estudios),
        (_INGRESOS_ADJ, ingresos), (_SITLAB_ADJ, sitlab), (_IDEO_ADJ, ideo), (_SEXO_ADJ, sexo),
    ]:
        if sel and sel not in ("Todos", "") and sel in adj_map:
            for k, v in adj_map[sel].items():
                scores[k] = scores.get(k, 0.0) + v
    total = sum(max(0.0, v) for v in scores.values()) or 1
    return dict(sorted(
        {k: round(max(0.0, v) / total * 100, 1) for k, v in scores.items()}.items(),
        key=lambda x: -x[1],
    ))


def _preocupaciones_sinteticas(edad, habitat, estudios, ingresos, sitlab, ideo) -> dict[str, float]:
    p: dict[str, float] = {
        "Vivienda y alquiler": 45, "Empleo y economía": 55, "Sanidad pública": 52,
        "Pensiones": 40, "Inmigración": 38, "Cambio climático": 28,
        "Corrupción": 42, "Seguridad ciudadana": 32, "Educación": 35,
        "Infraestructuras": 22, "Desigualdad social": 30, "Conflicto territorial": 25,
    }
    if edad in ("18-24", "25-34"):
        p["Vivienda y alquiler"] += 45; p["Empleo y economía"] += 25
        p["Cambio climático"] += 35; p["Pensiones"] -= 20; p["Inmigración"] -= 15
    elif edad in ("55-64", "65+"):
        p["Pensiones"] += 40; p["Sanidad pública"] += 20
        p["Inmigración"] += 20; p["Vivienda y alquiler"] -= 25
    if "Rural" in habitat or "Pequeño" in habitat:
        p["Infraestructuras"] += 45; p["Inmigración"] += 15
        p["Despoblación rural"] = 60; p["Cambio climático"] -= 10
    elif "Gran ciudad" in habitat or "Ciudad" in habitat:
        p["Vivienda y alquiler"] += 30; p["Desigualdad social"] += 20
        p["Movilidad y transporte"] = 35
    if "Universitarios" in estudios:
        p["Cambio climático"] += 30; p["Desigualdad social"] += 20
        p["Corrupción"] += 15; p["Inmigración"] -= 20
    elif "Sin estudios" in estudios or "Primaria" in estudios:
        p["Inmigración"] += 25; p["Seguridad ciudadana"] += 20
    if "Menos de 900" in ingresos or "900 – 1.200" in ingresos:
        p["Empleo y economía"] += 30; p["Vivienda y alquiler"] += 25; p["Desigualdad social"] += 20
    elif "2.700" in ingresos or "4.500" in ingresos:
        p["Impuestos y fiscalidad"] = 55; p["Seguridad ciudadana"] += 15; p["Desigualdad social"] -= 15
    if "Parado" in sitlab:
        p["Empleo y economía"] += 35; p["Desigualdad social"] += 20
    elif "Jubilado" in sitlab:
        p["Pensiones"] += 35; p["Sanidad pública"] += 25
    elif "Estudiante" in sitlab:
        p["Empleo y economía"] += 20; p["Educación"] += 30; p["Vivienda y alquiler"] += 25
    if ideo and "izquierda" in ideo.lower():
        p["Cambio climático"] += 25; p["Desigualdad social"] += 25
        p["Igualdad de género"] = p.get("Igualdad de género", 0) + 40; p["Inmigración"] -= 25
    elif ideo and "derecha" in ideo.lower():
        p["Inmigración"] += 30; p["Seguridad ciudadana"] += 25
        p["Unidad de España"] = p.get("Unidad de España", 0) + 45; p["Cambio climático"] -= 20
    total = sum(max(0, v) for v in p.values()) or 1
    return dict(sorted(
        {k: round(max(0, v) / total * 100, 1) for k, v in p.items() if v > 0}.items(),
        key=lambda x: -x[1],
    )[:8])


def _mensajes_partido(partido: str, preoc_top: list[str]) -> list[tuple[str, str]]:
    d = _MENSAJES.get(partido, {})
    bullets = [(pr, d[pr]) for pr in preoc_top[:3] if pr in d]
    if len(bullets) < 2 and "default" in d:
        bullets.append(("Mensaje general", d["default"]))
    return bullets


with tab4:
    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{PURPLE}"></div>
        <span class="lbl">Constructor de Perfiles · Microdatos</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)
    st.markdown(f"""
    <div class="info-box" style="border-left-color:{PURPLE}">
        Configura un perfil sociodemográfico y obtén la <strong style="color:{CYAN}">estimación de intención de voto</strong>,
        las <strong style="color:{AMBER}">preocupaciones dominantes</strong> y los
        <strong style="color:{GREEN}">temas clave que cada partido debe abordar</strong> para ganar ese voto.
        Alimentado por microdatos CIS cuando están disponibles; modelo sintético calibrado en caso contrario.
    </div>
    """, unsafe_allow_html=True)

    col_sel, col_res = st.columns([1, 2], gap="large")

    # ── Panel de selección ──────────────────────────────────────────────────
    with col_sel:
        st.markdown(f"""
        <div style="background:{BG2};border:1px solid {BORDER};border-top:3px solid {PURPLE};
                    border-radius:12px;padding:1.2rem 1.3rem;margin-bottom:.8rem">
            <div style="font-size:.6rem;font-weight:700;color:{PURPLE};letter-spacing:.18em;
                        text-transform:uppercase;margin-bottom:1rem">Configurar perfil</div>
        """, unsafe_allow_html=True)

        sel_edad    = st.selectbox("Edad", ["Todos", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"], key="p_edad")
        sel_habitat = st.selectbox("Tamaño de municipio", [
            "Todos", "Rural (<2.000 hab.)", "Pequeño (2.001–10.000)",
            "Mediano (10.001–50.000)", "Grande (50.001–100.000)",
            "Ciudad (100.001–400.000)", "Gran ciudad (>400.000)"], key="p_hab")
        sel_estudios = st.selectbox("Nivel de estudios", [
            "Todos", "Sin estudios / Primaria", "Secundaria / ESO",
            "Bachillerato / FP", "Universitarios / Posgrado"], key="p_est")
        sel_ingresos = st.selectbox("Ingresos anuales del hogar", [
            "Todos", "Menos de 900 €/mes", "900 – 1.200 €/mes",
            "1.200 – 1.800 €/mes", "1.800 – 2.700 €/mes",
            "2.700 – 4.500 €/mes", "Más de 4.500 €/mes"], key="p_ing")
        sel_sitlab   = st.selectbox("Situación laboral", [
            "Todos", "Trabaja", "Jubilado/a", "Parado/a", "Estudiante", "Tareas del hogar"], key="p_sit")
        sel_ideo     = st.selectbox("Autoubicación ideológica", [
            "Todos", "Muy izquierda (1-2)", "Izquierda (3-4)",
            "Centro (5-6)", "Derecha (7-8)", "Muy derecha (9-10)"], key="p_ideo")
        sel_sexo     = st.selectbox("Sexo", ["Todos", "Hombre", "Mujer"], key="p_sex")

        st.markdown("</div>", unsafe_allow_html=True)

        # Resumen textual del perfil
        resumen_parts = [x for x in [sel_edad, sel_habitat, sel_estudios, sel_ingresos, sel_sitlab, sel_sexo] if x != "Todos"]
        perfil_desc = " · ".join(resumen_parts) if resumen_parts else "Electorado general"
        st.markdown(f"""
        <div style="background:{BG3};border:1px solid {BORDER};border-radius:8px;
                    padding:.7rem 1rem;margin-top:.4rem;font-size:.72rem;color:{TEXT2}">
            <span style="color:{MUTED};font-size:.6rem;text-transform:uppercase;
                         letter-spacing:.1em;font-weight:700">Perfil activo</span><br>
            <span style="color:{TEXT};font-weight:600">{perfil_desc}</span>
        </div>
        """, unsafe_allow_html=True)

    # ── Panel de resultados ─────────────────────────────────────────────────
    with col_res:
        # Intentar cargar microdatos reales
        filtros_micro: dict = {}
        if sel_edad    != "Todos": filtros_micro["grupo_edad"]        = sel_edad
        if sel_sexo    != "Todos": filtros_micro["sexo"]              = "H" if sel_sexo == "Hombre" else "M"
        if sel_sitlab  != "Todos": filtros_micro["situacion_laboral"] = sel_sitlab

        df_resumen_micro = pd.DataFrame()
        df_intencion_micro = pd.DataFrame()
        df_problemas_micro = pd.DataFrame()
        usando_bd = False
        n_micro = 0

        try:
            df_resumen_micro  = cargar_resumen_perfil_microdatos(filtros_micro)
            df_intencion_micro = cargar_intencion_perfil_microdatos(filtros_micro, limit=8)
            df_problemas_micro = cargar_distribucion_campo_perfil_microdatos(filtros_micro, "principal_problema", limit=8)
            if not df_resumen_micro.empty:
                n_micro = int(df_resumen_micro.iloc[0].get("n", 0) or 0)
                usando_bd = n_micro >= 10
        except Exception:
            pass

        # Scores finales
        scores = _score_sintetico(sel_edad, sel_habitat, sel_estudios, sel_ingresos, sel_sitlab, sel_ideo, sel_sexo)

        # Si hay datos BD de intención, sobreescribir scores
        if usando_bd and not df_intencion_micro.empty:
            total_w = float(df_intencion_micro["peso"].sum()) or 1
            scores_bd = {str(r["categoria"]): round(float(r["peso"]) / total_w * 100, 1)
                         for _, r in df_intencion_micro.iterrows()
                         if r["categoria"] not in (None, "", "NS/NC", "Blanco/Nulo")}
            if scores_bd:
                scores = dict(sorted(scores_bd.items(), key=lambda x: -x[1]))

        preocupaciones = _preocupaciones_sinteticas(sel_edad, sel_habitat, sel_estudios, sel_ingresos, sel_sitlab, sel_ideo)

        # Si hay datos BD de problemas, sobreescribir
        if usando_bd and not df_problemas_micro.empty:
            total_w = float(df_problemas_micro["peso"].sum()) or 1
            preoc_bd = {str(r["categoria"]): round(float(r["peso"]) / total_w * 100, 1)
                        for _, r in df_problemas_micro.iterrows()
                        if r["categoria"] not in (None, "")}
            if preoc_bd:
                preocupaciones = dict(sorted(preoc_bd.items(), key=lambda x: -x[1])[:8])

        partido_lider  = list(scores.keys())[0]
        prob_lider     = list(scores.values())[0]
        preoc_top      = list(preocupaciones.keys())
        color_lider    = COLORES_PARTIDO.get(partido_lider, CYAN)

        # ── KPI row ──────────────────────────────────────────────────────
        k1, k2, k3, k4 = st.columns(4)
        with k1:
            src_label = f"{n_micro:,} encuestados" if usando_bd else "Modelo sintético"
            src_color = GREEN if usando_bd else AMBER
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{src_color}55">
                <div class="lbl">Fuente datos</div>
                <div class="val" style="font-size:.9rem;color:{src_color}">{src_label}</div>
            </div>
            """, unsafe_allow_html=True)
        with k2:
            lr, lg, lb = int(color_lider[1:3],16), int(color_lider[3:5],16), int(color_lider[5:7],16)
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:rgba({lr},{lg},{lb},.55)">
                <div class="lbl">Partido líder</div>
                <div class="val" style="color:{color_lider}">{partido_lider}</div>
            </div>
            """, unsafe_allow_html=True)
        with k3:
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{CYAN}55">
                <div class="lbl">Prob. estimada</div>
                <div class="val">{prob_lider:.1f}%</div>
            </div>
            """, unsafe_allow_html=True)
        with k4:
            preoc1 = preoc_top[0] if preoc_top else "—"
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{AMBER}55">
                <div class="lbl">Preocupación #1</div>
                <div class="val" style="font-size:.82rem;color:{AMBER}">{preoc1}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown(f'<div style="height:.6rem"></div>', unsafe_allow_html=True)

        # ── Gráficos: intención de voto + preocupaciones ─────────────────
        gc1, gc2 = st.columns([1, 1], gap="medium")

        with gc1:
            st.markdown(f"""
            <div class="sec-hdr" style="margin-top:.4rem">
                <div class="bar" style="background:{CYAN}"></div>
                <span class="lbl">Intención de voto estimada</span>
                <div class="line"></div>
            </div>
            """, unsafe_allow_html=True)
            parties_show = {k: v for k, v in list(scores.items())[:6] if v > 0.5}
            labels_d = list(parties_show.keys())
            values_d = list(parties_show.values())
            colors_d = [COLORES_PARTIDO.get(p, "#64748B") for p in labels_d]
            fig_donut = go.Figure(go.Pie(
                labels=labels_d, values=values_d,
                hole=.55,
                marker=dict(colors=colors_d, line=dict(color=BG2, width=2)),
                textfont=dict(size=11, color=TEXT2),
                hovertemplate="<b>%{label}</b><br>%{value:.1f}%<extra></extra>",
            ))
            fig_donut.update_layout(
                height=240, margin=dict(t=10, b=10, l=10, r=10),
                paper_bgcolor="rgba(0,0,0,0)",
                showlegend=True,
                legend=dict(font=dict(size=10, color=TEXT2), bgcolor="rgba(0,0,0,0)",
                            orientation="v", x=1.02, y=.5),
                annotations=[dict(text=f"<b>{prob_lider:.0f}%</b>", x=.5, y=.5,
                                  font=dict(size=18, color=color_lider), showarrow=False)],
            )
            st.plotly_chart(fig_donut, use_container_width=True, config={"displayModeBar": False})

        with gc2:
            st.markdown(f"""
            <div class="sec-hdr" style="margin-top:.4rem">
                <div class="bar" style="background:{AMBER}"></div>
                <span class="lbl">Preocupaciones principales</span>
                <div class="line"></div>
            </div>
            """, unsafe_allow_html=True)
            preoc_labels = list(preocupaciones.keys())[:7]
            preoc_vals   = [preocupaciones[k] for k in preoc_labels]
            bar_colors   = [RED if v == max(preoc_vals) else AMBER if v >= sorted(preoc_vals)[-3] else MUTED
                            for v in preoc_vals]
            fig_preoc = go.Figure(go.Bar(
                y=preoc_labels, x=preoc_vals, orientation="h",
                marker=dict(color=bar_colors, line=dict(width=0)),
                text=[f"{v:.0f}%" for v in preoc_vals], textposition="outside",
                textfont=dict(color=TEXT2, size=9),
            ))
            fig_preoc.update_layout(
                height=240, margin=dict(t=10, b=10, l=5, r=40),
                paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                xaxis=dict(visible=False),
                yaxis=dict(tickfont=dict(size=9, color=TEXT2), gridcolor=BORDER),
                font=dict(color=TEXT2),
            )
            st.plotly_chart(fig_preoc, use_container_width=True, config={"displayModeBar": False})

        # ── Temas para ganar este voto ────────────────────────────────────
        st.markdown(f"""
        <div class="sec-hdr" style="margin-top:.8rem">
            <div class="bar" style="background:{GREEN}"></div>
            <span class="lbl">Temas que deben abordar los partidos para ganar este voto</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)
        st.markdown(f"""
        <div style="font-size:.75rem;color:{MUTED};margin-bottom:.8rem">
            Basado en las preocupaciones del perfil · Top 3 partidos por probabilidad estimada
        </div>
        """, unsafe_allow_html=True)

        top_partidos = [p for p in list(scores.keys())[:4] if p not in ("Abstención", "Otros") and scores[p] > 3][:3]
        msg_cols = st.columns(len(top_partidos)) if top_partidos else []

        for idx, partido in enumerate(top_partidos):
            prob   = scores.get(partido, 0)
            color  = COLORES_PARTIDO.get(partido, CYAN)
            cr, cg, cb = int(color[1:3],16), int(color[3:5],16), int(color[5:7],16)
            bullets = _mensajes_partido(partido, preoc_top)
            vuln    = _VULNERABILIDADES.get(partido, "")

            bullets_html = "".join(
                f'<div style="display:flex;gap:.55rem;margin:.45rem 0;align-items:flex-start">'
                f'<div style="width:4px;height:4px;border-radius:50%;background:{color};'
                f'flex-shrink:0;margin-top:.45rem"></div>'
                f'<div><span style="font-size:.6rem;font-weight:700;color:{color};'
                f'text-transform:uppercase;letter-spacing:.08em">{pr}</span><br>'
                f'<span style="font-size:.72rem;color:{TEXT2};line-height:1.45">{msg}</span></div>'
                f'</div>'
                for pr, msg in bullets
            )
            vuln_html = (
                f'<div style="margin-top:.7rem;padding:.5rem .7rem;background:rgba({cr},{cg},{cb},.06);'
                f'border-radius:6px;border:1px solid rgba({cr},{cg},{cb},.18)">'
                f'<span style="font-size:.58rem;font-weight:700;color:{MUTED};text-transform:uppercase;'
                f'letter-spacing:.1em">Riesgo</span><br>'
                f'<span style="font-size:.7rem;color:{TEXT2};line-height:1.4">{vuln}</span></div>'
            ) if vuln else ""

            with msg_cols[idx]:
                st.markdown(
                    f'<div style="background:{BG2};border:1px solid {BORDER};'
                    f'border-top:3px solid {color};border-radius:12px;padding:1.1rem 1.2rem;height:100%">'
                    f'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">'
                    f'<span style="font-size:.85rem;font-weight:800;color:{color}">{partido}</span>'
                    f'<span style="font-size:.68rem;font-weight:700;color:{color};'
                    f'background:rgba({cr},{cg},{cb},.12);padding:.2rem .55rem;border-radius:999px;'
                    f'border:1px solid rgba({cr},{cg},{cb},.3)">{prob:.1f}%</span>'
                    f'</div>'
                    f'{bullets_html}'
                    f'{vuln_html}'
                    f'</div>',
                    unsafe_allow_html=True,
                )

        # Si Abstención es top 2 → aviso especial
        if scores.get("Abstención", 0) > 20:
            abs_pct = scores["Abstención"]
            st.markdown(f"""
            <div class="warn-box" style="margin-top:.8rem">
                <strong style="color:{AMBER}">△  Alta probabilidad de abstención ({abs_pct:.1f}%)</strong><br>
                <span style="font-size:.82rem">Este perfil tiene una predisposición elevada a no votar.
                Los partidos deben priorizar mensajes de <em>utilidad directa y tangible</em>:
                medidas concretas sobre vivienda, empleo o economía que afecten inmediatamente a su situación.
                El discurso abstracto o identitario no moviliza a este segmento.</span>
            </div>
            """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# TAB 5 — Análogos Históricos
# ══════════════════════════════════════════════════════════════════════════════
with tab5:
    st.markdown(f"""
    <div class="sec-hdr">
        <div class="bar" style="background:{PURPLE}"></div>
        <span class="lbl">Comparador de Elecciones Históricas Equivalentes</span>
        <div class="line"></div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown(f"""
    <div class="info-box" style="border-left-color:{PURPLE}">
        Encuentra las elecciones más parecidas al contexto actual con distancia ponderada
        en 12 dimensiones estructurales y proyecta escenarios probables.
    </div>
    """, unsafe_allow_html=True)

    # Defaults automáticos: macro + nowcasting actual.
    pib_auto, paro_auto, ipc_auto = 2.5, 11.0, 3.5
    frag_auto, aprob_auto = 5.8, 33.0
    try:
        pib_auto = float(cargar_macro_serie("crecimiento_pib", anios=2)["valor"].iloc[-1])
    except Exception:
        pass
    try:
        ipc_auto = float(cargar_macro_serie("ipc_general", anios=2)["valor"].iloc[-1])
    except Exception:
        pass
    try:
        paro_auto = float(cargar_macro_serie("tasa_paro", anios=2)["valor"].iloc[-1])
    except Exception:
        pass
    try:
        _df_nc_auto = cargar_nowcasting()
        if not _df_nc_auto.empty and "estimacion_pct" in _df_nc_auto.columns:
            p = (_df_nc_auto["estimacion_pct"].astype(float).clip(lower=0) / 100.0).values
            p = p[p > 0.01]
            if len(p) > 0:
                frag_auto = max(2.0, min(10.0, float(1.0 / (p ** 2).sum())))
            aprob_auto = max(20.0, min(60.0, float(_df_nc_auto["estimacion_pct"].max()) + 2.0))
    except Exception:
        pass

    with st.expander("⚙️ Calibrar contexto electoral", expanded=False):
        c1, c2, c3 = st.columns(3)
        with c1:
            pib = st.number_input("PIB crecimiento (%)", value=float(round(pib_auto, 2)), step=0.1, key="an_pib")
            paro = st.number_input("Tasa de paro (%)", value=float(round(paro_auto, 2)), step=0.1, key="an_paro")
            ipc = st.number_input("Inflación (%)", value=float(round(ipc_auto, 2)), step=0.1, key="an_ipc")
            deficit = st.number_input("Déficit (% PIB)", value=3.5, step=0.1, key="an_deficit")
        with c2:
            sat_eco = st.slider("Satisfacción económica (0-10)", 0.0, 10.0, 4.0, 0.1, key="an_sat")
            inc_anios = st.number_input("Años del incumbente", min_value=0, max_value=20, value=5, key="an_inc")
            aprob = st.slider("Aprobación gobierno (%)", 0.0, 100.0, float(round(aprob_auto, 1)), 0.5, key="an_aprob")
            frag = st.number_input("Fragmentación preelectoral", value=float(round(frag_auto, 2)), step=0.1, key="an_frag")
        with c3:
            polar = st.slider("Polarización (0-1)", 0.0, 1.0, 0.65, 0.01, key="an_polar")
            tension = st.slider("Tensión territorial (0-1)", 0.0, 1.0, 0.65, 0.01, key="an_tension")
            escandalo = st.checkbox("Escándalo mayor activo", value=False, key="an_esc")
            crisis_int = st.checkbox("Crisis internacional activa", value=True, key="an_crisis")

    filtros_col1, filtros_col2, filtros_col3, filtros_col4 = st.columns([2, 1, 1, 1])
    with filtros_col1:
        partido_ref = st.selectbox(
            "Partido de referencia para proyección",
            list(estimaciones_base.keys()),
            index=(list(estimaciones_base.keys()).index("PSOE") if "PSOE" in estimaciones_base else 0),
            key="an_partido_ref",
        )
    with filtros_col2:
        tipo_ref = st.selectbox("Tipo elección histórica", ["todas", "generales", "legislativas"], index=1, key="an_tipo")
    with filtros_col3:
        top_n = st.selectbox("Top N", [3, 4, 5, 6, 7, 8], index=2, key="an_topn")
    with filtros_col4:
        pais_ref = st.selectbox("País", ["todos", "España", "Alemania", "Francia", "Portugal"], index=0, key="an_pais")

    buscar_col, guardar_col = st.columns([1, 1])
    with buscar_col:
        ejecutar_analogias = st.button("🔍 Buscar análogos", type="primary", use_container_width=True)
    with guardar_col:
        guardar_auto = st.checkbox("Guardar snapshot automáticamente", value=True, key="an_guardar")

    if ejecutar_analogias or "analogias_result" not in st.session_state:
        tipo_filtro = None if tipo_ref == "todas" else tipo_ref
        pais_filtro = None if pais_ref == "todos" else pais_ref
        df_hist = cargar_elecciones_historicas(tipo=tipo_filtro, pais=pais_filtro)
        motor = MotorAnalogias(df_hist).ajustar_normalizacion()

        ctx = ContextoElectoral(
            pib_crecimiento=float(pib),
            tasa_paro=float(paro),
            inflacion=float(ipc),
            deficit_pib=float(deficit),
            satisfaccion_eco=float(sat_eco),
            incumbente_anios=int(inc_anios),
            aprobacion_gobierno=float(aprob),
            fragmentacion_pre=float(frag),
            polarizacion=float(polar),
            escandalo_mayor=bool(escandalo),
            tension_territorial=float(tension),
            crisis_internacional=bool(crisis_int),
        )
        analogias = motor.buscar(ctx, top_n=int(top_n), filtro_pais=pais_filtro, filtro_tipo=tipo_filtro)
        proyeccion = motor.proyeccion_resultado(analogias, str(partido_ref))

        st.session_state["analogias_contexto"] = asdict(ctx)
        st.session_state["analogias_result"] = analogias
        st.session_state["analogias_proyeccion"] = proyeccion
        st.session_state["analogias_n_hist"] = len(df_hist)

        if guardar_auto and analogias:
            snapshot_id = guardar_snapshot_analogia(
                contexto_dict=asdict(ctx),
                resultados=[asdict(a) for a in analogias],
                proyeccion=proyeccion or None,
                partido_ref=str(partido_ref),
                tipo_eleccion=tipo_filtro or "generales",
            )
            st.session_state["analogias_snapshot_id"] = snapshot_id

    analogias = st.session_state.get("analogias_result", [])
    proyeccion = st.session_state.get("analogias_proyeccion", {})
    n_hist = st.session_state.get("analogias_n_hist", 0)
    snapshot_id = st.session_state.get("analogias_snapshot_id")

    if not analogias:
        st.markdown(f"""
        <div class="warn-box">
            No hay elecciones históricas para los filtros seleccionados.
        </div>
        """, unsafe_allow_html=True)
    else:
        k1, k2, k3, k4 = st.columns(4)
        with k1:
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{PURPLE}55">
                <div class="lbl">Histórico disponible</div>
                <div class="val">{n_hist}</div>
            </div>
            """, unsafe_allow_html=True)
        with k2:
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{CYAN}55">
                <div class="lbl">Mejor similitud</div>
                <div class="val">{analogias[0].similitud_pct:.1f}%</div>
            </div>
            """, unsafe_allow_html=True)
        with k3:
            prob_vuelco = float(proyeccion.get("prob_vuelco", 0.0) or 0.0) * 100.0
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{AMBER}55">
                <div class="lbl">Prob. vuelco</div>
                <div class="val">{prob_vuelco:.0f}%</div>
            </div>
            """, unsafe_allow_html=True)
        with k4:
            pct_est = proyeccion.get("pct_partido_est")
            pct_lbl = f"{pct_est:.1f}%" if pct_est is not None else "N/D"
            st.markdown(f"""
            <div class="kpi-pill" style="border-top-color:{GREEN}55">
                <div class="lbl">Voto est. {partido_ref}</div>
                <div class="val">{pct_lbl}</div>
            </div>
            """, unsafe_allow_html=True)

        if snapshot_id:
            st.caption(f"Snapshot guardado con ID #{snapshot_id}")

        st.markdown(f"""
        <div class="sec-hdr">
            <div class="bar" style="background:{CYAN}"></div>
            <span class="lbl">Distancia por dimensión (Top 5 análogos)</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        labels = list(FEATURES_CONFIG.keys())
        labels_pretty = [FEATURES_CONFIG[k][1] for k in labels]
        fig_radar = go.Figure()
        colors = [CYAN, AMBER, PURPLE, BLUE, GREEN]
        max_r = 0.01
        for i, a in enumerate(analogias[:5]):
            vals = [float(a.dimensiones.get(k, 0.0)) for k in labels]
            max_r = max(max_r, max(vals) if vals else 0.01)
            fig_radar.add_trace(
                go.Scatterpolar(
                    r=vals + [vals[0]],
                    theta=labels_pretty + [labels_pretty[0]],
                    fill="toself",
                    opacity=0.20,
                    line=dict(color=colors[i % len(colors)], width=2),
                    name=f"{a.pais} {a.anio} ({a.similitud_pct:.1f}%)",
                )
            )

        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, max_r * 1.2], gridcolor=BORDER),
                angularaxis=dict(gridcolor=BORDER),
                bgcolor="rgba(0,0,0,0)",
            ),
            height=460,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            legend=dict(orientation="h", y=-0.15),
            margin=dict(l=20, r=20, t=20, b=40),
        )
        st.plotly_chart(fig_radar, use_container_width=True)

        st.markdown(f"""
        <div class="sec-hdr">
            <div class="bar" style="background:{BLUE}"></div>
            <span class="lbl">Fichas de análogos</span>
            <div class="line"></div>
        </div>
        """, unsafe_allow_html=True)

        filas = []
        for a in analogias:
            filas.append(
                {
                    "Elección": a.nombre_ref,
                    "País": a.pais,
                    "Año": a.anio,
                    "Tipo": a.tipo,
                    "Similitud (%)": a.similitud_pct,
                    "Distancia": a.distancia,
                    "Ganador": a.ganador or "—",
                    "% ganador": a.pct_ganador if a.pct_ganador is not None else "—",
                    "Vuelco": "Sí" if a.vuelco_gobierno else "No",
                    "Participación": a.participacion if a.participacion is not None else "—",
                }
            )
        st.dataframe(pd.DataFrame(filas), hide_index=True, use_container_width=True)

        for i, a in enumerate(analogias):
            with st.expander(f"#{i+1} · {a.nombre_ref} · Similitud {a.similitud_pct:.1f}%"):
                if a.notas:
                    st.caption(a.notas)
                if a.resultados_json:
                    if isinstance(a.resultados_json, dict):
                        resumen = ", ".join([f"{k}: {v}%" for k, v in a.resultados_json.items()])
                    else:
                        resumen = str(a.resultados_json)
                    st.markdown(f"**Resultados relevantes:** {resumen}")

    with st.expander("📁 Historial de snapshots"):
        df_snap = cargar_snapshots_analogia(limite=10)
        if df_snap.empty:
            st.caption("No hay snapshots guardados.")
        else:
            st.dataframe(
                df_snap[["id", "tipo_eleccion", "partido_ref", "calculado_en"]],
                hide_index=True,
                use_container_width=True,
            )
