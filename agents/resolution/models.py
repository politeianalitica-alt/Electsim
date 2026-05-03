"""
Modelos de datos para Bloque 2 — Resolucion de identidades.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class ResolutionMethod(str, Enum):
    YAML      = "yaml"       # lookup exacto en aliases.yaml (Bloque 1)
    EMBEDDING = "embedding"  # similitud coseno de embeddings
    OLLAMA    = "ollama"     # arbitro LLM
    REVIEW    = "review"     # encolado para revision humana
    REJECTED  = "rejected"   # ninguna resolucion posible


@dataclass(frozen=True)
class Candidate:
    """Entidad candidata para una mencion dada."""
    qid:            str
    nombre_oficial: str
    tipo:           str
    score:          float           # similitud coseno [0, 1]
    matched_alias:  Optional[str] = None


@dataclass
class ResolutionResult:
    """Resultado de resolver una sola RawMention."""
    raw_mention_id: int
    surface_text:   str
    surface_norm:   str
    context_window: str

    # Resultado
    method:         ResolutionMethod
    resolved_qid:   Optional[str] = None
    score:          float = 0.0
    candidates:     list[Candidate] = field(default_factory=list)

    # Datos del juez Ollama (si aplica)
    ollama_response: Optional[str] = None
    needs_review:    bool = False

    @property
    def resolved(self) -> bool:
        return self.resolved_qid is not None
