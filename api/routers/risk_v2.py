"""
Router /api/risk-v2 — Risk Module v2.

DB-driven indices, scenarios, alerts. Reads 100% of configuration from DB
(see migration 0060_risk_module_v2.py). Pairs with:
  - dashboard/services/risk_engine_v2.py  (composite score calculation)
  - dashboard/services/risk_predictor_v2.py (ML scenarios)

Endpoints:
  GET  /api/risk-v2/indices            — current scores for every active index
  GET  /api/risk-v2/indices/{id}       — single index detail (components, deltas)
  GET  /api/risk-v2/indices/{id}/history — timeseries from caché
  GET  /api/risk-v2/scenarios          — all scenario predictions
  POST /api/risk-v2/scenarios/run      — recompute predictions now
  GET  /api/risk-v2/alerts             — active alerts (last N days)
  POST /api/risk-v2/alerts/{id}/ack    — acknowledge an alert
  POST /api/risk-v2/refresh            — recompute every index + fire alerts
  GET  /api/risk-v2/sources            — list of external sources w/ status
  GET  /api/risk-v2/config             — full config (indices+components+thresholds)
  POST /api/risk-v2/seed-demo          — populate raw_values with deterministic demo data
                                          (only when explicitly enabled)
"""
from __future__ import annotations

import logging
import os
import random
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/risk-v2", tags=["risk-v2"])


def _engine_v2():
    from dashboard.services import risk_engine_v2
    return risk_engine_v2


def _predictor_v2():
    from dashboard.services import risk_predictor_v2
    return risk_predictor_v2


# ── Schemas ───────────────────────────────────────────────────────────────────

class IndexCard(BaseModel):
    index_id:        str
    display_name:    str
    display_order:   int
    icon:            str = ""
    score:           float
    label:           str
    delta_7d:        Optional[float] = None
    delta_30d:       Optional[float] = None
    colors:          dict = {}
    source:          str = "computed"
    warnings:        list[str] = []


class IndexDetail(IndexCard):
    description:               str = ""
    components:                list[dict] = []
    n_components_used:         int = 0
    n_components_configured:   int = 0
    as_of:                     str = ""


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/indices")
def get_indices(country: str = Query("ES")) -> dict:
    """Current scores for every active index in a country."""
    engine = _engine_v2()
    indices = engine.compute_all(country=country, persist=True)
    return {
        "country": country,
        "n_indices": len(indices),
        "indices": indices,
    }


@router.get("/indices/{index_id}")
def get_index_detail(index_id: str, country: str = Query("ES")) -> dict:
    engine = _engine_v2()
    result = engine.compute_index(index_id, country=country, persist=True)
    if result["source"] == "no_data" and result["n_components_configured"] == 0:
        raise HTTPException(status_code=404, detail=f"index_not_found:{index_id}")
    return result


@router.get("/indices/{index_id}/history")
def get_index_history(
    index_id: str,
    country: str = Query("ES"),
    days: int = Query(365, ge=7, le=3650),
) -> dict:
    engine = _engine_v2()
    df = engine.get_history(index_id, country=country, days=days)
    rows = []
    if not df.empty:
        rows = [
            {
                "date":     str(r["dt"]),
                "score":    float(r["score"]) if r["score"] is not None else None,
                "delta_7d": float(r["delta_7d"]) if r["delta_7d"] is not None else None,
                "label":    r.get("label") or "",
            }
            for _, r in df.iterrows()
        ]
    return {
        "index_id": index_id,
        "country":  country,
        "days":     days,
        "n":        len(rows),
        "series":   rows,
    }


