"""
Premium Cards — Componentes UI para ElectSim.

Biblioteca de tarjetas y componentes HTML premium para el dashboard.
Todos los componentes devuelven HTML string para usar con st.markdown(unsafe_allow_html=True).
"""
from __future__ import annotations

# ── Design tokens ──────────────────────────────────────────────────────────────
BG = "#080C14"
BG2 = "#0D1320"
BG3 = "#111827"
BORDER = "#1E293B"
BORDER2 = "#00D4FF26"
CYAN = "#00D4FF"
BLUE = "#3B82F6"
PURPLE = "#8B5CF6"
TEXT = "#E2E8F0"
TEXT2 = "#94A3B8"
MUTED = "#475569"
GREEN = "#10B981"
AMBER = "#F59E0B"
RED = "#EF4444"

_LEVEL_COLORS = {
    "critical": RED,
    "high": AMBER,
    "medium": BLUE,
    "low": GREEN,
}

_IMPACT_COLORS = {
    "critical": RED,
    "high": AMBER,
    "medium": BLUE,
    "low": GREEN,
}

_VELOCITY_MAP = {
    "up": (GREEN, "&#9650;"),
    "down": (RED, "&#9660;"),
    "flat": (MUTED, "&#8212;"),
}


# ── Funciones de componentes ───────────────────────────────────────────────────

def alert_card(
    title: str,
    body: str,
    level: str = "medium",
    source: str = "",
    time_ago: str = "",
) -> str:
    """Tarjeta de alerta con borde de color segun nivel de severidad."""
    border_color = _LEVEL_COLORS.get(level.lower(), BLUE)
    level_label = level.upper()
    source_html = (
        f'<span style="font-size:.62rem;color:{MUTED}">{source}</span>'
        if source else ""
    )
    time_html = (
        f'<span style="font-size:.62rem;color:{MUTED}">{time_ago}</span>'
        if time_ago else ""
    )
    footer = (
        f'<div style="display:flex;justify-content:space-between;align-items:center;margin-top:.5rem">'
        f'{source_html}{time_html}'
        f'</div>'
        if (source or time_ago) else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-left:4px solid {border_color};'
        f'border-radius:8px;padding:.9rem 1.1rem;margin-bottom:.5rem">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.35rem">'
        f'<span style="font-size:.85rem;font-weight:700;color:{TEXT}">{title}</span>'
        f'<span style="background:{border_color}22;color:{border_color};font-size:.58rem;font-weight:700;'
        f'padding:.15rem .45rem;border-radius:4px;letter-spacing:.08em;white-space:nowrap">{level_label}</span>'
        f'</div>'
        f'<div style="font-size:.78rem;color:{TEXT2};line-height:1.5">{body}</div>'
        f'{footer}'
        f'</div>'
    )


def news_card_premium(
    title: str,
    source: str,
    summary: str = "",
    relevance: float = 0.5,
    url: str = "",
) -> str:
    """Tarjeta de noticia premium con barra de relevancia coloreada."""
    rel_color = CYAN if relevance > 0.7 else (BLUE if relevance >= 0.4 else MUTED)
    rel_pct = int(round(relevance * 100))
    href_attr = f'href="{url}" target="_blank"' if url else ""
    title_tag_open = f'<a {href_attr} style="text-decoration:none">' if url else "<span>"
    title_tag_close = "</a>" if url else "</span>"
    summary_html = (
        f'<div style="font-size:.72rem;color:{TEXT2};line-height:1.45;margin-top:.3rem">{summary}</div>'
        if summary else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.9rem 1.1rem;margin-bottom:.5rem">'
        f'<div style="font-size:.58rem;font-weight:700;color:{MUTED};letter-spacing:.1em;'
        f'text-transform:uppercase;margin-bottom:.3rem">{source}</div>'
        f'{title_tag_open}'
        f'<div style="font-size:.85rem;font-weight:600;color:{TEXT};line-height:1.35">{title}</div>'
        f'{title_tag_close}'
        f'{summary_html}'
        f'<div style="margin-top:.6rem">'
        f'<div style="height:3px;background:{BORDER};border-radius:2px">'
        f'<div style="height:3px;width:{rel_pct}%;background:{rel_color};border-radius:2px"></div>'
        f'</div>'
        f'<div style="font-size:.58rem;color:{rel_color};margin-top:.2rem">Relevancia {rel_pct}%</div>'
        f'</div>'
        f'</div>'
    )


