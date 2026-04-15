"""
Página: Análisis de Coaliciones

Configuraciones parlamentarias viables, motivaciones de cada partido
y matriz de compatibilidad entre formaciones.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import plotly.graph_objects as go
import streamlit as st
from dashboard.shared import sidebar_nav

from dashboard.db import cargar_nowcasting

# ── Design ────────────────────────────────────────────────────────────────────
NAVY  = "#1E3A5F"
BLUE  = "#2563EB"
PALE  = "#EFF6FF"
WHITE = "#FFFFFF"
BORDER= "#CBD5E1"
TEXT  = "#0F172A"
MUTED = "#64748B"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED   = "#EF4444"

COLORES_PARTIDO = {
    "PP":       "#0066CC",
    "PSOE":     "#E31C1C",
    "VOX":      "#63BE21",
    "SUMAR":    "#BE0025",
    "Junts":    "#00C0B2",
    "ERC":      "#FAB710",
    "PNV":      "#008000",
    "EH Bildu": "#95C11F",
    "BNG":      "#6CB5D8",
    "CC":       "#FFD700",
}

st.set_page_config(page_title="Coaliciones — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
body, .stApp {{ background:{WHITE}; color:{TEXT}; }}
.politeia-header {{
    background: linear-gradient(135deg, {NAVY} 0%, {BLUE} 100%);
    color: white; padding: 1.8rem 2.5rem; border-radius: 16px; margin-bottom: 1.5rem;
}}
.card {{
    background:{WHITE}; border:1px solid {BORDER}; border-radius:12px;
    padding:1.2rem 1.4rem; margin-bottom:1rem;
}}
.linea-roja {{ color:{RED}; font-weight:600; margin-bottom:.3rem; }}
.linea-verde {{ color:{GREEN}; font-weight:600; margin-bottom:.3rem; }}
.section-title {{
    font-size:.72rem; font-weight:700; color:{MUTED};
    letter-spacing:.1em; text-transform:uppercase;
    border-bottom:2px solid {PALE}; padding-bottom:.3rem; margin:1rem 0 .6rem;
}}
</style>
""", unsafe_allow_html=True)

st.markdown(f"""
<div class="politeia-header">
  <div style="font-size:1.6rem;font-weight:800">Análisis de Coaliciones</div>
  <div style="opacity:.85;margin-top:.4rem">
    Configuraciones parlamentarias viables · Motivaciones por partido · Matriz de compatibilidad
  </div>
</div>
""", unsafe_allow_html=True)

