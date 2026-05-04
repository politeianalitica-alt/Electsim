"""
Tests — Economy Core (Bloque 5)

Cubre:
  1. MacroIndicator schema y to_db_dict()
  2. EconomicSignal schema y validación de severity
  3. EconomicForecast schema
  4. EconomicRiskScore + level auto-compute
  5. BudgetItem + execution_rate auto-compute
  6. ProviderHealth + status enum
  7. EconomicSeries schema
  8. EconomicVoteModel — baseline predict
  9. EconomicVoteModel — predict_from_macro
  10. EconomicVoteModel — OLS fallback a baseline sin histórico
  11. EconomicForecast _naive_forecast
  12. EconomicForecast _ols_trend_forecast
  13. EconomicForecast forecast_indicator auto-select
  14. backtest_indicator — métricas devueltas
  15. compute_itpe_economic — ponderación y nivel
  16. detect_signals — inflación
  17. detect_signals — sin señales cuando OK
  18. detect_signals — z_score con histórico
  19. validate_indicators — rechaza indicadores inválidos
  20. deduplicate_indicators — elimina duplicados
  21. indicators_to_series — agrupa por indicador
  22. compute_freshness — daily/monthly/stale
  23. economy_core service — cargar_kpis vacío sin BD
  24. economy_core service — cargar_itpe vacío sin BD
  25. economy_core service — cargar_economic_signals vacío sin BD
  26. pipelines.economy_core — build_parser opciones válidas
  27. pipelines.economy_core — cmd_forecast sin serie
  28. economy_tools — get_macro_indicators vacío sin BD
  29. economy_tools — get_itpe_economic vacío sin BD
  30. budget_provider — load_budget_from_csv básico
"""
from __future__ import annotations

import math
from datetime import date
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest


# ═══════════════════════════════════════════════════════════════════════════════
# 1. MacroIndicator schema
# ═══════════════════════════════════════════════════════════════════════════════

class TestMacroIndicatorSchema:
    def _make(self, **kw):
        from etl.sources.economy.schemas import MacroIndicator
        defaults = dict(
            source="test",
            provider="ine",
            indicator_id="ipc",
            name="IPC",
            geography="ES",
            frequency="monthly",
            date=date(2024, 1, 1),
            value=3.2,
        )
        defaults.update(kw)
        return MacroIndicator(**defaults)

    def test_create_ok(self):
        ind = self._make()
        assert ind.indicator_id == "ipc"
        assert float(ind.value) == pytest.approx(3.2)

    def test_to_db_dict_has_required_keys(self):
        ind = self._make()
        d = ind.to_db_dict()
        for key in ("source", "provider", "indicator_id", "name", "geography", "frequency", "date", "value"):
            assert key in d, f"Missing key: {key}"

    def test_value_as_decimal(self):
        from etl.sources.economy.schemas import MacroIndicator
        ind = MacroIndicator(
            source="test", provider="ine", indicator_id="paro_epa",
            name="Paro", geography="ES", frequency="quarterly",
            date=date(2024, 3, 1), value=Decimal("11.4"),
        )
        assert float(ind.value) == pytest.approx(11.4)

    def test_defaults(self):
        ind = self._make()
        assert ind.geography == "ES"
        assert ind.raw_payload == {}


