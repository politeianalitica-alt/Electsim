from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query, Request

from api.dependencies import get_ontology
from ontology import ONTOLOGY_REGISTRY, OntologyStore

router = APIRouter()


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
