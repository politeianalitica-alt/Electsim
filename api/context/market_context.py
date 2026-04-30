"""
MarketContext: objeto de contexto que encapsula el mercado activo.
Se inyecta via dependencia FastAPI en cualquier endpoint que lo necesite.
"""
from __future__ import annotations

from typing import Dict

from pydantic import BaseModel

from config.market_models import MarketConfig, MediaOutletConfig, PartyConfig


class MarketContext(BaseModel):
    """Contexto de mercado activo para una peticion o tarea."""

    model_config = {"arbitrary_types_allowed": True}

    market_code: str
    config: MarketConfig

    # ------------------------------------------------------------------
    # Accesos directos utiles en handlers y pipelines
    # ------------------------------------------------------------------

    @property
    def parties_by_slug(self) -> Dict[str, PartyConfig]:
        return self.config.parties_by_slug

    @property
    def media_outlets_by_slug(self) -> Dict[str, MediaOutletConfig]:
        return self.config.media_outlets_by_slug

    @property
    def party_color_map(self) -> Dict[str, str]:
        return self.config.party_color_map

    @property
    def timezone(self) -> str:
        return self.config.timezone

    @property
    def default_locale(self) -> str:
        return self.config.default_locale

    @property
    def country_iso(self) -> str:
        return self.config.political_system.country_iso

    def __repr__(self) -> str:
        return (
            f"MarketContext(code={self.market_code!r}, "
            f"parties={len(self.config.parties)}, "
            f"sources={len(self.config.ingestion_sources)})"
        )
