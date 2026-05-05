"""Tests para security.team_management — 12 casos."""
from __future__ import annotations

import pytest
from datetime import datetime, timezone

from security.team_management import (
    TeamRole,
    TeamMember,
    Team,
    get_team,
    list_team_members,
    add_member,
    remove_member,
    update_member_role,
    get_workspace_activity_summary,
    can_user_edit,
    _TEAMS,
    _team_key,
)

WORKSPACE_ID = "ws_espana_2026"
TENANT_ID = "demo"


def test_demo_team_created():
    """El equipo de demo debe existir al importar el modulo."""
    team = get_team(WORKSPACE_ID, TENANT_ID)
    assert team is not None
    assert team.workspace_id == WORKSPACE_ID
    assert team.tenant_id == TENANT_ID


def test_list_team_members_returns_list():
    """list_team_members debe retornar una lista."""
    members = list_team_members(WORKSPACE_ID, TENANT_ID)
    assert isinstance(members, list)
    assert len(members) > 0


def test_get_team_for_demo_workspace():
    """get_team debe retornar el equipo demo correctamente."""
    team = get_team(WORKSPACE_ID, TENANT_ID)
    assert team is not None
    assert isinstance(team, Team)
    assert team.name == "Equipo Espana 2026"


def test_add_member():
    """add_member debe agregar un nuevo miembro al equipo."""
    ws = "ws_test_add"
    tenant = "demo"
    member = add_member(
        workspace_id=ws,
        tenant_id=tenant,
        user_email="nuevo@test.es",
        user_name="Nuevo Usuario",
        role=TeamRole.editor,
        invited_by="admin@politeia.es",
    )
    assert member.user_email == "nuevo@test.es"
    assert member.user_name == "Nuevo Usuario"
    role_val = member.team_role if isinstance(member.team_role, str) else member.team_role.value
    assert role_val == "editor"
    assert member.is_active is True


def test_remove_member():
    """remove_member debe desactivar un miembro existente."""
    ws = "ws_test_remove"
    tenant = "demo"
    member = add_member(
        workspace_id=ws,
        tenant_id=tenant,
        user_email="para_eliminar@test.es",
        user_name="Usuario Eliminar",
        role=TeamRole.viewer,
        invited_by="admin@politeia.es",
    )
    result = remove_member(ws, tenant, member.user_id)
    assert result is True
    # El miembro desactivado no aparece en list_team_members
    active_members = list_team_members(ws, tenant)
    active_ids = [m.user_id for m in active_members]
    assert member.user_id not in active_ids


def test_update_member_role():
    """update_member_role debe cambiar el rol de un miembro."""
    ws = "ws_test_role"
    tenant = "demo"
    member = add_member(
        workspace_id=ws,
        tenant_id=tenant,
        user_email="cambio_rol@test.es",
        user_name="Usuario Rol",
        role=TeamRole.viewer,
        invited_by="admin@politeia.es",
    )
    result = update_member_role(ws, tenant, member.user_id, TeamRole.editor)
    assert result is True
    members = list_team_members(ws, tenant)
    updated = next((m for m in members if m.user_id == member.user_id), None)
    assert updated is not None
    role_val = updated.team_role if isinstance(updated.team_role, str) else updated.team_role.value
    assert role_val == "editor"


def test_can_user_edit_owner():
    """El usuario con rol owner debe poder editar."""
    result = can_user_edit("admin@politeia.es", WORKSPACE_ID, TENANT_ID)
    assert result is True


def test_can_user_edit_viewer_false():
    """El usuario con rol viewer no debe poder editar."""
    result = can_user_edit("cliente@politeia.es", WORKSPACE_ID, TENANT_ID)
    assert result is False


def test_activity_summary_structure():
    """get_workspace_activity_summary debe retornar la estructura esperada."""
    summary = get_workspace_activity_summary(WORKSPACE_ID, TENANT_ID)
    assert isinstance(summary, dict)
    assert "total_members" in summary
    assert "active_last_7_days" in summary
    assert "role_breakdown" in summary
    assert "last_activity" in summary
    assert isinstance(summary["role_breakdown"], dict)
    assert isinstance(summary["total_members"], int)


def test_team_member_model_valid():
    """TeamMember debe instanciarse correctamente con Pydantic v2."""
    now = datetime.now(timezone.utc)
    member = TeamMember(
        id="test-id-001",
        user_id="uid-001",
        user_email="test@politeia.es",
        user_name="Test User",
        team_role=TeamRole.admin,
        workspace_id="ws_test",
        tenant_id="demo",
        joined_at=now,
    )
    assert member.user_email == "test@politeia.es"
    assert member.is_active is True
    assert member.last_active is None
    assert member.invited_by is None


def test_team_role_values():
    """TeamRole debe contener los cuatro roles esperados."""
    roles = {r.value for r in TeamRole}
    assert roles == {"owner", "admin", "editor", "viewer"}


def test_add_member_increments_count():
    """Agregar un miembro debe incrementar el total en el resumen."""
    ws = "ws_test_count"
    tenant = "demo"
    summary_before = get_workspace_activity_summary(ws, tenant)
    count_before = summary_before["total_members"]
    add_member(
        workspace_id=ws,
        tenant_id=tenant,
        user_email="extra@test.es",
        user_name="Extra User",
        role=TeamRole.viewer,
        invited_by="admin@politeia.es",
    )
    summary_after = get_workspace_activity_summary(ws, tenant)
    assert summary_after["total_members"] == count_before + 1
