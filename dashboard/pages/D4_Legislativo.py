"""
D4 — Monitor Legislativo (v2 Premium)
======================================
Legislative Intelligence Monitor para ElectSim España.
Cobertura completa: actividad parlamentaria, seguimiento de leyes,
BOE en directo, matemáticas de coalición, productividad legislativa por actor.

Tabs:
  1. ACTIVIDAD PARLAMENTARIA — agenda semanal, votaciones próximas, math coalición
  2. SEGUIMIENTO DE LEYES — pipeline por fases, filtros, tracker 8 leyes clave
  3. BOE & NORMATIVA — sumario diario clasificado por impacto, IA por entrada
  4. COALICIONES PARLAMENTARIAS — math de escaños, heatmap alineación, sorpresas
  5. INICIATIVAS POR ACTOR — productividad, score legislativo, temas por actor
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta
from pathlib import Path

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from dashboard.shared import (
    sidebar_nav, mostrar_alertas_pagina, aplicar_estilos,
    intel_header, apply_plotly_theme, section_header, kpi_card,
    BG, BG2, BG3, BORDER, CYAN, BLUE, PURPLE, AMBER, RED, GREEN,
    TEXT, TEXT2, MUTED, COLORES_PARTIDOS,
)
import dashboard.db as _db

try:
    from dashboard.services import git_amigos_bridge as _git_amigos
except Exception:
    _git_amigos = None  # type: ignore

# ── Bloque 1 Core Legislativo — imports defensivos ────────────────────────────
try:
    from dashboard.services.legislative_core import (
        cargar_boe_reciente,
        cargar_boe_hoy,
        cargar_iniciativas_recientes,
        cargar_kpis_legislativos,
        cargar_alertas_legislativas,
        buscar_items_legislativos,
        enriquecer_boe_legacy,
    )
    _LEG_CORE_OK = True
except Exception as _leg_err:
    _LEG_CORE_OK = False
    def cargar_boe_reciente(**kw): import pandas as pd; return pd.DataFrame()
    def cargar_boe_hoy(): import pandas as pd; return pd.DataFrame()
    def cargar_iniciativas_recientes(**kw): import pandas as pd; return pd.DataFrame()
    def cargar_kpis_legislativos(): return {"hay_datos": False}
    def cargar_alertas_legislativas(**kw): import pandas as pd; return pd.DataFrame()
    def buscar_items_legislativos(q, **kw): import pandas as pd; return pd.DataFrame()
    def enriquecer_boe_legacy(items): return items

st.set_page_config(
    page_title="Monitor Legislativo — ElectSim",
    page_icon="",
    layout="wide",
)
aplicar_estilos()
sidebar_nav()
mostrar_alertas_pagina("legislativo")

# ═══════════════════════════════════════════════════════════════════════════════
# SERVICIOS — imports defensivos
# ═══════════════════════════════════════════════════════════════════════════════

# Composición hemiciclo
try:
    from dashboard.services.coalition_service import (
        get_composicion_hemiciclo as _get_composicion_hemiciclo,
        get_total_escanos as _get_total_escanos,
        get_mayoria_absoluta as _get_mayoria_absoluta,
    )
    _COALITION_OK = True
except Exception:
    _COALITION_OK = False
    def _get_composicion_hemiciclo(): return {}
    def _get_total_escanos(): return 350
    def _get_mayoria_absoluta(): return 176

# Votaciones reales
try:
    from dashboard.services.congreso_votaciones import (
        cargar_votaciones_recientes as _cargar_votaciones_recientes,
        get_alineacion_partidos as _get_alineacion_partidos,
    )
    _VOTACIONES_OK = True
except Exception:
    _VOTACIONES_OK = False
    def _cargar_votaciones_recientes(limit=10): return pd.DataFrame()
    def _get_alineacion_partidos(): return {}

# Productividad de actores
try:
    from dashboard.services.actors_service import (
        cargar_productividad_parlamentaria as _cargar_productividad_parlamentaria,
    )
    _ACTORS_OK = True
except Exception:
    _ACTORS_OK = False
    def _cargar_productividad_parlamentaria(): return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════════════════════
# CONSTANTES — SOLO CONSTITUCIONALES (no son datos, son reglas)
# ═══════════════════════════════════════════════════════════════════════════════

TOTAL_ESCANOS = 350   # Art. 68 CE — número fijo de diputados
MAYORIA_ABS = 176     # Math: floor(350/2) + 1


# ═══════════════════════════════════════════════════════════════════════════════
# LOADERS con caché — conectados a servicios reales
# ═══════════════════════════════════════════════════════════════════════════════

@st.cache_data(ttl=3600)
def _cargar_composicion_hemiciclo() -> dict[str, int]:
    """Composición actual del Congreso. Retorna {} si no hay datos en BD."""
    return _get_composicion_hemiciclo()


@st.cache_data(ttl=1800)
def _cargar_votaciones_dashboard(limit: int = 10) -> pd.DataFrame:
    """Votaciones recientes del store. DataFrame vacío si sin datos."""
    try:
        return _cargar_votaciones_recientes(limit=limit)
    except Exception:
        return pd.DataFrame()


@st.cache_data(ttl=3600)
def _cargar_alineacion() -> dict:
    """Matriz de alineación entre partidos. {} si sin datos suficientes."""
    try:
        return _get_alineacion_partidos()
    except Exception:
        return {}


@st.cache_data(ttl=3600)
def _cargar_productividad() -> pd.DataFrame:
    """Productividad parlamentaria por actor. DataFrame vacío si sin datos."""
    try:
        return _cargar_productividad_parlamentaria()
    except Exception:
        return pd.DataFrame()


# ═══════════════════════════════════════════════════════════════════════════════
# UI CONFIG — solo etiquetas y colores (permitido hardcodear)
# ═══════════════════════════════════════════════════════════════════════════════

FASES_LEGISLATIVAS = [
    "Iniciativa",
    "Ponencia",
    "Pleno Congreso",
    "Senado",
    "Promulgación",
]

URGENCIA_CFG = {
    "critica": {"color": RED, "label": "CRÍTICA", "border": "#7F1D1D"},
    "alta": {"color": AMBER, "label": "ALTA", "border": "#78350F"},
    "media": {"color": BLUE, "label": "MEDIA", "border": "#1E3A5F"},
    "baja": {"color": GREEN, "label": "BAJA", "border": "#064E3B"},
}

AREAS_COLOR = {
    "Social": CYAN,
    "Económico": AMBER,
    "Tecnología": PURPLE,
    "Institucional": RED,
    "Fiscal": BLUE,
    "Medioambiental": GREEN,
}

# ── Funciones de carga ────────────────────────────────────────────────────────

IMPACT_CFG = {
    "CRÍTICO":     {"color": RED,    "border": "#7F1D1D", "bg": "#1A0A0A", "icon": "●"},
    "ALTO":        {"color": AMBER,  "border": "#78350F", "bg": "#1A1000", "icon": "●"},
    "MEDIO":       {"color": "#F59E0B", "border": "#92400E", "bg": "#171000", "icon": "●"},
    "BAJO":        {"color": GREEN,  "border": "#064E3B", "bg": "#091510", "icon": "●"},
    "INFORMATIVO": {"color": MUTED,  "border": BORDER,   "bg": BG2,       "icon": "○"},
}


@st.cache_data(ttl=300)
def _cargar_boe(fecha: str | None = None) -> list[dict]:
    """
    Carga ítems del BOE en este orden de prioridad:
      1. Tabla legal_items (Bloque 1 Core — datos reales)
      2. API BOE en tiempo real (boe_api.py)
      3. Lista vacía (D4 mostrará demo data)
    """
    # 1. Tabla legal_items (ingesta real via BOEMonitor)
    if _LEG_CORE_OK:
        try:
            df = cargar_boe_hoy() if fecha is None else cargar_boe_reciente(limit=200, days=1)
            if not df.empty:
                return df.to_dict("records")
        except Exception:
            pass

    # 2. Fallback: API BOE tiempo real
    try:
        from dashboard.services.boe_api import obtener_sumario
        items = obtener_sumario(fecha)
        if items:
            return enriquecer_boe_legacy(items)
    except Exception:
        pass

    return []


@st.cache_data(ttl=300)
def _clasificar_impacto(titulo: str, seccion: str, dept: str) -> str:
    try:
        from dashboard.services.boe_api import clasificar_impacto
        return clasificar_impacto(titulo, seccion, dept)
    except Exception:
        titulo_l = titulo.lower()
        if any(w in titulo_l for w in ["real decreto-ley", "estado de alarma", "presupuesto general"]):
            return "CRÍTICO"
        if any(w in titulo_l for w in ["real decreto", "ley orgánica", "ley "]):
            return "ALTO"
        if any(w in titulo_l for w in ["orden", "resolución", "instrucción"]):
            return "MEDIO"
        if any(w in titulo_l for w in ["anuncio", "convocatoria", "licitación"]):
            return "BAJO"
        return "INFORMATIVO"


def _prob_bar(prob: float, color: str) -> str:
    pct = int(prob * 100)
    bar_color = GREEN if prob >= 0.6 else (AMBER if prob >= 0.4 else RED)
    return (
        f'<div style="display:flex;align-items:center;gap:.5rem;">'
        f'<div style="flex:1;height:6px;background:{BORDER};border-radius:3px;">'
        f'<div style="height:6px;width:{pct}%;background:{bar_color};border-radius:3px;"></div>'
        f'</div>'
        f'<span style="font-size:.72rem;font-weight:700;color:{bar_color};min-width:36px;">{pct}%</span>'
        f'</div>'
    )


def _fase_bar(fase: int, n_fases: int = 5) -> str:
    pills = ""
    for i in range(n_fases):
        if i < fase:
            c = CYAN
        elif i == fase:
            c = AMBER
        else:
            c = f"{BORDER}"
        pills += f'<div class="stage-pill" style="background:{c};"></div>'
    return f'<div class="stage-bar">{pills}</div>'


def _urgencia_badge(urgencia: str) -> str:
    cfg = URGENCIA_CFG.get(urgencia, URGENCIA_CFG["media"])
    return (
        f'<span style="background:{cfg["color"]}22;color:{cfg["color"]};'
        f'font-size:.6rem;font-weight:800;padding:.2rem .55rem;'
        f'border-radius:6px;letter-spacing:.08em">{cfg["label"]}</span>'
    )


def _area_badge(area: str) -> str:
    c = AREAS_COLOR.get(area, MUTED)
    return (
        f'<span style="background:{c}22;color:{c};font-size:.6rem;'
        f'font-weight:700;padding:.15rem .5rem;border-radius:5px">{area}</span>'
    )


def _render_boe_card(item: dict) -> None:
    imp = item.get("impacto", "INFORMATIVO")
    cfg = IMPACT_CFG.get(imp, IMPACT_CFG["INFORMATIVO"])
    titulo = item.get("titulo", "Sin título")[:160]
    dept = item.get("departamento", "—")
    sec = item.get("seccion", "—")
    epi = item.get("epigrafe", "")
    url = item.get("url_html", item.get("url", "#"))
    id_boe = item.get("id", "")
    link_html = (
        f'<a href="{url}" target="_blank" rel="noopener noreferrer" '
        f'style="font-size:.72rem;color:{CYAN};text-decoration:none">Ver en BOE ↗</a>'
        if url and url != "#" else ""
    )
    st.markdown(
        f'<div style="background:{cfg["bg"]};border:1px solid {cfg["border"]};'
        f'border-left:4px solid {cfg["color"]};border-radius:10px;'
        f'padding:.85rem 1rem;margin-bottom:.55rem">'
        f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.35rem">'
        f'<span style="background:{cfg["color"]}22;color:{cfg["color"]};'
        f'font-size:.62rem;font-weight:800;letter-spacing:.1em;padding:.2rem .6rem;'
        f'border-radius:99px;border:1px solid {cfg["color"]}44">'
        f'{cfg["icon"]} {imp}</span>'
        f'<span style="font-size:.68rem;color:{MUTED};font-family:monospace">Sección {sec}</span>'
        f'<span style="margin-left:auto;font-size:.68rem;color:{MUTED}">{id_boe}</span>'
        f'</div>'
        f'<div style="color:{TEXT};font-size:.88rem;font-weight:600;line-height:1.4;margin-bottom:.4rem">{titulo}</div>'
        f'<div style="display:flex;align-items:center;gap:1rem">'
        f'<span style="font-size:.72rem;color:{TEXT2}"> {dept}</span>'
        + (f'<span style="font-size:.72rem;color:{TEXT2}"> {epi[:60]}</span>' if epi else "")
        + f'<span style="margin-left:auto">{link_html}</span>'
        f'</div>'
        f'</div>',
        unsafe_allow_html=True,
    )


# ─── CSS extra ───────────────────────────────────────────────────────────────
st.markdown(f"""
<style>
.stage-bar {{display:flex;gap:3px;align-items:center;width:100%;}}
.stage-pill {{flex:1;height:7px;border-radius:4px;}}
.ley-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:12px;
  padding:1rem 1.2rem;margin-bottom:.7rem;
  transition:border-color .2s ease;
}}
.ley-card:hover {{border-color:{CYAN}44;}}
.agenda-item {{
  display:flex;gap:.8rem;align-items:flex-start;
  padding:.65rem 0;border-bottom:1px solid {BORDER};
}}
.agenda-hora {{
  font-family:monospace;font-size:.8rem;font-weight:700;color:{CYAN};
  min-width:48px;margin-top:2px;
}}
.agenda-tipo {{
  font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  padding:.15rem .5rem;border-radius:4px;margin-top:2px;flex-shrink:0;
}}
.actor-prod-card {{
  background:{BG2};border:1px solid {BORDER};border-radius:12px;
  padding:.9rem 1.1rem;margin-bottom:.6rem;
}}
.tema-tag {{
  display:inline-block;font-size:.62rem;font-weight:600;
  background:{CYAN}15;color:{CYAN};border:1px solid {CYAN}33;
  border-radius:4px;padding:.15rem .5rem;margin:.1rem;
}}
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HEADER + KPIs GLOBALES
# ═══════════════════════════════════════════════════════════════════════════════

