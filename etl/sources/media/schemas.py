"""
Modelos Pydantic para el módulo de Medios & Narrativa.

MediaSource     → fuente de noticias (RSS, web, API)
RawMediaItem    → artículo crudo tal como llega del RSS/crawler
MediaItem       → artículo normalizado, deduplicado, enriquecido
MediaActorMention → mención de actor en un artículo
TextSignal      → resultado del análisis de sentimiento
NarrativeCluster → cluster narrativo persistente
NarrativeClusterItem → relación cluster ↔ artículo
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field, field_validator


# ── MediaSource ───────────────────────────────────────────────────────────────

class MediaSource(BaseModel):
    """Fuente de medios — compatible con el catálogo de 350 fuentes existente."""
    name: str
    url: str = ""
    rss: str | None = None
    region: str | None = None
    country: str | None = None
    ccaa: str | None = None
    provincia: str | None = None
    lat: float | None = None
    lon: float | None = None
    language: str = "es"
    ideology_score: float | None = None  # -1 izquierda … +1 derecha
    media_type: str | None = None        # "nacional" | "regional" | "local" | "internacional"
    active: bool = True

    model_config = {"from_attributes": True}

    @classmethod
    def from_feed_dict(cls, d: dict) -> "MediaSource":
        """Construye desde el formato del catálogo RSS_FEEDS_GEO existente."""
        return cls(
            name=d.get("name", ""),
            url=d.get("url", d.get("rss", "")),
            rss=d.get("rss"),
            region=d.get("geo_region") or d.get("region"),
            country=d.get("country"),
            lat=d.get("lat"),
            lon=d.get("lon"),
            language=d.get("lang", "es"),
        )


# ── RawMediaItem ──────────────────────────────────────────────────────────────

class RawMediaItem(BaseModel):
    """Artículo crudo del RSS/crawler, antes de normalización."""
    source: str
    source_url: str | None = None
    source_region: str | None = None
    source_country: str | None = None
    source_lat: float | None = None
    source_lon: float | None = None
    title: str
    url: str = ""
    published_raw: str | None = None  # fecha como viene del feed
    author: str | None = None
    summary: str | None = None        # resumen/description del feed
    text: str | None = None           # texto completo si disponible
    language: str = "es"
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── TextSignal ────────────────────────────────────────────────────────────────

class TextSignal(BaseModel):
    """Resultado del análisis de sentimiento/emoción/toxicidad."""
    sentiment_label: str | None = None   # "positivo" | "negativo" | "neutral"
    sentiment_score: float | None = None  # [-1, 1]
    emotion_label: str | None = None      # "alegría" | "tristeza" | "ira" | "miedo" | ...
    toxicity_score: float | None = None   # [0, 1]
    analysis_mode: str = "fast"           # "fast" | "advanced"


# ── MediaActorMention ─────────────────────────────────────────────────────────

class MediaActorMention(BaseModel):
    """Mención de un actor político en un artículo."""
    content_hash: str
    actor_name: str
    actor_type: str | None = None   # "politico" | "partido" | "institucion"
    mention_count: int = 1
    confidence: float = 1.0
    matched_aliases: list[str] = Field(default_factory=list)


# ── MediaItem ─────────────────────────────────────────────────────────────────

class MediaItem(BaseModel):
    """
    Artículo normalizado, deduplicado y enriquecido.
    Clave de deduplicación: content_hash (SHA-256 del título normalizado).
    """
    source: str
    source_url: str | None = None
    source_region: str | None = None
    source_country: str | None = None
    source_lat: float | None = None
    source_lon: float | None = None

    title: str
    url: str = ""
    published_at: datetime | None = None
    author: str | None = None

    summary: str | None = None
    text: str | None = None
    language: str = "es"

    canonical_url: str | None = None
    content_hash: str = ""    # SHA-256 de title normalizado
    title_hash: str = ""      # SHA-256 del título exacto

    # Extracción semántica
    actors: list[str] = Field(default_factory=list)
    parties: list[str] = Field(default_factory=list)
    institutions: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)

    # Sentimiento
    sentiment_label: str | None = None
    sentiment_score: float | None = None
    emotion_label: str | None = None
    toxicity_score: float | None = None

    # Cluster narrativo
    narrative_cluster_id: str | None = None
    impact_level: str = "INFORMATIVO"

    raw_payload: dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {"from_attributes": True}

    def to_db_dict(self) -> dict[str, Any]:
        """Convierte a dict para INSERT en media_items."""
        import json
        return {
            "source": self.source,
            "source_url": self.source_url,
            "source_region": self.source_region,
            "source_country": self.source_country,
            "source_lat": self.source_lat,
            "source_lon": self.source_lon,
            "title": self.title[:2000],
            "url": self.url[:2000] if self.url else "",
            "canonical_url": self.canonical_url,
            "published_at": self.published_at,
            "author": self.author,
            "summary": self.summary,
            "text": self.text[:50000] if self.text else None,
            "language": self.language,
            "content_hash": self.content_hash,
            "title_hash": self.title_hash,
            "actors": self.actors,
            "parties": self.parties,
            "institutions": self.institutions,
            "sectors": self.sectors,
            "topics": self.topics,
            "sentiment_label": self.sentiment_label,
            "sentiment_score": self.sentiment_score,
            "emotion_label": self.emotion_label,
            "toxicity_score": self.toxicity_score,
            "narrative_cluster_id": self.narrative_cluster_id,
            "impact_level": self.impact_level,
            "raw_payload": json.dumps(self.raw_payload, default=str),
            "fetched_at": self.fetched_at,
        }


# ── NarrativeCluster ──────────────────────────────────────────────────────────

class NarrativeCluster(BaseModel):
    """Cluster narrativo persistente."""
    id: str                             # slug estable, ej. "vivienda_alquiler"
    label: str
    summary: str | None = None
    frame: str | None = None            # "economico" | "conflicto" | "interes_humano"
    tension: str | None = None          # "alta" | "media" | "baja"
    target_audience: str | None = None
    ideology_hint: str | None = None

    top_terms: list[str] = Field(default_factory=list)
    representative_titles: list[str] = Field(default_factory=list)
    representative_media_item_ids: list[int] = Field(default_factory=list)

    volume_24h: int = 0
    volume_7d: int = 0
    growth_rate: float = 0.0
    sentiment_avg: float = 0.0
    risk_level: str = "BAJO"            # "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO"

    actors: list[str] = Field(default_factory=list)
    sectors: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)

    first_seen: datetime | None = None
    last_seen: datetime | None = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    raw_payload: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class NarrativeClusterItem(BaseModel):
    """Relación entre un cluster narrativo y un artículo."""
    cluster_id: str
    media_item_id: int | None = None    # FK a media_items.id
    content_hash: str = ""              # alternativa si no hay id
    score: float = 0.0
