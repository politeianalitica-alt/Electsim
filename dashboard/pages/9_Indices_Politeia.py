"""
Página: Índices Politeia
Dashboard premium de los 7 índices propios de análisis político-social.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import streamlit as st
from dashboard.shared import sidebar_nav

from dashboard.db import cargar_indices_politeia, cargar_serie_indice

# ── Design tokens ─────────────────────────────────────────────────────────────
NAVY    = "#1E3A5F"
BLUE    = "#2563EB"
LBLUE   = "#60A5FA"
PALE    = "#EFF6FF"
WHITE   = "#FFFFFF"
SURFACE = "#F8FAFC"
BORDER  = "#CBD5E1"
TEXT    = "#0F172A"
MUTED   = "#64748B"
GREEN   = "#10B981"
AMBER   = "#F59E0B"
RED     = "#EF4444"

SEMAFORO_COLOR = {"VERDE": GREEN, "AMARILLO": AMBER, "ROJO": RED}

st.set_page_config(page_title="Índices Politeia — ElectSim", layout="wide")

sidebar_nav()

st.markdown(f"""
<style>
body, .stApp {{ background: {WHITE}; color: {TEXT}; }}
.index-card {{
    background: {WHITE};
    border: 1px solid {BORDER};
    border-radius: 12px;
    padding: 1.2rem 1.4rem;
    margin-bottom: 0.8rem;
    transition: box-shadow .2s;
}}
.index-card:hover {{ box-shadow: 0 4px 20px rgba(37,99,235,.12); }}
.index-valor {{ font-size: 2.8rem; font-weight: 800; line-height: 1; }}
.index-nombre {{ font-size: 0.8rem; font-weight: 600; color: {MUTED}; letter-spacing: .06em; text-transform: uppercase; }}
.index-interp {{ font-size: 0.82rem; color: {MUTED}; margin-top: .5rem; }}
.semaforo-badge {{
    display: inline-block;
    padding: .2rem .7rem;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    letter-spacing: .05em;
}}
.politeia-header {{
    background: linear-gradient(135deg, {NAVY} 0%, {BLUE} 100%);
    color: white;
    padding: 2rem 2.5rem;
    border-radius: 16px;
    margin-bottom: 2rem;
}}
.section-title {{
    font-size: .75rem;
    font-weight: 700;
    color: {MUTED};
    letter-spacing: .1em;
    text-transform: uppercase;
    border-bottom: 2px solid {PALE};
    padding-bottom: .4rem;
    margin: 1.5rem 0 1rem;
}}
</style>
""", unsafe_allow_html=True)

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown(f"""
<div class="politeia-header">
    <div style="font-size:1.6rem;font-weight:800;letter-spacing:-.01em">Índices Politeia</div>
    <div style="opacity:.8;font-size:.9rem;margin-top:.3rem">
        Siete índices propios de análisis político, social y economico para profesionales
    </div>
