"""
Territorial Core Service — Bloque 7.

API de servicio para el módulo geoespacial:
  - cargar_territorios          → lista de territorios por tipo
  - cargar_geometrias           → GeoJSON simplificado para Plotly
  - cargar_senales_territoriales → señales activas/recientes
  - cargar_perfil_territorio    → perfil completo de un territorio
  - cargar_ranking_prioridad_campana → ranking por prioridad de campaña
  - cargar_mapa_electoral_territorial → datos electorales por territorio
  - cargar_mapa_economico_territorial → datos económicos por territorio
  - cargar_mapa_medios_territorial   → intensidad mediática por territorio
  - cargar_mapa_riesgo_territorial   → exposición al riesgo por territorio
  - buscar_territorio           → búsqueda por nombre o texto libre

Todas las funciones degradan gracefully si la BD no está disponible.
Nunca lanzan excepciones — devuelven DataFrame vacío, dict vacío o lista vacía.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


def _get_engine() -> Any:
    """Obtiene el engine de BD compartido del dashboard."""
    try:
        from dashboard.shared import get_engine
        return get_engine()
    except Exception:
        return None


# ── Territorios ────────────────────────────────────────────────────────────────

def cargar_territorios(
    territory_type: str = "province",
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga lista de territorios por tipo.

    Args:
        territory_type: 'ccaa', 'province', 'municipality'.
        engine: SQLAlchemy engine (None → auto).

    Returns:
        DataFrame con columnas: territory_id, name, territory_type, lat, lon.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.geospatial.ine_geography_adapter import (
            load_ccaa,
            load_provinces,
            load_municipalities,
        )

        if territory_type == "ccaa":
            territories = load_ccaa(eng)
        elif territory_type == "province":
            territories = load_provinces(eng)
        elif territory_type == "municipality":
            territories = load_municipalities(eng, limit=1000)
        else:
            territories = []

        if not territories:
            return pd.DataFrame()

        return pd.DataFrame([
            {
                "territory_id": t.territory_id,
                "name": t.name,
                "territory_type": t.territory_type,
                "lat": t.lat,
                "lon": t.lon,
            }
            for t in territories
        ])

    except Exception as exc:
        logger.debug("cargar_territorios: %s", exc)
        return pd.DataFrame()


# ── Geometrías ────────────────────────────────────────────────────────────────

def cargar_geometrias(
    territory_type: str = "province",
    resolution: str = "low",
    engine: Any | None = None,
) -> dict:
    """
    Carga geometrías GeoJSON simplificadas para Plotly choropleth.

    Args:
        territory_type: 'ccaa', 'province', 'municipality'.
        resolution: 'full', 'medium', 'low'.
        engine: SQLAlchemy engine (None → auto).

    Returns:
        GeoJSON dict (FeatureCollection) o dict vacío si no hay datos.
    """
    eng = engine or _get_engine()

    # Intentar desde BD
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            with eng.connect() as conn:
                rows = conn.execute(sa_text("""
                    SELECT territory_id, territory_type, name,
                           geometry_low, geometry_medium, geometry_full,
                           centroid_lat, centroid_lon
                    FROM territory_geometries
                    WHERE territory_type = :ttype
                    ORDER BY territory_id
                """), {"ttype": territory_type}).fetchall()

            if rows:
                features = []
                for row in rows:
                    import json
                    geom_col = f"geometry_{resolution}" if resolution != "full" else "geometry_full"
                    geom_raw = getattr(row, geom_col, None) or row.geometry_low
                    if geom_raw is None:
                        continue
                    geom = json.loads(geom_raw) if isinstance(geom_raw, str) else geom_raw
                    features.append({
                        "type": "Feature",
                        "id": row.territory_id,
                        "properties": {
                            "territory_id": row.territory_id,
                            "name": row.name or row.territory_id,
                        },
                        "geometry": geom,
                    })
                if features:
                    return {"type": "FeatureCollection", "features": features}
        except Exception as exc:
            logger.debug("cargar_geometrias DB: %s", exc)

    # Fallback: cargar desde GeoJSON
    try:
        from etl.sources.geospatial.geojson_loader import load_default_geojson
        geometries = load_default_geojson(territory_type=territory_type, resolution=resolution)
        if geometries:
            features = []
            for g in geometries:
                geom = g.simplified_geometry or g.geometry
                if not geom:
                    continue
                features.append({
                    "type": "Feature",
                    "id": g.territory_id,
                    "properties": {
                        "territory_id": g.territory_id,
                        "name": g.name or g.territory_id,
                    },
                    "geometry": geom,
                })
            if features:
                return {"type": "FeatureCollection", "features": features}
    except Exception as exc:
        logger.debug("cargar_geometrias GeoJSON: %s", exc)

    return {}


# ── Señales Territoriales ──────────────────────────────────────────────────────

def cargar_senales_territoriales(
    territory_type: str | None = None,
    signal_type: str | None = None,
    min_severity: str = "MEDIUM",
    days_back: int = 7,
    limit: int = 50,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga señales territoriales activas.

    Args:
        territory_type: Filtrar por tipo ('province', 'ccaa', etc.).
        signal_type: Filtrar por tipo de señal ('electoral_swing', etc.).
        min_severity: Severidad mínima ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').
        days_back: Días hacia atrás.
        limit: Máximo de resultados.
        engine: SQLAlchemy engine (None → auto).

    Returns:
        DataFrame con columnas: territory_id, territory_type, signal_type,
        signal_date, value, severity, explanation, confidence.
    """
    eng = engine or _get_engine()
    sev_order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
    min_sev_n = sev_order.get(min_severity, 1)

    # Desde BD
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            where_clauses = [
                "date >= CURRENT_DATE - :days * INTERVAL '1 day'",
                "severity = ANY(:severities)",
            ]
            severities = [k for k, v in sev_order.items() if v >= min_sev_n]
            params: dict[str, Any] = {"days": days_back, "severities": severities}

            if territory_type:
                where_clauses.append("territory_type = :territory_type")
                params["territory_type"] = territory_type
            if signal_type:
                where_clauses.append("signal_type = :signal_type")
                params["signal_type"] = signal_type

            sql = f"""
                SELECT territory_id, territory_type, signal_type, date AS signal_date,
                       value, severity, source_module, explanation, confidence
                FROM territorial_signals
                WHERE {' AND '.join(where_clauses)}
                ORDER BY severity DESC, value DESC, date DESC
                LIMIT :limit
            """
            params["limit"] = limit
            df = pd.read_sql(sa_text(sql), eng, params=params)
            if not df.empty:
                return df
        except Exception as exc:
            logger.debug("cargar_senales_territoriales DB: %s", exc)

    # Fallback: generar señales en tiempo real
    try:
        from etl.sources.geospatial.territorial_signal_detector import detect_all_signals
        signals = detect_all_signals(engine=eng)
        if signals:
            rows = [
                {
                    "territory_id": s.territory_id,
                    "territory_type": s.territory_type,
                    "signal_type": s.signal_type,
                    "signal_date": s.signal_date,
                    "value": s.value,
                    "severity": s.severity,
                    "source_module": s.source_module,
                    "explanation": s.explanation,
                    "confidence": s.confidence,
                }
                for s in signals
                if sev_order.get(s.severity, 0) >= min_sev_n
            ]
            if signal_type:
                rows = [r for r in rows if r["signal_type"] == signal_type]
            rows.sort(key=lambda r: (-sev_order.get(r["severity"], 0), -r["value"]))
            return pd.DataFrame(rows[:limit])
    except Exception as exc:
        logger.debug("cargar_senales_territoriales fallback: %s", exc)

    return pd.DataFrame()


