"""
Macro Finance Core — read-only service for the /macro dashboard.

Reads from `macro_raw_values`, `macro_pair_values`, `macro_indicator_config`
populated by `etl/macro_v2/`. Never raises to callers.

Public API:
  - panorama(country)            → KPI snapshot (PIB, inflación, paro, deuda, spread)
  - markets_timeseries(days)     → ECB yields + spreads + EURUSD
  - bis_exposures(country)       → BIS LBS by counterparty
  - dots_trade(reporter, window) → IMF DOTS bilateral flows
  - cofer_reserves(days)         → IMF COFER reserves composition
  - bop_spain(years)             → BdE BoP series
  - hicp(countries, days)        → Eurostat HICP
  - labor(countries, days)       → Eurostat unemployment
  - ntl(countries)               → World Bank NTL proxy
  - debt_yields(countries)       → ECB long-term yields
  - sources_health()             → freshness of every source
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Optional

import pandas as pd
from sqlalchemy import text as sa_text

logger = logging.getLogger(__name__)


def _engine() -> Any:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("macro_finance_core._engine: %s", exc)
        return None


def _read_sql(q: str, params: Optional[dict] = None) -> pd.DataFrame:
    eng = _engine()
    if eng is None:
        return pd.DataFrame()
    try:
        with eng.connect() as conn:
            r = conn.execute(sa_text(q), params or {})
            rows = r.fetchall()
            if not rows:
                return pd.DataFrame()
            return pd.DataFrame(rows, columns=list(r.keys()))
    except Exception as exc:
        logger.debug("macro_finance_core._read_sql: %s", exc)
        return pd.DataFrame()


# ── Indicator config lookup ───────────────────────────────────────────────────

def indicator_config() -> dict[str, dict]:
    df = _read_sql("SELECT * FROM macro_indicator_config WHERE is_active = TRUE")
    if df.empty:
        return {}
    return {row["indicator_id"]: row.to_dict() for _, row in df.iterrows()}


def _latest_value(source_id: str, metric: str, country: str = "ES") -> Optional[dict]:
    df = _read_sql(
        """
        SELECT metric_value, reference_date, unit
        FROM macro_raw_values
        WHERE source_id = :s AND metric_name = :m AND country_iso2 = :c
        ORDER BY reference_date DESC LIMIT 1
        """,
        {"s": source_id, "m": metric, "c": country},
    )
    if df.empty:
        return None
    row = df.iloc[0]
    return {
        "value": float(row["metric_value"]),
        "as_of": row["reference_date"].isoformat() if isinstance(row["reference_date"], (date, datetime)) else str(row["reference_date"]),
        "unit":  row.get("unit") or "",
    }


def _value_at(source_id: str, metric: str, country: str, days_ago: int) -> Optional[float]:
    target = date.today() - timedelta(days=days_ago)
    df = _read_sql(
        """
        SELECT metric_value FROM macro_raw_values
        WHERE source_id = :s AND metric_name = :m AND country_iso2 = :c
          AND reference_date <= :d
        ORDER BY reference_date DESC LIMIT 1
        """,
        {"s": source_id, "m": metric, "c": country, "d": target},
    )
    if df.empty:
        return None
    return float(df.iloc[0]["metric_value"])


def _delta(source_id: str, metric: str, country: str, days_ago: int) -> Optional[dict]:
    latest = _latest_value(source_id, metric, country)
    prev = _value_at(source_id, metric, country, days_ago)
    if not latest or prev is None:
        return None
    diff = latest["value"] - prev
    return {
        "current":   latest["value"],
        "previous":  prev,
        "delta":     round(diff, 3),
        "delta_pct": round(diff / prev * 100, 2) if prev != 0 else None,
        "as_of":     latest["as_of"],
        "unit":      latest["unit"],
    }


# ── Panorama snapshot ─────────────────────────────────────────────────────────

def panorama(country: str = "ES") -> dict:
    """Returns top-line KPIs with deltas for the country."""
    indicators = [
        # (label_id, source_id, metric, lookback_days)
        ("yield_10y",          "ecb_sdw",      f"yield_{country.lower()}_10y", 30),
        ("spread_vs_de",       "ecb_sdw",      f"spread_{country.lower()}_de_10y", 30),
        ("hicp_yoy",           "eurostat_hicp","hicp_yoy", 90),
        ("unemployment",       "eurostat_lfs", "unemployment_rate", 60),
        ("hpi_yoy",            "eurostat_hpi", "hpi_yoy", 120),
        ("eurusd",             "ecb_sdw",      "eurusd", 7),
        ("ecb_rate",           "ecb_sdw",      "ecb_main_rate", 90),
        ("epu",                "epu",          "epu_country", 30),
    ]
    out: list[dict] = []
    cfg = indicator_config()
    for label_id, src, metric, lb in indicators:
        d = _delta(src, metric, country, lb)
        cfg_match = cfg.get(label_id) or {}
        entry = {
            "label_id":     label_id,
            "display_name": cfg_match.get("display_name") or label_id.replace("_", " ").title(),
            "category":     cfg_match.get("category", ""),
            "unit":         cfg_match.get("unit") or (d["unit"] if d else ""),
            "current":      d["current"] if d else None,
            "delta":        d["delta"] if d else None,
            "delta_pct":    d["delta_pct"] if d else None,
            "as_of":        d["as_of"] if d else None,
            "source_id":    src,
        }
        out.append(entry)
    return {"country": country, "indicators": out}


# ── Markets timeseries ────────────────────────────────────────────────────────

def markets_timeseries(days: int = 365, country: str = "ES") -> dict:
    """Daily series of yields, spreads, EURUSD, ECB rate."""
    since = date.today() - timedelta(days=days)
    df = _read_sql(
        """
        SELECT reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'ecb_sdw' AND reference_date >= :d
          AND country_iso2 IN (:c, 'EU', 'WO')
        ORDER BY reference_date
        """,
        {"d": since, "c": country},
    )
    if df.empty:
        return {"days": days, "country": country, "series": {}}
    series: dict[str, list[dict]] = {}
    for metric, group in df.groupby("metric_name"):
        series[str(metric)] = [
            {"date": r["reference_date"].isoformat(), "value": float(r["metric_value"])}
            for _, r in group.iterrows()
        ]
    return {"days": days, "country": country, "series": series}


# ── BIS exposures ─────────────────────────────────────────────────────────────

def bis_exposures(country: str = "ES", n_quarters: int = 12) -> dict:
    df = _read_sql(
        """
        SELECT counterparty, reference_date, metric_value
        FROM macro_pair_values
        WHERE source_id = 'bis_lbs'
          AND reporter_iso2 = :c
          AND metric_name = 'claims_total_usd_bn'
        ORDER BY reference_date DESC
        """,
        {"c": country},
    )
    if df.empty:
        return {"country": country, "matrix": [], "counterparties": [], "periods": []}
    # Pivot
    pivot = df.pivot_table(
        index="counterparty", columns="reference_date", values="metric_value", aggfunc="last"
    )
    # Keep last n quarters
    cols = sorted(pivot.columns)[-n_quarters:]
    pivot = pivot[cols]
    # Top 15 counterparties by latest value
    pivot = pivot.assign(_latest=pivot[cols[-1]]).sort_values("_latest", ascending=False).head(15).drop(columns=["_latest"])
    matrix = []
    for cp, row in pivot.iterrows():
        matrix.append({
            "counterparty": str(cp),
            "series": [
                {"date": (d.isoformat() if hasattr(d, "isoformat") else str(d)), "value": float(v) if pd.notna(v) else None}
                for d, v in row.items()
            ],
        })
    return {
        "country": country,
        "periods": [d.isoformat() if hasattr(d, "isoformat") else str(d) for d in cols],
        "counterparties": [m["counterparty"] for m in matrix],
        "matrix": matrix,
    }


# ── IMF DOTS bilateral trade ──────────────────────────────────────────────────

def dots_trade(reporter: str = "ES", months: int = 60) -> dict:
    since = date.today() - timedelta(days=months * 31)
    df = _read_sql(
        """
        SELECT reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'imf_dots' AND country_iso2 = :c AND reference_date >= :d
        ORDER BY reference_date
        """,
        {"c": reporter, "d": since},
    )
    series: dict[str, list[dict]] = {"exports": [], "imports": [], "balance": []}
    if not df.empty:
        for metric, group in df.groupby("metric_name"):
            key = "exports" if "export" in str(metric).lower() else (
                  "imports" if "import" in str(metric).lower() else "balance")
            for _, r in group.iterrows():
                series.setdefault(key, []).append({
                    "date": r["reference_date"].isoformat(),
                    "value": float(r["metric_value"]),
                })
        # Compute balance if not already present
        if not series["balance"] and series["exports"] and series["imports"]:
            ix = {p["date"]: p["value"] for p in series["exports"]}
            for p in series["imports"]:
                if p["date"] in ix:
                    series["balance"].append({
                        "date": p["date"],
                        "value": ix[p["date"]] - p["value"],
                    })
    return {"reporter": reporter, "months": months, "series": series}


# ── COFER reserves composition ────────────────────────────────────────────────

def cofer_reserves(days: int = 365 * 6) -> dict:
    since = date.today() - timedelta(days=days)
    df = _read_sql(
        """
        SELECT reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'imf_cofer' AND reference_date >= :d
        ORDER BY reference_date
        """,
        {"d": since},
    )
    series: dict[str, list[dict]] = {}
    if not df.empty:
        for metric, group in df.groupby("metric_name"):
            series[str(metric)] = [
                {"date": r["reference_date"].isoformat(), "value": float(r["metric_value"])}
                for _, r in group.iterrows()
            ]
    return {"days": days, "series": series}


# ── Banco de España balanza de pagos ──────────────────────────────────────────

def bop_spain(years: int = 10) -> dict:
    since = date.today() - timedelta(days=years * 365)
    df = _read_sql(
        """
        SELECT reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'bde_bop' AND country_iso2 = 'ES' AND reference_date >= :d
        ORDER BY reference_date
        """,
        {"d": since},
    )
    series: dict[str, list[dict]] = {}
    if not df.empty:
        for metric, group in df.groupby("metric_name"):
            series[str(metric)] = [
                {"date": r["reference_date"].isoformat(), "value": float(r["metric_value"])}
                for _, r in group.iterrows()
            ]
    return {"years": years, "series": series}


# ── Eurostat HICP & labour ────────────────────────────────────────────────────

def hicp(countries: Optional[list[str]] = None, days: int = 365 * 3) -> dict:
    countries = countries or ["ES", "FR", "IT", "DE", "PT"]
    since = date.today() - timedelta(days=days)
    df = _read_sql(
        """
        SELECT country_iso2, reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'eurostat_hicp' AND reference_date >= :d
          AND country_iso2 = ANY(:c)
        ORDER BY country_iso2, reference_date
        """,
        {"d": since, "c": countries},
    )
    out: dict[str, list[dict]] = {}
    if not df.empty:
        for c, group in df.groupby("country_iso2"):
            out[str(c)] = [
                {
                    "date":   r["reference_date"].isoformat(),
                    "metric": r["metric_name"],
                    "value":  float(r["metric_value"]),
                }
                for _, r in group.iterrows()
            ]
    return {"countries": countries, "days": days, "series": out}


def labor(countries: Optional[list[str]] = None, days: int = 365 * 3) -> dict:
    countries = countries or ["ES", "FR", "IT", "DE", "PT"]
    since = date.today() - timedelta(days=days)
    df = _read_sql(
        """
        SELECT country_iso2, reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'eurostat_lfs' AND reference_date >= :d
          AND country_iso2 = ANY(:c)
        ORDER BY country_iso2, reference_date
        """,
        {"d": since, "c": countries},
    )
    out: dict[str, list[dict]] = {}
    if not df.empty:
        for c, group in df.groupby("country_iso2"):
            out[str(c)] = [
                {
                    "date":   r["reference_date"].isoformat(),
                    "metric": r["metric_name"],
                    "value":  float(r["metric_value"]),
                }
                for _, r in group.iterrows()
            ]
    return {"countries": countries, "days": days, "series": out}


# ── Nightlights / electricity access proxy ───────────────────────────────────

def ntl(countries: Optional[list[str]] = None) -> dict:
    countries = countries or ["ES", "RU", "UA", "IR", "VE", "KP", "CN", "DE"]
    df = _read_sql(
        """
        SELECT country_iso2, reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id IN ('ntl_wb', 'ntl_viirs') AND country_iso2 = ANY(:c)
        ORDER BY country_iso2, reference_date
        """,
        {"c": countries},
    )
    out: dict[str, list[dict]] = {}
    if not df.empty:
        for c, group in df.groupby("country_iso2"):
            out[str(c)] = [
                {
                    "date":   r["reference_date"].isoformat(),
                    "metric": r["metric_name"],
                    "value":  float(r["metric_value"]),
                }
                for _, r in group.iterrows()
            ]
    return {"countries": countries, "series": out}


# ── Debt yields cross-country ─────────────────────────────────────────────────

def debt_yields(countries: Optional[list[str]] = None, days: int = 365 * 2) -> dict:
    countries = countries or ["ES", "FR", "IT", "DE", "PT"]
    since = date.today() - timedelta(days=days)
    df = _read_sql(
        """
        SELECT country_iso2, reference_date, metric_name, metric_value
        FROM macro_raw_values
        WHERE source_id = 'ecb_sdw' AND reference_date >= :d
          AND metric_name LIKE 'yield_%_10y'
          AND country_iso2 = ANY(:c)
        ORDER BY country_iso2, reference_date
        """,
        {"d": since, "c": countries},
    )
    out: dict[str, list[dict]] = {}
    if not df.empty:
        for c, group in df.groupby("country_iso2"):
            out[str(c)] = [
                {"date": r["reference_date"].isoformat(), "value": float(r["metric_value"])}
                for _, r in group.iterrows()
            ]
    return {"countries": countries, "days": days, "series": out}


# ── Sources health ────────────────────────────────────────────────────────────

def sources_health() -> list[dict]:
    df = _read_sql(
        """
        SELECT s.*,
               (SELECT COUNT(*) FROM macro_raw_values v WHERE v.source_id = s.source_id) AS n_rows,
               (SELECT MAX(reference_date) FROM macro_raw_values v WHERE v.source_id = s.source_id) AS latest_data
        FROM macro_source_catalog s
        ORDER BY s.category, s.source_id
        """
    )
    if df.empty:
        return []
    out = []
    for _, r in df.iterrows():
        out.append({
            "source_id":   r["source_id"],
            "name":        r["name"],
            "category":    r["category"],
            "cadencia":    r["cadencia"],
            "market":      r["market"],
            "is_active":   bool(r["is_active"]),
            "last_fetch":  r["last_fetch"].isoformat() if isinstance(r["last_fetch"], (date, datetime)) else None,
            "last_error":  r["last_error"],
            "n_rows":      int(r["n_rows"] or 0),
            "latest_data": r["latest_data"].isoformat() if isinstance(r["latest_data"], (date, datetime)) else None,
        })
    return out
