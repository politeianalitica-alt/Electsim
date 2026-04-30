"""
Esquemas Pydantic para la API del grafo de ontologia.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OntologyObjectTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    display_name: str
    description: Optional[str] = None


class OntologyObjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    object_type: str          # code del tipo, p.ej. 'actor'
    external_table: str
    external_id: str
    properties: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class OntologyRelationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    relation_type: str        # code del tipo, p.ej. 'MEMBER_OF'
    source_object_id: UUID
    target_object_id: UUID
    weight: Optional[float] = None
    evidence_object_id: Optional[UUID] = None
    created_at: datetime


class OntologyObjectListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[OntologyObjectOut]


class OntologyRelationListResponse(BaseModel):
    total: int
    offset: int
    limit: int
    items: list[OntologyRelationOut]
