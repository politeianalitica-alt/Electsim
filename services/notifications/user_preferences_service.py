"""
User Preferences Service — ElectSim.

Gestion de preferencias persistentes de usuario: alertas, dashboard, notificaciones.
"""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


class DashboardLayout(str, Enum):
    default = "default"
    compact = "compact"
    expanded = "expanded"
    minimal = "minimal"


class AlertThreshold(str, Enum):
    all = "all"
    medium_and_above = "medium_and_above"
    high_and_above = "high_and_above"
    critical_only = "critical_only"


class BriefingFrequency(str, Enum):
    daily = "daily"
    twice_daily = "twice_daily"
    weekly = "weekly"
    never = "never"


class UserPreferences(BaseModel):
    user_id: str
    dashboard_layout: DashboardLayout = DashboardLayout.default
    alert_threshold: AlertThreshold = AlertThreshold.medium_and_above
    briefing_frequency: BriefingFrequency = BriefingFrequency.daily
    preferred_workspace_id: str = "ws_espana_2026"
    tracked_actors: list[str] = Field(default_factory=list)
    tracked_parties: list[str] = Field(
        default_factory=lambda: ["PP", "PSOE", "VOX", "SUMAR"]
    )
    tracked_territories: list[str] = Field(default_factory=lambda: ["Nacional"])
    notification_email: bool = True
    notification_slack: bool = False
    slack_channel: str = ""
    language: str = "es"
    timezone: str = "Europe/Madrid"
    show_demo_data: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))


# Storage keyed by user_id
_PREFERENCES: dict[str, UserPreferences] = {}

# Ordered list of module IDs
_DEFAULT_MODULE_ORDER: list[str] = [
    "briefings",
    "alertas",
    "actores",
    "medios",
    "legislativo",
    "coalicion",
    "geopolitica",
    "comunicacion",
    "workspace",
    "brain",
]

# Mapping from AlertThreshold to numeric level (used for comparisons)
_THRESHOLD_LEVELS: dict[AlertThreshold, int] = {
    AlertThreshold.all: 0,
    AlertThreshold.medium_and_above: 1,
    AlertThreshold.high_and_above: 2,
    AlertThreshold.critical_only: 3,
}

_ALERT_LEVEL_VALUES: dict[str, int] = {
    "low": 0,
    "medium": 1,
    "high": 2,
    "critical": 3,
}


def get_preferences(user_id: str) -> UserPreferences:
    """Devuelve las preferencias del usuario. Crea las predeterminadas si no existen."""
    if user_id not in _PREFERENCES:
        _PREFERENCES[user_id] = UserPreferences(user_id=user_id)
    return _PREFERENCES[user_id]


def update_preferences(user_id: str, updates: dict) -> UserPreferences:
    """Actualiza parcialmente las preferencias del usuario (merge)."""
    prefs = get_preferences(user_id)
    current_data = prefs.model_dump()
    current_data.update(updates)
    current_data["updated_at"] = datetime.now(tz=timezone.utc)
    updated = UserPreferences(**current_data)
    _PREFERENCES[user_id] = updated
    return updated


def add_tracked_actor(user_id: str, actor_id: str) -> bool:
    """Anade un actor al seguimiento del usuario. Devuelve True si se anado."""
    prefs = get_preferences(user_id)
    if actor_id in prefs.tracked_actors:
        return False
    prefs.tracked_actors.append(actor_id)
    prefs.updated_at = datetime.now(tz=timezone.utc)
    return True


def remove_tracked_actor(user_id: str, actor_id: str) -> bool:
    """Elimina un actor del seguimiento del usuario. Devuelve True si se elimino."""
    prefs = get_preferences(user_id)
    if actor_id not in prefs.tracked_actors:
        return False
    prefs.tracked_actors.remove(actor_id)
    prefs.updated_at = datetime.now(tz=timezone.utc)
    return True


def add_tracked_party(user_id: str, party: str) -> bool:
    """Anade un partido al seguimiento del usuario. Devuelve True si se anado."""
    prefs = get_preferences(user_id)
    if party in prefs.tracked_parties:
        return False
    prefs.tracked_parties.append(party)
    prefs.updated_at = datetime.now(tz=timezone.utc)
    return True


def should_show_alert(user_id: str, alert_level: str) -> bool:
    """Comprueba si se debe mostrar una alerta segun el umbral configurado."""
    prefs = get_preferences(user_id)
    threshold = prefs.alert_threshold
    threshold_value = _THRESHOLD_LEVELS.get(threshold, 0)
    alert_value = _ALERT_LEVEL_VALUES.get(alert_level.lower(), 0)
    return alert_value >= threshold_value


def reset_to_defaults(user_id: str) -> UserPreferences:
    """Restablece las preferencias del usuario a los valores predeterminados."""
    default_prefs = UserPreferences(user_id=user_id)
    _PREFERENCES[user_id] = default_prefs
    return default_prefs


def get_personalized_module_order(user_id: str) -> list[str]:
    """Devuelve la lista de modulos en el orden preferido del usuario."""
    # Currently returns the default order; future versions may reorder based on usage patterns
    return list(_DEFAULT_MODULE_ORDER)
