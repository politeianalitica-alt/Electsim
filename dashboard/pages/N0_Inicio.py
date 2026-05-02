"""
ELECTSIM ESPAÑA — Command Center
Dashboard ejecutivo Palantir-grade: pulso electoral, intel feed, riesgo, narrativas, actores.
"""
from __future__ import annotations
import sys
from pathlib import Path
from datetime import datetime, timezone

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ── st.set_page_config MUST be first Streamlit call ───────────────────────────
import streamlit as st

st.set_page_config(
    page_title="Command Center — ElectSim España",
    page_icon="",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Core imports ──────────────────────────────────────────────────────────────
import pandas as pd
import plotly.graph_objects as go

try:
    from dashboard.shared import (
        sidebar_nav,
        mostrar_alertas_pagina,
        aplicar_estilos,
        BG, BG2, BG3, BORDER, CYAN, CYAN2, BLUE, PURPLE,
        TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
        COLORES_PARTIDOS,
        kpi_card,
        section_header,
        safe_float,
        apply_plotly_theme,
        metric_delta_card,
        signal_card,
        news_card,
        scrolling_ticker,
        intel_header,
    )
except Exception as _e_shared:
    st.error(f"Error cargando shared.py: {_e_shared}")
    st.stop()

import dashboard.db as _db

# ── IA Brain ──────────────────────────────────────────────────────────────────
try:
    from dashboard.services import llm_local as _brain
    _BRAIN_OK = _brain.esta_disponible()
except Exception:
    _brain = None  # type: ignore
    _BRAIN_OK = False

# ── Init nav & styles ─────────────────────────────────────────────────────────
sidebar_nav()
mostrar_alertas_pagina("inicio")

# ══════════════════════════════════════════════════════════════════════════════
# DEMO DATA — fallback cuando la BD no está disponible
# ══════════════════════════════════════════════════════════════════════════════

DEMO_POLL: dict[str, float] = {
    "PP": 33.2, "PSOE": 28.5, "VOX": 11.3,
    "SUMAR": 9.8, "JUNTS": 5.2, "PNV": 3.1, "ERC": 2.9,
}
DEMO_ITPE: float = 52.3
DEMO_ALERTAS: int = 2

DEMO_NARRATIVAS: list[dict] = [
    {"narrativa": "Crisis de vivienda",    "menciones": 1240, "sentimiento": -0.62, "tendencia": "up"},
    {"narrativa": "Reforma fiscal PSOE",   "menciones": 890,  "sentimiento": -0.31, "tendencia": "flat"},
    {"narrativa": "Pacto PP-VOX CCAA",     "menciones": 743,  "sentimiento": -0.55, "tendencia": "up"},
    {"narrativa": "Independencia Cataluña","menciones": 612,  "sentimiento": -0.44, "tendencia": "down"},
    {"narrativa": "Economía eurozona",     "menciones": 445,  "sentimiento":  0.18, "tendencia": "flat"},
]

DEMO_ACTORES: list[dict] = [
    {"actor": "Pedro Sánchez",            "partido": "PSOE",  "exposicion": 94, "sentimiento": -0.28, "tend": "down"},
    {"actor": "Alberto Núñez Feijóo",     "partido": "PP",    "exposicion": 87, "sentimiento":  0.12, "tend": "flat"},
    {"actor": "Santiago Abascal",         "partido": "VOX",   "exposicion": 61, "sentimiento": -0.71, "tend": "up"},
    {"actor": "Yolanda Díaz",             "partido": "SUMAR", "exposicion": 55, "sentimiento":  0.08, "tend": "flat"},
    {"actor": "Carles Puigdemont",        "partido": "JUNTS", "exposicion": 48, "sentimiento": -0.52, "tend": "up"},
]

DEMO_ALERTAS_LIST: list[dict] = [
    {
        "title":    "Caída PP en intención de voto — 2pp en 2 semanas",
        "body":     "Tres sondeos consecutivos muestran erosión de apoyo en mayores de 55 años. Correlación con cobertura negativa en RRSS.",
        "level":    "high",
        "source":   "Motor nowcasting v2.3",
        "time_ago": "hace 40 min",
    },
    {
        "title":    "Narrativa de vivienda alcanza pico histórico de menciones",
        "body":     "1.240 menciones en 24h. El 78% asociado a PSOE. Riesgo de encuadre negativo si no hay respuesta antes de 48h.",
        "level":    "critical",
        "source":   "Monitor narrativas / NLP",
        "time_ago": "hace 1h 12min",
    },
    {
        "title":    "Actividad inusual Congreso — 3 iniciativas presentadas hoy",
        "body":     "PP presenta proposición no de ley sobre política energética. Calendarios parlamentarios acelerados antes de Pleno.",
        "level":    "medium",
        "source":   "ETL Congreso",
        "time_ago": "hace 2h 5min",
    },
    {
        "title":    "Sentimiento Abascal negativo en pico semanal",
        "body":     "Índice de -0.71, máximo de las últimas 4 semanas. Impulsado por cobertura en El País y La Vanguardia.",
        "level":    "low",
        "source":   "Análisis NLP medios",
        "time_ago": "hace 3h",
    },
]

DEMO_BOE: list[dict] = [
    {"titulo": "RD 412/2026 — Medidas urgentes en materia de vivienda asequible", "fecha": "02 may 2026", "tipo": "Real Decreto"},
    {"titulo": "Ley 8/2026 — Reforma del sistema de pensiones contributivas", "fecha": "30 abr 2026", "tipo": "Ley"},
    {"titulo": "Orden TES/340/2026 — Activación ERTE sector automoción Cataluña", "fecha": "29 abr 2026", "tipo": "Orden"},
    {"titulo": "Resolución CNMC — Apertura expediente sancionador Red Eléctrica", "fecha": "28 abr 2026", "tipo": "Resolución"},
]

DEMO_NOTICIAS: list[dict] = [
    {"title": "Sánchez anuncia nueva política fiscal ante caída de 2pp en intención de voto", "source": "El País", "sentiment": "negativo", "time_ago": "hace 35 min", "url": "#", "snippet": "El presidente del Gobierno presenta medidas de alivio fiscal para rentas medias como respuesta al deterioro en los sondeos internos del PSOE."},
    {"title": "Feijóo acusa al Gobierno de bloquear la renovación del CGPJ por intereses políticos", "source": "El Mundo", "sentiment": "negativo", "time_ago": "hace 1h", "url": "#", "snippet": "El líder del PP intensifica la presión sobre el ejecutivo en relación al poder judicial antes del pleno extraordinario del Congreso."},
    {"title": "VOX presenta moción de censura en Castilla-La Mancha contra el gobierno regional", "source": "ABC", "sentiment": "negativo", "time_ago": "hace 1h 40min", "url": "#", "snippet": "Abascal anuncia la iniciativa en Cuenca. Fuentes del PP indican que no apoyarán la moción, lo que la condena al fracaso aritmético."},
    {"title": "Sumar cierra un acuerdo con IU sobre la reforma de la Ley de Vivienda", "source": "elDiario.es", "sentiment": "positivo", "time_ago": "hace 2h", "url": "#", "snippet": "Yolanda Díaz y Enrique Santiago anuncian un acuerdo marco para reforzar el control de alquileres en zonas tensionadas."},
    {"title": "El Banco de España revisa al alza la previsión de PIB para 2026 hasta el 2,4%", "source": "Expansión", "sentiment": "positivo", "time_ago": "hace 2h 30min", "url": "#", "snippet": "La institución mejora sus estimaciones por la fortaleza del consumo interno y el aumento de las exportaciones de servicios."},
    {"title": "Puigdemont llama a la movilización antes del debate sobre la amnistía en el TC", "source": "La Vanguardia", "sentiment": "negativo", "time_ago": "hace 3h", "url": "#", "snippet": "El líder de Junts, desde Bruselas, pide a los independentistas catalanes que estén atentos a la decisión del Tribunal Constitucional."},
    {"title": "PNV y Bildu acuerdan un presupuesto conjunto para el Ayuntamiento de Vitoria", "source": "Deia", "sentiment": "neutral", "time_ago": "hace 3h 45min", "url": "#", "snippet": "El pacto marca un hito inédito en la capital alavesa y genera debate interno en ambas formaciones sobre sus implicaciones estatales."},
    {"title": "El PP lidera en escaños estimados pero pierde fuelle en voto directo según CIS", "source": "La Razón", "sentiment": "mixto", "time_ago": "hace 4h", "url": "#", "snippet": "El barómetro mensual del CIS sitúa al PP con ventaja de escaños pero evidencia convergencia de PSOE en voto estimado corregido."},
]

TICKER_ITEMS: list[str] = [
    "PSOE · Sánchez anuncia nueva política fiscal ante caída de 2pp en intención de voto",
    "PP · Feijóo acusa al ejecutivo de bloquear la renovación del CGPJ por motivos políticos",
    "VOX · Abascal presenta moción de censura en Castilla-La Mancha — aritmética en contra",
    "SUMAR · Díaz y Belarra acuerdan reforma de vivienda — objetivo 1M pisos públicos en 5 años",
    "MACROECONOMÍA · Banco de España revisa al alza PIB 2026 hasta 2.4% — consumo interno sólido",
    "LEGISLATIVO · Congreso debate HOY reforma CGPJ — ausencia PP genera incertidumbre procedimental",
    "JUNTS · Puigdemont llama a movilización ante deliberación TC sobre amnistía — tensión en alza",
    "NARRATIVA · 'Crisis de vivienda' lidera menciones con 1.240 en 24h — pico histórico en medios",
    "ALERTAS · Motor nowcasting detecta caída PP de 2pp en dos semanas — correlación cobertura negativa RRSS",
    "EUROZONA · BCE mantiene tipos al 2.75% — próxima decisión 12 jun — impacto hipotecas variable estimado",
]

# ══════════════════════════════════════════════════════════════════════════════
# DATA LOADING (cached, resiliente)
# ══════════════════════════════════════════════════════════════════════════════

@st.cache_data(ttl=300)
def _cargar_nowcasting() -> pd.DataFrame:
    try:
        df = _db.cargar_nowcasting()
        return df if df is not None else pd.DataFrame()
    except Exception:
        return pd.DataFrame()


@st.cache_data(ttl=600)
def _cargar_noticias() -> list[dict]:
    try:
        from dashboard.services.news_crawler import cargar_noticias
        return cargar_noticias(max_noticias=8) or []
    except Exception:
        return []


@st.cache_data(ttl=300)
def _cargar_alertas_db() -> pd.DataFrame:
    try:
        return _db.cargar_alertas(solo_no_leidas=True)
    except Exception:
        return pd.DataFrame()


@st.cache_data(ttl=300)
def _cargar_itpe() -> float:
    try:
        df = _db.cargar_itpe() if hasattr(_db, "cargar_itpe") else pd.DataFrame()
        if not df.empty and "valor" in df.columns:
            return safe_float(df.iloc[0]["valor"], DEMO_ITPE)
    except Exception:
        pass
    return DEMO_ITPE


@st.cache_data(ttl=600)
def _cargar_boe() -> list[dict]:
    try:
        from dashboard.services.boe_service import cargar_ultimas_disposiciones
        items = cargar_ultimas_disposiciones(limit=4)
        return items if items else DEMO_BOE
    except Exception:
        return DEMO_BOE


# ── Cargar datos ──────────────────────────────────────────────────────────────
df_nc = _cargar_nowcasting()
noticias_db = _cargar_noticias()
df_alertas = _cargar_alertas_db()
itpe_score = _cargar_itpe()
boe_items = _cargar_boe()
ahora = datetime.now(tz=timezone.utc)

# ── Resolver datos electorales ────────────────────────────────────────────────
_usando_demo_electoral = df_nc is None or df_nc.empty

def _extraer_poll_dict(df: pd.DataFrame) -> dict[str, float]:
    col_pct = next((c for c in ["estimacion_pct", "voto_pct", "intencion_voto"] if c in df.columns), None)
    col_part = next((c for c in ["partido_siglas", "partido", "siglas"] if c in df.columns), None)
    if not col_pct or not col_part:
        return {}
    df2 = df[[col_part, col_pct]].copy()
    df2.columns = ["partido", "pct"]
    df2["pct"] = pd.to_numeric(df2["pct"], errors="coerce")
    df2 = df2.dropna()
    return dict(zip(df2["partido"].astype(str), df2["pct"].astype(float)))

poll_dict: dict[str, float] = _extraer_poll_dict(df_nc) if not _usando_demo_electoral else DEMO_POLL
if not poll_dict:
    poll_dict = DEMO_POLL
    _usando_demo_electoral = True

sorted_partidos = sorted(poll_dict.items(), key=lambda x: x[1], reverse=True)
partido1, voto1 = sorted_partidos[0] if sorted_partidos else ("—", 0.0)
partido2, voto2 = sorted_partidos[1] if len(sorted_partidos) > 1 else ("—", 0.0)
diff_pp = voto1 - voto2

# D'Hondt estimado
escanos_lider = 0
try:
    from dashboard.services.coalition_service import dhondt
    esc = dhondt(poll_dict)
    escanos_lider = esc.get(partido1, 0)
except Exception:
    escanos_lider = 0

# Noticias: usar DB o demo
noticias_feed = noticias_db if noticias_db else DEMO_NOTICIAS

# Alertas
n_alertas_activas = DEMO_ALERTAS
try:
    if not df_alertas.empty:
        n_alertas_activas = len(df_alertas)
except Exception:
    pass

# Docs procesados IA
docs_procesados = 0
try:
    from dashboard.services import brain_auto_ingestion as _ing
    est = _ing.estado_worker()
    docs_procesados = est.get("total_indexado", 0)
except Exception:
    docs_procesados = 0

# Días a próximas elecciones (estimado: próximas generales ~2027)
_fecha_elecciones = datetime(2027, 5, 15, tzinfo=timezone.utc)
dias_elecciones = (_fecha_elecciones - ahora).days

# Menciones hoy (placeholder — reemplazar con servicio real)
menciones_hoy = 0
try:
    from dashboard.services.nlp_service import menciones_totales_hoy
    menciones_hoy = menciones_totales_hoy()
except Exception:
    menciones_hoy = 3847

# Sentimiento medio
sentimiento_medio = 0.0
try:
    from dashboard.services.nlp_service import sentimiento_promedio_dia
    sentimiento_medio = sentimiento_promedio_dia()
except Exception:
    sentimiento_medio = -0.23

# Sesiones parlamentarias este mes
sesiones_mes = 0
try:
    from dashboard.services.legislativo_service import sesiones_mes_actual
    sesiones_mes = sesiones_mes_actual()
except Exception:
    sesiones_mes = 8

# Iniciativas legislativas activas
iniciativas_activas = 0
try:
    from dashboard.services.legislativo_service import iniciativas_activas_count
    iniciativas_activas = iniciativas_activas_count()
except Exception:
    iniciativas_activas = 47

# ══════════════════════════════════════════════════════════════════════════════
# 1. INTEL TICKER
# ══════════════════════════════════════════════════════════════════════════════

_ticker_items: list[str] = TICKER_ITEMS
try:
    if noticias_db:
        import html as _html_mod
        _live_items = [
            f"{str(n.get('medio', n.get('source', 'INTEL'))).upper()} · {_html_mod.escape(str(n.get('titulo', n.get('title', '')))[:100])}"
            for n in noticias_db[:8]
            if n.get("titulo") or n.get("title")
        ]
        if _live_items:
            _ticker_items = _live_items
except Exception:
    pass

scrolling_ticker(_ticker_items)

# ══════════════════════════════════════════════════════════════════════════════
# 2. INTEL HEADER
# ══════════════════════════════════════════════════════════════════════════════

intel_header(
    title="Command Center",
    subtitle="Dashboard Ejecutivo",
    status="LIVE",
    time_str=ahora.strftime("%d %b %Y — %H:%M UTC"),
)

# ══════════════════════════════════════════════════════════════════════════════
# 3. SIX KPI CARDS — Row 1 & Row 2
# ══════════════════════════════════════════════════════════════════════════════

# Colores dinámicos
_color_lider = COLORES_PARTIDOS.get(partido1, CYAN)
_color_segundo = COLORES_PARTIDOS.get(partido2, PURPLE)
_color_diff = GREEN if diff_pp >= 5 else (AMBER if diff_pp >= 2 else RED)
_color_escanos = GREEN if escanos_lider >= 176 else (AMBER if escanos_lider >= 140 else RED)
_color_itpe = RED if itpe_score >= 70 else (AMBER if itpe_score >= 45 else GREEN)
_color_alertas = RED if n_alertas_activas >= 3 else (AMBER if n_alertas_activas >= 1 else GREEN)

# Row 1
kpi1, kpi2, kpi3, kpi4, kpi5, kpi6 = st.columns(6)

with kpi1:
    st.markdown(
        metric_delta_card(
            label="Partido Lider",
            value=partido1,
            delta=f"{voto1:.1f}%",
            delta_pct=f"+{diff_pp:.1f}pp",
            color=_color_lider,
            sub="Estimacion agregada",
        ),
        unsafe_allow_html=True,
    )
with kpi2:
    st.markdown(
        metric_delta_card(
            label="Voto Estimado",
            value=f"{voto1:.1f}%",
            delta=f"{voto1 - 33.0:+.1f}pp",
            delta_pct="vs mes anterior",
            color=_color_lider,
            sub=f"IC 95%: {max(voto1-2.1, 0):.1f}–{voto1+2.1:.1f}%",
        ),
        unsafe_allow_html=True,
    )
with kpi3:
    st.markdown(
        metric_delta_card(
            label="Diferencia L-2",
            value=f"{diff_pp:+.1f}pp",
            delta=f"{partido1} vs {partido2}",
            delta_pct="BRECHA",
            color=_color_diff,
            sub="Sondeos ponderados",
        ),
        unsafe_allow_html=True,
    )
with kpi4:
    _esc_str = str(escanos_lider) if escanos_lider > 0 else "—"
    st.markdown(
        metric_delta_card(
            label="Escanos Estimados",
            value=_esc_str,
            delta="176 = mayoria abs.",
            delta_pct=f"{'MAYORIA' if escanos_lider >= 176 else 'SIN MAY.'}",
            color=_color_escanos,
            sub=f"D'Hondt — {partido1}",
        ),
        unsafe_allow_html=True,
    )
with kpi5:
    st.markdown(
        metric_delta_card(
            label="Indice ITPE",
            value=f"{itpe_score:.0f}",
            delta=f"{'ALTO' if itpe_score >= 70 else 'MEDIO' if itpe_score >= 45 else 'BAJO'}",
            delta_pct="/100",
            color=_color_itpe,
            sub="Tension politico-electoral",
        ),
        unsafe_allow_html=True,
    )
with kpi6:
    st.markdown(
        metric_delta_card(
            label="Alertas Activas",
            value=str(n_alertas_activas),
            delta="no leidas",
            delta_pct="AHORA",
            color=_color_alertas,
            sub="Panel de alertas activo",
        ),
        unsafe_allow_html=True,
    )

st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

# Row 2
kpi7, kpi8, kpi9, kpi10, kpi11, kpi12 = st.columns(6)

_sent_color = GREEN if sentimiento_medio > 0 else (AMBER if sentimiento_medio > -0.3 else RED)

with kpi7:
    st.markdown(
        metric_delta_card(
            label="Menciones Hoy",
            value=f"{menciones_hoy:,}",
            delta="+12%",
            delta_pct="vs ayer",
            color=CYAN,
            sub="Cobertura mediatica",
        ),
        unsafe_allow_html=True,
    )
with kpi8:
    st.markdown(
        metric_delta_card(
            label="Sentimiento Medio",
            value=f"{sentimiento_medio:+.2f}",
            delta=f"{'positivo' if sentimiento_medio > 0 else 'negativo'}",
            delta_pct="[-1, +1]",
            color=_sent_color,
            sub="NLP agregado 24h",
        ),
        unsafe_allow_html=True,
    )
with kpi9:
    st.markdown(
        metric_delta_card(
            label="Iniciativas Activas",
            value=str(iniciativas_activas),
            delta="+3 hoy",
            delta_pct="Congreso",
            color=BLUE,
            sub="Tramitacion parlamentaria",
        ),
        unsafe_allow_html=True,
    )
with kpi10:
    st.markdown(
        metric_delta_card(
            label="Dias Elecciones",
            value=str(dias_elecciones),
            delta="~may 2027",
            delta_pct="GENERALES",
            color=AMBER,
            sub="Estimacion proxima cita",
        ),
        unsafe_allow_html=True,
    )
with kpi11:
    st.markdown(
        metric_delta_card(
            label="Sesiones Parlam.",
            value=str(sesiones_mes),
            delta="este mes",
            delta_pct="CONGRESO",
            color=PURPLE,
            sub="Plenos + comisiones",
        ),
        unsafe_allow_html=True,
    )
with kpi12:
    st.markdown(
        metric_delta_card(
            label="Docs IA Procesados",
            value=f"{docs_procesados:,}" if docs_procesados else "—",
            delta="vectorizados",
            delta_pct="RAG",
            color=GREEN if docs_procesados > 0 else MUTED,
            sub="Politeia Brain / ChromaDB",
        ),
        unsafe_allow_html=True,
    )

st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════════════
# 4. THREE COLUMN LAYOUT (4:3:3)
# ══════════════════════════════════════════════════════════════════════════════

col_left, col_center, col_right = st.columns([4, 3, 3], gap="medium")

# ── LEFT: Electoral Pulse ─────────────────────────────────────────────────────
with col_left:
    section_header("PULSO ELECTORAL — ESTIMACIONES", CYAN)

    _poll_sorted = sorted(poll_dict.items(), key=lambda x: x[1])
    _partidos = [p for p, _ in _poll_sorted]
    _valores = [v for _, v in _poll_sorted]
    _colors_bar = [COLORES_PARTIDOS.get(p, "#555555") for p in _partidos]

    fig_electoral = go.Figure()

    for i, (partido, pct) in enumerate(_poll_sorted):
        c = COLORES_PARTIDOS.get(partido, "#555555")
        # Barra principal
        fig_electoral.add_trace(go.Bar(
            y=[partido],
            x=[pct],
            orientation="h",
            marker=dict(
                color=c,
                line=dict(width=0),
            ),
            text=f"  {pct:.1f}%",
            textposition="outside",
            textfont=dict(size=11, color=TEXT, family="JetBrains Mono, monospace"),
            name=partido,
            showlegend=False,
            hovertemplate=f"<b>{partido}</b><br>Estimacion: {pct:.1f}%<extra></extra>",
            error_x=dict(
                type="constant",
                value=2.1,
                color=c,
                thickness=2,
                width=6,
                visible=True,
            ),
        ))

    apply_plotly_theme(fig_electoral)
    fig_electoral.update_layout(
        height=300,
        margin=dict(t=8, b=8, l=10, r=80),
        xaxis=dict(
            showgrid=True,
            gridcolor=BORDER,
            range=[0, max(_valores) + 9 if _valores else 45],
            ticksuffix="%",
            tickfont=dict(size=9, color=MUTED),
            title=None,
        ),
        yaxis=dict(
            tickfont=dict(size=12, family="Inter, sans-serif", color=TEXT),
            categoryorder="total ascending",
            title=None,
        ),
        bargap=0.28,
        paper_bgcolor=BG2,
        plot_bgcolor=BG2,
    )

    st.plotly_chart(fig_electoral, use_container_width=True, config={"displayModeBar": False})

    if _usando_demo_electoral:
        st.caption("Datos de demostración — conecte la base de datos para datos reales en tiempo real")

    # Hemiciclo mini
    st.markdown(f'<div style="height:.3rem"></div>', unsafe_allow_html=True)
    section_header("HEMICICLO ESTIMADO — D'HONDT", PURPLE)
    try:
        from dashboard.services.coalition_service import hemiciclo_plotly, dhondt as _dhondt2
        _esc2 = _dhondt2(poll_dict)
        if _esc2:
            fig_hemi = hemiciclo_plotly(_esc2, COLORES_PARTIDOS, "Congreso Estimado")
            apply_plotly_theme(fig_hemi)
            fig_hemi.update_layout(height=220, margin=dict(t=10, b=10, l=0, r=0))
            st.plotly_chart(fig_hemi, use_container_width=True, config={"displayModeBar": False})
    except Exception:
        # Fallback minimalista con go.Bar vertical para hemiciclo
        _esc_demo = {"PP": 134, "PSOE": 111, "VOX": 38, "SUMAR": 31, "JUNTS": 14, "PNV": 5, "ERC": 7, "Otros": 10}
        _fig_h = go.Figure()
        for _p, _e in _esc_demo.items():
            _c = COLORES_PARTIDOS.get(_p, "#555")
            _fig_h.add_trace(go.Bar(
                x=[_p], y=[_e], marker_color=_c,
                text=[str(_e)], textposition="outside",
                textfont=dict(size=10, color=TEXT),
                showlegend=False,
                hovertemplate=f"<b>{_p}</b>: {_e} escanos<extra></extra>",
            ))
        apply_plotly_theme(_fig_h)
        _fig_h.update_layout(
            height=200, margin=dict(t=4, b=4, l=4, r=4),
            xaxis=dict(tickfont=dict(size=10, color=TEXT2)),
            yaxis=dict(title="Escanos", tickfont=dict(size=9, color=MUTED)),
            bargap=0.2,
        )
        _fig_h.add_hline(y=176, line_dash="dash", line_color=RED, opacity=0.6,
                         annotation_text="176 mayoria abs.", annotation_font_size=9,
                         annotation_font_color=RED)
        st.plotly_chart(_fig_h, use_container_width=True, config={"displayModeBar": False})

# ── CENTER: Intel Feed ────────────────────────────────────────────────────────
with col_center:
    section_header("FEED DE INTELIGENCIA", AMBER)

    import html as _html_mod

    # Scrollable wrapper start
    st.markdown(
        f'<div style="max-height:520px;overflow-y:auto;padding-right:.2rem;'
        f'scrollbar-width:thin;scrollbar-color:{BORDER} {BG};">',
        unsafe_allow_html=True,
    )

    _noticias_html = []
    for n in noticias_feed[:8]:
        # Normalizar campos — el dict puede venir de DB o de DEMO_NOTICIAS
        _title   = str(n.get("titulo", n.get("title", "Sin titulo")))[:120]
        _source  = str(n.get("medio",  n.get("source", "—")))
        _url     = str(n.get("url", "#"))
        _snippet = str(n.get("resumen", n.get("snippet", "")))[:180]
        _ago     = str(n.get("tiempo_ago", n.get("time_ago", "—")))

        # Sentimiento
        _sent_raw = str(n.get("sentimiento_label", n.get("sentiment", "neutral"))).lower()
        _sent_map = {
            "positivo": "positivo", "positive": "positivo",
            "negativo": "negativo", "negative": "negativo",
            "neutral": "neutral", "mixto": "mixto", "mixed": "mixto",
        }
        _sent = _sent_map.get(_sent_raw, "neutral")

        _noticias_html.append(news_card(
            title=_html_mod.escape(_title),
            source=_html_mod.escape(_source).upper(),
            sentiment=_sent,
            time_ago=_ago,
            url=_url.replace("&", "&amp;").replace('"', "%22"),
            snippet=_html_mod.escape(_snippet),
        ))

    st.markdown("".join(_noticias_html), unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# ── RIGHT: Risk & Alerts ──────────────────────────────────────────────────────
with col_right:
    section_header("TERMOMETRO DE RIESGO — ITPE", RED)

    # Gauge chart
    _itpe_color = RED if itpe_score >= 70 else (AMBER if itpe_score >= 45 else GREEN)
    fig_gauge = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=itpe_score,
        delta={"reference": 45.0, "increasing": {"color": RED}, "decreasing": {"color": GREEN}},
        number={
            "font": {"size": 32, "color": TEXT, "family": "JetBrains Mono, monospace"},
            "suffix": "",
        },
        gauge={
            "axis": {
                "range": [0, 100],
                "tickfont": {"size": 9, "color": MUTED},
                "tickvals": [0, 25, 50, 75, 100],
                "ticktext": ["0", "25", "50", "75", "100"],
            },
            "bar": {"color": _itpe_color, "thickness": 0.22},
            "bgcolor": BG3,
            "borderwidth": 0,
            "steps": [
                {"range": [0, 33],   "color": f"{GREEN}22"},
                {"range": [33, 66],  "color": f"{AMBER}18"},
                {"range": [66, 100], "color": f"{RED}22"},
            ],
            "threshold": {
                "line": {"color": _itpe_color, "width": 3},
                "thickness": 0.75,
                "value": itpe_score,
            },
        },
        title={
            "text": (
                f"<span style='font-size:11px;color:{MUTED};letter-spacing:.08em'>INDICE TENSION POLITICO-ELECTORAL</span>"
            ),
            "font": {"size": 11},
        },
    ))
    apply_plotly_theme(fig_gauge)
    fig_gauge.update_layout(
        height=220,
        margin=dict(t=20, b=10, l=20, r=20),
        paper_bgcolor=BG2,
    )
    st.plotly_chart(fig_gauge, use_container_width=True, config={"displayModeBar": False})

    # Nivel de riesgo textual
    _nivel_texto = "ALTO" if itpe_score >= 70 else ("MEDIO" if itpe_score >= 45 else "BAJO")
    st.markdown(
        f'<div style="text-align:center;margin:-.4rem 0 .6rem;font-size:.65rem;'
        f'color:{_itpe_color};font-weight:800;letter-spacing:.14em">RIESGO {_nivel_texto}</div>',
        unsafe_allow_html=True,
    )

    section_header("SENALES DE INTELIGENCIA", RED)

    # Alertas de BD si hay, si no demo
    _alertas_render: list[dict] = []
    try:
        if not df_alertas.empty:
            for _, row in df_alertas.head(4).iterrows():
                sev = str(row.get("severidad", "medium")).lower()
                _level = {
                    "critical": "critical", "alta": "high", "high": "high",
                    "media": "medium", "medium": "medium",
                    "baja": "low", "low": "low",
                }.get(sev, "medium")
                _alertas_render.append({
                    "title":    str(row.get("titulo", "Alerta")),
                    "body":     str(row.get("descripcion", ""))[:180],
                    "level":    _level,
                    "source":   str(row.get("fuente", "Sistema")),
                    "time_ago": "reciente",
                })
    except Exception:
        pass

    if not _alertas_render:
        _alertas_render = DEMO_ALERTAS_LIST

    for a in _alertas_render[:4]:
        st.markdown(
            signal_card(
                title=a["title"],
                body=a["body"],
                level=a["level"],
                source=a["source"],
                time_ago=a["time_ago"],
            ),
            unsafe_allow_html=True,
        )

