"""
Cards — Bloque 12.

Tarjetas reutilizables: metric, signal, entity, document,
scenario, source, alert, territory, narrative.
"""
from __future__ import annotations

from typing import Any

import streamlit as st

from dashboard.ui.tokens import (
    BG2, BG3, BORDER, CYAN, BLUE, PURPLE,
    TEXT, TEXT2, MUTED, GREEN, AMBER, RED,
    get_severity_color, get_status_color,
)
from dashboard.ui.badges import (
    severity_badge, freshness_badge, source_badge,
    status_badge, demo_badge, confidence_badge,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _meta_row(meta: dict[str, Any]) -> str:
    """Genera HTML de metadatos en fila."""
    items = [
        f"<span style='color:{TEXT2};font-size:11px;'>"
        f"<span style='color:{MUTED};'>{k}</span>: {v}</span>"
        for k, v in meta.items() if v is not None
    ]
    return " &nbsp;·&nbsp; ".join(items) if items else ""


def _card_container(inner_html: str, accent: str = CYAN, height: int | None = None) -> None:
    """Contenedor de tarjeta con borde de acento."""
    h = f"min-height:{height}px;" if height else ""
    st.markdown(
        f"""<div style='
            background:{BG2};
            border:1px solid {BORDER};
            border-left:3px solid {accent};
            border-radius:8px;
            padding:14px 16px;
            margin:4px 0;
            {h}
        '>{inner_html}</div>""",
        unsafe_allow_html=True,
    )


# ── metric_card ────────────────────────────────────────────────────────────────

def metric_card(
    label: str,
    value: Any,
    delta: Any = None,
    status: str | None = None,
    subtitle: str | None = None,
    source: str | None = None,
    freshness: str | None = None,
    demo: bool = False,
) -> None:
    """
    Tarjeta de métrica principal.

    Args:
        label: Etiqueta de la métrica.
        value: Valor principal.
        delta: Delta (puede ser numérico o string con signo).
        status: Estado (ok/error/warning/demo).
        subtitle: Subtítulo descriptivo.
        source: Fuente del dato.
        freshness: Nivel de frescura (fresh/stale/demo).
        demo: Si True, añade badge demo.
    """
    accent = get_status_color(status or "info", CYAN)
    value_str = str(value) if value is not None else "—"

    delta_html = ""
    if delta is not None:
        try:
            d = float(str(delta).replace("%", "").replace("+", ""))
            delta_color = GREEN if d >= 0 else RED
            sign = "▲" if d >= 0 else "▼"
            delta_html = (
                f"<span style='color:{delta_color};font-size:12px;margin-left:6px;'>"
                f"{sign} {delta}</span>"
            )
        except ValueError:
            delta_html = f"<span style='color:{MUTED};font-size:12px;'> {delta}</span>"

    subtitle_html = f"<p style='color:{TEXT2};font-size:11px;margin:2px 0 0;'>{subtitle}</p>" if subtitle else ""

    badges = []
    if source:
        badges.append(source_badge(source, inline=True))
    if freshness:
        badges.append(freshness_badge(freshness, inline=True))
    if demo:
        badges.append(demo_badge(inline=True))
    badge_html = " ".join(b for b in badges if b) if badges else ""

    inner = (
        f"<p style='color:{TEXT2};font-size:11px;font-weight:600;letter-spacing:0.5px;"
        f"text-transform:uppercase;margin:0 0 4px;'>{label}</p>"
        f"<p style='color:{TEXT};font-size:24px;font-weight:700;margin:0;'>"
        f"{value_str}{delta_html}</p>"
        f"{subtitle_html}"
        f"<div style='margin-top:6px;'>{badge_html}</div>"
    )
    _card_container(inner, accent=accent)


# ── signal_card ────────────────────────────────────────────────────────────────

def signal_card(
    title: str,
    severity: str,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    source: str | None = None,
    timestamp: str | None = None,
    module: str | None = None,
) -> None:
    """
    Tarjeta de señal/alerta.

    Args:
        title: Título de la señal.
        severity: critical/high/medium/low.
        description: Descripción breve.
        metadata: Dict de metadatos adicionales.
        source: Fuente.
        timestamp: Fecha/hora.
        module: Módulo de origen.
    """
    accent = get_severity_color(severity, AMBER)

    sev_html = severity_badge(severity, inline=True) or ""
    src_html = source_badge(source, inline=True) if source else ""
    meta_html = _meta_row({**(metadata or {}), **({"Módulo": module} if module else {})})

    desc_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:6px 0 4px;'>{description}</p>"
        if description else ""
    )
    ts_html = (
        f"<span style='color:{MUTED};font-size:10px;'>{timestamp}</span>"
        if timestamp else ""
    )

    inner = (
        f"<div style='display:flex;justify-content:space-between;align-items:flex-start;'>"
        f"<p style='color:{TEXT};font-size:14px;font-weight:600;margin:0;'>{title}</p>"
        f"{ts_html}</div>"
        f"{desc_html}"
        f"<div style='margin-top:6px;'>{sev_html} {src_html}</div>"
        f"<div style='margin-top:4px;color:{TEXT2};font-size:11px;'>{meta_html}</div>"
    )
    _card_container(inner, accent=accent)