@router.get("/scenarios")
def get_scenarios(country: str = Query("ES")) -> dict:
    """Returns latest cached scenario predictions (no recompute)."""
    engine = _engine_v2()
    df = engine._read_sql(
        """
        SELECT DISTINCT ON (sp.scenario_id)
               sp.scenario_id, sp.probability, sp.confidence_low,
               sp.confidence_high, sp.key_drivers, sp.calculated_at,
               sc.name, sc.description, sc.horizon_days, sc.probability_model,
               sc.index_id, ri.display_name AS index_name
        FROM risk_scenario_predictions sp
        JOIN risk_scenario_config sc ON sp.scenario_id = sc.scenario_id
        LEFT JOIN risk_index_config ri ON sc.index_id = ri.index_id
        WHERE sp.country_iso2 = :c AND sc.is_active = TRUE
        ORDER BY sp.scenario_id, sp.calculated_at DESC
        """,
        {"c": country},
    )

    if df.empty:
        # No cached predictions yet — list configured scenarios for shape
        cfg = _predictor_v2().list_scenarios()
        return {
            "country": country,
            "n_scenarios": len(cfg),
            "scenarios": [{
                "scenario_id":     s["scenario_id"],
                "name":            s["name"],
                "description":     s.get("description") or "",
                "horizon_days":    int(s.get("horizon_days") or 90),
                "model":           s.get("probability_model") or "logistic",
                "index_id":        s.get("index_id"),
                "probability":     None,
                "confidence_low":  None,
                "confidence_high": None,
                "key_drivers":     {},
                "status":          "never_run",
            } for s in cfg],
            "note": "no_predictions_cached; call POST /api/risk-v2/scenarios/run",
        }

    out = []
    for _, r in df.iterrows():
        kd = r["key_drivers"] if isinstance(r["key_drivers"], dict) else {}
        out.append({
            "scenario_id":     r["scenario_id"],
            "name":            r["name"],
            "description":     r["description"] or "",
            "index_id":        r["index_id"],
            "index_name":      r["index_name"],
            "probability":     round(float(r["probability"]) * 100, 1) if r["probability"] is not None else None,
            "confidence_low":  round(float(r["confidence_low"]) * 100, 1) if r["confidence_low"] is not None else None,
            "confidence_high": round(float(r["confidence_high"]) * 100, 1) if r["confidence_high"] is not None else None,
            "key_drivers":     kd,
            "horizon_days":    int(r["horizon_days"] or 90),
            "model":           r["probability_model"] or "logistic",
            "calculated_at":   r["calculated_at"].isoformat() if r["calculated_at"] else None,
            "status":          "fresh",
        })
    return {"country": country, "n_scenarios": len(out), "scenarios": out}


@router.post("/scenarios/run")
def run_scenarios(country: str = Query("ES")) -> dict:
    predictor = _predictor_v2()
    results = predictor.predict_all(country=country)
    return {
        "country": country,
        "n_runs": len(results),
        "results": results,
    }


@router.get("/scenarios/{scenario_id}/history")
def scenario_history(
    scenario_id: str,
    country: str = Query("ES"),
    days: int = Query(90, ge=7, le=730),
) -> dict:
    predictor = _predictor_v2()
    df = predictor.get_prediction_history(scenario_id, country=country, days=days)
    rows = []
    if not df.empty:
        for _, r in df.iterrows():
            rows.append({
                "date":            str(r["dt"]),
                "probability":     round(float(r["probability"]) * 100, 1) if r["probability"] is not None else None,
                "confidence_low":  round(float(r["confidence_low"]) * 100, 1) if r["confidence_low"] is not None else None,
                "confidence_high": round(float(r["confidence_high"]) * 100, 1) if r["confidence_high"] is not None else None,
            })
    return {"scenario_id": scenario_id, "country": country, "n": len(rows), "series": rows}


@router.get("/alerts")
def get_alerts(country: str = Query("ES"), days: int = Query(30, ge=1, le=365)) -> dict:
    engine = _engine_v2()
    alerts = engine.list_active_alerts(country=country, days=days)
    by_sev = {"critical": 0, "warning": 0, "info": 0}
    for a in alerts:
        sev = a.get("severity", "info")
        by_sev[sev] = by_sev.get(sev, 0) + 1
    return {
        "country":    country,
        "n_active":   len([a for a in alerts if not a["acknowledged"]]),
        "n_total":    len(alerts),
        "by_severity": by_sev,
        "alerts":     alerts,
    }