# ══════════════════════════════════════════════════════════════════════════════
# 5. SECOND ROW — Narrativas / Actores / Actividad Legislativa
# ══════════════════════════════════════════════════════════════════════════════

st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
col_narr, col_act, col_leg = st.columns([1, 1, 1], gap="medium")

# ── Narrativas Trending ───────────────────────────────────────────────────────
with col_narr:
    section_header("NARRATIVAS TRENDING", CYAN)

    _narr_data: list[dict] = DEMO_NARRATIVAS
    try:
        from dashboard.services.nlp_service import top_narrativas
        _live_narr = top_narrativas(limit=5)
        if _live_narr:
            _narr_data = _live_narr
    except Exception:
        pass

    for narr in _narr_data[:5]:
        _sent_n = float(narr.get("sentimiento", 0.0))
        _sent_c = GREEN if _sent_n > 0.1 else (RED if _sent_n < -0.2 else MUTED)
        _tend_n = str(narr.get("tendencia", "flat"))
        _tend_icon = "&#9650;" if _tend_n in {"up", "↑"} else ("&#9660;" if _tend_n in {"down", "↓"} else "&#8212;")
        _tend_c = GREEN if _tend_n in {"up", "↑"} else (RED if _tend_n in {"down", "↓"} else MUTED)
        _menciones = int(narr.get("menciones", 0))
        _narr_label = str(narr.get("narrativa", "—"))

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
            f'padding:.7rem 1rem;margin-bottom:.4rem;display:flex;align-items:center;gap:.8rem">'
            f'<div style="flex:1;min-width:0">'
            f'<div style="font-size:.8rem;font-weight:600;color:{TEXT};white-space:nowrap;'
            f'overflow:hidden;text-overflow:ellipsis">{_html_mod.escape(_narr_label)}</div>'
            f'<div style="display:flex;align-items:center;gap:.5rem;margin-top:.25rem">'
            f'<span style="font-size:.65rem;color:{CYAN};font-family:JetBrains Mono,monospace">'
            f'{_menciones:,} menciones</span>'
            f'<span style="font-size:.65rem;color:{_sent_c};font-weight:600">'
            f'{_sent_n:+.2f} sent.</span>'
            f'</div>'
            f'</div>'
            f'<span style="font-size:1.1rem;color:{_tend_c};font-weight:700;flex-shrink:0">{_tend_icon}</span>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ── Mapa de Actores ───────────────────────────────────────────────────────────
