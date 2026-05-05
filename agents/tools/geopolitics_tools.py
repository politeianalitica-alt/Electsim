"""
Geopolitics Brain Tools — Bloque 14.

6 herramientas LLM para inteligencia geopolítica.
Registradas en GEOPOLITICS_TOOLS para el Brain.

Nunca rompen — devuelven dict con error si algo falla.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

GEOPOLITICS_TOOLS: list[dict[str, Any]] = []


def _register(func):
    """Decorador que registra una herramienta en GEOPOLITICS_TOOLS."""
    GEOPOLITICS_TOOLS.append({
        "name": func.__name__,
        "description": func.__doc__ or "",
        "function": func,
    })
    return func


@_register
def get_geopolitical_events(
    days_back: int = 7,
    country_iso3: str | None = None,
    severity: str | None = None,
) -> dict[str, Any]:
    """
    Obtiene eventos geopolíticos recientes relevantes para España.
    Filtra por país (ISO3) y severidad (LOW/MEDIUM/HIGH/CRITICAL).
    Fuentes: ACLED, GDELT, UCDP.
    """
    try:
        from datetime import date, timedelta
        from etl.sources.geopolitics.acled_client import fetch_acled_events

        start = date.today() - timedelta(days=days_back)
        countries = [country_iso3] if country_iso3 else None
        events = fetch_acled_events(countries=countries, start_date=start)

        if severity:
            events = [e for e in events if e.severity == severity.upper()]

        return {
            "total": len(events),
            "events": [
                {
                    "event_id": e.event_id,
                    "country": e.country,
                    "country_iso3": e.country_iso3,
                    "event_type": e.event_type,
                    "event_date": str(e.event_date),
                    "severity": e.severity,
                    "fatalities": e.fatalities,
                    "actor_1": e.actor_1,
                    "actor_2": e.actor_2,
                    "location": e.location_name,
                }
                for e in events[:20]
            ],
        }
    except Exception as exc:
        logger.warning("get_geopolitical_events error: %s", exc)
        return {"error": str(exc), "total": 0, "events": []}


@_register
def get_country_risk_profile(country_iso3: str) -> dict[str, Any]:
    """
    Obtiene el perfil de riesgo geopolítico de un país por código ISO3.
    Incluye: conflict_risk, energy_risk, migration_risk, total_score, trend.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_risk_scorer import compute_country_risk_profile
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = [e for e in fetch_acled_events() if e.country_iso3 == country_iso3]
        presence = get_spanish_presence(country_iso3=country_iso3)
        profile = compute_country_risk_profile(
            country_iso3=country_iso3,
            country_name=country_iso3,
            events=events,
            narratives=[],
            presence=presence,
        )
        return {
            "country_iso3": profile.country_iso3,
            "country_name": profile.country_name,
            "total_score": round(profile.total_score, 1),
            "conflict_risk": round(profile.conflict_risk, 1),
            "energy_risk": round(profile.energy_risk, 1),
            "migration_risk": round(profile.migration_risk, 1),
            "political_risk": round(profile.political_risk, 1),
            "trend": profile.trend,
            "interest_for_spain": round(profile.interest_for_spain, 1),
            "explanation": profile.explanation,
        }
    except Exception as exc:
        logger.warning("get_country_risk_profile error: %s", exc)
        return {"error": str(exc), "country_iso3": country_iso3}


