"""
Tests del sistema de perfiles de usuario — ElectSim.

Cubre autenticacion, permisos, roles y operaciones CRUD del store en memoria.
"""
from __future__ import annotations

import os

# DEV_MODE debe estar activo antes de importar los modulos
os.environ["DEV_MODE"] = "true"
os.environ["ELECTSIM_DEV_MODE"] = "true"

import importlib
from datetime import datetime

import pytest


# ── Fixture de importacion limpia ─────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reload_profiles_module():
    """Recarga el modulo para evitar estado compartido entre tests."""
    import security.user_profiles as mod
    importlib.reload(mod)
    yield mod


@pytest.fixture
def mod():
    import security.user_profiles as m
    return m


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_default_profiles_exist(mod):
    """Deben existir exactamente 4 perfiles demo al inicializar el store."""
    profiles = list(mod._PROFILE_STORE.values())
    assert len(profiles) == 4
    emails = {p.email for p in profiles}
    assert "admin@politeia.es" in emails
    assert "analyst@politeia.es" in emails
    assert "junior@politeia.es" in emails
    assert "cliente@politeia.es" in emails


def test_authenticate_demo_user(mod):
    """El usuario admin debe autenticarse con cualquier contrasena en dev mode."""
    profile = mod.authenticate_user("admin@politeia.es", "cualquier_contrasena_123")
    assert profile is not None
    assert profile.email == "admin@politeia.es"
    assert profile.role == mod.UserRole.admin


def test_authenticate_unknown_user_returns_none(mod):
    """Un email inexistente debe devolver None."""
    result = mod.authenticate_user("noexiste@dominio.com", "pass123")
    assert result is None


def test_get_user_profile_by_id(mod):
    """get_user_profile debe devolver el perfil correcto dado un ID valido."""
    profile = mod.authenticate_user("analyst@politeia.es", "x")
    assert profile is not None
    retrieved = mod.get_user_profile(profile.id)
    assert retrieved is not None
    assert retrieved.email == "analyst@politeia.es"


def test_update_preferences_merges(mod):
    """update_preferences debe combinar preferencias sin borrar las existentes."""
    profile = mod.authenticate_user("admin@politeia.es", "x")
    assert profile is not None

    # Primera actualización
    ok1 = mod.update_preferences(profile.id, {"tema": "oscuro", "idioma": "es"})
    assert ok1 is True

    # Segunda actualización — solo cambia un campo
    ok2 = mod.update_preferences(profile.id, {"idioma": "ca"})
    assert ok2 is True

    updated = mod.get_user_profile(profile.id)
    assert updated is not None
    assert updated.preferences["tema"] == "oscuro"
    assert updated.preferences["idioma"] == "ca"


def test_list_users_for_tenant(mod):
    """list_users_for_tenant debe devolver todos los usuarios del tenant demo."""
    users = mod.list_users_for_tenant("demo")
    assert len(users) == 4
    tenant_ids = {u.tenant_id for u in users}
    assert tenant_ids == {"demo"}


def test_get_role_display_name(mod):
    """Los nombres de rol en español deben ser correctos."""
    assert mod.get_role_display_name(mod.UserRole.admin) == "Administrador"
    assert mod.get_role_display_name(mod.UserRole.senior_analyst) == "Analista Senior"
    assert mod.get_role_display_name(mod.UserRole.analyst) == "Analista"
    assert mod.get_role_display_name(mod.UserRole.junior) == "Analista Junior"
    assert mod.get_role_display_name(mod.UserRole.client) == "Cliente"
    assert mod.get_role_display_name(mod.UserRole.viewer) == "Observador"


def test_get_role_permissions_admin_has_all(mod):
    """El rol admin debe tener todos los permisos disponibles."""
    admin_perms = mod.get_role_permissions(mod.UserRole.admin)
    assert "electoral:read" in admin_perms
    assert "admin:write" in admin_perms
    assert "simulation:run" in admin_perms
    assert "crm:write" in admin_perms
    # Al menos tantos permisos como cualquier otro rol
    for role in mod.UserRole:
        other_perms = mod.get_role_permissions(role)
        assert set(other_perms).issubset(set(admin_perms)), (
            f"Admin no incluye permiso de {role}: {set(other_perms) - set(admin_perms)}"
        )


def test_get_role_permissions_client_limited(mod):
    """El rol cliente solo debe tener permisos de lectura restringidos."""
    client_perms = mod.get_role_permissions(mod.UserRole.client)
    assert "electoral:read" in client_perms
    assert "media:read" in client_perms
    assert "documents:read" in client_perms
    # No debe tener permisos de escritura ni administracion
    assert "admin:write" not in client_perms
    assert "crm:write" not in client_perms
    assert "simulation:run" not in client_perms


def test_avatar_initials_computed(mod):
    """Las iniciales deben calcularse correctamente del nombre completo."""
    profile = mod.authenticate_user("admin@politeia.es", "x")
    assert profile is not None
    assert profile.full_name == "Antonio Legaz"
    assert profile.avatar_initials == "AL"


def test_user_profile_is_active_default(mod):
    """Todos los perfiles demo deben estar activos por defecto."""
    for profile in mod._PROFILE_STORE.values():
        assert profile.is_active is True


def test_role_enum_values(mod):
    """Todos los valores del enum UserRole deben existir con los nombres correctos."""
    expected = {"admin", "senior_analyst", "analyst", "junior", "client", "viewer"}
    actual = {r.value for r in mod.UserRole}
    assert actual == expected


def test_session_key_constant(mod):
    """SESSION_KEY debe ser la cadena correcta para el estado de sesion."""
    assert mod.SESSION_KEY == "politeia_user_profile"


def test_viewer_has_limited_permissions(mod):
    """El viewer solo debe poder leer datos electorales."""
    viewer_perms = mod.get_role_permissions(mod.UserRole.viewer)
    assert viewer_perms == ["electoral:read"]
    assert len(viewer_perms) == 1


def test_update_last_login(mod):
    """update_last_login debe registrar la hora actual en el perfil."""
    profile = mod.authenticate_user("junior@politeia.es", "x")
    assert profile is not None
    assert profile.last_login is None  # recien inicializado, sin login previo

    before = datetime.utcnow()
    mod.update_last_login(profile.id)
    after = datetime.utcnow()

    updated = mod.get_user_profile(profile.id)
    assert updated is not None
    assert updated.last_login is not None
    assert before <= updated.last_login <= after
