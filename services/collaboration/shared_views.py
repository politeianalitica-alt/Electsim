"""Vistas compartidas: configuraciones de dashboard guardadas y compartibles."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SharedView(BaseModel):
    """Configuración de una vista de dashboard guardada."""

    model_config = ConfigDict()

    id: str
    tenant_id: str
    workspace_id: str
    name: str
    description: str = ""
    page: str
    filters: dict[str, Any] = Field(default_factory=dict)
    layout_overrides: dict[str, Any] = Field(default_factory=dict)
    saved_by: str
    saved_at: datetime
    updated_at: datetime | None = None
    shared_with: list[str] = Field(default_factory=list)
    pinned: bool = False
    tags: list[str] = Field(default_factory=list)


# clave: tenant_id -> list[SharedView]
_SHARED_VIEWS: dict[str, list[SharedView]] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def save_view(
    tenant_id: str,
    workspace_id: str,
    name: str,
    page: str,
    filters: dict[str, Any],
    saved_by: str,
    description: str = "",
    shared_with: list[str] | None = None,
) -> SharedView:
    view = SharedView(
        id=_gen_id(),
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        name=name,
        description=description,
        page=page,
        filters=dict(filters),
        saved_by=saved_by,
        saved_at=_now(),
        shared_with=list(shared_with or []),
    )
    _SHARED_VIEWS.setdefault(tenant_id, []).append(view)
    return view


def get_view(view_id: str) -> SharedView | None:
    for bucket in _SHARED_VIEWS.values():
        for v in bucket:
            if v.id == view_id:
                return v
    return None


def list_views(
    tenant_id: str,
    page: str | None = None,
    user_id: str | None = None,
) -> list[SharedView]:
    out = list(_SHARED_VIEWS.get(tenant_id, []))
    if page is not None:
        out = [v for v in out if v.page == page]
    if user_id is not None:
        out = [
            v
            for v in out
            if v.saved_by == user_id
            or user_id in v.shared_with
            or "team:*" in v.shared_with
        ]
    out.sort(key=lambda v: (not v.pinned, -v.saved_at.timestamp()))
    return out


def pin_view(view_id: str, user_id: str) -> bool:
    view = get_view(view_id)
    if view is None:
        return False
    view.pinned = not view.pinned
    view.updated_at = _now()
    return True


def delete_view(view_id: str) -> bool:
    for tenant_id, bucket in list(_SHARED_VIEWS.items()):
        for i, v in enumerate(bucket):
            if v.id == view_id:
                bucket.pop(i)
                if not bucket:
                    _SHARED_VIEWS.pop(tenant_id, None)
                return True
    return False


def _demo_views() -> None:
    """Carga 5 vistas de demostración."""

    if _SHARED_VIEWS.get("demo"):
        return

    seeds = [
        {
            "name": "Alertas críticas hoy",
            "page": "D6_Alertas",
            "filters": {"severity": ["critical", "high"], "rango": "24h"},
            "saved_by": "ana_perez",
            "description": "Vista por defecto para guardia de mañana.",
            "shared_with": ["team:*"],
            "tags": ["guardia", "diario"],
            "pinned": True,
        },
        {
            "name": "Actores opositores Madrid",
            "page": "D2_Actores",
            "filters": {"comunidad": "Madrid", "alineacion": "opositor"},
            "saved_by": "luis_g",
            "description": "Seguimiento de portavoces opositores.",
            "shared_with": ["ana_perez", "marta_s"],
            "tags": ["actores", "madrid"],
        },
        {
            "name": "Narrativas emergentes 7d",
            "page": "D9_Communication",
            "filters": {"rango": "7d", "estado": "emergente"},
            "saved_by": "marta_s",
            "description": "Detección temprana de narrativas.",
            "shared_with": ["team:*"],
            "tags": ["narrativas"],
        },
        {
            "name": "Mi briefing matinal",
            "page": "N0_Inicio",
            "filters": {"layout": "compact"},
            "saved_by": "ana_perez",
            "description": "Layout personalizado.",
            "shared_with": [],
            "tags": ["personal"],
            "pinned": True,
        },
        {
            "name": "Workspace electoral 2027",
            "page": "D10_Workspace",
            "filters": {"campaign": "generales_2027"},
            "saved_by": "luis_g",
            "description": "Sala virtual del comité electoral.",
            "shared_with": ["team:*"],
            "tags": ["electoral", "2027"],
        },
    ]

    for s in seeds:
        view = save_view(
            tenant_id="demo",
            workspace_id="default",
            name=s["name"],
            page=s["page"],
            filters=s["filters"],
            saved_by=s["saved_by"],
            description=s["description"],
            shared_with=s["shared_with"],
        )
        view.tags = list(s["tags"])
        view.pinned = bool(s.get("pinned", False))


_demo_views()
