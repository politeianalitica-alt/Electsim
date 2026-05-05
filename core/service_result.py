"""
core/service_result.py — Resultado estándar para servicios ElectSim.

Permite que los dashboard services reporten si están en modo real,
demo, fallback, error o unavailable. La UI puede mostrar el estado
sin que los fallos sean silenciosos.

Uso:
    from core.service_result import ServiceResult, DataMode

    def cargar_datos() -> ServiceResult[list]:
        try:
            ...
            return ServiceResult(ok=True, data=rows, mode="real", source="postgres.crm_contacts")
        except Exception as exc:
            return ServiceResult(ok=False, data=[], mode="error", error_code="DB_ERROR", error_message=str(exc))
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

T = TypeVar("T")

DataMode = Literal["real", "demo", "fallback", "unavailable", "error"]


@dataclass
class ServiceResult(Generic[T]):
    """Resultado estándar para servicios de datos."""

    ok: bool
    data: T
    mode: DataMode = "real"
    warnings: list[str] = field(default_factory=list)
    error_code: str | None = None
    error_message: str | None = None
    source: str | None = None
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    # ── helpers ──────────────────────────────────────────────────────────────

    @classmethod
    def ok_real(cls, data: T, source: str | None = None) -> "ServiceResult[T]":
        return cls(ok=True, data=data, mode="real", source=source)

    @classmethod
    def ok_demo(cls, data: T, source: str | None = None) -> "ServiceResult[T]":
        return cls(ok=True, data=data, mode="demo", source=source)

    @classmethod
    def ok_fallback(cls, data: T, warning: str = "", source: str | None = None) -> "ServiceResult[T]":
        w = [warning] if warning else []
        return cls(ok=True, data=data, mode="fallback", warnings=w, source=source)

    @classmethod
    def err_unavailable(cls, empty: T, table: str = "") -> "ServiceResult[T]":
        return cls(
            ok=False, data=empty, mode="unavailable",
            error_code="TABLE_MISSING",
            error_message=f"Tabla '{table}' no disponible o DB no conectada.",
        )

    @classmethod
    def err_db(cls, empty: T, exc: Exception, source: str | None = None) -> "ServiceResult[T]":
        return cls(
            ok=False, data=empty, mode="error",
            error_code="DB_ERROR",
            error_message=str(exc),
            source=source,
        )

    # ── display helpers ───────────────────────────────────────────────────────

    def mode_badge(self) -> str:
        """Emoji badge para mostrar en UI."""
        return {
            "real": "🟢 real",
            "demo": "🟡 demo",
            "fallback": "🟠 fallback",
            "unavailable": "⚫ unavailable",
            "error": "🔴 error",
        }.get(self.mode, self.mode)

    def as_dict(self) -> dict:
        return {
            "ok": self.ok,
            "mode": self.mode,
            "source": self.source,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "warnings": self.warnings,
            "updated_at": self.updated_at,
        }