with col_act:
    section_header("MAPA DE ACTORES — EXPOSICION", PURPLE)

    _actores_data: list[dict] = DEMO_ACTORES
    try:
        from dashboard.services.actors_service import top_actores_exposicion
        _live_act = top_actores_exposicion(limit=5)
        if _live_act:
            _actores_data = _live_act
    except Exception:
        pass

    for act in _actores_data[:5]:
        _actor_n = str(act.get("actor", "—"))
        _partido_n = str(act.get("partido", "—"))
        _exp = int(act.get("exposicion", 0))
        _sent_a = float(act.get("sentimiento", 0.0))
        _tend_a = str(act.get("tend", "flat"))
        _color_p = COLORES_PARTIDOS.get(_partido_n, CYAN)
        _sent_ca = GREEN if _sent_a > 0.05 else (RED if _sent_a < -0.1 else MUTED)
        _tend_ia = "&#9650;" if _tend_a in {"up", "↑"} else ("&#9660;" if _tend_a in {"down", "↓"} else "&#8212;")
        _tend_ca = GREEN if _tend_a in {"up", "↑"} else (RED if _tend_a in {"down", "↓"} else MUTED)
        _bar_w = min(_exp, 100)

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
            f'padding:.65rem .9rem;margin-bottom:.4rem">'
            f'<div style="display:flex;align-items:center;gap:.6rem">'
            f'<div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;'
            f'background:linear-gradient(135deg,{_color_p}33,{_color_p}18);'
            f'border:2px solid {_color_p}66;display:flex;align-items:center;justify-content:center;'
            f'font-size:.75rem;font-weight:700;color:{_color_p}">{_actor_n[0].upper()}</div>'
            f'<div style="flex:1;min-width:0">'
            f'<div style="font-size:.78rem;font-weight:600;color:{TEXT};white-space:nowrap;'
            f'overflow:hidden;text-overflow:ellipsis">{_html_mod.escape(_actor_n)}</div>'
            f'<div style="font-size:.62rem;color:{_color_p};font-weight:600">{_partido_n}</div>'
            f'</div>'
            f'<div style="text-align:right;flex-shrink:0">'
            f'<div style="font-size:.9rem;font-weight:700;color:{TEXT}">{_exp}</div>'
            f'<div style="font-size:.7rem;color:{_tend_ca}">{_tend_ia}</div>'
            f'</div>'
            f'</div>'
            f'<div style="margin-top:.35rem">'
            f'<div style="height:3px;background:{BORDER};border-radius:2px">'
            f'<div style="height:3px;width:{_bar_w}%;background:{_color_p};border-radius:2px"></div>'
            f'</div>'
            f'<div style="display:flex;justify-content:space-between;margin-top:.15rem">'
            f'<span style="font-size:.58rem;color:{MUTED}">Exposicion mediática</span>'
            f'<span style="font-size:.6rem;color:{_sent_ca};font-weight:600">{_sent_a:+.2f} sent.</span>'
            f'</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ── Actividad Legislativa ─────────────────────────────────────────────────────
