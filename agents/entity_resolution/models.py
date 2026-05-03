"""
Modelos de datos para el pipeline de resolucion de identidades (Bloque 1).

Todos los dataclasses son inmutables por convencion (frozen=True) para
garantizar que el pipeline no muta menciones en vuelo.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


# ---------------------------------------------------------------------------
# Datos de entrada
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Article:
    """Articulo de entrada al pipeline de extraccion."""
    url: str
    text: str
    headline: str = ""
    source_media: str = ""
    published_at: Optional[datetime] = None
    article_id: Optional[int] = None   # FK a news_articles.id si existe


# ---------------------------------------------------------------------------
# Salida de Bloque 1 (extraccion + normalizacion)
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RawMention:
    """
    Una mencion de entidad extraida del texto de un articulo.

    Campos NER:
      surface_text  — texto literal tal y como aparece en el articulo
      surface_norm  — texto tras aplicar T1-T8 (lowercase, tildes, etc.)
      ner_label     — etiqueta spaCy: PER | ORG | LOC | MISC

    Ventana de contexto:
      context_window — oracion donde aparece la mencion +/- padding
      char_start     — offset de caracter en el texto original
      char_end       — offset de caracter en el texto original
      sentence_idx   — indice de oracion (0-based)

    Pre-resolucion inmediata (lookup YAML):
      resolved_qid   — QID canonico si el lookup fue exitoso, None si no
      resolution_method — 'yaml' si se resolvio en Bloque 1, None si no
    """
    article_url: str
    surface_text: str
    surface_norm: str
    ner_label: str

    context_window: str = ""
    char_start: int = 0
    char_end: int = 0
    sentence_idx: int = 0

    source_media: str = ""
    published_at: Optional[datetime] = None
    article_id: Optional[int] = None

    # Rellena el normalizador si encuentra match directo en aliases.yaml
    resolved_qid: Optional[str] = None
    resolution_method: Optional[str] = None   # 'yaml' | None
    resolution_score: float = 0.0


# ---------------------------------------------------------------------------
# Resultado del batch de un articulo
# ---------------------------------------------------------------------------

@dataclass
class ExtractionResult:
    """Agrupacion de menciones extraidas de un articulo."""
    article: Article
    mentions: list[RawMention] = field(default_factory=list)
    error: Optional[str] = None

    @property
    def ok(self) -> bool:
        return self.error is None

    @property
    def resolved_count(self) -> int:
        return sum(1 for m in self.mentions if m.resolved_qid is not None)

    @property
    def unresolved_count(self) -> int:
        return len(self.mentions) - self.resolved_count