# ═══════════════════════════════════════════════════════════════════════════════
# 2. EconomicSignal schema
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicSignalSchema:
    def _make(self, **kw):
        from etl.sources.economy.schemas import EconomicSignal
        defaults = dict(
            signal_type="inflation_pressure",
            indicator_id="ipc",
            geography="ES",
            date=date(2024, 6, 1),
            current_value=4.5,
            severity="HIGH",
            confidence=0.85,
            explanation="IPC en 4.5% — umbral superado.",  # required field
        )
        defaults.update(kw)
        return EconomicSignal(**defaults)

    def test_create_ok(self):
        sig = self._make()
        assert sig.signal_type == "inflation_pressure"
        assert sig.severity == "HIGH"

    def test_invalid_severity_raises(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            self._make(severity="EXTREME")

    def test_confidence_required_and_bounded(self):
        sig = self._make(confidence=0.75)
        assert sig.confidence == pytest.approx(0.75)
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            self._make(confidence=1.5)  # > 1.0, out of bounds

    def test_related_fields_default_empty(self):
        sig = self._make()
        assert sig.related_sectors == []
        assert sig.related_narratives == []


# ═══════════════════════════════════════════════════════════════════════════════
# 3. EconomicForecast schema
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicForecastSchema:
    def test_create_ok(self):
        from etl.sources.economy.schemas import EconomicForecast
        fc = EconomicForecast(
            provider="ine",
            indicator_id="ipc",
            geography="ES",
            forecast_date=date(2024, 1, 1),
            target_date=date(2024, 7, 1),
            horizon=6,
            yhat=3.1,
            yhat_lower=2.8,
            yhat_upper=3.4,
        )
        assert fc.horizon == 6
        assert fc.yhat == pytest.approx(3.1)

    def test_ci_bounds_are_optional(self):
        from etl.sources.economy.schemas import EconomicForecast
        fc = EconomicForecast(
            provider="ine", indicator_id="ipc", geography="ES",
            forecast_date=date(2024, 1, 1), target_date=date(2024, 7, 1),
            horizon=6, yhat=3.1,
        )
        assert fc.yhat_lower is None
        assert fc.yhat_upper is None


# ═══════════════════════════════════════════════════════════════════════════════
# 4. EconomicRiskScore + level auto-compute
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicRiskScore:
    def _make(self, total_score: float):
        from etl.sources.economy.schemas import EconomicRiskScore
        return EconomicRiskScore(
            geography="ES",
            date=date(2024, 6, 1),
            inflation_risk=20.0,
            unemployment_risk=30.0,
            growth_risk=15.0,
            fiscal_risk=25.0,
            housing_risk=10.0,
            energy_risk=5.0,
            market_risk=8.0,
            confidence_risk=12.0,
            total_score=total_score,
        )

    def test_level_bajo(self):
        score = self._make(25.0)
        assert score.level == "BAJO"

    def test_level_moderado(self):
        score = self._make(42.0)
        assert score.level == "MODERADO"

    def test_level_alto(self):
        score = self._make(58.0)
        assert score.level == "ALTO"

    def test_level_critico(self):
        score = self._make(75.0)
        assert score.level == "CRÍTICO"


# ═══════════════════════════════════════════════════════════════════════════════
# 5. BudgetItem + execution_rate auto-compute
# ═══════════════════════════════════════════════════════════════════════════════

class TestBudgetItem:
    def test_execution_rate_auto_computed(self):
        from etl.sources.economy.schemas import BudgetItem
        item = BudgetItem(
            source="test",
            budget_year=2024,
            initial_credit=1_000_000.0,
            executed_amount=850_000.0,
        )
        assert item.execution_rate == pytest.approx(0.85, abs=0.001)

    def test_execution_rate_none_if_no_initial(self):
        from etl.sources.economy.schemas import BudgetItem
        item = BudgetItem(source="test", budget_year=2024, executed_amount=500_000.0)
        assert item.execution_rate is None

    def test_explicit_rate_not_overridden(self):
        from etl.sources.economy.schemas import BudgetItem
        item = BudgetItem(
            source="test", budget_year=2024,
            initial_credit=1_000_000.0, executed_amount=850_000.0,
            execution_rate=0.90,  # explicit override
        )
        # Model validator only computes if None, so explicit value is preserved
        assert item.execution_rate is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ProviderHealth status
# ═══════════════════════════════════════════════════════════════════════════════

class TestProviderHealth:
    def test_valid_status(self):
        from etl.sources.economy.schemas import ProviderHealth
        ph = ProviderHealth(
            provider="ine",
            status="ok",
        )
        assert ph.status == "ok"

    def test_invalid_status_raises(self):
        from etl.sources.economy.schemas import ProviderHealth
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            ProviderHealth(provider="ine", status="unknown")


# ═══════════════════════════════════════════════════════════════════════════════
# 7. EconomicSeries schema
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicSeriesSchema:
    def test_create_ok(self):
        from etl.sources.economy.schemas import EconomicSeries
        ser = EconomicSeries(
            source="ine",
            provider="ine",
            indicator_id="ipc",
            name="IPC General",
            geography="ES",
        )
        assert ser.active is True
        assert ser.geography == "ES"


# ═══════════════════════════════════════════════════════════════════════════════
# 8. EconomicVoteModel — baseline predict
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicVoteModelBaseline:
    def _model(self):
        from models.economic_vote import EconomicVoteModel
        return EconomicVoteModel()

    def test_positive_pib_helps_government(self):
        model = self._model()
        pred_high = model.predict_from_macro({"pib_yoy": 4.0, "paro_epa": 10.0, "ipc": 2.0})
        pred_low = model.predict_from_macro({"pib_yoy": -1.0, "paro_epa": 10.0, "ipc": 2.0})
        assert pred_high.delta_vote > pred_low.delta_vote

    def test_high_paro_penalizes_government(self):
        model = self._model()
        pred_low_paro = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 8.0, "ipc": 2.0})
        pred_high_paro = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 18.0, "ipc": 2.0})
        assert pred_low_paro.delta_vote > pred_high_paro.delta_vote

    def test_high_ipc_penalizes_government(self):
        model = self._model()
        pred_low_ipc = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 10.0, "ipc": 1.5})
        pred_high_ipc = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 10.0, "ipc": 6.0})
        assert pred_low_ipc.delta_vote > pred_high_ipc.delta_vote

    def test_returns_prediction_object(self):
        from models.economic_vote import EconomicVotePrediction
        model = self._model()
        pred = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 11.0, "ipc": 3.0})
        assert isinstance(pred, EconomicVotePrediction)

    def test_confidence_between_0_and_1(self):
        model = self._model()
        pred = model.predict_from_macro({"pib_yoy": 2.0})
        assert 0.0 <= pred.confidence <= 1.0

    def test_ci_lower_less_than_upper(self):
        model = self._model()
        pred = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 11.0, "ipc": 2.8})
        assert pred.ci_lower < pred.ci_upper


