"""
Risk Predictor v2 — ML scenarios.

Reads scenario configs from `risk_scenario_config`. Builds feature matrix
from `risk_index_values` (historical scores). Trains the model declared in
config (`logistic`, `random_forest`, `bayesian`) and emits:
  - probability (0-1)
  - bootstrap confidence interval (5%–95%)
  - key driver features
  - narrative hint (text, optional Ollama upgrade later)

Honest fallbacks:
  - If sklearn unavailable → returns probability=None with reason
  - If insufficient labelled samples (<20) → degraded heuristic
  - Persists every prediction in `risk_scenario_predictions`

Public API:
  - predict_scenario(scenario_id, country) -> dict
  - predict_all(country) -> list[dict]
  - list_scenarios() -> list[dict]
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime, timedelta
from typing import Any, Optional

import numpy as np
import pandas as pd
from sqlalchemy import text as sa_text

logger = logging.getLogger(__name__)

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    _SKLEARN_OK = True
except Exception:
    _SKLEARN_OK = False


def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


def _read_sql(query: str, params: Optional[dict] = None) -> pd.DataFrame:
    eng = _engine()
    if eng is None:
        return pd.DataFrame()
    try:
        with eng.connect() as conn:
            result = conn.execute(sa_text(query), params or {})
            rows = result.fetchall()
            if not rows:
                return pd.DataFrame()
            return pd.DataFrame(rows, columns=list(result.keys()))
    except Exception as exc:
        logger.debug("risk_predictor_v2._read_sql: %s", exc)
        return pd.DataFrame()


def _exec(query: str, params: Optional[dict] = None) -> bool:
    eng = _engine()
    if eng is None:
        return False
    try:
        with eng.begin() as conn:
            conn.execute(sa_text(query), params or {})
        return True
    except Exception as exc:
        logger.debug("risk_predictor_v2._exec: %s", exc)
        return False


def list_scenarios() -> list[dict]:
    df = _read_sql(
        """
        SELECT s.*, i.display_name AS index_name
        FROM risk_scenario_config s
        LEFT JOIN risk_index_config i ON s.index_id = i.index_id
        WHERE s.is_active = TRUE
        ORDER BY s.scenario_id
        """
    )
    return df.to_dict("records") if not df.empty else []


def _build_feature_matrix(country: str, lookback_years: int = 5) -> pd.DataFrame:
    """Build feature matrix from history of all index scores."""
    indices_df = _read_sql(
        "SELECT index_id FROM risk_index_config WHERE is_active = TRUE"
    )
    if indices_df.empty:
        return pd.DataFrame()

    since = date.today() - timedelta(days=lookback_years * 365)
    frames: list[pd.DataFrame] = []
    for _, row in indices_df.iterrows():
        idx_id = row["index_id"]
        hist = _read_sql(
            """
            SELECT DATE(calculated_at) AS dt, AVG(score) AS score
            FROM risk_index_values
            WHERE index_id = :idx AND country_iso2 = :c AND calculated_at >= :d
            GROUP BY DATE(calculated_at)
            ORDER BY dt
            """,
            {"idx": idx_id, "c": country, "d": since},
        )
        if hist.empty:
            continue
        hist = hist.set_index(pd.to_datetime(hist["dt"]))[["score"]].rename(
            columns={"score": idx_id}
        )
        frames.append(hist)

    if not frames:
        return pd.DataFrame()

    df = pd.concat(frames, axis=1).ffill().dropna()
    if df.empty:
        return df

    new_cols: dict[str, pd.Series] = {}
    for col in df.columns:
        new_cols[f"{col}_lag7"]   = df[col].shift(7)
        new_cols[f"{col}_lag30"]  = df[col].shift(30)
        new_cols[f"{col}_std30"]  = df[col].rolling(30).std()
        new_cols[f"{col}_trend7"] = df[col].diff(7)

    out = pd.concat([df, pd.DataFrame(new_cols, index=df.index)], axis=1).dropna()
    return out


def _heuristic_probability(scenario_id: str, country: str) -> dict:
    """
    Heuristic fallback when ML is unavailable or insufficient data.
    Uses current score of the target index vs. the trigger threshold parsed from JSON.
    """
    scen_df = _read_sql(
        "SELECT * FROM risk_scenario_config WHERE scenario_id = :s",
        {"s": scenario_id},
    )
    if scen_df.empty:
        return {"probability": None, "error": "scenario_not_found"}
    scen = scen_df.iloc[0]

    latest = _read_sql(
        """
        SELECT score FROM risk_index_values
        WHERE index_id = :idx AND country_iso2 = :c
        ORDER BY calculated_at DESC LIMIT 1
        """,
        {"idx": scen["index_id"], "c": country},
    )
    if latest.empty:
        return {"probability": None, "error": "no_score_yet"}
    score = float(latest.iloc[0]["score"])

    triggers = {}
    try:
        triggers = json.loads(scen["trigger_conditions"]) if isinstance(scen["trigger_conditions"], str) else (scen["trigger_conditions"] or {})
    except Exception:
        triggers = {}
    main_trigger = triggers.get(scen["index_id"], ">50")
    try:
        threshold = float(str(main_trigger)[1:])
    except Exception:
        threshold = 50.0

    # Sigmoid centered at threshold, slope ~ 0.1 per point
    diff = score - threshold
    prob = 1.0 / (1.0 + np.exp(-diff * 0.1))
    return {
        "scenario_id":     scenario_id,
        "name":            scen["name"],
        "probability":     round(prob * 100, 1),
        "confidence_low":  round(max(0.0, prob - 0.15) * 100, 1),
        "confidence_high": round(min(1.0, prob + 0.15) * 100, 1),
        "key_drivers":     {scen["index_id"]: 1.0},
        "horizon_days":    int(scen["horizon_days"] or 90),
        "model":           "heuristic",
        "method":          "sigmoid_around_threshold",
    }


def predict_scenario(scenario_id: str, country: str = "ES") -> dict:
    scen_df = _read_sql(
        "SELECT * FROM risk_scenario_config WHERE scenario_id = :s AND is_active = TRUE",
        {"s": scenario_id},
    )
    if scen_df.empty:
        return {"scenario_id": scenario_id, "probability": None, "error": "scenario_not_found"}
    scen = scen_df.iloc[0]

    if not _SKLEARN_OK:
        result = _heuristic_probability(scenario_id, country)
        _persist_prediction(scenario_id, country, result)
        return result

    X = _build_feature_matrix(country)
    if X.empty or len(X) < 30:
        result = _heuristic_probability(scenario_id, country)
        result["fallback_reason"] = "insufficient_history"
        _persist_prediction(scenario_id, country, result)
        return result

    # Build Y: 1 if in next horizon_days the target index crosses trigger
    target_idx = scen["index_id"]
    horizon = int(scen["horizon_days"] or 90)
    triggers = {}
    try:
        triggers = json.loads(scen["trigger_conditions"]) if isinstance(scen["trigger_conditions"], str) else (scen["trigger_conditions"] or {})
    except Exception:
        triggers = {}
    main_trigger = triggers.get(target_idx, ">50")
    op_str = str(main_trigger)
    op = op_str[0]
    try:
        threshold = float(op_str[1:])
    except Exception:
        threshold = 50.0

    if target_idx not in X.columns:
        result = _heuristic_probability(scenario_id, country)
        result["fallback_reason"] = "target_index_missing_in_history"
        _persist_prediction(scenario_id, country, result)
        return result

    target_series = X[target_idx]
    Y = []
    for i, dt in enumerate(X.index):
        future = target_series.loc[X.index >= dt].iloc[1: horizon + 1]
        if future.empty:
            Y.append(np.nan)
            continue
        if op == ">":
            Y.append(1 if float(future.max()) > threshold else 0)
        elif op == "<":
            Y.append(1 if float(future.min()) < threshold else 0)
        else:
            Y.append(0)

    df_model = X.copy()
    df_model["Y"] = Y
    df_model = df_model.dropna(subset=["Y"])
    if len(df_model) < 20 or df_model["Y"].nunique() < 2:
        result = _heuristic_probability(scenario_id, country)
        result["fallback_reason"] = "not_enough_labeled_samples"
        _persist_prediction(scenario_id, country, result)
        return result

    X_train = df_model.drop(columns=["Y"])
    y_train = df_model["Y"].astype(int)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_train)
    X_now = scaler.transform(X_train.iloc[[-1]])

    model_name = (scen["probability_model"] or "logistic").lower()
    try:
        if model_name == "random_forest":
            model = RandomForestClassifier(
                n_estimators=200, class_weight="balanced", random_state=42
            )
            model.fit(X_scaled, y_train)
            prob = float(model.predict_proba(X_now)[0][1])
            importance = pd.Series(
                model.feature_importances_, index=X_train.columns
            ).sort_values(ascending=False)
        elif model_name == "bayesian":
            # Simple Bayesian-flavoured: weighted by abs correlation with Y
            correlations = X_train.corrwith(y_train).abs().fillna(0)
            if correlations.sum() == 0:
                raise ValueError("zero_correlations")
            weights = correlations / correlations.sum()
            curr = X_train.iloc[-1]
            normalized = (curr - X_train.mean()) / (X_train.std() + 1e-9)
            raw_score = float((normalized * weights).sum())
            prob = float(1.0 / (1.0 + np.exp(-raw_score)))
            importance = correlations.sort_values(ascending=False)
        else:  # logistic
            model = LogisticRegression(max_iter=1000, class_weight="balanced")
            model.fit(X_scaled, y_train)
            prob = float(model.predict_proba(X_now)[0][1])
            importance = pd.Series(
                np.abs(model.coef_[0]), index=X_train.columns
            ).sort_values(ascending=False)
    except Exception as exc:
        logger.debug("predict_scenario.model_fit: %s", exc)
        result = _heuristic_probability(scenario_id, country)
        result["fallback_reason"] = f"model_fit_failed:{type(exc).__name__}"
        _persist_prediction(scenario_id, country, result)
        return result

    # Bootstrap CI
    probs_boot: list[float] = []
    rng = np.random.default_rng(42)
    for _ in range(100):
        idx_sample = rng.integers(0, len(X_scaled), size=len(X_scaled))
        if len(np.unique(y_train.iloc[idx_sample])) < 2:
            continue
        try:
            if model_name == "random_forest":
                m = RandomForestClassifier(
                    n_estimators=80, class_weight="balanced", random_state=None
                )
            else:
                m = LogisticRegression(max_iter=400, class_weight="balanced")
            m.fit(X_scaled[idx_sample], y_train.iloc[idx_sample])
            probs_boot.append(float(m.predict_proba(X_now)[0][1]))
        except Exception:
            continue

    if probs_boot:
        ci_low = float(np.percentile(probs_boot, 5))
        ci_high = float(np.percentile(probs_boot, 95))
    else:
        ci_low = max(0.0, prob - 0.15)
        ci_high = min(1.0, prob + 0.15)

    key_drivers = importance.head(8).to_dict()
    # Cast numpy floats to python floats for JSON
    key_drivers = {k: float(v) for k, v in key_drivers.items()}

    result = {
        "scenario_id":     scenario_id,
        "name":            scen["name"],
        "description":     scen["description"] or "",
        "probability":     round(prob * 100, 1),
        "confidence_low":  round(ci_low * 100, 1),
        "confidence_high": round(ci_high * 100, 1),
        "key_drivers":     key_drivers,
        "horizon_days":    horizon,
        "model":           model_name,
        "n_samples":       int(len(df_model)),
        "n_positives":     int(df_model["Y"].sum()),
    }
    _persist_prediction(scenario_id, country, result)
    return result


def _persist_prediction(scenario_id: str, country: str, result: dict) -> None:
    if result.get("probability") is None:
        return
    prob = float(result["probability"]) / 100.0
    cl = float(result.get("confidence_low", 0)) / 100.0
    ch = float(result.get("confidence_high", 0)) / 100.0
    _exec(
        """
        INSERT INTO risk_scenario_predictions
        (scenario_id, country_iso2, probability, confidence_low, confidence_high, key_drivers, narrative)
        VALUES (:s, :c, :p, :cl, :ch, CAST(:kd AS jsonb), :n)
        """,
        {
            "s":  scenario_id, "c": country,
            "p":  prob, "cl": cl, "ch": ch,
            "kd": json.dumps(result.get("key_drivers") or {}),
            "n":  result.get("name") or "",
        },
    )


def predict_all(country: str = "ES") -> list[dict]:
    scenarios = list_scenarios()
    return [predict_scenario(s["scenario_id"], country) for s in scenarios]


def get_prediction_history(scenario_id: str, country: str = "ES", days: int = 90) -> pd.DataFrame:
    since = date.today() - timedelta(days=days)
    return _read_sql(
        """
        SELECT DATE(calculated_at) AS dt,
               AVG(probability) AS probability,
               AVG(confidence_low) AS confidence_low,
               AVG(confidence_high) AS confidence_high
        FROM risk_scenario_predictions
        WHERE scenario_id = :s AND country_iso2 = :c
          AND calculated_at >= :d
        GROUP BY DATE(calculated_at)
        ORDER BY dt
        """,
        {"s": scenario_id, "c": country, "d": since},
    )