# ── Perfil de Territorio ───────────────────────────────────────────────────────

def cargar_perfil_territorio(
    territory_id: str,
    engine: Any | None = None,
) -> dict[str, Any]:
    """
    Carga el perfil completo de un territorio.

    Args:
        territory_id: ID del territorio (ej. "prov:28").
        engine: SQLAlchemy engine (None → auto).

    Returns:
        Dict con datos del territorio o dict vacío.
    """
    eng = engine or _get_engine()

    # Desde caché
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            row = eng.execute(sa_text("""
                SELECT territory_id, territory_type, name, profile_date,
                       economic_risk, unemployment_rate, income_avg,
                       campaign_priority, active_alerts, full_profile
                FROM territory_profiles_cache
                WHERE territory_id = :tid
                ORDER BY profile_date DESC
                LIMIT 1
            """), {"tid": territory_id}).fetchone()

            if row and row.full_profile:
                import json
                data = json.loads(row.full_profile) if isinstance(row.full_profile, str) else row.full_profile
                return data
        except Exception as exc:
            logger.debug("cargar_perfil_territorio cache: %s", exc)

    # Fallback: construir en tiempo real
    try:
        from etl.sources.geospatial.territorial_aggregator import build_territory_profile
        profile = build_territory_profile(territory_id, eng)
        return {
            "territory_id": profile.territory_id,
            "name": profile.name,
            "territory_type": profile.territory_type,
            "economic_risk": profile.economic_risk,
            "unemployment_rate": profile.unemployment_rate,
            "income_avg": profile.income_avg,
            "campaign_priority": profile.campaign_priority,
            "active_alerts": profile.active_alerts,
            "last_election_winner": profile.last_election_winner,
            "turnout_last": profile.turnout_last,
            "population": profile.population,
            "swing_index": profile.swing_index,
            "media_mentions_7d": profile.media_mentions_7d,
        }
    except Exception as exc:
        logger.debug("cargar_perfil_territorio realtime: %s", exc)

    return {}


# ── Ranking Prioridad de Campaña ───────────────────────────────────────────────