# ── Datos de motivaciones ─────────────────────────────────────────────────────
MOTIVACIONES = {
    "PP": {
        "nombre": "Partido Popular",
        "lider": "Alberto Núñez Feijóo",
        "color": COLORES_PARTIDO["PP"],
        "bloque": "derecha",
        "objetivo": "Llegar a La Moncloa con estabilidad presupuestaria y mayoría sólida",
        "lineas_rojas": [
            "Amnistía a independentistas",
            "Plurinacionalidad constitucional",
            "Derogación de la reforma laboral de 2021",
            "Cualquier acuerdo que debilite la unidad territorial",
        ],
        "concesiones": [
            "Bajada conjunta de impuestos sobre la renta",
            "Refuerzo del gasto en defensa y seguridad",
            "Política migratoria más restrictiva",
            "Reforma del sistema de financiación autonómica",
        ],
        "socios_preferentes": ["VOX (si es necesario)", "CC", "PRC", "UPN", "Foro Asturias"],
        "socios_vetados": ["ERC", "EH Bildu", "Junts en cuestiones constitucionales", "CUP"],
        "precio_coalicion": "Vicepresidencia + Ministerios de Economía e Interior + agenda propia en seguridad",
        "estrategia": "Máxima exigencia inicial, cede en temas simbólicos pero no en sustantivos. Prefiere gobernar en solitario con apoyos puntuales.",
        "fortaleza": 85,
    },
    "PSOE": {
        "nombre": "Partido Socialista Obrero Español",
        "lider": "Pedro Sánchez",
        "color": COLORES_PARTIDO["PSOE"],
        "bloque": "izquierda",
        "objetivo": "Revalidar el gobierno preservando la coalición progresista más el apoyo nacionalista",
        "lineas_rojas": [
            "Recortes en gasto social o en el Estado del bienestar",
            "Reversión de derechos civiles (matrimonio igualitario, aborto, eutanasia)",
            "Cualquier gobierno con VOX",
        ],
        "concesiones": [
            "Mayor autonomía fiscal a las CCAA (concierto ampliado)",
            "Política lingüística más flexible en Cataluña",
            "Reforma del sistema de financiación autonómica",
            "Transferencias de competencias pendientes",
        ],
        "socios_preferentes": ["SUMAR", "PNV", "Junts (transaccional)", "ERC", "EH Bildu", "BNG"],
        "socios_vetados": ["VOX en cualquier caso"],
        "precio_coalicion": "Ministerios clave para socios, concesiones territoriales graduales, agenda social compartida",
        "estrategia": "Pragmatismo extremo, gestión de las contradicciones internas de la coalición. Cada acuerdo se negocia caso a caso.",
        "fortaleza": 80,
    },
    "VOX": {
        "nombre": "VOX",
        "lider": "Santiago Abascal",
        "color": COLORES_PARTIDO["VOX"],
        "bloque": "derecha radical",
        "objetivo": "Entrar en el gobierno, marcar la agenda cultural y migratoria",
        "lineas_rojas": [
            "Cualquier política de género o identitaria",
            "Amnistía o beneficios a independentistas",
            "Más autonomía territorial para las CCAA",
            "Agenda climática o impuestos ecológicos",
        ],
        "concesiones": [
            "Apoyar presupuestos a cambio de política migratoria restrictiva",
            "Derogación de leyes de violencia de género y memoria democrática",
            "Políticas de seguridad y orden público",
        ],
        "socios_preferentes": ["PP (única opción viable)"],
        "socios_vetados": ["Todos los demás — incompatibilidad ideológica total"],
        "precio_coalicion": "Ministerio del Interior + Vicepresidencia + control de fronteras + derogación de leyes identitarias",
        "estrategia": "Presión máxima en temas migratorio y cultural. No ceden en identidad. Prefieren la oposición dura a un acuerdo sin contenido.",
        "fortaleza": 60,
    },
    "SUMAR": {
        "nombre": "SUMAR",
        "lider": "Yolanda Díaz",
        "color": COLORES_PARTIDO["SUMAR"],
        "bloque": "izquierda",
        "objetivo": "Mantener carteras sociales y laborales, avanzar en derechos y transición ecológica",
        "lineas_rojas": [
            "Recortes en prestaciones sociales o derechos laborales",
            "Privatizaciones de servicios públicos",
            "Reforma laboral regresiva",
            "Gasto excesivo en defensa",
        ],
        "concesiones": [
            "Flexibilidad en política exterior si hay contraprestaciones sociales",
            "Apoyar la agenda del PSOE en temas no nucleares",
        ],
        "socios_preferentes": ["PSOE", "EH Bildu en temas sociales"],
        "socios_vetados": ["PP", "VOX", "cualquier gobierno de derecha"],
        "precio_coalicion": "Vicepresidencia Social + Ministerio de Trabajo + Ministerio de Vivienda + agenda verde",
        "estrategia": "Negociación desde la izquierda del PSOE. Su debilidad es la fragmentación interna.",
        "fortaleza": 55,
    },
    "PNV": {
        "nombre": "Partido Nacionalista Vasco",
        "lider": "Andoni Ortuzar",
        "color": COLORES_PARTIDO["PNV"],
        "bloque": "nacionalismo vasco moderado",
        "objetivo": "Ampliar el cupo vasco, transferencias pendientes, autogobierno máximo",
        "lineas_rojas": [
            "Recentralización de competencias",
            "Intervención del gobierno en la política autonómica vasca",
            "Cualquier medida que afecte al concierto económico",
        ],
        "concesiones": [
            "Apoyo estable a la investidura a cambio de transferencias concretas",
            "Son un socio muy fiable una vez cerrado el acuerdo",
        ],
        "socios_preferentes": ["PSOE (socio histórico)", "PP (si ofrece más autonomía)"],
        "socios_vetados": ["VOX", "EH Bildu en coalición nacional"],
        "precio_coalicion": "Concierto ampliado + transferencias de Seguridad Social + inversiones en el País Vasco",
        "estrategia": "Extremadamente precisos en sus demandas. Muy fiables como socios una vez firmado el acuerdo.",
        "fortaleza": 78,
    },
    "Junts": {
        "nombre": "Junts per Catalunya",
        "lider": "Carles Puigdemont",
        "color": COLORES_PARTIDO["Junts"],
        "bloque": "independentismo catalán",
        "objetivo": "Amnistía plena, autodeterminación, retorno de Puigdemont sin consecuencias",
        "lineas_rojas": [
            "Amnistía parcial o con condiciones",
            "Sin negociación explícita sobre autodeterminación",
            "Recentralización o ataque al autogobierno catalán",
        ],
        "concesiones": [
            "Apoyo puntual a presupuestos a cambio de avances concretos y verificables",
        ],
        "socios_preferentes": ["PSOE (relación transaccional)"],
        "socios_vetados": ["PP", "VOX"],
        "precio_coalicion": "Amnistía plena + referéndum o consulta pactada + financiación singular para Cataluña",
        "estrategia": "Máxima exigencia. Retirada de apoyo ante cualquier incumplimiento percibido. El socio más volátil del arco parlamentario.",
        "fortaleza": 72,
    },
    "ERC": {
        "nombre": "Esquerra Republicana de Catalunya",
        "lider": "Oriol Junqueras",
        "color": COLORES_PARTIDO["ERC"],
        "bloque": "independentismo catalán",
        "objetivo": "Diálogo permanente, financiación singular, avance gradual hacia la independencia",
        "lineas_rojas": [
            "Represión policial o judicial del activismo independentista",
            "Sin avances verificables en autogobierno",
        ],
        "concesiones": [
            "Más flexible que Junts en plazos y formas",
            "Acepta avances graduales si son reales",
        ],
        "socios_preferentes": ["PSOE"],
        "socios_vetados": ["PP", "VOX"],
        "precio_coalicion": "Mesa de negociación activa + financiación singular + inversiones en Cataluña",
        "estrategia": "Más pragmática que Junts. Su debilidad es la competencia con Junts por el electorado independentista.",
        "fortaleza": 65,
    },
    "EH Bildu": {
        "nombre": "EH Bildu",
        "lider": "Arnaldo Otegi (portavoz)",
        "color": COLORES_PARTIDO["EH Bildu"],
        "bloque": "izquierda abertzale",
        "objetivo": "Políticas sociales, acercamiento de presos de ETA, ampliación del autogobierno vasco",
        "lineas_rojas": [
            "Militarismo o política de defensa agresiva",
            "Recortes en derechos sociales o laborales",
        ],
        "concesiones": [
            "Apoyo a presupuestos con fuerte contenido social",
            "Transversalidad en temas de bienestar",
        ],
        "socios_preferentes": ["PSOE + SUMAR (coalición progresista)"],
        "socios_vetados": ["VOX", "PP en gobiernos de derecha"],
        "precio_coalicion": "Acercamiento de presos + más competencias autonómicas + políticas de vivienda",
        "estrategia": "Transversal en lo social, firme en lo identitario. Han moderado su imagen electoral.",
        "fortaleza": 62,
    },
}

