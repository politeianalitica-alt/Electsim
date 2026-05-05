"""
Tokens — Bloque 12.

Re-exporta los design tokens de dashboard/shared.py.
No define una paleta nueva. Añade helpers de color por estado/severidad.
"""
from __future__ import annotations

# Re-exportar desde shared.py para que los componentes del bloque 12
# importen desde un único punto sin depender de shared directamente.
from dashboard.shared import (
    BG,
    BG2,
    BG3,
    BORDER,
    BORDER2,
    CYAN,
    CYAN2,
    BLUE,
    PURPLE,
    TEXT,
    TEXT2,
    MUTED,
    GREEN,
    AMBER,
    RED,
)

__all__ = [
    "BG", "BG2", "BG3", "BORDER", "BORDER2",
    "CYAN", "CYAN2", "BLUE", "PURPLE",
    "TEXT", "TEXT2", "MUTED",
    "GREEN", "AMBER", "RED",
    "get_status_color",
    "get_severity_color",
    "get_party_color",
    "STATUS_COLORS",
    "SEVERITY_COLORS",
]

# ── Mapas semánticos ───────────────────────────────────────────────────────────

STATUS_COLORS: dict[str, str] = {
    # Positivos / OK
    "ok": GREEN,
    "verified": GREEN,
    "active": GREEN,
    "completed": GREEN,
    "fresh": GREEN,
    "live": GREEN,
    "real": GREEN,
    # Advertencias
    "warning": AMBER,
    "stale": AMBER,
    "pending": AMBER,
    "partial": AMBER,
    "draft": AMBER,
    "running": CYAN,
    # Errores / Crítico
    "error": RED,
    "critical": RED,
    "failed": RED,
    "blocked": RED,
    # Neutral / Desconocido
    "unknown": MUTED,
    "demo": MUTED,
    "inactive": MUTED,
    "archived": MUTED,
    "info": CYAN,
    "ready": BLUE,
}

SEVERITY_COLORS: dict[str, str] = {
    "critical": RED,
    "high": RED,
    "alto": RED,
    "crítico": RED,
    "medium": AMBER,
    "medio": AMBER,
    "moderate": AMBER,
    "low": GREEN,
    "bajo": GREEN,
    "info": CYAN,
    "unknown": MUTED,
    "none": MUTED,
}

# Colores de freshness
FRESHNESS_COLORS: dict[str, str] = {
    "fresh": GREEN,
    "recent": GREEN,
    "stale": AMBER,
    "outdated": RED,
    "unknown": MUTED,
    "demo": MUTED,
}


def get_status_color(status: str, default: str | None = None) -> str:
    """
    Devuelve el color del token para un estado dado.

    Args:
        status: Estado (ok, error, warning, demo, etc.).
        default: Color por defecto si no se reconoce.

    Returns:
        Hex color string.
    """
    return STATUS_COLORS.get(str(status).lower(), default or MUTED)


def get_severity_color(severity: str, default: str | None = None) -> str:
    """
    Devuelve el color del token para una severidad dada.

    Args:
        severity: Nivel (critical, high, medium, low, etc.).
        default: Color por defecto.

    Returns:
        Hex color string.
    """
    return SEVERITY_COLORS.get(str(severity).lower(), default or MUTED)


def get_party_color(party: str) -> str:
    """
    Devuelve el color de un partido político.
    Delega a shared.color_partido para mantener consistencia.
    """
    try:
        from dashboard.shared import color_partido
        return color_partido(party)
    except Exception:
        return MUTED


def get_freshness_color(freshness: str) -> str:
    """Devuelve el color para un nivel de freshness."""
    return FRESHNESS_COLORS.get(str(freshness).lower(), MUTED)
