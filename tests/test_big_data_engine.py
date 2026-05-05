"""Tests del motor de big data analytics."""

from __future__ import annotations

import numpy as np
import pytest

from analytics.big_data_engine import (
    AnalyticsResult,
    AnomalyDetection,
    CorrelationFinding,
    _demo_dataset,
    compute_correlations,
    compute_momentum_score,
    compute_polarization_index,
    compute_volatility_index,
    cross_domain_correlation,
    detect_anomalies,
    forecast_series,
    sentiment_aggregation,
    topic_modeling,
)
from analytics.sentiment_engine_v2 import (
    analyze_batch,
    analyze_sentiment,
    compute_polarity_distribution,
    detect_emotions,
    extract_political_entities,
)
from analytics.trend_detection import (
    compute_acceleration,
    detect_reversals,
    detect_trend,
    find_breakouts,
    rank_emerging_topics,
)


# --- compute_correlations ---


def test_compute_correlations_strong_positive():
    x = list(range(50))
    y = [v * 2 + 1 for v in x]
    findings = compute_correlations({"x": x, "y": y})
    assert len(findings) == 1
    assert findings[0].correlation > 0.99
    assert findings[0].strength == "strong"
    assert isinstance(findings[0], CorrelationFinding)


def test_compute_correlations_threshold_filter():
    rng = np.random.default_rng(0)
    a = rng.normal(0, 1, 100).tolist()
    b = rng.normal(0, 1, 100).tolist()
    findings = compute_correlations({"a": a, "b": b}, min_correlation=0.9)
    assert findings == []


def test_compute_correlations_returns_findings():
    data = {"a": [1, 2, 3, 4, 5], "b": [5, 4, 3, 2, 1], "c": [1, 2, 3, 4, 5]}
    findings = compute_correlations(data, min_correlation=0.3)
    assert all(isinstance(f, CorrelationFinding) for f in findings)
    assert any(f.correlation < -0.9 for f in findings)


# --- detect_anomalies ---


def test_detect_anomalies_no_anomalies():
    series = [10.0] * 30
    anomalies = detect_anomalies(series)
    assert anomalies == []


def test_detect_anomalies_with_critical():
    series = [1.0] * 30 + [100.0]
    anomalies = detect_anomalies(series)
    assert len(anomalies) >= 1
    assert anomalies[-1].severity in {"critical", "high"}
    assert isinstance(anomalies[0], AnomalyDetection)


def test_detect_anomalies_severity_classification():
    series = [1.0, 1.1, 0.9, 1.0, 1.05, 0.95, 1.0, 1.0, 1.0, 1.0, 50.0]
    anomalies = detect_anomalies(series, z_threshold=2.0)
    assert any(a.severity in {"critical", "high", "medium"} for a in anomalies)


# --- forecast_series ---


def test_forecast_series_linear():
    values = list(range(30))
    out = forecast_series(values, periods_ahead=5, method="linear")
    assert len(out["forecast"]) == 5
    assert out["forecast"][-1] > out["forecast"][0]


def test_forecast_series_exponential():
    values = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
    out = forecast_series(values, periods_ahead=3, method="exponential_smoothing")
    assert len(out["forecast"]) == 3
    assert out["method"] == "exponential_smoothing"


def test_forecast_series_correct_length():
    values = list(range(20))
    out = forecast_series(values, periods_ahead=10, method="naive_seasonal")
    assert len(out["forecast"]) == 10
    assert len(out["lower"]) == 10
    assert len(out["upper"]) == 10


# --- topic_modeling ---


def test_topic_modeling_returns_n_topics():
    texts = [
        "El gobierno aprueba reforma laboral importante",
        "La oposición critica la reforma laboral del gobierno",
        "Los precios de la energía suben otra vez en España",
        "Inflación afecta el coste energético en España",
        "El Congreso debate la nueva reforma educativa",
        "Educación pública reclama más recursos al Congreso",
    ]
    topics = topic_modeling(texts, n_topics=3)
    assert len(topics) <= 3
    assert all("top_words" in t for t in topics)


def test_topic_modeling_handles_empty():
    assert topic_modeling([], n_topics=3) == []


# --- sentiment_aggregation ---


def test_sentiment_aggregation_groups_correctly():
    items = [
        {"actor": "PP", "sentiment": 0.5, "text": "muy bien"},
        {"actor": "PP", "sentiment": 0.3, "text": "bien"},
        {"actor": "PSOE", "sentiment": -0.2, "text": "mal"},
    ]
    result = sentiment_aggregation(items, group_by="actor")
    assert "PP" in result and "PSOE" in result
    assert result["PP"]["count"] == 2
    assert result["PSOE"]["count"] == 1


def test_sentiment_aggregation_std_dev():
    items = [
        {"actor": "X", "sentiment": 0.0},
        {"actor": "X", "sentiment": 1.0},
        {"actor": "X", "sentiment": -1.0},
    ]
    result = sentiment_aggregation(items, group_by="actor")
    assert result["X"]["std_dev"] > 0


# --- cross_domain_correlation ---


