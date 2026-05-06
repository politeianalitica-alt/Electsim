# api/schemas/risk_overview.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


class RiskKpiItem(BaseModel):
    label: str
    value: int
    color: str  # "red" | "amber" | "blue" | "green"


class RiskSignalItem(BaseModel):
    title: str
    description: str
    probability: int
    impact: str  # "Alto" | "Medio" | "Bajo"


class RiskOverview(BaseModel):
    global_score: int           # 0-100
    level: str                  # "alto" | "medio" | "bajo"
    kpis: list[RiskKpiItem] = Field(default_factory=list)
    signals: list[RiskSignalItem] = Field(default_factory=list)
    spark: list[int] = Field(default_factory=list)
    trend_delta: int = 0
    mode: DataMode
