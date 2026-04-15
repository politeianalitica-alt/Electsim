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
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import sidebar_nav

from dashboard.db import cargar_elecciones, cargar_nowcasting, cargar_macro_ultimo

st.set_page_config(page_title="Escenarios — ElectSim", layout="wide")

sidebar_nav()

# ── CSS Politeia ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
.metric-box {background:#f0f4fa;border-radius:8px;padding:12px 16px;margin:4px 0;}
.scenario-card {border:1px solid #d0d9e8;border-radius:10px;padding:16px;margin:8px 0;background:#fff;}
.prob-badge {display:inline-block;padding:3px 10px;border-radius:12px;font-size:0.85em;font-weight:600;}
.badge-left {background:#e8f4f8;color:#1a6b9a;}
.badge-right {background:#fde8e8;color:#9a1a1a;}
.badge-center {background:#f0f4e8;color:#4a7a1a;}
.badge-block {background:#f0e8f4;color:#6a1a9a;}
</style>
""", unsafe_allow_html=True)

st.title("Simulador de Escenarios Electorales")

# ── Selector de elección (primera cosa mostrada) ──────────────────────────────
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
    help="Selecciona la elección sobre la que ejecutar las simulaciones. "
         "Si no hay datos futuros, se usa la última registrada como base.",
)
eleccion_id = opciones_elec[eleccion_sel]

st.divider()

# ── Datos nowcasting ──────────────────────────────────────────────────────────
df_nc = cargar_nowcasting()

ESTIMACIONES_SINTETICAS = {
    "PP": 33.0,
    "PSOE": 28.5,
    "VOX": 12.0,
    "SUMAR": 10.5,
    "Junts": 3.5,
    "PNV": 2.8,
    "ERC": 2.5,
    "EH Bildu": 2.2,
    "CC": 1.0,
    "Otros": 4.0,
}

COLORES_PARTIDO = {
    "PP": "#0056A2",
    "PSOE": "#E4032C",
    "VOX": "#63BE21",
    "SUMAR": "#E60026",
    "Junts": "#00C3B2",
    "PNV": "#CC0000",
    "ERC": "#F2A900",
    "EH Bildu": "#82B540",
    "CC": "#FF6600",
    "Otros": "#AAAAAA",
}

if not df_nc.empty:
    estimaciones_base = {
        row["partido_siglas"]: float(row["estimacion_pct"])
        for _, row in df_nc.iterrows()
        if float(row["estimacion_pct"]) >= 1.0
    }
else:
    estimaciones_base = ESTIMACIONES_SINTETICAS.copy()

# ── Funciones D'Hondt ─────────────────────────────────────────────────────────

def dhondt_provincia(votos_pct: dict, escanos: int, umbral: float = 3.0) -> dict:
    """Aplica D'Hondt a una provincia."""
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
    """
    estimaciones: {partido: pct_voto}
    Returns: {partido: list of escanos per sim}
    """
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


# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "Monte Carlo de Escaños",
    "Escenarios Morfológicos",
    "Variables Estructurales",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: Monte Carlo
# ═══════════════════════════════════════════════════════════════════════════════
with tab1:
    st.subheader("Simulación Monte Carlo de Escaños (D'Hondt)")
    st.markdown(
        "Ajusta las estimaciones de voto y ejecuta **5.000 simulaciones** con D'Hondt nacional "
        "para obtener la distribución de escaños con intervalos de confianza."
    )

    # Sliders de ajuste
    st.markdown("#### Estimaciones de voto base (ajustables)")
    partidos_list = list(estimaciones_base.keys())
    cols_sl = st.columns(min(4, len(partidos_list)))
    estimaciones_ajustadas: dict[str, float] = {}
    for i, partido in enumerate(partidos_list):
        with cols_sl[i % 4]:
            val = st.slider(
                partido,
                min_value=0.5,
                max_value=50.0,
                value=float(estimaciones_base[partido]),
                step=0.5,
                format="%.1f%%",
                key=f"slider_{partido}",
            )
            estimaciones_ajustadas[partido] = val

    total_pct = sum(estimaciones_ajustadas.values())
    if abs(total_pct - 100.0) > 5:
        st.warning(f"La suma de estimaciones es {total_pct:.1f}%. Se normalizará automáticamente al ejecutar.")

    col_run, col_sigma = st.columns([2, 1])
    with col_run:
        ejecutar = st.button("Ejecutar simulación (5.000 iteraciones)", type="primary", use_container_width=True)
    with col_sigma:
        sigma_val = st.number_input("Incertidumbre (sigma)", min_value=0.5, max_value=6.0, value=2.5, step=0.5)

    if ejecutar:
        with st.spinner("Ejecutando 5.000 simulaciones D'Hondt..."):
            resultados_mc = monte_carlo_escanos(estimaciones_ajustadas, n_sims=5000, sigma=float(sigma_val))
        st.session_state["mc_resultados"] = resultados_mc
        st.success("Simulación completada.")

    if "mc_resultados" in st.session_state:
        resultados_mc = st.session_state["mc_resultados"]

        # KPIs resumen
        mayoria_abs_prob = 0.0
        n_sims_total = 5000
        bloques = {
            "izquierda": ["PSOE", "SUMAR", "ERC", "EH Bildu", "BNG"],
            "derecha": ["PP", "VOX"],
            "centro_nac": ["PNV", "Junts", "CC"],
        }
        escanos_izq_sims = []
        escanos_der_sims = []
        for sim_i in range(n_sims_total):
            izq_i = sum(resultados_mc.get(p, [0] * n_sims_total)[sim_i] for p in bloques["izquierda"] if sim_i < len(resultados_mc.get(p, [])))
            der_i = sum(resultados_mc.get(p, [0] * n_sims_total)[sim_i] for p in bloques["derecha"] if sim_i < len(resultados_mc.get(p, [])))
            escanos_izq_sims.append(izq_i)
            escanos_der_sims.append(der_i)

        pp_escanos = resultados_mc.get("PP", [])
        psoe_escanos = resultados_mc.get("PSOE", [])
        if pp_escanos:
            mayoria_abs_prob_pp = sum(1 for x in pp_escanos if x >= 176) / len(pp_escanos) * 100
        else:
            mayoria_abs_prob_pp = 0.0
        if psoe_escanos:
            mayoria_abs_prob_psoe = sum(1 for x in psoe_escanos if x >= 176) / len(psoe_escanos) * 100
        else:
            mayoria_abs_prob_psoe = 0.0

        izq_may = sum(1 for x in escanos_izq_sims if x >= 176) / len(escanos_izq_sims) * 100 if escanos_izq_sims else 0
        der_may = sum(1 for x in escanos_der_sims if x >= 176) / len(escanos_der_sims) * 100 if escanos_der_sims else 0

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("PP mayoría absoluta", f"{mayoria_abs_prob_pp:.1f}%")
        c2.metric("PSOE mayoría absoluta", f"{mayoria_abs_prob_psoe:.1f}%")
        c3.metric("Bloque izquierda >176", f"{izq_may:.1f}%")
        c4.metric("Bloque derecha >176", f"{der_may:.1f}%")

        st.divider()

        # Histogramas por partido
        st.markdown("#### Distribución de escaños por partido")
        partidos_graf = [p for p in resultados_mc if np.mean(resultados_mc[p]) >= 3]
        partidos_graf_sorted = sorted(partidos_graf, key=lambda p: np.mean(resultados_mc[p]), reverse=True)

        cols_hist = st.columns(min(3, len(partidos_graf_sorted)))
        for i, partido in enumerate(partidos_graf_sorted[:9]):
            sims = resultados_mc[partido]
            media = np.mean(sims)
            p5 = np.percentile(sims, 5)
            p95 = np.percentile(sims, 95)
            color = COLORES_PARTIDO.get(partido, "#336699")
            fig_h = go.Figure()
            fig_h.add_trace(go.Histogram(
                x=sims,
                nbinsx=30,
                marker_color=color,
                opacity=0.8,
                name=partido,
            ))
            fig_h.add_vline(x=media, line_dash="dash", line_color="black",
                            annotation_text=f"Media: {media:.0f}", annotation_position="top right")
            fig_h.add_vrect(x0=p5, x1=p95, fillcolor=color, opacity=0.1, line_width=0,
                            annotation_text="IC 90%", annotation_position="top left")
            fig_h.update_layout(
                title=f"{partido} — IC 90%: [{p5:.0f}, {p95:.0f}]",
                height=260,
                showlegend=False,
                plot_bgcolor="white",
                paper_bgcolor="white",
                margin=dict(t=40, b=20, l=30, r=10),
                xaxis_title="Escaños",
                yaxis_title="Frecuencia",
            )
            with cols_hist[i % 3]:
                st.plotly_chart(fig_h, use_container_width=True)

        st.divider()

        # Tabla de intervalos de confianza
        st.markdown("#### Intervalos de confianza (IC 80% y IC 95%)")
        filas_ic = []
        for partido in partidos_graf_sorted:
            sims = resultados_mc[partido]
            filas_ic.append({
                "Partido": partido,
                "Mediana": int(np.median(sims)),
                "Media": round(np.mean(sims), 1),
                "IC 80% inf": int(np.percentile(sims, 10)),
                "IC 80% sup": int(np.percentile(sims, 90)),
                "IC 95% inf": int(np.percentile(sims, 2.5)),
                "IC 95% sup": int(np.percentile(sims, 97.5)),
                "P(>176)": f"{sum(1 for x in sims if x >= 176)/len(sims)*100:.1f}%",
            })
        import pandas as pd
        st.dataframe(pd.DataFrame(filas_ic), hide_index=True, use_container_width=True)

        st.divider()

        # Tabla de probabilidades de coalición
        st.markdown("#### Probabilidad de coaliciones principales")
        COALICIONES = {
            "PP + VOX": ["PP", "VOX"],
            "PP + VOX + CC": ["PP", "VOX", "CC"],
            "PSOE + SUMAR": ["PSOE", "SUMAR"],
            "PSOE + SUMAR + ERC + EH Bildu": ["PSOE", "SUMAR", "ERC", "EH Bildu"],
            "PSOE + SUMAR + Junts": ["PSOE", "SUMAR", "Junts"],
            "PP + PNV": ["PP", "PNV"],
            "Gran coalición PP + PSOE": ["PP", "PSOE"],
        }
        n_sims_r = len(next(iter(resultados_mc.values())))
        filas_coal = []
        for nombre_c, partidos_c in COALICIONES.items():
            escanos_c = []
            for sim_i in range(n_sims_r):
                total_c = sum(resultados_mc.get(p, [0] * n_sims_r)[sim_i] for p in partidos_c)
                escanos_c.append(total_c)
            prob_may = sum(1 for x in escanos_c if x >= 176) / n_sims_r * 100
            media_esc = np.mean(escanos_c)
            filas_coal.append({
                "Coalición": nombre_c,
                "Escaños medios": round(media_esc, 0),
                "P(mayoría absoluta)": f"{prob_may:.1f}%",
                "Viable": "Si" if prob_may > 50 else ("Posible" if prob_may > 20 else "Improbable"),
            })
        filas_coal_sorted = sorted(filas_coal, key=lambda x: float(x["P(mayoría absoluta)"].replace("%", "")), reverse=True)
        st.dataframe(pd.DataFrame(filas_coal_sorted), hide_index=True, use_container_width=True)
    else:
        st.info("Ajusta los sliders y pulsa 'Ejecutar simulación' para ver los resultados.")

        # Vista previa estática con estimaciones base
        st.markdown("#### Vista previa: estimación proporcional de escaños")
        total_nc = sum(estimaciones_ajustadas.values())
        escanos_prev = {
            p: round(v / total_nc * 350)
            for p, v in estimaciones_ajustadas.items()
            if v >= 3.0
        }
        fig_prev = go.Figure(go.Bar(
            x=list(escanos_prev.keys()),
            y=list(escanos_prev.values()),
            text=list(escanos_prev.values()),
            textposition="outside",
            marker_color=[COLORES_PARTIDO.get(p, "#888") for p in escanos_prev],
        ))
        fig_prev.add_hline(y=176, line_dash="dash", line_color="#FFC400",
                           annotation_text="Mayoría absoluta (176)", annotation_position="top right")
        fig_prev.update_layout(height=360, plot_bgcolor="white", paper_bgcolor="white",
                               margin=dict(t=30, b=20), xaxis_title="Partido", yaxis_title="Escaños estimados")
        st.plotly_chart(fig_prev, use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: Escenarios Morfológicos
# ═══════════════════════════════════════════════════════════════════════════════
with tab2:
    st.subheader("Escenarios Morfológicos")
    st.markdown(
        "Seis escenarios de gobierno posibles tras las próximas elecciones, "
        "con sus condiciones, probabilidad estimada y estimación de escaños."
    )

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
            "escanos": {"PSOE": 115, "SUMAR": 32, "PP": 140, "VOX": 28, "ERC": 13, "EH Bildu": 9, "Junts": 7, "PNV": 6},
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
            "escanos": {"PP": 145, "PSOE": 120, "VOX": 40, "SUMAR": 22, "Junts": 9, "ERC": 8, "PNV": 6},
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
            "escanos": {"PP": 148, "PSOE": 112, "VOX": 36, "SUMAR": 28, "Junts": 10, "ERC": 8, "EH Bildu": 8},
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
            "escanos": {"PP": 158, "PSOE": 125, "VOX": 33, "SUMAR": 18, "Junts": 8, "ERC": 5, "PNV": 5},
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
            "escanos": {"PP": 155, "PSOE": 108, "VOX": 38, "SUMAR": 26, "Junts": 9, "ERC": 7, "PNV": 7},
        },
    ]

    BADGE_CLASES = {
        "derecha": ("badge-right", "Bloque derecha"),
        "izquierda": ("badge-left", "Bloque izquierda"),
        "centro": ("badge-center", "Centro / Gran pacto"),
        "bloqueo": ("badge-block", "Bloqueo / Repetición"),
    }

    for esc in ESCENARIOS:
        badge_cls, badge_txt = BADGE_CLASES.get(esc["bloque"], ("badge-center", esc["bloque"]))
        prob_pct = esc["probabilidad"] * 100
        with st.expander(f"{esc['nombre']}  —  {prob_pct:.0f}% probabilidad", expanded=False):
            col_info, col_graf = st.columns([3, 2])

            with col_info:
                st.markdown(
                    f'<span class="prob-badge {badge_cls}">{badge_txt}</span>',
                    unsafe_allow_html=True,
                )
                st.markdown(f"**{esc['descripcion']}**")
                st.markdown("**Condiciones necesarias:**")
                for cond in esc["condiciones"]:
                    st.markdown(f"- {cond}")
                st.markdown(f"**Consecuencias esperadas:** {esc['consecuencias']}")

            with col_graf:
                esc_data = esc["escanos"]
                partidos_e = list(esc_data.keys())
                escanos_e = list(esc_data.values())
                colores_e = [COLORES_PARTIDO.get(p, "#888") for p in partidos_e]
                fig_esc = go.Figure(go.Bar(
                    x=escanos_e,
                    y=partidos_e,
                    orientation="h",
                    marker_color=colores_e,
                    text=escanos_e,
                    textposition="outside",
                ))
                fig_esc.add_vline(x=176, line_dash="dash", line_color="#FFC400",
                                  annotation_text="176", annotation_position="top right")
                fig_esc.update_layout(
                    height=280,
                    title=f"Escaños estimados",
                    plot_bgcolor="white",
                    paper_bgcolor="white",
                    margin=dict(t=40, b=10, l=80, r=40),
                    xaxis_title="Escaños",
                    yaxis=dict(autorange="reversed"),
                )
                st.plotly_chart(fig_esc, use_container_width=True)

            # Barra de probabilidad
            st.progress(esc["probabilidad"], text=f"Probabilidad: {prob_pct:.0f}%")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: Variables Estructurales
# ═══════════════════════════════════════════════════════════════════════════════
with tab3:
    st.subheader("Variables Estructurales y su Impacto Electoral")
    st.markdown(
        "Explora cómo cambios en indicadores macroeconómicos y sociales afectan "
        "las estimaciones electorales mediante reglas de transferencia calibradas."
    )

    # Cargar macro real o sintético
    df_macro = cargar_macro_ultimo()

    MACRO_DEFAULT = {
        "Tasa de Paro (%)": 11.2,
        "IPC General (%)": 2.8,
        "Crec. PIB (%)": 2.1,
        "Sentimiento gobierno (0-10)": 4.2,
        "Prima Riesgo (pb)": 95.0,
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

    st.markdown("#### Ajusta las variables macroeconómicas")
    col_m1, col_m2 = st.columns(2)

    with col_m1:
        paro = st.slider("Tasa de paro (%)", 6.0, 22.0,
                         float(macro_actual.get("Tasa de Paro (%)", 11.2)), 0.5)
        ipc = st.slider("Inflación IPC (%)", -1.0, 12.0,
                        float(macro_actual.get("IPC General (%)", 2.8)), 0.5)
        pib = st.slider("Crecimiento PIB (%)", -4.0, 6.0,
                        float(macro_actual.get("Crec. PIB (%)", 2.1)), 0.25)

    with col_m2:
        sent = st.slider("Sentimiento hacia el gobierno (0-10)", 1.0, 9.0,
                         float(macro_actual.get("Sentimiento gobierno (0-10)", 4.2)), 0.1)
        prima = st.slider("Prima de riesgo (pb)", 20.0, 400.0,
                          float(macro_actual.get("Prima Riesgo (pb)", 95.0)), 5.0)
        vivienda = st.slider("Preocupación por vivienda (% ciudadanos)", 30.0, 95.0, 72.0, 1.0)

    st.divider()

    # Reglas de transferencia simplificadas
    base = estimaciones_base.copy()

    # Paro: cada +1pp paro => PP -0.3, PSOE -0.2, VOX +0.4, SUMAR +0.2
    delta_paro = paro - 11.2
    # IPC: cada +1pp IPC => PP +0.2, PSOE -0.4, VOX +0.2, SUMAR +0.1
    delta_ipc = ipc - 2.8
    # PIB: cada +1pp PIB => PSOE +0.4, PP -0.1
    delta_pib = pib - 2.1
    # Sentimiento gobierno: cada +1 sent => PSOE +0.6, PP -0.3, SUMAR +0.2
    delta_sent = sent - 4.2
    # Prima riesgo: cada +50pb => PP +0.3, PSOE -0.3
    delta_prima = (prima - 95.0) / 50.0
    # Vivienda: cada +10pp preocupación => SUMAR +0.4, PSOE +0.1, PP -0.2
    delta_viv = (vivienda - 72.0) / 10.0

    ajustes = {
        "PP": -0.3 * delta_paro + 0.2 * delta_ipc - 0.1 * delta_pib - 0.3 * delta_sent + 0.3 * delta_prima - 0.2 * delta_viv,
        "PSOE": -0.2 * delta_paro - 0.4 * delta_ipc + 0.4 * delta_pib + 0.6 * delta_sent - 0.3 * delta_prima + 0.1 * delta_viv,
        "VOX": 0.4 * delta_paro + 0.2 * delta_ipc - 0.3 * delta_pib - 0.2 * delta_sent + 0.1 * delta_prima,
        "SUMAR": 0.2 * delta_paro + 0.1 * delta_ipc - 0.1 * delta_pib + 0.2 * delta_sent + 0.4 * delta_viv,
    }

    st.markdown("#### Impacto estimado en la intención de voto")
    col_tab_a, col_tab_b = st.columns(2)

    with col_tab_a:
        st.markdown("**Variación respecto al escenario base (pp)**")
        filas_aj = []
        for partido, delta in ajustes.items():
            base_val = base.get(partido, 0)
            nuevo_val = max(0.5, base_val + delta)
            filas_aj.append({
                "Partido": partido,
                "Base (%)": f"{base_val:.1f}",
                "Ajustado (%)": f"{nuevo_val:.1f}",
                "Delta (pp)": f"{delta:+.2f}",
            })
        import pandas as pd
        st.dataframe(pd.DataFrame(filas_aj), hide_index=True, use_container_width=True)

    with col_tab_b:
        fig_delta = go.Figure()
        deltas_vals = list(ajustes.values())
        deltas_labels = list(ajustes.keys())
        colores_delta = ["#2ecc71" if d >= 0 else "#e74c3c" for d in deltas_vals]
        fig_delta.add_trace(go.Bar(
            x=deltas_labels,
            y=deltas_vals,
            marker_color=colores_delta,
            text=[f"{d:+.2f}pp" for d in deltas_vals],
            textposition="outside",
        ))
        fig_delta.add_hline(y=0, line_color="black", line_width=1)
        fig_delta.update_layout(
            title="Variación en pp vs. escenario base",
            height=300,
            plot_bgcolor="white",
            paper_bgcolor="white",
            margin=dict(t=40, b=20),
            yaxis_title="Variación (pp)",
        )
        st.plotly_chart(fig_delta, use_container_width=True)

    st.divider()
    st.markdown("#### Explicación de las reglas de transferencia")
    reglas_info = {
        "Tasa de paro": "Un paro elevado penaliza al partido en el gobierno y beneficia a partidos de oposición extrema (VOX) y a la izquierda alternativa (SUMAR).",
        "Inflación (IPC)": "La inflación alta castiga especialmente al PSOE como partido de gobierno. El PP capitaliza el descontento económico moderado.",
        "Crecimiento del PIB": "El crecimiento beneficia directamente al partido en el gobierno (PSOE). Un PIB fuerte reduce el voto de protesta.",
        "Sentimiento hacia el gobierno": "El indicador más directo: mayor valoración del gobierno implica transferencia de voto hacia PSOE y SUMAR.",
        "Prima de riesgo": "Una prima alta señala inestabilidad financiera y beneficia al discurso de austeridad del PP. Perjudica al gobierno.",
        "Preocupación por vivienda": "A mayor preocupación por acceso a vivienda, mayor beneficio para SUMAR y la izquierda, que han capitalizado este tema.",
    }
    for var, explicacion in reglas_info.items():
        with st.expander(var):
            st.markdown(explicacion)