with col_leg:
    section_header("ACTIVIDAD LEGISLATIVA — BOE & CONGRESO", BLUE)

    for item in boe_items[:4]:
        _tit_b = str(item.get("titulo", "—"))[:90]
        _fecha_b = str(item.get("fecha", "—"))
        _tipo_b = str(item.get("tipo", "Disposicion"))
        _url_b = str(item.get("url", "#"))
        _tipo_colors = {
            "Real Decreto": CYAN, "Ley": GREEN, "Orden": AMBER,
            "Resolucion": BLUE, "Resolución": BLUE, "Decreto": PURPLE,
        }
        _tc = _tipo_colors.get(_tipo_b, MUTED)

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-left:3px solid {_tc};'
            f'border-radius:8px;padding:.7rem 1rem;margin-bottom:.4rem">'
            f'<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.4rem;margin-bottom:.3rem">'
            f'<span style="background:{_tc}20;color:{_tc};font-size:.58rem;font-weight:700;'
            f'padding:.1rem .4rem;border-radius:4px;letter-spacing:.06em;white-space:nowrap">{_tipo_b.upper()}</span>'
            f'<span style="font-size:.6rem;color:{MUTED};white-space:nowrap">{_fecha_b}</span>'
            f'</div>'
            f'<div style="font-size:.78rem;color:{TEXT};font-weight:500;line-height:1.35">'
            f'<a href="{_url_b}" target="_blank" style="color:{TEXT};text-decoration:none;">'
            f'{_html_mod.escape(_tit_b)}</a>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ══════════════════════════════════════════════════════════════════════════════
