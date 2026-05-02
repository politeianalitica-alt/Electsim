"""
TimeSeriesProcessor — Procesamiento de series temporales economicas.

Requiere TimescaleDB (PostgreSQL + extension timescaledb) para operaciones
de agregacion temporal. No hay fallback a SQLite: el schema TimescaleDB
usa funciones especificas (time_bucket, first, last).

Para tests sin TimescaleDB disponible, usar mock_processor() que devuelve
datos sinteticos basados en pandas.

Schema TimescaleDB esperado:
  CREATE TABLE economic_series (
    time        TIMESTAMPTZ NOT NULL,
    source      TEXT NOT NULL,
    indicator   TEXT NOT NULL,
    geo         TEXT NOT NULL DEFAULT 'ES',
    value       DOUBLE PRECISION NOT NULL,
    unit        TEXT,
    frequency   TEXT,
    meta        JSONB DEFAULT '{}'
  );
  SELECT create_hypertable('economic_series', 'time', if_not_exists => TRUE);
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class TimeSeriesPoint:
    time: datetime
    source: str
    indicator: str
    geo: str
    value: float
    unit: str = ""
    frequency: str = "monthly"


@dataclass
class TimeSeriesSummary:
    indicator: str
    geo: str
    count: int
    latest_value: float
    latest_date: date
    min_value: float
    max_value: float
    mean_value: float
    trend: str = "estable"       # ascendente, descendente, estable
    pct_change_yoy: float | None = None


@dataclass
class ProcessedSeries:
    """Serie procesada lista para forecasting."""
    indicator: str
    geo: str
    dates: list[date] = field(default_factory=list)
    values: list[float] = field(default_factory=list)
    frequency: str = "monthly"
    unit: str = ""
    summary: TimeSeriesSummary | None = None

    def __len__(self) -> int:
        return len(self.values)

    def is_sufficient(self, min_points: int = 24) -> bool:
        """True si hay suficientes puntos para forecasting."""
        return len(self.values) >= min_points

    def to_pandas(self) -> Any:
        """Convierte a pandas Series con DatetimeIndex."""
        try:
            import pandas as pd
            return pd.Series(
                self.values,
                index=pd.to_datetime(self.dates),
                name=self.indicator,
            )
        except ImportError:
            return list(zip(self.dates, self.values))


# ---------------------------------------------------------------------------
# TimeSeriesProcessor
# ---------------------------------------------------------------------------

class TimeSeriesProcessor:
    """
    Procesa series temporales economicas desde TimescaleDB o datos en memoria.

    Para entornos de produccion: usa conexion a TimescaleDB.
    Para tests: usar from_data_points() con datos en memoria.

    Uso (produccion):
        processor = TimeSeriesProcessor(db_url=DATABASE_URL)
        await processor.upsert_points(data_points)
        series = await processor.get_processed("ipc_general", "ES")

    Uso (tests):
        processor = TimeSeriesProcessor.from_data_points(data_points)
        series = processor.get_processed_sync("ipc_general", "ES")
    """

    def __init__(self, db_url: str | None = None) -> None:
        self._db_url = db_url
        self._pool: Any = None
        self._in_memory: list[TimeSeriesPoint] = []

    @classmethod
    def from_data_points(
        cls, points: list[Any]
    ) -> "TimeSeriesProcessor":
        """Crea un processor con datos en memoria (sin BD)."""
        processor = cls()
        from etl.sources.economic_sources import EconomicDataPoint
        for p in points:
            if isinstance(p, EconomicDataPoint):
                processor._in_memory.append(TimeSeriesPoint(
                    time=datetime(p.date_.year, p.date_.month, p.date_.day),
                    source=p.source,
                    indicator=p.indicator,
                    geo=p.geo,
                    value=p.value,
                    unit=p.unit,
                    frequency=p.frequency,
                ))
        return processor

    async def connect(self) -> None:
        """Conecta al pool de TimescaleDB."""
        if not self._db_url:
            return
        try:
            import asyncpg
            self._pool = await asyncpg.create_pool(self._db_url, min_size=2, max_size=10)
            logger.info("TimeSeriesProcessor: conectado a TimescaleDB")
        except ImportError:
            logger.warning("asyncpg no disponible — TimeSeriesProcessor en modo memoria")
        except Exception as exc:
            logger.warning("TimeSeriesProcessor: no se pudo conectar: %s", exc)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def upsert_points(self, points: list[Any]) -> int:
        """
        Inserta o actualiza puntos en economic_series.
        Retorna el numero de puntos insertados.
        """
        from etl.sources.economic_sources import EconomicDataPoint

        ts_points = [
            TimeSeriesPoint(
                time=datetime(p.date_.year, p.date_.month, p.date_.day),
                source=p.source,
                indicator=p.indicator,
                geo=p.geo,
                value=p.value,
                unit=p.unit,
                frequency=p.frequency,
            )
            for p in points
            if isinstance(p, EconomicDataPoint)
        ]

        if not self._pool:
            # En memoria
            self._in_memory.extend(ts_points)
            return len(ts_points)

        inserted = 0
        async with self._pool.acquire() as conn:
            for p in ts_points:
                try:
                    await conn.execute("""
                        INSERT INTO economic_series
                            (time, source, indicator, geo, value, unit, frequency)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (time, source, indicator, geo) DO UPDATE
                            SET value = EXCLUDED.value
                    """, p.time, p.source, p.indicator, p.geo,
                        p.value, p.unit, p.frequency)
                    inserted += 1
                except Exception as exc:
                    logger.debug("upsert_point error: %s", exc)
        return inserted

    async def get_processed(
        self,
        indicator: str,
        geo: str = "ES",
        lookback_months: int = 36,
    ) -> ProcessedSeries:
        """
        Recupera y procesa una serie temporal.

        Si hay conexion a TimescaleDB: usa time_bucket.
        Si no: filtra los datos en memoria.
        """
        if self._pool:
            return await self._get_from_db(indicator, geo, lookback_months)
        return self._get_from_memory(indicator, geo)

    async def _get_from_db(
        self, indicator: str, geo: str, lookback_months: int
    ) -> ProcessedSeries:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT
                    time_bucket('1 month', time) AS period,
                    AVG(value) AS value
                FROM economic_series
                WHERE indicator = $1
                  AND geo = $2
                  AND time >= NOW() - ($3 || ' months')::INTERVAL
                GROUP BY period
                ORDER BY period
            """, indicator, geo, str(lookback_months))

        dates = [r["period"].date() for r in rows]
        values = [float(r["value"]) for r in rows]
        series = ProcessedSeries(
            indicator=indicator,
            geo=geo,
            dates=dates,
            values=values,
            frequency="monthly",
        )
        series.summary = self._compute_summary(indicator, geo, dates, values)
        return series

    def _get_from_memory(self, indicator: str, geo: str) -> ProcessedSeries:
        filtered = [
            p for p in self._in_memory
            if p.indicator == indicator and p.geo == geo
        ]
        filtered.sort(key=lambda p: p.time)

        dates = [p.time.date() for p in filtered]
        values = [p.value for p in filtered]
        freq = filtered[0].frequency if filtered else "monthly"

        series = ProcessedSeries(
            indicator=indicator,
            geo=geo,
            dates=dates,
            values=values,
            frequency=freq,
        )
        if dates and values:
            series.summary = self._compute_summary(indicator, geo, dates, values)
        return series

    def get_processed_sync(self, indicator: str, geo: str = "ES") -> ProcessedSeries:
        """Version sincrona para tests (solo datos en memoria)."""
        return self._get_from_memory(indicator, geo)

    @staticmethod
    def _compute_summary(
        indicator: str,
        geo: str,
        dates: list[date],
        values: list[float],
    ) -> TimeSeriesSummary:
        if not values:
            return TimeSeriesSummary(
                indicator=indicator, geo=geo, count=0,
                latest_value=0.0, latest_date=date.today(),
                min_value=0.0, max_value=0.0, mean_value=0.0,
            )

        latest_val = values[-1]
        trend = "estable"
        if len(values) >= 3:
            recent = sum(values[-3:]) / 3
            older = sum(values[-6:-3]) / 3 if len(values) >= 6 else values[0]
            if recent > older * 1.02:
                trend = "ascendente"
            elif recent < older * 0.98:
                trend = "descendente"

        # YoY change
        pct_yoy = None
        if len(values) >= 13:
            prev_year = values[-13]
            if prev_year != 0:
                pct_yoy = (values[-1] - prev_year) / abs(prev_year) * 100

        return TimeSeriesSummary(
            indicator=indicator,
            geo=geo,
            count=len(values),
            latest_value=latest_val,
            latest_date=dates[-1],
            min_value=min(values),
            max_value=max(values),
            mean_value=sum(values) / len(values),
            trend=trend,
            pct_change_yoy=pct_yoy,
        )

    async def list_indicators(self, geo: str = "ES") -> list[str]:
        """Lista indicadores disponibles para un pais."""
        if self._pool:
            async with self._pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT DISTINCT indicator FROM economic_series WHERE geo = $1 ORDER BY indicator",
                    geo,
                )
            return [r["indicator"] for r in rows]
        return list({p.indicator for p in self._in_memory if p.geo == geo})
