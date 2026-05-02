"""
Modelos Pydantic para el catalogo dinamico de ElectSim.

Principio: todo es datos, nada es if pais == 'ES'.
Los modelos reflejan las tablas catalog_* de la migracion 0028.

Uso:
    from config.catalog_models import CatalogMarket, CatalogSector, CatalogSource
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Tipos enumerados (como Literal para evitar dependencia de enum de SQLAlchemy)
# ---------------------------------------------------------------------------

MarketScope = Literal["national", "regional", "supranational", "municipal"]

SourceKind = Literal[
    "legislative",
    "electoral",
    "socioeconomic",
    "press",
    "geopolitical",
    "regulatory",
    "archive",
    "corporate",
]

SourceProtocol = Literal[
    "rest_json",
    "rss",
    "rss_multi",
    "sparql",
    "http_bulk",
    "oai_pmh",
    "websocket",
    "graphql",
]


# ---------------------------------------------------------------------------
# CatalogMarket
# ---------------------------------------------------------------------------

class CatalogMarket(BaseModel):
    """Mercado politico o sectorial soportado por la plataforma."""

    market_id: str = Field(..., description="Identificador unico, ej: 'ES', 'EU', 'ES-CAT'")
    name: str
    scope: MarketScope = "national"
    default_currency: str = "EUR"
    default_language: str = "es"
    default_locale: str = "es-ES"
    timezone: str = "Europe/Madrid"
    country_iso: Optional[str] = None
    region_iso: Optional[str] = None
    enabled: bool = True
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# CatalogSector
# ---------------------------------------------------------------------------

class CatalogSector(BaseModel):
    """Sector de analisis: PARTY, ENERGY, BANKING, DEFENCE, IBEX, ..."""

    sector_id: str = Field(..., description="Identificador unico, ej: 'PARTY', 'ENERGY'")
    name: str
    parent_sector_id: Optional[str] = None
    naics_nace_codes: List[str] = Field(default_factory=list)
    applicable_markets: List[str] = Field(default_factory=lambda: ["*"])
    enabled: bool = True
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)

    def applies_to_market(self, market_id: str) -> bool:
        """True si este sector es aplicable al mercado dado."""
        return "*" in self.applicable_markets or market_id in self.applicable_markets


# ---------------------------------------------------------------------------
# CatalogModule
# ---------------------------------------------------------------------------

class CatalogModule(BaseModel):
    """Modulo funcional de la plataforma (unidad de activacion por workspace)."""

    module_id: str = Field(..., description="Ej: 'MONITOR_LEGISLATIVO', 'ELECTSIM'")
    name: str
    description: Optional[str] = None
    required_entities: List[str] = Field(default_factory=list)
    required_sources: List[str] = Field(default_factory=list)
    required_features: List[str] = Field(default_factory=list)
    applicable_markets: List[str] = Field(default_factory=lambda: ["*"])
    applicable_sectors: List[str] = Field(default_factory=lambda: ["*"])
    enabled: bool = True
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)

    def applies_to(self, market_id: str, sector_id: str) -> bool:
        """True si este modulo es aplicable al par (mercado, sector) dado."""
        market_ok = "*" in self.applicable_markets or market_id in self.applicable_markets
        sector_ok = "*" in self.applicable_sectors or sector_id in self.applicable_sectors
        return market_ok and sector_ok


# ---------------------------------------------------------------------------
# CatalogProduct
# ---------------------------------------------------------------------------

class CatalogProduct(BaseModel):
    """Producto comercial: combinacion de modulos para un mercado/sector especifico."""

    product_id: str = Field(..., description="Ej: 'PARTY_WARROOM_ES', 'IBEX_REG_RADAR'")
    name: str
    description: Optional[str] = None
    is_dlc: bool = False
    default_modules: List[str] = Field(default_factory=list)
    target_markets: List[str] = Field(default_factory=lambda: ["*"])
    target_sectors: List[str] = Field(default_factory=lambda: ["*"])
    config_overrides: Dict[str, Any] = Field(default_factory=dict)
    price_tier: Optional[str] = None
    enabled: bool = True
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)

    def compatible_with(self, market_id: str, sector_ids: List[str]) -> bool:
        """True si este producto es compatible con el mercado y al menos un sector."""
        market_ok = "*" in self.target_markets or market_id in self.target_markets
        if not market_ok:
            return False
        if "*" in self.target_sectors:
            return True
        return any(s in self.target_sectors for s in sector_ids)


# ---------------------------------------------------------------------------
# CatalogSource
# ---------------------------------------------------------------------------

class CatalogSource(BaseModel):
    """Fuente de datos con su protocolo, URL base y configuracion de ingesta."""

    source_id: str = Field(..., description="Ej: 'BOE', 'ACLED', 'CIS_MICRODATOS'")
    name: str
    description: Optional[str] = None
    kind: SourceKind = "legislative"
    protocol: SourceProtocol = "rest_json"
    base_url: Optional[str] = None
    schedule_cron: str = "0 6 * * *"
    applicable_markets: List[str] = Field(default_factory=lambda: ["*"])
    applicable_sectors: List[str] = Field(default_factory=lambda: ["*"])
    config_json: Dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True
    requires_api_key: bool = False
    api_key_env_var: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)

    def applies_to_market(self, market_id: str) -> bool:
        return "*" in self.applicable_markets or market_id in self.applicable_markets

    def applies_to_sector(self, sector_id: str) -> bool:
        return "*" in self.applicable_sectors or sector_id in self.applicable_sectors

    def applies_to(self, market_id: str, sector_ids: List[str]) -> bool:
        """True si la fuente es aplicable al mercado y a al menos un sector."""
        if not self.applies_to_market(market_id):
            return False
        if "*" in self.applicable_sectors:
            return True
        return any(self.applies_to_sector(s) for s in sector_ids)


# ---------------------------------------------------------------------------
# WorkspaceCatalogContext — vista consolidada para un workspace
# ---------------------------------------------------------------------------

class WorkspaceCatalogContext(BaseModel):
    """
    Contexto de catalogo resuelto para un workspace especifico.
    Generado por CatalogLoader.resolve_workspace_context().
    """

    market: CatalogMarket
    sectors: List[CatalogSector]
    active_modules: List[CatalogModule]
    active_products: List[CatalogProduct]
    active_sources: List[CatalogSource]
    data_retention_days: int = 365
    alert_prefs: Dict[str, Any] = Field(default_factory=dict)

    @property
    def module_ids(self) -> List[str]:
        return [m.module_id for m in self.active_modules]

    @property
    def source_ids(self) -> List[str]:
        return [s.source_id for s in self.active_sources]

    @property
    def sector_ids(self) -> List[str]:
        return [s.sector_id for s in self.sectors]

    def has_module(self, module_id: str) -> bool:
        return module_id in self.module_ids

    def has_source(self, source_id: str) -> bool:
        return source_id in self.source_ids

    def get_source(self, source_id: str) -> Optional[CatalogSource]:
        return next((s for s in self.active_sources if s.source_id == source_id), None)
