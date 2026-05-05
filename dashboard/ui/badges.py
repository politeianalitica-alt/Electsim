"""
Badges — Bloque 12.

Badges HTML/Streamlit reutilizables para severidad, freshness,
fuente, confianza, estado, riesgo, módulo, verificación y demo.
"""
from __future__ import annotations

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BORDER, CYAN, BLUE, PURPLE,
    TEXT2, MUTED, GREEN, AMBER, RED,
    get_severity_color, get_status_color,
)

# ── Base ───────────────────────────────────────────────────────────────────────

def _badge_html(
    label: str,
    color: str,
    bg_alpha: str = "22",
    text_color: str | None = None,
    bold: bool = False,
    small: bool = False,
) -> str:
    """Genera HTML de un badge inline."""
    tc = text_color or color
    weight = "600" if bold else "500"
    size = "10px" if small else "11px"
    return (
        f"<span style='"
        f"background:{color}{bg_alpha};"
        f"border:1px solid {color}55;"
        f"color:{tc};"
        f"border-radius:4px;"
        f"padding:2px 7px;"
        f"font-size:{size};"
        f"font-weight:{weight};"
        f"white-space:nowrap;"
        f"display:inline-block;"
        f"margin:1px 2px;"
        f"'>{label}</span>"
    )


def _render(html: str) -> None:
    """Renderiza HTML de badge en Streamlit."""
    st.markdown(html, unsafe_allow_html=True)


# ── Badges de severidad ────────────────────────────────────────────────────────

def severity_badge(severity: str, inline: bool = False) -> str | None:
    """
    Badge de severidad.

    Args:
        severity: critical/high/medium/low/unknown.
        inline: Si True devuelve HTML; si False renderiza en Streamlit.

    Returns:
        HTML si inline=True, None si renderiza.
    """
    labels = {
        "critical": "CRÍTICO",
        "high": "ALTO",
        "alto": "ALTO",
        "medium": "MEDIO",
        "medio": "MEDIO",
        "moderate": "MEDIO",
        "low": "BAJO",
        "bajo": "BAJO",
        "unknown": "DESCONOCIDO",
        "none": "SIN NIVEL",
    }
    label = labels.get(str(severity).lower(), str(severity).upper())
    color = get_severity_color(severity, RED)
    html = _badge_html(label, color, bold=True)
    if inline:
        return html
    _render(html)
    return None


def risk_badge(score: float, inline: bool = False) -> str | None:
    """
    Badge de riesgo basado en puntuación numérica (0-1 o 0-100).

    Args:
        score: Puntuación de riesgo.
        inline: Si True devuelve HTML.
    """
    if score > 1.0:
        score = score / 100.0
    if score >= 0.7:
        level, color = "RIESGO ALTO", RED
    elif score >= 0.4:
        level, color = "RIESGO MEDIO", AMBER
    else:
        level, color = "RIESGO BAJO", GREEN
    html = _badge_html(f"{level} {score:.0%}", color, bold=True)
    if inline:
        return html
    _render(html)
    return None


# ── Freshness ──────────────────────────────────────────────────────────────────

def freshness_badge(freshness: str, label_override: str | None = None, inline: bool = False) -> str | None:
    """
    Badge de frescura de datos.

    Args:
        freshness: fresh/stale/outdated/unknown/demo.
        label_override: Etiqueta personalizada (ej. "hace 3h").
        inline: Si True devuelve HTML.
    """
    from dashboard.ui.tokens import get_freshness_color
    colors = {
        "fresh": GREEN,
        "recent": GREEN,
        "stale": AMBER,
        "outdated": RED,
        "unknown": MUTED,
        "demo": MUTED,
    }
    labels_map = {
        "fresh": "ACTUALIZADO",
        "recent": "RECIENTE",
        "stale": "DESACTUALIZADO",
        "outdated": "OBSOLETO",
        "unknown": "SIN FECHA",
        "demo": "DEMO",
    }
    key = str(freshness).lower()
    color = colors.get(key, MUTED)
    label = label_override or labels_map.get(key, freshness.upper())
    html = _badge_html(label, color)
    if inline:
        return html
    _render(html)
    return None