COMPATIBILIDAD = {
    ("PP",       "VOX"):      +1,
    ("PP",       "PSOE"):     -1,
    ("PP",       "SUMAR"):    -2,
    ("PP",       "PNV"):      +1,
    ("PP",       "Junts"):    -2,
    ("PP",       "ERC"):      -2,
    ("PP",       "EH Bildu"): -2,
    ("PSOE",     "SUMAR"):    +2,
    ("PSOE",     "PNV"):      +2,
    ("PSOE",     "Junts"):     0,
    ("PSOE",     "ERC"):      +1,
    ("PSOE",     "EH Bildu"): +1,
    ("PSOE",     "VOX"):      -2,
    ("SUMAR",    "EH Bildu"): +2,
    ("SUMAR",    "ERC"):      +1,
    ("SUMAR",    "PNV"):       0,
    ("SUMAR",    "VOX"):      -2,
    ("SUMAR",    "Junts"):     0,
    ("VOX",      "PNV"):      -2,
    ("VOX",      "Junts"):    -2,
    ("VOX",      "ERC"):      -2,
    ("VOX",      "EH Bildu"): -2,
    ("PNV",      "EH Bildu"): -1,
    ("PNV",      "ERC"):       0,
    ("PNV",      "Junts"):     0,
    ("Junts",    "ERC"):      +1,
    ("Junts",    "EH Bildu"):  0,
    ("ERC",      "EH Bildu"): +1,
}

