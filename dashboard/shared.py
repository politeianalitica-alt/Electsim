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

_RAW_COLORES_PARTIDOS = {
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


_PARTY_ALIASES = {
    "EH_BILDU": "EH Bildu",
    "BILDU": "EH Bildu",
    "JXCAT": "JUNTS",
}

PAGES_NAV = {
    "analisis_electoral": [
        ("app.py", "⬡  Inicio"),
        ("pages/1_Mapa_Electoral.py", "◈  Mapa Electoral"),
        ("pages/17_Nowcasting_Component.py", "🗳️  Nowcasting"),
        ("pages/3_Escenarios.py", "◎  Escenarios"),
        ("pages/4_Coaliciones.py", "⬡  Coaliciones"),
        ("pages/16_Fichas_Politicos.py", "🧑‍💼  Fichas de políticos"),
    ],
    "indices_politeia": [
        ("pages/9_Indices_Politeia.py", "◈  Índices"),
        ("pages/14_Monitor_Sentimiento.py", "📊  Monitor de sentimiento"),
        ("pages/15_Agenda_Lideres.py", "📅  Agenda de líderes"),
        ("pages/10_Prensa_Agenda.py", "◎  Prensa & Agenda"),
        ("pages/11_Congreso_Institucional.py", "◉  Congreso"),
        ("pages/13_Briefing_Diario.py", "⬡  Briefing Diario"),
    ],
    "modelos_datos": [
        ("pages/5_Agentes_LLM.py", "◈  Agentes LLM"),
        ("pages/6_Riesgo.py", "◎  Riesgo Político"),
        ("pages/7_Validacion.py", "◉  Validación"),
        ("pages/8_Tiempo_Real.py", "⬡  Tiempo Real"),
        ("pages/12_Macroeconomia.py", "◈  Macroeconomía"),
    ],
}


def _normalize_siglas(siglas: str) -> str:
    return str(siglas).strip().upper().replace(" ", "_").replace("-", "_")


def _build_party_colors() -> dict[str, str]:
    colors: dict[str, str] = {}
    for key, val in _RAW_COLORES_PARTIDOS.items():
        norm = _normalize_siglas(key)
        colors[key] = val
        colors[key.upper()] = val
        colors[norm] = val
        colors[norm.replace("_", " ")] = val
    for alias, canonical in _PARTY_ALIASES.items():
        val = _RAW_COLORES_PARTIDOS.get(canonical, CYAN)
        norm = _normalize_siglas(alias)
        colors[alias] = val
        colors[alias.upper()] = val
        colors[norm] = val
        colors[norm.replace("_", " ")] = val
    return colors


COLORES_PARTIDOS = _build_party_colors()


def color_partido(siglas: str) -> str:
    sigla_raw = str(siglas)
    sigla_norm = _normalize_siglas(sigla_raw)
    return (
        COLORES_PARTIDOS.get(sigla_raw)
        or COLORES_PARTIDOS.get(sigla_raw.upper())
        or COLORES_PARTIDOS.get(sigla_norm)
        or COLORES_PARTIDOS.get(sigla_norm.replace("_", " "))
        or CYAN
    )


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
        font-size: clamp(.75rem, .72rem + .12vw, .84rem) !important;
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
        font-size: clamp(.75rem, .72rem + .12vw, .84rem) !important;
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
    [data-testid="stSelectbox"] > div,
    [data-testid="stMultiSelect"] > div,
    [data-testid="stTextInput"] > div,
    [data-testid="stNumberInput"] > div,
    [data-testid="stDateInput"] > div,
    [data-testid="stTimeInput"] > div,
    [data-testid="stTextArea"] > div,
    [data-testid="stFileUploader"] > div,
    .stSelectbox [data-baseweb="select"] > div,
    .stMultiSelect [data-baseweb="select"] > div {{
        background: {BG2} !important;
        border-color: {BORDER} !important;
        color: {TEXT} !important;
        border-radius: 8px !important;
    }}
    /* Inputs internos (el <input> real) */
    [data-testid="stSelectbox"] input,
    [data-testid="stMultiSelect"] input,
    [data-testid="stTextInput"] input,
    [data-testid="stNumberInput"] input,
    [data-testid="stDateInput"] input,
    [data-testid="stTimeInput"] input,
    [data-testid="stTextArea"] textarea {{
        background: {BG2} !important;
        color: {TEXT} !important;
        caret-color: {CYAN} !important;
    }}
    /* Valor seleccionado dentro del BaseWeb select */
    [data-baseweb="select"] span,
    [data-baseweb="select"] div[title] {{
        color: {TEXT} !important;
    }}
    /* Tags de MultiSelect */
    [data-baseweb="tag"] {{
        background: {BG3} !important;
        color: {TEXT} !important;
        border: 1px solid {BORDER} !important;
    }}
    [data-baseweb="tag"] [role="button"] {{
        color: {TEXT2} !important;
    }}

    /* ── Popovers / menús desplegables (BaseWeb) ──────────────────── */
    [data-baseweb="popover"],
    [data-baseweb="menu"],
    [data-baseweb="calendar"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        color: {TEXT} !important;
        border-radius: 8px !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.55) !important;
    }}
    [data-baseweb="popover"] [role="listbox"],
    [data-baseweb="menu"] ul,
    [data-baseweb="select-dropdown"] {{
        background: {BG2} !important;
        color: {TEXT} !important;
    }}
    [data-baseweb="popover"] li,
    [data-baseweb="menu"] li,
    [data-baseweb="popover"] [role="option"] {{
        background: {BG2} !important;
        color: {TEXT} !important;
    }}
    [data-baseweb="popover"] li:hover,
    [data-baseweb="menu"] li:hover,
    [data-baseweb="popover"] [role="option"]:hover,
    [data-baseweb="popover"] [aria-selected="true"] {{
        background: {CYAN}1A !important;
        color: {CYAN} !important;
    }}
    /* Calendar (stDateInput) */
    [data-baseweb="calendar"] * {{ color: {TEXT} !important; }}
    [data-baseweb="calendar"] [aria-selected="true"] {{
        background: {CYAN}33 !important;
        color: {CYAN} !important;
    }}
    [data-baseweb="calendar"] button:hover {{
        background: {CYAN}22 !important;
    }}

    /* ── Radio / Checkbox ─────────────────────────────────────────── */
    [data-testid="stRadio"] label,
    [data-testid="stCheckbox"] label,
    .stRadio label, .stCheckbox label {{
        color: {TEXT2} !important;
    }}
    [data-testid="stRadio"] [role="radiogroup"] {{
        background: transparent !important;
    }}

    /* ── Slider ───────────────────────────────────────────────────── */
    .stSlider [data-testid="stSlider"] {{
        color: {CYAN} !important;
    }}
    [data-baseweb="slider"] [role="slider"] {{
        background: {CYAN} !important;
        border: 2px solid {BG} !important;
    }}
    [data-baseweb="slider"] div[data-testid="stTickBarMin"],
    [data-baseweb="slider"] div[data-testid="stTickBarMax"] {{
        color: {MUTED} !important;
    }}

    /* ── Dataframe (st.dataframe / st.data_editor) ────────────────── */
    .stDataFrame, [data-testid="stDataFrame"] {{
        background: {BG2} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
    }}
    /* Glide Data Grid: Streamlit expone CSS vars para el canvas.
       Sobrescribir aquí pinta celdas, cabeceras y fondos internos. */
    [data-testid="stDataFrame"],
    [data-testid="stDataFrameResizable"],
    .stDataFrame > div {{
        --gdg-bg-cell: {BG2};
        --gdg-bg-cell-medium: {BG3};
        --gdg-bg-header: {BG3};
        --gdg-bg-header-has-focus: {CYAN}22;
        --gdg-bg-header-hovered: {BG3};
        --gdg-bg-bubble: {BG3};
        --gdg-bg-bubble-selected: {CYAN}33;
        --gdg-bg-search-result: {CYAN}22;
        --gdg-border-color: {BORDER};
        --gdg-drilldown-border: {BORDER};
        --gdg-horizontal-border-color: {BORDER};
        --gdg-text-dark: {TEXT};
        --gdg-text-medium: {TEXT2};
        --gdg-text-light: {MUTED};
        --gdg-text-bubble: {TEXT};
        --gdg-text-header: {TEXT};
        --gdg-text-header-selected: {CYAN};
        --gdg-accent-color: {CYAN};
        --gdg-accent-fg: {BG};
        --gdg-accent-light: {CYAN}22;
        --gdg-link-color: {CYAN};
        --gdg-cell-horizontal-padding: 10px;
        --gdg-cell-vertical-padding: 6px;
    }}
    /* st.table clásica */
    .stTable, [data-testid="stTable"] table {{
        background: {BG2} !important;
        color: {TEXT} !important;
        border: 1px solid {BORDER} !important;
        border-radius: 10px !important;
    }}
    [data-testid="stTable"] thead tr th {{
        background: {BG3} !important;
        color: {TEXT} !important;
        border-bottom: 1px solid {BORDER} !important;
    }}
    [data-testid="stTable"] tbody tr td {{
        background: {BG2} !important;
        color: {TEXT2} !important;
        border-bottom: 1px solid {BORDER} !important;
    }}
    [data-testid="stTable"] tbody tr:hover td {{
        background: {CYAN}0E !important;
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
    * {{
        scrollbar-width: thin;
        scrollbar-color: {BORDER} {BG};
    }}
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
        for path, label in PAGES_NAV["analisis_electoral"]:
            st.page_link(path, label=label)

        # Sección: Índices Politeia
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.8rem .5rem .3rem'>Índices Politeia</div>", unsafe_allow_html=True)
        for path, label in PAGES_NAV["indices_politeia"]:
            st.page_link(path, label=label)

        # Sección: Modelos & Datos
        st.markdown(f"<div style='font-size:.62rem;font-weight:700;letter-spacing:.14em;color:{MUTED};text-transform:uppercase;padding:.8rem .5rem .3rem'>Modelos & Datos</div>", unsafe_allow_html=True)
        for path, label in PAGES_NAV["modelos_datos"]:
            st.page_link(path, label=label)

        # Footer
        dot_color = CYAN
        status_text = "SISTEMA ACTIVO"
        extra_text = "DATOS EN TIEMPO REAL"
        try:
            from dashboard.db import cargar_alertas

            alertas = cargar_alertas(solo_no_leidas=True, limit=1)
            if alertas.empty:
                status_text = "SIN ALERTAS ABIERTAS"
            else:
                sev = str(alertas.iloc[0].get("severidad", "")).upper()
                if sev in {"CRITICAL", "ALTA", "HIGH"}:
                    dot_color = RED
                    status_text = "ALERTA ACTIVA"
                    extra_text = "REVISAR PANEL DE ALERTAS"
                elif sev in {"MEDIA", "MEDIUM", "WARNING"}:
                    dot_color = AMBER
                    status_text = "SEGUIMIENTO ACTIVO"
        except Exception:
            dot_color = MUTED
            status_text = "ESTADO NO DISPONIBLE"
            extra_text = "SINCRONIZACIÓN PENDIENTE"

        st.markdown(f"""
        <div style="border-top:1px solid {BORDER};margin-top:1.2rem;padding:1rem .5rem .5rem;
                    font-size:.62rem;color:{MUTED};text-align:center;letter-spacing:.06em">
            <span style="color:{dot_color}">●</span> {status_text} &nbsp;·&nbsp; {extra_text}
        </div>
        """, unsafe_allow_html=True)
