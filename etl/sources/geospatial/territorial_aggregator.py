"""
Territorial Aggregator — Bloque 7.

Agrega datos de otros módulos por territorio:
  Electoral  → nowcast, resultados, voto blando
  Económico  → paro, renta, stress
  Medios     → intensidad mediática
  Riesgo     → exposición por actor local

Todas las funciones degradan gracefully si no hay tablas o datos.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

from etl.sources.geospatial.schemas import (
    TerritoryProfile,
    build_territory_id,
    SPAIN_PROVINCES,
)


# ── Electoral ─────────────────────────────────────────────────────────────────

def aggregate_electoral_by_territory(
    territory_type: str = "province",
    engine: Any = None,
) -> pd.DataFrame:
    """
    Agrega datos electorales por territorio.

    Returns:
        DataFrame con columnas: territory_id, leading_party, swing_index,
        turnout_last, seats_at_risk, soft_vote_pct.
    """
    if engine is None:
        return _electoral_from_bloque6(territory_type)

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            # Resultados más recientes por geografía
            rows = pd.read_sql(sa_text("""
                SELECT r.geography_id AS territory_id,
                       r.party_id,
                       r.vote_share,
                       r.seats,
                       r.turnout
                FROM election_results r
                INNER JOIN (
                    SELECT geography_id, MAX(e.election_date) AS max_date
                    FROM election_results r2
                    JOIN elections e ON r2.election_id = e.election_id
                    GROUP BY geography_id
                ) latest ON r.geography_id = latest.territory_id
                ORDER BY r.vote_share DESC NULLS LAST
            """), conn)
        if rows.empty:
            return _electoral_from_bloque6(territory_type)
        return _process_electoral_rows(rows)
    except Exception as exc:
        logger.debug("aggregate_electoral_by_territory: %s", exc)
        return _electoral_from_bloque6(territory_type)


def _electoral_from_bloque6(territory_type: str) -> pd.DataFrame:
    """Fallback: usa nowcast de Bloque 6 si está disponible."""
    try:
        from dashboard.services.electoral_core import cargar_nowcast_actual
        nc = cargar_nowcast_actual()
        if not nc.get("hay_datos"):
            return pd.DataFrame()

        party_estimates = nc.get("party_estimates", {})
        seat_estimates = nc.get("seat_estimates", {})
        leading = nc.get("leading_party")

        # Crear una fila nacional si no hay datos provinciales
        if territory_type == "province":
            rows = []
            for code, name in SPAIN_PROVINCES.items():
                tid = build_territory_id("province", code)
                rows.append({
                    "territory_id": tid,
                    "territory_name": name,
                    "leading_party": leading,
                    "swing_index": None,
                    "turnout_last": None,
                    "seats_total": None,
                })
            return pd.DataFrame(rows)
        return pd.DataFrame()
    except Exception as exc:
        logger.debug("_electoral_from_bloque6: %s", exc)
        return pd.DataFrame()


def _process_electoral_rows(df: pd.DataFrame) -> pd.DataFrame:
    """Procesa resultados electorales en formato por territorio."""
    try:
        idx = df.groupby("territory_id")["vote_share"].idxmax()
        winners = df.loc[idx, ["territory_id", "party_id"]].copy()
        winners.columns = ["territory_id", "leading_party"]
        turnout = df.groupby("territory_id")["turnout"].first().reset_index()
        merged = winners.merge(turnout, on="territory_id", how="left")
        return merged
    except Exception:
        return pd.DataFrame()


# ── Económico ─────────────────────────────────────────────────────────────────

def aggregate_economic_by_territory(
    territory_type: str = "province",
    engine: Any = None,
) -> pd.DataFrame:
    """
    Agrega datos económicos por territorio.

    Returns:
        DataFrame con columnas: territory_id, unemployment_rate, income_avg,
        economic_stress (0-100).
    """
    if engine is None:
        return _economic_demo(territory_type)

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT geography_id AS territory_id,
                       AVG(CASE WHEN indicator_id = 'paro_provincial' THEN value END) AS unemployment_rate,
                       AVG(CASE WHEN indicator_id = 'renta_municipal' THEN value END) AS income_avg
                FROM macro_indicators
                WHERE geography_id IS NOT NULL
                  AND date >= :cutoff
                GROUP BY geography_id
            """), conn, params={"cutoff": date.today() - timedelta(days=365)})
        if not df.empty:
            df["economic_stress"] = _compute_economic_stress(df)
            return df
    except Exception as exc:
        logger.debug("aggregate_economic_by_territory: %s", exc)

    return _economic_demo(territory_type)


