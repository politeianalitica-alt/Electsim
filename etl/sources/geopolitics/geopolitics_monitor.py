"""
Geopolitics Monitor — Bloque 14.

Orquestador principal del pipeline geopolítico:
fetch events → score risk → detect signals → model impact → build briefings.

Diseñado para ejecutarse como scheduled job (APScheduler/Celery)
o manualmente desde la CLI.

Nunca rompe — cada paso tiene fallback.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class GeopoliticsRunResult:
    """Resultado de una ejecución del monitor."""
    run_date: date = field(default_factory=date.today)
    events_fetched: int = 0
    narratives_fetched: int = 0
    risk_profiles_computed: int = 0
    alerts_generated: int = 0
    impacts_estimated: int = 0
    briefings_built: int = 0
    errors: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0

    def summary(self) -> str:
        return (
            f"GeopoliticsMonitor [{self.run_date}]: "
            f"{self.events_fetched} events, {self.risk_profiles_computed} risk profiles, "
            f"{self.alerts_generated} alerts, {self.briefings_built} briefings. "
            f"Errors: {len(self.errors)}. Duration: {self.duration_seconds:.1f}s"
        )


def run_full_pipeline(
    sources: list[str] | None = None,
    days_back: int = 7,
    countries: list[str] | None = None,
    save_to_db: bool = True,
) -> GeopoliticsRunResult:
    """
    Ejecuta el pipeline geopolítico completo.

    Args:
        sources: Lista de fuentes ("acled", "gdelt", "ucdp"). None = todas.
        days_back: Días hacia atrás para buscar eventos.
        countries: Lista ISO3 de países a procesar. None = todos relevantes.
        save_to_db: Persistir resultados en BD.

    Returns:
        GeopoliticsRunResult con métricas de la ejecución.
    """
    import time
    start = time.time()
    result = GeopoliticsRunResult()
    sources = sources or ["acled", "gdelt", "ucdp"]

    # 1. Fetch events
    events = _fetch_events(sources, days_back, countries, result)
    result.events_fetched = len(events)

    # 2. Fetch narratives
    narratives = _fetch_narratives(days_back, result)
    result.narratives_fetched = len(narratives)

    # 3. Load presence
    presence = _load_presence(result)

    # 4. Compute risk profiles
    risk_profiles = _compute_risk_profiles(events, narratives, presence, result)
    result.risk_profiles_computed = len(risk_profiles)

    if save_to_db:
        _save_risk_profiles(risk_profiles, result)

    # 5. Detect signals → alerts
    alerts = _detect_signals(events, narratives, risk_profiles, presence, result)
    result.alerts_generated = len(alerts)

    if save_to_db:
        _save_alerts(alerts, result)

    # 6. Model domestic impacts
    impacts = _model_impacts(events, narratives, presence, risk_profiles, result)
    result.impacts_estimated = len(impacts)

    # 7. Build briefings
    briefings = _build_briefings(events, narratives, risk_profiles, impacts, presence, alerts, result)
    result.briefings_built = len(briefings)

    if save_to_db:
        _save_briefings(briefings, result)

    result.duration_seconds = time.time() - start
    logger.info(result.summary())
    return result


def run_source_only(
    source: str,
    days_back: int = 7,
    countries: list[str] | None = None,
) -> list[Any]:
    """Ejecuta solo una fuente de eventos."""
    start_date = date.today() - timedelta(days=days_back)
    end_date = date.today()

    if source == "acled":
        try:
            from etl.sources.geopolitics.acled_client import fetch_acled_events
            return fetch_acled_events(countries=countries, start_date=start_date, end_date=end_date)
        except Exception as exc:
            logger.warning("ACLED source error: %s", exc)
            return []
    elif source == "gdelt":
        try:
            from etl.sources.geopolitics.gdelt_client import search_gdelt_articles
            return search_gdelt_articles(hours=days_back * 24)
        except Exception as exc:
            logger.warning("GDELT source error: %s", exc)
            return []
    elif source == "ucdp":
        try:
            from etl.sources.geopolitics.ucdp_client import fetch_ucdp_for_spain_relevant_countries
            return fetch_ucdp_for_spain_relevant_countries()
        except Exception as exc:
            logger.warning("UCDP source error: %s", exc)
            return []
    else:
        logger.warning("Fuente desconocida: %s", source)
        return []


def get_health_status() -> dict[str, Any]:
    """Devuelve el estado de salud de todas las fuentes."""
    status: dict[str, Any] = {}
    try:
        from etl.sources.geopolitics.acled_client import acled_health_check
        status["acled"] = acled_health_check().model_dump()
    except Exception as exc:
        status["acled"] = {"available": False, "error": str(exc)}

    try:
        from etl.sources.geopolitics.gdelt_client import gdelt_health_check
        status["gdelt"] = gdelt_health_check().model_dump()
    except Exception as exc:
        status["gdelt"] = {"available": False, "error": str(exc)}

    try:
        from etl.sources.geopolitics.ucdp_client import ucdp_health_check
        status["ucdp"] = ucdp_health_check().model_dump()
    except Exception as exc:
        status["ucdp"] = {"available": False, "error": str(exc)}

    return status


# ── Helpers privados ─────────────────────────────────────────────────────────

def _fetch_events(
    sources: list[str], days_back: int, countries: list[str] | None, result: GeopoliticsRunResult
) -> list[Any]:
    start_date = date.today() - timedelta(days=days_back)
    all_events = []

    if "acled" in sources:
        try:
            from etl.sources.geopolitics.acled_client import fetch_acled_events
            events = fetch_acled_events(countries=countries, start_date=start_date)
            all_events.extend(events)
            logger.info("ACLED: %d eventos", len(events))
        except Exception as exc:
            result.errors.append(f"acled: {exc}")

    if "ucdp" in sources:
        try:
            from etl.sources.geopolitics.ucdp_client import fetch_ucdp_for_spain_relevant_countries
            events = fetch_ucdp_for_spain_relevant_countries()
            all_events.extend(events)
            logger.info("UCDP: %d eventos", len(events))
        except Exception as exc:
            result.errors.append(f"ucdp: {exc}")

    # Deduplicate
    try:
        from etl.sources.geopolitics.geo_event_adapter import deduplicate_events
        all_events = deduplicate_events(all_events)
    except Exception:
        pass

    return all_events


def _fetch_narratives(days_back: int, result: GeopoliticsRunResult) -> list[Any]:
    try:
        from etl.sources.geopolitics.gdelt_client import (
            SPAIN_QUERIES,
            extract_geo_narrative_signals,
            search_gdelt_articles,
        )
        all_articles = []
        for query in SPAIN_QUERIES[:3]:  # Limitar para no sobrecargar
            articles = search_gdelt_articles(query=query, hours=min(days_back * 24, 72))
            all_articles.extend(articles)
        return extract_geo_narrative_signals(all_articles)
    except Exception as exc:
        result.errors.append(f"gdelt_narratives: {exc}")
        return []


def _load_presence(result: GeopoliticsRunResult) -> list[Any]:
    try:
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence
        return get_spanish_presence()
    except Exception as exc:
        result.errors.append(f"presence: {exc}")
        return []


def _compute_risk_profiles(
    events: list[Any], narratives: list[Any], presence: list[Any], result: GeopoliticsRunResult
) -> list[Any]:
    try:
        from etl.sources.geopolitics.geo_risk_scorer import score_all_countries
        return score_all_countries(events, narratives, presence)
    except Exception as exc:
        result.errors.append(f"risk_scorer: {exc}")
        return []


def _save_risk_profiles(profiles: list[Any], result: GeopoliticsRunResult) -> None:
    try:
        from etl.sources.geopolitics.country_risk_provider import save_risk_profile
        for p in profiles:
            save_risk_profile(p)
    except Exception as exc:
        result.errors.append(f"save_risk: {exc}")


def _detect_signals(
    events: list[Any], narratives: list[Any], risk_profiles: list[Any],
    presence: list[Any], result: GeopoliticsRunResult
) -> list[Any]:
    try:
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        alerts = detect_signals(events, narratives, risk_profiles, presence)
        return alerts
    except Exception as exc:
        result.errors.append(f"signal_detector: {exc}")
        return []


def _save_alerts(alerts: list[Any], result: GeopoliticsRunResult) -> None:
    try:
        from etl.sources.geopolitics.geo_signal_detector import save_alerts
        save_alerts(alerts)
    except Exception as exc:
        result.errors.append(f"save_alerts: {exc}")


def _model_impacts(
    events: list[Any], narratives: list[Any], presence: list[Any],
    risk_profiles: list[Any], result: GeopoliticsRunResult
) -> list[Any]:
    try:
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        return estimate_domestic_impacts(events, narratives, presence, risk_profiles)
    except Exception as exc:
        result.errors.append(f"impact_model: {exc}")
        return []


def _build_briefings(
    events: list[Any], narratives: list[Any], risk_profiles: list[Any],
    impacts: list[Any], presence: list[Any], alerts: list[Any],
    result: GeopoliticsRunResult,
) -> list[Any]:
    briefings = []
    try:
        from etl.sources.geopolitics.geo_briefing_builder import (
            build_daily_spain_digest,
            build_top_risk_briefings,
        )
        daily = build_daily_spain_digest(events, narratives, risk_profiles, impacts, alerts)
        briefings.append(daily)
        top = build_top_risk_briefings(events, narratives, risk_profiles, impacts, presence, alerts, top_n=3)
        briefings.extend(top)
    except Exception as exc:
        result.errors.append(f"briefing_builder: {exc}")
    return briefings


def _save_briefings(briefings: list[Any], result: GeopoliticsRunResult) -> None:
    try:
        from etl.sources.geopolitics.geo_briefing_builder import save_briefing
        for b in briefings:
            save_briefing(b)
    except Exception as exc:
        result.errors.append(f"save_briefings: {exc}")
