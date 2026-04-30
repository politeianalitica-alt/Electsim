from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from api.dependencies import get_db, get_ontology
from api.ontology.repository import OntologyGraphRepository
from api.ontology.schemas import (
    OntologyObjectListResponse,
    OntologyObjectOut,
    OntologyObjectTypeOut,
    OntologyRelationListResponse,
)
from ontology import ONTOLOGY_REGISTRY, OntologyStore

router = APIRouter()


# =============================================================================
# Endpoints legacy (registro en memoria, compatibilidad hacia atras)
# =============================================================================

@router.get("/types")
def list_types() -> list[dict[str, Any]]:
    return [
        {
            "name": t.name,
            "table": t.table,
            "properties": list(t.properties.keys()),
            "actions": t.actions,
        }
        for t in ONTOLOGY_REGISTRY.values()
    ]


@router.get("/objects/{type_}/{id_}")
def get_object(type_: str, id_: str, ontology: OntologyStore = Depends(get_ontology)) -> dict[str, Any]:
    obj = ontology.get_object(type_, id_)
    return {"type": obj.type, "id": obj.id, "properties": obj.properties}


@router.get("/objects/{type_}")
def find_objects(
    type_: str,
    request: Request,
    ontology: OntologyStore = Depends(get_ontology),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> dict[str, Any]:
    filters = {k: v for k, v in request.query_params.items() if k not in {"limit", "offset"}}
    objs = ontology.find_objects(type_, filters=filters)
    page = objs[offset : offset + limit]
    return {
        "total": len(objs),
        "offset": offset,
        "limit": limit,
        "items": [{"type": o.type, "id": o.id, "properties": o.properties} for o in page],
    }


# =============================================================================
# Endpoints grafo persistido (ontology_object / ontology_relation)
# GET /ontology/graph/*
# =============================================================================

def _get_graph_repo(db: Session = Depends(get_db)) -> OntologyGraphRepository:
    return OntologyGraphRepository(session=db)


@router.get("/graph/object-types", response_model=list[OntologyObjectTypeOut])
def graph_list_object_types(
    repo: OntologyGraphRepository = Depends(_get_graph_repo),
) -> list[OntologyObjectTypeOut]:
    """Lista todos los tipos de objeto registrados en la ontologia."""
    return repo.list_object_types()


@router.get("/graph/objects", response_model=OntologyObjectListResponse)
def graph_list_objects(
    type: str | None = Query(None, description="Filtrar por code de objeto, p.ej. 'actor'"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    repo: OntologyGraphRepository = Depends(_get_graph_repo),
) -> OntologyObjectListResponse:
    """
    Lista objetos del grafo de ontologia.
    Filtra opcionalmente por tipo (actor, party, media_item, etc.).
    """
    total, items = repo.list_objects(object_type_code=type, limit=limit, offset=offset)
    return OntologyObjectListResponse(total=total, offset=offset, limit=limit, items=items)


@router.get("/graph/objects/{object_id}", response_model=OntologyObjectOut)
def graph_get_object(
    object_id: UUID,
    repo: OntologyGraphRepository = Depends(_get_graph_repo),
) -> OntologyObjectOut:
    """Devuelve un objeto del grafo por su UUID."""
    obj = repo.get_object(object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Objeto de ontologia no encontrado")
    return obj


@router.get("/graph/objects/source/{external_table}/{external_id}", response_model=OntologyObjectOut)
def graph_get_object_by_source(
    external_table: str,
    external_id: str,
    repo: OntologyGraphRepository = Depends(_get_graph_repo),
) -> OntologyObjectOut:
    """Devuelve un objeto del grafo por su tabla y PK original."""
    obj = repo.get_object_by_source(external_table=external_table, external_id=external_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Objeto de ontologia no encontrado")
    return obj


@router.get("/graph/relations", response_model=OntologyRelationListResponse)
def graph_list_relations(
    object_id: UUID | None = Query(None, description="UUID del nodo (filtra relaciones incidentes)"),
    direction: str = Query(
        default="both",
        pattern="^(both|in|out)$",
        description="Direccion de la relacion respecto al nodo: both | in | out",
    ),
    type: str | None = Query(None, description="Code del tipo de relacion, p.ej. 'MEMBER_OF'"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    repo: OntologyGraphRepository = Depends(_get_graph_repo),
) -> OntologyRelationListResponse:
    """
    Lista relaciones del grafo.
    Filtra opcionalmente por nodo (object_id), direccion y tipo de relacion.
    """
    total, items = repo.list_relations(
        object_id=object_id,
        direction=direction,
        relation_type_code=type,
        limit=limit,
        offset=offset,
    )
    return OntologyRelationListResponse(total=total, offset=offset, limit=limit, items=items)