# ── entity_card ────────────────────────────────────────────────────────────────

def entity_card(
    name: str,
    entity_type: str = "actor",
    risk_score: float | None = None,
    metadata: dict[str, Any] | None = None,
    verified: bool | None = None,
    party: str | None = None,
) -> None:
    """
    Tarjeta de entidad (actor, partido, organización).

    Args:
        name: Nombre de la entidad.
        entity_type: Tipo (actor/partido/organización/territorio).
        risk_score: Puntuación de riesgo (0-1).
        metadata: Metadatos adicionales.
        verified: Si la identidad está verificada.
        party: Partido político (para colorear).
    """
    from dashboard.ui.badges import risk_badge, verified_badge

    if party:
        from dashboard.ui.tokens import get_party_color
        accent = get_party_color(party)
    elif risk_score is not None:
        accent = RED if risk_score > 0.6 else AMBER if risk_score > 0.3 else GREEN
    else:
        accent = BLUE

    type_html = (
        f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;"
        f"letter-spacing:1px;'>{entity_type}</span>"
    )

    badges = []
    if risk_score is not None:
        badges.append(risk_badge(risk_score, inline=True))
    if verified is not None:
        badges.append(verified_badge(verified, inline=True))
    badge_html = " ".join(b for b in badges if b)

    meta_html = _meta_row(metadata or {})

    inner = (
        f"{type_html}"
        f"<p style='color:{TEXT};font-size:15px;font-weight:700;margin:4px 0;'>{name}</p>"
        f"<div style='margin:4px 0;'>{badge_html}</div>"
        f"<div style='color:{TEXT2};font-size:11px;'>{meta_html}</div>"
    )
    _card_container(inner, accent=accent)


# ── document_card ──────────────────────────────────────────────────────────────

