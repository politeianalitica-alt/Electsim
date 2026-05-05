"""
Filters — Bloque 12.

Filtros reutilizables para páginas ElectSim.
Cada filtro devuelve el valor seleccionado; el estado lo gestiona Streamlit.
"""
from __future__ import annotations

import datetime
from typing import Any

import streamlit as st

from dashboard.ui.tokens import CYAN, MUTED, TEXT2


# ── Helpers ────────────────────────────────────────────────────────────────────

def _sidebar_label(label: str) -> None:
    st.markdown(
        f"<p style='color:{CYAN};font-size:11px;font-weight:600;"
        f"text-transform:uppercase;letter-spacing:0.5px;margin:8px 0 3px;'>{label}</p>",
        unsafe_allow_html=True,
    )


# ── date_range_filter ──────────────────────────────────────────────────────────

def date_range_filter(
    label: str = "Rango de fechas",
    default_days: int = 30,
    key: str = "date_range",
    sidebar: bool = True,
) -> tuple[datetime.date, datetime.date]:
    """
    Filtro de rango de fechas.

    Returns:
        Tupla (start_date, end_date).
    """
    end_default = datetime.date.today()
    start_default = end_default - datetime.timedelta(days=default_days)

    ctx = st.sidebar if sidebar else st

    if sidebar:
        _sidebar_label(label)

    col1, col2 = ctx.columns(2)
    with col1:
        start = st.date_input("Desde", value=start_default, key=f"{key}_start")
    with col2:
        end = st.date_input("Hasta", value=end_default, key=f"{key}_end")

    if start > end:
        st.warning("⚠️ La fecha de inicio es posterior a la de fin.")
        start = end

    return start, end


# ── source_filter ──────────────────────────────────────────────────────────────

def source_filter(
    available_sources: list[str] | None = None,
    label: str = "Fuente",
    key: str = "source_filter",
    sidebar: bool = True,
    multiselect: bool = False,
    default_all: bool = True,
) -> str | list[str] | None:
    """
    Filtro de fuente de datos.

    Returns:
        Fuente seleccionada (str o list[str] si multiselect).
    """
    sources = available_sources or [
        "BOE", "Congreso", "Senado", "Moncloa",
        "El País", "El Mundo", "ABC", "La Vanguardia",
        "Europa Press", "EFE", "INE", "Eurostat",
    ]

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    if multiselect:
        default = sources if default_all else []
        return ctx.multiselect(label, sources, default=default, key=key)
    else:
        options = ["Todas"] + sources
        selected = ctx.selectbox(label, options, key=key)
        return None if selected == "Todas" else selected


# ── severity_filter ────────────────────────────────────────────────────────────

def severity_filter(
    label: str = "Severidad",
    key: str = "severity_filter",
    sidebar: bool = True,
    multiselect: bool = True,
) -> list[str] | str | None:
    """
    Filtro de severidad (crítica/alta/media/baja/info).

    Returns:
        Severidades seleccionadas.
    """
    options = ["critical", "high", "medium", "low", "info"]
    labels_map = {
        "critical": "🔴 Crítica",
        "high": "🟠 Alta",
        "medium": "🟡 Media",
        "low": "🟢 Baja",
        "info": "⚪ Info",
    }
    display_options = [labels_map[o] for o in options]
    display_to_value = {v: k for k, v in labels_map.items()}

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    if multiselect:
        selected_display = ctx.multiselect(
            label, display_options, default=display_options, key=key
        )
        return [display_to_value[d] for d in selected_display]
    else:
        selected_display = ctx.selectbox(
            label, ["Todas"] + display_options, key=key
        )
        if selected_display == "Todas":
            return None
        return display_to_value.get(selected_display)


# ── territory_filter ───────────────────────────────────────────────────────────

def territory_filter(
    available_territories: list[str] | None = None,
    label: str = "Territorio",
    key: str = "territory_filter",
    sidebar: bool = True,
    multiselect: bool = False,
) -> str | list[str] | None:
    """
    Filtro de territorio (CCAA, provincia, municipio).

    Returns:
        Territorio(s) seleccionado(s).
    """
    default_territories = [
        "España", "Andalucía", "Aragón", "Asturias", "Baleares",
        "Canarias", "Cantabria", "Castilla-La Mancha", "Castilla y León",
        "Cataluña", "Ceuta", "Extremadura", "Galicia", "La Rioja",
        "Madrid", "Melilla", "Murcia", "Navarra", "País Vasco", "Valencia",
    ]
    territories = available_territories or default_territories

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    if multiselect:
        return ctx.multiselect(label, territories, default=["España"], key=key)
    else:
        options = ["Todos"] + territories
        selected = ctx.selectbox(label, options, key=key)
        return None if selected == "Todos" else selected


# ── sector_filter ──────────────────────────────────────────────────────────────

def sector_filter(
    available_sectors: list[str] | None = None,
    label: str = "Sector",
    key: str = "sector_filter",
    sidebar: bool = True,
) -> str | None:
    """
    Filtro de sector económico/político.

    Returns:
        Sector seleccionado o None.
    """
    default_sectors = [
        "Economía", "Sanidad", "Educación", "Vivienda", "Energía",
        "Transporte", "Defensa", "Justicia", "Interior", "Medio Ambiente",
        "Agricultura", "Cultura", "Ciencia", "Digitalización",
    ]
    sectors = available_sectors or default_sectors

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    options = ["Todos"] + sectors
    selected = ctx.selectbox(label, options, key=key)
    return None if selected == "Todos" else selected


