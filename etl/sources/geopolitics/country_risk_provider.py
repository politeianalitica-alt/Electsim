"""
Country Risk Provider — Bloque 14.

Persiste y recupera CountryRiskProfile en BD.
Fallback en memoria cuando no hay BD disponible.
"""
from __future__ import annotations

import json
import logging
from datetime import date, datetime
from typing import Any

from etl.sources.geopolitics.schemas import CountryRiskProfile

logger = logging.getLogger(__name__)

# In-memory cache: iso3 → CountryRiskProfile
_RISK_CACHE: dict[str, CountryRiskProfile] = {}


def save_risk_profile(profile: CountryRiskProfile) -> bool:
    """Persiste un CountryRiskProfile. Retorna True si tuvo éxito."""
    _RISK_CACHE[profile.country_iso3] = profile
    try:
        conn = _get_conn()
        if conn is None:
            return True  # cache only
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO geo_country_risk (
                    country_iso3, country_name, risk_date,
                    conflict_risk, political_risk, economic_risk,
                    energy_risk, migration_risk, defense_risk,
                    reputation_risk, total_score, trend,
                    interest_for_spain, explanation, raw_payload
                ) VALUES (
                    %(iso3)s, %(name)s, %(date)s,
                    %(conflict)s, %(political)s, %(economic)s,
                    %(energy)s, %(migration)s, %(defense)s,
                    %(reputation)s, %(total)s, %(trend)s,
                    %(spain)s, %(explanation)s, %(raw)s
                )
                ON CONFLICT (country_iso3, risk_date) DO UPDATE SET
                    total_score = EXCLUDED.total_score,
                    trend = EXCLUDED.trend,
                    raw_payload = EXCLUDED.raw_payload
                """,
                {
                    "iso3": profile.country_iso3,
                    "name": profile.country_name,
                    "date": profile.date,
                    "conflict": profile.conflict_risk,
                    "political": profile.political_risk,
                    "economic": profile.economic_risk,
                    "energy": profile.energy_risk,
                    "migration": profile.migration_risk,
                    "defense": profile.defense_risk,
                    "reputation": profile.reputation_risk,
                    "total": profile.total_score,
                    "trend": profile.trend,
                    "spain": profile.interest_for_spain,
                    "explanation": profile.explanation,
                    "raw": json.dumps(profile.raw_payload),
                },
            )
        conn.commit()
        return True
    except Exception as exc:
        logger.warning("save_risk_profile BD error: %s", exc)
        return False


def get_risk_profile(country_iso3: str, risk_date: date | None = None) -> CountryRiskProfile | None:
    """Recupera perfil de riesgo por ISO3. None si no existe."""
    if country_iso3 in _RISK_CACHE:
        return _RISK_CACHE[country_iso3]
    try:
        conn = _get_conn()
        if conn is None:
            return None
        target_date = risk_date or date.today()
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT country_iso3, country_name, risk_date,
                       conflict_risk, political_risk, economic_risk,
                       energy_risk, migration_risk, defense_risk,
                       reputation_risk, total_score, trend,
                       interest_for_spain, explanation, raw_payload
                FROM geo_country_risk
                WHERE country_iso3 = %s
                ORDER BY ABS(EXTRACT(EPOCH FROM (risk_date - %s)))
                LIMIT 1
                """,
                (country_iso3, target_date),
            )
            row = cur.fetchone()
            if row:
                return _row_to_profile(row)
    except Exception as exc:
        logger.debug("get_risk_profile BD error: %s", exc)
    return None


def list_risk_profiles(min_score: float = 0.0, limit: int = 50) -> list[CountryRiskProfile]:
    """Lista perfiles de riesgo ordenados por total_score desc."""
    if _RISK_CACHE:
        profiles = sorted(_RISK_CACHE.values(), key=lambda p: p.total_score, reverse=True)
        return [p for p in profiles if p.total_score >= min_score][:limit]
    try:
        conn = _get_conn()
        if conn is None:
            return []
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT DISTINCT ON (country_iso3)
                    country_iso3, country_name, risk_date,
                    conflict_risk, political_risk, economic_risk,
                    energy_risk, migration_risk, defense_risk,
                    reputation_risk, total_score, trend,
                    interest_for_spain, explanation, raw_payload
                FROM geo_country_risk
                WHERE total_score >= %s
                ORDER BY country_iso3, risk_date DESC
                LIMIT %s
                """,
                (min_score, limit),
            )
            rows = cur.fetchall()
            return [_row_to_profile(r) for r in rows]
    except Exception as exc:
        logger.debug("list_risk_profiles BD error: %s", exc)
        return []


def clear_cache() -> None:
    """Limpia el caché en memoria."""
    _RISK_CACHE.clear()


# ── Helpers privados ─────────────────────────────────────────────────────────

def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None


def _row_to_profile(row: tuple) -> CountryRiskProfile:
    (iso3, name, risk_date, conflict, political, economic,
     energy, migration, defense, reputation, total, trend,
     spain, explanation, raw_payload) = row
    raw = raw_payload if isinstance(raw_payload, dict) else json.loads(raw_payload or "{}")
    return CountryRiskProfile(
        country_iso3=iso3,
        country_name=name or "",
        date=risk_date if isinstance(risk_date, date) else date.today(),
        conflict_risk=float(conflict or 0),
        political_risk=float(political or 0),
        economic_risk=float(economic or 0),
        energy_risk=float(energy or 0),
        migration_risk=float(migration or 0),
        defense_risk=float(defense or 0),
        reputation_risk=float(reputation or 0),
        total_score=float(total or 0),
        trend=trend or "stable",
        interest_for_spain=float(spain or 0),
        explanation=explanation or "",
        raw_payload=raw,
    )
