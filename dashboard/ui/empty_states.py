"""
Empty States — Bloque 12.

Estados vacíos, error, demo, carga y dependencias faltantes.
Evita que la app parezca rota cuando no hay datos.
"""
from __future__ import annotations

import streamlit as st

from dashboard.ui.tokens import BG2, BORDER, CYAN, TEXT, TEXT2, MUTED, GREEN, AMBER, RED


def _empty_box(icon: str, title: str, description: str | None, color: str) -> None:
    """Renderiza un box de estado vacío con estilo ElectSim."""
    desc_html = f"<p style='color:{TEXT2};font-size:13px;margin:4px 0 0 0;'>{description}</p>" if description else ""
    st.markdown(
        f"""<div style='
            background:{BG2};
            border:1px solid {color}33;
            border-radius:8px;
            padding:28px 24px;
            text-align:center;
            margin:8px 0;
        '>
            <div style='font-size:32px;margin-bottom:8px;'>{icon}</div>
            <p style='color:{color};font-size:15px;font-weight:600;margin:0;'>{title}</p>
            {desc_html}
        </div>""",
        unsafe_allow_html=True,
    )


def empty_state(
    title: str = "Sin datos",
    description: str | None = None,
    action_label: str | None = None,
    icon: str = "📭",
    color: str | None = None,
) -> None:
    """
    Estado vacío genérico.

    Args:
        title: Título principal.
        description: Descripción opcional.
        action_label: Si se proporciona, muestra un st.info con la acción sugerida.
        icon: Emoji del estado.
        color: Color del borde. Default: MUTED.
    """
    _empty_box(icon, title, description, color or MUTED)
    if action_label:
        st.info(f"💡 {action_label}")


def demo_state(module_name: str, description: str | None = None) -> None:
    """
    Estado de modo demo para un módulo.

    Args:
        module_name: Nombre del módulo.
        description: Descripción del estado demo.
    """
    desc = description or (
        f"Los datos de {module_name} se mostrarán en modo demo hasta "
        "conectar la fuente de datos real."
    )
    _empty_box(
        "🎭",
        f"{module_name} — Modo Demo",
        desc,
        MUTED,
    )


def no_data_state(
    source: str | None = None,
    since: str | None = None,
) -> None:
    """
    Estado sin datos disponibles.

    Args:
        source: Nombre de la fuente (ej. "BOE", "INE").
        since: Desde cuándo no hay datos (ej. "hace 3 días").
    """
    desc_parts = []
    if source:
        desc_parts.append(f"Fuente: {source}")
    if since:
        desc_parts.append(f"Sin datos desde: {since}")
    desc = " · ".join(desc_parts) if desc_parts else "No se encontraron datos para los filtros seleccionados."
    _empty_box("🔍", "Sin resultados", desc, MUTED)


def error_state(
    message: str = "Error inesperado",
    details: str | None = None,
    show_details: bool = False,
) -> None:
    """
    Estado de error.

    Args:
        message: Mensaje principal.
        details: Detalles técnicos opcionales.
        show_details: Si True, muestra los detalles en un expander.
    """
    _empty_box("⚠️", message, None, RED)
    if details and show_details:
        with st.expander("Ver detalles técnicos"):
            st.code(details)


def loading_state(message: str = "Cargando datos...") -> None:
    """Estado de carga en progreso."""
    _empty_box("⏳", message, "Por favor, espera un momento.", CYAN)


def stale_data_state(
    source: str | None = None,
    last_updated: str | None = None,
    action: str | None = None,
) -> None:
    """
    Estado de datos desactualizados.

    Args:
        source: Fuente de datos.
        last_updated: Última actualización.
        action: Acción sugerida.
    """
    desc_parts = []
    if source:
        desc_parts.append(f"Fuente: {source}")
    if last_updated:
        desc_parts.append(f"Última actualización: {last_updated}")
    desc = " · ".join(desc_parts) if desc_parts else "Los datos pueden no estar actualizados."
    _empty_box("🕐", "Datos desactualizados", desc, AMBER)
    if action:
        st.info(f"💡 {action}")


def missing_dependency_state(
    dependency_name: str,
    install_hint: str | None = None,
) -> None:
    """
    Estado cuando falta una dependencia opcional.

    Args:
        dependency_name: Nombre del paquete faltante.
        install_hint: Comando de instalación sugerido.
    """
    desc = f"Instala el paquete opcional: pip install {install_hint or dependency_name}"
    _empty_box(
        "📦",
        f"Dependencia opcional no disponible: {dependency_name}",
        desc,
        AMBER,
    )


def coming_soon_state(
    feature_name: str,
    expected: str | None = None,
) -> None:
    """
    Estado para funcionalidad en desarrollo.

    Args:
        feature_name: Nombre de la funcionalidad.
        expected: Fecha o versión esperada.
    """
    desc = f"Disponible en próxima versión{f': {expected}' if expected else ''}."
    _empty_box("🚧", f"{feature_name} — En desarrollo", desc, CYAN)