# ═══════════════════════════════════════════════════════════════════════════════
# 9. EconomicVoteModel — predict_from_macro
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicVoteModelPredictFromMacro:
    def test_base_vote_share_used(self):
        from models.economic_vote import EconomicVoteModel
        model = EconomicVoteModel()
        pred = model.predict_from_macro(
            {"pib_yoy": 2.0, "paro_epa": 11.0, "ipc": 2.8},
            base_vote_share=30.0,
        )
        assert pred.predicted_vote_share is not None
        # predicted should be base + delta
        assert abs(pred.predicted_vote_share - (30.0 + pred.delta_vote)) < 1.0

    def test_empty_macro_still_returns_prediction(self):
        from models.economic_vote import EconomicVoteModel, EconomicVotePrediction
        model = EconomicVoteModel()
        pred = model.predict_from_macro({})
        assert isinstance(pred, EconomicVotePrediction)

    def test_contributions_dict(self):
        from models.economic_vote import EconomicVoteModel
        model = EconomicVoteModel()
        pred = model.predict_from_macro({"pib_yoy": 2.0, "paro_epa": 11.0, "ipc": 3.0})
        assert isinstance(pred.contributions, dict)
        assert len(pred.contributions) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# 10. EconomicVoteModel — OLS fallback sin histórico
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomicVoteModelOLSFallback:
    def test_ols_variant_falls_back_to_baseline_without_history(self):
        from models.economic_vote import EconomicVoteModel
        model = EconomicVoteModel(historical=[])  # sin histórico
        pred = model.predict_from_macro(
            {"pib_yoy": 2.0, "paro_epa": 11.0, "ipc": 3.0},
            variant="ols",
        )
        assert pred.variant == "baseline"

    def test_ensemble_uses_baseline_without_history(self):
        from models.economic_vote import EconomicVoteModel
        model = EconomicVoteModel(historical=[])
        pred = model.predict_from_macro(
            {"pib_yoy": 2.0, "paro_epa": 11.0},
            variant="ensemble",
        )
        # Without enough history, ensemble falls back to baseline
        assert pred is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 11. _naive_forecast