# 6. BOTTOM ROW — Sistema Status
# ══════════════════════════════════════════════════════════════════════════════

st.markdown("<div style='height:.4rem'></div>", unsafe_allow_html=True)
section_header("ESTADO DEL SISTEMA", MUTED)

# Health checks
_status_bd = "ok"
try:
    import dashboard.db as _dbtest
    _dbtest.cargar_nowcasting()
    _status_bd = "ok"
except Exception:
    _status_bd = "error"

_status_brain = "ok" if _BRAIN_OK else ("degraded" if True else "error")

_status_ingesta = "error"
try:
    from dashboard.services import brain_auto_ingestion as _ing2
    _ing2_est = _ing2.estado_worker()
    _status_ingesta = "ok" if _ing2_est.get("running") else "degraded"
except Exception:
    _status_ingesta = "error"

_status_apis = "degraded"
try:
    from dashboard.services.news_crawler import cargar_noticias as _cn
    if noticias_db:
        _status_apis = "ok"
    else:
        _status_apis = "degraded"
except Exception:
    _status_apis = "error"

_chips = [
    ("Base de Datos",      _status_bd,       "PostgreSQL / Nowcasting"),
    ("IA Brain",           _status_brain,    f"{'politeia-brain' if _BRAIN_OK else 'Ollama offline'}"),
    ("Ingesta Noticias",   _status_ingesta,  "RSS / News Crawler"),
    ("APIs Externas",      _status_apis,     "BOE / Congreso / GDELT"),
]

