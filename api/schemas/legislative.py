# api/schemas/legislative.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


class BoeItem(BaseModel):
    boe_no: str | None = None
    title: str
    section: str = ""
    department: str = ""
    date: str
    url: str | None = None
    type: str = ""
    relevance: str = "media"


class BoeResponse(BaseModel):
    items: list[BoeItem] = Field(default_factory=list)
    date: str
    mode: DataMode
    total: int


class Initiative(BaseModel):
    id: str
    title: str
    type: str = ""
    proponent: str = ""
    status: str = "Pendiente"
    submitted_at: str | None = None
    urgency: str = "low"  # low | medium | high


class InitiativesResponse(BaseModel):
    items: list[Initiative] = Field(default_factory=list)
    mode: DataMode
    total: int
    active: int
    critical: int


class LegislativeKpis(BaseModel):
    active_initiatives: int
    approved_this_month: int
    critical_tramitation: int
    upcoming_votes: int
    mode: DataMode
