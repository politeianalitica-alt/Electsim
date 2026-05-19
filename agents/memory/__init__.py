"""Politeia Analyst Memory · memoria persistente por analista.

Resuelve la limitación documentada en VISION_2027.md §7.3: el brain
trataba cada llamada como si fuera la primera. Con esta capa, cada
sesión recupera las top-N memorias relevantes del propio analista y
las incluye como contexto adicional para el LLM.

Diseño sin pgvector (para no obligar al cliente a instalar la extensión):

  · Almacenamiento: tabla `analyst_memory` con content + tags + entity_refs
  · Retrieval: hybrid scoring · trigram(content) + tags_overlap + recency
  · Persistencia: cada brain_copilot request guarda prompt + response
  · Recall: el copiloto inyecta memorias relevantes en el system prompt

Si pgvector se activa más adelante (columna `embedding`), el mismo
módulo añade ranking semántico encima del trigram. Sin breaking changes.
"""

from agents.memory.schemas import (
    MemoryKind, MemoryEntry, MemoryCreate, MemorySearchResult, MemoryStats,
)
from agents.memory.repository import (
    AnalystMemoryRepository, get_memory_repository,
)

__all__ = [
    "MemoryKind", "MemoryEntry", "MemoryCreate", "MemorySearchResult", "MemoryStats",
    "AnalystMemoryRepository", "get_memory_repository",
]