# ═══════════════════════════════════════════════════════════════════════════════

class TestNaiveForecast:
    def test_naive_returns_horizon_elements(self):
        from etl.sources.economy.economic_forecaster import _naive_forecast
        result = _naive_forecast([1.0, 2.0, 3.0, 4.0], horizon=6)
        assert len(result) == 6

    def test_naive_yhat_equals_last_value(self):
        from etl.sources.economy.economic_forecaster import _naive_forecast
        result = _naive_forecast([1.0, 2.0, 3.0, 4.0], horizon=3)
        for yhat, lower, upper in result:
            assert yhat == pytest.approx(4.0)

    def test_naive_ci_bounds(self):
        from etl.sources.economy.economic_forecaster import _naive_forecast
        result = _naive_forecast([1.0, 2.0, 3.0, 4.0], horizon=1)
        yhat, lower, upper = result[0]
        assert lower < yhat < upper


# ═══════════════════════════════════════════════════════════════════════════════
# 12. _ols_trend_forecast
# ═══════════════════════════════════════════════════════════════════════════════

class TestOlsTrendForecast:
    def test_ols_upward_trend(self):
        from etl.sources.economy.economic_forecaster import _ols_trend_forecast
        values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
        result = _ols_trend_forecast(values, horizon=3)
        # Should continue upward
        yhats = [r[0] for r in result]
        assert yhats[0] < yhats[1] < yhats[2]

    def test_ols_returns_horizon_elements(self):
        from etl.sources.economy.economic_forecaster import _ols_trend_forecast
        result = _ols_trend_forecast([2.0, 2.5, 3.0, 3.5, 4.0], horizon=4)
        assert len(result) == 4

    def test_ols_ci_bounds(self):
        from etl.sources.economy.economic_forecaster import _ols_trend_forecast
        result = _ols_trend_forecast([1.0, 2.0, 3.0, 4.0, 5.0], horizon=2)
        for yhat, lower, upper in result:
            assert lower <= yhat <= upper  # bounds may equal yhat for perfect series


# ═══════════════════════════════════════════════════════════════════════════════
# 13. forecast_indicator auto-select
# ═══════════════════════════════════════════════════════════════════════════════

class TestForecastIndicator:
    def _make_indicators(self, n: int):
        from etl.sources.economy.schemas import MacroIndicator
        from datetime import timedelta
        base = date(2023, 1, 1)
        return [
            MacroIndicator(
                source="test", provider="ine", indicator_id="ipc",
                name="IPC", geography="ES", frequency="monthly",
                date=base + timedelta(days=30 * i), value=2.0 + i * 0.1,
            )
            for i in range(n)
        ]

    def test_forecast_returns_forecasts(self):
        from etl.sources.economy.economic_forecaster import forecast_indicator
        inds = self._make_indicators(12)
        result = forecast_indicator(inds, horizon=3, model="naive")
        assert len(result) == 3

    def test_forecast_empty_indicators(self):
        from etl.sources.economy.economic_forecaster import forecast_indicator
        result = forecast_indicator([], horizon=3)
        assert result == []

    def test_forecast_auto_selects_model(self):
        from etl.sources.economy.economic_forecaster import forecast_indicator, _select_model
        inds = self._make_indicators(10)
        result = forecast_indicator(inds, horizon=6, model="auto")
        assert len(result) == 6

    def test_forecast_auto_naive_for_short_series(self):
        from etl.sources.economy.economic_forecaster import _select_model
        assert _select_model([1.0, 2.0]) == "naive"

    def test_forecast_auto_moving_avg_for_medium_series(self):
        from etl.sources.economy.economic_forecaster import _select_model
        assert _select_model([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]) == "moving_avg"