def kpi_metric(
    label: str,
    value: str,
    delta: str = "",
    delta_positive: bool = True,
    subtitle: str = "",
) -> str:
    """Tarjeta KPI limpia con delta opcional y subtitulo."""
    delta_color = GREEN if delta_positive else RED
    arrow = "&#9650;" if delta_positive else "&#9660;"
    delta_html = (
        f'<div style="display:flex;align-items:center;gap:.35rem;margin-top:.35rem">'
        f'<span style="font-size:.75rem;font-weight:600;color:{delta_color}">{arrow} {delta}</span>'
        f'</div>'
        if delta else ""
    )
    subtitle_html = (
        f'<div style="font-size:.62rem;color:{TEXT2};margin-top:.2rem">{subtitle}</div>'
        if subtitle else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-top:2px solid {CYAN}55;'
        f'border-radius:10px;padding:.9rem 1rem">'
        f'<div style="font-size:.58rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;'
        f'color:{MUTED};margin-bottom:.3rem">{label}</div>'
        f'<div style="font-size:1.55rem;font-weight:900;color:{CYAN};'
        f"font-family:'JetBrains Mono',monospace;line-height:1.1\">{value}</div>"
        f'{delta_html}'
        f'{subtitle_html}'
        f'</div>'
    )


def section_divider(title: str, subtitle: str = "") -> str:
    """Divisor de seccion con punto cyan y linea horizontal."""
    subtitle_html = (
        f'<span style="color:{MUTED};font-size:.6rem;margin-left:.5rem">{subtitle}</span>'
        if subtitle else ""
    )
    return (
        f'<div style="display:flex;align-items:center;gap:.6rem;margin:1.2rem 0 .8rem">'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'<div style="width:6px;height:6px;border-radius:50%;background:{CYAN};flex-shrink:0"></div>'
        f'<span style="font-size:.6rem;font-weight:800;color:{TEXT};letter-spacing:.14em;'
        f'text-transform:uppercase;white-space:nowrap">{title}</span>'
        f'{subtitle_html}'
        f'<div style="flex:1;height:1px;background:{BORDER}"></div>'
        f'</div>'
    )


def module_access_card(
    title: str,
    description: str,
    badge: str = "",
    page_link: str = "",
) -> str:
    """Tarjeta compacta de acceso a modulo con badge opcional."""
    badge_html = (
        f'<span style="background:{CYAN}22;color:{CYAN};font-size:.58rem;font-weight:700;'
        f'padding:.15rem .5rem;border-radius:20px;letter-spacing:.06em;white-space:nowrap">{badge}</span>'
        if badge else ""
    )
    link_note = (
        f'<div style="font-size:.58rem;color:{MUTED};margin-top:.3rem">{page_link}</div>'
        if page_link else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.8rem 1rem;margin-bottom:.4rem">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        f'<span style="font-size:.85rem;font-weight:700;color:{TEXT}">{title}</span>'
        f'{badge_html}'
        f'</div>'
        f'<div style="font-size:.75rem;color:{TEXT2};margin-top:.25rem;line-height:1.4">{description}</div>'
        f'{link_note}'
        f'</div>'
    )


def narrative_card(
    frame_label: str,
    velocity: str,
    recommended_action: str,
    article_count: int = 0,
    emotion: str = "",
) -> str:
    """Tarjeta de narrativa con velocidad, accion recomendada y conteo de articulos."""
    vel_color, vel_icon = _VELOCITY_MAP.get(velocity.lower(), (MUTED, "&#8212;"))
    articles_html = (
        f'<span style="background:{BG3};color:{TEXT2};font-size:.6rem;font-weight:600;'
        f'padding:.15rem .5rem;border-radius:20px;border:1px solid {BORDER}">{article_count} arts.</span>'
        if article_count > 0 else ""
    )
    emotion_html = (
        f'<span style="font-size:.6rem;color:{MUTED};margin-left:.4rem">{emotion}</span>'
        if emotion else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.9rem 1.1rem;margin-bottom:.5rem">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.4rem">'
        f'<span style="font-size:.85rem;font-weight:700;color:{TEXT}">{frame_label}</span>'
        f'<div style="display:flex;align-items:center;gap:.4rem">'
        f'{articles_html}'
        f'<span style="background:{vel_color}22;color:{vel_color};font-size:.65rem;font-weight:700;'
        f'padding:.15rem .5rem;border-radius:4px">{vel_icon}</span>'
        f'</div>'
        f'</div>'
        f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.45">{recommended_action}</div>'
        f'{emotion_html}'
        f'</div>'
    )


def risk_signal_card(
    title: str,
    probability: float,
    impact: str,
    description: str,
) -> str:
    """Tarjeta de senal de riesgo con barra de probabilidad e impacto."""
    prob_clamped = max(0.0, min(1.0, probability))
    prob_pct = int(round(prob_clamped * 100))
    # Interpolacion de color: baja probabilidad MUTED, alta probabilidad RED
    if prob_clamped < 0.33:
        bar_color = MUTED
    elif prob_clamped < 0.66:
        bar_color = AMBER
    else:
        bar_color = RED
    impact_color = _IMPACT_COLORS.get(impact.lower(), MUTED)
    impact_label = impact.upper()
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.9rem 1.1rem;margin-bottom:.5rem">'
        f'<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.5rem">'
        f'<span style="font-size:.85rem;font-weight:700;color:{TEXT};flex:1;padding-right:.5rem">{title}</span>'
        f'<span style="background:{impact_color}22;color:{impact_color};font-size:.58rem;font-weight:700;'
        f'padding:.15rem .45rem;border-radius:4px;letter-spacing:.08em;white-space:nowrap">{impact_label}</span>'
        f'</div>'
        f'<div style="font-size:.75rem;color:{TEXT2};line-height:1.4;margin-bottom:.55rem">{description}</div>'
        f'<div style="font-size:.58rem;color:{MUTED};margin-bottom:.25rem">Probabilidad {prob_pct}%</div>'
        f'<div style="height:4px;background:{BORDER};border-radius:2px">'
        f'<div style="height:4px;width:{prob_pct}%;background:{bar_color};border-radius:2px;transition:width .4s ease"></div>'
        f'</div>'
        f'</div>'
    )


