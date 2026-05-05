"""
Media Intelligence Schemas — modelos Pydantic v2.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class MediaSourceProfile(BaseModel):
    """Perfil completo de una fuente mediática."""
    model_config = ConfigDict(extra="ignore")

    source_id: str
    name: str
    url: str
    rss: str | None = None
    lang: str = "es"  # ISO 639-1
    source_type: str = "general"  # political|economic|international|regional|local|think_tank|fact_check|tv_radio|sports|tech|opinion|low_priority
    source_priority: int = 3  # 1=highest .. 5=lowest
    political_relevance: int = 50  # 0-100
    credibility_tier: str = "B"  # A|B|C|unknown
    scraping_strategy: str = "rss"  # rss|html|trafilatura|manual
    active: bool = True
    region: str | None = None
    country: str | None = None
    lat: float | None = None
    lon: float | None = None
    ideology_hint: str | None = None


class MediaSourceHealth(BaseModel):
    """Estado de salud de una fuente mediática."""
    model_config = ConfigDict(extra="ignore")

    source_id: str
    source_name: str
    rss_url: str | None = None
    status: str = "unknown"  # active|degraded|down|no_recent|blocked|redirect|non_xml|unknown
    last_success_at: str | None = None
    last_failure_at: str | None = None
    http_status: int | None = None
    error_type: str | None = None  # timeout|404|403|non_xml|redirect|parse_error|empty|blocked|ssl_error
    error_message: str | None = None
    articles_last_24h: int = 0
    parser_used: str | None = None
    needs_html_scraper: bool = False
    quality_score: float = 0.5
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MediaArticle(BaseModel):
    """Artículo de medios adquirido."""
    model_config = ConfigDict(extra="ignore")

    article_id: str  # sha256 de url o titulo
    source_id: str
    source_name: str
    title: str
    original_title: str | None = None
    summary: str | None = None
    original_summary: str | None = None
    url: str
    published_at: str | None = None
    lang: str = "es"
    detected_lang: str | None = None
    translated_title: str | None = None
    translated_summary: str | None = None
    translation_model: str | None = None
    translated_at: str | None = None
    source_type: str | None = None
    source_priority: int = 3
    political_relevance: float = 0.5
    relevance_score: float | None = None
    quality_score: float | None = None
    is_duplicate: bool = False
    is_clickbait: bool = False
    is_sports_non_political: bool = False
    content_hash: str | None = None
    fetched_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    parser_used: str = "rss"
    tenant_id: str = "default"
    raw_payload: dict = Field(default_factory=dict)


class ArticleRelevanceScore(BaseModel):
    """Score de relevancia multi-dimensión de un artículo."""
    model_config = ConfigDict(extra="ignore")

    article_id: str
    total_score: float  # 0-1
    political_relevance: float = 0.0
    novelty: float = 0.0
    source_credibility: float = 0.0
    actor_connection: float = 0.0
    narrative_connection: float = 0.0
    territorial_impact: float = 0.0
    intensity_risk: float = 0.0
    diversity: float = 0.0


class ArticleQualityScore(BaseModel):
    """Resultado del scoring de calidad de un artículo."""
    article_id: str = ""
    total_score: float = Field(ge=0.0, le=1.0, description="Score 0-1, 1=máxima calidad")
    is_duplicate: bool = False
    is_clickbait: bool = False
    is_sports_non_political: bool = False
    is_entertainment: bool = False
    is_stale: bool = False
    is_low_density: bool = False
    is_empty_title: bool = False
    is_low_priority_source: bool = False
    flags: list[str] = Field(default_factory=list)


class LanguageDetectionResult(BaseModel):
    """Resultado de detección de idioma."""
    detected: str = "es"
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    method: str = "default"


class TranslationResult(BaseModel):
    """Resultado de una traducción."""
    translated: str
    model: str = "none"
    from_cache: bool = False
    source_lang: str = "en"
    target_lang: str = "es"


class RankedArticle(BaseModel):
    """Artículo con score de relevancia calculado."""
    article_id: str = ""
    title: str = ""
    translated_title: str | None = None
    source_name: str = ""
    source_lang: str = "es"
    relevance_score: float = Field(ge=0.0, le=1.0, default=0.0)
    quality_score: float = Field(ge=0.0, le=1.0, default=1.0)
    quality_flags: list[str] = Field(default_factory=list)
    political_relevance: float = Field(ge=0.0, le=1.0, default=0.5)
    metadata: dict[str, Any] = Field(default_factory=dict)