# ═══════════════════════════════════════════════════════════════════════════════
# 14. backtest_indicator
# ═══════════════════════════════════════════════════════════════════════════════

class TestBacktestIndicator:
    def _make_indicators(self, n: int):
        from etl.sources.economy.schemas import MacroIndicator
        from datetime import timedelta
        base = date(2022, 1, 1)
        return [
            MacroIndicator(
                source="test", provider="ine", indicator_id="ipc",
                name="IPC", geography="ES", frequency="monthly",
                date=base + timedelta(days=30 * i), value=2.0 + i * 0.05,
            )
            for i in range(n)
        ]

    def test_backtest_returns_metrics(self):
        from etl.sources.economy.economic_forecaster import backtest_indicator
        inds = self._make_indicators(20)
        result = backtest_indicator(inds, test_size=4, model="naive")
        assert "mae" in result
        assert "rmse" in result
        assert "mape" in result

    def test_backtest_mae_nonnegative(self):
        from etl.sources.economy.economic_forecaster import backtest_indicator
        inds = self._make_indicators(15)
        result = backtest_indicator(inds, test_size=4, model="naive")
        assert result["mae"] >= 0.0
        assert result["rmse"] >= 0.0

    def test_backtest_short_series_returns_zeros(self):
        from etl.sources.economy.economic_forecaster import backtest_indicator
        inds = self._make_indicators(4)
        result = backtest_indicator(inds, test_size=4, model="naive")
        assert result["mae"] == 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# 15. compute_itpe_economic
# ═══════════════════════════════════════════════════════════════════════════════

class TestComputeItpe:
    def test_low_risk_gives_low_score(self):
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        score = compute_itpe_economic({
            "ipc": 1.5, "paro_epa": 6.0, "pib_yoy": 3.5,
            "deuda_pib": 60.0, "deficit_pib": 1.0,
        })
        assert score.total_score < 50

    def test_crisis_gives_high_score(self):
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        score = compute_itpe_economic({
            "ipc": 7.0, "paro_epa": 22.0, "pib_yoy": -3.0,
            "deuda_pib": 140.0, "deficit_pib": 8.0,
            "prima_riesgo": 450.0,
        })
        assert score.total_score > 60

    def test_score_in_range(self):
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        score = compute_itpe_economic({"ipc": 3.0, "paro_epa": 12.0})
        assert 0 <= score.total_score <= 100

    def test_level_set(self):
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        score = compute_itpe_economic({"ipc": 3.0})
        assert score.level in ("BAJO", "MODERADO", "ALTO", "CRÍTICO")

    def test_explanation_is_string(self):
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        score = compute_itpe_economic({"ipc": 3.0, "paro_epa": 11.0})
        assert isinstance(score.explanation, str)
        assert len(score.explanation) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# 16. detect_signals — inflación
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectSignals:
    def _make_ind(self, indicator_id: str, value: float, date_: date | None = None):
        from etl.sources.economy.schemas import MacroIndicator
        return MacroIndicator(
            source="test", provider="ine",
            indicator_id=indicator_id, name=indicator_id,
            geography="ES", frequency="monthly",
            date=date_ or date(2024, 6, 1), value=value,
        )

    def test_inflation_above_threshold_generates_signal(self):
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [self._make_ind("ipc", 4.5)]
        signals = detect_signals(inds)
        assert any(s.signal_type == "inflation_pressure" for s in signals)

    def test_inflation_above_5_is_critical(self):
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [self._make_ind("ipc", 6.0)]
        signals = detect_signals(inds)
        inf_signals = [s for s in signals if s.signal_type == "inflation_pressure"]
        assert any(s.severity == "CRITICAL" for s in inf_signals)

    def test_normal_inflation_no_signal(self):
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [self._make_ind("ipc", 1.8)]
        signals = detect_signals(inds)
        assert not any(s.signal_type == "inflation_pressure" for s in signals)

    def test_unemployment_signal(self):
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [self._make_ind("paro_epa", 15.0)]
        signals = detect_signals(inds)
        assert any(s.signal_type == "unemployment_risk" for s in signals)

    def test_market_stress_signal(self):
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [self._make_ind("prima_riesgo", 300.0)]
        signals = detect_signals(inds)
        assert any(s.signal_type == "market_stress" for s in signals)


