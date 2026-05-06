# api/schemas/actors.py
from __future__ import annotations
from pydantic import BaseModel, Field
from api.schemas.status import DataMode


class ActorItem(BaseModel):
    id: str
    name: str
    party: str = ""
    party_color: str = "#94A3B8"
    role: str = ""
    bio: str = ""
    exposure: int = 0     # 0-100
    approval: int = 50    # 0-100
    sentiment: str = "stable"  # up | down | stable


class ActorsResponse(BaseModel):
    actors: list[ActorItem] = Field(default_factory=list)
    total: int
    mode: DataMode
