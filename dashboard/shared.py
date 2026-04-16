"""Utilidades compartidas para todas las páginas del dashboard."""
from __future__ import annotations
import sys
from pathlib import Path

_ROOT = Path(__file__).parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

# ── Design tokens (dark / tech theme) ────────────────────────────────────────
BG       = "#080C14"        # fondo principal
BG2      = "#0D1320"        # fondo secundario / cards
BG3      = "#111827"        # cards elevadas
BORDER   = "#1E293B"        # bordes suaves
BORDER2  = "#00D4FF26"      # borde cyan con alfa
CYAN     = "#00D4FF"        # acento primario
CYAN2    = "#22D3EE"        # acento secundario
BLUE     = "#3B82F6"        # azul acción
PURPLE   = "#8B5CF6"        # acento púrpura
TEXT     = "#E2E8F0"        # texto principal
TEXT2    = "#94A3B8"        # texto secundario
MUTED    = "#475569"        # texto apagado
GREEN    = "#10B981"
AMBER    = "#F59E0B"
RED      = "#EF4444"

COLORES_PARTIDOS = {
    "PP":       "#009FDB",
    "PSOE":     "#E30613",
    "VOX":      "#63BE21",
    "SUMAR":    "#E4007C",
    "PODEMOS":  "#6A2E74",
    "CS":       "#EB6109",
    "ERC":      "#F4B20A",
    "JUNTS":    "#00AEEF",
    "PNV":      "#007A3D",
    "EH Bildu": "#A9C55A",
    "BNG":      "#73C6E0",
    "CUP":      "#FFCC00",
    "CC":       "#FFCB00",
    "UPN":      "#003A8C",
    "PRC":      "#008037",
    "IU":       "#C8293A",
    "UP":       "#6A2E74",
}

_FRAGMENT = getattr(st, "fragment", getattr(st, "experimental_fragment", None))


def color_partido(siglas: str) -> str:
    try:
        from dashboard.entity_resolver import _cargar_entidades

        df_ent = _cargar_entidades().reset_index()
        if not df_ent.empty and "siglas" in df_ent.columns:
            row = df_ent[df_ent["siglas"].astype(str).str.upper() == str(siglas).upper()]
            if not row.empty and str(row.iloc[0].get("color_hex", "")).startswith("#"):
                return str(row.iloc[0]["color_hex"])
    except Exception:
        pass
    return COLORES_PARTIDOS.get(siglas, COLORES_PARTIDOS.get(str(siglas).upper(), CYAN))


if _FRAGMENT:
    @_FRAGMENT(run_every=15)
    def _sidebar_alerts_fragment() -> None:
        """Ticker crítico global en sidebar (actualización parcial)."""
        try:
            from dashboard.db import cargar_alertas

            df = cargar_alertas(solo_no_leidas=True, limit=3)
            if df.empty or "severidad" not in df.columns:
                return
            crit = df[df["severidad"].astype(str).str.upper() == "CRITICAL"]
            if crit.empty:
                return
            row = crit.iloc[0]
            st.error(f"⚡ {str(row.get('titulo', 'Alerta crítica'))}", icon="🔴")
            ts = str(row.get("created_at", ""))[:16]
            if ts:
                st.caption(f"Actualizada: {ts}")
        except Exception:
            # No romper la navegación si falla la consulta
            return
else:
    def _sidebar_alerts_fragment() -> None:
        return


