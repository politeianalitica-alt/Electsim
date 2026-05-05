"""Tests for notification and user preferences services — ElectSim."""
from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

import pytest

from services.notifications.notification_service import (
    Notification,
    NotificationPriority,
    NotificationType,
    _NOTIFICATIONS,
    clear_old_notifications,
    get_notifications,
    get_unread_count,
    mark_all_notifications_read,
    mark_notification_read,
    send_alert_escalation_notification,
    send_briefing_ready_notification,
    send_notification,
    send_team_mention_notification,
)
from services.notifications.user_preferences_service import (
    AlertThreshold,
    BriefingFrequency,
    DashboardLayout,
    UserPreferences,
    _PREFERENCES,
    add_tracked_actor,
    add_tracked_party,
    get_personalized_module_order,
    get_preferences,
    remove_tracked_actor,
    reset_to_defaults,
    should_show_alert,
    update_preferences,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_user(prefix: str = "test") -> str:
    """Returns a unique user ID and clears any pre-existing state."""
    import uuid
    uid = f"{prefix}_{uuid.uuid4().hex[:8]}"
    _NOTIFICATIONS.pop(uid, None)
    _PREFERENCES.pop(uid, None)
    return uid


# ---------------------------------------------------------------------------
# Notification tests
# ---------------------------------------------------------------------------

def test_send_notification():
    uid = _fresh_user()
    n = send_notification(
        user_id=uid,
        notification_type=NotificationType.system,
        title="Test",
        body="Cuerpo de prueba",
    )
    assert isinstance(n, Notification)
    assert n.user_id == uid
    assert n.title == "Test"
    assert n.body == "Cuerpo de prueba"
    assert n.read_at is None
    assert n.notification_type == NotificationType.system


def test_get_notifications_empty():
    uid = _fresh_user()
    # Force empty storage (skip demo init by directly setting empty list)
    _NOTIFICATIONS[uid] = []
    result = get_notifications(uid, unread_only=False, limit=20)
    # With empty list pre-set, demo init is skipped
    assert isinstance(result, list)


def test_get_notifications_returns_list():
    uid = _fresh_user()
    send_notification(uid, NotificationType.system, "A")
    send_notification(uid, NotificationType.data_sync, "B")
    result = get_notifications(uid, limit=20)
    assert len(result) >= 2
    # newest first
    assert result[0].created_at >= result[1].created_at


def test_mark_notification_read():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    n = send_notification(uid, NotificationType.reminder, "Recordatorio")
    assert n.read_at is None
    result = mark_notification_read(uid, n.id)
    assert result is True
    assert n.read_at is not None


def test_mark_all_read():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    send_notification(uid, NotificationType.system, "S1")
    send_notification(uid, NotificationType.system, "S2")
    count = mark_all_notifications_read(uid)
    assert count == 2
    assert get_unread_count(uid) == 0


def test_get_unread_count():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    send_notification(uid, NotificationType.system, "U1")
    send_notification(uid, NotificationType.system, "U2")
    assert get_unread_count(uid) == 2
    all_notifs = _NOTIFICATIONS[uid]
    all_notifs[0].read_at = datetime.now(tz=timezone.utc)
    assert get_unread_count(uid) == 1


def test_send_briefing_ready():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    n = send_briefing_ready_notification(uid, "Espana 2026", "2026-05-05")
    assert n.notification_type == NotificationType.briefing_ready
    assert "Espana 2026" in n.body
    assert "2026-05-05" in n.body
    assert n.action_url == "pages/N0_Inicio.py"
    assert n.title == "Briefing matinal listo"


def test_send_alert_escalation():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    n = send_alert_escalation_notification(uid, "Tension parlamentaria", "Ana Gomez")
    assert n.notification_type == NotificationType.alert_escalated
    assert n.priority == NotificationPriority.urgent
    assert "Ana Gomez" in n.body
    assert "Tension parlamentaria" in n.title


def test_send_team_mention():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    n = send_team_mention_notification(uid, "Pedro Lopez", "Ver analisis de coalicion")
    assert n.notification_type == NotificationType.team_mention
    assert "Pedro Lopez" in n.title
    assert n.body == "Ver analisis de coalicion"


def test_clear_old_notifications():
    uid = _fresh_user()
    _NOTIFICATIONS[uid] = []
    # Notificacion reciente
    send_notification(uid, NotificationType.system, "Reciente")
    # Notificacion antigua (simulada modificando created_at directamente)
    old_n = send_notification(uid, NotificationType.system, "Antigua")
    old_n.created_at = datetime.now(tz=timezone.utc) - timedelta(days=10)
    removed = clear_old_notifications(uid, older_than_days=7)
    assert removed == 1
    remaining = _NOTIFICATIONS[uid]
    assert all(n.title != "Antigua" for n in remaining)


# ---------------------------------------------------------------------------
# User preferences tests
# ---------------------------------------------------------------------------

def test_get_preferences_default():
    uid = _fresh_user()
    prefs = get_preferences(uid)
    assert isinstance(prefs, UserPreferences)
    assert prefs.user_id == uid
    assert prefs.dashboard_layout == DashboardLayout.default
    assert prefs.alert_threshold == AlertThreshold.medium_and_above
    assert prefs.briefing_frequency == BriefingFrequency.daily
    assert prefs.tracked_parties == ["PP", "PSOE", "VOX", "SUMAR"]
    assert prefs.tracked_territories == ["Nacional"]
    assert prefs.language == "es"
    assert prefs.timezone == "Europe/Madrid"


def test_update_preferences_partial():
    uid = _fresh_user()
    get_preferences(uid)
    updated = update_preferences(uid, {"language": "en", "show_demo_data": False})
    assert updated.language == "en"
    assert updated.show_demo_data is False
    # Other fields untouched
    assert updated.timezone == "Europe/Madrid"


def test_add_tracked_actor():
    uid = _fresh_user()
    result = add_tracked_actor(uid, "actor_pedro_sanchez")
    assert result is True
    prefs = get_preferences(uid)
    assert "actor_pedro_sanchez" in prefs.tracked_actors
    # Duplicate returns False
    result2 = add_tracked_actor(uid, "actor_pedro_sanchez")
    assert result2 is False


def test_remove_tracked_actor():
    uid = _fresh_user()
    add_tracked_actor(uid, "actor_alberto_nunez")
    result = remove_tracked_actor(uid, "actor_alberto_nunez")
    assert result is True
    prefs = get_preferences(uid)
    assert "actor_alberto_nunez" not in prefs.tracked_actors
    # Non-existent returns False
    result2 = remove_tracked_actor(uid, "actor_inexistente")
    assert result2 is False


def test_add_tracked_party():
    uid = _fresh_user()
    result = add_tracked_party(uid, "JUNTS")
    assert result is True
    prefs = get_preferences(uid)
    assert "JUNTS" in prefs.tracked_parties
    # Duplicate
    result2 = add_tracked_party(uid, "JUNTS")
    assert result2 is False


def test_should_show_alert_critical_only():
    uid = _fresh_user()
    update_preferences(uid, {"alert_threshold": AlertThreshold.critical_only})
    assert should_show_alert(uid, "critical") is True
    assert should_show_alert(uid, "high") is False
    assert should_show_alert(uid, "medium") is False
    assert should_show_alert(uid, "low") is False


def test_should_show_alert_all():
    uid = _fresh_user()
    update_preferences(uid, {"alert_threshold": AlertThreshold.all})
    assert should_show_alert(uid, "low") is True
    assert should_show_alert(uid, "medium") is True
    assert should_show_alert(uid, "high") is True
    assert should_show_alert(uid, "critical") is True


def test_reset_to_defaults():
    uid = _fresh_user()
    update_preferences(uid, {"language": "en", "timezone": "UTC"})
    prefs_after_update = get_preferences(uid)
    assert prefs_after_update.language == "en"
    reset_prefs = reset_to_defaults(uid)
    assert reset_prefs.language == "es"
    assert reset_prefs.timezone == "Europe/Madrid"


def test_get_personalized_module_order():
    uid = _fresh_user()
    order = get_personalized_module_order(uid)
    assert isinstance(order, list)
    assert len(order) == 10
    assert order[0] == "briefings"
    assert "alertas" in order
    assert "brain" in order


def test_notification_model_valid():
    n = Notification(
        id="test-id-123",
        user_id="u1",
        notification_type=NotificationType.report_ready,
        priority=NotificationPriority.urgent,
        title="Informe listo",
        body="El informe mensual esta disponible.",
        created_at=datetime.now(tz=timezone.utc),
        read_at=None,
        action_url="/reports/123",
        action_label="Ver informe",
        metadata={"report_id": "123"},
    )
    assert n.id == "test-id-123"
    assert n.notification_type == NotificationType.report_ready
    assert n.priority == NotificationPriority.urgent
    assert n.metadata["report_id"] == "123"
    assert n.read_at is None