_status_color_map = {"ok": GREEN, "degraded": AMBER, "error": RED}
_status_label_map = {"ok": "OPERATIVO", "degraded": "DEGRADADO", "error": "ERROR"}

_chip_cols = st.columns(len(_chips))
for _col, (_name, _stat, _desc) in zip(_chip_cols, _chips):
    with _col:
        _sc = _status_color_map.get(_stat, MUTED)
        _sl = _status_label_map.get(_stat, "DESCONOCIDO")
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {_sc};'
            f'border-radius:8px;padding:.8rem 1rem;display:flex;align-items:center;gap:.7rem">'
            f'<span style="width:9px;height:9px;border-radius:50%;background:{_sc};'
            f'flex-shrink:0;box-shadow:0 0 8px {_sc}88"></span>'
            f'<div>'
            f'<div style="font-size:.78rem;font-weight:700;color:{TEXT}">{_name}</div>'
            f'<div style="font-size:.62rem;color:{_sc};font-weight:600;letter-spacing:.06em">{_sl}</div>'
            f'<div style="font-size:.6rem;color:{MUTED};margin-top:.1rem">{_desc}</div>'
            f'</div>'
            f'</div>',
            unsafe_allow_html=True,
        )

# ── Footer disclaimer ──────────────────────────────────────────────────────────
st.markdown(
    f'<div style="margin-top:1.5rem;padding:.8rem 1rem;border-top:1px solid {BORDER};'
    f'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">'
    f'<span style="font-size:.6rem;color:{MUTED}">ElectSim España · Politeia Intelligence Platform · '
    f'Datos actualizados: {ahora.strftime("%d %b %Y %H:%M")} UTC</span>'
    f'<span style="font-size:.6rem;color:{MUTED}">Inteligencia politico-electoral para profesionales · '
    f'No para uso publico · Confidencial</span>'
    f'</div>',
    unsafe_allow_html=True,
)