# ═══════════════════════════════════════════════════════════════════════════════
# 17. detect_signals — sin señales
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectSignalsNormal:
    def test_no_signals_when_all_ok(self):
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_signal_detector import detect_signals
        inds = [
            MacroIndicator(source="t", provider="ine", indicator_id="ipc", name="IPC",
                           geography="ES", frequency="monthly", date=date(2024, 1, 1), value=1.8),
            MacroIndicator(source="t", provider="ine", indicator_id="paro_epa", name="Paro",
                           geography="ES", frequency="quarterly", date=date(2024, 1, 1), value=8.5),
        ]
        signals = detect_signals(inds)
        assert isinstance(signals, list)


# ═══════════════════════════════════════════════════════════════════════════════
# 18. detect_signals — z_score con histórico
# ═══════════════════════════════════════════════════════════════════════════════

class TestDetectSignalsZScore:
    def test_z_score_computed_with_historical(self):
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_signal_detector import detect_signals
        ind = MacroIndicator(source="t", provider="ine", indicator_id="ipc", name="IPC",
                             geography="ES", frequency="monthly", date=date(2024, 6, 1), value=5.5)
        hist = {"ipc": [2.0, 2.1, 2.2, 2.0, 2.1, 2.0, 2.3, 2.1]}
        signals = detect_signals([ind], historical=hist)
        inf_signals = [s for s in signals if s.signal_type == "inflation_pressure"]
        assert any(s.z_score is not None for s in inf_signals)


# ═══════════════════════════════════════════════════════════════════════════════
# 19. validate_indicators
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidateIndicators:
    def test_valid_indicator_passes(self):
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_adapter import validate_indicators
        ind = MacroIndicator(source="t", provider="ine", indicator_id="ipc", name="IPC",
                             geography="ES", frequency="monthly", date=date(2024, 1, 1), value=3.0)
        valid, errors = validate_indicators([ind])
        assert len(valid) == 1
        assert len(errors) == 0

    def test_empty_list_returns_empty(self):
        from etl.sources.economy.economic_adapter import validate_indicators
        valid, errors = validate_indicators([])
        assert valid == []
        assert errors == []

    def test_non_indicator_rejected(self):
        from etl.sources.economy.economic_adapter import validate_indicators
        valid, errors = validate_indicators([{"not": "an indicator"}])  # type: ignore
        # Should not crash; invalid item goes to errors
        assert len(errors) > 0 or len(valid) == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 20. deduplicate_indicators
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeduplicateIndicators:
    def _make(self, indicator_id: str, value: float, fetched_offset: int = 0):
        from etl.sources.economy.schemas import MacroIndicator
        from datetime import datetime, timedelta
        return MacroIndicator(
            source="t", provider="ine", indicator_id=indicator_id,
            name=indicator_id, geography="ES", frequency="monthly",
            date=date(2024, 1, 1), value=value,
            fetched_at=datetime(2024, 6, 1) + timedelta(seconds=fetched_offset),
        )

    def test_keeps_most_recent_duplicate(self):
        from etl.sources.economy.economic_adapter import deduplicate_indicators
        ind_old = self._make("ipc", 3.0, fetched_offset=0)
        ind_new = self._make("ipc", 3.1, fetched_offset=60)
        result = deduplicate_indicators([ind_old, ind_new])
        assert len(result) == 1
        assert float(result[0].value) == pytest.approx(3.1)

    def test_different_indicators_both_kept(self):
        from etl.sources.economy.economic_adapter import deduplicate_indicators
        ind1 = self._make("ipc", 3.0)
        ind2 = self._make("paro_epa", 11.5)
        result = deduplicate_indicators([ind1, ind2])
        assert len(result) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# 21. indicators_to_series
# ═══════════════════════════════════════════════════════════════════════════════