@_register
def get_active_geo_alerts(
    severity: str | None = None,
    alert_type: str | None = None,
) -> dict[str, Any]:
    """
    Obtiene alertas geopolíticas activas relevantes para España.
    Tipos: conflict_escalation, energy_security, migration_pressure,
    defense_mission_risk, diplomatic_crisis, spanish_exposure, narrative_spike.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        presence = get_spanish_presence()
        alerts = detect_signals(events, [], [], presence)

        if severity:
            alerts = [a for a in alerts if a.severity == severity.upper()]
        if alert_type:
            alerts = [a for a in alerts if a.alert_type == alert_type]

        return {
            "total": len(alerts),
            "alerts": [
                {
                    "alert_id": a.alert_id,
                    "alert_type": a.alert_type,
                    "country_iso3": a.country_iso3,
                    "title": a.title,
                    "description": a.description,
                    "severity": a.severity,
                    "affected_modules": a.affected_modules,
                }
                for a in alerts[:15]
            ],
        }
    except Exception as exc:
        logger.warning("get_active_geo_alerts error: %s", exc)
        return {"error": str(exc), "total": 0, "alerts": []}


@_register
def get_spanish_presence_abroad(
    country_iso3: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    """
    Obtiene información sobre la presencia española en el exterior.
    Categorías: military, energy, business, diplomatic, diaspora.
    """
    try:
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        categories = [category] if category else None
        presence = get_spanish_presence(country_iso3=country_iso3, categories=categories)

        by_category: dict[str, list] = {}
        for p in presence:
            by_category.setdefault(p.category, []).append({
                "country": p.country_name,
                "country_iso3": p.country_iso3,
                "actor": p.actor_name,
                "description": p.description,
                "value": p.value,
                "unit": p.unit,
                "relevance": p.relevance_score,
            })

        return {
            "total": len(presence),
            "by_category": by_category,
        }
    except Exception as exc:
        logger.warning("get_spanish_presence_abroad error: %s", exc)
        return {"error": str(exc), "total": 0, "by_category": {}}


@_register
def get_domestic_impact_assessment(
    domain: str | None = None,
    country_iso3: str | None = None,
) -> dict[str, Any]:
    """
    Obtiene evaluación de impactos domésticos en España de eventos geopolíticos.
    Dominios: energy, defense, migration, trade, inflation, public_opinion,
    party_politics, security, corporate_exposure, diplomacy.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        if country_iso3:
            events = [e for e in events if e.country_iso3 == country_iso3]
        presence = get_spanish_presence()
        impacts = estimate_domestic_impacts(events, [], presence, [])

        if domain:
            impacts = [i for i in impacts if i.impact_domain == domain]

        return {
            "total": len(impacts),
            "impacts": [
                {
                    "country_iso3": i.country_iso3,
                    "impact_domain": i.impact_domain,
                    "impact_score": round(i.impact_score, 1),
                    "severity": i.severity,
                    "time_horizon": i.time_horizon,
                    "explanation": i.explanation,
                    "recommended_action": i.recommended_action,
                }
                for i in sorted(impacts, key=lambda x: x.impact_score, reverse=True)[:15]
            ],
        }
    except Exception as exc:
        logger.warning("get_domestic_impact_assessment error: %s", exc)
        return {"error": str(exc), "total": 0, "impacts": []}


@_register
def get_daily_geo_briefing(country_iso3: str | None = None) -> dict[str, Any]:
    """
    Genera un briefing geopolítico diario para España o para un país específico.
    Si se especifica country_iso3, genera briefing de ese país.
    Sin country_iso3, genera el digest diario global.
    """
    try:
        from etl.sources.geopolitics.acled_client import fetch_acled_events
        from etl.sources.geopolitics.geo_briefing_builder import (
            build_country_briefing,
            build_daily_spain_digest,
        )
        from etl.sources.geopolitics.geo_impact_model import estimate_domestic_impacts
        from etl.sources.geopolitics.geo_risk_scorer import compute_country_risk_profile, score_all_countries
        from etl.sources.geopolitics.geo_signal_detector import detect_signals
        from etl.sources.geopolitics.spanish_presence_provider import get_spanish_presence

        events = fetch_acled_events()
        presence = get_spanish_presence()

        if country_iso3:
            c_events = [e for e in events if e.country_iso3 == country_iso3]
            profile = compute_country_risk_profile(country_iso3, country_iso3, c_events, [], presence)
            c_impacts = estimate_domestic_impacts(c_events, [], presence, [profile])
            c_alerts = detect_signals(c_events, [], [profile], presence)
            c_presence = [p for p in presence if p.country_iso3 == country_iso3]
            briefing = build_country_briefing(
                country_iso3=country_iso3,
                country_name=country_iso3,
                events=events,
                narratives=[],
                risk_profile=profile,
                impacts=c_impacts,
                presence=c_presence,
                alerts=c_alerts,
            )
        else:
            profiles = score_all_countries(events, [], presence)
            impacts = estimate_domestic_impacts(events, [], presence, profiles)
            alerts = detect_signals(events, [], profiles, presence)
            briefing = build_daily_spain_digest(events, [], profiles, impacts, alerts)

        return {
            "briefing_id": briefing.briefing_id,
            "titulo": briefing.titulo,
            "fecha": str(briefing.fecha),
            "situacion": briefing.situacion,
            "eventos_clave": briefing.eventos_clave,
            "impacto_espana": briefing.impacto_espana,
            "riesgos": briefing.riesgos,
            "escenarios": briefing.escenarios,
            "recomendaciones": briefing.recomendaciones,
            "fuentes": briefing.fuentes,
        }
    except Exception as exc:
        logger.warning("get_daily_geo_briefing error: %s", exc)
        return {"error": str(exc)}
