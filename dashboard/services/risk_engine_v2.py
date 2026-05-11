"""
Risk Engine v2 — DB-driven composite index calculation.

Reads 100% of configuration from `risk_index_config`, `risk_index_components`,
`risk_thresholds`. The engine itself is generic: zero hardcoded country, party,
or metric. To add a new index, INSERT a row in `risk_index_config` and N rows
in `risk_index_components`. Done.

All functions are honest:
  - return empty/safe defaults if tables missing (migration not applied)
  - never raise to callers
  - log debug, never error

Public API:
  - compute_index(index_id, country, as_of=None) -> dict
  - compute_all(country) -> list[dict]
  - get_history(index_id, country, days) -> pd.DataFrame
  - fire_alerts(country) -> list[dict]  # checks risk_alert_config and inserts
  - list_active_alerts(country, days) -> list[dict]
  - acknowledge_alert(alert_id, user) -> bool

The engine is paired with risk_predictor_v2 for scenarios.
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


# ── DB helpers ────────────────────────────────────────────────────────────────

def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("risk_engine_v2._engine: %s", exc)
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
        logger.debug("risk_engine_v2._read_sql: %s", exc)
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
        logger.debug("risk_engine_v2._exec: %s", exc)
        return False


# ── Transformations ───────────────────────────────────────────────────────────

def _transform(series: pd.Series, method: str) -> pd.Series:
    if series.empty:
        return series
    if method == "invert":
        return series.max() + series.min() - series
    if method == "log":
        return np.log1p(series.clip(lower=0))
    if method == "zscore":
        std = series.std()
        if std == 0 or pd.isna(std):
            return pd.Series(0.0, index=series.index)
        return (series - series.mean()) / std
    return series  # 'none'


def _normalize(series: pd.Series, method: str) -> pd.Series:
    if series.empty:
        return series
    if method == "minmax_rolling_5y":
        mn, mx = series.min(), series.max()
        if mx == mn:
            return pd.Series(50.0, index=series.index)
        return (series - mn) / (mx - mn) * 100
    if method == "zscore_global":
        std = series.std()
        if std == 0 or pd.isna(std):
            return pd.Series(50.0, index=series.index)
        z = ((series - series.mean()) / std).clip(-3, 3)
        return (z + 3) / 6 * 100
    if method == "percentile":
        return series.rank(pct=True) * 100
    return series  # 'none' — assume already 0-100


# ── Raw value loading ─────────────────────────────────────────────────────────

def _get_raw_values(
    source_id: str,
    metric_name: str,
    country: str,
    lookback_days: int = 365 * 5,
) -> pd.Series:
    since = date.today() - timedelta(days=lookback_days)
    df = _read_sql(
        """
        SELECT reference_date, metric_value
        FROM risk_raw_values
        WHERE source_id = :s AND metric_name = :m
          AND country_iso2 = :c AND reference_date >= :d
        ORDER BY reference_date
        """,
        {"s": source_id, "m": metric_name, "c": country, "d": since},
    )
    if df.empty:
        return pd.Series(dtype=float)
    s = pd.Series(
        df["metric_value"].astype(float).values,
        index=pd.to_datetime(df["reference_date"]),
    )
    return s


# ── Index computation ─────────────────────────────────────────────────────────

def compute_index(
    index_id: str,
    country: str = "ES",
    as_of: Optional[date] = None,
    persist: bool = True,
) -> dict:
    """
    Calcula el índice compuesto para un index_id y país.

    Returns:
        {
          index_id, country, score (0-100), label,
          delta_7d, delta_30d, components: [...], n_components_used,
          source: 'computed' | 'fallback' | 'no_data',
          warnings: [...]
        }
    """
    as_of = as_of or date.today()
    warnings: list[str] = []

    components_df = _read_sql(
        """
        SELECT source_id, metric_name, weight, transform, normalize_method,
               COALESCE(country_filter, :c) AS country
        FROM risk_index_components
        WHERE index_id = :idx AND is_active = TRUE
        """,
        {"idx": index_id, "c": country},
    )

    thresholds = _read_sql(
        "SELECT threshold_low, threshold_medium, threshold_high "
        "FROM risk_thresholds WHERE index_id = :idx",
        {"idx": index_id},
    )

    weighted_scores: list[float] = []
    component_detail: list[dict] = []

    for _, comp in components_df.iterrows():
        raw = _get_raw_values(
            comp["source_id"], comp["metric_name"], comp["country"]
        )
        if raw.empty:
            warnings.append(f"no_data:{comp['source_id']}:{comp['metric_name']}")
            continue
        transformed = _transform(raw, comp["transform"] or "none")
        normalized = _normalize(transformed, comp["normalize_method"] or "none")
        available = normalized[normalized.index.date <= as_of]
        if available.empty:
            warnings.append(f"no_data_at_date:{comp['metric_name']}")
            continue
        current_score = float(available.iloc[-1])
        weight = float(comp["weight"])
        weighted_scores.append(current_score * weight)
        component_detail.append({
            "source_id":   comp["source_id"],
            "metric_name": comp["metric_name"],
            "weight":      weight,
            "raw_value":   float(raw.iloc[-1]),
            "score_0_100": round(current_score, 2),
            "contribution": round(current_score * weight, 2),
        })

    # Normalize active weights to 1
    total_weight = sum(c["weight"] for c in component_detail)
    if total_weight > 0:
        score = sum(weighted_scores) / total_weight
    else:
        # No data available — return neutral fallback
        score = 0.0
        warnings.append("all_components_missing")

    # Deltas from cached history
    def _score_at(days_back: int) -> Optional[float]:
        target = as_of - timedelta(days=days_back)
        df = _read_sql(
            """
            SELECT score FROM risk_index_values
            WHERE index_id = :idx AND country_iso2 = :c
              AND DATE(calculated_at) <= :d
            ORDER BY calculated_at DESC LIMIT 1
            """,
            {"idx": index_id, "c": country, "d": target},
        )
        if df.empty:
            return None
        return float(df.iloc[0]["score"])

    s7 = _score_at(7)
    s30 = _score_at(30)
    delta_7d = round(score - s7, 2) if s7 is not None else None
    delta_30d = round(score - s30, 2) if s30 is not None else None

    # Label from thresholds
    label = "CRÍTICO"
    if not thresholds.empty:
        t = thresholds.iloc[0]
        if score < float(t["threshold_low"]):
            label = "BAJO"
        elif score < float(t["threshold_medium"]):
            label = "MEDIO"
        elif score < float(t["threshold_high"]):
            label = "ALTO"

    # Source tag
    if not component_detail:
        source_tag = "no_data"
    elif len(warnings) > 0:
        source_tag = "partial"
    else:
        source_tag = "computed"

    result = {
        "index_id":    index_id,
        "country":     country,
        "score":       round(score, 1),
        "label":       label,
        "delta_7d":    delta_7d,
        "delta_30d":   delta_30d,
        "components":  component_detail,
        "n_components_used": len(component_detail),
        "n_components_configured": len(components_df),
        "source":      source_tag,
        "warnings":    warnings[:8],  # cap
        "as_of":       as_of.isoformat(),
    }

    if persist and component_detail:
        _exec(
            """
            INSERT INTO risk_index_values
            (index_id, country_iso2, score, score_delta_7d, score_delta_30d,
             label, components_snapshot)
            VALUES (:idx, :c, :s, :d7, :d30, :l, CAST(:snap AS jsonb))
            """,
            {
                "idx": index_id, "c": country,
                "s": round(score, 2), "d7": delta_7d, "d30": delta_30d,
                "l": label, "snap": json.dumps(component_detail),
            },
        )

    return result


def compute_all(country: str = "ES", persist: bool = True) -> list[dict]:
    """Compute every active index for a country."""
    configs = _read_sql(
        """
        SELECT c.index_id, c.display_name, c.display_order, c.icon, c.description,
               c.color_low, c.color_medium, c.color_high, c.color_critical
        FROM risk_index_config c
        WHERE c.is_active = TRUE
        ORDER BY c.display_order, c.index_id
        """
    )
    if configs.empty:
        return []
    out: list[dict] = []
    for _, cfg in configs.iterrows():
        idx = compute_index(cfg["index_id"], country, persist=persist)
        # Attach display metadata for the UI
        idx["display_name"]   = cfg["display_name"]
        idx["display_order"]  = int(cfg["display_order"]) if cfg["display_order"] is not None else 99
        idx["icon"]           = cfg["icon"] or ""
        idx["description"]    = cfg["description"] or ""
        idx["colors"] = {
            "low":      cfg["color_low"],
            "medium":   cfg["color_medium"],
            "high":     cfg["color_high"],
            "critical": cfg["color_critical"],
        }
        out.append(idx)
    return out


def get_history(
    index_id: str,
    country: str = "ES",
    days: int = 365,
) -> pd.DataFrame:
    since = date.today() - timedelta(days=days)
    return _read_sql(
        """
        SELECT DATE(calculated_at) AS dt,
               AVG(score) AS score,
               AVG(score_delta_7d) AS delta_7d,
               MAX(label) AS label
        FROM risk_index_values
        WHERE index_id = :idx AND country_iso2 = :c
          AND calculated_at >= :d
        GROUP BY DATE(calculated_at)
        ORDER BY dt
        """,
        {"idx": index_id, "c": country, "d": since},
    )


# ── Alerts ────────────────────────────────────────────────────────────────────

def fire_alerts(country: str = "ES") -> list[dict]:
    """
    Evaluate every alert in risk_alert_config against the latest scores.
    Insert a row in risk_alerts_fired for each match.

    Returns the list of alerts that fired this run.
    """
    configs = _read_sql(
        """
        SELECT ac.alert_id, ac.index_id, ac.trigger_type, ac.trigger_value,
               ac.severity, ac.message_template, ri.display_name AS index_name
        FROM risk_alert_config ac
        JOIN risk_index_config ri ON ac.index_id = ri.index_id
        WHERE ac.is_active = TRUE
        """
    )
    if configs.empty:
        return []
    fired: list[dict] = []
    for _, cfg in configs.iterrows():
        latest = _read_sql(
            """
            SELECT score, score_delta_7d, score_delta_30d, label
            FROM risk_index_values
            WHERE index_id = :idx AND country_iso2 = :c
            ORDER BY calculated_at DESC LIMIT 1
            """,
            {"idx": cfg["index_id"], "c": country},
        )
        if latest.empty:
            continue
        row = latest.iloc[0]
        score = float(row["score"] or 0)
        delta7 = float(row["score_delta_7d"] or 0)
        delta30 = float(row["score_delta_30d"] or 0)

        triggered = False
        delta_val = 0.0
        tval = float(cfg["trigger_value"] or 0)
        if cfg["trigger_type"] == "threshold_cross" and score >= tval:
            triggered = True
        elif cfg["trigger_type"] == "delta_spike":
            # Use the larger absolute of 7d/30d
            biggest = delta7 if abs(delta7) >= abs(delta30) else delta30
            delta_val = biggest
            if abs(biggest) >= tval:
                triggered = True

        if not triggered:
            continue

        # Anti-spam: don't fire if same alert+country fired in last 6 hours
        recent = _read_sql(
            """
            SELECT 1 FROM risk_alerts_fired
            WHERE alert_id = :a AND country_iso2 = :c
              AND fired_at >= NOW() - INTERVAL '6 hours'
            LIMIT 1
            """,
            {"a": cfg["alert_id"], "c": country},
        )
        if not recent.empty:
            continue

        # Render template
        try:
            msg = (cfg["message_template"] or "").format(
                index_name=cfg["index_name"],
                score=round(score, 1),
                delta=round(delta_val, 1),
                threshold=tval,
            )
        except Exception:
            msg = f"{cfg['index_name']}: {round(score, 1)}/100"

        payload = {
            "score": score,
            "delta_7d": delta7,
            "delta_30d": delta30,
            "label": row["label"],
            "message": msg,
        }
        _exec(
            """
            INSERT INTO risk_alerts_fired
            (alert_id, country_iso2, value_at_fire, delta_at_fire, payload)
            VALUES (:a, :c, :v, :d, CAST(:p AS jsonb))
            """,
            {
                "a": cfg["alert_id"], "c": country,
                "v": score, "d": delta_val,
                "p": json.dumps(payload),
            },
        )
        fired.append({
            "alert_id":   cfg["alert_id"],
            "index_id":   cfg["index_id"],
            "index_name": cfg["index_name"],
            "severity":   cfg["severity"],
            "score":      score,
            "delta":      delta_val,
            "message":    msg,
        })
    return fired


def list_active_alerts(country: str = "ES", days: int = 30) -> list[dict]:
    df = _read_sql(
        """
        SELECT af.id, af.alert_id, af.fired_at, af.value_at_fire AS score,
               af.delta_at_fire AS delta, af.payload, af.acknowledged,
               ac.severity, ac.message_template,
               ri.display_name AS index_name, ri.index_id
        FROM risk_alerts_fired af
        JOIN risk_alert_config ac ON af.alert_id = ac.alert_id
        JOIN risk_index_config ri ON ac.index_id = ri.index_id
        WHERE af.country_iso2 = :c
          AND af.fired_at >= NOW() - (:d || ' days')::interval
        ORDER BY af.fired_at DESC
        """,
        {"c": country, "d": str(days)},
    )
    if df.empty:
        return []
    out = []
    for _, r in df.iterrows():
        payload = r["payload"] if isinstance(r["payload"], dict) else {}
        out.append({
            "id":           int(r["id"]),
            "alert_id":     r["alert_id"],
            "index_id":     r["index_id"],
            "index_name":   r["index_name"],
            "severity":     r["severity"],
            "score":        float(r["score"] or 0),
            "delta":        float(r["delta"] or 0),
            "message":      payload.get("message") or r["message_template"] or "",
            "fired_at":     r["fired_at"].isoformat() if isinstance(r["fired_at"], (datetime, date)) else str(r["fired_at"]),
            "acknowledged": bool(r["acknowledged"]),
        })
    return out


def acknowledge_alert(alert_row_id: int, user: str = "system") -> bool:
    return _exec(
        """
        UPDATE risk_alerts_fired
        SET acknowledged = TRUE,
            acknowledged_at = NOW(),
            acknowledged_by = :u
        WHERE id = :id
        """,
        {"id": alert_row_id, "u": user},
    )


# ── Convenience: introspection for the UI ────────────────────────────────────

def list_indices() -> list[dict]:
    df = _read_sql(
        "SELECT * FROM risk_index_config WHERE is_active = TRUE ORDER BY display_order"
    )
    return df.to_dict("records") if not df.empty else []


def list_components(index_id: str) -> list[dict]:
    df = _read_sql(
        """
        SELECT c.*, s.name AS source_name
        FROM risk_index_components c
        LEFT JOIN risk_source_catalog s ON c.source_id = s.source_id
        WHERE c.index_id = :idx AND c.is_active = TRUE
        """,
        {"idx": index_id},
    )
    return df.to_dict("records") if not df.empty else []


def list_sources() -> list[dict]:
    df = _read_sql(
        "SELECT * FROM risk_source_catalog WHERE is_active = TRUE ORDER BY market, source_id"
    )
    return df.to_dict("records") if not df.empty else []
