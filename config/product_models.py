"""
Modelos Pydantic para la configuracion declarativa de productos y modulos.

Un producto es una combinacion empaquetada de modulos + presets para un tipo
de cliente (War Room Electoral, Regulatory Radar, DLC Energia, etc.).
Los ficheros YAML viven en config/products/*.yaml y se cargan con product_loader.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Modulos disponibles en la plataforma
# ---------------------------------------------------------------------------

KNOWN_MODULES: set[str] = {
    # Nucleo
    "ontology_core",
    "alerts_core",
    # Electoral
    "electoral_core",
    "electoral_nowcasting",
    # Legislativo
    "legislative_core",
    "legislative_advanced",
    # Media y narrativas
    "media_narrative",
    # Geopolitica
    "geopolitics",
    # Inteligencia comunicativa y de crisis
    "comm_intel",
    "crisis_intel",
    # Herramientas de trabajo
    "investigation_canvas",
    "draft_studio",
    "intelligence_notebook",
    "workspaces",
    # Macro y sectorial
    "macro_econ",
    "macro_energy",
    "regulatory_energy",
    "regulatory_housing",
}


# ---------------------------------------------------------------------------
# Submodelos
# ---------------------------------------------------------------------------

class AlertConditionConfig(BaseModel):
    """Condicion de disparo de una alerta."""

    type: str                                       # 'poll_movement', 'narrative_threat', ...
    params: Dict[str, Any] = Field(default_factory=dict)


class AlertTemplateConfig(BaseModel):
    """Plantilla de alerta por defecto para un producto."""

    code: str
    name: str
    enabled: bool = True
    level: Literal["info", "medium", "high", "critical"] = "medium"
    channels: List[Literal["email", "telegram", "webhook"]] = Field(default_factory=list)
    conditions: AlertConditionConfig


class SavedSearchConfig(BaseModel):
    """Saved search o watchlist preconfigurada en un producto."""

    code: str
    name: str
    type: Literal["search", "watchlist"]
    semantic_query: Optional[str] = None
    watchlist_objects: List[Dict[str, Any]] = Field(default_factory=list)


class DashboardWidgetConfig(BaseModel):
    """Widget individual de un dashboard."""

    code: str                                       # 'nowcasting_overview', 'alerts_feed', ...
    params: Dict[str, Any] = Field(default_factory=dict)


class DashboardConfig(BaseModel):
    """Dashboard predefinido para un producto."""

    code: str
    name: str
    layout: str
    widgets: List[DashboardWidgetConfig] = Field(default_factory=list)


class DefaultWorkspaceConfig(BaseModel):
    """Configuracion inicial del workspace creado al activar el producto."""

    name: str
    client_profile: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Modelo principal
# ---------------------------------------------------------------------------

class ProductConfig(BaseModel):
    """
    Configuracion declarativa de un producto o DLC.

    Leida desde config/products/<code>.yaml.
    """

    code: str
    name: str
    market: str                                     # 'spain', 'eu', ...
    type: Literal["base_product", "dlc"]
    description: Optional[str] = None

    modules: List[str] = Field(default_factory=list)
    default_workspace: Optional[DefaultWorkspaceConfig] = None
    alerts: List[AlertTemplateConfig] = Field(default_factory=list)
    saved_searches: List[SavedSearchConfig] = Field(default_factory=list)
    dashboards: List[DashboardConfig] = Field(default_factory=list)

    @field_validator("modules")
    @classmethod
    def validate_modules(cls, v: List[str]) -> List[str]:
        """Acepta todos los modulos; emite advertencia para los no catalogados."""
        return list(dict.fromkeys(v))  # deduplica preservando orden

    @property
    def is_dlc(self) -> bool:
        return self.type == "dlc"

    @property
    def is_base_product(self) -> bool:
        return self.type == "base_product"

    @property
    def alert_codes(self) -> List[str]:
        return [a.code for a in self.alerts]

    @property
    def saved_search_codes(self) -> List[str]:
        return [s.code for s in self.saved_searches]

    @property
    def dashboard_codes(self) -> List[str]:
        return [d.code for d in self.dashboards]