intel_header(
    "Monitor Legislativo",
    "Legislative Intelligence",
    "LIVE",
    datetime.now().strftime("%d/%m/%Y %H:%M"),
)

# KPIs globales — desde servicios reales
@st.cache_data(ttl=300)
def _cargar_kpis_header() -> dict:
    """KPIs del encabezado: iniciativas activas, votaciones semana, días fin sesión."""
    kpis = cargar_kpis_legislativos() if _LEG_CORE_OK else {"hay_datos": False}
    df_votaciones_kpi = _cargar_votaciones_dashboard(limit=50)
    # Votaciones en los últimos 7 días
    votaciones_semana = 0
    if not df_votaciones_kpi.empty and "fecha" in df_votaciones_kpi.columns:
        cutoff = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        votaciones_semana = int((df_votaciones_kpi["fecha"] >= cutoff).sum())
    return {
        "iniciativas_activas": kpis.get("iniciativas_mes", 0),
        "votaciones_semana": votaciones_semana,
        "hay_datos": kpis.get("hay_datos", False),
    }

_kpis_header = _cargar_kpis_header()
total_activas = _kpis_header["iniciativas_activas"]
votaciones_semana = _kpis_header["votaciones_semana"]
dias_fin_sesion = (datetime(2026, 7, 15) - datetime.now()).days

