"""
Command Bar — Bloque 12.

Barra de acciones estándar para páginas ElectSim.
Genera botones de acción con iconos y callbacks.
"""
from __future__ import annotations

from typing import Any, Callable

import streamlit as st

from dashboard.ui.tokens import CYAN, BORDER, TEXT2, MUTED, BG2


# ── Acciones estándar ──────────────────────────────────────────────────────────

DEFAULT_ACTIONS = [
    {"id": "refresh", "label": "Actualizar", "icon": "🔄", "variant": "secondary"},
    {"id": "export", "label": "Exportar", "icon": "📤", "variant": "secondary"},
    {"id": "filter", "label": "Filtros", "icon": "🔍", "variant": "secondary"},
    {"id": "help", "label": "Ayuda", "icon": "❓", "variant": "ghost"},
]


# ── render_command_bar ─────────────────────────────────────────────────────────

def render_command_bar(
    actions: list[dict[str, Any]] | None = None,
    show_defaults: bool = False,
    key_prefix: str = "cmdbar",
) -> dict[str, bool]:
    """
    Barra de acciones con botones estándar.

    Args:
        actions: Lista de dicts con {id, label, icon?, variant?, disabled?, tooltip?}.
                 variant: "primary" | "secondary" | "ghost" | "danger".
        show_defaults: Si True, añade acciones por defecto al final.
        key_prefix: Prefijo para claves Streamlit (evitar colisiones).

    Returns:
        Dict {action_id: True} para acciones pulsadas en este render.
    """
    _actions = list(actions or [])
    if show_defaults:
        existing_ids = {a.get("id") for a in _actions}
        for da in DEFAULT_ACTIONS:
            if da["id"] not in existing_ids:
                _actions.append(da)

    if not _actions:
        return {}

    clicked: dict[str, bool] = {}

    cols = st.columns(len(_actions))
    for col, action in zip(cols, _actions):
        action_id = action.get("id", "action")
        label = action.get("label", action_id)
        icon = action.get("icon", "")
        disabled = action.get("disabled", False)
        variant = action.get("variant", "secondary")

        button_label = f"{icon} {label}".strip() if icon else label

        with col:
            if variant == "primary":
                pressed = st.button(
                    button_label,
                    key=f"{key_prefix}_{action_id}",
                    disabled=disabled,
                    type="primary",
                    use_container_width=True,
                )
            else:
                pressed = st.button(
                    button_label,
                    key=f"{key_prefix}_{action_id}",
                    disabled=disabled,
                    use_container_width=True,
                )
            if pressed:
                clicked[action_id] = True

    return clicked


# ── render_action_toolbar ──────────────────────────────────────────────────────

def render_action_toolbar(
    title: str | None = None,
    actions: list[dict[str, Any]] | None = None,
    right_actions: list[dict[str, Any]] | None = None,
    key_prefix: str = "toolbar",
) -> dict[str, bool]:
    """
    Toolbar de dos columnas: título/acciones izquierda + acciones derecha.

    Args:
        title: Texto de la barra.
        actions: Acciones en el lado izquierdo.
        right_actions: Acciones en el lado derecho.
        key_prefix: Prefijo de clave.

    Returns:
        Dict de acciones pulsadas.
    """
    clicked: dict[str, bool] = {}

    col_left, col_right = st.columns([3, 2])

    with col_left:
        if title:
            st.markdown(
                f"<span style='color:{TEXT2};font-size:13px;font-weight:600;'>{title}</span>",
                unsafe_allow_html=True,
            )
        if actions:
            sub_cols = st.columns(len(actions))
            for col, action in zip(sub_cols, actions):
                action_id = action.get("id", "action")
                icon = action.get("icon", "")
                label = action.get("label", action_id)
                with col:
                    pressed = st.button(
                        f"{icon} {label}".strip() if icon else label,
                        key=f"{key_prefix}_left_{action_id}",
                        disabled=action.get("disabled", False),
                        use_container_width=True,
                    )
                    if pressed:
                        clicked[action_id] = True

    with col_right:
        if right_actions:
            sub_cols = st.columns(len(right_actions))
            for col, action in zip(sub_cols, right_actions):
                action_id = action.get("id", "action")
                icon = action.get("icon", "")
                label = action.get("label", action_id)
                with col:
                    pressed = st.button(
                        f"{icon} {label}".strip() if icon else label,
                        key=f"{key_prefix}_right_{action_id}",
                        disabled=action.get("disabled", False),
                        use_container_width=True,
                    )
                    if pressed:
                        clicked[action_id] = True

    return clicked


# ── render_page_actions ────────────────────────────────────────────────────────

def render_page_actions(
    module_id: str,
    extra_actions: list[dict[str, Any]] | None = None,
) -> dict[str, bool]:
    """
    Acciones estándar de página: Actualizar, Exportar CSV, Ayuda.

    Args:
        module_id: ID del módulo para prefixar claves.
        extra_actions: Acciones adicionales específicas del módulo.

    Returns:
        Dict de acciones pulsadas.
    """
    base = [
        {"id": "refresh", "label": "Actualizar", "icon": "🔄"},
        {"id": "export_csv", "label": "CSV", "icon": "📊"},
        {"id": "export_md", "label": "Markdown", "icon": "📝"},
    ]
    if extra_actions:
        base = base + extra_actions

    return render_command_bar(base, key_prefix=f"page_{module_id}")


# ── render_breadcrumb ──────────────────────────────────────────────────────────

def render_breadcrumb(
    crumbs: list[str | dict[str, str]],
    separator: str = "›",
) -> None:
    """
    Breadcrumb de navegación.

    Args:
        crumbs: Lista de strings o dicts {label, url?}.
        separator: Separador entre migas.
    """
    parts_html = []
    for crumb in crumbs:
        if isinstance(crumb, str):
            parts_html.append(
                f"<span style='color:{TEXT2};font-size:12px;'>{crumb}</span>"
            )
        elif isinstance(crumb, dict):
            label = crumb.get("label", "")
            url = crumb.get("url", "")
            if url:
                parts_html.append(
                    f"<a href='{url}' style='color:{CYAN};font-size:12px;text-decoration:none;'>{label}</a>"
                )
            else:
                parts_html.append(
                    f"<span style='color:{TEXT2};font-size:12px;'>{label}</span>"
                )

    sep = f" <span style='color:{MUTED};font-size:12px;'>{separator}</span> "
    html = sep.join(parts_html)

    st.markdown(
        f"<div style='margin-bottom:8px;'>{html}</div>",
        unsafe_allow_html=True,
    )
