"""Politeia Entities · ontología unificada object-centric (Pilar 1).

Layer canónica que reemplaza progresivamente las representaciones dispersas
de "actor", "partido", "ley", "territorio"... a favor de un único modelo:

  entities + entity_links

Cualquier feature del producto que necesite un objeto del dominio Politeia
(persona política, partido, institución, ley, territorio, medio, documento,
sector, narrativa, tema) lo obtiene como `Entity` con `entity_id` interno.

Las relaciones son `EntityLink` tipadas con confidence + evidencia + temporalidad.

Esto desbloquea:
  - Backlinks automáticos (ficha de Pedro Sánchez → todos los briefings donde aparece)
  - Búsqueda transversal (Cmd+K resuelve a entity_id sin importar el origen)
  - Investigaciones (pinned_entities apuntan a entity_id, no a tablas dispersas)
  - Razonamiento temporal (estado del mundo a fecha X via valid_from/to)
"""

from agents.entities.schemas import (
    Entity, EntityCreate, EntityUpdate, EntityLink, EntityLinkCreate,
    EntityKind, LinkKind, EntitySummary, EntitySearchResult,
)
from agents.entities.repository import EntityRepository, get_entity_repository
from agents.entities.resolver import resolve_entity, slugify

__all__ = [
    "Entity", "EntityCreate", "EntityUpdate",
    "EntityLink", "EntityLinkCreate",
    "EntityKind", "LinkKind",
    "EntitySummary", "EntitySearchResult",
    "EntityRepository", "get_entity_repository",
    "resolve_entity", "slugify",
]
