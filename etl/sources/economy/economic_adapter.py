"""
Economic Adapter — Bloque 5.

Normaliza, valida y deduplica MacroIndicator antes de persistir en BD.
También actualiza economic_series con los metadatos de cada indicador.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from .schemas import EconomicSeries, MacroIndicator

logger = logging.getLogger(__name__)


def validate_indicators(
    indicators: list[MacroIndicator],
) -> tuple[list[MacroIndicator], list[str]]:
    """
    Valida una lista de MacroIndicator.

    Returns:
        (valid_indicators, error_messages)
    """
    valid: list[MacroIndicator] = []
    errors: list[str] = []

    for ind in indicators:
        try:
            # Comprobaciones básicas
            if not ind.indicator_id or not ind.name:
                errors.append(f"indicator_id o name vacíos: {ind}")
                continue
            if ind.value is None or (ind.value != ind.value):  # NaN check
                errors.append(f"Valor nulo/NaN para {ind.indicator_id} @ {ind.date}")
                continue
            valid.append(ind)
        except Exception as exc:
            errors.append(str(exc))

    return valid, errors


def deduplicate_indicators(
    indicators: list[MacroIndicator],
) -> list[MacroIndicator]:
    """
    Elimina duplicados por (provider, indicator_id, geography, date, vintage_date).
    Mantiene el más reciente por fetched_at.
    """
    seen: dict[tuple, MacroIndicator] = {}
    for ind in indicators:
        key = (
            ind.provider,
            ind.indicator_id,
            ind.geography,
            str(ind.date),
            str(ind.vintage_date),
        )
        existing = seen.get(key)
        if existing is None or ind.fetched_at > existing.fetched_at:
            seen[key] = ind
    return list(seen.values())


def indicators_to_series(
    indicators: list[MacroIndicator],
) -> list[EconomicSeries]:
    """
    Genera EconomicSeries (metadatos) a partir de observaciones.
    Una serie por (provider, indicator_id, geography).
    """
    series_map: dict[tuple, dict[str, Any]] = {}

    for ind in indicators:
        key = (ind.provider, ind.indicator_id, ind.geography)
        if key not in series_map:
            series_map[key] = {
                "source": ind.source,
                "provider": ind.provider,
                "indicator_id": ind.indicator_id,
                "name": ind.name,
                "geography": ind.geography,
                "geography_type": ind.geography_type,
                "frequency": ind.frequency,
                "unit": ind.unit,
                "category": ind.category,
                "sector": ind.sector,
                "start_date": ind.date,
                "end_date": ind.date,
                "last_value": ind.value,
                "last_date": ind.date,
                "active": True,
            }
        else:
            entry = series_map[key]
            if ind.date < entry["start_date"]:
                entry["start_date"] = ind.date
            if ind.date > entry["end_date"]:
                entry["end_date"] = ind.date
                entry["last_value"] = ind.value
                entry["last_date"] = ind.date

    return [EconomicSeries(**data) for data in series_map.values()]


def upsert_indicators(
    indicators: list[MacroIndicator],
    engine: Any,
) -> dict[str, int]:
    """
    Persiste MacroIndicator en macro_indicators con ON CONFLICT DO UPDATE.

    Returns:
        dict con: n_inserted, n_updated, n_errors.
    """
    stats = {"n_inserted": 0, "n_updated": 0, "n_errors": 0}
    if not indicators or engine is None:
        return stats

    valid, errors = validate_indicators(indicators)
    stats["n_errors"] += len(errors)

    deduped = deduplicate_indicators(valid)

    try:
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for ind in deduped:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO macro_indicators (
                            source, provider, indicator_id, name,
                            geography, geography_type, frequency, date, value,
                            unit, seasonally_adjusted, category, sector,
                            vintage_date, release_date, raw_payload, fetched_at
                        ) VALUES (
                            :source, :provider, :indicator_id, :name,
                            :geography, :geography_type, :frequency, :date, :value,
                            :unit, :seasonally_adjusted, :category, :sector,
                            :vintage_date, :release_date, :raw_payload::jsonb, :fetched_at
                        )
                        ON CONFLICT (provider, indicator_id, geography, date, vintage_date)
                        DO UPDATE SET
                            value = EXCLUDED.value,
                            fetched_at = EXCLUDED.fetched_at,
                            raw_payload = EXCLUDED.raw_payload
                    """), ind.to_db_dict())
                    stats["n_inserted"] += 1
                except Exception as exc:
                    logger.debug("upsert_indicator error: %s", exc)
                    stats["n_errors"] += 1
    except Exception as exc:
        logger.error("upsert_indicators: %s", exc)

    return stats


def upsert_series(
    series_list: list[EconomicSeries],
    engine: Any,
) -> dict[str, int]:
    """
    Persiste EconomicSeries en economic_series.

    Returns:
        dict con: n_upserted, n_errors.
    """
    stats = {"n_upserted": 0, "n_errors": 0}
    if not series_list or engine is None:
        return stats

    try:
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for s in series_list:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO economic_series (
                            source, provider, indicator_id, name, description,
                            geography, geography_type, frequency, unit, category, sector,
                            start_date, end_date, last_value, last_date, active,
                            metadata, updated_at
                        ) VALUES (
                            :source, :provider, :indicator_id, :name, :description,
                            :geography, :geography_type, :frequency, :unit, :category, :sector,
                            :start_date, :end_date, :last_value, :last_date, :active,
                            :metadata::jsonb, NOW()
                        )
                        ON CONFLICT (provider, indicator_id, geography)
                        DO UPDATE SET
                            last_value = EXCLUDED.last_value,
                            last_date = EXCLUDED.last_date,
                            end_date = EXCLUDED.end_date,
                            updated_at = NOW()
                    """), {
                        "source": s.source,
                        "provider": s.provider,
                        "indicator_id": s.indicator_id,
                        "name": s.name,
                        "description": s.description,
                        "geography": s.geography,
                        "geography_type": s.geography_type,
                        "frequency": s.frequency,
                        "unit": s.unit,
                        "category": s.category,
                        "sector": s.sector,
                        "start_date": s.start_date,
                        "end_date": s.end_date,
                        "last_value": s.last_value,
                        "last_date": s.last_date,
                        "active": s.active,
                        "metadata": json.dumps(s.metadata),
                    })
                    stats["n_upserted"] += 1
                except Exception as exc:
                    logger.debug("upsert_series error: %s", exc)
                    stats["n_errors"] += 1
    except Exception as exc:
        logger.error("upsert_series: %s", exc)

    return stats


def compute_freshness(last_date: "date | None", frequency: str) -> str:
    """Evalúa si una serie está actualizada según su frecuencia."""
    from datetime import date, timedelta
    if last_date is None:
        return "unknown"
    days_old = (date.today() - last_date).days
    thresholds = {
        "daily": 3,
        "weekly": 10,
        "monthly": 45,
        "quarterly": 100,
        "annual": 400,
    }
    thr = thresholds.get(frequency, 90)
    if days_old <= thr:
        return "fresh"
    elif days_old <= thr * 2:
        return "stale"
    else:
        return "outdated"