def team_member_row(
    name: str,
    email: str,
    role: str,
    last_active: str = "",
    is_active: bool = True,
) -> str:
    """Fila de miembro del equipo con avatar de iniciales, nombre, email, rol y actividad."""
    role_lower = role.lower()
    role_colors = {
        "owner": CYAN,
        "admin": PURPLE,
        "editor": BLUE,
        "viewer": MUTED,
    }
    role_color = role_colors.get(role_lower, MUTED)
    initials = "".join(p[0].upper() for p in name.split()[:2]) if name else "?"
    active_badge = (
        f'<span style="width:7px;height:7px;border-radius:50%;background:{GREEN};'
        f'display:inline-block;margin-right:.35rem"></span>'
        if is_active else
        f'<span style="width:7px;height:7px;border-radius:50%;background:{MUTED};'
        f'display:inline-block;margin-right:.35rem"></span>'
    )
    last_active_html = (
        f'<div style="font-size:.6rem;color:{MUTED}">{last_active}</div>'
        if last_active else ""
    )
    return (
        f'<div style="background:{BG2};border:1px solid {BORDER};border-radius:8px;'
        f'padding:.75rem 1rem;display:flex;align-items:center;gap:.9rem;margin-bottom:.35rem">'
        f'<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,{CYAN}33,{BLUE}33);'
        f'border:2px solid {CYAN}44;display:flex;align-items:center;justify-content:center;'
        f'font-size:.75rem;font-weight:700;color:{CYAN};flex-shrink:0">{initials}</div>'
        f'<div style="flex:1;min-width:0">'
        f'<div style="font-size:.82rem;font-weight:600;color:{TEXT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
        f'{active_badge}{name}</div>'
        f'<div style="font-size:.65rem;color:{MUTED};margin-top:.1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{email}</div>'
        f'{last_active_html}'
        f'</div>'
        f'<span style="background:{role_color}22;color:{role_color};font-size:.6rem;font-weight:700;'
        f'padding:.2rem .55rem;border-radius:20px;letter-spacing:.06em;white-space:nowrap;flex-shrink:0">'
        f'{role.upper()}</span>'
        f'</div>'
    )


def page_header(title: str, subtitle: str = "", tag: str = "") -> str:
    """Cabecera de pagina completa con tag, titulo y subtitulo."""
    tag_html = (
        f'<div style="font-size:.6rem;font-weight:800;color:{CYAN};letter-spacing:.16em;'
        f'text-transform:uppercase;margin-bottom:.4rem">{tag}</div>'
        if tag else ""
    )
    subtitle_html = (
        f'<div style="font-size:.9rem;color:{TEXT2};margin-top:.3rem;line-height:1.5">{subtitle}</div>'
        if subtitle else ""
    )
    return (
        f'<div style="background:linear-gradient(135deg,{BG2} 0%,{BG3} 100%);'
        f'border:1px solid {BORDER};border-bottom:2px solid {CYAN}44;border-radius:10px;'
        f'padding:1.2rem 1.6rem 1rem;margin-bottom:1.2rem">'
        f'{tag_html}'
        f'<h1 style="margin:0;font-size:1.6rem;font-weight:800;color:{TEXT};letter-spacing:-.02em;line-height:1.15">'
        f'{title}</h1>'
        f'{subtitle_html}'
        f'<div style="height:1px;background:linear-gradient(90deg,{CYAN}44,{BLUE}22,transparent);margin-top:.8rem"></div>'
        f'</div>'
    )


def empty_state(title: str, message: str, icon_char: str = "-") -> str:
    """Estado vacio centrado con icono textual, titulo y mensaje."""
    return (
        f'<div style="text-align:center;padding:3rem 1.5rem;background:{BG2};'
        f'border:1px solid {BORDER};border-radius:10px;margin:1rem 0">'
        f'<div style="font-size:2rem;color:{MUTED};margin-bottom:.8rem;line-height:1">{icon_char}</div>'
        f'<div style="font-size:1rem;font-weight:700;color:{TEXT};margin-bottom:.4rem">{title}</div>'
        f'<div style="font-size:.8rem;color:{TEXT2};max-width:360px;margin:0 auto;line-height:1.5">{message}</div>'
        f'</div>'
    )
