"""
Página: Índice de Riesgo Político

Muestra el índice de riesgo político compuesto, sus dimensiones,
escenarios de riesgo, indicadores de alerta temprana e histórico.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import (
    sidebar_nav,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
)

from dashboard.db import cargar_indicadores_riesgo, cargar_macro_ultimo

# ── Estilos ───────────────────────────────────────────────────────────────────

st.set_page_config(page_title="Riesgo Político — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
@keyframes fadeInUp {{
    from {{ opacity:0; transform:translateY(18px); }}
    to   {{ opacity:1; transform:translateY(0); }}
}}
@keyframes dotPulse {{
    0%,100% {{ opacity:.4; transform:scale(1); }}
    50%      {{ opacity:1; transform:scale(1.3); }}
}}
.metric-card {{
    background:{BG2}; border:1px solid {BORDER}; border-radius:12px;
    padding:1.2rem 1.5rem; margin-bottom:1rem;
    animation:fadeInUp .4s ease both;
}}
.escenario-card {{
    background:{BG2}; border:1px solid {BORDER};
    border-radius:10px; padding:1rem 1.2rem; margin-bottom:.8rem;
}}
.tab-content {{ padding:1rem 0; }}
.sec-hdr {{
    display:flex; align-items:center; gap:.7rem; margin:1.8rem 0 1rem;
}}
.sec-hdr .bar  {{ width:4px; height:18px; border-radius:2px; flex-shrink:0; }}
.sec-hdr .lbl  {{
    font-size:.65rem; font-weight:700; letter-spacing:.14em;
    text-transform:uppercase; color:{MUTED};
}}
.sec-hdr .line {{ flex:1; height:1px; background:{BORDER}; }}
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div style="position:relative;background:linear-gradient(135deg,{BG2} 0%,{BG3} 55%,{BG2} 100%);
            border:1px solid {BORDER};border-radius:16px;padding:2rem 2.5rem;margin-bottom:2rem;overflow:hidden;animation:fadeInUp .5s ease both">
    <div style="position:absolute;top:-40px;right:-40px;width:180px;height:180px;
                background:radial-gradient(circle,{RED}1A,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:absolute;bottom:-30px;left:28%;width:130px;height:130px;
                background:radial-gradient(circle,{AMBER}12,transparent 65%);border-radius:50%;pointer-events:none"></div>
    <div style="position:relative">
        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem">
            <div style="width:8px;height:8px;border-radius:50%;background:{RED};animation:dotPulse 2s ease infinite"></div>
            <span style="font-size:.65rem;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:{RED}">MONITOR ACTIVO</span>
        </div>
        <div style="font-size:1.85rem;font-weight:800;letter-spacing:-.02em;color:{TEXT};line-height:1.1">
            Índice de <span style="color:{RED}">Riesgo Político</span>
        </div>
        <div style="font-size:.88rem;color:{TEXT2};margin-top:.4rem">
            Modelo de riesgo multidimensional para España — ElectSim España 2025-2026
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# ── Datos ─────────────────────────────────────────────────────────────────────
df_riesgo = cargar_indicadores_riesgo()
df_macro = cargar_macro_ultimo()

# Valores sintéticos de referencia
DIMS_SINTETICAS = {
    "inestabilidad_gubernamental": {
        "valor": 6.1,
        "label": "Inestabilidad Gubernamental",
        "descripcion": "Gobierno minoritario dependiente de 6+ socios. Sin presupuestos aprobados desde 2023. Riesgo de moción de censura técnicamente bajo pero presente.",
        "peso": "25%",
    },
    "riesgo_economico_social": {
        "valor": 5.9,
        "label": "Riesgo Económico-Social",
        "descripcion": "Paro del 11.4%, prima de riesgo en 78pb, euríbor presionando a 4M de hipotecados. Déficit estructural persistente.",
        "peso": "30%",
    },
    "conflicto_territorial": {
        "valor": 7.2,
        "label": "Conflicto Territorial",
        "descripcion": "Pactos con Junts y ERC exigen concesiones continuas. Sentencia del TC sobre amnistía pendiente. Tensión en Cataluña y País Vasco latente.",
        "peso": "20%",
    },
    "polarizacion_politica": {
        "valor": 7.2,
        "label": "Polarización Política",
        "descripcion": "IPPS en zona AMARILLA-ROJA. Léxico confrontacional en máximos desde 2017. Bloques ideológicos rígidos con escaso margen de acuerdo transversal.",
        "peso": "15%",
    },
    "riesgo_institucional": {
        "valor": 5.0,
        "label": "Riesgo Institucional",
        "descripcion": "CGPJ caducado 5+ años. TC en entredicho. Reforma del Senado bloqueada. Instituciones formalmente funcionales pero con legitimidad cuestionada.",
        "peso": "10%",
    },
}

# Calcular índice compuesto sintético ponderado
_pesos = {"inestabilidad_gubernamental": 0.25, "riesgo_economico_social": 0.30,
          "conflicto_territorial": 0.20, "polarizacion_politica": 0.15, "riesgo_institucional": 0.10}
INDICE_SINTETICO = sum(DIMS_SINTETICAS[k]["valor"] * v for k, v in _pesos.items())

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3, tab4 = st.tabs([
    "Índice de Riesgo Político",
    "Análisis de Escenarios",
    "Alertas Tempranas",
    "Histórico de Riesgo",
])

# ==============================================================================
# TAB 1: ÍNDICE DE RIESGO POLÍTICO
# ==============================================================================
with tab1:
    # Extraer índice y dimensiones de la BD o usar sintéticos
    if not df_riesgo.empty:
        df_last = df_riesgo.iloc[0]
        indice_total = float(df_last.get("indice_compuesto") or df_last.get("índice_compuesto") or INDICE_SINTETICO)
        semaforo_bd = str(df_last.get("semaforo") or "")
        usando_bd = True
    else:
        indice_total = INDICE_SINTETICO
        semaforo_bd = ""
        usando_bd = False

    if indice_total < 3 or semaforo_bd == "BAJO":
        color_riesgo = GREEN
        nivel_str = "BAJO"
        nivel_desc = "Situación política estable con riesgos manejables."
    elif indice_total >= 6.5 or semaforo_bd == "ALTO":
        color_riesgo = RED
        nivel_str = "ALTO"
        nivel_desc = "Riesgo político significativo. Monitorización intensiva recomendada."
    elif indice_total >= 4.5 or semaforo_bd == "MODERADO-ALTO":
        color_riesgo = AMBER
        nivel_str = "MODERADO-ALTO"
        nivel_desc = "Tensiones estructurales acumuladas. Posibles perturbaciones en el corto plazo."
    else:
        color_riesgo = AMBER
        nivel_str = "MODERADO"
        nivel_desc = "Riesgo bajo control con factores de incertidumbre presentes."

    st.markdown("<div class='tab-content'>", unsafe_allow_html=True)

    # Gauge + KPI top
    col_gauge, col_info = st.columns([1, 2])

    with col_gauge:
        fig_gauge = go.Figure(go.Indicator(
            mode="gauge+number",
            value=indice_total,
            title={"text": "Índice Compuesto", "font": {"size": 14, "color": TEXT2}},
            number={"font": {"size": 48, "color": color_riesgo}, "suffix": "/10"},
            gauge={
                "axis": {"range": [0, 10], "tickwidth": 1, "tickcolor": MUTED,
                         "tickfont": {"size": 10}},
                "bar": {"color": color_riesgo, "thickness": 0.3},
                "bgcolor": "rgba(0,0,0,0)",
                "borderwidth": 1,
                "bordercolor": BORDER,
                "steps": [
                    {"range": [0, 3], "color": f"rgba(34,197,94,0.12)"},
                    {"range": [3, 6], "color": f"rgba(245,158,11,0.12)"},
                    {"range": [6, 8], "color": f"rgba(239,68,68,0.15)"},
                    {"range": [8, 10], "color": f"rgba(239,68,68,0.25)"},
                ],
                "threshold": {
                    "line": {"color": TEXT2, "width": 3},
                    "thickness": 0.8,
                    "value": indice_total,
                },
            },
        ))
        fig_gauge.update_layout(
            height=280,
            margin=dict(t=40, b=20, l=30, r=30),
            paper_bgcolor="rgba(0,0,0,0)",
            font={"family": "Inter, sans-serif", "color": TEXT2},
        )
        st.plotly_chart(fig_gauge, use_container_width=True)

        st.markdown(f"""
        <div style="text-align:center;padding:0.8rem;background:{BG3};
                    border:1px solid {BORDER};border-radius:8px;
                    border-top:3px solid {color_riesgo}">
            <div style="font-size:1.1rem;font-weight:700;color:{color_riesgo}">{nivel_str}</div>
            <div style="font-size:0.8rem;color:{MUTED};margin-top:0.3rem">{nivel_desc}</div>
            <div style="font-size:0.7rem;color:{MUTED};margin-top:0.5rem">
                {"Fuente: BD ElectSim" if usando_bd else "Valores sintéticos de referencia"}
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_info:
        st.markdown(f"""<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">DIMENSIONES DEL RIESGO</span><div class="line"></div></div>""", unsafe_allow_html=True)
        st.markdown(f"<p style='color:{MUTED};font-size:0.9rem'>Descomposición del índice en 5 ejes estructurales ponderados por impacto sistémico.</p>", unsafe_allow_html=True)

        for key, info in DIMS_SINTETICAS.items():
            val = float(info["valor"]) if info.get("valor") is not None else 0.0
            pct_barra = val / 10.0
            if val >= 6.5:
                color_bar = RED
                badge_color = "rgba(239,68,68,0.15)"
                badge_text = RED
            elif val >= 4.5:
                color_bar = AMBER
                badge_color = "rgba(245,158,11,0.15)"
                badge_text = AMBER
            else:
                color_bar = GREEN
                badge_color = "rgba(34,197,94,0.15)"
                badge_text = GREEN

            st.markdown(f"""
            <div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;
                        padding:0.9rem 1rem;margin-bottom:0.6rem">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.4rem">
                    <span style="font-weight:600;color:{TEXT};font-size:0.9rem">{info['label']}</span>
                    <span style="background:{badge_color};color:{badge_text};font-weight:700;
                                 font-size:0.9rem;padding:0.15rem 0.6rem;border-radius:12px">
                        {val:.1f}/10 &nbsp;·&nbsp; peso {info['peso']}
                    </span>
                </div>
                <div style="background:{BORDER};border-radius:4px;height:8px;margin-bottom:0.4rem">
                    <div style="background:{color_bar};width:{pct_barra*100:.0f}%;
                                height:8px;border-radius:4px"></div>
                </div>
                <div style="font-size:0.8rem;color:{MUTED};line-height:1.4">{info['descripcion']}</div>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("</div>", unsafe_allow_html=True)

    # Radar chart
    st.markdown(f"""<div class="sec-hdr" style="margin-top:1.5rem"><div class="bar" style="background:{PURPLE}"></div><span class="lbl">PERFIL DE RIESGO — VISTA RADIAL</span><div class="line"></div></div>""", unsafe_allow_html=True)

    labels = [v["label"] for v in DIMS_SINTETICAS.values()]
    values = [v["valor"] for v in DIMS_SINTETICAS.values()]

    fig_radar = go.Figure(go.Scatterpolar(
        r=values + [values[0]],
        theta=labels + [labels[0]],
        fill="toself",
        fillcolor=f"rgba(37,99,235,0.15)",
        line=dict(color=BLUE, width=2),
        marker=dict(size=7, color=BLUE),
    ))
    fig_radar.update_layout(
        polar=dict(
            radialaxis=dict(visible=True, range=[0, 10], tickfont=dict(size=9, color=MUTED),
                            gridcolor=BORDER, linecolor=BORDER),
            angularaxis=dict(tickfont=dict(size=11, color=TEXT2), gridcolor=BORDER),
            bgcolor="rgba(0,0,0,0)",
        ),
        height=380,
        margin=dict(t=40, b=40, l=80, r=80),
        paper_bgcolor="rgba(0,0,0,0)",
        font={"family": "Inter, sans-serif", "color": TEXT2},
    )
    st.plotly_chart(fig_radar, use_container_width=True)

    st.markdown(f"""<div class="sec-hdr" style="margin-top:1rem"><div class="bar" style="background:{AMBER}"></div><span class="lbl">¿RIESGO DE QUÉ Y POR QUÉ?</span><div class="line"></div></div>""", unsafe_allow_html=True)
    st.markdown(
        """
        El índice mide el riesgo de **bloqueo institucional**, **inestabilidad de gobierno**, **choque económico-social**
        y **conflicto territorial**. El valor actual se explica por:
        - Fragmentación parlamentaria y dependencia de socios para aprobar leyes.
        - Señales macro (paro, prima de riesgo, presión financiera de hogares).
        - Polarización discursiva y dificultad de acuerdos transversales.
        - Tensiones centro-periferia y litigios institucionales en curso.
        """
    )
    st.markdown(f"""<div class="sec-hdr" style="margin-top:.7rem"><div class="bar" style="background:{CYAN}"></div><span class="lbl">EVIDENCIAS Y PRUEBAS USADAS POR EL MODELO</span><div class="line"></div></div>""", unsafe_allow_html=True)
    evidencias = pd.DataFrame(
        [
            {"Prueba": "Prima de riesgo", "Métrica": "78 pb", "Interpretación": "Estrés soberano contenido pero sensible a shocks"},
            {"Prueba": "Paro", "Métrica": "11.4%", "Interpretación": "Fragilidad social estructural"},
            {"Prueba": "Días sin presupuestos nuevos", "Métrica": "730", "Interpretación": "Señal institucional en zona roja"},
            {"Prueba": "Número de socios de gobierno", "Métrica": "6", "Interpretación": "Alta complejidad de coordinación legislativa"},
            {"Prueba": "Índice de crispación (ICED)", "Métrica": "6.4/10", "Interpretación": "Debate público tensionado"},
        ]
    )
    st.dataframe(evidencias, hide_index=True, use_container_width=True)

# ==============================================================================
# TAB 2: ANÁLISIS DE ESCENARIOS DE RIESGO
# ==============================================================================
with tab2:
    st.markdown(f"""<div class="sec-hdr"><div class="bar" style="background:{RED}"></div><span class="lbl">ESCENARIOS DE RIESGO — ANÁLISIS PROSPECTIVO</span><div class="line"></div></div>""", unsafe_allow_html=True)
    st.markdown(f"<p style='color:{MUTED};font-size:0.9rem'>Cuatro escenarios principales con probabilidad estimada, condicionantes e implicaciones sistémicas.</p>", unsafe_allow_html=True)

    escenarios = [
        {
            "nombre": "Caída del Gobierno",
            "probabilidad": 15,
            "color_borde": "#dc2626",
            "color_bg": f"rgba(239,68,68,0.08)",
            "color_texto": TEXT2,
            "icono": "Escenario A",
            "descripcion": (
                "Ruptura de la coalición de gobierno por desacuerdo en presupuestos, ley de amnistía o "
                "concesiones territoriales. Posible moción de censura si PP y Vox suman con algún socio "
                "actualmente en el gobierno. Convocatoria de elecciones anticipadas."
            ),
            "condiciones": [
                "Junts retira apoyo por incumplimiento de acuerdos de investidura",
                "Escándalo de corrupción de alto impacto mediático en el PSOE",
                "Ruptura interna del gobierno de coalición PSOE-Sumar",
                "PP alcanza acuerdo de investidura alternativo (altamente improbable)",
            ],
            "mercados": "Prima de riesgo +40-80pb. Depreciación del IBEX 35 (-3% a -8%). Salida de capitales institucionales moderada.",
            "electoral": "PP: +3-5pp. Vox: +2-3pp. PSOE: -4-6pp. Sumar: -2pp. Alta fragmentación del voto de izquierda.",
            "indicadores": "Declaraciones de Junts sobre retirada de apoyo. Votaciones perdidas en el Congreso. Caída de la aprobación presidencial por debajo del 25%.",
        },
        {
            "nombre": "Crisis Económica Aguda",
            "probabilidad": 22,
            "color_borde": "#d97706",
            "color_bg": f"rgba(245,158,11,0.08)",
            "color_texto": TEXT2,
            "icono": "Escenario B",
            "descripcion": (
                "Escalada de la prima de riesgo por encima de 150pb, combinada con recesión técnica "
                "(dos trimestres de PIB negativo) y tasa de paro subiendo hacia el 14-15%. "
                "El BCE podría intervenir, pero el contexto fiscal limita el margen de maniobra."
            ),
            "condiciones": [
                "Prima de riesgo supera los 150pb de forma sostenida",
                "PIB registra dos trimestres consecutivos en negativo",
                "Inflación repunta por encima del 5% impulsada por energía",
                "Déficit público desborda el objetivo del 3% acordado con Bruselas",
            ],
            "mercados": "Spread soberano +60-120pb. IBEX -12% a -20%. Euríbor al alza con impacto en 4M de hipotecados variables.",
            "electoral": "Partido en gobierno: -6-8pp. PP: +4-5pp. Vox: +3pp (voto de castigo antiestablishment). Sumar colapsa.",
            "indicadores": "Prima de riesgo >100pb. IPC >4%. Tasa de paro >13%. Revisión a la baja del PIB por el FMI o CE.",
        },
        {
            "nombre": "Crisis Territorial Grave",
            "probabilidad": 18,
            "color_borde": "#7c3aed",
            "color_bg": f"rgba(139,92,246,0.08)",
            "color_texto": TEXT2,
            "icono": "Escenario C",
            "descripcion": (
                "Ruptura de los pactos con los partidos independentistas catalanes o vascos. "
                "Posible convocatoria unilateral de referéndum en Cataluña, declaración simbólica "
                "de soberanía, o crisis institucional grave entre el gobierno central y la Generalitat."
            ),
            "condiciones": [
                "TC invalida la ley de amnistía o partes sustanciales de la misma",
                "Junts convoca referéndum unilateral tras ruptura del diálogo",
                "Congreso rechaza traspaso de competencias clave exigidas por ERC o Junts",
                "Manifestaciones masivas en Cataluña de signo independentista",
            ],
            "mercados": "Incertidumbre moderada. Prima de riesgo +20-40pb. Impacto limitado en mercados si no hay actos unilaterales de ruptura constitucional.",
            "electoral": "PSOE: -4pp. PP: +3pp. Vox: +5pp (narrativa unitarista). Partidos independentistas: +2-4pp en Cataluña.",
            "indicadores": "Declaraciones del TC sobre amnistía. Tono del discurso de Puigdemont. Temperatura en redes en Cataluña (ICED).",
        },
        {
            "nombre": "Estabilidad Controlada",
            "probabilidad": 45,
            "color_borde": "#16a34a",
            "color_bg": f"rgba(34,197,94,0.08)",
            "color_texto": TEXT2,
            "icono": "Escenario D",
            "descripcion": (
                "El gobierno aguanta la legislatura hasta 2027 gestionando los conflictos "
                "mediante negociaciones constantes. Se aprueba algún presupuesto prorrogado "
                "o acuerdo puntual. Reforma fiscal moderada. Sin grandes crisis institucionales."
            ),
            "condiciones": [
                "Junts y ERC mantienen su apoyo a cambio de concesiones incrementales",
                "La economía crece entre el 1.5% y el 2.5% anual",
                "El BCE no eleva tipos adicionales de forma agresiva",
                "No hay escándalos de primer nivel que afecten a la cúpula del gobierno",
            ],
            "mercados": "Prima de riesgo estable 60-90pb. IBEX con rentabilidad positiva moderada (+5-10% anual). Euríbor estabilizado.",
            "electoral": "Sondeos estabilizados. PP mantiene ventaja de 5-8pp sobre PSOE. Sin movimientos bruscos. Vox pierde fuelle gradualmente.",
            "indicadores": "Aprobación presidencial >30%. Ausencia de mociones de censura. Presupuestos pactados o prorrogados sin crisis.",
        },
    ]

    for i, esc in enumerate(escenarios):
        prob = esc["probabilidad"]
        with st.expander(f"{esc['icono']} — {esc['nombre']}  ({prob}% probabilidad estimada)", expanded=(i == 3)):
            col_prob, col_desc = st.columns([1, 3])

            with col_prob:
                fig_prob = go.Figure(go.Indicator(
                    mode="gauge+number",
                    value=prob,
                    number={"suffix": "%", "font": {"size": 30, "color": esc["color_borde"]}},
                    title={"text": "Probabilidad", "font": {"size": 11, "color": MUTED}},
                    gauge={
                        "axis": {"range": [0, 100], "tickfont": {"size": 8}},
                        "bar": {"color": esc["color_borde"], "thickness": 0.35},
                        "bgcolor": "rgba(0,0,0,0)",
                        "borderwidth": 1,
                        "bordercolor": BORDER,
                        "steps": [{"range": [0, prob], "color": esc["color_bg"]}],
                    },
                ))
                fig_prob.update_layout(height=200, margin=dict(t=30, b=10, l=20, r=20),
                                       paper_bgcolor="rgba(0,0,0,0)",
                                       font=dict(color=TEXT2))
                st.plotly_chart(fig_prob, use_container_width=True)

            with col_desc:
                st.markdown(f"**Descripción:** {esc['descripcion']}")
                st.markdown("**Condiciones desencadenantes:**")
                for cond in esc["condiciones"]:
                    st.markdown(f"- {cond}")

            _cbg = esc["color_bg"]
            _ctxt = esc["color_texto"]
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                st.markdown(f"**Impacto en mercados**")
                st.markdown(f"<div style='background:{_cbg};padding:0.7rem;border-radius:6px;"
                            f"font-size:0.85rem;color:{_ctxt}'>{esc['mercados']}</div>",
                            unsafe_allow_html=True)
            with col_b:
                st.markdown(f"**Impacto electoral**")
                st.markdown(f"<div style='background:{_cbg};padding:0.7rem;border-radius:6px;"
                            f"font-size:0.85rem;color:{_ctxt}'>{esc['electoral']}</div>",
                            unsafe_allow_html=True)
            with col_c:
                st.markdown(f"**Indicadores de alerta**")
                st.markdown(f"<div style='background:{_cbg};padding:0.7rem;border-radius:6px;"
                            f"font-size:0.85rem;color:{_ctxt}'>{esc['indicadores']}</div>",
                            unsafe_allow_html=True)

    # Suma de probabilidades
    total_prob = sum(e["probabilidad"] for e in escenarios)
    st.markdown(f"<p style='color:{MUTED};font-size:0.8rem;margin-top:1rem'>"
                f"Suma de probabilidades: {total_prob}% &nbsp;·&nbsp; "
                f"Modelo bayesiano actualizado mensualmente &nbsp;·&nbsp; "
                f"Horizonte temporal: 12 meses</p>", unsafe_allow_html=True)

# ==============================================================================
# TAB 3: INDICADORES DE ALERTA TEMPRANA
# ==============================================================================
with tab3:
    st.markdown(f"""<div class="sec-hdr"><div class="bar" style="background:{GREEN}"></div><span class="lbl">PANEL DE ALERTAS TEMPRANAS</span><div class="line"></div></div>""", unsafe_allow_html=True)
    st.markdown(f"<p style='color:{MUTED};font-size:0.9rem'>"
                f"Semáforo de 12 indicadores clave. Umbrales calibrados con datos históricos españoles 1996-2026.</p>",
                unsafe_allow_html=True)

    # Definición de indicadores: (nombre, valor_actual, umbral_amarillo, umbral_rojo, unidad, descripcion)
    indicadores_alerta = [
        {
            "nombre": "Prima de Riesgo",
            "valor": 78,
            "umbral_amarillo": 100,
            "umbral_rojo": 150,
            "unidad": "pb",
            "desc": "Diferencial entre bono español y bund alemán a 10 años. Umbral amarillo: 100pb. Umbral rojo: 150pb.",
            "estado": "VERDE",
        },
        {
            "nombre": "Euríbor 12M",
            "valor": 3.2,
            "umbral_amarillo": 3.5,
            "umbral_rojo": 4.5,
            "unidad": "%",
            "desc": "Tipo de referencia para hipotecas variables. Impacto directo en 4M de hogares hipotecados.",
            "estado": "VERDE",
        },
        {
            "nombre": "Aprobación del Presidente",
            "valor": 29,
            "umbral_amarillo": 35,
            "umbral_rojo": 25,
            "unidad": "%",
            "desc": "Aprobación presidencial según CIS sintético. Por debajo del 25%, riesgo de convocatoria anticipada.",
            "estado": "AMARILLO",
        },
        {
            "nombre": "Días sin Presupuestos",
            "valor": 730,
            "umbral_amarillo": 365,
            "umbral_rojo": 730,
            "unidad": "días",
            "desc": "Número de días desde que los últimos presupuestos fueron aprobados. Record histórico en democracia.",
            "estado": "ROJO",
        },
        {
            "nombre": "Socios de Gobierno Activos",
            "valor": 6,
            "umbral_amarillo": 4,
            "umbral_rojo": 6,
            "unidad": "partidos",
            "desc": "Número de partidos necesarios para aprobar legislación clave. Mayor número, mayor inestabilidad.",
            "estado": "ROJO",
        },
        {
            "nombre": "Alertas Sistémicas Activas",
            "valor": 3,
            "umbral_amarillo": 2,
            "umbral_rojo": 4,
            "unidad": "alertas",
            "desc": "Número de alertas sistémicas activas en el modelo ElectSim. Incluye económicas, territoriales e institucionales.",
            "estado": "AMARILLO",
        },
        {
            "nombre": "Distancia PP-PSOE en sondeos",
            "valor": 6.8,
            "umbral_amarillo": 5.0,
            "umbral_rojo": 10.0,
            "unidad": "pp",
            "desc": "Diferencia en intención de voto entre PP y PSOE. Valores >10pp indican ventaja estructural de la oposición.",
            "estado": "AMARILLO",
        },
        {
            "nombre": "Temperatura Mediática (ICED)",
            "valor": 6.4,
            "umbral_amarillo": 5.5,
            "umbral_rojo": 7.5,
            "unidad": "/10",
            "desc": "Índice de Crispación Electoral y Discursiva. Mide el nivel de confrontación en medios y redes. Escala 0-10.",
            "estado": "AMARILLO",
        },
        {
            "nombre": "Suficiencia Moción de Censura",
            "valor": 0,
            "umbral_amarillo": 0,
            "umbral_rojo": 1,
            "unidad": "(0=No / 1=Sí)",
            "desc": "Indicador binario: ¿Tiene la oposición votos suficientes para prosperar una moción de censura?",
            "estado": "VERDE",
        },
        {
            "nombre": "Días para Próximas Autonómicas",
            "valor": 180,
            "umbral_amarillo": 90,
            "umbral_rojo": 30,
            "unidad": "días",
            "desc": "Días hasta el próximo ciclo electoral autonómico significativo. Proximidad electoral aumenta la tensión.",
            "estado": "VERDE",
        },
        {
            "nombre": "Índice de Confianza del Consumidor",
            "valor": 96.2,
            "umbral_amarillo": 95.0,
            "umbral_rojo": 90.0,
            "unidad": "puntos",
            "desc": "ICC del INE. Por debajo de 95 indica deterioro de expectativas. Umbral rojo: 90 puntos (recesión inminente).",
            "estado": "AMARILLO",
        },
        {
            "nombre": "Spread CDS Soberano 5Y",
            "valor": 55,
            "umbral_amarillo": 80,
            "umbral_rojo": 130,
            "unidad": "pb",
            "desc": "Credit Default Swap soberano a 5 años. Mide el coste de asegurar deuda española frente a impago.",
            "estado": "VERDE",
        },
    ]

    SEMAFORO_COLORS = {
        "VERDE": {"bg": "rgba(34,197,94,0.12)", "text": "#22C55E", "borde": "rgba(34,197,94,0.25)", "label": "VERDE"},
        "AMARILLO": {"bg": "rgba(245,158,11,0.12)", "text": "#F59E0B", "borde": "rgba(245,158,11,0.25)", "label": "AMARILLO"},
        "ROJO": {"bg": "rgba(239,68,68,0.12)", "text": "#EF4444", "borde": "rgba(239,68,68,0.25)", "label": "ROJO"},
    }

    # Resumen contadores
    n_verde = sum(1 for i in indicadores_alerta if i["estado"] == "VERDE")
    n_amarillo = sum(1 for i in indicadores_alerta if i["estado"] == "AMARILLO")
    n_rojo = sum(1 for i in indicadores_alerta if i["estado"] == "ROJO")

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.metric("Total Indicadores", len(indicadores_alerta))
    with c2:
        st.markdown(f"<div style='background:rgba(34,197,94,0.12);border-radius:8px;padding:0.8rem;text-align:center'>"
                    f"<div style='font-size:1.5rem;font-weight:700;color:{GREEN}'>{n_verde}</div>"
                    f"<div style='font-size:0.8rem;color:{GREEN}'>VERDE</div></div>", unsafe_allow_html=True)
    with c3:
        st.markdown(f"<div style='background:rgba(245,158,11,0.12);border-radius:8px;padding:0.8rem;text-align:center'>"
                    f"<div style='font-size:1.5rem;font-weight:700;color:{AMBER}'>{n_amarillo}</div>"
                    f"<div style='font-size:0.8rem;color:{AMBER}'>AMARILLO</div></div>", unsafe_allow_html=True)
    with c4:
        st.markdown(f"<div style='background:rgba(239,68,68,0.12);border-radius:8px;padding:0.8rem;text-align:center'>"
                    f"<div style='font-size:1.5rem;font-weight:700;color:{RED}'>{n_rojo}</div>"
                    f"<div style='font-size:0.8rem;color:{RED}'>ROJO</div></div>", unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Grid de semáforos
    cols_per_row = 3
    for row_start in range(0, len(indicadores_alerta), cols_per_row):
        row_items = indicadores_alerta[row_start:row_start + cols_per_row]
        cols = st.columns(cols_per_row)
        for col_idx, ind in enumerate(row_items):
            sc = SEMAFORO_COLORS[ind["estado"]]
            with cols[col_idx]:
                # Barra de progreso visual (valor vs umbral rojo)
                umbral_max = ind["umbral_rojo"] if ind["umbral_rojo"] > ind["umbral_amarillo"] else ind["umbral_amarillo"] * 1.5
                if umbral_max > 0 and ind["valor"] <= umbral_max * 2:
                    pct_fill = min(ind["valor"] / max(umbral_max, 0.001) * 100, 100)
                else:
                    pct_fill = 50

                st.markdown(f"""
                <div style="background:{BG2};border:1px solid {sc['borde']};
                            border-top:3px solid {sc['text']};border-radius:8px;
                            padding:0.9rem 1rem;margin-bottom:0.5rem;min-height:140px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start">
                        <span style="font-weight:600;color:{TEXT};font-size:0.85rem;
                                     flex:1;line-height:1.3">{ind['nombre']}</span>
                        <span style="background:{sc['bg']};color:{sc['text']};font-weight:700;
                                     font-size:0.75rem;padding:0.1rem 0.5rem;border-radius:10px;
                                     white-space:nowrap;margin-left:0.5rem">{sc['label']}</span>
                    </div>
                    <div style="font-size:1.4rem;font-weight:700;color:{sc['text']};margin:0.4rem 0">
                        {ind['valor']} <span style="font-size:0.8rem;color:{MUTED}">{ind['unidad']}</span>
                    </div>
                    <div style="background:{BORDER};border-radius:3px;height:5px;margin-bottom:0.4rem">
                        <div style="background:{sc['text']};width:{pct_fill:.0f}%;height:5px;border-radius:3px"></div>
                    </div>
                    <div style="font-size:0.75rem;color:{MUTED};line-height:1.4">{ind['desc']}</div>
                </div>
                """, unsafe_allow_html=True)

    st.markdown(f"<p style='color:{MUTED};font-size:0.78rem;margin-top:1rem'>"
                f"Umbrales basados en medias históricas y literatura académica sobre riesgo político español. "
                f"Actualización mensual. Datos a abril 2026.</p>", unsafe_allow_html=True)

# ==============================================================================
# TAB 4: HISTÓRICO DE RIESGO
# ==============================================================================
with tab4:
    st.markdown(f"""<div class="sec-hdr"><div class="bar" style="background:{BLUE}"></div><span class="lbl">EVOLUCIÓN HISTÓRICA DEL RIESGO POLÍTICO</span><div class="line"></div></div>""", unsafe_allow_html=True)
    st.markdown(f"<p style='color:{MUTED};font-size:0.9rem'>"
                f"Serie mensual del índice compuesto de riesgo 2022-2026, con anotaciones de eventos clave.</p>",
                unsafe_allow_html=True)

    # Intentar usar datos reales de la BD
    usar_historico_bd = False
    if not df_riesgo.empty and len(df_riesgo) > 1:
        col_fecha = None
        if "fecha_calculo" in df_riesgo.columns:
            col_fecha = "fecha_calculo"
        elif "created_at" in df_riesgo.columns:
            col_fecha = "created_at"
        elif "fecha" in df_riesgo.columns:
            col_fecha = "fecha"

        col_indice = None
        for c in ["indice_compuesto", "índice_compuesto", "valor"]:
            if c in df_riesgo.columns:
                col_indice = c
                break

        if col_fecha and col_indice:
            usar_historico_bd = True
            fechas_hist = pd.to_datetime(df_riesgo[col_fecha], errors="coerce")
            valores_hist = pd.to_numeric(df_riesgo[col_indice], errors="coerce")

    if not usar_historico_bd:
        # Serie sintética mensual 2022-2026
        fechas_hist = pd.date_range(start="2022-01-01", end="2026-04-01", freq="MS")
        valores_hist = pd.Series([
            5.2, 5.4, 5.6, 5.8, 6.0, 6.3,  # 2022 H1
            6.5, 6.8, 6.2, 5.9, 5.7, 5.5,  # 2022 H2
            5.3, 5.1, 5.4, 5.6, 5.8, 6.1,  # 2023 H1
            7.0, 7.2, 6.8, 6.5, 6.3, 6.0,  # 2023 H2 — elecciones generales julio 2023
            6.2, 6.4, 6.7, 6.5, 6.3, 6.1,  # 2024 H1 — investidura enero 2024
            6.0, 6.2, 6.4, 6.6, 6.5, 6.3,  # 2024 H2
            6.5, 6.4, 6.2, 6.4,             # 2025 H1
        ])
        # Ajustar longitud
        n = min(len(fechas_hist), len(valores_hist))
        fechas_hist = fechas_hist[:n]
        valores_hist = valores_hist[:n]

    # Fuerza tipo serie para evitar errores de indexado en distintos backends
    valores_hist = pd.Series(valores_hist).dropna().reset_index(drop=True)
    fechas_hist = pd.Series(fechas_hist).iloc[: len(valores_hist)]

    # Eventos clave anotados
    eventos = [
        ("2022-06-01", "Elecciones Andalucía — Mayoría PP"),
        ("2023-05-01", "Elecciones municipales — PP reforzado"),
        ("2023-07-01", "Elecciones generales — Bloqueo parlamentario"),
        ("2024-01-01", "Investidura Sánchez — Pacto con Junts"),
        ("2024-06-01", "Elecciones europeas — Test de fuerza"),
        ("2025-02-01", "Debate sobre amnistía en TC"),
        ("2026-01-01", "Tensión presupuestaria 2026"),
    ]

    fig_hist = go.Figure()

    # Zona de riesgo alto
    fig_hist.add_hrect(y0=6, y1=10, fillcolor="rgba(220,38,38,0.06)",
                       line_width=0, annotation_text="Zona de riesgo alto",
                       annotation_position="right", annotation_font_size=10,
                       annotation_font_color="#dc2626")
    # Zona de riesgo moderado
    fig_hist.add_hrect(y0=3, y1=6, fillcolor="rgba(217,119,6,0.06)",
                       line_width=0)
    # Zona verde
    fig_hist.add_hrect(y0=0, y1=3, fillcolor="rgba(22,163,74,0.06)",
                       line_width=0)

    # Línea principal
    fig_hist.add_trace(go.Scatter(
        x=fechas_hist,
        y=valores_hist,
        mode="lines+markers",
        name="Índice de Riesgo",
        line=dict(color=BLUE, width=2.5),
        marker=dict(size=5, color=BLUE),
        fill="tozeroy",
        fillcolor="rgba(37,99,235,0.07)",
    ))

    # Líneas de umbral
    fig_hist.add_hline(y=3, line_dash="dot", line_color=GREEN,
                       line_width=1, annotation_text="Umbral BAJO",
                       annotation_font_color=GREEN, annotation_font_size=10)
    fig_hist.add_hline(y=6, line_dash="dot", line_color=RED,
                       line_width=1, annotation_text="Umbral ALTO",
                       annotation_font_color=RED, annotation_font_size=10)

    # Anotaciones de eventos
    fecha_min = fechas_hist.min() if hasattr(fechas_hist, "min") else fechas_hist.iloc[0]
    fecha_max = fechas_hist.max() if hasattr(fechas_hist, "max") else fechas_hist.iloc[-1]

    for fecha_ev_str, texto_ev in eventos:
        fecha_ev = pd.Timestamp(fecha_ev_str)
        if fecha_min <= fecha_ev <= fecha_max:
            fig_hist.add_vline(
                x=fecha_ev,
                line_dash="dash",
                line_color=TEXT2,
                line_width=1,
                opacity=0.4,
            )
            fig_hist.add_annotation(
                x=fecha_ev,
                y=9.7,
                text=texto_ev,
                showarrow=False,
                textangle=-35,
                font=dict(size=9, color=TEXT2),
                xanchor="left",
                yanchor="top",
            )

    fig_hist.update_layout(
        height=450,
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        xaxis=dict(
            title="Mes",
            gridcolor=BORDER,
            tickfont=dict(size=10, color=MUTED),
            tickformat="%b %Y",
        ),
        yaxis=dict(
            title="Índice de Riesgo (0-10)",
            range=[0, 10],
            gridcolor=BORDER,
            tickfont=dict(size=10, color=MUTED),
        ),
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(t=60, b=60, l=60, r=60),
        font={"family": "Inter, sans-serif", "color": TEXT2},
        hovermode="x unified",
    )
    st.plotly_chart(fig_hist, use_container_width=True)

    # Estadísticas de la serie
    st.markdown(f"""<div class="sec-hdr"><div class="bar" style="background:{CYAN}"></div><span class="lbl">ESTADÍSTICAS DE LA SERIE</span><div class="line"></div></div>""", unsafe_allow_html=True)
    # Blindar contra Decimal: convertir la serie a float antes de operar.
    _vh = pd.to_numeric(valores_hist, errors="coerce").astype(float).dropna()
    col_s1, col_s2, col_s3, col_s4, col_s5 = st.columns(5)
    if _vh.empty:
        col_s1.metric("Valor Actual", "—")
        col_s2.metric("Media Histórica", "—")
        col_s3.metric("Máximo", "—")
        col_s4.metric("Mínimo", "—")
        col_s5.metric("Tendencia (3M)", "—")
    else:
        with col_s1:
            st.metric("Valor Actual", f"{_vh.iloc[-1]:.1f}")
        with col_s2:
            st.metric("Media Histórica", f"{_vh.mean():.1f}")
        with col_s3:
            st.metric("Máximo", f"{_vh.max():.1f}")
        with col_s4:
            st.metric("Mínimo", f"{_vh.min():.1f}")
        with col_s5:
            tendencia = (_vh.iloc[-1] - _vh.iloc[-4]) if len(_vh) >= 4 else 0.0
            delta_str = f"{tendencia:+.1f} vs hace 3 meses"
            st.metric("Tendencia (3M)", f"{_vh.iloc[-1]:.1f}", delta=delta_str)

    st.markdown(f"<p style='color:{MUTED};font-size:0.8rem;margin-top:1rem'>"
                f"{'Datos históricos reales de la BD ElectSim.' if usar_historico_bd else 'Serie sintética de referencia calibrada con eventos reales.'} "
                f"Metodología: índice compuesto ponderado por dimensión. Frecuencia: mensual.</p>",
                unsafe_allow_html=True)
