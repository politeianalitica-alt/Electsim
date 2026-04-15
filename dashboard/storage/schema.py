"""Esquemas tipados de datos del dashboard."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Poll(BaseModel):
    """Encuesta normalizada para capa silver."""

    poll_id: str
    pollster: str
    fieldwork_start: date
    fieldwork_end: date
    sample_size: int = Field(ge=1)
    election_type: Literal["general", "autonomica", "municipal", "europea"]
    territory_code: str
    party: str
    estimate: float = Field(ge=0, le=100)
    margin_of_error: float = Field(ge=0)
    raw_source: str


class MacroIndicator(BaseModel):
    """Serie macroeconómica normalizada."""

    indicator: Literal["unemployment", "ipc", "gdp", "debt"]
    period: date
    value: float
    unit: str
    territory: str = "ES"


class SimulationResult(BaseModel):
    """Output del simulador LLM existente."""

    run_id: str
    timestamp: datetime
    election_type: str
    territory: str
    party: str
    simulated_share: float = Field(ge=0, le=100)
    n_personas: int = Field(ge=1)
    model_version: str
    pipeline_config: dict

