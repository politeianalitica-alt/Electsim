"""Router /api/v1/investigations · workspace investigation-centric (Pilar 2).

Una Investigation es el contenedor de trabajo del analista. Reemplaza el
modelo previo "12 secciones planas del workspace" por un caso de trabajo
que agrupa entidades fijadas + evidencias + hipótesis + notebook + canvas
+ briefings + audit trail.

Endpoints:

  GET    /api/v1/investigations               → lista para el owner actual
  POST   /api/v1/investigations               → crear caso
  GET    /api/v1/investigations/{id}          → detalle hidratado
  GET    /api/v1/investigations/by-slug/{s}   → por slug humano
  PATCH  /api/v1/investigations/{id}          → update
  POST   /api/v1/investigations/{id}/archive  → archivar

  POST   /api/v1/investigations/{id}/pin       → fijar entidad (body: {entity_id, note?, position?})
  DELETE /api/v1/investigations/{id}/pin/{eid} → unpin

  POST   /api/v1/investigations/{id}/artifacts → añadir notebook_block / hypothesis / evidence / canvas_state / brief_version
  GET    /api/v1/investigations/{id}/artifacts → listar (?kind=...)

  GET    /api/v1/investigations/{id}/events    → audit trail
  POST   /api/v1/investigations/{id}/events    → registrar evento custom

Auth simplificada: `owner_id` viene del header `X-User-Id` (sin auth real
en este sprint — la capa de auth/JWT viene en el sprint siguiente). Se
asume que el frontend lo añade desde el contexto de sesión.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Header, Query, Request

from agents.entities.investigations import (
    InvestigationRepository, get_investigation_repository,
)
from agents.entities.schemas import (
    Investigation, InvestigationCreate, InvestigationUpdate,
    InvestigationDetail, PinnedEntity, Artifact, ArtifactCreate, AnalystEvent,
)
from agents.entities.resolver import slugify

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/investigations", tags=["investigations"])


def _repo() -> InvestigationRepository:
    return get_investigation_repository()


def _user(x_user_id: str | None) -> str:
    """Resolve owner_id desde header. En este sprint, sin auth, default 'demo'."""
    return (x_user_id or "demo").strip() or "demo"


# ─────────────────────────────────────────────────────────────────
# CRUD investigations
# ─────────────────────────────────────────────────────────────────

@router.get("", response_model=list[Investigation])
def list_investigations(
    status: str | None = Query(default="active"),
    limit: int = Query(default=50, ge=1, le=200),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> list[Investigation]:
    owner = _user(x_user_id)
    try:
        return _repo().list_for_owner(owner, status=status, limit=limit)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


@router.post("", response_model=Investigation, status_code=201)
def create_investigation(
    data: InvestigationCreate,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> Investigation:
    # Header siempre gana sobre body para owner_id (seguridad)
    if x_user_id:
        data = data.model_copy(update={"owner_id": x_user_id.strip()})
    if not data.slug:
        data = data.model_copy(update={"slug": slugify(data.title)})
    try:
        return _repo().create(data)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("investigations.create falló")
        raise HTTPException(400, detail=str(exc)[:300]) from exc


@router.get("/{inv_id}", response_model=InvestigationDetail)
def get_investigation(
    inv_id: int,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> InvestigationDetail:
    owner = _user(x_user_id)
    try:
        detail = _repo().get_detail(inv_id)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    if not detail:
        raise HTTPException(404, detail=f"investigation {inv_id} not found")
    # RLS lite: owner o collaborator
    if detail.owner_id != owner and owner not in (detail.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    return detail


@router.get("/by-slug/{slug}", response_model=InvestigationDetail)
def get_by_slug(
    slug: str,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> InvestigationDetail:
    try:
        inv = _repo().get_by_slug(slug)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    if not inv:
        raise HTTPException(404, detail=f"investigation slug={slug} not found")
    return get_investigation(inv.id, x_user_id=x_user_id)


@router.patch("/{inv_id}", response_model=Investigation)
def update_investigation(
    inv_id: int,
    patch: InvestigationUpdate,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> Investigation:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    updated = _repo().update(inv_id, patch, actor_id=owner)
    return updated or inv


@router.post("/{inv_id}/archive", response_model=dict)
def archive_investigation(
    inv_id: int,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner:
        raise HTTPException(403, detail="solo el owner puede archivar")
    ok = _repo().archive(inv_id, actor_id=owner)
    return {"ok": ok, "id": inv_id}


# ─────────────────────────────────────────────────────────────────
# Pin entities
# ─────────────────────────────────────────────────────────────────

class _PinIn(InvestigationUpdate):  # reusing the base for free Pydantic validation
    entity_id: int
    note: str = ""
    position: int = 0


@router.post("/{inv_id}/pin", response_model=PinnedEntity, status_code=201)
def pin_entity(
    inv_id: int,
    body: dict[str, Any],
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> PinnedEntity:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    try:
        entity_id = int(body.get("entity_id") or 0)
    except (TypeError, ValueError):
        entity_id = 0
    if not entity_id:
        raise HTTPException(422, detail="entity_id es obligatorio")
    return _repo().pin_entity(
        investigation_id=inv_id,
        entity_id=entity_id,
        pinned_by=owner,
        note=str(body.get("note") or ""),
        position=int(body.get("position") or 0),
    )


@router.delete("/{inv_id}/pin/{entity_id}")
def unpin_entity(
    inv_id: int, entity_id: int,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    ok = _repo().unpin_entity(
        investigation_id=inv_id, entity_id=entity_id, actor_id=owner,
    )
    return {"ok": ok, "investigation_id": inv_id, "entity_id": entity_id}


# ─────────────────────────────────────────────────────────────────
# Artifacts (notebook · hypothesis · evidence · canvas · brief · comment)
# ─────────────────────────────────────────────────────────────────

@router.post("/{inv_id}/artifacts", response_model=Artifact, status_code=201)
def add_artifact(
    inv_id: int,
    data: ArtifactCreate,
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> Artifact:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    if not data.author_id:
        data = data.model_copy(update={"author_id": owner})
    return _repo().add_artifact(inv_id, data)


@router.get("/{inv_id}/artifacts", response_model=list[Artifact])
def list_artifacts(
    inv_id: int,
    kind: str | None = Query(default=None),
    include_archived: bool = Query(default=False),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> list[Artifact]:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    return _repo().list_artifacts(inv_id, kind=kind, include_archived=include_archived)


# ─────────────────────────────────────────────────────────────────
# Events · audit trail
# ─────────────────────────────────────────────────────────────────

@router.get("/{inv_id}/events", response_model=list[AnalystEvent])
def list_events(
    inv_id: int,
    limit: int = Query(default=50, ge=1, le=500),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> list[AnalystEvent]:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    return _repo().recent_events(inv_id, limit=limit)


@router.post("/{inv_id}/events", status_code=201)
def record_custom_event(
    inv_id: int,
    body: dict[str, Any],
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> dict[str, Any]:
    owner = _user(x_user_id)
    inv = _repo().get(inv_id)
    if not inv:
        raise HTTPException(404, detail="not found")
    if inv.owner_id != owner and owner not in (inv.collaborators or []):
        raise HTTPException(403, detail="acceso denegado")
    verb = str(body.get("verb") or "").strip()
    if not verb:
        raise HTTPException(422, detail="verb es obligatorio")
    _repo().record_event(
        investigation_id=inv_id, actor_id=owner, verb=verb,
        target_kind=body.get("target_kind"),
        target_id=body.get("target_id"),
        entity_id=body.get("entity_id"),
        payload=body.get("payload") or {},
    )
    return {"ok": True}
