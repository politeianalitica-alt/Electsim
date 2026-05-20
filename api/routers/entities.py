"""Router /api/v1/entities · ontología unificada (Pilar 1 estructural).

Endpoints:

  GET    /api/v1/entities/kinds                 → lista de kinds + linkkinds
  GET    /api/v1/entities/search?q&kind&limit   → búsqueda con scoring
  GET    /api/v1/entities/by-slug/{kind}/{slug} → resolución determinística
  GET    /api/v1/entities/by-qid/{qid}          → resolución por Wikidata QID
  GET    /api/v1/entities/{entity_id}           → detalle completo
  GET    /api/v1/entities/{entity_id}/links     → links saliendo/entrando

  POST   /api/v1/entities                       → crear entity (admin)
  PATCH  /api/v1/entities/{entity_id}           → update parcial (admin)
  POST   /api/v1/entities/{entity_id}/links     → crear link tipado (admin)
  POST   /api/v1/entities/_backfill             → ejecutar backfill idempotente

  GET    /api/v1/entities/by-kind/{kind}        → lista paginada por kind

Diseño:
  · No autenticación en este sprint (se sumará en sprint de RLS).
  · Toda respuesta es Pydantic tipada · el frontend genera tipos
    automáticamente vía openapi.json.
  · Excepciones devuelven 4xx/5xx con detalle.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Query

from fastapi import Header

from agents.entities import (
    EntityRepository, get_entity_repository,
    EntityCreate, EntityUpdate, Entity, EntitySummary, EntitySearchResult,
    EntityLink, EntityLinkCreate,
)
from agents.entities.schemas import (
    EntityKind, LinkKind, EntityBacklinks,
)
from agents.entities.investigations import get_investigation_repository
import typing as _t

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/entities", tags=["entities"])


def _get_repo() -> EntityRepository:
    return get_entity_repository()


# ─────────────────────────────────────────────────────────────────
# Metadata · kinds + linkkinds
# ─────────────────────────────────────────────────────────────────

@router.get("/kinds")
def list_kinds() -> dict[str, Any]:
    """Lista de kinds y linkkinds del modelo ontológico."""
    return {
        "entity_kinds": list(_t.get_args(EntityKind)),
        "link_kinds": list(_t.get_args(LinkKind)),
    }


# ─────────────────────────────────────────────────────────────────
# Search · híbrida con scoring
# ─────────────────────────────────────────────────────────────────

@router.get("/search", response_model=list[EntitySearchResult])
def search_entities(
    q: str = Query(min_length=2, max_length=200),
    kind: str | None = Query(default=None, description="Filtra por kind"),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[EntitySearchResult]:
    """Búsqueda por nombre, slug, qid o alias con scoring 0-1."""
    try:
        return _get_repo().search(q, kind=kind, limit=limit)
    except RuntimeError as exc:
        # BD no disponible · devolver 503 explícito
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc
    except Exception as exc:
        logger.exception("entities.search falló")
        raise HTTPException(500, detail=str(exc)[:200]) from exc


# ─────────────────────────────────────────────────────────────────
# Resolución por slug · qid
# ─────────────────────────────────────────────────────────────────

@router.get("/by-slug/{kind}/{slug}", response_model=Entity)
def get_by_slug(kind: str, slug: str) -> Entity:
    try:
        ent = _get_repo().get_by_kind_slug(kind, slug)
    except RuntimeError as exc:
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc
    if not ent:
        raise HTTPException(404, detail=f"entity not found: kind={kind} slug={slug}")
    return ent


@router.get("/by-qid/{qid}", response_model=Entity)
def get_by_qid(qid: str) -> Entity:
    try:
        ent = _get_repo().get_by_qid(qid)
    except RuntimeError as exc:
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc
    if not ent:
        raise HTTPException(404, detail=f"entity not found: qid={qid}")
    return ent


# ─────────────────────────────────────────────────────────────────
# Lista por kind
# ─────────────────────────────────────────────────────────────────

@router.get("/by-kind/{kind}", response_model=list[EntitySummary])
def list_by_kind(
    kind: str,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    tags: str | None = Query(default=None, description="Tags coma-separados"),
) -> list[EntitySummary]:
    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()] or None
    try:
        return _get_repo().list_by_kind(kind, limit=limit, offset=offset, tags=tag_list)
    except RuntimeError as exc:
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc


# ─────────────────────────────────────────────────────────────────
# Detalle + links
# ─────────────────────────────────────────────────────────────────

@router.get("/{entity_id}", response_model=Entity)
def get_entity(entity_id: int) -> Entity:
    try:
        ent = _get_repo().get(entity_id)
    except RuntimeError as exc:
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc
    if not ent:
        raise HTTPException(404, detail=f"entity {entity_id} not found")
    return ent


@router.get("/{entity_id}/links", response_model=list[EntityLink])
def get_entity_links(
    entity_id: int,
    direction: str = Query(default="outgoing", regex="^(outgoing|incoming|both)$"),
    link_kind: str | None = Query(default=None),
    active_only: bool = Query(default=False),
) -> list[EntityLink]:
    try:
        return _get_repo().get_links(
            entity_id,
            direction=direction,
            link_kind=link_kind,
            active_only=active_only,
        )
    except RuntimeError as exc:
        raise HTTPException(503, detail=f"BD no disponible: {exc}") from exc


@router.get("/{entity_id}/backlinks", response_model=EntityBacklinks)
def get_entity_backlinks(
    entity_id: int,
    limit: int = Query(default=50, ge=1, le=200),
    x_user_id: str | None = Header(default=None, alias="X-User-Id"),
) -> EntityBacklinks:
    """Backlinks de una entity · dónde aparece dentro del workspace.

    Devuelve las investigaciones del usuario donde la entity está pinned
    + los artifacts (notebook_block, hypothesis, evidence...) que la
    referencian. Resiliente · BD fresca devuelve listas vacías.

    Es la conexión Pilar 1 ↔ Pilar 2: cada ficha de actor/partido/territorio
    se convierte en nodo de memoria institucional propia (estilo Obsidian).
    """
    owner = (x_user_id or "demo").strip() or "demo"
    return get_investigation_repository().backlinks_for_entity(
        entity_id, owner_id=owner, limit=limit,
    )


# ─────────────────────────────────────────────────────────────────
# Mutaciones (admin · sin auth en este sprint)
# ─────────────────────────────────────────────────────────────────

@router.post("", response_model=Entity, status_code=201)
def create_entity(data: EntityCreate) -> Entity:
    try:
        return _get_repo().upsert(data)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("entities.create falló")
        raise HTTPException(400, detail=str(exc)[:300]) from exc


@router.patch("/{entity_id}", response_model=Entity)
def update_entity(entity_id: int, patch: EntityUpdate) -> Entity:
    try:
        ent = _get_repo().update(entity_id, patch)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    if not ent:
        raise HTTPException(404, detail=f"entity {entity_id} not found")
    return ent


@router.post("/{entity_id}/links", response_model=EntityLink, status_code=201)
def add_link(entity_id: int, data: EntityLinkCreate) -> EntityLink:
    if data.src_id != entity_id and data.dst_id != entity_id:
        raise HTTPException(400, detail="src_id o dst_id debe coincidir con entity_id de la URL")
    try:
        return _get_repo().add_link(data)
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc


# ─────────────────────────────────────────────────────────────────
# Backfill (admin)
# ─────────────────────────────────────────────────────────────────

@router.post("/_backfill")
def run_backfill(dry_run: bool = Query(default=False)) -> dict[str, Any]:
    """Ejecuta el backfill idempotente desde los catálogos curados.

    En producción esto se llama una vez al inicializar o cuando se
    añaden nuevos catálogos. Es seguro re-ejecutar (upserts).
    """
    from agents.entities.backfill import backfill
    try:
        counts = backfill(dry_run=dry_run)
        return {"ok": True, "dry_run": dry_run, "counts": counts}
    except RuntimeError as exc:
        raise HTTPException(503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("backfill falló")
        raise HTTPException(500, detail=str(exc)[:300]) from exc


# ─────────────────────────────────────────────────────────────────
# Sprint 5 · S5.2 · Grafo temporal · estado en fecha pasada
# ─────────────────────────────────────────────────────────────────

@router.get("/timeline")
def get_timeline(
    at: str = Query(description="Fecha objetivo · ISO 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:MM:SS'"),
    kinds: str | None = Query(
        default=None,
        description="EntityKinds separados por coma (ej. 'actor_person,party')",
    ),
    link_kinds: str | None = Query(
        default=None,
        description="LinkKinds separados por coma (ej. 'member_of,leads')",
    ),
    limit_entities: int = Query(default=500, ge=1, le=5000),
    limit_links: int = Query(default=1000, ge=1, le=10000),
) -> dict[str, Any]:
    """Devuelve el estado del grafo (entities + entity_links) en una fecha pasada.

    Sprint 5 · S5.2 (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 5`).

    Filtra por `valid_from <= at < valid_to` (o `valid_to IS NULL` = vigente).

    Útil para:
      · Reproducir el grafo de actores políticos en una fecha histórica
      · Detectar formación/ruptura de alianzas a lo largo del tiempo
      · Time-travel queries para análisis longitudinal

    Ejemplo:
      GET /api/v1/entities/timeline?at=2024-01-01&kinds=actor_person,party
    """
    from datetime import datetime

    # Parsear fecha
    try:
        at_date = datetime.fromisoformat(at.replace("Z", "+00:00"))
    except ValueError:
        try:
            # 'YYYY-MM-DD'
            at_date = datetime.strptime(at, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, detail=f"Fecha inválida '{at}' · usa 'YYYY-MM-DD' o ISO")

    kinds_list = [k.strip() for k in kinds.split(",")] if kinds else None
    link_kinds_list = [k.strip() for k in link_kinds.split(",")] if link_kinds else None

    repo = get_entity_repository()
    if repo is None:
        raise HTTPException(503, detail="EntityRepository no disponible (sin engine)")

    try:
        result = repo.get_graph_at(
            at_date=at_date,
            kinds=kinds_list,
            link_kinds=link_kinds_list,
            limit_entities=limit_entities,
            limit_links=limit_links,
        )
        # Serializar entities/links a dicts para JSON
        return {
            "at_date": result["at_date"],
            "n_entities": result["n_entities"],
            "n_links": result["n_links"],
            "entities": [e.model_dump() for e in result["entities"]],
            "links": [l.model_dump() for l in result["links"]],
            "filters": {
                "kinds": kinds_list,
                "link_kinds": link_kinds_list,
            },
        }
    except Exception as exc:
        logger.exception("timeline query falló")
        raise HTTPException(500, detail=str(exc)[:300]) from exc


@router.get("/{entity_id}/links-at")
def get_entity_links_at(
    entity_id: int,
    at: str = Query(description="Fecha objetivo ISO"),
    direction: str = Query(default="both", pattern="^(outgoing|incoming|both)$"),
    link_kind: str | None = Query(default=None),
) -> list[dict[str, Any]]:
    """Devuelve los links de una entity vigentes en una fecha pasada.

    Sprint 5 · S5.2 · variante por-entity de /timeline.
    """
    from datetime import datetime
    try:
        at_date = datetime.fromisoformat(at.replace("Z", "+00:00"))
    except ValueError:
        try:
            at_date = datetime.strptime(at, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, detail=f"Fecha inválida '{at}'")

    repo = get_entity_repository()
    if repo is None:
        raise HTTPException(503, detail="EntityRepository no disponible")

    links = repo.get_links_at(
        entity_id=entity_id,
        at_date=at_date,
        direction=direction,
        link_kind=link_kind,
    )
    return [l.model_dump() for l in links]
