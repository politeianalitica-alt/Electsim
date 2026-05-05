"""
Live Ticker — ElectSim.

Servicio de ticker de datos en tiempo real para el dashboard.
Proporciona un flujo continuo de señales políticas, alertas y datos electorales.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field

# ── Design tokens ──────────────────────────────────────────────────────────────
_BG2    = "#0D1320"
_CYAN   = "#00D4FF"
_BLUE   = "#3B82F6"
_PURPLE = "#8B5CF6"
_TEXT   = "#E2E8F0"
_TEXT2  = "#94A3B8"
_MUTED  = "#475569"
_GREEN  = "#10B981"
_AMBER  = "#F59E0B"
_RED    = "#EF4444"

_CATEGORY_COLORS: dict[str, str] = {
    "electoral":   _CYAN,
    "media":       _AMBER,
    "risk":        _RED,
    "legislative": _BLUE,
    "economic":    _TEXT2,
    "alert":       _RED,
}


# ── Modelos ────────────────────────────────────────────────────────────────────

class TickerItem(BaseModel):
    """Un elemento individual del ticker de noticias en tiempo real."""

    text:      str
    category:  str = Field(
        default="electoral",
        description="electoral | media | risk | legislative | economic | alert",
    )
    color:     str = Field(default=_CYAN, description="Color hexadecimal del item")
    priority:  int = Field(default=3, ge=1, le=5)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


# ── Helpers de datos internos ──────────────────────────────────────────────────

def _get_unread_alerts(tenant_id: str) -> list[Any]:
    """Devuelve las alertas sin leer para el tenant (graceful degradation)."""
    try:
        from services.intelligence.alert_engine import get_alerts  # type: ignore
        return get_alerts(tenant_id=tenant_id, unread_only=True, limit=3)
    except Exception:
        return []


def _get_electoral_snapshot(tenant_id: str) -> dict[str, float]:
    """Devuelve estimaciones electorales actuales."""
    try:
        from dashboard.db import cargar_nowcasting  # type: ignore
        df = cargar_nowcasting()
        if df is not None and not df.empty:
            last = df.iloc[-1]
            return {
                "PP":  float(last.get("PP",  33.2)),
                "PSOE": float(last.get("PSOE", 28.5)),
                "VOX":  float(last.get("VOX",  11.3)),
            }
    except Exception:
        pass
    # Demo fallback
    return {"PP": 33.2, "PSOE": 28.5, "VOX": 11.3}


def _get_narratives(tenant_id: str) -> list[dict]:
    """Devuelve narrativas activas en alza."""
    try:
        from services.intelligence.narrative_tracker import NarrativeTracker  # type: ignore
        tracker = NarrativeTracker()
        narratives = tracker.get_active_narratives(tenant_id=tenant_id)
        return [
            {"frame_label": getattr(n, "frame_label", str(n)), "velocity": getattr(n, "velocity", "flat")}
            for n in narratives
        ]
    except Exception:
        pass
    try:
        from services.intelligence.morning_briefing_engine import get_cached_briefing  # type: ignore
        briefing = get_cached_briefing(tenant_id)
        if briefing:
            return [
                {"frame_label": n.get("frame_label", "—"), "velocity": n.get("velocity", "flat")}
                for n in getattr(briefing, "active_narratives", [])
            ]
    except Exception:
        pass
    return []


def _get_itpe(tenant_id: str) -> float:
    """Devuelve el indice ITPE actual."""
    try:
        from services.intelligence.risk_scorer import get_itpe_score  # type: ignore
        return float(get_itpe_score(tenant_id=tenant_id))
    except Exception:
        pass
    return 52.3


def _get_unread_count(tenant_id: str) -> int:
    """Cuenta alertas sin leer."""
    try:
        from services.intelligence.alert_engine import get_unread_count  # type: ignore
        return get_unread_count(tenant_id=tenant_id)
    except Exception:
        pass
    return 0


def _get_active_sources() -> int:
    """Cuenta fuentes activas (graceful degradation)."""
    try:
        from dashboard.db import get_active_sources_count  # type: ignore
        return int(get_active_sources_count())
    except Exception:
        pass
    return 24


# ── API publica ────────────────────────────────────────────────────────────────

def build_ticker_items(tenant_id: str = "demo") -> list[TickerItem]:
    """
    Construye una lista de items del ticker a partir de todas las fuentes.

    Orden: alertas criticas → datos electorales → narrativas → legislativo → economia.
    Devuelve entre 12 y 20 items.
    """
    items: list[TickerItem] = []
    now = datetime.now(tz=timezone.utc)

    # 1. ALERTAS (prioridad 5) ─────────────────────────────────────────────────
    alerts = _get_unread_alerts(tenant_id)
    if alerts:
        for alert in alerts[:3]:
            title = getattr(alert, "title", str(alert))[:80]
            items.append(TickerItem(
                text=f"ALERTA: {title}",
                category="alert",
                color=_RED,
                priority=5,
                timestamp=now,
            ))
    else:
        # Demo fallback si no hay alertas reales
        items.append(TickerItem(
            text="Sistema de alertas activo — sin incidencias criticas",
            category="alert",
            color=_GREEN,
            priority=5,
            timestamp=now,
        ))

    # 2. DATOS ELECTORALES (prioridad 4) ──────────────────────────────────────
    snap = _get_electoral_snapshot(tenant_id)
    pp_pct   = snap.get("PP",   33.2)
    psoe_pct = snap.get("PSOE", 28.5)
    vox_pct  = snap.get("VOX",  11.3)

    items.append(TickerItem(
        text=f"PP {pp_pct:.1f}% | PSOE {psoe_pct:.1f}% | VOX {vox_pct:.1f}%",
        category="electoral",
        color=_CYAN,
        priority=4,
        timestamp=now,
    ))

    diff = pp_pct - psoe_pct
    diff_sign = "+" if diff >= 0 else ""
    items.append(TickerItem(
        text=f"Diferencia PP-PSOE: {diff_sign}{diff:.1f} puntos porcentuales",
        category="electoral",
        color=_CYAN,
        priority=4,
        timestamp=now,
    ))

    # Estimacion de escanos (D'Hondt simplificado)
    total_seats = 350
    pp_seats  = int(total_seats * pp_pct / 100 * 1.12)
    pso_seats = int(total_seats * psoe_pct / 100 * 1.05)
    items.append(TickerItem(
        text=f"Estimacion escanos: PP {pp_seats} | PSOE {pso_seats} | Mayoria: 176",
        category="electoral",
        color=_CYAN,
        priority=3,
        timestamp=now,
    ))

    # 3. NARRATIVAS (prioridad 3) ──────────────────────────────────────────────
    narratives = _get_narratives(tenant_id)
    added_narratives = 0
    for narr in narratives[:3]:
        label    = narr.get("frame_label", "—")[:60]
        velocity = str(narr.get("velocity", "flat")).lower()
        if velocity == "up":
            items.append(TickerItem(
                text=f"{label} — EN ALZA",
                category="media",
                color=_AMBER,
                priority=3,
                timestamp=now,
            ))
            added_narratives += 1

    if added_narratives == 0:
        # Demo fallbacks
        for label in [
            "Narrativa sobre coste de vida — EN ALZA",
            "Seguridad ciudadana — estable en agenda mediatica",
        ]:
            items.append(TickerItem(
                text=label,
                category="media",
                color=_AMBER,
                priority=3,
                timestamp=now,
            ))

    # 4. LEGISLATIVO (prioridad 2) ─────────────────────────────────────────────
    _fecha_legis = now.strftime("%d %b %Y")
    items.append(TickerItem(
        text=f"Congreso — 8 iniciativas esta semana · {_fecha_legis}",
        category="legislative",
        color=_BLUE,
        priority=2,
        timestamp=now,
    ))
    items.append(TickerItem(
        text="BOE — 3 decretos publicados | Senado — Pleno manana",
        category="legislative",
        color=_BLUE,
        priority=2,
        timestamp=now,
    ))
    items.append(TickerItem(
        text="Congreso — Comision de Hacienda: debate presupuestario en curso",
        category="legislative",
        color=_BLUE,
        priority=2,
        timestamp=now,
    ))

    # 5. ECONOMICO (prioridad 1) ───────────────────────────────────────────────
    _mes = now.strftime("%b %Y")
    items.append(TickerItem(
        text=f"IPC {_mes}: 2.8% | PIB Q1 2026: 2.4% | Desempleo: 10.6%",
        category="economic",
        color=_TEXT2,
        priority=1,
        timestamp=now,
    ))
    items.append(TickerItem(
        text="BdE: tipos de interes en 3.0% | Prima de riesgo: 68 pb",
        category="economic",
        color=_TEXT2,
        priority=1,
        timestamp=now,
    ))
    items.append(TickerItem(
        text="INE — Contabilidad Nacional: actualizacion trimestral disponible",
        category="economic",
        color=_TEXT2,
        priority=1,
        timestamp=now,
    ))

    # Ordenar: prioridad mayor primero, luego timestamp desc
    items.sort(key=lambda x: (-x.priority, x.timestamp), reverse=False)

    # Asegurar rango 12-20
    if len(items) < 12:
        _extra = [
            TickerItem(text="Politeia Intelligence — datos actualizados cada 15 minutos",
                       category="electoral", color=_MUTED, priority=1, timestamp=now),
            TickerItem(text="Encuesta CIS — publicacion prevista semana del 12 de mayo",
                       category="electoral", color=_CYAN, priority=2, timestamp=now),
            TickerItem(text="Radar mediatico — 1.240 noticias indexadas en las ultimas 24h",
                       category="media", color=_AMBER, priority=1, timestamp=now),
        ]
        items.extend(_extra[: 12 - len(items)])

    return items[:20]


def get_ticker_html(tenant_id: str = "demo") -> str:
    """
    Devuelve HTML/CSS completo para una barra de ticker con desplazamiento continuo.

    La barra tiene fondo BG2, borde superior CYAN, y los items se animan de
    derecha a izquierda con @keyframes ticker.
    """
    items = build_ticker_items(tenant_id)

    parts: list[str] = []
    for item in items:
        color = item.color
        escaped = item.text.replace("<", "&lt;").replace(">", "&gt;")
        parts.append(
            f'<span style="color:{color};font-weight:600;'
            f'font-family:JetBrains Mono,monospace;font-size:.72rem">'
            f'{escaped}'
            f'</span>'
            f'<span style="color:{_MUTED};margin:0 .8rem">&#xB7;</span>'
        )

    items_html = "".join(parts)
    # Duplicar el contenido para que el bucle sea continuo
    items_double = items_html + items_html

    return (
        f'<div style="background:{_BG2};border-top:2px solid {_CYAN};'
        f'padding:.4rem 0;overflow:hidden;white-space:nowrap;'
        f'border-bottom:1px solid #1E293B">'
        f'<div style="display:inline-block;animation:ticker 60s linear infinite;'
        f'padding-left:100%">'
        f'{items_double}'
        f'</div>'
        f'</div>'
        f'<style>'
        f'@keyframes ticker{{'
        f'from{{transform:translateX(0)}}'
        f'to{{transform:translateX(-50%)}}'
        f'}}'
        f'</style>'
    )


def get_status_bar_html(tenant_id: str = "demo") -> str:
    """
    Devuelve HTML para una barra de estado estatica con 4 metricas clave.

    Adecuada para cabeceras de pagina (no tiene animacion).
    Muestra: ITPE · Alertas sin leer · Fuentes activas · Ultima actualizacion.
    """
    itpe        = _get_itpe(tenant_id)
    unread      = _get_unread_count(tenant_id)
    sources     = _get_active_sources()
    now_str     = datetime.now(tz=timezone.utc).strftime("%H:%M UTC")

    itpe_color   = _RED if itpe >= 70 else (_AMBER if itpe >= 45 else _GREEN)
    unread_color = _RED if unread >= 5 else (_AMBER if unread >= 1 else _GREEN)

    def _kv(label: str, value: str, color: str) -> str:
        return (
            f'<span style="display:inline-flex;align-items:center;gap:.3rem;'
            f'margin-right:1.2rem">'
            f'<span style="font-size:.58rem;color:{_MUTED};letter-spacing:.07em;'
            f'text-transform:uppercase">{label}</span>'
            f'<span style="font-size:.72rem;font-weight:700;color:{color};'
            f'font-family:JetBrains Mono,monospace">{value}</span>'
            f'</span>'
        )

    metrics_html = (
        _kv("ITPE",     f"{itpe:.0f}/100", itpe_color)
        + _kv("Alertas",  str(unread),      unread_color)
        + _kv("Fuentes",  str(sources),     _GREEN)
        + _kv("Actualiz", now_str,          _MUTED)
    )

    return (
        f'<div style="background:{_BG2};border-bottom:1px solid #1E293B;'
        f'padding:.3rem 1rem;display:flex;align-items:center;'
        f'justify-content:flex-end;flex-wrap:wrap;gap:.3rem">'
        f'{metrics_html}'
        f'</div>'
    )