def cargar_ranking_prioridad_campana(
    territory_type: str = "province",
    top_n: int = 10,
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Devuelve ranking de territorios por prioridad de campaña.

    Args:
        territory_type: Tipo de territorio.
        top_n: Número máximo de territorios.
        engine: SQLAlchemy engine (None → auto).

    Returns:
        DataFrame con columnas: territory_id, name, campaign_priority,
        economic_risk, swing_index, active_alerts.
    """
    eng = engine or _get_engine()

    # Desde caché
    if eng is not None:
        try:
            from sqlalchemy import text as sa_text
            df = pd.read_sql(sa_text("""
                SELECT territory_id, name, campaign_priority,
                       economic_risk, unemployment_rate, active_alerts
                FROM territory_profiles_cache
                WHERE territory_type = :ttype
                  AND profile_date = (
                      SELECT MAX(profile_date)
                      FROM territory_profiles_cache
                      WHERE territory_type = :ttype
                  )
                ORDER BY campaign_priority DESC NULLS LAST
                LIMIT :n
            """), eng, params={"ttype": territory_type, "n": top_n})
            if not df.empty:
                return df
        except Exception as exc:
            logger.debug("cargar_ranking_prioridad_campana cache: %s", exc)

    # Fallback: construir en tiempo real
    try:
        from etl.sources.geospatial.territorial_aggregator import (
            build_territory_profile,
            compute_campaign_priority,
        )
        from etl.sources.geospatial.schemas import SPAIN_PROVINCES, build_territory_id

        if territory_type == "province":
            ids = [build_territory_id("province", c) for c in SPAIN_PROVINCES]
        else:
            return pd.DataFrame()

        rows = []
        for tid in ids:
            try:
                profile = build_territory_profile(tid, eng)
                rows.append({
                    "territory_id": tid,
                    "name": profile.name,
                    "campaign_priority": profile.campaign_priority or 0.0,
                    "economic_risk": profile.economic_risk,
                    "unemployment_rate": profile.unemployment_rate,
                    "active_alerts": profile.active_alerts,
                })
            except Exception:
                continue

        if rows:
            df = pd.DataFrame(rows).sort_values("campaign_priority", ascending=False)
            return df.head(top_n).reset_index(drop=True)
    except Exception as exc:
        logger.debug("cargar_ranking_prioridad_campana realtime: %s", exc)

    return pd.DataFrame()


# ── Mapas Temáticos ────────────────────────────────────────────────────────────

def cargar_mapa_electoral_territorial(
    territory_type: str = "province",
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga datos electorales por territorio para mapa choropleth.

    Returns:
        DataFrame con columnas: territory_id, territory_name,
        leading_party, swing_index, turnout_last.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_electoral_by_territory
        df = aggregate_electoral_by_territory(territory_type=territory_type, engine=eng)
        return df
    except Exception as exc:
        logger.debug("cargar_mapa_electoral_territorial: %s", exc)
        return pd.DataFrame()


def cargar_mapa_economico_territorial(
    territory_type: str = "province",
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga datos económicos por territorio para mapa choropleth.

    Returns:
        DataFrame con columnas: territory_id, territory_name,
        unemployment_rate, income_avg, economic_stress.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df = aggregate_economic_by_territory(territory_type=territory_type, engine=eng)
        return df
    except Exception as exc:
        logger.debug("cargar_mapa_economico_territorial: %s", exc)
        return pd.DataFrame()


def cargar_mapa_medios_territorial(
    days: int = 7,
    territory_type: str = "province",
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga intensidad mediática por territorio para mapa choropleth.

    Returns:
        DataFrame con columnas: territory_id, mentions_count, media_intensity.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_media_by_territory
        df = aggregate_media_by_territory(days=days, territory_type=territory_type, engine=eng)
        return df
    except Exception as exc:
        logger.debug("cargar_mapa_medios_territorial: %s", exc)
        return pd.DataFrame()


def cargar_mapa_riesgo_territorial(
    territory_type: str = "province",
    engine: Any | None = None,
) -> pd.DataFrame:
    """
    Carga exposición al riesgo por territorio para mapa choropleth.

    Returns:
        DataFrame con columnas: territory_id, risk_exposure, n_entities.
    """
    eng = engine or _get_engine()

    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_risk_by_territory
        df = aggregate_risk_by_territory(territory_type=territory_type, engine=eng)
        return df
    except Exception as exc:
        logger.debug("cargar_mapa_riesgo_territorial: %s", exc)
        return pd.DataFrame()


# ── Búsqueda de Territorio ────────────────────────────────────────────────────

def buscar_territorio(
    query: str,
    territory_types: list[str] | None = None,
    max_results: int = 5,
) -> list[dict[str, Any]]:
    """
    Busca territorios por nombre o texto libre.

    Args:
        query: Texto de búsqueda.
        territory_types: Tipos a buscar ['province', 'ccaa', 'municipality'].
        max_results: Máximo de resultados.

    Returns:
        Lista de dicts con territory_id, name, territory_type, confidence.
    """
    try:
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text(
            text=query,
            territory_types=territory_types,
            max_results=max_results,
        )

        output = []
        for tid, name, ttype in zip(
            result.territory_ids,
            result.territory_names,
            result.territory_types,
        ):
            output.append({
                "territory_id": tid,
                "name": name,
                "territory_type": ttype,
                "confidence": result.confidence,
            })
        return output
    except Exception as exc:
        logger.debug("buscar_territorio: %s", exc)
        return []