def aplicar_estilos():
    """Inyecta el tema dark/tech global en todas las páginas."""
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

    /* ── Reset y base ─────────────────────────────────────────────── */
    [data-testid="stSidebarNav"] {{ display: none !important; }}

    html, body, .stApp, .main {{
        background: {BG} !important;
        color: {TEXT};
        font-family: 'Inter', system-ui, sans-serif;
    }}
    .main .block-container {{
        background: {BG} !important;
        padding-top: 1.5rem;
    }}

    /* ── Sidebar ──────────────────────────────────────────────────── */
    [data-testid="stSidebar"] {{
        background: {BG2} !important;
        border-right: 1px solid {BORDER} !important;
    }}
    [data-testid="stSidebar"] * {{
        color: {TEXT2} !important;
    }}
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"] {{
        border-radius: 6px;
        padding: .35rem .6rem !important;
        transition: all .15s ease;
    }}
    [data-testid="stSidebar"] a[data-testid="stPageLink-NavLink"]:hover {{
        background: {CYAN}18 !important;
        color: {CYAN} !important;
    }}

    /* ── Metrics ──────────────────────────────────────────────────── */
    [data-testid="stMetric"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-top: 2px solid {CYAN}55 !important;
        border-radius: 10px !important;
        padding: 1rem 1.2rem !important;
        transition: border-color .2s ease, box-shadow .2s ease;
    }}
    [data-testid="stMetric"]:hover {{
        border-top-color: {CYAN} !important;
        box-shadow: 0 0 16px {CYAN}22 !important;
    }}
    [data-testid="stMetricLabel"] {{
        color: {MUTED} !important;
        font-size: .72rem !important;
        font-weight: 700 !important;
        letter-spacing: .08em !important;
        text-transform: uppercase !important;
    }}
    [data-testid="stMetricValue"] {{
        color: {TEXT} !important;
        font-size: 1.55rem !important;
        font-weight: 800 !important;
        font-family: 'JetBrains Mono', monospace !important;
    }}
    [data-testid="stMetricDelta"] {{
        font-size: .72rem !important;
        font-weight: 600 !important;
    }}

    /* ── Divider ──────────────────────────────────────────────────── */
    hr {{
        border: none !important;
        border-top: 1px solid {BORDER} !important;
        margin: 1.2rem 0 !important;
    }}

    /* ── Buttons ──────────────────────────────────────────────────── */
    .stButton button {{
        background: linear-gradient(135deg, {CYAN}22, {BLUE}33) !important;
        color: {CYAN} !important;
        border: 1px solid {CYAN}55 !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: .82rem !important;
        letter-spacing: .04em !important;
        transition: all .2s ease !important;
    }}
    .stButton button:hover {{
        background: {CYAN}33 !important;
        border-color: {CYAN} !important;
        box-shadow: 0 0 12px {CYAN}44 !important;
    }}

    /* ── Inputs / Selects ─────────────────────────────────────────── */
    [data-testid="stSelectbox"] > div, [data-testid="stMultiSelect"] > div {{
        background: {BG2} !important;
        border-color: {BORDER} !important;
        color: {TEXT} !important;
        border-radius: 8px !important;
    }}
    .stSlider [data-testid="stSlider"] {{
        color: {CYAN} !important;
    }}

    /* ── Dataframe ────────────────────────────────────────────────── */
    .stDataFrame {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
    }}

    /* ── Info / warnings ──────────────────────────────────────────── */
    .stAlert {{
        background: {BG2} !important;
        border-color: {BORDER} !important;
        color: {TEXT2} !important;
        border-radius: 8px !important;
    }}

    /* ── Tabs ─────────────────────────────────────────────────── */
    [data-testid="stTabs"] [data-baseweb="tab-list"] {{
        background: {BG2} !important;
        border-bottom: 1px solid {BORDER} !important;
        border-radius: 10px 10px 0 0 !important;
        gap: .3rem !important;
        padding: .35rem .4rem 0 !important;
    }}
    [data-testid="stTabs"] [data-baseweb="tab"] {{
        background: {BG3} !important;
        color: {TEXT2} !important;
        border: 1px solid {BORDER} !important;
        border-bottom: none !important;
        border-radius: 8px 8px 0 0 !important;
        font-weight: 600 !important;
        font-size: .78rem !important;
        letter-spacing: .05em !important;
        padding: .45rem 1.1rem !important;
        transition: background .18s ease, color .18s ease, border-color .18s ease !important;
    }}
    [data-testid="stTabs"] [data-baseweb="tab"]:hover {{
        background: {CYAN}0F !important;
        color: {CYAN} !important;
        border-color: {CYAN}44 !important;
    }}
    [data-testid="stTabs"] [aria-selected="true"] {{
        background: linear-gradient(180deg,{CYAN}1A,{BG2}) !important;
        color: {CYAN} !important;
        border-color: {CYAN}66 !important;
        border-bottom: 1px solid {BG2} !important;
    }}

    /* ── Expander ─────────────────────────────────────────────────── */
    [data-testid="stExpander"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 8px !important;
    }}

    /* ── Caption / misc text ──────────────────────────────────────── */
    .stCaption {{ color: {MUTED} !important; }}
    p, li {{ color: {TEXT2}; }}
    h1, h2, h3 {{ color: {TEXT}; }}

    /* ── Scrollbar ────────────────────────────────────────────────── */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: {BG}; }}
    ::-webkit-scrollbar-thumb {{ background: {BORDER}; border-radius: 3px; }}
    ::-webkit-scrollbar-thumb:hover {{ background: {CYAN}55; }}
    </style>
    """, unsafe_allow_html=True)


def sidebar_nav():
    """Renderiza la barra lateral personalizada con tema dark/tech."""
    aplicar_estilos()
    with st.sidebar:
        # Logo / header
        st.markdown(f"""
        <div style="padding:1.4rem 1rem 1rem;border-bottom:1px solid {BORDER};margin-bottom:.8rem">
            <div style="display:flex;align-items:center;gap:.6rem">
                <div style="width:32px;height:32px;border-radius:8px;overflow:hidden;flex-shrink:0;
                            box-shadow:0 2px 8px rgba(0,0,0,0.35)">
                  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
                    <rect width="100" height="100" rx="0" fill="#F0A214"/>
                    <circle cx="22" cy="28" r="13" stroke="#1B3FA8" stroke-width="5" fill="none"/>
                    <circle cx="22" cy="28" r="5.5" fill="#F0A214"/>
                    <circle cx="22" cy="28" r="5.5" stroke="#1B3FA8" stroke-width="2.5" fill="none"/>
                    <circle cx="22" cy="28" r="2.2" fill="#1B3FA8"/>
                    <circle cx="78" cy="28" r="13" stroke="#1B3FA8" stroke-width="5" fill="none"/>
                    <circle cx="78" cy="28" r="5.5" fill="#F0A214"/>
                    <circle cx="78" cy="28" r="5.5" stroke="#1B3FA8" stroke-width="2.5" fill="none"/>
                    <circle cx="78" cy="28" r="2.2" fill="#1B3FA8"/>
                    <rect x="21" y="24" width="58" height="8" fill="#1B3FA8"/>
                    <rect x="8" y="37" width="84" height="10" rx="2" fill="#1B3FA8"/>
                    <rect x="14" y="58" width="19" height="30" rx="3" fill="#1B3FA8"/>
                    <rect x="40" y="50" width="19" height="38" rx="3" fill="#1B3FA8"/>
                    <rect x="66" y="43" width="19" height="45" rx="3" fill="#1B3FA8"/>
                  </svg>
                </div>
                <div>
                    <div style="font-size:1rem;font-weight:800;color:{TEXT};letter-spacing:-.01em;line-height:1.1">ElectSim</div>
                    <div style="font-size:.6rem;font-weight:600;letter-spacing:.14em;color:{MUTED};
                                text-transform:uppercase">Politeia · v2.0</div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # Sección: Análisis Electoral
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.6rem .5rem .3rem'>Análisis Electoral</div>", unsafe_allow_html=True)
        st.page_link("app.py",                              label="⬡  Inicio")
        st.page_link("pages/1_Mapa_Electoral.py",           label="◈  Mapa Electoral")
        st.page_link("pages/2_Nowcasting.py",               label="◉  Nowcasting")
        st.page_link("pages/3_Escenarios.py",               label="◎  Escenarios")
        st.page_link("pages/4_Coaliciones.py",              label="⬡  Coaliciones")

        # Sección: Índices Politeia
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.8rem .5rem .3rem'>Índices Politeia</div>", unsafe_allow_html=True)
        st.page_link("pages/9_Indices_Politeia.py",         label="◈  Índices")
        st.page_link("pages/10_Prensa_Agenda.py",           label="◎  Prensa & Agenda")
        st.page_link("pages/11_Congreso_Institucional.py",  label="◉  Congreso")
        st.page_link("pages/13_Briefing_Diario.py",         label="⬡  Briefing Diario")

        # Sección: Modelos & Datos
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.8rem .5rem .3rem'>Modelos & Datos</div>", unsafe_allow_html=True)
        st.page_link("pages/5_Agentes_LLM.py",              label="◈  Agentes LLM")
        st.page_link("pages/6_Riesgo.py",                   label="◎  Riesgo Político")
        st.page_link("pages/7_Validacion.py",               label="◉  Validación")
        st.page_link("pages/8_Tiempo_Real.py",              label="⬡  Tiempo Real")
        st.page_link("pages/12_Macroeconomia.py",           label="◈  Macroeconomía")

        st.markdown(f"<div style='height:.35rem'></div>", unsafe_allow_html=True)
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.2rem .1rem .3rem'>Snapshot Global</div>", unsafe_allow_html=True)
        try:
            from dashboard.app_state import get_app_snapshot

            if st.button("Refrescar snapshot ahora", use_container_width=True):
                get_app_snapshot(force_refresh=True)
                st.success("Snapshot actualizado")
                st.rerun()

            snap = get_app_snapshot()
            loaded_at = str(snap.get("loaded_at", ""))[:19].replace("T", " ")
            if loaded_at:
                st.caption(f"Corte de datos: {loaded_at} UTC")
        except Exception:
            st.caption("Snapshot no disponible")

        # Ticker crítico global en todas las páginas
        _sidebar_alerts_fragment()

        # Footer
        st.markdown(f"""
        <div style="border-top:1px solid {BORDER};margin-top:1.2rem;padding:1rem .5rem .5rem;
                    font-size:.62rem;color:{MUTED};text-align:center;letter-spacing:.06em">
            <span style="color:{CYAN}55">●</span> SISTEMA ACTIVO &nbsp;·&nbsp; DATOS EN TIEMPO REAL
        </div>
        """, unsafe_allow_html=True)
