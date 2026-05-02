"""
Pipeline de inteligencia economica.

Orquesta la ingesta, procesamiento y analisis de datos economicos:

  1. Fetch de fuentes (BDE, INE, BCE, OMIE)
  2. Upsert en TimescaleDB (o memoria)
  3. Procesamiento de series temporales
  4. Forecasting (Prophet, SARIMA, VAR, Nowcast)
  5. Calculo del ITPE
  6. Analisis LLM de los datos
  7. Inyeccion en el indice de riesgo unificado

Punto de entrada: run_economic_pipeline()
Pensado para ejecutarse como tarea Celery o Prefect.
"""
from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "")


@dataclass
class EconomicPipelineResult:
    data_points_ingested: int = 0
    indicators_processed: list[str] = field(default_factory=list)
    forecasts_generated: int = 0
    itpe_score: float | None = None
    itpe_level: str = ""
    narrative: Any = None
    risk_index: Any = None
    elapsed_seconds: float = 0.0
    errors: list[str] = field(default_factory=list)

    def summary(self) -> str:
        return (
            f"Datos: {self.data_points_ingested} | "
            f"Indicadores: {len(self.indicators_processed)} | "
            f"Forecasts: {self.forecasts_generated} | "
            f"ITPE: {self.itpe_score:.1f} ({self.itpe_level})"
            if self.itpe_score is not None
            else f"Datos: {self.data_points_ingested} | Errores: {len(self.errors)}"
        )


