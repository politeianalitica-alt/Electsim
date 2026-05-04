"""
Economy Core Service — Bloque 5.

Capa de servicio entre N6_Economia / D3_Termometro y las tablas del bloque
económico (macro_indicators, economic_series, economic_signals, economic_forecasts,
budget_items).

Todas las funciones devuelven DataFrame/dict vacío y seguro si:
  - Las tablas no existen (migración 0042 no aplicada)
  - No hay datos en BD
  - Cualquier error de conexión

Nunca lanza excepciones al caller.
Usa datos demo únicamente cuando el caller lo solicita explícitamente
(demo_fallback=True) — por defecto devuelve vacío.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# ── Helpers internos ──────────────────────────────────────────────────────────


def _get_engine() -> Any:
    """Obtiene el engine de BD, o None si no está disponible."""
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        return None


def _safe_read_sql(query: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve DataFrame vacío si falla."""
    engine = _get_engine()
    if engine is None:
        return pd.DataFrame()
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            result = conn.execute(sa_text(query), params or {})
            rows = result.fetchall()
            if not rows:
                return pd.DataFrame()
            return pd.DataFrame(rows, columns=list(result.keys()))
    except Exception as exc:
        logger.debug("economy_core._safe_read_sql: %s", exc)
        return pd.DataFrame()


def _tables_exist() -> bool:
    """Comprueba si las tablas del bloque económico existen."""
    engine = _get_engine()
    if engine is None:
        return False
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            conn.execute(sa_text("SELECT 1 FROM macro_indicators LIMIT 1"))
        return True
    except Exception:
        return False


# ── Funciones públicas ────────────────────────────────────────────────────────


def cargar_indicadores_macro_recientes(
    geography: str = "ES",
    limit: int = 100,
    days_back: int = 365,
) -> pd.DataFrame:
    """
    Carga los indicadores macro más recientes.

    Returns:
        DataFrame con columnas: indicator_id, name, geography, date, value,
        unit, frequency, category, provider.
        Vacío si no hay datos o tablas.
    """
    cutoff = (date.today() - timedelta(days=days_back)).isoformat()
    query = """
        SELECT DISTINCT ON (provider, indicator_id, geography)
               indicator_id,
               name,
               geography,
               date,
               value,
               unit,
               frequency,
               category,
               sector,
               provider,
               seasonally_adjusted
        FROM   macro_indicators
        WHERE  geography = :geography
          AND  date >= :cutoff
        ORDER  BY provider, indicator_id, geography, date DESC
        LIMIT  :limit
    """
    return _safe_read_sql(query, {"geography": geography, "cutoff": cutoff, "limit": limit})


def cargar_series_macro(
    indicator_id: str,
    geography: str = "ES",
    limit: int = 120,
) -> pd.DataFrame:
    """
    Carga la serie histórica completa de un indicador.

    Returns:
        DataFrame con columnas: date, value, vintage_date, provider.
        Ordenado cronológicamente. Vacío si no hay datos.
    """
    query = """
        SELECT date, value, vintage_date, provider, unit, seasonally_adjusted
        FROM   macro_indicators
        WHERE  indicator_id = :indicator_id
          AND  geography    = :geography
        ORDER  BY date ASC
        LIMIT  :limit
    """
    return _safe_read_sql(query, {"indicator_id": indicator_id, "geography": geography, "limit": limit})