c1, c2, c3, c4 = st.columns(4)
with c1:
    st.markdown(kpi_card("Iniciativas activas", str(total_activas), "en tramitación", color=CYAN), unsafe_allow_html=True)
with c2:
    st.markdown(kpi_card("Votaciones esta semana", str(votaciones_semana), "en el Congreso", color=AMBER), unsafe_allow_html=True)
with c3:
    _composicion = _cargar_composicion_hemiciclo()
    _n_partidos = len(_composicion)
    st.markdown(kpi_card("Grupos parlamentarios", str(_n_partidos) if _n_partidos else "—", "en el hemiciclo", color=BLUE), unsafe_allow_html=True)
with c4:
    st.markdown(kpi_card("Días fin de sesión", str(max(0, dias_fin_sesion)), "hasta julio 2026", color=PURPLE), unsafe_allow_html=True)

st.markdown("---")

# ═══════════════════════════════════════════════════════════════════════════════
# TABS
# ═══════════════════════════════════════════════════════════════════════════════

tab_actividad, tab_leyes, tab_boe, tab_coaliciones, tab_actores_leg, tab_multinivel = st.tabs([
    "ACTIVIDAD PARLAMENTARIA",
    "SEGUIMIENTO DE LEYES",
    "BOE & NORMATIVA",
    "COALICIONES PARLAMENTARIAS",
    "INICIATIVAS POR ACTOR",
    "LEGISLACION MULTINIVEL",
])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — ACTIVIDAD PARLAMENTARIA
# ═══════════════════════════════════════════════════════════════════════════════

