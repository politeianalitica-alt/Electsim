"""
Tests para economic_timeseries, economic_forecasting, itpe_engine, risk_integrator.

No requieren BD ni Ollama.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from agents.analysis.economic_timeseries import ProcessedSeries, TimeSeriesProcessor
from agents.analysis.economic_forecasting import (
    ForecastResult,
    GDPNowcaster,
    PoliticalEconomyCorrelator,
    SARIMAForecaster,
)
from etl.sources.economic_sources import (
    EconomicDataAggregator,
    EconomicDataPoint,
)


# ---------------------------------------------------------------------------
# EconomicDataPoint
# ---------------------------------------------------------------------------

class TestEconomicDataPoint:
    def test_to_dict(self):
        p = EconomicDataPoint(
            source="BDE",
            indicator="ipc_general",
            value=3.5,
            date_=date(2025, 1, 1),
            unit="%",
            frequency="monthly",
        )
        d = p.to_dict()
        assert d["source"] == "BDE"
        assert d["indicator"] == "ipc_general"
        assert d["value"] == 3.5
        assert d["date"] == "2025-01-01"


# ---------------------------------------------------------------------------
# EconomicDataAggregator
# ---------------------------------------------------------------------------

class TestEconomicDataAggregator:
    def test_to_indicator_dict_latest_per_indicator(self):
        points = [
            EconomicDataPoint("BDE", "ipc_general", 3.0, date(2025, 1, 1), "%", "monthly"),
            EconomicDataPoint("BDE", "ipc_general", 3.5, date(2025, 2, 1), "%", "monthly"),
            EconomicDataPoint("INE", "tasa_paro", 11.5, date(2025, 1, 1), "%", "quarterly"),
        ]
        result = EconomicDataAggregator.to_indicator_dict(points)
        # Solo los ultimos valores
        assert result["BDE_ipc_general"] == 3.5
        assert result["INE_tasa_paro"] == 11.5

    def test_to_dataframe_without_pandas(self):
        """to_dataframe debe funcionar aunque pandas retorne lista."""
        points = [
            EconomicDataPoint("BDE", "ipc", 3.0, date(2025, 1, 1)),
        ]
        # No raise aunque pandas no este disponible
        result = EconomicDataAggregator.to_dataframe(points)
        assert result is not None


# ---------------------------------------------------------------------------
# TimeSeriesProcessor
# ---------------------------------------------------------------------------

class TestTimeSeriesProcessor:
    def _make_points(self, n=24, indicator="ipc_general") -> list[EconomicDataPoint]:
        base = date(2023, 1, 1)
        return [
            EconomicDataPoint(
                source="BDE",
                indicator=indicator,
                value=float(2.0 + i * 0.1),
                date_=date(base.year + (base.month + i - 1) // 12,
                           (base.month + i - 1) % 12 + 1, 1),
                unit="%",
                frequency="monthly",
            )
            for i in range(n)
        ]

    def test_from_data_points(self):
        points = self._make_points(12)
        processor = TimeSeriesProcessor.from_data_points(points)
        series = processor.get_processed_sync("ipc_general")
        assert len(series.values) == 12
        assert len(series.dates) == 12

    def test_get_processed_sync_unknown_indicator(self):
        points = self._make_points(5)
        processor = TimeSeriesProcessor.from_data_points(points)
        series = processor.get_processed_sync("indicador_inexistente")
        assert len(series.values) == 0

    def test_is_sufficient(self):
        points = self._make_points(30)
        processor = TimeSeriesProcessor.from_data_points(points)
        series = processor.get_processed_sync("ipc_general")
        assert series.is_sufficient(24) is True
        assert series.is_sufficient(50) is False

    def test_summary_computed(self):
        points = self._make_points(24)
        processor = TimeSeriesProcessor.from_data_points(points)
        series = processor.get_processed_sync("ipc_general")
        assert series.summary is not None
        assert series.summary.count == 24
        assert series.summary.trend in ("ascendente", "descendente", "estable")

    def test_list_indicators_in_memory(self):
        points = (
            self._make_points(5, "ipc_general")
            + self._make_points(5, "tasa_paro")
        )
        processor = TimeSeriesProcessor.from_data_points(points)
        import asyncio
        indicators = asyncio.run(processor.list_indicators("ES"))
        assert "ipc_general" in indicators
        assert "tasa_paro" in indicators

    def test_compute_summary_trend_ascending(self):
        dates = [date(2023, i, 1) for i in range(1, 13)]
        values = list(range(1, 13))  # ascendente
        summary = TimeSeriesProcessor._compute_summary("test", "ES", dates, values)
        assert summary.trend == "ascendente"

    def test_compute_summary_trend_descending(self):
        dates = [date(2023, i, 1) for i in range(1, 13)]
        values = list(range(12, 0, -1))  # descendente
        summary = TimeSeriesProcessor._compute_summary("test", "ES", dates, values)
        assert summary.trend == "descendente"

    def test_upsert_in_memory(self):
        points = self._make_points(5)
        processor = TimeSeriesProcessor()
        import asyncio
        n = asyncio.run(processor.upsert_points(points))
        assert n == 5


# ---------------------------------------------------------------------------
# SARIMAForecaster
# ---------------------------------------------------------------------------

class TestSARIMAForecaster:
    def _make_series(self, n=36, indicator="ipc_general") -> ProcessedSeries:
        import math
        dates = []
        values = []
        base = date(2022, 1, 1)
        for i in range(n):
            m = (base.month + i - 1) % 12 + 1
            y = base.year + (base.month + i - 1) // 12
            dates.append(date(y, m, 1))
            values.append(2.0 + math.sin(i * 0.5) * 0.5 + i * 0.01)
        return ProcessedSeries(
            indicator=indicator, geo="ES",
            dates=dates, values=values, frequency="monthly"
        )

    def test_insufficient_data_returns_unavailable(self):
        sarima = SARIMAForecaster()
        series = ProcessedSeries(
            indicator="test", geo="ES",
            dates=[date(2025, 1, 1)],
            values=[3.0],
        )
        result = sarima.forecast(series, horizon_months=3)
        assert result.is_available is False
        assert "Insuficientes" in result.error_message

    def test_forecast_returns_result(self):
        sarima = SARIMAForecaster()
        series = self._make_series(36)
        result = sarima.forecast(series, horizon_months=6)
        # Puede fallar si statsmodels no esta, pero no debe hacer crash
        assert isinstance(result, ForecastResult)
        assert result.indicator == "ipc_general"
        if result.is_available:
            assert len(result.points) == 6


# ---------------------------------------------------------------------------
# GDPNowcaster
# ---------------------------------------------------------------------------

class TestGDPNowcaster:
    def _make_series_dict(self) -> dict[str, ProcessedSeries]:
        def make_series(indicator, n=24, base_val=2.0):
            return ProcessedSeries(
                indicator=indicator, geo="ES",
                dates=[date(2023, (i % 12) + 1, 1) for i in range(n)],
                values=[base_val + i * 0.05 for i in range(n)],
                frequency="monthly",
            )

        return {
            "pib_variacion": make_series("pib_variacion", n=12, base_val=1.5),
            "ipc_general": make_series("ipc_general", n=24, base_val=3.0),
            "tasa_paro": make_series("tasa_paro", n=24, base_val=12.0),
        }

    def test_nowcast_insufficient_pib(self):
        nowcaster = GDPNowcaster()
        result = nowcaster.nowcast({}, target_quarter=date(2026, 1, 1))
        assert result.is_available is False

    def test_nowcast_with_data(self):
        nowcaster = GDPNowcaster()
        series_dict = self._make_series_dict()
        result = nowcaster.nowcast(series_dict)
        # Puede fallar si sklearn no disponible, pero no crash
        assert isinstance(result, ForecastResult)
        if result.is_available:
            assert result.points is not None
            assert len(result.points) == 1


# ---------------------------------------------------------------------------
# PoliticalEconomyCorrelator
# ---------------------------------------------------------------------------

class TestPoliticalEconomyCorrelator:
    def _make_series(self, values, indicator="test") -> ProcessedSeries:
        n = len(values)
        return ProcessedSeries(
            indicator=indicator, geo="ES",
            dates=[date(2022, (i % 12) + 1, 1) for i in range(n)],
            values=values,
        )

    def test_correlate_returns_dict(self):
        corr = PoliticalEconomyCorrelator()
        eco = {
            "ipc_general": self._make_series([3.0 + i * 0.1 for i in range(24)], "ipc_general"),
            "tasa_paro": self._make_series([12.0 - i * 0.2 for i in range(24)], "tasa_paro"),
        }
        poll_series = self._make_series([30.0 + i * 0.1 for i in range(24)], "psoe_intencion")
        result = corr.correlate(eco, poll_series)
        assert isinstance(result, dict)
        if result:
            for v in result.values():
                assert -1.0 <= v <= 1.0

    def test_correlate_insufficient_poll(self):
        corr = PoliticalEconomyCorrelator()
        short_poll = self._make_series([30.0, 31.0], "psoe")
        result = corr.correlate({"ipc": self._make_series([3.0] * 10)}, short_poll)
        assert result == {}
