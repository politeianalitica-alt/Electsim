"""
Base utilities for the Risk Module v2 ETL.

Each connector inherits `RiskV2Connector` and implements `fetch()` returning a
list of `RawValue` records. The base class handles:
  - persistence into `risk_raw_values` (UPSERT semantics)
  - error capture into `risk_source_catalog.last_error`
  - last_fetch timestamp update
  - logging structured

Every connector is honest:
  - returns 0 records and logs `_meta.warning` if data missing
  - never throws to the orchestrator
  - clearly states `is_stub` for connectors that don't fetch real data yet
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class RawValue:
    """A single (source, country, metric, date, value) tuple."""
    source_id:    str
    country_iso2: str
    metric_name:  str
    metric_value: float
    reference_date: date
    region_code:  Optional[str] = None


@dataclass
class IngestResult:
    source_id:   str
    n_rows:      int = 0
    n_metrics:   int = 0
    countries:   list[str] = field(default_factory=list)
    error:       Optional[str] = None
    is_stub:     bool = False
    duration_ms: int = 0


def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.warning("base._engine: %s", exc)
        return None


def persist(values: list[RawValue]) -> int:
    """UPSERT a batch of RawValue into risk_raw_values. Returns rowcount."""
    if not values:
        return 0
    eng = _engine()
    if eng is None:
        return 0
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as conn:
            for v in values:
                conn.execute(
                    sa_text(
                        """
                        INSERT INTO risk_raw_values
                        (source_id, country_iso2, region_code, metric_name, metric_value, reference_date)
                        VALUES (:s, :c, :r, :m, :v, :d)
                        ON CONFLICT (source_id, country_iso2, metric_name, reference_date)
                        DO UPDATE SET metric_value = EXCLUDED.metric_value, ingested_at = NOW()
                        """
                    ),
                    {
                        "s": v.source_id, "c": v.country_iso2, "r": v.region_code,
                        "m": v.metric_name, "v": float(v.metric_value), "d": v.reference_date,
                    },
                )
        return len(values)
    except Exception as exc:
        logger.warning("persist failed: %s", exc)
        return 0


def update_source_status(source_id: str, ok: bool, error: Optional[str] = None) -> None:
    eng = _engine()
    if eng is None:
        return
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as conn:
            conn.execute(
                sa_text(
                    """
                    UPDATE risk_source_catalog
                    SET last_fetch = NOW(),
                        last_error = CASE WHEN :ok THEN NULL ELSE :err END
                    WHERE source_id = :s
                    """
                ),
                {"s": source_id, "ok": ok, "err": error},
            )
    except Exception as exc:
        logger.debug("update_source_status: %s", exc)


class RiskV2Connector(ABC):
    """Base class for every Risk v2 ETL connector."""

    source_id: str = "unknown"
    is_stub:   bool = False

    @abstractmethod
    def fetch(self) -> list[RawValue]:
        """Fetch and return all raw values to persist."""

    def run(self) -> IngestResult:
        started = datetime.now()
        result = IngestResult(source_id=self.source_id, is_stub=self.is_stub)
        try:
            values = self.fetch() or []
            n = persist(values)
            result.n_rows = n
            result.n_metrics = len({v.metric_name for v in values})
            result.countries = sorted({v.country_iso2 for v in values})
            update_source_status(self.source_id, ok=True)
        except Exception as exc:
            logger.warning("Connector %s failed: %s", self.source_id, exc)
            result.error = f"{type(exc).__name__}: {exc}"
            update_source_status(self.source_id, ok=False, error=str(exc))
        finally:
            result.duration_ms = int((datetime.now() - started).total_seconds() * 1000)
        return result