ESCENARIOS = [
    {
        "nombre": "Gobierno PP con apoyo de VOX",
        "partidos": ["PP", "VOX"],
        "escanos_est": 171, "prob": 38, "color": COLORES_PARTIDO["PP"],
        "tipo": "Mayoría simple con apoyos",
        "desc": "Gobierno PP en solitario con apoyo externo de VOX en votaciones clave. PP intentaría evitar una coalición formal.",
        "condicion": "PP necesita ~140+ escaños y VOX obtiene 30+",
    },
    {
        "nombre": "Mayoría progresista ampliada",
        "partidos": ["PSOE", "SUMAR", "PNV", "ERC", "EH Bildu"],
        "escanos_est": 178, "prob": 29, "color": COLORES_PARTIDO["PSOE"],
        "tipo": "Mayoría absoluta multipartidista",
        "desc": "Renovación del gobierno actual con acuerdos reforzados con PNV, ERC y EH Bildu.",
        "condicion": "PSOE+SUMAR necesitan ~155 escaños + apoyos nacionalistas",
    },
    {
        "nombre": "Bloqueo / elecciones repetidas",
        "partidos": [],
        "escanos_est": 0, "prob": 18, "color": MUTED,
        "tipo": "Sin mayoría viable",
        "desc": "España repite elecciones tras fallo de investidura (ocurrió en 2015-16 y 2019).",
        "condicion": "Ni PP ni PSOE alcanza 176 escaños con socios viables",
    },
    {
        "nombre": "PP con PNV y CC",
        "partidos": ["PP", "PNV", "CC"],
        "escanos_est": 176, "prob": 8, "color": "#336699",
        "tipo": "Mayoría ajustada",
        "desc": "Gobierno de centroderecha con socios nacionalistas moderados. Requiere concesiones al PNV en el cupo vasco.",
        "condicion": "PP necesita ~165 escaños y VOX queda fuera de la mayoría",
    },
    {
        "nombre": "Gran coalición PP-PSOE",
        "partidos": ["PP", "PSOE"],
        "escanos_est": 255, "prob": 7, "color": "#6B7280",
        "tipo": "Mayoría absoluta amplia",
        "desc": "Escenario extremo. Ambos partidos lo rechazan públicamente pero no es imposible ante una crisis institucional.",
        "condicion": "Crisis sistémica grave o necesidad de reforma constitucional",
    },
]

# ── Tabs ──────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs([
    "Configuraciones de Coalición",
    "Motivaciones por Partido",
    "Matriz de Compatibilidad",
])