def _economic_demo(territory_type: str) -> pd.DataFrame:
    """Demo económico por provincia con datos ilustrativos."""
    if territory_type != "province":
        return pd.DataFrame()

    import random
    random.seed(42)
    rows = []
    for code, name in SPAIN_PROVINCES.items():
        tid = build_territory_id("province", code)
        unemp = 8.0 + random.gauss(0, 4.0)
        unemp = max(3.0, min(30.0, unemp))
        income = 22000 + random.gauss(0, 5000)
        income = max(12000, min(38000, income))
        stress = _stress_from_indicators(unemp, income)
        rows.append({
            "territory_id": tid,
            "territory_name": name,
            "unemployment_rate": round(unemp, 1),
            "income_avg": round(income),
            "economic_stress": round(stress, 1),
        })
    return pd.DataFrame(rows)


def _compute_economic_stress(df: pd.DataFrame) -> pd.Series:
    """Computa economic_stress (0-100) desde paro e ingreso."""
    stress = pd.Series(50.0, index=df.index)
    if "unemployment_rate" in df.columns:
        # Paro > 15% = stress alto
        unemp_norm = (df["unemployment_rate"].fillna(12) - 5) / 20 * 50
        stress += unemp_norm.clip(0, 50)
    if "income_avg" in df.columns:
        # Renta baja = stress alto
        income_norm = (1 - (df["income_avg"].fillna(22000) - 12000) / 26000) * 30
        stress += income_norm.clip(-15, 30)
    return stress.clip(0, 100)


def _stress_from_indicators(unemployment: float, income: float) -> float:
    """Calcula stress económico (0-100) desde paro e ingreso."""
    unemp_factor = (max(0, unemployment - 5) / 20) * 50
    income_factor = (1 - (max(12000, income) - 12000) / 26000) * 30
    return min(100, max(0, 50 + unemp_factor + income_factor - 15))


# ── Medios ────────────────────────────────────────────────────────────────────

