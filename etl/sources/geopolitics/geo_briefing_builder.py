"""
Geo Briefing Builder — Bloque 14.

Construye briefings geopolíticos estructurados (GeoBriefing) para:
- Un país específico
- Digest diario de España
- Top N países por riesgo

Nunca rompe — devuelve briefings con datos disponibles.
"""
from __future__ import annotations

import logging
import uuid
from datetime import date
from typing import Any

from etl.sources.geopolitics.schemas import (
    CountryRiskProfile,
    DomesticImpact,
    GeoAlert,
    GeoBriefing,
    GeoEvent,
    GeoNarrativeSignal,
    SpanishPresence,
)

logger = logging.getLogger(__name__)


def build_country_briefing(
    country_iso3: str,
    country_name: str,
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    risk_profile: CountryRiskProfile | None,
    impacts: list[DomesticImpact],
    presence: list[SpanishPresence],
    alerts: list[GeoAlert],
) -> GeoBriefing:
    """
    Construye un GeoBriefing para un país específico.

    Args:
        country_iso3: Código ISO3 del país.
        country_name: Nombre del país.
        events: Eventos recientes en ese país.
        narratives: Narrativas mediáticas del país.
        risk_profile: Perfil de riesgo calculado.
        impacts: Impactos domésticos derivados.
        presence: Presencia española en el país.
        alerts: Alertas activas para el país.

    Returns:
        GeoBriefing estructurado.
    """
    country_events = [e for e in events if e.country_iso3 == country_iso3]
    country_impacts = [i for i in impacts if i.country_iso3 == country_iso3]
    country_alerts = [a for a in alerts if a.country_iso3 == country_iso3]
    country_presence = [p for p in presence if p.country_iso3 == country_iso3]

    titulo = f"Briefing Geopolítico: {country_name}"
    if risk_profile:
        titulo += f" — Riesgo {risk_profile.total_score:.0f}/100"

    situacion = _build_situacion(country_name, country_events, risk_profile, narratives)
    eventos_clave = _extract_key_events(country_events)
    impacto_espana = _build_spain_impact(country_name, country_impacts, country_presence)
    riesgos = _extract_risks(country_alerts, risk_profile, country_events)
    escenarios = _build_scenarios(country_name, risk_profile, country_events)
    recomendaciones = _build_recommendations(country_impacts, country_alerts)
    fuentes = _collect_sources(country_events, narratives)

    return GeoBriefing(
        briefing_id=str(uuid.uuid4()),
        country_iso3=country_iso3,
        titulo=titulo,
        fecha=date.today(),
        situacion=situacion,
        eventos_clave=eventos_clave,
        impacto_espana=impacto_espana,
        riesgos=riesgos,
        escenarios=escenarios,
        recomendaciones=recomendaciones,
        fuentes=fuentes,
        raw_payload={
            "n_events": len(country_events),
            "n_alerts": len(country_alerts),
            "risk_score": risk_profile.total_score if risk_profile else None,
        },
    )


def build_daily_spain_digest(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    risk_profiles: list[CountryRiskProfile],
    impacts: list[DomesticImpact],
    alerts: list[GeoAlert],
) -> GeoBriefing:
    """
    Construye el digest diario geopolítico para España.

    Resume los principales desarrollos internacionales con impacto en España.
    """
    today = date.today()
    high_alerts = [a for a in alerts if a.severity in ("HIGH", "CRITICAL")]
    top_risks = sorted(risk_profiles, key=lambda p: p.total_score, reverse=True)[:5]
    critical_events = [e for e in events if e.severity in ("HIGH", "CRITICAL")]

    situacion = _build_daily_situacion(high_alerts, top_risks, critical_events)
    eventos_clave = _extract_key_events(critical_events[:10])
    impacto_espana = _build_daily_spain_impact(impacts)
    riesgos = [a.title for a in high_alerts[:5]]
    escenarios = _build_daily_scenarios(top_risks)
    recomendaciones = _build_daily_recommendations(impacts, high_alerts)
    fuentes = _collect_sources(events[:20], narratives[:10])

    return GeoBriefing(
        briefing_id=str(uuid.uuid4()),
        country_iso3=None,
        region="global",
        titulo=f"Digest Geopolítico Diario — {today.strftime('%d/%m/%Y')}",
        fecha=today,
        situacion=situacion,
        eventos_clave=eventos_clave,
        impacto_espana=impacto_espana,
        riesgos=riesgos,
        escenarios=escenarios,
        recomendaciones=recomendaciones,
        fuentes=fuentes,
        raw_payload={
            "n_total_events": len(events),
            "n_high_alerts": len(high_alerts),
            "n_countries_at_risk": len(top_risks),
            "n_impacts": len(impacts),
        },
    )