with tab_actividad:

    # ── Actividad parlamentaria — desde BD ───────────────────────────────────
    section_header("Actividad parlamentaria — últimas 13 semanas", CYAN)

    _df_init_act = cargar_iniciativas_recientes(limit=500, days=91) if _LEG_CORE_OK else pd.DataFrame()

    if not _df_init_act.empty and "presented_date" in _df_init_act.columns:
        _df_init_act["presented_date"] = pd.to_datetime(_df_init_act["presented_date"], errors="coerce")
        _df_init_act["semana"] = _df_init_act["presented_date"].dt.strftime("S%W")
        _df_grp = _df_init_act.groupby("semana").size().reset_index(name="count")
        semanas_act = _df_grp["semana"].tolist()
        counts_act = _df_grp["count"].tolist()
        fig_act = go.Figure(go.Bar(
            name="Iniciativas presentadas",
            x=semanas_act, y=counts_act,
            marker_color=CYAN,
        ))
        fig_act.update_layout(
            barmode="group", height=300,
            legend=dict(bgcolor=BG3, bordercolor=BORDER, font=dict(color=TEXT2, size=11)),
            xaxis=dict(title="Semana"),
            yaxis=dict(title="N.º iniciativas"),
            margin=dict(l=0, r=0, t=10, b=0),
        )
        apply_plotly_theme(fig_act)
        st.plotly_chart(fig_act, use_container_width=True)
    else:
        st.info(
            "No hay datos de actividad parlamentaria en la base de datos. "
            "Para cargar datos reales, ejecuta:\n"
            "```\npython -m pipelines.legislative_core --source congreso\n```"
        )

    # ── Agenda de hoy ─────────────────────────────────────────────────────────
    section_header(f"Agenda parlamentaria — {datetime.now().strftime('%A %d de %B de %Y').capitalize()}", BLUE)

    tipo_color_agenda = {
        "Comisión": PURPLE,
        "Pleno": CYAN,
        "Comparecencia": AMBER,
        "Votación": RED,
    }

    # Obtener agenda del día desde votaciones reales del store
    _df_vot_hoy = _cargar_votaciones_dashboard(limit=20)
    _agenda_items_hoy: list[dict] = []
    if not _df_vot_hoy.empty:
        hoy_str = datetime.now().strftime("%Y-%m-%d")
        for _, _row in _df_vot_hoy.iterrows():
            if str(_row.get("fecha", "")).startswith(hoy_str):
                _agenda_items_hoy.append({
                    "hora": "—",
                    "tipo": "Votación",
                    "descripcion": str(_row.get("iniciativa", ""))[:120],
                    "sala": "Hemiciclo",
                })

    if _agenda_items_hoy:
        for item in _agenda_items_hoy:
            tipo = item.get("tipo", "")
            c_tipo = tipo_color_agenda.get(tipo, MUTED)
            st.markdown(
                f'<div class="agenda-item">'
                f'<div class="agenda-hora">{item["hora"]}</div>'
                f'<span class="agenda-tipo" style="background:{c_tipo}22;color:{c_tipo};border:1px solid {c_tipo}33">'
                f'{tipo}</span>'
                f'<div style="flex:1;">'
                f'<div style="font-size:.85rem;font-weight:600;color:{TEXT}">{item["descripcion"]}</div>'
                f'<div style="font-size:.7rem;color:{MUTED};margin-top:.1rem"> {item["sala"]}</div>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.info(
            "No hay eventos parlamentarios registrados para hoy. "
            "Ejecuta `python -m pipelines.legislative_core --source congreso` "
            "para cargar la agenda del Congreso."
        )

    # ── Próximas votaciones ────────────────────────────────────────────────────
    section_header("Votaciones recientes clave", RED)

    _df_proximas = _cargar_votaciones_dashboard(limit=10)
    if not _df_proximas.empty:
        for _, _vrow in _df_proximas.iterrows():
            res = str(_vrow.get("resultado", ""))
            res_color = GREEN if res == "APROBADA" else RED
            tipo_color_v = PURPLE if str(_vrow.get("tipo", "")) in ("PL", "PLO", "RDL") else CYAN
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
                f'padding:.85rem 1.1rem;margin-bottom:.5rem">'
                f'<div style="display:flex;align-items:flex-start;gap:.6rem;margin-bottom:.5rem">'
                f'<span style="background:{tipo_color_v}22;color:{tipo_color_v};font-size:.62rem;'
                f'font-weight:800;padding:.18rem .55rem;border-radius:6px">{_vrow.get("tipo","")}</span>'
                f'<div style="flex:1">'
                f'<div style="font-size:.88rem;font-weight:700;color:{TEXT}">'
                f'{str(_vrow.get("iniciativa",""))[:90]}</div>'
                f'<div style="font-size:.72rem;color:{TEXT2};margin-top:.1rem">'
                f' {_vrow.get("fecha","")}</div>'
                f'</div>'
                f'<span style="background:{res_color}22;color:{res_color};font-size:.65rem;'
                f'font-weight:800;padding:.2rem .6rem;border-radius:6px">{res}</span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.info(
            "No hay votaciones en el store. "
            "Ejecuta `python -m dashboard.services.congreso_votaciones` "
            "para descargar votaciones del Congreso."
        )

    # ── Calculadora de coaliciones para votar ─────────────────────────────────
    section_header("Calculadora de mayoría parlamentaria", GREEN)

    _composicion_calc = _cargar_composicion_hemiciclo()
    if _composicion_calc:
        partidos_calc = sorted(_composicion_calc.keys(), key=lambda p: -_composicion_calc[p])
    else:
        partidos_calc = []

    if partidos_calc:
        sel_coalicion = st.multiselect(
            "Partidos en favor",
            options=partidos_calc,
            default=[],
            key="calc_coalicion",
        )

        escanos_favor = sum(_composicion_calc.get(p, 0) for p in sel_coalicion)
        escanos_contra = TOTAL_ESCANOS - escanos_favor
        tiene_mayoria_abs = escanos_favor >= MAYORIA_ABS

        col_calc1, col_calc2, col_calc3 = st.columns(3)
        with col_calc1:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {GREEN};'
                f'border-radius:10px;padding:.9rem;text-align:center">'
                f'<div style="font-size:2rem;font-weight:900;color:{GREEN}">{escanos_favor}</div>'
                f'<div style="font-size:.65rem;color:{MUTED}">escaños a favor</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with col_calc2:
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {RED};'
                f'border-radius:10px;padding:.9rem;text-align:center">'
                f'<div style="font-size:2rem;font-weight:900;color:{RED}">{escanos_contra}</div>'
                f'<div style="font-size:.65rem;color:{MUTED}">escaños en contra / abstención</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
        with col_calc3:
            resultado_color = GREEN if tiene_mayoria_abs else RED
            resultado_txt = "MAYORÍA ABSOLUTA" if tiene_mayoria_abs else f"FALTAN {MAYORIA_ABS - escanos_favor}"
            st.markdown(
                f'<div style="background:{resultado_color}18;border:1px solid {resultado_color}44;'
                f'border-radius:10px;padding:.9rem;text-align:center">'
                f'<div style="font-size:1rem;font-weight:900;color:{resultado_color}">{resultado_txt}</div>'
                f'<div style="font-size:.65rem;color:{MUTED}">umbral: {MAYORIA_ABS} escaños</div>'
                f'</div>',
                unsafe_allow_html=True,
            )

        # Barra visual de escaños
        pct_favor = escanos_favor / TOTAL_ESCANOS * 100
        umbral_pct = MAYORIA_ABS / TOTAL_ESCANOS * 100
        st.markdown(
            f'<div style="margin:.8rem 0;height:20px;background:{RED}44;border-radius:6px;overflow:hidden;position:relative">'
            f'<div style="height:100%;width:{pct_favor:.1f}%;background:{GREEN};border-radius:6px 0 0 6px;'
            f'display:flex;align-items:center;padding-left:.5rem;font-size:.68rem;font-weight:700;color:{BG}">'
            f'{escanos_favor} escaños</div>'
            f'<div style="position:absolute;top:0;left:{umbral_pct:.1f}%;height:100%;width:2px;'
            f'background:{CYAN};z-index:2"></div>'
            f'</div>'
            f'<div style="font-size:.65rem;color:{MUTED};margin-top:.2rem;">Umbral mayoría absoluta: {MAYORIA_ABS} escaños ({umbral_pct:.0f}% del hemiciclo)</div>',
            unsafe_allow_html=True,
        )
    else:
        st.info(
            "Datos de composición del hemiciclo no disponibles. "
            "Ejecuta el pipeline electoral para cargar la distribución de escaños:\n"
            "```\npython -m pipelines.electoral_core --source congreso\n```"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — SEGUIMIENTO DE LEYES
# ═══════════════════════════════════════════════════════════════════════════════

with tab_leyes:
    section_header("Tracker de iniciativas legislativas", CYAN)

    # ── Carga de datos reales (Bloque 1 Core) ─────────────────────────────────
    _df_init_real = cargar_iniciativas_recientes(limit=50, days=90)
    _modo_demo_init = _df_init_real.empty

    if not _modo_demo_init and not _df_init_real.empty:
        # Mostrar iniciativas reales + búsqueda
        st.markdown(
            f'<div style="background:#0a1f10;border:1px solid {GREEN}44;border-radius:8px;'
            f'padding:.5rem .9rem;margin-bottom:.8rem;font-size:.78rem;color:{GREEN}">'
            f'Datos reales — {len(_df_init_real)} iniciativas del Congreso (últimos 90 días) · '
            f'Fuente: Congreso datos abiertos'
            f'</div>',
            unsafe_allow_html=True,
        )
        _search_q = st.text_input("Buscar iniciativa", placeholder="ej: vivienda, pensiones, IA…", key="init_search")
        if _search_q:
            _df_search = buscar_items_legislativos(_search_q, limit=30)
            if not _df_search.empty:
                _init_cols = ["titulo", "tipo", "fecha", "impacto"]
                _cols_show = [c for c in _init_cols if c in _df_search.columns]
                st.dataframe(_df_search[_cols_show], use_container_width=True, hide_index=True, height=280)
            else:
                st.info("Sin resultados para esa búsqueda.")

        # Tabla resumen de iniciativas reales
        _rename = {
            "source_id": "ID", "initiative_type": "Tipo", "title": "Título",
            "presented_date": "Presentación", "status": "Estado", "impact_level": "Impacto",
        }
        _cols_real = [c for c in ["source_id", "initiative_type", "title", "presented_date", "status", "impact_level"]
                      if c in _df_init_real.columns]
        st.dataframe(
            _df_init_real[_cols_real].rename(columns=_rename),
            use_container_width=True, hide_index=True, height=340,
        )
        st.markdown("---")
        section_header("Iniciativas clave (histórico curado)", MUTED)
        st.caption("Datos de referencia — histórico curado para análisis de coaliciones")
    else:
        st.markdown(
            f'<div style="background:{BG2};border:1px solid {AMBER}33;border-radius:8px;'
            f'padding:.45rem .9rem;margin-bottom:.7rem;font-size:.75rem;color:{AMBER}">'
            f'Modo demo — ejecuta el monitor para datos reales: '
            f'<code>python -m pipelines.legislative_core --source congreso</code>'
            f'</div>',
            unsafe_allow_html=True,
        )

    # Filtros
    fl1, fl2, fl3 = st.columns(3)
    with fl1:
        filtro_proponente = st.selectbox(
            "Proponente",
            ["Todos", "PSOE", "PP", "VOX", "SUMAR", "JUNTS", "ERC", "Gobierno", "PSOE-SUMAR", "PSOE-ERC", "PSOE-JUNTS"],
            key="leg_proponente",
        )
    with fl2:
        filtro_area = st.selectbox(
            "Área temática",
            ["Todas", "Social", "Económico", "Tecnología", "Institucional", "Fiscal", "Medioambiental"],
            key="leg_area",
        )
    with fl3:
        filtro_urgencia = st.selectbox(
            "Urgencia",
            ["Todas", "critica", "alta", "media", "baja"],
            key="leg_urgencia",
        )

    # Tab 2 usa cargar_iniciativas_recientes() que ya devuelve datos reales
    # Los filtros de proponente/área/urgencia se aplican sobre datos reales si disponibles
    if not _df_init_real.empty:
        # Filtros sobre datos reales
        _leyes_filtradas_df = _df_init_real.copy()
        if filtro_proponente != "Todos" and "authors" in _leyes_filtradas_df.columns:
            _leyes_filtradas_df = _leyes_filtradas_df[
                _leyes_filtradas_df["authors"].astype(str).str.contains(filtro_proponente, case=False, na=False)
            ]
        if filtro_urgencia != "Todas" and "impact_level" in _leyes_filtradas_df.columns:
            _urgencia_to_impact = {"critica": "CRÍTICO", "alta": "ALTO", "media": "MEDIO", "baja": "BAJO"}
            _imp_val = _urgencia_to_impact.get(filtro_urgencia, filtro_urgencia.upper())
            _leyes_filtradas_df = _leyes_filtradas_df[
                _leyes_filtradas_df["impact_level"].astype(str).str.upper() == _imp_val
            ]

        st.markdown(
            f"<div style='color:{MUTED};font-size:.78rem;margin-bottom:.8rem'>"
            f"Mostrando {len(_leyes_filtradas_df)} de {len(_df_init_real)} iniciativas</div>",
            unsafe_allow_html=True,
        )

        # Tabla resumen
        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        section_header("Resumen tabular", MUTED)
        _rename_t2 = {
            "source_id": "ID", "initiative_type": "Tipo", "title": "Título",
            "presented_date": "Presentación", "status": "Estado", "impact_level": "Impacto",
        }
        _cols_t2 = [c for c in ["source_id", "initiative_type", "title", "presented_date", "status", "impact_level"]
                    if c in _leyes_filtradas_df.columns]
        st.dataframe(
            _leyes_filtradas_df[_cols_t2].rename(columns=_rename_t2),
            use_container_width=True, hide_index=True, height=400,
        )
    else:
        st.info(
            "No hay iniciativas parlamentarias en la base de datos. "
            "Para cargar datos reales, ejecuta:\n"
            "```\npython -m pipelines.legislative_core --source congreso\n```"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3 — BOE & NORMATIVA
# ═══════════════════════════════════════════════════════════════════════════════

with tab_boe:
    section_header("BOE — Boletín Oficial del Estado", RED)

    # ── Carga de datos — Bloque 1 Core primero, luego API legacy ─────────────
    with st.spinner("Cargando sumario BOE…"):
        items_raw = _cargar_boe()

    _fuente_boe = "tabla legal_items" if (_LEG_CORE_OK and items_raw) else "API BOE tiempo real"
    _modo_demo_boe = not bool(items_raw)

    if items_raw and _LEG_CORE_OK:
        st.markdown(
            f'<div style="background:#0a1f10;border:1px solid {GREEN}44;border-radius:8px;'
            f'padding:.45rem .9rem;margin-bottom:.6rem;font-size:.75rem;color:{GREEN}">'
            f'Datos reales ({_fuente_boe}) — {len(items_raw)} disposiciones'
            f'</div>',
            unsafe_allow_html=True,
        )

    if not items_raw:
        items_raw = []

    items: list[dict] = []
    for item in items_raw:
        # Normalizar campos del schema nuevo al esperado por la UI
        if "titulo" not in item and "title" in item:
            item["titulo"] = item["title"]
        if "departamento" not in item and "department" in item:
            item["departamento"] = item["department"]
        if "seccion" not in item and "section" in item:
            item["seccion"] = item["section"]
        if "id" not in item and "source_id" in item:
            item["id"] = item["source_id"]
        if "impacto" not in item:
            item["impacto"] = item.get("impact_level") or _clasificar_impacto(
                item.get("titulo", ""),
                item.get("seccion", ""),
                item.get("departamento", ""),
            )
        items.append(item)

    counts = {lvl: sum(1 for i in items if i.get("impacto") == lvl) for lvl in IMPACT_CFG}
    total_items = len(items)

    st.markdown(f"""
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.2rem">
      {kpi_card("CRÍTICO",   str(counts.get("CRÍTICO",0)),     "disposiciones críticas", RED)}
      {kpi_card("ALTO",      str(counts.get("ALTO",0)),        "alto impacto",           AMBER)}
      {kpi_card("MEDIO",     str(counts.get("MEDIO",0)),       "impacto medio",          "#F59E0B")}
      {kpi_card("BAJO",      str(counts.get("BAJO",0)),        "bajo impacto",           GREEN)}
      {kpi_card("TOTAL BOE", str(total_items),                 "disposiciones hoy",      CYAN)}
    </div>
    """, unsafe_allow_html=True)

    if items:
        col_f1, col_f2, col_f3 = st.columns([2, 2, 1])
        with col_f1:
            all_depts = sorted({i.get("departamento", "—") for i in items if i.get("departamento")})
            sel_depts = st.multiselect("Departamento", options=all_depts, default=[], placeholder="Todos", key="boe_depts")
        with col_f2:
            sel_impact = st.multiselect("Nivel de impacto", options=list(IMPACT_CFG.keys()), default=[], placeholder="Todos", key="boe_impact")
        with col_f3:
            modo_agrupado = st.toggle("Agrupar por dpto.", value=False, key="boe_agrupar")

        items_filtrados = items
        if sel_depts:
            items_filtrados = [i for i in items_filtrados if i.get("departamento") in sel_depts]
        if sel_impact:
            items_filtrados = [i for i in items_filtrados if i.get("impacto") in sel_impact]

        st.markdown(f"<div style='color:{MUTED};font-size:.78rem;margin-bottom:.5rem'>Mostrando {len(items_filtrados)} de {total_items} disposiciones</div>", unsafe_allow_html=True)

        if not modo_agrupado:
            orden_imp = {"CRÍTICO": 0, "ALTO": 1, "MEDIO": 2, "BAJO": 3, "INFORMATIVO": 4}
            items_ord = sorted(items_filtrados, key=lambda x: orden_imp.get(x.get("impacto", "INFORMATIVO"), 9))
            for item in items_ord:
                col_boe, col_ia = st.columns([5, 1])
                with col_boe:
                    _render_boe_card(item)
                with col_ia:
                    st.markdown("<div style='height:12px'></div>", unsafe_allow_html=True)
                    if st.button("IA", key=f"boe_ia_{item.get('id','')}", help="Análisis IA de este ítem", use_container_width=True):
                        st.session_state[f"boe_ia_resp_{item.get('id','')}"] = (
                            f"[Análisis IA de: {item.get('titulo','')[:80]}]\n\n"
                            "Esta disposición tiene impacto relevante en el sector afectado. "
                            "Activa Ollama para obtener un análisis completo de implicaciones legales, "
                            "económicas y políticas."
                        )
                    resp_key = f"boe_ia_resp_{item.get('id','')}"
                    if st.session_state.get(resp_key):
                        st.markdown(
                            f'<div style="background:{BG3};border:1px solid {PURPLE}33;border-radius:8px;'
                            f'padding:.6rem .8rem;font-size:.72rem;color:{TEXT2};margin-top:.2rem">'
                            f'{st.session_state[resp_key][:180]}'
                            f'</div>',
                            unsafe_allow_html=True,
                        )
        else:
            grupos: dict[str, list[dict]] = {}
            for item in items_filtrados:
                d = item.get("departamento", "Sin departamento")
                grupos.setdefault(d, []).append(item)
            for dept_name, dept_items in sorted(grupos.items()):
                criticos = sum(1 for x in dept_items if x.get("impacto") == "CRÍTICO")
                altos = sum(1 for x in dept_items if x.get("impacto") == "ALTO")
                badge_extra = ""
                if criticos:
                    badge_extra += f' <span style="color:{RED};font-weight:700">● {criticos} crítico(s)</span>'
                if altos:
                    badge_extra += f' <span style="color:{AMBER};font-weight:700">● {altos} alto(s)</span>'
                with st.expander(f" {dept_name}  ({len(dept_items)} disposiciones){badge_extra}", expanded=(criticos > 0)):
                    for item in dept_items:
                        _render_boe_card(item)
    else:
        st.info(
            "No hay datos del BOE disponibles. "
            "Comprueba la conexión a la base de datos o ejecuta:\n"
            "```\npython -m pipelines.legislative_core --source boe\n```"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 4 — COALICIONES PARLAMENTARIAS
# ═══════════════════════════════════════════════════════════════════════════════

with tab_coaliciones:
    section_header("Mapa de fuerzas parlamentarias", BLUE)

    # Hemiciclo visual — desde BD
    _composicion_tab4 = _cargar_composicion_hemiciclo()

    if _composicion_tab4:
        partidos_sorted = sorted(_composicion_tab4.items(), key=lambda x: -x[1])
        nombres_par = [p for p, e in partidos_sorted]
        escanos_par = [e for p, e in partidos_sorted]
        colores_par = [COLORES_PARTIDOS.get(p, MUTED) for p in nombres_par]

        fig_escanos = go.Figure(go.Bar(
            x=nombres_par, y=escanos_par,
            marker_color=colores_par,
            text=escanos_par, textposition="outside",
            textfont=dict(color=TEXT, size=11),
        ))
        fig_escanos.add_hline(y=MAYORIA_ABS, line_dash="dash", line_color=RED, opacity=0.7,
                              annotation_text=f"Mayoría absoluta ({MAYORIA_ABS})",
                              annotation_font_color=RED)
        fig_escanos.update_layout(
            height=300,
            xaxis=dict(title="Partido"),
            yaxis=dict(title="Escaños"),
            margin=dict(l=0, r=0, t=10, b=0),
        )
        apply_plotly_theme(fig_escanos)
        st.plotly_chart(fig_escanos, use_container_width=True)
    else:
        st.info(
            "Datos de composición del hemiciclo no disponibles. "
            "Ejecuta el pipeline electoral para cargar la distribución de escaños."
        )

    # ── Heatmap histórico de alineación ───────────────────────────────────────
    section_header("Matriz histórica de alineación de voto (% votos coincidentes)", PURPLE)

    _alineacion = _cargar_alineacion()

    if _alineacion:
        partidos_hm = list(_alineacion.keys())
        z_matrix = [[_alineacion[p1].get(p2, 0) for p2 in partidos_hm] for p1 in partidos_hm]

        colorscale_hm = [
            [0.0, f"{RED}"],
            [0.5, f"{AMBER}"],
            [1.0, f"{GREEN}"],
        ]

        hover_hm = [
            [f"<b>{p1} ↔ {p2}</b><br>{int(_alineacion[p1].get(p2,0)*100)}% alineación histórica" for p2 in partidos_hm]
            for p1 in partidos_hm
        ]

        fig_hm = go.Figure(go.Heatmap(
            z=z_matrix,
            x=partidos_hm,
            y=partidos_hm,
            colorscale=colorscale_hm,
            zmin=0, zmax=1,
            text=[[f"{int(v*100)}%" for v in row] for row in z_matrix],
            texttemplate="%{text}",
            textfont=dict(color=TEXT, size=10),
            hovertemplate="%{customdata}<extra></extra>",
            customdata=hover_hm,
            showscale=True,
            colorbar=dict(
                title=dict(text="Alineación", font=dict(color=TEXT2)),
                tickvals=[0, 0.5, 1],
                ticktext=["0%", "50%", "100%"],
                tickfont=dict(color=TEXT2, size=10),
            ),
        ))
        fig_hm.update_layout(
            height=380,
            margin=dict(l=10, r=10, t=10, b=10),
            xaxis=dict(tickfont=dict(color=TEXT, size=11)),
            yaxis=dict(tickfont=dict(color=TEXT, size=11)),
        )
        apply_plotly_theme(fig_hm)
        st.plotly_chart(fig_hm, use_container_width=True)
    else:
        st.info(
            "Datos de alineación de voto no disponibles. "
            "Se requiere histórico de votaciones detalladas por diputado. "
            "Ejecuta el scraper completo del Congreso para obtener esta información:\n"
            "```\npython -m dashboard.services.congreso_votaciones\n```"
        )

    # ── Votaciones recientes detalladas ────────────────────────────────────────
    section_header("Votaciones recientes", BLUE)

    _df_vot_tab4 = _cargar_votaciones_dashboard(limit=20)
    if not _df_vot_tab4.empty:
        for _, _vrow4 in _df_vot_tab4.iterrows():
            res_color = GREEN if str(_vrow4.get("resultado", "")) == "APROBADA" else RED
            tipo_color = PURPLE if str(_vrow4.get("tipo", "")) in ("PL", "PLO", "RDL") else CYAN
            _si = int(_vrow4.get("si", 0) or 0)
            _no = int(_vrow4.get("no", 0) or 0)
            _abs = int(_vrow4.get("abstenciones", 0) or 0)
            st.markdown(
                f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:10px;'
                f'padding:.85rem 1.1rem;margin-bottom:.5rem">'
                f'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.4rem">'
                f'<span style="background:{tipo_color}22;color:{tipo_color};font-size:.62rem;font-weight:800;'
                f'padding:.18rem .55rem;border-radius:6px;border:1px solid {tipo_color}44">'
                f'{_vrow4.get("tipo","")}</span>'
                f'<span style="font-size:.8rem;font-weight:700;color:{TEXT}">'
                f'{str(_vrow4.get("iniciativa",""))[:90]}</span>'
                f'<span style="margin-left:auto;background:{res_color}22;color:{res_color};font-size:.65rem;'
                f'font-weight:800;padding:.2rem .6rem;border-radius:6px;border:1px solid {res_color}44">'
                f'{_vrow4.get("resultado","")}</span>'
                f'</div>'
                f'<div style="display:flex;align-items:center;gap:.45rem;flex-wrap:wrap">'
                f'<span style="color:{GREEN};font-size:.65rem;font-weight:700">Sí: {_si}</span>'
                f'<span style="color:{RED};font-size:.65rem;font-weight:700">No: {_no}</span>'
                f'<span style="color:{AMBER};font-size:.65rem;font-weight:700">Abs: {_abs}</span>'
                f'<span style="margin-left:auto;font-size:.65rem;color:{MUTED}">'
                f'{_vrow4.get("fecha","")} · {_vrow4.get("id","")}</span>'
                f'</div>'
                f'</div>',
                unsafe_allow_html=True,
            )
    else:
        st.info(
            "No hay votaciones en el store. "
            "Ejecuta `python -m dashboard.services.congreso_votaciones` "
            "para descargar votaciones del Congreso."
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 5 — INICIATIVAS POR ACTOR
# ═══════════════════════════════════════════════════════════════════════════════

with tab_actores_leg:
    section_header("Productividad legislativa por actor", PURPLE)

    _df_prod = _cargar_productividad()

    if not _df_prod.empty:
        # Score de productividad = iniciativas presentadas * 0.3 + (aprobadas * 10) - (rechazadas * 2)
        def _score_prod_row(row) -> float:
            return (
                float(row.get("presentadas", 0)) * 0.3
                + float(row.get("aprobadas", 0)) * 10.0
                - float(row.get("rechazadas", 0)) * 2.0
                + float(row.get("debate", 0)) * 1.5
            )

        _df_prod = _df_prod.copy()
        _df_prod["score"] = _df_prod.apply(_score_prod_row, axis=1)
        _df_prod = _df_prod.sort_values("score", ascending=False).reset_index(drop=True)

        nombres_leg = _df_prod["actor"].astype(str).str.split().str[-1].tolist()
        scores_leg = _df_prod["score"].round(1).tolist()
        colores_leg = [COLORES_PARTIDOS.get(str(p), CYAN) for p in _df_prod["partido"].tolist()]

        fig_prod = go.Figure(go.Bar(
            x=nombres_leg, y=scores_leg,
            marker_color=colores_leg,
            text=[f"{s:.0f}" for s in scores_leg],
            textposition="outside",
            textfont=dict(color=TEXT, size=11),
        ))
        fig_prod.update_layout(
            height=280,
            xaxis=dict(title="Actor"),
            yaxis=dict(title="Score productividad"),
            margin=dict(l=0, r=0, t=10, b=0),
        )
        apply_plotly_theme(fig_prod)
        st.plotly_chart(fig_prod, use_container_width=True)

        # Métricas comparativas en gráfico apilado
        section_header("Iniciativas: presentadas / aprobadas / rechazadas", CYAN)

        fig_stack = go.Figure()
        fig_stack.add_trace(go.Bar(
            name="Presentadas", x=nombres_leg,
            y=_df_prod["presentadas"].tolist(), marker_color=BLUE,
        ))
        if "debate" in _df_prod.columns:
            fig_stack.add_trace(go.Bar(
                name="En debate", x=nombres_leg,
                y=_df_prod["debate"].tolist(), marker_color=AMBER,
            ))
        fig_stack.add_trace(go.Bar(
            name="Aprobadas", x=nombres_leg,
            y=_df_prod["aprobadas"].tolist(), marker_color=GREEN,
        ))
        fig_stack.add_trace(go.Bar(
            name="Rechazadas", x=nombres_leg,
            y=_df_prod["rechazadas"].tolist(), marker_color=RED,
        ))
        fig_stack.update_layout(
            barmode="group", height=300,
            legend=dict(bgcolor=BG3, bordercolor=BORDER, font=dict(color=TEXT2, size=10)),
            margin=dict(l=0, r=0, t=10, b=0),
        )
        apply_plotly_theme(fig_stack)
        st.plotly_chart(fig_stack, use_container_width=True)

        # Tabla comparativa final
        st.markdown("<div style='height:.5rem'></div>", unsafe_allow_html=True)
        section_header("Tabla comparativa completa", MUTED)
        _df_tabla = _df_prod.copy()
        _df_tabla["Tasa éxito"] = (_df_tabla["aprobadas"] / _df_tabla["presentadas"].clip(lower=1) * 100).round(0).astype(int).astype(str) + "%"
        _df_tabla["Score"] = _df_tabla["score"].round(0).astype(int).astype(str)
        _rename_prod = {
            "actor": "Actor", "partido": "Partido",
            "presentadas": "Presentadas", "debate": "En debate",
            "aprobadas": "Aprobadas", "rechazadas": "Rechazadas",
        }
        _cols_prod = [c for c in ["actor", "partido", "presentadas", "debate", "aprobadas", "rechazadas", "Tasa éxito", "Score"]
                      if c in _df_tabla.columns or c in ("Tasa éxito", "Score")]
        st.dataframe(
            _df_tabla[[c for c in _cols_prod if c in _df_tabla.columns]].rename(columns=_rename_prod),
            use_container_width=True, hide_index=True, height=280,
        )
    else:
        st.info(
            "No hay datos de productividad parlamentaria en la base de datos. "
            "Para cargar datos reales, ejecuta:\n"
            "```\npython -m pipelines.legislative_core --source congreso\n```"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 6 — LEGISLACION MULTINIVEL
# ═══════════════════════════════════════════════════════════════════════════════


_LEVEL_CFG = {
    "european": {"label": "Europeo", "color": BLUE,   "border": "#1E3A5F"},
    "national":  {"label": "Nacional", "color": PURPLE, "border": "#3B1F6E"},
    "regional":  {"label": "Regional", "color": CYAN,   "border": "#0E3D45"},
}

_IMPACT_CFG = {
    "high":   {"label": "Alto impacto",  "color": RED},
    "medium": {"label": "Impacto medio", "color": AMBER},
    "low":    {"label": "Bajo impacto",  "color": GREEN},
}

_ALL_CCAA = sorted({
    "Andalucía", "Aragón", "Asturias", "Baleares", "Canarias",
    "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
    "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia",
    "Navarra", "País Vasco", "Valenciana",
})


with tab_multinivel:

    section_header("Legislacion multinivel — EU · Nacional · Autonomico", CYAN)

    # ── Intento de carga desde BD ─────────────────────────────────────────────
    _leg_from_db: list[dict] = []
    _leg_kpis: dict = {}
    _using_demo = True
    try:
        from dashboard.services.legislation_scraper import get_legislation, get_legislation_kpis
        _leg_kpis = get_legislation_kpis()
        if _leg_kpis.get("total_eu", 0) + _leg_kpis.get("total_national", 0) + _leg_kpis.get("total_regional", 0) > 0:
            _leg_from_db = get_legislation(limit=200)
            _using_demo = False
    except Exception:
        pass

    _leg_data = _leg_from_db  # empty list when DB unavailable — no demo fallback

    if _using_demo:
        st.info(
            "No hay datos de legislación multinivel en la base de datos. "
            "Activa el scheduler para obtener datos en tiempo real:\n"
            "```\npython -m dashboard.workers.legislation_scheduler\n```"
        )

    # ── KPIs ──────────────────────────────────────────────────────────────────
    if not _using_demo and _leg_kpis:
        k_eu  = _leg_kpis.get("total_eu", 0)
        k_nat = _leg_kpis.get("total_national", 0)
        k_reg = _leg_kpis.get("total_regional", 0)
        k_hi  = _leg_kpis.get("high_impact", 0)
        k_pend= _leg_kpis.get("pending", 0)
        k_upd = _leg_kpis.get("last_update", "—")
    else:
        k_eu  = sum(1 for d in _leg_data if d["level"] == "european")
        k_nat = sum(1 for d in _leg_data if d["level"] == "national")
        k_reg = sum(1 for d in _leg_data if d["level"] == "regional")
        k_hi  = sum(1 for d in _leg_data if d.get("ai_impact_level") == "high")
        k_pend= sum(1 for d in _leg_data if d.get("status") == "pending")
        k_upd = "—"

    _kpi_cols = st.columns(5)
    _kpi_cols[0].markdown(kpi_card("Normas UE", str(k_eu), color=BLUE), unsafe_allow_html=True)
    _kpi_cols[1].markdown(kpi_card("Nacionales", str(k_nat), color=PURPLE), unsafe_allow_html=True)
    _kpi_cols[2].markdown(kpi_card("Autonomicas", str(k_reg), color=CYAN), unsafe_allow_html=True)
    _kpi_cols[3].markdown(kpi_card("Alto impacto", str(k_hi), color=RED), unsafe_allow_html=True)
    _kpi_cols[4].markdown(kpi_card("Pendientes", str(k_pend), color=AMBER), unsafe_allow_html=True)

    st.markdown("<div style='height:.6rem'></div>", unsafe_allow_html=True)

    # ── Filtros ───────────────────────────────────────────────────────────────
    _f_col1, _f_col2, _f_col3, _f_col4 = st.columns([2, 2, 2, 2])

    with _f_col1:
        _f_level = st.selectbox(
            "Nivel", ["Todos", "Europeo", "Nacional", "Regional"],
            key="ml_level",
        )
    with _f_col2:
        _f_status = st.selectbox(
            "Estado", ["Todos", "Publicada", "Pendiente"],
            key="ml_status",
        )
    with _f_col3:
        _all_cats = sorted({d.get("ai_category", "—") or "—" for d in _leg_data})
        _f_cat = st.selectbox("Categoria IA", ["Todas"] + _all_cats, key="ml_cat")
    with _f_col4:
        _f_impact = st.selectbox(
            "Impacto IA", ["Todos", "Alto", "Medio", "Bajo"],
            key="ml_impact",
        )

    _f_ccaa_active = _f_level in ("Todos", "Regional")
    if _f_ccaa_active:
        _f_ccaa = st.multiselect(
            "Comunidad Autonoma (solo nivel regional)",
            _ALL_CCAA,
            default=[],
            key="ml_ccaa",
            placeholder="Todas las CCAA",
        )
    else:
        _f_ccaa = []

    # ── Aplicar filtros ───────────────────────────────────────────────────────
    _level_map = {"Europeo": "european", "Nacional": "national", "Regional": "regional"}
    _status_map = {"Publicada": "published", "Pendiente": "pending"}
    _impact_map = {"Alto": "high", "Medio": "medium", "Bajo": "low"}

    _filtered = _leg_data
    if _f_level != "Todos":
        _filtered = [d for d in _filtered if d["level"] == _level_map[_f_level]]
    if _f_status != "Todos":
        _filtered = [d for d in _filtered if d.get("status") == _status_map[_f_status]]
    if _f_cat != "Todas":
        _filtered = [d for d in _filtered if (d.get("ai_category") or "—") == _f_cat]
    if _f_impact != "Todos":
        _filtered = [d for d in _filtered if d.get("ai_impact_level") == _impact_map[_f_impact]]
    if _f_ccaa:
        _filtered = [
            d for d in _filtered
            if d["level"] != "regional" or d.get("region") in _f_ccaa
        ]

    # Ordenar: alto impacto primero, luego relevancia IA descendente
    _impact_ord = {"high": 0, "medium": 1, "low": 2, None: 3}
    _filtered = sorted(
        _filtered,
        key=lambda d: (_impact_ord.get(d.get("ai_impact_level")), -(d.get("ai_relevance") or 0)),
    )

    st.markdown(
        f'<div style="font-size:.75rem;color:{MUTED};margin-bottom:.5rem">'
        f'{len(_filtered)} normas encontradas</div>',
        unsafe_allow_html=True,
    )

    # ── Cards ─────────────────────────────────────────────────────────────────
    for _item in _filtered:
        _lv = _item.get("level", "national")
        _lv_cfg = _LEVEL_CFG.get(_lv, _LEVEL_CFG["national"])
        _imp = _item.get("ai_impact_level")
        _imp_cfg = _IMPACT_CFG.get(_imp, {"label": "—", "color": MUTED})
        _rel = _item.get("ai_relevance") or "—"
        _status = _item.get("status", "pending")
        _status_color = GREEN if _status == "published" else AMBER
        _status_label = "Publicada" if _status == "published" else "Pendiente"

        # Tags de sectores
        _sectors = _item.get("ai_sectors") or []
        _sector_tags = " ".join([
            f'<span style="background:{BG3};border:1px solid {BORDER};border-radius:3px;'
            f'padding:1px 6px;font-size:.62rem;color:{TEXT2}">{s}</span>'
            for s in _sectors[:4]
        ])

        # Plazos
        _deadlines = _item.get("ai_deadlines") or []
        _deadline_html = ""
        if _deadlines:
            _dl_items = []
            for _dl in _deadlines[:2]:
                _plazo = _dl.get("plazo", "")
                _fecha = _dl.get("fecha") or ""
                _dl_items.append(
                    f'<span style="color:{AMBER};font-weight:600">{_plazo}</span>'
                    + (f' — <span style="color:{TEXT2}">{_fecha}</span>' if _fecha else "")
                )
            _deadline_html = (
                f'<div style="font-size:.68rem;margin-top:.4rem;color:{MUTED}">'
                f'Plazos: {" · ".join(_dl_items)}</div>'
            )

        # Obligaciones
        _oblig = _item.get("ai_obligations") or ""
        _oblig_html = ""
        if _oblig:
            _oblig_html = (
                f'<div style="font-size:.68rem;color:{TEXT2};margin-top:.3rem">'
                f'<span style="color:{MUTED}">Obligaciones:</span> {_oblig[:200]}'
                + ("..." if len(_oblig) > 200 else "") + "</div>"
            )

        # Relación EU
        _eu_rel = _item.get("ai_eu_relation") or ""
        _eu_html = ""
        if _eu_rel and _lv != "european":
            _eu_html = (
                f'<div style="font-size:.63rem;color:{MUTED};margin-top:.25rem">'
                f'Relacion UE: <span style="color:{BLUE}">{_eu_rel[:100]}</span></div>'
            )

        # URL
        _url = _item.get("url") or ""
        _url_html = ""
        if _url:
            _ref = _item.get("reference_id") or _url[:40]
            _url_html = (
                f'<a href="{_url}" target="_blank" style="font-size:.65rem;color:{CYAN};'
                f'text-decoration:none">{_ref}</a>'
            )

        st.markdown(
            f'<div style="background:{BG2};border:1px solid {_lv_cfg["border"]};'
            f'border-left:4px solid {_lv_cfg["color"]};border-radius:8px;'
            f'padding:1rem 1.2rem;margin-bottom:.7rem">'

            # Cabecera
            f'<div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem">'
            f'<span style="background:{_lv_cfg["color"]}22;border:1px solid {_lv_cfg["color"]}55;'
            f'border-radius:4px;padding:2px 8px;font-size:.65rem;font-weight:800;'
            f'color:{_lv_cfg["color"]};letter-spacing:.05em">{_lv_cfg["label"].upper()}</span>'
            f'<span style="font-size:.65rem;font-weight:700;color:{_imp_cfg["color"]}">'
            f'{_imp_cfg["label"].upper()}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">Relevancia IA: '
            f'<span style="color:{CYAN};font-weight:700">{_rel}/10</span></span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;color:{_status_color};font-weight:600">{_status_label}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;font-weight:600;color:{TEXT2}">{_item.get("region","")}</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">|</span>'
            f'<span style="font-size:.65rem;color:{MUTED}">{_item.get("doc_type","")}</span>'
            f'</div>'

            # Título
            f'<div style="font-size:.95rem;font-weight:800;color:{TEXT};line-height:1.35;margin-bottom:.4rem">'
            f'{_item.get("title","")}</div>'

            # Sectores
            f'<div style="margin-bottom:.4rem">{_sector_tags}</div>'

            # Resumen IA
            f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.5;margin-bottom:.3rem">'
            f'{_item.get("ai_summary","")}</div>'

            # Obligaciones
            + _oblig_html

            # Plazos
            + _deadline_html

            # Relación EU
            + _eu_html

            # Referencia / enlace
            + (f'<div style="margin-top:.5rem">{_url_html}</div>' if _url_html else "")

            + '</div>',
            unsafe_allow_html=True,
        )

    if not _filtered:
        st.markdown(
            f'<div style="text-align:center;padding:3rem;color:{MUTED};'
            f'font-size:.9rem">No hay normas que coincidan con los filtros seleccionados</div>',
            unsafe_allow_html=True,
        )