def aggregate_media_by_territory(
    days: int = 7,
    territory_type: str = "province",
    engine: Any = None,
) -> pd.DataFrame:
    """
    Agrega intensidad mediática por territorio.

    Returns:
        DataFrame con columnas: territory_id, mentions_count, media_intensity (0-100).
    """
    if engine is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        cutoff = date.today() - timedelta(days=days)
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT territorio AS territory_id,
                       COUNT(*) AS mentions_count
                FROM media_items
                WHERE published_at >= :cutoff
                  AND territorio IS NOT NULL
                GROUP BY territorio
                ORDER BY mentions_count DESC
                LIMIT 100
            """), conn, params={"cutoff": cutoff.isoformat()})
        if not df.empty:
            max_mentions = df["mentions_count"].max() or 1
            df["media_intensity"] = (df["mentions_count"] / max_mentions * 100).round(1)
            return df
    except Exception as exc:
        logger.debug("aggregate_media_by_territory: %s", exc)

    return pd.DataFrame()


# ── Riesgo ────────────────────────────────────────────────────────────────────

def aggregate_risk_by_territory(
    territory_type: str = "province",
    engine: Any = None,
) -> pd.DataFrame:
    """
    Agrega exposición al riesgo por territorio desde actores y entidades.

    Returns:
        DataFrame con columnas: territory_id, risk_exposure (0-100), n_entities.
    """
    if engine is None:
        return pd.DataFrame()

    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            df = pd.read_sql(sa_text("""
                SELECT provincia AS territory_id,
                       COUNT(*) AS n_entities,
                       AVG(COALESCE(score_riesgo, 50)) AS risk_exposure
                FROM actores
                WHERE provincia IS NOT NULL
                GROUP BY provincia
                ORDER BY risk_exposure DESC
                LIMIT 100
            """), conn)
        if not df.empty:
            # Normalizar territory_id a formato estable
            df["territory_id"] = df["territory_id"].apply(
                lambda x: _normalize_territory_id(str(x))
            )
            return df
    except Exception as exc:
        logger.debug("aggregate_risk_by_territory: %s", exc)

    return pd.DataFrame()


def _normalize_territory_id(raw: str) -> str:
    """Convierte nombre de provincia a territory_id estable."""
    from etl.sources.geospatial.ine_geography_adapter import find_province_by_name
    t = find_province_by_name(raw)
    return t.territory_id if t else raw


# ── Territory Profile ─────────────────────────────────────────────────────────

def build_territory_profile(
    territory_id: str,
    engine: Any = None,
) -> TerritoryProfile:
    """
    Construye el perfil agregado de un territorio.

    Args:
        territory_id: ID del territorio (ej. "prov:28").
        engine: SQLAlchemy engine (puede ser None).

    Returns:
        TerritoryProfile con todos los datos disponibles.
    """
    # Nombre del territorio
    name = _get_territory_name(territory_id)

    # Datos económicos
    econ_df = aggregate_economic_by_territory(engine=engine)
    econ_row = econ_df[econ_df["territory_id"] == territory_id].iloc[0] \
        if not econ_df.empty and territory_id in econ_df["territory_id"].values else None

    # Datos electorales
    elect_df = aggregate_electoral_by_territory(engine=engine)
    elect_row = elect_df[elect_df["territory_id"] == territory_id].iloc[0] \
        if not elect_df.empty and territory_id in elect_df["territory_id"].values else None

    # Datos de señales
    active_alerts = _count_active_signals(territory_id, engine)

    profile = TerritoryProfile(
        territory_id=territory_id,
        name=name,
        territory_type=_infer_type(territory_id),
        economic_risk=float(econ_row["economic_stress"]) if econ_row is not None else None,
        unemployment_rate=float(econ_row["unemployment_rate"]) if econ_row is not None else None,
        income_avg=float(econ_row["income_avg"]) if econ_row is not None else None,
        last_election_winner=str(elect_row["leading_party"]) if elect_row is not None else None,
        turnout_last=float(elect_row["turnout"]) if elect_row is not None and "turnout" in elect_row else None,
        active_alerts=active_alerts,
    )

    # Prioridad de campaña
    profile.campaign_priority = compute_campaign_priority(territory_id, profile, engine)

    return profile


def compute_campaign_priority(
    territory_id: str,
    profile: TerritoryProfile | None = None,
    engine: Any = None,
) -> float:
    """
    Calcula el score de prioridad de campaña (0-100) para un territorio.

    Fórmula:
        swing_factor * 30 + soft_vote_factor * 25 +
        economic_stress_factor * 20 + media_intensity_factor * 15 +
        population_factor * 10
    """
    if profile is None:
        profile = build_territory_profile(territory_id, engine)

    score = 0.0

    # Swing electoral (si swing alto, mayor prioridad)
    if profile.swing_index is not None:
        score += min(30, abs(profile.swing_index) * 10)

    # Voto blando
    try:
        from dashboard.services.campaign_core import cargar_voto_blando
        vb_df = cargar_voto_blando()
        if not vb_df.empty and "soft_pct" in vb_df.columns:
            avg_soft = vb_df["soft_pct"].mean()
            score += avg_soft / 100 * 25
    except Exception:
        score += 10  # default

    # Stress económico
    if profile.economic_risk is not None:
        score += profile.economic_risk / 100 * 20
    else:
        score += 10

    # Menciones mediáticas (proxy)
    score += min(15, profile.media_mentions_7d / 10)

    # Población (mayor = mayor alcance)
    if profile.population and profile.population > 500000:
        score += 10
    elif profile.population and profile.population > 100000:
        score += 5

    return round(min(100, score), 1)


def _get_territory_name(territory_id: str) -> str:
    """Obtiene el nombre de un territorio desde su ID."""
    if ":" in territory_id:
        ttype, code = territory_id.split(":", 1)
        if ttype == "prov":
            return SPAIN_PROVINCES.get(code, territory_id)
    return territory_id


def _infer_type(territory_id: str) -> str:
    """Infiere el tipo de territorio desde su ID."""
    if territory_id == "ES":
        return "country"
    if territory_id.startswith("ccaa:"):
        return "ccaa"
    if territory_id.startswith("prov:"):
        return "province"
    if territory_id.startswith("mun:"):
        return "municipality"
    if territory_id.startswith("sec:"):
        return "census_section"
    return "province"


def _count_active_signals(territory_id: str, engine: Any) -> int:
    """Cuenta señales activas para un territorio."""
    if engine is None:
        return 0
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            row = conn.execute(sa_text("""
                SELECT COUNT(*) FROM territorial_signals
                WHERE territory_id = :tid
                  AND date >= CURRENT_DATE - INTERVAL '7 days'
                  AND severity IN ('HIGH', 'CRITICAL')
            """), {"tid": territory_id}).fetchone()
            return int(row[0]) if row else 0
    except Exception:
        return 0