def build_top_risk_briefings(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    risk_profiles: list[CountryRiskProfile],
    impacts: list[DomesticImpact],
    presence: list[SpanishPresence],
    alerts: list[GeoAlert],
    top_n: int = 5,
) -> list[GeoBriefing]:
    """Construye briefings para los top N países por riesgo."""
    top_profiles = sorted(risk_profiles, key=lambda p: p.total_score, reverse=True)[:top_n]
    briefings = []
    for profile in top_profiles:
        try:
            briefing = build_country_briefing(
                country_iso3=profile.country_iso3,
                country_name=profile.country_name,
                events=events,
                narratives=narratives,
                risk_profile=profile,
                impacts=impacts,
                presence=presence,
                alerts=alerts,
            )
            briefings.append(briefing)
        except Exception as exc:
            logger.debug("build_country_briefing error for %s: %s", profile.country_iso3, exc)
    return briefings


def save_briefing(briefing: GeoBriefing) -> bool:
    """Persiste un GeoBriefing en BD."""
    try:
        import json
        conn = _get_conn()
        if conn is None:
            return False
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO geo_briefings (
                    briefing_id, country_iso3, region, titulo, fecha,
                    situacion, eventos_clave, impacto_espana, riesgos,
                    escenarios, recomendaciones, fuentes, raw_payload
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (briefing_id) DO NOTHING
                """,
                (
                    briefing.briefing_id, briefing.country_iso3, briefing.region,
                    briefing.titulo, briefing.fecha,
                    briefing.situacion,
                    json.dumps(briefing.eventos_clave),
                    briefing.impacto_espana,
                    json.dumps(briefing.riesgos),
                    json.dumps(briefing.escenarios),
                    json.dumps(briefing.recomendaciones),
                    json.dumps(briefing.fuentes),
                    json.dumps(briefing.raw_payload),
                ),
            )
        conn.commit()
        return True
    except Exception as exc:
        logger.warning("save_briefing error: %s", exc)
        return False


# ── Helpers privados ─────────────────────────────────────────────────────────

def _build_situacion(
    country_name: str,
    events: list[GeoEvent],
    risk_profile: CountryRiskProfile | None,
    narratives: list[GeoNarrativeSignal],
) -> str:
    parts = []
    if risk_profile:
        trend_label = {"rising": "en aumento", "stable": "estable", "falling": "en descenso"}.get(
            risk_profile.trend, "estable"
        )
        parts.append(
            f"{country_name} presenta un riesgo geopolítico de {risk_profile.total_score:.0f}/100, "
            f"con tendencia {trend_label}."
        )
    n_high = sum(1 for e in events if e.severity in ("HIGH", "CRITICAL"))
    if n_high > 0:
        parts.append(f"Se registran {n_high} eventos de alta severidad en el período analizado.")
    avg_tone = None
    tones = [s.avg_tone for s in narratives if s.avg_tone is not None]
    if tones:
        avg_tone = sum(tones) / len(tones)
        tone_label = "muy negativo" if avg_tone < -5 else "negativo" if avg_tone < -2 else "neutro"
        parts.append(f"El tono mediático internacional es {tone_label} ({avg_tone:.1f}).")
    return " ".join(parts) or f"Situación en {country_name} bajo seguimiento."


def _extract_key_events(events: list[GeoEvent]) -> list[str]:
    priority = sorted(
        events,
        key=lambda e: {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(e.severity, 0),
        reverse=True,
    )
    result = []
    for ev in priority[:8]:
        loc = ev.location_name or ev.country
        actors = f" ({ev.actor_1} vs {ev.actor_2})" if ev.actor_1 and ev.actor_2 else ""
        fat = f" — {ev.fatalities} bajas" if ev.fatalities else ""
        result.append(f"[{ev.event_date}] {ev.event_type.title()} en {loc}{actors}{fat} [{ev.severity}]")
    return result


def _build_spain_impact(
    country_name: str, impacts: list[DomesticImpact], presence: list[SpanishPresence]
) -> str:
    if not impacts and not presence:
        return f"Impacto directo en España de la situación en {country_name} bajo evaluación."
    parts = []
    domains_hit = {i.impact_domain for i in impacts if i.severity in ("HIGH", "CRITICAL")}
    if domains_hit:
        parts.append(f"Dominios afectados: {', '.join(domains_hit)}.")
    presence_cats = {p.category for p in presence}
    if presence_cats:
        parts.append(f"Presencia española activa: {', '.join(presence_cats)}.")
    return " ".join(parts) or "Monitorización activa del impacto en España."


def _extract_risks(
    alerts: list[GeoAlert], risk_profile: CountryRiskProfile | None, events: list[GeoEvent]
) -> list[str]:
    risks = [a.title for a in alerts if a.severity in ("HIGH", "CRITICAL")]
    if risk_profile and risk_profile.conflict_risk > 70:
        risks.append(f"Riesgo de conflicto elevado: {risk_profile.conflict_risk:.0f}/100")
    if risk_profile and risk_profile.energy_risk > 60:
        risks.append(f"Riesgo energético: {risk_profile.energy_risk:.0f}/100")
    return risks[:6]


def _build_scenarios(
    country_name: str, risk_profile: CountryRiskProfile | None, events: list[GeoEvent]
) -> list[str]:
    scenarios = []
    if risk_profile:
        if risk_profile.total_score >= 70:
            scenarios.append(f"Escenario adverso: escalada del conflicto en {country_name} con impacto regional.")
        if risk_profile.trend == "rising":
            scenarios.append(f"Escenario tendencial: deterioro progresivo de la situación en {country_name}.")
        scenarios.append(f"Escenario base: mantenimiento de la situación actual con gestión diplomática.")
    return scenarios or [f"Seguimiento continuo de la situación en {country_name}."]


def _build_recommendations(impacts: list[DomesticImpact], alerts: list[GeoAlert]) -> list[str]:
    recs = set()
    for impact in impacts:
        if impact.recommended_action and impact.severity in ("HIGH", "CRITICAL"):
            recs.add(impact.recommended_action)
    for alert in alerts:
        if alert.severity == "CRITICAL":
            recs.add(f"Prioridad máxima: {alert.title}")
    return list(recs)[:5]


def _collect_sources(events: list[GeoEvent], narratives: list[GeoNarrativeSignal]) -> list[str]:
    sources = set()
    for ev in events:
        if ev.source:
            sources.add(ev.source.upper())
        if ev.source_url:
            sources.add(ev.source_url[:60])
    for sig in narratives:
        sources.update(sig.dominant_sources[:2])
    return sorted(sources)[:10]


def _build_daily_situacion(
    alerts: list[GeoAlert], top_risks: list[CountryRiskProfile], events: list[GeoEvent]
) -> str:
    parts = []
    if alerts:
        parts.append(f"{len(alerts)} alertas geopolíticas activas de alta severidad.")
    if top_risks:
        top_country = top_risks[0]
        parts.append(
            f"País de mayor riesgo: {top_country.country_name} ({top_country.total_score:.0f}/100)."
        )
    critical = [e for e in events if e.severity == "CRITICAL"]
    if critical:
        parts.append(f"{len(critical)} eventos críticos registrados en las últimas 24-48h.")
    return " ".join(parts) or "Situación geopolítica global bajo seguimiento ordinario."


def _build_daily_spain_impact(impacts: list[DomesticImpact]) -> str:
    if not impacts:
        return "Sin impactos domésticos críticos identificados."
    critical = [i for i in impacts if i.severity in ("HIGH", "CRITICAL")]
    if not critical:
        return f"{len(impacts)} impactos potenciales identificados, ninguno crítico."
    domains = {i.impact_domain for i in critical}
    return f"{len(critical)} impactos críticos en: {', '.join(domains)}."


def _build_daily_scenarios(top_risks: list[CountryRiskProfile]) -> list[str]:
    scenarios = []
    for p in top_risks[:3]:
        if p.total_score >= 70:
            scenarios.append(f"Riesgo elevado en {p.country_name}: posible escalada con impacto regional.")
    if not scenarios:
        scenarios.append("Situación global estable. Seguimiento rutinario.")
    return scenarios


def _build_daily_recommendations(impacts: list[DomesticImpact], alerts: list[GeoAlert]) -> list[str]:
    recs = []
    if any(a.alert_type == "energy_security" for a in alerts):
        recs.append("Revisar seguridad energética: diversificación de suministros.")
    if any(a.alert_type == "migration_pressure" for a in alerts):
        recs.append("Reforzar coordinación FRONTEX ante presión migratoria.")
    if any(a.alert_type == "defense_mission_risk" for a in alerts):
        recs.append("Evaluar seguridad de misiones militares exteriores.")
    return recs or ["Mantener seguimiento ordinario de la situación geopolítica."]


def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None
