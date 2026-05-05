"""
Dashboard UI — Bloque 12: Design System Core.

Librería de componentes visuales reutilizables para ElectSim.
Importa tokens de dashboard/shared.py — no redefine la paleta.

Uso básico:
    from dashboard.ui import tokens, cards, badges, charts, empty_states
    from dashboard.ui.cards import metric_card, signal_card
    from dashboard.ui.badges import severity_badge, freshness_badge
"""
from dashboard.ui import (
    tokens,
    badges,
    cards,
    tables,
    charts,
    maps,
    graphs,
    timelines,
    evidence,
    empty_states,
    layout,
    command_bar,
    filters,
    compare,
    exports,
)

__all__ = [
    "tokens",
    "badges",
    "cards",
    "tables",
    "charts",
    "maps",
    "graphs",
    "timelines",
    "evidence",
    "empty_states",
    "layout",
    "command_bar",
    "filters",
    "compare",
    "exports",
]