async def run_economic_pipeline(
    start: date | None = None,
    end: date | None = None,
    market_id: str = "ES",
    include_bde: bool = True,
    include_ine: bool = True,
    include_bce: bool = True,
    include_omie: bool = False,
    run_forecasting: bool = True,
    run_llm_analysis: bool = False,
    political_context: str = "",
    actors: list[str] | None = None,
    llm_engine: Any = None,
) -> EconomicPipelineResult:
    """
    Ejecuta el pipeline completo de inteligencia economica.

    Args:
        start: inicio del periodo de datos (default: hace 1 año)
        end: fin del periodo (default: hoy)
        market_id: mercado objetivo
        include_bde/ine/bce/omie: fuentes a incluir
        run_forecasting: si ejecutar modelos de forecasting
        run_llm_analysis: si ejecutar el analisis LLM (requiere OllamaEngine activo)
        political_context: contexto politico para el analisis LLM
        actors: actores para mensajes de campaña
        llm_engine: OllamaEngine ya inicializado (opcional)

    Returns:
        EconomicPipelineResult con resultados de todas las etapas
    """
    import time
    t_start = time.monotonic()

    result = EconomicPipelineResult()
    errors: list[str] = []

    start = start or (date.today() - timedelta(days=365))
    end = end or date.today()

    # ------------------------------------------------------------------
    # Paso 1: Ingesta de datos
    # ------------------------------------------------------------------
    from etl.sources.economic_sources import EconomicDataAggregator

    try:
        async with EconomicDataAggregator(
            include_bde=include_bde,
            include_ine=include_ine,
            include_bce=include_bce,
            include_omie=include_omie,
        ) as aggregator:
            data_points = await aggregator.fetch_all(start=start, end=end)
            result.data_points_ingested = len(data_points)
            logger.info("Ingesta: %d puntos", len(data_points))
    except Exception as exc:
        errors.append(f"Ingesta: {exc}")
        data_points = []

    if not data_points:
        result.errors = errors
        result.elapsed_seconds = time.monotonic() - t_start
        return result

    # ------------------------------------------------------------------
    # Paso 2: Procesamiento de series temporales
    # ------------------------------------------------------------------
    from agents.analysis.economic_timeseries import TimeSeriesProcessor

    processor = TimeSeriesProcessor.from_data_points(data_points)

    # Si hay BD disponible, persistir
    if DATABASE_URL:
        try:
            await processor.connect()
            await processor.upsert_points(data_points)
        except Exception as exc:
            errors.append(f"Persistencia TimescaleDB: {exc}")

    # Obtener series procesadas
    indicators = await processor.list_indicators(geo="ES")
    result.indicators_processed = indicators

    series_dict: dict[str, Any] = {}
    for ind in indicators:
        series_dict[ind] = processor.get_processed_sync(ind, "ES")

    summaries = [
        s.summary
        for s in series_dict.values()
        if s.summary is not None
    ]

    # ------------------------------------------------------------------
    # Paso 3: Forecasting
    # ------------------------------------------------------------------
    forecasts: list[Any] = []
    if run_forecasting and series_dict:
        from agents.analysis.economic_forecasting import (
            GDPNowcaster,
            ProphetForecaster,
            SARIMAForecaster,
        )

        prophet = ProphetForecaster()
        sarima = SARIMAForecaster()
        nowcaster = GDPNowcaster()

        for indicator, series in list(series_dict.items())[:4]:
            try:
                fc_prophet = prophet.forecast(series, horizon_months=12)
                fc_sarima = sarima.forecast(series, horizon_months=12)
                forecasts.extend([fc_prophet, fc_sarima])
            except Exception as exc:
                errors.append(f"Forecast {indicator}: {exc}")

        # Nowcast del PIB
        try:
            gdp_fc = nowcaster.nowcast(series_dict)
            forecasts.append(gdp_fc)
        except Exception as exc:
            errors.append(f"GDP Nowcast: {exc}")

        result.forecasts_generated = len([f for f in forecasts if f.is_available])

    # ------------------------------------------------------------------
    # Paso 4: ITPE
    # ------------------------------------------------------------------
    from agents.analysis.itpe_engine import ITPEEngine

    # Construir economic_data para el ITPE
    indicator_dict = {
        s.indicator: s.latest_value
        for s in summaries
        if s is not None
    }

    itpe_engine = ITPEEngine(market_id=market_id)
    try:
        itpe_snapshot = itpe_engine.compute(economic_data=indicator_dict)
        result.itpe_score = itpe_snapshot.itpe_score
        result.itpe_level = itpe_snapshot.itpe_level
        logger.info("ITPE: %.1f (%s)", itpe_snapshot.itpe_score, itpe_snapshot.itpe_level)
    except Exception as exc:
        errors.append(f"ITPE: {exc}")
        itpe_snapshot = None

    # ------------------------------------------------------------------
    # Paso 5: Analisis LLM (opcional)
    # ------------------------------------------------------------------
    if run_llm_analysis and llm_engine:
        from agents.analysis.economic_llm_analyst import EconomicLLMAnalyst

        analyst = EconomicLLMAnalyst(llm_engine)
        try:
            narrative = await analyst.analyze(
                summaries=summaries,
                itpe=itpe_snapshot,
                forecasts=forecasts,
                political_context=political_context,
                actors=actors,
            )
            result.narrative = narrative
        except Exception as exc:
            errors.append(f"LLM analysis: {exc}")

    # ------------------------------------------------------------------
    # Paso 6: Indice de riesgo unificado
    # ------------------------------------------------------------------
    from agents.analysis.risk_integrator import inject_itpe_into_risk_index

    try:
        risk_index = inject_itpe_into_risk_index(
            itpe=itpe_snapshot,
            market_id=market_id,
        )
        result.risk_index = risk_index
        logger.info(
            "Riesgo unificado: %.1f (%s)",
            risk_index.total_score, risk_index.level
        )
    except Exception as exc:
        errors.append(f"Risk integrator: {exc}")

    result.errors = errors
    result.elapsed_seconds = time.monotonic() - t_start
    logger.info("Economic pipeline completado: %s", result.summary())
    return result


def run_economic_pipeline_sync(
    start: date | None = None,
    end: date | None = None,
    market_id: str = "ES",
    **kwargs: Any,
) -> EconomicPipelineResult:
    """Version sincrona para uso desde Celery tasks."""
    return asyncio.run(run_economic_pipeline(start=start, end=end, market_id=market_id, **kwargs))
