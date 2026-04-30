"""
Modelos Pydantic para la configuracion declarativa de mercados politicos.
Un mercado agrupa partidos, medios, fuentes de ingesta, calendario y sistema politico.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class IdeologyAxes(BaseModel):
    """Coordenadas en el espacio ideologico bidimensional [-1, 1]."""

    economic: float = Field(..., ge=-1.0, le=1.0)
    social: float = Field(..., ge=-1.0, le=1.0)


class PartyConfig(BaseModel):
    """Configuracion de un partido u organizacion politica en un mercado."""

    slug: str
    name: str
    color_hex: str
    ideology_axes: IdeologyAxes
    external_ids: Dict[str, Optional[str]] = Field(default_factory=dict)


class MediaOutletConfig(BaseModel):
    """Configuracion de un medio de comunicacion."""

    slug: str
    name: str
    category: Literal["nacional", "regional", "local", "otro"]
    rss_url: Optional[str] = None
    bias_hint: Optional[str] = None


class RegulatorConfig(BaseModel):
    """Organismo regulador o institucional relevante en el mercado."""

    slug: str
    name: str
    website: Optional[str] = None


class IngestionSourceConfig(BaseModel):
    """Fuente de datos del pipeline de ingesta."""

    id: str
    type: str
    enabled: bool = True
    description: Optional[str] = None
    schedule_cron: str
    params: Dict[str, Any] = Field(default_factory=dict)


class ElectoralSystemConfig(BaseModel):
    type: str
    constituencies_source: str
    num_constituencies: int
    barrier_threshold: float = 0.0
    model_config = {"extra": "allow"}


class NationalParliamentConfig(BaseModel):
    name: str
    api_base_url: str
    chambers: List[str] = Field(default_factory=list)
    total_seats: Optional[int] = None
    model_config = {"extra": "allow"}


class RegionalParliamentConfig(BaseModel):
    count: int
    model_config = {"extra": "allow"}


class ParliamentConfig(BaseModel):
    national: NationalParliamentConfig
    regional: Optional[RegionalParliamentConfig] = None
    model_config = {"extra": "allow"}


class PoliticalSystemConfig(BaseModel):
    country_iso: str
    electoral_system: ElectoralSystemConfig
    parliament: ParliamentConfig
    model_config = {"extra": "allow"}


class CalendarEventConfig(BaseModel):
    code: str
    name: str
    recurrence: Literal["yearly", "variable", "none"]


class CalendarConfig(BaseModel):
    fixed_events: List[CalendarEventConfig] = Field(default_factory=list)
    ics_sources: List[str] = Field(default_factory=list)


class MarketConfig(BaseModel):
    """Configuracion completa de un mercado politico."""

    code: str
    name: str
    default_locale: str
    locales: List[str]
    timezone: str
    currency: str

    political_system: PoliticalSystemConfig
    parties: List[PartyConfig] = Field(default_factory=list)
    media_outlets: List[MediaOutletConfig] = Field(default_factory=list)
    regulators: List[RegulatorConfig] = Field(default_factory=list)
    ingestion_sources: List[IngestionSourceConfig] = Field(default_factory=list)
    calendar: CalendarConfig = Field(default_factory=CalendarConfig)
    dlcs_available: List[str] = Field(default_factory=list)

    # ------------------------------------------------------------------
    # Helpers de acceso rapido
    # ------------------------------------------------------------------

    def get_party(self, slug: str) -> Optional[PartyConfig]:
        return next((p for p in self.parties if p.slug == slug), None)

    def get_ingestion_source(self, source_id: str) -> Optional[IngestionSourceConfig]:
        return next((s for s in self.ingestion_sources if s.id == source_id), None)

    def get_media_outlet(self, slug: str) -> Optional[MediaOutletConfig]:
        return next((m for m in self.media_outlets if m.slug == slug), None)

    @property
    def parties_by_slug(self) -> Dict[str, PartyConfig]:
        return {p.slug: p for p in self.parties}

    @property
    def media_outlets_by_slug(self) -> Dict[str, MediaOutletConfig]:
        return {m.slug: m for m in self.media_outlets}

    @property
    def enabled_sources(self) -> List[IngestionSourceConfig]:
        return [s for s in self.ingestion_sources if s.enabled]

    @property
    def party_color_map(self) -> Dict[str, str]:
        """Devuelve {slug: color_hex} para graficos."""
        return {p.slug: p.color_hex for p in self.parties}
