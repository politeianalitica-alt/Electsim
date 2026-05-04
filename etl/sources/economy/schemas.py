"""
Economy Schemas — Bloque 5.

Modelos Pydantic para el módulo de Inteligencia Económica.
Todos los providers producen MacroIndicator.
El detector produce EconomicSignal.
El scorer produce EconomicRiskScore.
El forecaster produce EconomicForecast.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


# ── MacroIndicator ────────────────────────────────────────────────────────────

class MacroIndicator(BaseModel):
    """Observación puntual de un indicador macroeconómico."""

    source: str = Field(..., description="Fuente original (ine, bde, eurostat, worldbank…)")
    provider: str = Field(..., description="Proveedor que generó el dato")
    indicator_id: str = Field(..., description="ID único del indicador en la fuente")
    name: str = Field(..., description="Nombre legible del indicador")

    geography: str = Field(default="ES", description="Código ISO del territorio")
    geography_type: Literal[
        "country", "ccaa", "province", "municipality", "eu", "global"
    ] = "country"

    frequency: Literal["daily", "weekly", "monthly", "quarterly", "annual"]
    date: date
    value: float

    unit: str | None = None
    seasonally_adjusted: bool | None = None
    category: str | None = None
    sector: str | None = None

    vintage_date: date | None = None
    release_date: date | None = None

    raw_payload: dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_db_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "provider": self.provider,
            "indicator_id": self.indicator_id,
            "name": self.name,
            "geography": self.geography,
            "geography_type": self.geography_type,
            "frequency": self.frequency,
            "date": self.date,
            "value": self.value,
            "unit": self.unit,
            "seasonally_adjusted": self.seasonally_adjusted,
            "category": self.category,
            "sector": self.sector,
            "vintage_date": self.vintage_date,
            "release_date": self.release_date,
            "raw_payload": json.dumps(self.raw_payload),
            "fetched_at": self.fetched_at,
        }


# ── EconomicSeries ────────────────────────────────────────────────────────────

class EconomicSeries(BaseModel):
    """Metadatos de una serie económica (sin los puntos de datos)."""

    source: str
    provider: str
    indicator_id: str
    name: str
    description: str | None = None

    geography: str = "ES"
    geography_type: str = "country"
    frequency: str | None = None
    unit: str | None = None
    category: str | None = None
    sector: str | None = None

    start_date: date | None = None
    end_date: date | None = None
    last_value: float | None = None
    last_date: date | None = None

    active: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── EconomicSignal ────────────────────────────────────────────────────────────

class EconomicSignal(BaseModel):
    """Señal económico-política detectada a partir de indicadores."""

    signal_type: Literal[
        "inflation_pressure",
        "unemployment_risk",
        "growth_slowdown",
        "debt_pressure",
        "housing_stress",
        "energy_price_shock",
        "consumer_confidence_drop",
        "fiscal_stress",
        "regional_divergence",
        "market_stress",
    ]

    indicator_id: str
    geography: str
    date: date

    current_value: float
    previous_value: float | None = None
    change_abs: float | None = None
    change_pct: float | None = None
    z_score: float | None = None

    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    confidence: float = Field(ge=0.0, le=1.0)
    explanation: str

    related_sectors: list[str] = Field(default_factory=list)
    related_parties: list[str] = Field(default_factory=list)
    related_narratives: list[str] = Field(default_factory=list)

    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── EconomicRiskScore — ITPE Económico ───────────────────────────────────────

class EconomicRiskScore(BaseModel):
    """Score de riesgo económico-político (ITPE Económico)."""

    geography: str = "ES"
    score_date: date = Field(default_factory=lambda: date.today(), alias="date")

    inflation_risk: float = 0.0
    unemployment_risk: float = 0.0
    growth_risk: float = 0.0
    fiscal_risk: float = 0.0
    housing_risk: float = 0.0
    energy_risk: float = 0.0
    market_risk: float = 0.0
    confidence_risk: float = 0.0

    total_score: float = 0.0
    level: Literal["BAJO", "MODERADO", "ALTO", "CRÍTICO"] = "BAJO"

    explanation: str = ""
    components: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}

    @model_validator(mode="after")
    def _set_level(self) -> "EconomicRiskScore":
        s = self.total_score
        if s >= 70:
            self.level = "CRÍTICO"
        elif s >= 50:
            self.level = "ALTO"
        elif s >= 35:
            self.level = "MODERADO"
        else:
            self.level = "BAJO"
        return self


# ── EconomicForecast ─────────────────────────────────────────────────────────

class EconomicForecast(BaseModel):
    """Predicción de un indicador para una fecha futura."""

    provider: str
    indicator_id: str
    geography: str = "ES"

    forecast_date: date = Field(default_factory=lambda: date.today())
    target_date: date
    horizon: int = Field(ge=1, description="Número de períodos al futuro")

    yhat: float
    yhat_lower: float | None = None
    yhat_upper: float | None = None

    model_name: str = "naive"
    model_version: str = "1.0"
    metrics: dict[str, Any] = Field(default_factory=dict)
    raw_payload: dict[str, Any] = Field(default_factory=dict)


# ── BudgetItem ────────────────────────────────────────────────────────────────

class BudgetItem(BaseModel):
    """Partida presupuestaria de una administración."""

    source: str
    budget_year: int

    administration: str = "AGE"  # Administración General del Estado
    programme_code: str | None = None
    programme_name: str | None = None
    chapter: str | None = None
    ministry: str | None = None

    geography: str | None = None
    sector: str | None = None

    initial_credit: float | None = None
    final_credit: float | None = None
    executed_amount: float | None = None
    execution_rate: float | None = None

    raw_payload: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _compute_execution_rate(self) -> "BudgetItem":
        if self.execution_rate is None and self.executed_amount is not None:
            # Prefer final_credit, fall back to initial_credit
            base = self.final_credit or self.initial_credit
            if base:
                try:
                    self.execution_rate = round(
                        float(self.executed_amount) / float(base), 4
                    )
                except ZeroDivisionError:
                    pass
        return self


# ── ProviderHealth ────────────────────────────────────────────────────────────

class ProviderHealth(BaseModel):
    """Estado de salud de un provider económico."""

    provider: str
    status: Literal["ok", "degraded", "error", "disabled"]
    latency_ms: float | None = None
    last_check: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    message: str = ""
    n_series: int = 0


# ── ProviderFetchResult ───────────────────────────────────────────────────────

class ProviderFetchResult(BaseModel):
    """Resultado de una operación fetch en un provider."""

    provider: str
    indicator_id: str
    geography: str = "ES"

    success: bool
    n_observations: int = 0
    indicators: list[MacroIndicator] = Field(default_factory=list)
    error: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ── Constantes de indicadores core ───────────────────────────────────────────

CORE_INDICATOR_IDS: list[str] = [
    # Crecimiento
    "pib_yoy",
    "pib_qoq",
    "ipi",
    "ventas_minoristas",
    # Precios
    "ipc",
    "ipc_subyacente",
    "ipc_energia",
    "ipc_alimentos",
    # Mercado laboral
    "paro_epa",
    "afiliacion_ss",
    "salarios",
    # Fiscal
    "deuda_pib",
    "deficit_pib",
    # Mercado financiero
    "prima_riesgo",
    "bono_10y",
    # Confianza / Consumo
    "confianza_consumidor",
    "ventas_minoristas",
    # Social / Vivienda
    "precio_vivienda",
    "ipc_alquiler",
    # Energía
    "precio_electricidad",
]

# Categorías de indicadores
INDICATOR_CATEGORIES: dict[str, list[str]] = {
    "crecimiento": ["pib_yoy", "pib_qoq", "ipi", "ventas_minoristas"],
    "precios": ["ipc", "ipc_subyacente", "ipc_energia", "ipc_alimentos"],
    "laboral": ["paro_epa", "afiliacion_ss", "salarios"],
    "fiscal": ["deuda_pib", "deficit_pib"],
    "mercado": ["prima_riesgo", "bono_10y"],
    "confianza": ["confianza_consumidor"],
    "vivienda": ["precio_vivienda", "ipc_alquiler"],
    "energia": ["precio_electricidad"],
}