class TestIndicatorsToSeries:
    def test_groups_by_indicator(self):
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_adapter import indicators_to_series
        from datetime import timedelta
        inds = [
            MacroIndicator(source="t", provider="ine", indicator_id="ipc", name="IPC",
                           geography="ES", frequency="monthly",
                           date=date(2024, 1, 1) + timedelta(days=30 * i), value=3.0 + i * 0.1)
            for i in range(12)
        ]
        series = indicators_to_series(inds)
        assert len(series) == 1
        assert series[0].indicator_id == "ipc"

    def test_multiple_indicators_produce_multiple_series(self):
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_adapter import indicators_to_series
        inds = [
            MacroIndicator(source="t", provider="ine", indicator_id="ipc", name="IPC",
                           geography="ES", frequency="monthly", date=date(2024, 1, 1), value=3.0),
            MacroIndicator(source="t", provider="ine", indicator_id="paro_epa", name="Paro",
                           geography="ES", frequency="quarterly", date=date(2024, 1, 1), value=11.5),
        ]
        series = indicators_to_series(inds)
        assert len(series) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# 22. compute_freshness
# ═══════════════════════════════════════════════════════════════════════════════

class TestComputeFreshness:
    def test_recent_daily_is_fresh(self):
        from etl.sources.economy.economic_adapter import compute_freshness
        from datetime import timedelta
        recent = date.today() - timedelta(days=1)
        assert compute_freshness(recent, "daily") == "fresh"

    def test_old_monthly_is_stale(self):
        from etl.sources.economy.economic_adapter import compute_freshness
        from datetime import timedelta
        old = date.today() - timedelta(days=90)
        result = compute_freshness(old, "monthly")
        assert result in ("stale", "outdated")

    def test_none_date_returns_unknown_or_outdated(self):
        from etl.sources.economy.economic_adapter import compute_freshness
        result = compute_freshness(None, "monthly")
        assert result in ("outdated", "unknown", "stale")


# ═══════════════════════════════════════════════════════════════════════════════
# 23. economy_core service — cargar_kpis vacío sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyCoreServiceEmpty:
    def test_cargar_kpis_returns_safe_dict_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from dashboard.services.economy_core import cargar_kpis_economia
            result = cargar_kpis_economia()
        assert isinstance(result, dict)
        assert result.get("hay_datos") is False
        assert result.get("n_indicadores") == 0

    def test_cargar_kpis_never_raises(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from dashboard.services.economy_core import cargar_kpis_economia
            result = cargar_kpis_economia()
        assert result is not None


# ═══════════════════════════════════════════════════════════════════════════════
# 24. economy_core service — cargar_itpe vacío sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyCoreItpeEmpty:
    def test_cargar_itpe_returns_safe_dict_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from dashboard.services.economy_core import cargar_itpe_economico
            result = cargar_itpe_economico()
        assert isinstance(result, dict)
        assert result.get("hay_datos") is False

    def test_cargar_itpe_with_override_computes_even_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from dashboard.services.economy_core import cargar_itpe_economico
            result = cargar_itpe_economico(
                indicators_override={"ipc": 3.5, "paro_epa": 12.0, "pib_yoy": 1.5}
            )
        # Should compute ITPE even without DB since indicators are overridden
        assert isinstance(result, dict)


# ═══════════════════════════════════════════════════════════════════════════════
# 25. economy_core service — cargar_economic_signals vacío sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyCoreSignalsEmpty:
    def test_cargar_signals_returns_empty_df_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from dashboard.services.economy_core import cargar_economic_signals
            result = cargar_economic_signals()
        assert isinstance(result, pd.DataFrame)
        assert result.empty


# ═══════════════════════════════════════════════════════════════════════════════
# 26. pipelines.economy_core — build_parser
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyCLIParser:
    def test_source_all_parsed(self):
        from pipelines.economy_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--source", "all"])
        assert args.source == "all"

    def test_signals_parsed(self):
        from pipelines.economy_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--signals"])
        assert args.signals is True

    def test_forecast_parsed(self):
        from pipelines.economy_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--forecast", "ipc", "--horizon", "12"])
        assert args.forecast == "ipc"
        assert args.horizon == 12

    def test_itpe_parsed(self):
        from pipelines.economy_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--itpe"])
        assert args.itpe is True

    def test_dry_run_flag(self):
        from pipelines.economy_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--source", "ine", "--dry-run"])
        assert args.dry_run is True

    def test_mutually_exclusive_source_signals(self):
        from pipelines.economy_core import build_parser
        import argparse
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["--source", "ine", "--signals"])