</div>
""", unsafe_allow_html=True)

# ── Cargar datos ──────────────────────────────────────────────────────────────
df = cargar_indices_politeia()
if "metodología" not in df.columns and "metodologia" in df.columns:
    df["metodología"] = df["metodologia"]

if df.empty:
    st.info("""
    **Sin datos de índices aun.** Ejecuta el motor de cálculo:
    ```bash
    python -m analytics.indices.compute_all
    ```
    Los índices se calculan desde los datos de BD, prensa y encuestas.
    Asegurate de tener datos en `noticias_prensa`, `resultados_electorales`
    y `indicadores_macroeconomicos`.
    """)

    # Mostrar catalogo de índices aunque no haya datos
    catalogos = [
        ("IPPS", "Índice de Polarizacion Politica y Social",
         "Mide la distancia ideologica entre partidos, fragmentacion NEP, volatilidad Pedersen y temperatura mediatica."),
        ("IESP", "Índice de Estabilidad del Sistema Político",
         "Evalua la solidez institucional: salud fiscal, cohesion parlamentaria y señal macroeconomica."),
        ("ISMA", "Índice de Sentimiento Mediatico y Agenda",
         "Analiza el tono y la estructura de la cobertura de 12 medios: sentimiento, diversidad de agenda, equilibrio de cobertura."),
        ("ICED", "Índice de Crispacion del Debate Publico",
         "Mide la intensidad confrontacional: lexico de crisis en prensa, mociones, volatilidad del sentimiento."),
        ("ICGE", "Índice de Cohesion Gobierno-Electores",
         "Distancia entre el gobierno y su electorado: desgaste electoral, diferencial mediatico, alineacion macro."),
        ("IBEP", "Índice de Brecha Economica-Politica",
         "Detecta la desconexion entre condiciones economicas y comportamiento electoral. Correlacion paro-castigo."),
        ("IVCE", "Índice de Vulnerabilidad del Contrato Electoral",
         "Condiciones de pre-ruptura del contrato representativo: dispersion ideologica, tension territorial, alertas."),
    ]
    for cod, nombre, desc in catalogos:
        with st.expander(f"**{cod}** — {nombre}"):
            st.markdown(desc)
    st.stop()

# ── Panel resumen 7 índices ───────────────────────────────────────────────────
st.markdown('<div class="section-title">Panel de Índices — Estado actual</div>', unsafe_allow_html=True)

# Organizar en 2 filas
idx_list = df.to_dict("records")
cols_row1 = st.columns(4)
cols_row2 = st.columns(3)

for i, row in enumerate(idx_list):
    col = cols_row1[i] if i < 4 else cols_row2[i - 4]
    color = SEMAFORO_COLOR.get(row.get("semaforo", ""), BLUE)
    valor = row.get("valor", 0) or 0
    var7 = row.get("variacion_7d")
    var_str = f"{'▲' if var7 and var7 > 0 else '▼' if var7 and var7 < 0 else '—'} {abs(var7):.1f}" if var7 else "—"
    with col:
        st.markdown(f"""
        <div class="index-card">
            <div class="index-nombre">{row['indice_codigo']}</div>
            <div class="index-valor" style="color:{color}">{valor:.1f}</div>
            <div style="margin:.4rem 0">
                <span class="semaforo-badge" style="background:{color}22;color:{color}">
                    {row.get('semaforo','—')}
                </span>
                <span style="font-size:.75rem;color:{MUTED};margin-left:.5rem">{var_str} (7d)</span>
            </div>
            <div class="index-interp">{str(row.get('interpretacion',''))[:100]}...</div>
        </div>
        """, unsafe_allow_html=True)

# ── Radar de todos los índices ────────────────────────────────────────────────
st.markdown('<div class="section-title">Vista de Radar Comparativa</div>', unsafe_allow_html=True)

codigos = [r["indice_codigo"] for r in idx_list]
valores = [float(r.get("valor") or 0) for r in idx_list]

fig_radar = go.Figure()
fig_radar.add_trace(go.Scatterpolar(
    r=valores + [valores[0]],
    theta=codigos + [codigos[0]],
    fill="toself",
    fillcolor=f"rgba(37,99,235,0.15)",
    line=dict(color=BLUE, width=2.5),
    marker=dict(size=8, color=BLUE),
    name="Estado actual",
))
fig_radar.update_layout(
    polar=dict(
        bgcolor=SURFACE,
        radialaxis=dict(visible=True, range=[0, 100], tickfont=dict(size=9, color=MUTED),
                        gridcolor=BORDER, linecolor=BORDER),
        angularaxis=dict(tickfont=dict(size=11, color=TEXT), gridcolor=BORDER),
    ),
    height=420, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
    margin=dict(t=30, b=30, l=60, r=60),
    showlegend=False,
)
st.plotly_chart(fig_radar, use_container_width=True)

# ── Explorador de índice individual ──────────────────────────────────────────
st.markdown('<div class="section-title">Análisis en Profundidad</div>', unsafe_allow_html=True)

sel_codigo = st.selectbox(
    "Seleccióna un índice para analizar",
    options=codigos,
    format_func=lambda c: next((r["indice_nombre"] for r in idx_list if r["indice_codigo"] == c), c),
)

row_sel = next((r for r in idx_list if r["indice_codigo"] == sel_codigo), {})

col_def, col_serie = st.columns([1, 2])

with col_def:
    color_sel = SEMAFORO_COLOR.get(row_sel.get("semaforo", ""), BLUE)
    st.markdown(f"""
    <div style="background:{SURFACE};border:1px solid {BORDER};border-radius:12px;padding:1.5rem">
        <div style="font-size:.75rem;font-weight:700;color:{MUTED};letter-spacing:.08em;text-transform:uppercase">
            {row_sel.get('indice_codigo','')}
        </div>
        <div style="font-size:1rem;font-weight:600;color:{TEXT};margin:.2rem 0 1rem">
            {row_sel.get('indice_nombre','')}
        </div>
        <div style="font-size:4rem;font-weight:900;color:{color_sel};line-height:1">
            {float(row_sel.get('valor') or 0):.1f}
        </div>
        <div style="margin:.6rem 0">
            <span class="semaforo-badge" style="background:{color_sel}22;color:{color_sel};
                  padding:.25rem .8rem;border-radius:999px;font-size:.75rem;font-weight:700">
                {row_sel.get('semaforo','—')}
            </span>
        </div>
        <hr style="border:none;border-top:1px solid {BORDER};margin:.8rem 0">
        <div style="font-size:.82rem;color:{TEXT};line-height:1.5">
            {row_sel.get('interpretacion','')}
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Componentes como bullet bars
    comp_raw = row_sel.get("componentes_json")
    if comp_raw:
        try:
            comp = json.loads(comp_raw) if isinstance(comp_raw, str) else comp_raw
            st.markdown("<br>**Componentes del índice:**", unsafe_allow_html=True)
            for nombre_comp, val_comp in comp.items():
                val_n = float(val_comp or 0)
                pct = min(100, val_n)
                c_bar = BLUE if pct < 65 else AMBER if pct < 80 else RED
                st.markdown(f"""
                <div style="margin:.3rem 0">
                    <div style="display:flex;justify-content:space-between;font-size:.78rem;color:{MUTED}">
                        <span>{nombre_comp[:40]}</span>
                        <span style="font-weight:600;color:{TEXT}">{val_n:.1f}</span>
                    </div>
                    <div style="background:{BORDER};border-radius:4px;height:6px;margin-top:3px">
                        <div style="background:{c_bar};width:{pct}%;height:6px;border-radius:4px"></div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        except Exception:
            pass

with col_serie:
    df_serie = cargar_serie_indice(sel_codigo, dias=90)
    if not df_serie.empty:
        # Gráfico area con bandas de semáforo
        fig_s = go.Figure()
        # Banda verde
        fig_s.add_hrect(y0=0, y1=35, fillcolor=f"rgba(16,185,129,.07)", line_width=0)
        # Banda amarilla
        fig_s.add_hrect(y0=35, y1=65, fillcolor=f"rgba(245,158,11,.07)", line_width=0)
        # Banda roja
        fig_s.add_hrect(y0=65, y1=100, fillcolor=f"rgba(239,68,68,.07)", line_width=0)
        # Línea principal
        fig_s.add_trace(go.Scatter(
            x=df_serie["fecha_calculo"],
            y=df_serie["valor"].astype(float),
            mode="lines+markers",
            line=dict(color=BLUE, width=2.5),
            marker=dict(size=5, color=BLUE),
            fill="tozeroy",
            fillcolor="rgba(37,99,235,.08)",
            name=sel_codigo,
        ))
        fig_s.add_hline(y=35, line_dash="dot", line_color=GREEN, line_width=1)
        fig_s.add_hline(y=65, line_dash="dot", line_color=RED, line_width=1)
        fig_s.update_layout(
            title=dict(text="Evolución historica (90 dias)", font=dict(size=13, color=TEXT)),
            xaxis=dict(showgrid=False, title=None),
            yaxis=dict(range=[0, 105], title="Valor (0-100)", gridcolor=BORDER),
            height=360, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
            margin=dict(t=40, b=20, l=10, r=10),
            showlegend=False,
        )
        st.plotly_chart(fig_s, use_container_width=True)
    else:
        st.info("Serie historica sin datos aun. El índice se acumula con cada ejecucion diaria.")

    # Metodología
    with st.expander("Metodología del índice"):
        st.markdown(row_sel.get("metodología", "Sin metodología definida"))

# ── Heatmap comparativo histórico ─────────────────────────────────────────────
st.markdown('<div class="section-title">Heatmap Histórico de Todos los Índices</div>', unsafe_allow_html=True)

heatmap_data = []
for row in idx_list:
    serie = cargar_serie_indice(row["indice_codigo"], dias=60)
    if not serie.empty:
        for _, s in serie.iterrows():
            heatmap_data.append({
                "indice": row["indice_codigo"],
                "fecha": str(s["fecha_calculo"]),
                "valor": float(s["valor"] or 0),
            })

if heatmap_data:
    df_heat = pd.DataFrame(heatmap_data)
    df_pivot = df_heat.pivot(index="indice", columns="fecha", values="valor").fillna(0)
    fig_heat = go.Figure(go.Heatmap(
        z=df_pivot.values,
        x=df_pivot.columns.tolist(),
        y=df_pivot.index.tolist(),
        colorscale=[[0, "#EFF6FF"], [0.35, "#60A5FA"], [0.65, "#F59E0B"], [1, "#EF4444"]],
        zmin=0, zmax=100,
        colorbar=dict(title="Valor", tickfont=dict(size=10)),
        hoverongaps=False,
    ))
    fig_heat.update_layout(
        height=280, paper_bgcolor=WHITE, plot_bgcolor=WHITE,
        xaxis=dict(showticklabels=False, title=None),
        yaxis=dict(tickfont=dict(size=11, color=TEXT)),
        margin=dict(t=10, b=10, l=60, r=10),
    )
    st.plotly_chart(fig_heat, use_container_width=True)
else:
    st.info("El heatmap aparecerá cuando haya al menos 3 días de datos calculados.")

# ── Panel de metodología ──────────────────────────────────────────────────────
st.divider()
st.markdown('<div class="section-title">Metodología completa de los índices Politeia</div>', unsafe_allow_html=True)

INDICES_DOC = {
    "IPPS": {
        "nombre": "Índice de Polarización Política y Social",
        "rango": "0–100 · (100 = máxima polarización)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Distancia ideológica ponderada (30 %)",
             "Dispersión ponderada de los partidos en el eje izquierda–derecha usando posiciones CIS-Manifesto Project. Se calcula como la desviación típica ponderada por el peso electoral de cada partido."),
            ("C2 · Fragmentación NEP Laakso-Taagepera (20 %)",
             "Número Efectivo de Partidos electoral: NEP = 1 / Σpᵢ². Normalizado con el rango histórico español 1989–2023 (mín. 2,1 en 1989, máx. 6,2 en 2015)."),
            ("C3 · Volatilidad Pedersen (25 %)",
             "Pedersen = Σ|Δvᵢ| / 2, donde Δvᵢ es el cambio de voto de cada partido entre las dos últimas elecciónes generales. Mide cuánto 'fluye' el voto entre partidos."),
            ("C4 · Temperatura mediática (25 %)",
             "Proporción de noticias políticas con sentimiento negativo en los últimos 30 días, calculada mediante NLP sobre 12 medios nacionales."),
        ],
        "interpretacion": "Un IPPS alto indica un sistema político fragmentado con partidos muy alejados ideológicamente y alta volatilidad electoral. Históricamente correlaciona con dificultad de formación de gobierno (2015-16, 2019).",
        "referencias": "Dalton (2008) · Laakso & Taagepera (1979) · Pedersen (1979)",
    },
    "IESP": {
        "nombre": "Índice de Estabilidad del Sistema Político",
        "rango": "0–100 · (100 = máxima estabilidad)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Salud fiscal y financiera (30 %)",
             "Combinación de prima de riesgo, déficit estructural y sostenibilidad de la deuda pública respecto al PIB. Se normaliza con umbrales del Pacto de Estabilidad europeo."),
            ("C2 · Cohesión parlamentaria (25 %)",
             "Capacidad del partido gobernante de aprobar legislación clave: ratio de proposiciones de ley aprobadas vs. rechazadas en la legislatura en curso."),
            ("C3 · Fluidez de investidura (25 %)",
             "Tiempo en días desde las elecciónes hasta la investidura del Presidente del Gobierno, normalizado con el histórico español (mín. 0, máx. 314 días en 2015-16)."),
            ("C4 · Señal macroeconómica (20 %)",
             "Desviación del PIB y la tasa de paro respecto a la tendencia histórica de largo plazo."),
        ],
        "interpretacion": "IESP bajo indica fragilidad institucional: gobiernos en minoría, dificultad para aprobar presupuestos y tensión fiscal. Por debajo de 35, el riesgo de elecciónes anticipadas se dispara.",
        "referencias": "Lijphart (1999) · Tsebelis (2002) · Banco de España",
    },
    "ISMA": {
        "nombre": "Índice de Sentimiento Mediático y Agenda",
        "rango": "0–100 · (100 = agenda más positiva y equilibrada)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Sentimiento neto de la prensa (35 %)",
             "Promedio ponderado del sentimiento NLP de 12 medios nacionales: El País, El Mundo, ABC, RTVE, La Vanguardia, El Confidencial, elDiario.es, Expansión, Cinco Días, El Economista, InfoLibre y La Razón."),
            ("C2 · Diversidad de agenda (25 %)",
             "Entropía de Shannon de los temas presentes en la agenda mediática del día. Mayor diversidad = información más equilibrada y menos centrada en la crisis."),
            ("C3 · Ratio progreso/crisis (20 %)",
             "Proporción de noticias con 'framing' de progreso y avance frente a las enmarcadas como crisis o conflicto."),
            ("C4 · Equilibrio de cobertura (20 %)",
             "Desviación entre la cobertura mediática de cada partido y su peso electoral real. Penaliza la sobrerepresentación o la invisibilidad."),
        ],
        "interpretacion": "ISMA bajo refleja una agenda dominada por la crisis, el conflicto y el sentimiento negativo. Correlaciona con mayor volatilidad electoral y menor participación.",
        "referencias": "Entman (1993) · Boydstun et al. (2014) · Reuters Institute",
    },
    "ICED": {
        "nombre": "Índice de Crispación del Debate Público",
        "rango": "0–100 · (100 = máxima crispación)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Léxico confrontacional (35 %)",
             "Frecuencia de términos como 'traición', 'golpe', 'invasión', 'dictador' o 'fascista' en prensa política. Se normaliza con el máximo observado en la muestra histórica."),
            ("C2 · Actividad parlamentaria adversarial (30 %)",
             "Ratio entre mociones de censura, interpelaciones urgentes y preguntas sobre gestión de crisis vs. proposiciones de ley positivas. Mide si el Congreso legisla o solo confronta."),
            ("C3 · Volatilidad del sentimiento mediático (20 %)",
             "Desviación típica del sentimiento diario en las últimas 4 semanas. Alta variabilidad indica un clima de polémica permanente."),
            ("C4 · Agenda de temas de tensión (15 %)",
             "Porcentaje de noticias sobre temas históricamente polarizantes: memoria histórica, cuestión catalana, inmigración, aborto y educación concertada."),
        ],
        "interpretacion": "ICED alto indica un clima político de alta hostilidad verbal, con el debate parlamentario centrado en la confrontación en lugar de la legislación. Predice mayor abstención entre votantes moderados.",
        "referencias": "Iyengar et al. (2019) · Abramowitz & Webster (2016) · CIS Barómetros",
    },
    "ICGE": {
        "nombre": "Índice de Cohesión Gobierno-Electores",
        "rango": "0–100 · (100 = máxima cohesión)",
        "semaforo": "VERDE ≥60 · AMARILLO 35–59 · ROJO <35",
        "componentes": [
            ("C1 · Desgaste electoral del gobierno (35 %)",
             "Diferencia entre el resultado electoral del partido o coalición gobernante en las últimas generales y su estimación actual de intención de voto (nowcasting)."),
            ("C2 · Sentimiento mediático diferencial (25 %)",
             "Diferencia del sentimiento promedio en prensa entre los partidos de gobierno y los de oposición. Si la oposición tiene mejor cobertura, penaliza al gobierno."),
            ("C3 · Alineación con promesas macroeconómicas (25 %)",
             "Grado en que los indicadores de paro, PIB e IPC cumplen los objetivos implícitos en las promesas electorales del gobierno (paro <10 %, PIB >2 %, IPC <3 %)."),
            ("C4 · Ausencia de alertas críticas (15 %)",
             "Número y severidad de alertas sistémicas activas relacionadas con el gobierno en los últimos 14 días."),
        ],
        "interpretacion": "ICGE bajo indica que el gobierno ha perdido soporte popular respecto a su mandato electoral. Un ICGE <35 predice con alta probabilidad un 'voto de castigo' en las próximas elecciónes.",
        "referencias": "Powell (2000) · Duch & Stevenson (2008) · Barómetros CIS 2019-2025",
    },
    "IBEP": {
        "nombre": "Índice de Brecha Económico-Política",
        "rango": "0–100 · (100 = máxima brecha)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Correlación paro-castigo electoral (30 %)",
             "Correlación histórica entre la variación de la tasa de paro y la caída de voto al partido gobernante en España (1982-2023). Se aplica como factor de escala al cambio actual del paro."),
            ("C2 · Volatilidad de la prima de riesgo (25 %)",
             "Desviación típica de la prima de riesgo española en las últimas 20 sesiones bursátiles. Alta volatilidad refleja incertidumbre política percibida por los mercados."),
            ("C3 · Frustración económica ciudadana (25 %)",
             "Índice de confianza del consumidor y de valoración de la situación económica personal (CIS/Eurostat). Se normaliza con el rango histórico español."),
            ("C4 · Brecha presupuestaria (20 %)",
             "Desviación del déficit público real respecto al objetivo comprometido con la Comisión Europea. Incumplimientos persistentes amplifican la brecha político-económica."),
        ],
        "interpretacion": "IBEP alto indica que la economía está actuando como palanca de castigo electoral: los ciudadanos perciben que su situación económica es peor de lo que debería, y los mercados penalizan la incertidumbre política.",
        "referencias": "Lewis-Beck & Stegmaier (2000) · Alesina & Rosenthal (1995) · Banco de España",
    },
    "IVCE": {
        "nombre": "Índice de Vulnerabilidad del Contrato Electoral",
        "rango": "0–100 · (100 = máxima vulnerabilidad)",
        "semaforo": "VERDE ≤35 · AMARILLO 36–65 · ROJO >65",
        "componentes": [
            ("C1 · Distancia posicional entre partidos (30 %)",
             "Distancia euclidiana media entre los partidos relevantes (≥3 % de voto) en el plano ideológico bidimensional: eje izquierda-derecha × eje libertario-autoritario. Se normaliza con la diagonal del cuadrado 9×9 (≈12,73)."),
            ("C2 · Divergencia territorial del voto (25 %)",
             "Número de partidos distintos que ganan en alguna Comunidad Autónoma en las últimas elecciónes generales. Un partido ganando en todas → 0; 10 partidos distintos → 100."),
            ("C3 · Densidad de alertas sistémicas (25 %)",
             "Número y severidad de alertas activas en el sistema político en los últimos 30 días. Pondera: CRÍTICA ×20 puntos, AVISO ×8, INFORMATIVA ×2."),
            ("C4 · Concentración electoral HHI (20 %)",
             "Índice Herfindahl-Hirschman del sistema electoral. El óptimo de equilibrio es HHI≈0,25 (3-4 partidos equilibrados). Se penaliza tanto el bipartidismo extremo como la fragmentación extrema."),
        ],
        "interpretacion": "IVCE alto señala condiciones propicias para un voto de castigo masivo, emergencia de nuevas fuerzas políticas o abstención significativa. Detecta 'pre-crisis electorales' 6-18 meses antes.",
        "referencias": "Norris (2011) · Schedler (1998) · Dalton & Wattenberg (2000)",
    },
}

cols_met = st.columns(2)
for i, (codigo, doc) in enumerate(INDICES_DOC.items()):
    with cols_met[i % 2]:
        with st.expander(f"{codigo} · {doc['nombre']}"):
            semaforo_html = doc["semaforo"].replace("VERDE", '<span style="color:#10B981;font-weight:700">VERDE</span>').replace("AMARILLO", '<span style="color:#F59E0B;font-weight:700">AMARILLO</span>').replace("ROJO", '<span style="color:#EF4444;font-weight:700">ROJO</span>')
            st.markdown(f"""
            <div style="background:{PALE};border-radius:8px;padding:.6rem .8rem;margin-bottom:.6rem;font-size:.85rem">
                <strong>Rango:</strong> {doc['rango']}<br>
                <strong>Semáforo:</strong> {semaforo_html}
            </div>
            """, unsafe_allow_html=True)
            st.markdown("**Componentes:**")
            for nombre_c, desc_c in doc["componentes"]:
                st.markdown(f"**{nombre_c}**")
                st.markdown(f"<span style='font-size:.83rem;color:{MUTED}'>{desc_c}</span>", unsafe_allow_html=True)
            st.divider()
            st.markdown(f"**Interpretación:** {doc['interpretacion']}")
            st.caption(f"Referencias: {doc['referencias']}")