def document_card(
    title: str,
    source: str | None = None,
    parse_status: str = "unknown",
    evidence_count: int = 0,
    timestamp: str | None = None,
    doc_type: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Tarjeta de documento procesado."""
    accent = get_status_color(parse_status, BLUE)
    src_html = source_badge(source, inline=True) if source else ""
    status_html = status_badge(parse_status, inline=True) or ""

    ev_html = (
        f"<span style='color:{CYAN};font-size:11px;'>📎 {evidence_count} evidencias</span>"
        if evidence_count > 0 else ""
    )
    ts_html = f"<span style='color:{MUTED};font-size:10px;'>{timestamp}</span>" if timestamp else ""
    type_html = (
        f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;'>{doc_type}</span> "
        if doc_type else ""
    )
    meta_html = _meta_row(metadata or {})

    inner = (
        f"<div style='display:flex;justify-content:space-between;'>"
        f"{type_html}{ts_html}</div>"
        f"<p style='color:{TEXT};font-size:14px;font-weight:600;margin:4px 0;'>{title}</p>"
        f"<div style='margin:4px 0;'>{src_html} {status_html} {ev_html}</div>"
        f"<div style='color:{TEXT2};font-size:11px;'>{meta_html}</div>"
    )
    _card_container(inner, accent=accent)


# ── scenario_card ──────────────────────────────────────────────────────────────

def scenario_card(
    name: str,
    domain: str = "mixed",
    status: str = "draft",
    summary: str | None = None,
    n_assumptions: int | None = None,
    n_interventions: int | None = None,
) -> None:
    """Tarjeta de escenario de simulación."""
    accent = get_status_color(status, PURPLE)
    status_html = status_badge(status, inline=True) or ""

    domain_colors = {
        "electoral": CYAN, "economy": GREEN, "media": AMBER,
        "risk": RED, "campaign": BLUE, "mixed": PURPLE,
    }
    domain_color = domain_colors.get(domain, MUTED)
    domain_html = f"<span style='color:{domain_color};font-size:10px;text-transform:uppercase;'>{domain}</span>"

    stats = []
    if n_assumptions is not None:
        stats.append(f"📋 {n_assumptions} supuestos")
    if n_interventions is not None:
        stats.append(f"⚡ {n_interventions} intervenciones")
    stats_html = (
        f"<p style='color:{TEXT2};font-size:11px;margin:4px 0;'>{' · '.join(stats)}</p>"
        if stats else ""
    )

    summary_html = (
        f"<p style='color:{TEXT2};font-size:12px;margin:4px 0;'>{summary}</p>"
        if summary else ""
    )

    inner = (
        f"<div style='display:flex;justify-content:space-between;align-items:center;'>"
        f"{domain_html}{status_html}</div>"
        f"<p style='color:{TEXT};font-size:14px;font-weight:600;margin:4px 0;'>{name}</p>"
        f"{summary_html}{stats_html}"
    )
    _card_container(inner, accent=accent)


# ── source_card ────────────────────────────────────────────────────────────────

def source_card(
    name: str,
    status: str = "unknown",
    last_updated: str | None = None,
    freshness: str | None = None,
    record_count: int | None = None,
    latency_ms: int | None = None,
) -> None:
    """Tarjeta de fuente de datos."""
    accent = get_status_color(status, MUTED)
    status_html = status_badge(status, inline=True) or ""
    fresh_html = freshness_badge(freshness or status, inline=True) if freshness else ""

    stats = []
    if record_count is not None:
        stats.append(f"📊 {record_count:,} registros")
    if latency_ms is not None:
        stats.append(f"⚡ {latency_ms}ms")
    if last_updated:
        stats.append(f"🕐 {last_updated}")
    stats_html = (
        f"<p style='color:{TEXT2};font-size:11px;margin:4px 0;'>{' · '.join(stats)}</p>"
        if stats else ""
    )

    inner = (
        f"<p style='color:{TEXT};font-size:14px;font-weight:600;margin:0 0 4px;'>{name}</p>"
        f"<div style='margin:4px 0;'>{status_html} {fresh_html}</div>"
        f"{stats_html}"
    )
    _card_container(inner, accent=accent)


# ── alert_card ─────────────────────────────────────────────────────────────────

def alert_card(
    title: str,
    severity: str,
    description: str | None = None,
    source: str | None = None,
    timestamp: str | None = None,
    action_label: str | None = None,
) -> None:
    """Tarjeta de alerta compacta."""
    signal_card(
        title=title,
        severity=severity,
        description=description,
        source=source,
        timestamp=timestamp,
    )
    if action_label:
        st.caption(f"💡 {action_label}")


# ── territory_card ─────────────────────────────────────────────────────────────

def territory_card(
    name: str,
    territory_type: str = "provincia",
    risk_score: float | None = None,
    vote_share: dict[str, float] | None = None,
    signals: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    """Tarjeta de perfil territorial."""
    if risk_score is not None:
        accent = RED if risk_score > 0.6 else AMBER if risk_score > 0.3 else GREEN
    else:
        accent = BLUE

    type_html = f"<span style='color:{MUTED};font-size:10px;text-transform:uppercase;'>{territory_type}</span>"

    risk_html = ""
    if risk_score is not None:
        from dashboard.ui.badges import risk_badge
        risk_html = risk_badge(risk_score, inline=True) or ""

    signals_html = ""
    if signals:
        sig_items = "".join(
            f"<span style='color:{TEXT2};font-size:11px;'>• {s}</span><br>"
            for s in signals[:3]
        )
        signals_html = f"<div style='margin-top:4px;'>{sig_items}</div>"

    meta_html = _meta_row(metadata or {})

    inner = (
        f"{type_html}"
        f"<p style='color:{TEXT};font-size:15px;font-weight:700;margin:4px 0;'>{name}</p>"
        f"<div style='margin:4px 0;'>{risk_html}</div>"
        f"{signals_html}"
        f"<div style='color:{TEXT2};font-size:11px;'>{meta_html}</div>"
    )
    _card_container(inner, accent=accent)


# ── narrative_card ─────────────────────────────────────────────────────────────

def narrative_card(
    label: str,
    volume: float | None = None,
    growth: float | None = None,
    sentiment: float | None = None,
    actors: list[str] | None = None,
    sources: list[str] | None = None,
    territories: list[str] | None = None,
) -> None:
    """Tarjeta de clúster narrativo."""
    if sentiment is not None:
        accent = GREEN if sentiment > 0.1 else RED if sentiment < -0.1 else AMBER
    else:
        accent = BLUE

    stats = []
    if volume is not None:
        stats.append(f"📣 Volumen: {volume:.0f}")
    if growth is not None:
        sign = "+" if growth >= 0 else ""
        color = GREEN if growth >= 0 else RED
        stats.append(
            f"<span style='color:{color};'>↕ {sign}{growth:.1f}%</span>"
        )
    if sentiment is not None:
        sent_color = GREEN if sentiment > 0.1 else RED if sentiment < -0.1 else AMBER
        stats.append(
            f"<span style='color:{sent_color};'>😊 {sentiment:+.2f}</span>"
        )
    stats_html = f"<p style='font-size:12px;margin:4px 0;'>{'&nbsp;·&nbsp;'.join(stats)}</p>" if stats else ""

    actors_html = (
        f"<p style='color:{TEXT2};font-size:11px;margin:2px 0;'>👥 {', '.join(actors[:4])}</p>"
        if actors else ""
    )
    sources_html = (
        f"<p style='color:{TEXT2};font-size:11px;margin:2px 0;'>📰 {', '.join(sources[:3])}</p>"
        if sources else ""
    )

    inner = (
        f"<p style='color:{TEXT};font-size:14px;font-weight:600;margin:0 0 4px;'>{label}</p>"
        f"{stats_html}{actors_html}{sources_html}"
    )
    _card_container(inner, accent=accent)