# ── Fuente ─────────────────────────────────────────────────────────────────────

def source_badge(source: str, inline: bool = False) -> str | None:
    """Badge de fuente de datos."""
    html = _badge_html(source.upper(), CYAN, small=True)
    if inline:
        return html
    _render(html)
    return None


# ── Confianza ──────────────────────────────────────────────────────────────────

def confidence_badge(score: float, inline: bool = False) -> str | None:
    """
    Badge de confianza/calidad del dato.

    Args:
        score: Puntuación 0-1.
        inline: Si True devuelve HTML.
    """
    if score >= 0.8:
        color, label = GREEN, f"CONFIANZA {score:.0%}"
    elif score >= 0.5:
        color, label = AMBER, f"CONFIANZA {score:.0%}"
    else:
        color, label = RED, f"BAJA CONFIANZA {score:.0%}"
    html = _badge_html(label, color, small=True)
    if inline:
        return html
    _render(html)
    return None


# ── Estado ─────────────────────────────────────────────────────────────────────

def status_badge(status: str, label_override: str | None = None, inline: bool = False) -> str | None:
    """Badge de estado genérico (ok, error, running, demo, etc.)."""
    color = get_status_color(status, MUTED)
    label = label_override or status.upper()
    html = _badge_html(label, color)
    if inline:
        return html
    _render(html)
    return None


# ── Módulo ─────────────────────────────────────────────────────────────────────

def module_badge(module_name: str, inline: bool = False) -> str | None:
    """Badge identificador de módulo (ej. 'ELECTORAL', 'MEDIOS')."""
    html = _badge_html(module_name.upper(), PURPLE, small=True)
    if inline:
        return html
    _render(html)
    return None


# ── Verificación ───────────────────────────────────────────────────────────────

def verified_badge(verified: bool = True, inline: bool = False) -> str | None:
    """Badge de verificación."""
    if verified:
        html = _badge_html("✓ VERIFICADO", GREEN)
    else:
        html = _badge_html("✗ NO VERIFICADO", RED)
    if inline:
        return html
    _render(html)
    return None


# ── Demo ───────────────────────────────────────────────────────────────────────

def demo_badge(inline: bool = False) -> str | None:
    """Badge discreto de modo demo."""
    html = _badge_html("DEMO", MUTED, text_color=TEXT2, small=True)
    if inline:
        return html
    _render(html)
    return None


# ── Calidad ────────────────────────────────────────────────────────────────────

def quality_badge(score: float, inline: bool = False) -> str | None:
    """Badge de calidad de datos (0-1)."""
    if score >= 0.8:
        color, label = GREEN, f"CALIDAD ALTA {score:.0%}"
    elif score >= 0.5:
        color, label = AMBER, f"CALIDAD MEDIA {score:.0%}"
    else:
        color, label = RED, f"CALIDAD BAJA {score:.0%}"
    html = _badge_html(label, color, small=True)
    if inline:
        return html
    _render(html)
    return None


# ── Helper: múltiples badges en línea ─────────────────────────────────────────

def badge_row(*html_badges: str | None) -> None:
    """Renderiza una fila de badges HTML en línea."""
    valid = [b for b in html_badges if b]
    if valid:
        st.markdown(" ".join(valid), unsafe_allow_html=True)


def impact_badge(level: str, inline: bool = False) -> str | None:
    """Badge de impacto (ALTO, MEDIO, BAJO, NINGUNO)."""
    colors = {"alto": RED, "high": RED, "medio": AMBER, "medium": AMBER,
               "bajo": GREEN, "low": GREEN, "ninguno": MUTED, "none": MUTED}
    color = colors.get(str(level).lower(), MUTED)
    html = _badge_html(f"IMPACTO {level.upper()}", color)
    if inline:
        return html
    _render(html)
    return None