def cargar_kpis_economia(
    geography: str = "ES",
) -> dict[str, Any]:
    """
    Carga KPIs económicos principales para el resumen ejecutivo de N6.

    Returns:
        dict con claves: hay_datos, ipc, paro_epa, pib_yoy, prima_riesgo,
        deuda_pib, deficit_pib, precio_vivienda_yoy, confianza_consumidor,
        n_indicadores, n_señales, itpe_score, itpe_level.
        Si no hay datos, hay_datos=False y el resto son None o 0.
    """
    empty: dict[str, Any] = {
        "hay_datos": False,
        "ipc": None,
        "paro_epa": None,
        "pib_yoy": None,
        "prima_riesgo": None,
        "deuda_pib": None,
        "deficit_pib": None,
        "precio_vivienda_yoy": None,
        "confianza_consumidor": None,
        "n_indicadores": 0,
        "n_señales": 0,
        "itpe_score": None,
        "itpe_level": None,
    }

    df = cargar_indicadores_macro_recientes(geography=geography, limit=200)
    if df.empty:
        return empty

    # Pivot a dict {indicator_id: last_value}
    latest: dict[str, float] = {}
    for _, row in df.iterrows():
        iid = row.get("indicator_id")
        val = row.get("value")
        if iid and val is not None:
            try:
                latest[iid] = float(val)
            except (TypeError, ValueError):
                pass

    if not latest:
        return empty

    # Contar señales activas
    n_signals = 0
    try:
        sig_df = cargar_economic_signals(geography=geography, limit=200)
        n_signals = len(sig_df) if not sig_df.empty else 0
    except Exception:
        pass

    # Calcular ITPE
    itpe_score = None
    itpe_level = None
    try:
        itpe = cargar_itpe_economico(geography=geography, indicators_override=latest)
        itpe_score = itpe.get("total_score")
        itpe_level = itpe.get("level")
    except Exception:
        pass

    return {
        "hay_datos": True,
        "ipc": latest.get("ipc"),
        "paro_epa": latest.get("paro_epa"),
        "pib_yoy": latest.get("pib_yoy"),
        "prima_riesgo": latest.get("prima_riesgo"),
        "deuda_pib": latest.get("deuda_pib"),
        "deficit_pib": latest.get("deficit_pib"),
        "precio_vivienda_yoy": latest.get("precio_vivienda_yoy"),
        "confianza_consumidor": latest.get("confianza_consumidor"),
        "n_indicadores": len(latest),
        "n_señales": n_signals,
        "itpe_score": itpe_score,
        "itpe_level": itpe_level,
    }


