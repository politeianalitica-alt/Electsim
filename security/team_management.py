"""
Team Management — ElectSim.

Gestión de equipos, roles de proyecto y acceso por workspace.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ── Enumeraciones ──────────────────────────────────────────────────────────────

class TeamRole(str, Enum):
    owner = "owner"
    admin = "admin"
    editor = "editor"
    viewer = "viewer"


# ── Modelos Pydantic v2 ────────────────────────────────────────────────────────

class TeamMember(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    user_id: str
    user_email: str
    user_name: str
    team_role: TeamRole
    workspace_id: str
    tenant_id: str
    joined_at: datetime
    last_active: Optional[datetime] = None
    invited_by: Optional[str] = None
    is_active: bool = True


class Team(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    name: str
    tenant_id: str
    workspace_id: str
    created_at: datetime
    members: list[TeamMember] = []
    description: str = ""


# ── Store en memoria ───────────────────────────────────────────────────────────

_TEAMS: dict[str, Team] = {}


def _team_key(workspace_id: str, tenant_id: str) -> str:
    return f"{tenant_id}::{workspace_id}"


# ── Inicialización demo ────────────────────────────────────────────────────────

def _init_demo_team() -> None:
    """Crea el equipo de demostración al cargar el módulo."""
    now = datetime.now(timezone.utc)
    workspace_id = "ws_espana_2026"
    tenant_id = "demo"
    team_id = "team_espana_2026"

    members = [
        TeamMember(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, "admin@politeia.es")),
            user_id="user_admin_001",
            user_email="admin@politeia.es",
            user_name="Administrador Politeia",
            team_role=TeamRole.owner,
            workspace_id=workspace_id,
            tenant_id=tenant_id,
            joined_at=now,
            last_active=now,
            invited_by=None,
            is_active=True,
        ),
        TeamMember(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, "analyst@politeia.es")),
            user_id="user_analyst_002",
            user_email="analyst@politeia.es",
            user_name="Analista Electoral",
            team_role=TeamRole.editor,
            workspace_id=workspace_id,
            tenant_id=tenant_id,
            joined_at=now,
            last_active=now,
            invited_by="admin@politeia.es",
            is_active=True,
        ),
        TeamMember(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, "cliente@politeia.es")),
            user_id="user_cliente_003",
            user_email="cliente@politeia.es",
            user_name="Cliente Demo",
            team_role=TeamRole.viewer,
            workspace_id=workspace_id,
            tenant_id=tenant_id,
            joined_at=now,
            last_active=None,
            invited_by="admin@politeia.es",
            is_active=True,
        ),
    ]

    team = Team(
        id=team_id,
        name="Equipo Espana 2026",
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        created_at=now,
        members=members,
        description="Equipo principal de analisis electoral para Espana 2026",
    )

    key = _team_key(workspace_id, tenant_id)
    _TEAMS[key] = team


_init_demo_team()


# ── Funciones de acceso ────────────────────────────────────────────────────────

def get_team(workspace_id: str, tenant_id: str) -> Team | None:
    """Retorna el equipo para un workspace y tenant dados, o None si no existe."""
    return _TEAMS.get(_team_key(workspace_id, tenant_id))


def list_team_members(workspace_id: str, tenant_id: str) -> list[TeamMember]:
    """Lista los miembros activos del equipo."""
    team = get_team(workspace_id, tenant_id)
    if team is None:
        return []
    return [m for m in team.members if m.is_active]


def add_member(
    workspace_id: str,
    tenant_id: str,
    user_email: str,
    user_name: str,
    role: TeamRole,
    invited_by: str,
) -> TeamMember:
    """Agrega un nuevo miembro al equipo. Crea el equipo si no existe."""
    key = _team_key(workspace_id, tenant_id)
    if key not in _TEAMS:
        now = datetime.now(timezone.utc)
        _TEAMS[key] = Team(
            id=str(uuid.uuid4()),
            name=f"Equipo {workspace_id}",
            tenant_id=tenant_id,
            workspace_id=workspace_id,
            created_at=now,
            members=[],
        )

    team = _TEAMS[key]
    new_member = TeamMember(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid5(uuid.NAMESPACE_DNS, user_email)),
        user_email=user_email,
        user_name=user_name,
        team_role=role,
        workspace_id=workspace_id,
        tenant_id=tenant_id,
        joined_at=datetime.now(timezone.utc),
        last_active=None,
        invited_by=invited_by,
        is_active=True,
    )
    team.members.append(new_member)
    return new_member


def remove_member(workspace_id: str, tenant_id: str, user_id: str) -> bool:
    """Desactiva un miembro del equipo. Retorna True si se encontro y desactivo."""
    team = get_team(workspace_id, tenant_id)
    if team is None:
        return False
    for member in team.members:
        if member.user_id == user_id:
            # Usamos model_copy para mantener inmutabilidad de Pydantic
            idx = team.members.index(member)
            team.members[idx] = member.model_copy(update={"is_active": False})
            return True
    return False


def update_member_role(
    workspace_id: str,
    tenant_id: str,
    user_id: str,
    new_role: TeamRole,
) -> bool:
    """Actualiza el rol de un miembro. Retorna True si se actualizo correctamente."""
    team = get_team(workspace_id, tenant_id)
    if team is None:
        return False
    for member in team.members:
        if member.user_id == user_id and member.is_active:
            idx = team.members.index(member)
            team.members[idx] = member.model_copy(update={"team_role": new_role})
            return True
    return False


def get_workspace_activity_summary(workspace_id: str, tenant_id: str) -> dict:
    """Retorna un resumen de actividad del workspace."""
    members = list_team_members(workspace_id, tenant_id)
    now = datetime.now(timezone.utc)

    active_last_7 = 0
    role_breakdown: dict[str, int] = {}
    last_activity_dt: datetime | None = None

    for m in members:
        role_str = m.team_role if isinstance(m.team_role, str) else m.team_role.value
        role_breakdown[role_str] = role_breakdown.get(role_str, 0) + 1

        if m.last_active is not None:
            delta = now - m.last_active
            if delta.days < 7:
                active_last_7 += 1
            if last_activity_dt is None or m.last_active > last_activity_dt:
                last_activity_dt = m.last_active

    last_activity_str = (
        last_activity_dt.strftime("%d/%m/%Y %H:%M")
        if last_activity_dt is not None
        else "Sin actividad registrada"
    )

    return {
        "total_members": len(members),
        "active_last_7_days": active_last_7,
        "role_breakdown": role_breakdown,
        "last_activity": last_activity_str,
    }


def can_user_edit(user_email: str, workspace_id: str, tenant_id: str) -> bool:
    """Comprueba si el usuario tiene permisos de edicion (owner, admin o editor)."""
    members = list_team_members(workspace_id, tenant_id)
    edit_roles = {TeamRole.owner, TeamRole.admin, TeamRole.editor,
                  "owner", "admin", "editor"}
    for m in members:
        if m.user_email == user_email and m.team_role in edit_roles:
            return True
    return False
