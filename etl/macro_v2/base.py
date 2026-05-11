"""
Base utilities for the Macro Finance v2 ETL.

Same pattern as etl/risk_v2/base.py: connectors return RawValue lists,
the base persists into macro_raw_values / macro_pair_values and updates
source health in macro_source_catalog.
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
    source_id:    str
    country_iso2: str          # 'WO' for global
    metric_name:  str
    metric_value: float
    reference_date: date
    unit:         str = ""
    region_code:  Optional[str] = None


@dataclass
class PairValue:
    source_id:    str
    reporter_iso2:  str
    counterparty:   str        # ISO2 or 'W00' for world
    metric_name:    str
    metric_value:   float
    reference_date: date
    unit:           str = ""


@dataclass
class IngestResult:
    source_id:   str
    n_rows:      int = 0
    n_pairs:     int = 0
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
        logger.warning("macro_v2.base._engine: %s", exc)
        return None


def persist(values: list[RawValue]) -> int:
    if not values:
        return 0
    eng = _engine()
    if eng is None:
        return 0
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as conn:
            for v in values:
                conn.execute(sa_text("""
                    INSERT INTO macro_raw_values
                    (source_id, country_iso2, region_code, metric_name, metric_value, reference_date, unit)
                    VALUES (:s, :c, :r, :m, :v, :d, :u)
                    ON CONFLICT (source_id, country_iso2, metric_name, reference_date)
                    DO UPDATE SET metric_value = EXCLUDED.metric_value, unit = EXCLUDED.unit, ingested_at = NOW()
                """), {
                    "s": v.source_id, "c": v.country_iso2, "r": v.region_code,
                    "m": v.metric_name, "v": float(v.metric_value),
                    "d": v.reference_date, "u": v.unit,
                })
        return len(values)
    except Exception as exc:
        logger.warning("macro_v2 persist failed: %s", exc)
        return 0


def persist_pairs(values: list[PairValue]) -> int:
    if not values:
        return 0
    eng = _engine()
    if eng is None:
        return 0
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as conn:
            for v in values:
                conn.execute(sa_text("""
                    INSERT INTO macro_pair_values
                    (source_id, reporter_iso2, counterparty, metric_name, metric_value, reference_date, unit)
                    VALUES (:s, :r, :cp, :m, :v, :d, :u)
                    ON CONFLICT (source_id, reporter_iso2, counterparty, metric_name, reference_date)
                    DO UPDATE SET metric_value = EXCLUDED.metric_value, unit = EXCLUDED.unit, ingested_at = NOW()
                """), {
                    "s": v.source_id, "r": v.reporter_iso2, "cp": v.counterparty,
                    "m": v.metric_name, "v": float(v.metric_value),
                    "d": v.reference_date, "u": v.unit,
                })
        return len(values)
    except Exception as exc:
        logger.warning("macro_v2 persist_pairs failed: %s", exc)
        return 0


def update_source_status(source_id: str, ok: bool, error: Optional[str] = None) -> None:
    eng = _engine()
    if eng is None:
        return
    from sqlalchemy import text as sa_text
    try:
        with eng.begin() as conn:
            conn.execute(sa_text("""
                UPDATE macro_source_catalog
                SET last_fetch = NOW(),
                    last_error = CASE WHEN :ok THEN NULL ELSE :err END
                WHERE source_id = :s
            """), {"s": source_id, "ok": ok, "err": error})
    except Exception:
        pass


class MacroConnector(ABC):
    source_id: str = "unknown"
    is_stub:   bool = False

    @abstractmethod
    def fetch(self) -> tuple[list[RawValue], list[PairValue]]:
        """Return (raw_values, pair_values). Either list may be empty."""

    def run(self) -> IngestResult:
        started = datetime.now()
        result = IngestResult(source_id=self.source_id, is_stub=self.is_stub)
        try:
            raw, pairs = self.fetch()
            result.n_rows  = persist(raw)
            result.n_pairs = persist_pairs(pairs)
            result.n_metrics = len({v.metric_name for v in raw}) + len({v.metric_name for v in pairs})
            result.countries = sorted({v.country_iso2 for v in raw} | {v.reporter_iso2 for v in pairs})
            update_source_status(self.source_id, ok=True)
        except Exception as exc:
            logger.warning("Connector %s failed: %s", self.source_id, exc)
            result.error = f"{type(exc).__name__}: {exc}"
            update_source_status(self.source_id, ok=False, error=str(exc))
        finally:
            result.duration_ms = int((datetime.now() - started).total_seconds() * 1000)
        return result
