"""
Notification Service — ElectSim.

Sistema de notificaciones en plataforma: alertas, recordatorios, actualizaciones del sistema.
Las notificaciones son ligeras (no alertas de inteligencia) — avisos de producto y equipo.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    alert_escalated = "alert_escalated"
    team_mention = "team_mention"
    workspace_update = "workspace_update"
    briefing_ready = "briefing_ready"
    data_sync = "data_sync"
    system = "system"
    reminder = "reminder"
    report_ready = "report_ready"


class NotificationPriority(str, Enum):
    urgent = "urgent"
    normal = "normal"
    low = "low"


class Notification(BaseModel):
    id: str
    user_id: str
    notification_type: NotificationType
    priority: NotificationPriority = NotificationPriority.normal
    title: str
    body: str = ""
    created_at: datetime
    read_at: datetime | None = None
    action_url: str = ""
    action_label: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


# Storage keyed by user_id
_NOTIFICATIONS: dict[str, list[Notification]] = {}


def send_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    body: str = "",
    priority: NotificationPriority = NotificationPriority.normal,
    action_url: str = "",
    action_label: str = "",
    metadata: dict[str, Any] | None = None,
) -> Notification:
    """Crea y almacena una nueva notificacion para el usuario."""
    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        notification_type=notification_type,
        priority=priority,
        title=title,
        body=body,
        created_at=datetime.now(tz=timezone.utc),
        read_at=None,
        action_url=action_url,
        action_label=action_label,
        metadata=metadata or {},
    )
    if user_id not in _NOTIFICATIONS:
        _NOTIFICATIONS[user_id] = []
    _NOTIFICATIONS[user_id].append(notification)
    return notification


def get_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = 20,
) -> list[Notification]:
    """Devuelve notificaciones del usuario, ordenadas de mas reciente a mas antigua."""
    _init_demo_notifications(user_id)
    notifications = _NOTIFICATIONS.get(user_id, [])
    if unread_only:
        notifications = [n for n in notifications if n.read_at is None]
    notifications = sorted(notifications, key=lambda n: n.created_at, reverse=True)
    return notifications[:limit]


def mark_notification_read(user_id: str, notification_id: str) -> bool:
    """Marca una notificacion como leida. Devuelve True si se encontro."""
    for notification in _NOTIFICATIONS.get(user_id, []):
        if notification.id == notification_id:
            if notification.read_at is None:
                notification.read_at = datetime.now(tz=timezone.utc)
            return True
    return False


def mark_all_notifications_read(user_id: str) -> int:
    """Marca todas las notificaciones del usuario como leidas. Devuelve el numero marcado."""
    count = 0
    now = datetime.now(tz=timezone.utc)
    for notification in _NOTIFICATIONS.get(user_id, []):
        if notification.read_at is None:
            notification.read_at = now
            count += 1
    return count


def get_unread_count(user_id: str) -> int:
    """Devuelve el numero de notificaciones no leidas."""
    _init_demo_notifications(user_id)
    return sum(1 for n in _NOTIFICATIONS.get(user_id, []) if n.read_at is None)


def send_briefing_ready_notification(
    user_id: str,
    workspace_name: str,
    date: str,
) -> Notification:
    """Notifica que el briefing matinal esta disponible."""
    return send_notification(
        user_id=user_id,
        notification_type=NotificationType.briefing_ready,
        title="Briefing matinal listo",
        body=f"El briefing de inteligencia de {workspace_name} para {date} esta disponible.",
        priority=NotificationPriority.normal,
        action_url="pages/N0_Inicio.py",
        action_label="Ver briefing",
    )


def send_alert_escalation_notification(
    user_id: str,
    alert_title: str,
    escalated_by: str,
) -> Notification:
    """Notifica que una alerta ha sido escalada al usuario."""
    return send_notification(
        user_id=user_id,
        notification_type=NotificationType.alert_escalated,
        title=f"Alerta escalada: {alert_title}",
        body=f"{escalated_by} ha escalado esta alerta para tu atencion.",
        priority=NotificationPriority.urgent,
        metadata={"alert_title": alert_title, "escalated_by": escalated_by},
    )


def send_team_mention_notification(
    user_id: str,
    mentioned_by: str,
    context: str,
) -> Notification:
    """Notifica que el usuario ha sido mencionado por un companero."""
    return send_notification(
        user_id=user_id,
        notification_type=NotificationType.team_mention,
        title=f"{mentioned_by} te ha mencionado",
        body=context,
        priority=NotificationPriority.normal,
        metadata={"mentioned_by": mentioned_by},
    )


def _init_demo_notifications(user_id: str) -> None:
    """Crea 5 notificaciones de demo para el usuario si no tiene ninguna. Llamado de forma lazy."""
    if user_id in _NOTIFICATIONS and len(_NOTIFICATIONS[user_id]) > 0:
        return
    _NOTIFICATIONS[user_id] = []
    now = datetime.now(tz=timezone.utc)

    demo: list[tuple[NotificationType, NotificationPriority, str, str, int]] = [
        (
            NotificationType.briefing_ready,
            NotificationPriority.normal,
            "Briefing matinal listo",
            "El briefing de inteligencia de Espana 2026 para hoy esta disponible.",
            0,
        ),
        (
            NotificationType.alert_escalated,
            NotificationPriority.urgent,
            "Alerta escalada: Tension parlamentaria",
            "Se ha detectado un cambio critico en el equilibrio de fuerzas del Congreso.",
            30,
        ),
        (
            NotificationType.data_sync,
            NotificationPriority.low,
            "Sincronizacion de datos completada",
            "Los datos del INE y el BOE han sido actualizados correctamente.",
            60,
        ),
        (
            NotificationType.team_mention,
            NotificationPriority.normal,
            "Ana Gomez te ha mencionado",
            "Ana te ha mencionado en el analisis de la coalicion de gobierno.",
            90,
        ),
        (
            NotificationType.system,
            NotificationPriority.low,
            "Mantenimiento programado",
            "El sistema estara en mantenimiento el proximo sabado de 02:00 a 04:00.",
            120,
        ),
    ]

    for n_type, priority, title, body, minutes_ago in demo:
        n = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            notification_type=n_type,
            priority=priority,
            title=title,
            body=body,
            created_at=now - timedelta(minutes=minutes_ago),
            read_at=None,
            action_url="",
            action_label="",
            metadata={"demo": True},
        )
        _NOTIFICATIONS[user_id].append(n)


def clear_old_notifications(user_id: str, older_than_days: int = 7) -> int:
    """Elimina notificaciones mas antiguas de N dias. Devuelve el numero eliminado."""
    if user_id not in _NOTIFICATIONS:
        return 0
    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=older_than_days)
    original = _NOTIFICATIONS[user_id]
    kept = [n for n in original if n.created_at >= cutoff]
    removed = len(original) - len(kept)
    _NOTIFICATIONS[user_id] = kept
    return removed