def cargar_economic_signals(
    geography: str = "ES",
    severity: str | None = None,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Carga señales económico-políticas detectadas.

    Args:
        geography: Código de geografía (default "ES").
        severity: Filtrar por 'LOW','MEDIUM','HIGH','CRITICAL'. None = todas.
        limit: Máximo de filas.

    Returns:
        DataFrame con signal_type, indicator_id, severity, date,
        current_value, change_pct, explanation, related_sectors.
        Vacío si no hay datos.
    """
    conditions = ["geography = :geography"]
    params: dict[str, Any] = {"geography": geography, "limit": limit}

    if severity:
        conditions.append("severity = :severity")
        params["severity"] = severity

    where = " AND ".join(conditions)
    query = f"""
        SELECT signal_type, indicator_id, geography, date,
               current_value, previous_value, change_abs, change_pct,
               z_score, severity, confidence, explanation,
               related_sectors, related_narratives,
               created_at
        FROM   economic_signals
        WHERE  {where}
        ORDER  BY date DESC, severity DESC
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


def cargar_itpe_economico(
    geography: str = "ES",
    indicators_override: dict[str, float] | None = None,
) -> dict[str, Any]:
    """
    Calcula el ITPE Económico (Índice de Tensión Político-Económica).

    Usa los últimos valores de macro_indicators si indicators_override es None.

    Returns:
        dict con: hay_datos, total_score (0-100), level, geography,
        inflation_risk, unemployment_risk, growth_risk, fiscal_risk,
        housing_risk, energy_risk, market_risk, confidence_risk,
        explanation, components.
        Si no hay datos suficientes, total_score=None.
    """
    empty: dict[str, Any] = {
        "hay_datos": False,
        "total_score": None,
        "level": None,
        "geography": geography,
        "inflation_risk": None,
        "unemployment_risk": None,
        "growth_risk": None,
        "fiscal_risk": None,
        "housing_risk": None,
        "energy_risk": None,
        "market_risk": None,
        "confidence_risk": None,
        "explanation": "Sin datos económicos disponibles.",
        "components": {},
    }

    # Obtener valores actuales
    if indicators_override is not None:
        latest = dict(indicators_override)
    else:
        df = cargar_indicadores_macro_recientes(geography=geography, limit=200)
        if df.empty:
            return empty
        latest = {}
        for _, row in df.iterrows():
            iid = row.get("indicator_id")
            val = row.get("value")
            if iid and val is not None:
                try:
                    latest[iid] = float(val)
                except (TypeError, ValueError):
                    pass

    if not latest:
        return empty

    try:
        from etl.sources.economy.economic_forecaster import compute_itpe_economic
        latest["geography"] = geography
        score = compute_itpe_economic(latest)
        return {
            "hay_datos": True,
            "total_score": score.total_score,
            "level": score.level,
            "geography": score.geography,
            "inflation_risk": score.inflation_risk,
            "unemployment_risk": score.unemployment_risk,
            "growth_risk": score.growth_risk,
            "fiscal_risk": score.fiscal_risk,
            "housing_risk": score.housing_risk,
            "energy_risk": score.energy_risk,
            "market_risk": score.market_risk,
            "confidence_risk": score.confidence_risk,
            "explanation": score.explanation,
            "components": score.components,
        }
    except Exception as exc:
        logger.debug("cargar_itpe_economico: %s", exc)
        return empty


def cargar_forecasts(
    indicator_id: str,
    geography: str = "ES",
    horizon: int | None = None,
) -> pd.DataFrame:
    """
    Carga forecasts almacenados para un indicador.

    Returns:
        DataFrame con: forecast_date, target_date, horizon, yhat,
        yhat_lower, yhat_upper, model_name.
        Vacío si no hay datos.
    """
    conditions = [
        "indicator_id = :indicator_id",
        "geography = :geography",
    ]
    params: dict[str, Any] = {"indicator_id": indicator_id, "geography": geography}

    if horizon is not None:
        conditions.append("horizon <= :horizon")
        params["horizon"] = horizon

    where = " AND ".join(conditions)
    query = f"""
        SELECT forecast_date, target_date, horizon,
               yhat, yhat_lower, yhat_upper, model_name, model_version,
               metrics
        FROM   economic_forecasts
        WHERE  {where}
        ORDER  BY forecast_date DESC, target_date ASC
        LIMIT  100
    """
    return _safe_read_sql(query, params)


def cargar_sectorial_risk(
    geography: str = "ES",
) -> pd.DataFrame:
    """
    Agrega riesgo por sector a partir de señales económicas activas.

    Returns:
        DataFrame con: sector, n_señales, max_severity, avg_confidence.
        Ordenado por riesgo descendente. Vacío si no hay señales.
    """
    query = """
        SELECT
            unnest(related_sectors) AS sector,
            COUNT(*) AS n_señales,
            MAX(CASE severity
                WHEN 'CRITICAL' THEN 4
                WHEN 'HIGH'     THEN 3
                WHEN 'MEDIUM'   THEN 2
                ELSE 1 END) AS severity_num,
            MAX(severity) AS max_severity,
            AVG(CAST(confidence AS float)) AS avg_confidence
        FROM economic_signals
        WHERE geography = :geography
        GROUP BY sector
        ORDER BY n_señales DESC, severity_num DESC
        LIMIT 30
    """
    df = _safe_read_sql(query, {"geography": geography})
    if not df.empty and "severity_num" in df.columns:
        df = df.drop(columns=["severity_num"])
    return df


def cargar_budget_items(
    budget_year: int | None = None,
    ministry: str | None = None,
    geography: str | None = None,
    limit: int = 100,
) -> pd.DataFrame:
    """
    Carga partidas presupuestarias.

    Returns:
        DataFrame con: budget_year, administration, programme_code,
        programme_name, chapter, ministry, geography, sector,
        initial_credit, final_credit, executed_amount, execution_rate.
        Vacío si no hay datos.
    """
    conditions: list[str] = []
    params: dict[str, Any] = {"limit": limit}

    if budget_year is not None:
        conditions.append("budget_year = :budget_year")
        params["budget_year"] = budget_year
    if ministry:
        conditions.append("ministry ILIKE :ministry")
        params["ministry"] = f"%{ministry}%"
    if geography:
        conditions.append("geography = :geography")
        params["geography"] = geography

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT budget_year, administration, programme_code, programme_name,
               chapter, ministry, geography, sector,
               initial_credit, final_credit, executed_amount, execution_rate,
               source
        FROM   budget_items
        {where}
        ORDER  BY budget_year DESC, executed_amount DESC NULLS LAST
        LIMIT  :limit
    """
    return _safe_read_sql(query, params)


# ── Funciones de compute-on-demand ────────────────────────────────────────────


def compute_and_store_forecasts(
    indicator_id: str,
    geography: str = "ES",
    horizon: int = 6,
    model: str = "auto",
) -> list[dict]:
    """
    Genera forecasts para un indicador y los persiste en BD.

    Returns:
        Lista de dicts representando EconomicForecast generados.
        Vacía si no hay serie histórica suficiente.
    """
    series_df = cargar_series_macro(indicator_id, geography=geography, limit=60)
    if series_df.empty or len(series_df) < 2:
        logger.info("compute_and_store_forecasts: serie insuficiente para %s", indicator_id)
        return []

    try:
        from etl.sources.economy.schemas import MacroIndicator
        from etl.sources.economy.economic_forecaster import forecast_indicator

        indicators: list[MacroIndicator] = []
        for _, row in series_df.iterrows():
            try:
                ind = MacroIndicator(
                    source="db",
                    provider=str(row.get("provider", "unknown")),
                    indicator_id=indicator_id,
                    name=indicator_id,
                    geography=geography,
                    frequency=str(row.get("frequency", "monthly")) if "frequency" in series_df.columns else "monthly",
                    date=row["date"],
                    value=float(row["value"]),
                )
                indicators.append(ind)
            except Exception:
                continue

        if len(indicators) < 2:
            return []

        forecasts = forecast_indicator(indicators, horizon=horizon, model=model)
        result = [f.model_dump() for f in forecasts]

        # Persistir
        engine = _get_engine()
        if engine and forecasts:
            try:
                import json
                from sqlalchemy import text as sa_text
                with engine.begin() as conn:
                    for fc in forecasts:
                        conn.execute(sa_text("""
                            INSERT INTO economic_forecasts (
                                provider, indicator_id, geography,
                                forecast_date, target_date, horizon,
                                yhat, yhat_lower, yhat_upper,
                                model_name, model_version, metrics
                            ) VALUES (
                                :provider, :indicator_id, :geography,
                                :forecast_date, :target_date, :horizon,
                                :yhat, :yhat_lower, :yhat_upper,
                                :model_name, :model_version, :metrics::jsonb
                            )
                            ON CONFLICT ON CONSTRAINT uq_economic_forecast
                            DO UPDATE SET yhat=EXCLUDED.yhat,
                                          yhat_lower=EXCLUDED.yhat_lower,
                                          yhat_upper=EXCLUDED.yhat_upper
                        """), {
                            "provider": fc.provider,
                            "indicator_id": fc.indicator_id,
                            "geography": fc.geography,
                            "forecast_date": fc.forecast_date,
                            "target_date": fc.target_date,
                            "horizon": fc.horizon,
                            "yhat": fc.yhat,
                            "yhat_lower": fc.yhat_lower,
                            "yhat_upper": fc.yhat_upper,
                            "model_name": fc.model_name,
                            "model_version": fc.model_version,
                            "metrics": json.dumps({}),
                        })
            except Exception as exc:
                logger.debug("compute_and_store_forecasts persist: %s", exc)

        return result
    except Exception as exc:
        logger.error("compute_and_store_forecasts: %s", exc)
        return []


def cargar_economic_summary(geography: str = "ES") -> dict[str, Any]:
    """
    Resumen económico consolidado para el panel de análisis.

    Agrega: KPIs, señales recientes, ITPE, riesgo sectorial.

    Returns:
        dict con: kpis, señales_críticas, señales_altas, itpe,
        sectores_riesgo, hay_datos.
    """
    kpis = cargar_kpis_economia(geography=geography)
    hay_datos = kpis.get("hay_datos", False)

    señales_criticas: list[dict] = []
    señales_altas: list[dict] = []

    if hay_datos:
        sig_df = cargar_economic_signals(geography=geography, limit=100)
        if not sig_df.empty:
            for _, row in sig_df.iterrows():
                sev = row.get("severity", "")
                entry = {
                    "signal_type": row.get("signal_type"),
                    "indicator_id": row.get("indicator_id"),
                    "current_value": row.get("current_value"),
                    "explanation": row.get("explanation"),
                    "date": str(row.get("date", "")),
                }
                if sev == "CRITICAL":
                    señales_criticas.append(entry)
                elif sev == "HIGH":
                    señales_altas.append(entry)

    sectores_riesgo: list[dict] = []
    if hay_datos:
        sec_df = cargar_sectorial_risk(geography=geography)
        if not sec_df.empty:
            sectores_riesgo = sec_df.head(10).to_dict("records")

    itpe = cargar_itpe_economico(geography=geography)

    return {
        "hay_datos": hay_datos,
        "kpis": kpis,
        "señales_críticas": señales_criticas,
        "señales_altas": señales_altas,
        "itpe": itpe,
        "sectores_riesgo": sectores_riesgo,
    }
