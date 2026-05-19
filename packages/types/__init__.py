"""Contratos compartidos entre conectores, pipeline y consumidores.

Política de este paquete:
  - Pydantic v2 estricto (`extra='forbid'` en todos los modelos)
  - Cero dependencias hacia `apps/*`
  - Cero dependencias hacia SQLAlchemy/ORM (estos son solo contratos)
  - Se autoexporta para que `from packages.types import NormalizedItem`
    siga siendo trivial.

Referencia: docs/INGESTA_PROPUESTA.md §3 (capa 1 · contratos).
"""
from __future__ import annotations

from packages.types.normalized_item import (
    NormalizedItem,
    EnrichedItem,
    ExtractedEntity,
    ExtractedLink,
    EntityUpsertOp,
    EntityLinkOp,
    OntologyMapResult,
    SourceKind,
)

__all__ = [
    "NormalizedItem",
    "EnrichedItem",
    "ExtractedEntity",
    "ExtractedLink",
    "EntityUpsertOp",
    "EntityLinkOp",
    "OntologyMapResult",
    "SourceKind",
]