# ── Tab 1 ─────────────────────────────────────────────────────────────────────
with tab1:
    st.markdown('<div class="section-title">Escenarios de gobierno más probables</div>', unsafe_allow_html=True)

    df_nc = cargar_nowcasting()
    if not df_nc.empty:
        st.markdown("**Estimación actual de intención de voto (nowcasting)**")
        cols_nc = st.columns(min(len(df_nc), 7))
        for i, (_, row) in enumerate(df_nc.head(7).iterrows()):
            with cols_nc[i]:
                color = COLORES_PARTIDO.get(row["partido_siglas"], BLUE)
                st.markdown(f"""
                <div style="background:{PALE};border-left:3px solid {color};
                            padding:.5rem .7rem;border-radius:6px;text-align:center">
                    <div style="font-weight:700;color:{color}">{row['partido_siglas']}</div>
                    <div style="font-size:1.3rem;font-weight:800">{row['estimacion_pct']:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
        st.divider()

    for esc in ESCENARIOS:
        color_prob = GREEN if esc["prob"] >= 30 else (AMBER if esc["prob"] >= 15 else MUTED)
        with st.expander(f"{esc['nombre']} — {esc['prob']}% probabilidad", expanded=(esc["prob"] >= 25)):
            col_a, col_b = st.columns([2, 1])
            with col_a:
                st.markdown(f"**Tipo:** {esc['tipo']}  |  **Escaños estimados:** {esc['escanos_est']} / 350")
                if esc["partidos"]:
                    tags = " + ".join(
                        f'<span style="background:{COLORES_PARTIDO.get(p,MUTED)};color:white;padding:.1rem .5rem;border-radius:999px;font-size:.8rem">{p}</span>'
                        for p in esc["partidos"]
                    )
                    st.markdown(tags, unsafe_allow_html=True)
                st.markdown(f"_{esc['condicion']}_")
                st.markdown(esc["desc"])
            with col_b:
                fig_g = go.Figure(go.Indicator(
                    mode="gauge+number",
                    value=esc["prob"],
                    number={"suffix": "%", "font": {"size": 26}},
                    gauge={
                        "axis": {"range": [0, 100]},
                        "bar": {"color": color_prob},
                        "steps": [
                            {"range": [0, 25], "color": "#F1F5F9"},
                            {"range": [25, 60], "color": "#FEF3C7"},
                            {"range": [60, 100], "color": "#D1FAE5"},
                        ],
                    },
                ))
                fig_g.update_layout(height=180, margin=dict(t=10, b=0, l=10, r=10))
                st.plotly_chart(fig_g, use_container_width=True)

    st.divider()
    nombres = [e["nombre"][:40] for e in ESCENARIOS]
    probs   = [e["prob"] for e in ESCENARIOS]
    colors  = [e["color"] for e in ESCENARIOS]
    fig_bar = go.Figure(go.Bar(
        y=nombres, x=probs, orientation="h",
        marker_color=colors,
        text=[f"{p}%" for p in probs], textposition="outside",
    ))
    fig_bar.update_layout(
        height=280, plot_bgcolor=WHITE, paper_bgcolor=WHITE,
        xaxis=dict(title="Probabilidad (%)", range=[0, 55]),
        margin=dict(t=10, b=20),
    )
    st.plotly_chart(fig_bar, use_container_width=True)


# ── Tab 2 ─────────────────────────────────────────────────────────────────────
with tab2:
    st.markdown('<div class="section-title">¿Qué busca cada partido en una negociación?</div>', unsafe_allow_html=True)

    partido_sel = st.selectbox("Partido", list(MOTIVACIONES.keys()))
    m = MOTIVACIONES[partido_sel]

    col_info, col_stats = st.columns([3, 1])
    with col_info:
        st.markdown(f"""
        <div class="card">
          <div style="display:flex;align-items:center;gap:.8rem;margin-bottom:.8rem">
            <div style="width:12px;height:44px;background:{m['color']};border-radius:4px"></div>
            <div>
              <div style="font-size:1.2rem;font-weight:800">{m['nombre']}</div>
              <div style="color:{MUTED};font-size:.85rem">Líder: {m['lider']} · Bloque: {m['bloque']}</div>
            </div>
          </div>
          <div style="background:{PALE};border-radius:8px;padding:.8rem;margin-bottom:.5rem">
            <strong>Objetivo principal:</strong> {m['objetivo']}
          </div>
        </div>
        """, unsafe_allow_html=True)

        col_l, col_r = st.columns(2)
        with col_l:
            st.markdown('<div class="section-title">Líneas rojas (no negociables)</div>', unsafe_allow_html=True)
            for lr in m["lineas_rojas"]:
                st.markdown(f'<div class="linea-roja">✗ {lr}</div>', unsafe_allow_html=True)
            st.markdown('<div class="section-title">Socios vetados</div>', unsafe_allow_html=True)
            for sv in m["socios_vetados"]:
                st.markdown(f"— {sv}")
        with col_r:
            st.markdown('<div class="section-title">Concesiones posibles</div>', unsafe_allow_html=True)
            for c in m["concesiones"]:
                st.markdown(f'<div class="linea-verde">✓ {c}</div>', unsafe_allow_html=True)
            st.markdown('<div class="section-title">Socios preferentes</div>', unsafe_allow_html=True)
            for sp in m["socios_preferentes"]:
                st.markdown(f"— {sp}")

        st.markdown('<div class="section-title">Precio de coalición</div>', unsafe_allow_html=True)
        st.info(m["precio_coalicion"])
        st.markdown('<div class="section-title">Estrategia negociadora</div>', unsafe_allow_html=True)
        st.markdown(m["estrategia"])

    with col_stats:
        fig_f = go.Figure(go.Indicator(
            mode="gauge+number",
            value=m["fortaleza"],
            title={"text": "Fortaleza negociadora", "font": {"size": 12}},
            number={"suffix": "/100"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": m["color"]},
                "steps": [
                    {"range": [0, 40], "color": "#FEE2E2"},
                    {"range": [40, 70], "color": "#FEF3C7"},
                    {"range": [70, 100], "color": "#D1FAE5"},
                ],
            },
        ))
        fig_f.update_layout(height=240, margin=dict(t=40, b=0))
        st.plotly_chart(fig_f, use_container_width=True)

    st.divider()
    st.markdown('<div class="section-title">Comparativa de fortaleza negociadora</div>', unsafe_allow_html=True)
    partidos_l = list(MOTIVACIONES.keys())
    fig_comp = go.Figure(go.Bar(
        x=partidos_l,
        y=[MOTIVACIONES[p]["fortaleza"] for p in partidos_l],
        marker_color=[MOTIVACIONES[p]["color"] for p in partidos_l],
        text=[MOTIVACIONES[p]["fortaleza"] for p in partidos_l],
        textposition="outside",
    ))
    fig_comp.update_layout(
        height=300, plot_bgcolor=WHITE, paper_bgcolor=WHITE,
        yaxis=dict(title="Fortaleza negociadora (0-100)", range=[0, 100]),
        margin=dict(t=10, b=20),
    )
    st.plotly_chart(fig_comp, use_container_width=True)


# ── Tab 3 ─────────────────────────────────────────────────────────────────────
with tab3:
    st.markdown('<div class="section-title">Compatibilidad entre partidos</div>', unsafe_allow_html=True)
    st.caption("**+2** muy compatible · **+1** compatible · **0** neutral · **-1** difícil · **-2** veto total")

    partidos_m = ["PP", "PSOE", "VOX", "SUMAR", "PNV", "Junts", "ERC", "EH Bildu"]
    matrix = []
    for p1 in partidos_m:
        row = []
        for p2 in partidos_m:
            if p1 == p2:
                row.append(2)
            else:
                key = (p1, p2) if (p1, p2) in COMPATIBILIDAD else (p2, p1)
                row.append(COMPATIBILIDAD.get(key, 0))
        matrix.append(row)

    fig_hm = go.Figure(go.Heatmap(
        z=matrix, x=partidos_m, y=partidos_m,
        colorscale=[
            [0.0, "#DC2626"], [0.25, "#EF4444"],
            [0.5, "#F1F5F9"],
            [0.75, "#86EFAC"], [1.0, "#16A34A"],
        ],
        zmin=-2, zmax=2,
        text=[[str(v) for v in row] for row in matrix],
        texttemplate="%{text}", showscale=True,
        colorbar=dict(title="Compatibilidad", tickvals=[-2,-1,0,1,2],
                      ticktext=["Veto","-1","Neutral","+1","Muy compatible"]),
    ))
    fig_hm.update_layout(
        height=480, plot_bgcolor=WHITE, paper_bgcolor=WHITE,
        margin=dict(t=20, b=20), xaxis=dict(side="top"),
    )
    st.plotly_chart(fig_hm, use_container_width=True)

    st.markdown('<div class="section-title">Lógica de bloques</div>', unsafe_allow_html=True)
    col_b1, col_b2, col_b3 = st.columns(3)
    with col_b1:
        st.markdown(f"""
        <div class="card" style="border-top:3px solid {COLORES_PARTIDO['PP']}">
            <strong>Bloque de derecha</strong><br>
            PP · VOX · CC · UPN · PRC<br>
            <small style="color:{MUTED}">Máximo ~175 escaños. Posible con alta participación conservadora.</small>
        </div>
        """, unsafe_allow_html=True)
    with col_b2:
        st.markdown(f"""
        <div class="card" style="border-top:3px solid {COLORES_PARTIDO['PSOE']}">
            <strong>Bloque progresista</strong><br>
            PSOE · SUMAR · PNV · ERC · EH Bildu · BNG<br>
            <small style="color:{MUTED}">Posible con ~178-185 escaños. Alta complejidad de negociación.</small>
        </div>
        """, unsafe_allow_html=True)
    with col_b3:
        st.markdown(f"""
        <div class="card" style="border-top:3px solid {MUTED}">
            <strong>Actores bisagra</strong><br>
            PNV · CC · UPN<br>
            <small style="color:{MUTED}">Pueden inclinar la balanza. Precio: concesiones autonómicas concretas.</small>
        </div>
        """, unsafe_allow_html=True)