# ── actor_filter ───────────────────────────────────────────────────────────────

def actor_filter(
    available_actors: list[str] | None = None,
    label: str = "Actor",
    key: str = "actor_filter",
    sidebar: bool = True,
    multiselect: bool = False,
) -> str | list[str] | None:
    """
    Filtro de actor político.

    Returns:
        Actor(es) seleccionado(s).
    """
    default_actors = [
        "PP", "PSOE", "Vox", "Sumar", "ERC", "Junts", "PNV",
        "Bildu", "CC", "BNG", "Podemos", "Ciudadanos",
    ]
    actors = available_actors or default_actors

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    if multiselect:
        return ctx.multiselect(label, actors, key=key)
    else:
        options = ["Todos"] + actors
        selected = ctx.selectbox(label, options, key=key)
        return None if selected == "Todos" else selected


# ── module_filter ──────────────────────────────────────────────────────────────

def module_filter(
    available_modules: list[str] | None = None,
    label: str = "Módulo",
    key: str = "module_filter",
    sidebar: bool = True,
) -> str | None:
    """
    Filtro de módulo ElectSim.

    Returns:
        Módulo seleccionado o None.
    """
    default_modules = [
        "D1_Briefings", "D2_Actores", "D3_Termometro",
        "D4_Legislativo", "D5_Riesgos", "D7_Medios",
        "D8_Geopolitica", "N1_Electoral", "N5_Campana",
        "N6_Economia", "N8_ChatIA", "N9_OpenData",
    ]
    modules = available_modules or default_modules

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    options = ["Todos"] + modules
    selected = ctx.selectbox(label, options, key=key)
    return None if selected == "Todos" else selected


# ── search_filter ──────────────────────────────────────────────────────────────

def search_filter(
    label: str = "Buscar",
    placeholder: str = "Buscar...",
    key: str = "search_filter",
    sidebar: bool = False,
    min_chars: int = 2,
) -> str | None:
    """
    Campo de búsqueda de texto.

    Returns:
        Query string si supera min_chars, None otherwise.
    """
    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    query = ctx.text_input(label, placeholder=placeholder, key=key)
    if query and len(query) >= min_chars:
        return query.strip()
    return None


# ── confidence_filter ──────────────────────────────────────────────────────────

def confidence_filter(
    label: str = "Confianza mínima",
    key: str = "confidence_filter",
    sidebar: bool = True,
    default: float = 0.0,
) -> float:
    """
    Filtro de confianza mínima (slider 0-1).

    Returns:
        Umbral de confianza mínima (0.0-1.0).
    """
    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    return ctx.slider(
        label,
        min_value=0.0,
        max_value=1.0,
        value=default,
        step=0.05,
        format="%.0f%%",
        key=key,
    )


# ── party_filter ───────────────────────────────────────────────────────────────

def party_filter(
    available_parties: list[str] | None = None,
    label: str = "Partido",
    key: str = "party_filter",
    sidebar: bool = True,
    multiselect: bool = False,
) -> str | list[str] | None:
    """
    Filtro de partido político.

    Returns:
        Partido(s) seleccionado(s).
    """
    default_parties = [
        "PP", "PSOE", "Vox", "Sumar", "ERC", "Junts",
        "PNV", "Bildu", "CC", "BNG",
    ]
    parties = available_parties or default_parties

    ctx = st.sidebar if sidebar else st
    if sidebar:
        _sidebar_label(label)

    if multiselect:
        return ctx.multiselect(label, parties, key=key)
    else:
        options = ["Todos"] + parties
        selected = ctx.selectbox(label, options, key=key)
        return None if selected == "Todos" else selected


# ── render_filter_summary ──────────────────────────────────────────────────────

def render_filter_summary(filters: dict[str, Any]) -> None:
    """
    Resumen visual de filtros activos.

    Args:
        filters: Dict {nombre_filtro: valor_activo}.
                 Los valores None/vacíos se omiten.
    """
    active = {k: v for k, v in filters.items() if v is not None and v != [] and v != ""}
    if not active:
        return

    parts = []
    for name, value in active.items():
        if isinstance(value, list):
            val_str = ", ".join(str(v) for v in value[:3])
            if len(value) > 3:
                val_str += f" +{len(value) - 3}"
        elif isinstance(value, tuple) and len(value) == 2:
            val_str = f"{value[0]} → {value[1]}"
        else:
            val_str = str(value)
        parts.append(
            f"<span style='color:{CYAN};font-size:10px;'>{name}:</span> "
            f"<span style='color:{TEXT2};font-size:10px;'>{val_str}</span>"
        )

    html = " &nbsp;|&nbsp; ".join(parts)
    st.markdown(
        f"<div style='margin:4px 0 8px;color:{MUTED};font-size:10px;'>"
        f"🔍 Filtros activos: {html}</div>",
        unsafe_allow_html=True,
    )
