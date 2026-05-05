"""Notification bell widget — ElectSim sidebar."""
from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import streamlit as st

from services.notifications.notification_service import (
    NotificationPriority,
    NotificationType,
    get_notifications,
    mark_all_notifications_read,
)

_TYPE_LABELS: dict[NotificationType, tuple[str, str]] = {
    NotificationType.alert_escalated: ("Alerta", "#e74c3c"),
    NotificationType.team_mention: ("Mencion", "#3498db"),
    NotificationType.workspace_update: ("Workspace", "#9b59b6"),
    NotificationType.briefing_ready: ("Briefing", "#27ae60"),
    NotificationType.data_sync: ("Datos", "#1abc9c"),
    NotificationType.system: ("Sistema", "#95a5a6"),
    NotificationType.reminder: ("Recordatorio", "#f39c12"),
    NotificationType.report_ready: ("Informe", "#2980b9"),
}

_PRIORITY_ICONS: dict[NotificationPriority, str] = {
    NotificationPriority.urgent: "[!]",
    NotificationPriority.normal: "",
    NotificationPriority.low: "",
}


def _time_ago(dt: datetime) -> str:
    """Devuelve una cadena legible con el tiempo transcurrido desde dt."""
    now = datetime.now(tz=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    total_seconds = int(diff.total_seconds())
    if total_seconds < 60:
        return "ahora mismo"
    if total_seconds < 3600:
        minutes = total_seconds // 60
        return f"hace {minutes} min"
    if total_seconds < 86400:
        hours = total_seconds // 3600
        return f"hace {hours} h"
    days = total_seconds // 86400
    return f"hace {days} d"


def get_notification_badge_html(count: int) -> str:
    """Devuelve HTML para la pildora de conteo de notificaciones."""
    if count == 0:
        return ""
    return (
        f'<span style="'
        f"background-color:#e74c3c;"
        f"color:#ffffff;"
        f"border-radius:12px;"
        f"padding:2px 8px;"
        f"font-size:12px;"
        f"font-weight:bold;"
        f"margin-left:6px;"
        f'">{count}</span>'
    )


def render_notification_bell(user_id: str) -> None:
    """Renderiza el widget de notificaciones en el sidebar de Streamlit."""
    from services.notifications.notification_service import get_unread_count

    unread_count = get_unread_count(user_id)
    badge_html = get_notification_badge_html(unread_count)

    header_html = (
        f'<div style="display:flex;align-items:center;margin-bottom:8px;">'
        f'<span style="font-weight:600;font-size:14px;">Notificaciones</span>'
        f"{badge_html}"
        f"</div>"
    )
    st.sidebar.markdown(header_html, unsafe_allow_html=True)

    notifications = get_notifications(user_id, unread_only=False, limit=5)

    if not notifications:
        st.sidebar.markdown(
            '<p style="color:#888;font-size:12px;font-style:italic;">Sin notificaciones nuevas</p>',
            unsafe_allow_html=True,
        )
        return

    for n in notifications:
        label, color = _TYPE_LABELS.get(n.notification_type, ("Aviso", "#7f8c8d"))
        is_unread = n.read_at is None
        body_preview = n.body[:50] + ("..." if len(n.body) > 50 else "")
        ago = _time_ago(n.created_at)
        bg_color = "#1a1a2e" if is_unread else "transparent"
        border = "border-left:3px solid #e74c3c;" if n.priority == NotificationPriority.urgent else ""

        card_html = (
            f'<div style="'
            f"background:{bg_color};"
            f"{border}"
            f"padding:6px 8px;"
            f"margin-bottom:6px;"
            f"border-radius:4px;"
            f'">'
            f'<div style="display:flex;justify-content:space-between;align-items:center;">'
            f'<span style="'
            f"background:{color};"
            f"color:#fff;"
            f"border-radius:3px;"
            f"padding:1px 5px;"
            f"font-size:10px;"
            f"font-weight:600;"
            f'">{label}</span>'
            f'<span style="color:#888;font-size:10px;">{ago}</span>'
            f"</div>"
            f'<p style="margin:3px 0 0;font-size:12px;font-weight:{"600" if is_unread else "400"};">'
            f"{n.title}"
            f"</p>"
            f'<p style="margin:2px 0 0;color:#aaa;font-size:11px;">{body_preview}</p>'
            f"</div>"
        )
        st.sidebar.markdown(card_html, unsafe_allow_html=True)

    if unread_count > 0:
        if st.sidebar.button("Marcar todas como leidas", key="mark_all_read_btn"):
            mark_all_notifications_read(user_id)
            st.rerun()
