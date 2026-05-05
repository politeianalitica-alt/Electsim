"""
Geo Impact Model — Bloque 14.

Mapea eventos y señales geopolíticas a impactos domésticos en España.
10 dominios: energy, defense, migration, trade, inflation, public_opinion,
party_politics, security, corporate_exposure, diplomacy.

Nunca rompe — devuelve lista vacía si algo falla.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from etl.sources.geopolitics.schemas import (
    CountryRiskProfile,
    DomesticImpact,
    GeoEvent,
    GeoNarrativeSignal,
    SpanishPresence,
)

logger = logging.getLogger(__name__)

# Mapeo de tipos de evento a dominios domésticos
EVENT_TYPE_DOMAIN_MAP: dict[str, list[str]] = {
    "battles": ["defense", "security", "public_opinion"],
    "explosions/remote violence": ["defense", "security", "inflation"],
    "violence against civilians": ["migration", "public_opinion", "diplomacy"],
    "riots": ["public_opinion", "party_politics", "trade"],
    "protests": ["public_opinion", "party_politics"],
    "strategic developments": ["diplomacy", "defense", "trade"],
}

# Países con impacto energético directo para España
ENERGY_IMPACT_ISO3 = {"DZA", "NGA", "AGO", "SAU", "NOR", "RUS", "VEN", "LBY"}

# Países con impacto migratorio directo
MIGRATION_IMPACT_ISO3 = {"MAR", "DZA", "LBY", "SEN", "MRT", "MLI", "NER", "GNB", "GMB", "SYR"}

# Países con alta inversión empresarial española
CORPORATE_IMPACT_ISO3 = {"BRA", "MEX", "ARG", "COL", "TUR", "MAR", "CHL", "PER"}


def estimate_domestic_impacts(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    presence: list[SpanishPresence],
    risk_profiles: list[CountryRiskProfile],
) -> list[DomesticImpact]:
    """
    Estima impactos domésticos en España a partir de eventos y señales.

    Returns:
        Lista de DomesticImpact (máximo 1 por país+dominio).
    """
    impacts: list[DomesticImpact] = []
    seen: set[str] = set()

    for ev in events:
        try:
            impacts += _impacts_from_event(ev, presence, seen)
        except Exception as exc:
            logger.debug("impacts_from_event error: %s", exc)

    for sig in narratives:
        try:
            impacts += _impacts_from_narrative(sig, seen)
        except Exception as exc:
            logger.debug("impacts_from_narrative error: %s", exc)

    for profile in risk_profiles:
        try:
            impacts += _impacts_from_risk_profile(profile, seen)
        except Exception as exc:
            logger.debug("impacts_from_risk_profile error: %s", exc)

    return impacts


def map_geo_event_to_domestic_modules(event: GeoEvent) -> list[str]:
    """Devuelve lista de módulos domésticos afectados por un GeoEvent."""
    domains = EVENT_TYPE_DOMAIN_MAP.get(event.event_type.lower(), ["security"])
    if event.country_iso3 in ENERGY_IMPACT_ISO3 and "energy" not in domains:
        domains = ["energy"] + domains
    if event.country_iso3 in MIGRATION_IMPACT_ISO3 and "migration" not in domains:
        domains = domains + ["migration"]
    return domains


def explain_domestic_impact(impact: DomesticImpact) -> str:
    """Genera explicación textual de un DomesticImpact."""
    domain_labels = {
        "energy": "sector energético",
        "defense": "defensa y fuerzas armadas",
        "migration": "flujos migratorios",
        "trade": "comercio exterior",
        "inflation": "inflación y precios",
        "public_opinion": "opinión pública",
        "party_politics": "dinámica política partidista",
        "security": "seguridad nacional",
        "corporate_exposure": "empresas españolas en el exterior",
        "diplomacy": "relaciones diplomáticas",
    }
    domain_label = domain_labels.get(impact.impact_domain, impact.impact_domain)
    horizon_label = {
        "immediate": "impacto inmediato",
        "short_term": "corto plazo (< 3 meses)",
        "medium_term": "medio plazo (3-12 meses)",
        "long_term": "largo plazo (> 12 meses)",
    }.get(impact.time_horizon, impact.time_horizon)
    return (
        impact.explanation
        or f"Evento geopolítico con impacto {impact.severity} en {domain_label} español ({horizon_label})."
    )


# ── Helpers privados ─────────────────────────────────────────────────────────

def _make_impact_id() -> str:
    return str(uuid.uuid4())


def _dedup_key(country_iso3: str | None, domain: str) -> str:
    return f"{country_iso3 or 'global'}:{domain}"


def _impacts_from_event(
    ev: GeoEvent, presence: list[SpanishPresence], seen: set[str]
) -> list[DomesticImpact]:
    impacts = []
    domains = map_geo_event_to_domestic_modules(ev)
    presence_countries = {p.country_iso3 for p in presence}

    for domain in domains:
        key = _dedup_key(ev.country_iso3, domain)
        if key in seen:
            continue
        seen.add(key)

        score = _compute_impact_score(ev, domain, presence_countries)
        severity = _score_to_severity(score)
        horizon = _compute_horizon(ev, domain)

        impacts.append(DomesticImpact(
            impact_id=_make_impact_id(),
            country_iso3=ev.country_iso3,
            event_id=ev.event_id,
            impact_domain=domain,
            impact_score=score,
            severity=severity,
            time_horizon=horizon,
            explanation=_build_explanation(ev, domain),
            recommended_action=_recommend_action(domain, severity),
        ))
    return impacts


def _impacts_from_narrative(
    sig: GeoNarrativeSignal, seen: set[str]
) -> list[DomesticImpact]:
    impacts = []
    domains = sig.affected_modules or []
    valid_domains = {
        "energy", "defense", "migration", "trade", "inflation",
        "public_opinion", "party_politics", "security", "corporate_exposure", "diplomacy"
    }
    domains = [d for d in domains if d in valid_domains]

    for domain in domains:
        key = _dedup_key(sig.country_iso3, domain)
        if key in seen:
            continue
        seen.add(key)

        score = min(100.0, sig.domestic_relevance * 100)
        impacts.append(DomesticImpact(
            impact_id=_make_impact_id(),
            country_iso3=sig.country_iso3,
            signal_id=sig.signal_id,
            impact_domain=domain,
            impact_score=score,
            severity=sig.severity,
            time_horizon="short_term",
            explanation=sig.explanation or f"Narrativa geopolítica con impacto en {domain}.",
        ))
    return impacts


def _impacts_from_risk_profile(
    profile: CountryRiskProfile, seen: set[str]
) -> list[DomesticImpact]:
    impacts = []
    domain_score_map = {
        "energy": profile.energy_risk,
        "migration": profile.migration_risk,
        "defense": profile.defense_risk,
        "corporate_exposure": profile.economic_risk,
        "diplomacy": profile.political_risk,
    }

    for domain, score in domain_score_map.items():
        if score < 40.0:
            continue
        key = _dedup_key(profile.country_iso3, domain)
        if key in seen:
            continue
        seen.add(key)

        impacts.append(DomesticImpact(
            impact_id=_make_impact_id(),
            country_iso3=profile.country_iso3,
            impact_domain=domain,
            impact_score=score,
            severity=_score_to_severity(score),
            time_horizon="medium_term",
            explanation=f"Riesgo {domain} elevado en {profile.country_name}: {score:.0f}/100.",
        ))
    return impacts


def _compute_impact_score(
    ev: GeoEvent, domain: str, presence_countries: set[str]
) -> float:
    base = {"CRITICAL": 85.0, "HIGH": 65.0, "MEDIUM": 45.0, "LOW": 25.0}.get(ev.severity, 25.0)
    multiplier = 1.0

    if ev.country_iso3 in ENERGY_IMPACT_ISO3 and domain == "energy":
        multiplier = 1.3
    elif ev.country_iso3 in MIGRATION_IMPACT_ISO3 and domain == "migration":
        multiplier = 1.2
    elif ev.country_iso3 in CORPORATE_IMPACT_ISO3 and domain == "corporate_exposure":
        multiplier = 1.2
    elif ev.country_iso3 in presence_countries:
        multiplier = 1.15

    return min(100.0, base * multiplier)


def _score_to_severity(score: float) -> str:
    if score >= 75:
        return "CRITICAL"
    if score >= 55:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def _compute_horizon(ev: GeoEvent, domain: str) -> str:
    if ev.severity == "CRITICAL":
        return "immediate"
    if domain in ("energy", "migration", "security"):
        return "short_term"
    if domain in ("trade", "inflation", "corporate_exposure"):
        return "medium_term"
    return "short_term"


def _build_explanation(ev: GeoEvent, domain: str) -> str:
    domain_texts = {
        "energy": f"La inestabilidad en {ev.country} puede afectar el suministro energético español.",
        "defense": f"Evento en {ev.country} requiere atención de fuerzas armadas y misiones exteriores.",
        "migration": f"La situación en {ev.country} puede incrementar presión migratoria sobre España.",
        "trade": f"El conflicto en {ev.country} puede disruptar rutas comerciales con España.",
        "inflation": f"La inestabilidad en {ev.country} puede generar presiones inflacionistas.",
        "public_opinion": f"El conflicto en {ev.country} puede movilizar la opinión pública española.",
        "party_politics": f"La crisis en {ev.country} puede impactar en el debate político español.",
        "security": f"La situación en {ev.country} puede afectar la seguridad nacional española.",
        "corporate_exposure": f"Empresas españolas con presencia en {ev.country} en riesgo.",
        "diplomacy": f"La crisis en {ev.country} requiere respuesta diplomática española/europea.",
    }
    return domain_texts.get(domain, f"Evento geopolítico en {ev.country} con impacto en {domain}.")


def _recommend_action(domain: str, severity: str) -> str | None:
    if severity not in ("HIGH", "CRITICAL"):
        return None
    recommendations = {
        "energy": "Revisar contratos de suministro energético y activar reservas estratégicas.",
        "defense": "Evaluar seguridad de misiones exteriores y revisar ROE.",
        "migration": "Reforzar vigilancia fronteriza y coordinación con FRONTEX.",
        "trade": "Diversificar cadenas de suministro y activar mecanismos de cobertura.",
        "inflation": "Monitorizar precios de materias primas y energía.",
        "security": "Activar protocolos de seguridad y alertas CNI.",
        "corporate_exposure": "Notificar empresas españolas afectadas. Revisar cobertura de riesgos.",
        "diplomacy": "Convocar reunión de emergencia con embajadores y consultar posición UE.",
    }
    return recommendations.get(domain)