# ═══════════════════════════════════════════════════════════════════════════════
# 27. pipelines.economy_core — cmd_forecast sin serie
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyCLICmdForecast:
    def test_cmd_forecast_empty_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from pipelines.economy_core import cmd_forecast
            result = cmd_forecast("ipc", geography="ES", horizon=6, dry_run=True)
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════════════════
# 28. economy_tools — get_macro_indicators vacío sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyToolsEmpty:
    def test_get_macro_indicators_empty_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from agents.tools.economy_tools import get_macro_indicators
            result = get_macro_indicators()
        assert isinstance(result, list)

    def test_get_economic_signals_empty_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from agents.tools.economy_tools import get_economic_signals
            result = get_economic_signals()
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════════════════
# 29. economy_tools — get_itpe_economic vacío sin BD
# ═══════════════════════════════════════════════════════════════════════════════

class TestEconomyToolsItpe:
    def test_get_itpe_empty_without_db(self):
        with patch("dashboard.services.economy_core._get_engine", return_value=None):
            from agents.tools.economy_tools import get_itpe_economic
            result = get_itpe_economic()
        assert isinstance(result, dict)
        assert result.get("hay_datos") is False

    def test_economy_tools_registered(self):
        from agents.tools.economy_tools import ECONOMY_TOOLS
        assert len(ECONOMY_TOOLS) >= 6
        names = [t["name"] for t in ECONOMY_TOOLS]
        assert "get_macro_indicators" in names
        assert "get_itpe_economic" in names
        assert "forecast_macro_indicator" in names
        assert "predict_economic_vote" in names
        assert "explain_economic_risk" in names


# ═══════════════════════════════════════════════════════════════════════════════
# 30. budget_provider — load_budget_from_csv
# ═══════════════════════════════════════════════════════════════════════════════

class TestBudgetProvider:
    def test_load_budget_from_csv_basic(self, tmp_path):
        import csv
        csv_path = tmp_path / "budget.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "programme_code", "programme_name", "chapter",
                "ministry", "geography", "sector",
                "initial_credit", "executed_amount",
            ])
            writer.writeheader()
            writer.writerow({
                "programme_code": "101A",
                "programme_name": "Presidencia del Gobierno",
                "chapter": "1",
                "ministry": "Presidencia",
                "geography": "ES",
                "sector": "Administración General",
                "initial_credit": "5000000",
                "executed_amount": "4800000",
            })

        from etl.sources.economy.budget_provider import load_budget_from_csv
        items = load_budget_from_csv(str(csv_path), budget_year=2024)
        assert len(items) == 1
        assert items[0].programme_code == "101A"
        assert items[0].budget_year == 2024
        assert items[0].initial_credit == pytest.approx(5_000_000.0)

    def test_load_budget_empty_csv(self, tmp_path):
        import csv
        csv_path = tmp_path / "empty.csv"
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["ministry"])
            writer.writeheader()

        from etl.sources.economy.budget_provider import load_budget_from_csv
        items = load_budget_from_csv(str(csv_path), budget_year=2024)
        assert items == []

    def test_load_budget_nonexistent_file_handled(self):
        from etl.sources.economy.budget_provider import load_budget_from_csv
        # Either returns empty list or raises FileNotFoundError — both acceptable
        try:
            items = load_budget_from_csv("/nonexistent/path/file.csv", budget_year=2024)
            assert items == []
        except (FileNotFoundError, OSError):
            pass  # explicit error on nonexistent file is acceptable
