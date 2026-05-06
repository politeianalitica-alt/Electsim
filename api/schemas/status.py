"""
Shared envelope schemas for data-mode transparency.
Every API response wraps its payload in ApiEnvelope so the frontend
can always know whether data is real, demo, fallback, or error.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

DataMode = Literal["real", "demo", "fallback", "error"]

T = TypeVar("T")


class ModeMeta(BaseModel):
    """Metadata that accompanies every API response."""

    model_config = ConfigDict(frozen=True)

    mode: DataMode
    source: str = ""
    message: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ApiEnvelope(BaseModel, Generic[T]):
    """Generic wrapper for all Politeia API responses."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    data: T
    meta: ModeMeta

    @classmethod
    def real(cls, data: T, source: str = "", message: str = "") -> "ApiEnvelope[T]":
        return cls(data=data, meta=ModeMeta(mode="real", source=source, message=message))

    @classmethod
    def demo(cls, data: T, source: str = "demo", message: str = "") -> "ApiEnvelope[T]":
        return cls(data=data, meta=ModeMeta(mode="demo", source=source, message=message))

    @classmethod
    def fallback(cls, data: T, source: str = "", message: str = "") -> "ApiEnvelope[T]":
        return cls(data=data, meta=ModeMeta(mode="fallback", source=source, message=message))

    @classmethod
    def error(cls, data: T, source: str = "", message: str = "") -> "ApiEnvelope[T]":
        return cls(data=data, meta=ModeMeta(mode="error", source=source, message=message))