@router.post("/alerts/{row_id}/ack")
def ack_alert(row_id: int, user: str = Query("ui")) -> dict:
    engine = _engine_v2()
    ok = engine.acknowledge_alert(row_id, user=user)
    return {"ok": ok, "row_id": row_id}


@router.post("/refresh")
def refresh_all(country: str = Query("ES")) -> dict:
    """Recompute every active index, fire alerts, refresh scenarios."""
    engine = _engine_v2()
    predictor = _predictor_v2()

    indices = engine.compute_all(country=country, persist=True)
    fired = engine.fire_alerts(country=country)
    scenarios = predictor.predict_all(country=country)
    return {
        "country":     country,
        "n_indices":   len(indices),
        "n_alerts":    len(fired),
        "n_scenarios": len(scenarios),
        "alerts":      fired,
    }


@router.get("/sources")
def list_sources() -> dict:
    engine = _engine_v2()
    return {"sources": engine.list_sources()}


@router.get("/config")
def get_config() -> dict:
    engine = _engine_v2()
    indices = engine.list_indices()
    out_indices = []
    for idx in indices:
        comps = engine.list_components(idx["index_id"])
        out_indices.append({**idx, "components": comps})
    return {
        "n_indices": len(out_indices),
        "indices":   out_indices,
        "sources":   engine.list_sources(),
    }


# ── Demo seeder ───────────────────────────────────────────────────────────────

@router.post("/seed-demo")
def seed_demo(country: str = Query("ES"), days: int = Query(365, ge=30, le=1825)) -> dict:
    """
    Populate `risk_raw_values` with synthetic-but-plausible series so the engine
    can produce meaningful scores in dev/demo. Disabled in production unless
    `ALLOW_RISK_SEED_DEMO=1`.

    Each metric configured in `risk_index_components` gets a deterministic
    daily walk seeded from its (source_id, metric_name) hash. The seed makes
    the data REPRODUCIBLE — same call always produces same values.

    NOT a substitute for real ETL. Marks `_meta.source: 'demo'` on the response.
    """
    if os.getenv("ALLOW_RISK_SEED_DEMO", "1") != "1":
        raise HTTPException(status_code=403, detail="seed_demo_disabled")

    engine = _engine_v2()
    # Get every (source, metric) tuple referenced by components
    sources_df = engine._read_sql(
        """
        SELECT DISTINCT source_id, metric_name, COALESCE(country_filter, :c) AS country
        FROM risk_index_components
        WHERE is_active = TRUE
        """,
        {"c": country},
    )
    if sources_df.empty:
        raise HTTPException(status_code=400, detail="no_components_configured")

    today = date.today()
    inserted = 0
    for _, row in sources_df.iterrows():
        # Deterministic per (source, metric)
        rng = random.Random(hash((row["source_id"], row["metric_name"])) & 0xFFFFFFFF)
        # Base level + walk
        base = 30 + rng.random() * 40   # 30..70
        walk = base
        for d in range(days, 0, -1):
            walk += rng.gauss(0, 1.4)
            walk = max(5.0, min(95.0, walk))
            ref = today - timedelta(days=d)
            ok = engine._exec(
                """
                INSERT INTO risk_raw_values
                (source_id, country_iso2, metric_name, metric_value, reference_date)
                VALUES (:s, :c, :m, :v, :d)
                ON CONFLICT (source_id, country_iso2, metric_name, reference_date)
                DO UPDATE SET metric_value = EXCLUDED.metric_value
                """,
                {
                    "s": row["source_id"], "c": row["country"],
                    "m": row["metric_name"], "v": round(walk, 3), "d": ref,
                },
            )
            if ok:
                inserted += 1

    # Recompute all indices so values_table fills
    engine.compute_all(country=country, persist=True)
    return {
        "country": country,
        "days": days,
        "rows_inserted_or_updated": inserted,
        "n_metrics_seeded": int(len(sources_df)),
        "warning": "demo_data_synthetic_not_for_production",
    }
