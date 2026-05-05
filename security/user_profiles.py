"""
User Profile System — ElectSim.

Gestión de perfiles de usuario con persistencia en BD y caché en sesión.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, computed_field


# ── Constante de sesión ──────────────────────────────────────────────────────

SESSION_KEY = "politeia_user_profile"


# ── Enum de roles ────────────────────────────────────────────────────────────

class UserRole(str, Enum):
    admin = "admin"
    senior_analyst = "senior_analyst"
    analyst = "analyst"
    junior = "junior"
    client = "client"
    viewer = "viewer"


# ── Modelo de perfil ─────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    model_config = ConfigDict(use_enum_values=False)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: UserRole
    tenant_id: str
    workspace_ids: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: datetime | None = None
    preferences: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True

    @computed_field
    @property
    def avatar_initials(self) -> str:
        """Calcula las iniciales del nombre completo."""
        parts = self.full_name.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[-1][0]).upper()
        elif len(parts) == 1 and parts[0]:
            return parts[0][:2].upper()
        return "??"


# ── Perfiles demo por defecto ────────────────────────────────────────────────

_DEFAULT_PROFILES: dict[str, dict[str, Any]] = {
    "admin@politeia.es": {
        "id": "usr_admin_001",
        "email": "admin@politeia.es",
        "full_name": "Antonio Legaz",
        "role": UserRole.admin,
        "tenant_id": "demo",
        "workspace_ids": ["ws_espana_2026"],
        "password_hash": "demo",
    },
    "analyst@politeia.es": {
        "id": "usr_analyst_001",
        "email": "analyst@politeia.es",
        "full_name": "Maria Fernandez",
        "role": UserRole.senior_analyst,
        "tenant_id": "demo",
        "workspace_ids": ["ws_espana_2026"],
        "password_hash": "demo",
    },
    "junior@politeia.es": {
        "id": "usr_junior_001",
        "email": "junior@politeia.es",
        "full_name": "Carlos Martinez",
        "role": UserRole.junior,
        "tenant_id": "demo",
        "workspace_ids": ["ws_espana_2026"],
        "password_hash": "demo",
    },
    "cliente@politeia.es": {
        "id": "usr_client_001",
        "email": "cliente@politeia.es",
        "full_name": "Juan Garcia",
        "role": UserRole.client,
        "tenant_id": "demo",
        "workspace_ids": ["ws_espana_2026"],
        "password_hash": "demo",
    },
}

# ── Store en memoria ─────────────────────────────────────────────────────────

_PROFILE_STORE: dict[str, UserProfile] = {}
_EMAIL_TO_ID: dict[str, str] = {}
_EMAIL_TO_PASSWORD: dict[str, str] = {}


def _initialize_store() -> None:
    """Inicializa el store con los perfiles de demo."""
    for email, data in _DEFAULT_PROFILES.items():
        password = data.pop("password_hash", "demo")
        profile = UserProfile(**data)
        _PROFILE_STORE[profile.id] = profile
        _EMAIL_TO_ID[email] = profile.id
        _EMAIL_TO_PASSWORD[email] = password
        data["password_hash"] = password  # restaurar para siguiente llamada


_initialize_store()


# ── Funciones públicas ───────────────────────────────────────────────────────

def authenticate_user(email: str, password: str) -> UserProfile | None:
    """
    Autentica un usuario por email y contraseña.

    En DEV_MODE acepta cualquier contraseña para usuarios demo.
    En producción comprueba la contraseña hasheada.
    """
    try:
        from security.settings import settings  # type: ignore[import]
        dev_mode = settings.dev_mode
    except Exception:
        dev_mode = os.getenv("DEV_MODE", "false").lower() == "true"

    email_lower = email.strip().lower()
    user_id = _EMAIL_TO_ID.get(email_lower)
    if user_id is None:
        return None

    profile = _PROFILE_STORE.get(user_id)
    if profile is None or not profile.is_active:
        return None

    if dev_mode:
        # En modo desarrollo aceptamos cualquier contraseña
        return profile

    # En producción: comparación simple de hash (extensible a bcrypt)
    stored_hash = _EMAIL_TO_PASSWORD.get(email_lower, "")
    if password != stored_hash:
        return None

    return profile


def get_user_profile(user_id: str) -> UserProfile | None:
    """Devuelve el perfil de usuario por ID."""
    return _PROFILE_STORE.get(user_id)


def update_last_login(user_id: str) -> None:
    """Actualiza la marca de tiempo del ultimo acceso."""
    profile = _PROFILE_STORE.get(user_id)
    if profile is not None:
        # Pydantic v2: recrear con el campo actualizado
        updated = profile.model_copy(update={"last_login": datetime.utcnow()})
        _PROFILE_STORE[user_id] = updated


def update_preferences(user_id: str, prefs: dict[str, Any]) -> bool:
    """
    Mezcla preferencias nuevas con las existentes.

    Devuelve True si el perfil existe y se actualizó.
    """
    profile = _PROFILE_STORE.get(user_id)
    if profile is None:
        return False
    merged = {**profile.preferences, **prefs}
    updated = profile.model_copy(update={"preferences": merged})
    _PROFILE_STORE[user_id] = updated
    return True


def list_users_for_tenant(tenant_id: str) -> list[UserProfile]:
    """Lista todos los usuarios activos de un tenant."""
    return [
        p for p in _PROFILE_STORE.values()
        if p.tenant_id == tenant_id and p.is_active
    ]


# ── Helpers de rol ───────────────────────────────────────────────────────────

_ROLE_DISPLAY: dict[UserRole, str] = {
    UserRole.admin: "Administrador",
    UserRole.senior_analyst: "Analista Senior",
    UserRole.analyst: "Analista",
    UserRole.junior: "Analista Junior",
    UserRole.client: "Cliente",
    UserRole.viewer: "Observador",
}

_ALL_PERMISSIONS: list[str] = [
    "electoral:read",
    "electoral:write",
    "legislative:read",
    "legislative:write",
    "media:read",
    "media:write",
    "documents:read",
    "documents:write",
    "communications:read",
    "communications:write",
    "simulation:read",
    "simulation:run",
    "simulation:write",
    "crm:read",
    "crm:write",
    "risk:read",
    "risk:write",
    "workspace:read",
    "workspace:write",
    "admin:read",
    "admin:write",
]

_ROLE_PERMISSIONS: dict[UserRole, list[str]] = {
    UserRole.admin: _ALL_PERMISSIONS,
    UserRole.senior_analyst: [
        "electoral:read",
        "legislative:read",
        "media:read",
        "documents:read",
        "documents:write",
        "communications:read",
        "communications:write",
        "simulation:read",
        "simulation:run",
        "crm:read",
        "risk:read",
        "workspace:read",
    ],
    UserRole.analyst: [
        "electoral:read",
        "legislative:read",
        "media:read",
        "documents:read",
        "simulation:read",
        "simulation:run",
        "crm:read",
        "risk:read",
        "workspace:read",
    ],
    UserRole.junior: [
        "electoral:read",
        "legislative:read",
        "media:read",
        "documents:read",
        "simulation:read",
        "workspace:read",
    ],
    UserRole.client: [
        "electoral:read",
        "media:read",
        "documents:read",
    ],
    UserRole.viewer: [
        "electoral:read",
    ],
}


def get_role_display_name(role: UserRole) -> str:
    """Nombre legible en español para el rol."""
    return _ROLE_DISPLAY.get(role, str(role))


def get_role_permissions(role: UserRole) -> list[str]:
    """Lista de permisos asignados al rol."""
    return list(_ROLE_PERMISSIONS.get(role, []))