def test_cross_domain_correlation_returns_top_10():
    rng = np.random.default_rng(1)
    political = {f"p{i}": rng.normal(0, 1, 50).tolist() for i in range(4)}
    economic = {f"e{i}": rng.normal(0, 1, 50).tolist() for i in range(4)}
    social = {f"s{i}": rng.normal(0, 1, 50).tolist() for i in range(4)}
    findings = cross_domain_correlation(political, economic, social)
    assert len(findings) <= 10


# --- polarization ---


def test_polarization_index_range():
    out = compute_polarization_index({"PP": 0.5, "PSOE": -0.5, "VOX": 0.8})
    assert 0.0 <= out["index"] <= 1.0
    assert out["classification"] in {"low", "medium", "high", "extreme"}


def test_polarization_classification_low():
    out = compute_polarization_index({"PP": 0.1, "PSOE": 0.1, "VOX": 0.1})
    assert out["classification"] == "low"


# --- volatility / momentum ---


def test_volatility_stable_vs_volatile():
    stable = [10.0] * 30
    volatile = [10.0 if i % 2 == 0 else 50.0 for i in range(30)]
    assert compute_volatility_index(stable) == 0.0
    assert compute_volatility_index(volatile) > 0.0


def test_momentum_positive_negative():
    rising = list(range(60))
    falling = list(range(60, 0, -1))
    assert compute_momentum_score(rising) > 0
    assert compute_momentum_score(falling) < 0


# --- demo dataset ---


def test_demo_dataset_has_90_points():
    ds = _demo_dataset()
    assert all(len(v) == 90 for v in ds.values())
    assert "pp_polls" in ds and "ipc" in ds


# --- sentiment engine ---


def test_analyze_sentiment_positive():
    s = analyze_sentiment("El crecimiento económico genera empleo y prosperidad")
    assert s.sentiment > 0
    assert s.label == "positive"


def test_analyze_sentiment_negative():
    s = analyze_sentiment("La corrupción y el escándalo provocan crisis e indignación")
    assert s.sentiment < 0
    assert s.label == "negative"


def test_analyze_sentiment_neutral():
    s = analyze_sentiment("Hoy es martes")
    assert s.label == "neutral"


def test_analyze_sentiment_with_negation():
    s_pos = analyze_sentiment("Hay transparencia en el gobierno")
    s_neg = analyze_sentiment("No hay transparencia en el gobierno")
    assert s_pos.sentiment > 0
    assert s_neg.sentiment <= 0


def test_analyze_batch_returns_list():
    out = analyze_batch(["bien", "mal", "neutro"])
    assert len(out) == 3
    assert all(hasattr(s, "sentiment") for s in out)


def test_detect_emotions_returns_dict():
    e = detect_emotions("Siento miedo y preocupación por el futuro")
    assert isinstance(e, dict)
    assert "fear" in e


def test_extract_political_entities_finds_pp_sanchez():
    out = extract_political_entities("Sánchez (PSOE) responde a Feijóo del PP en el Congreso")
    assert "PP" in out
    assert "Sánchez" in out
    assert "PSOE" in out
    assert "Congreso" in out


def test_compute_polarity_distribution_sums_to_100():
    items = analyze_batch([
        "excelente progreso y prosperidad",
        "terrible corrupción y crisis",
        "hoy es martes normal",
    ])
    dist = compute_polarity_distribution(items)
    total = dist["positive_pct"] + dist["neutral_pct"] + dist["negative_pct"]
    assert abs(total - 100.0) < 0.5


# --- trend detection ---


def test_detect_trend_up():
    t = detect_trend(list(range(30)))
    assert t.direction == "up"
    assert t.change_pct > 0


def test_detect_trend_down():
    t = detect_trend(list(range(30, 0, -1)))
    assert t.direction == "down"


def test_detect_trend_flat():
    t = detect_trend([10.0] * 30)
    assert t.direction == "flat"


def test_detect_reversals_returns_indices():
    values = list(range(20)) + list(range(20, 0, -1))
    rev = detect_reversals(values, window=5)
    assert isinstance(rev, list)
    assert len(rev) > 0


def test_rank_emerging_topics_filters_growth():
    data = {
        "growing": [1] * 7 + [10] * 7,
        "stable": [5] * 14,
        "declining": [10] * 7 + [1] * 7,
    }
    out = rank_emerging_topics(data, min_growth=0.5)
    topics = [r["topic"] for r in out]
    assert "growing" in topics
    assert "stable" not in topics


def test_find_breakouts_detects_outliers():
    values = [10.0] * 35 + [100.0]
    out = find_breakouts(values, lookback=30, threshold_std=2.0)
    assert 35 in out


def test_compute_acceleration_returns_float():
    out = compute_acceleration([1.0, 2.0, 4.0, 8.0, 16.0])
    assert isinstance(out, float)
    assert out > 0


# --- AnalyticsResult sanity ---


def test_analytics_result_model():
    from datetime import datetime as _dt

    r = AnalyticsResult(
        query="demo",
        executed_at=_dt.utcnow(),
        data_sources=["demo"],
        record_count=10,
        result={"k": 1},
        insights=["ok"],
        confidence=0.8,
        mode="demo",
    )
    assert r.confidence == 0.8


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
