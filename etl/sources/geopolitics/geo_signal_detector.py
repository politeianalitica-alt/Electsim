"""
Geo Signal Detector — Bloque 14.

Detecta señales geopolíticas relevantes para España y genera GeoAlert.
10 tipos de señal: conflict_escalation, fatalities_spike, country_risk_spike,
negative_tone_spike, spanish_exposure_risk, energy_security_risk,
migration_pressure_signal, defense_mission_risk, diplomatic_crisis_signal,
domestic_narrative_risk.

Nunca rompe — devuelve lista vacía si algo falla.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime
from typing import Any

from etl.sources.geopolitics.schemas import (
    CountryRiskProfile,
    GeoAlert,
    GeoEvent,
    GeoNarrativeSignal,
    SpanishPresence,
)

logger = logging.getLogger(__name__)

# Países con exposición militar española activa
MILITARY_EXPOSURE_ISO3 = {"LBY", "MLI", "IRQ", "LBN", "AFG", "SOM", "CAF"}

# Países con exposición energética crítica para España
ENERGY_CRITICAL_ISO3 = {"DZA", "NGA", "AGO", "SAU", "NOR", "RUS", "VEN"}

# Países con alta presión migratoria hacia España
MIGRATION_PRESSURE_ISO3 = {"MAR", "DZA", "LBY", "SEN", "MRT", "MLI", "NER", "GNB", "GMB"}

# Umbrales
_FATALITY_SPIKE_THRESHOLD = 50
_RISK_SPIKE_THRESHOLD = 65.0
_TONE_SPIKE_THRESHOLD = -5.0
_VOLUME_SPIKE_THRESHOLD = 100


def detect_signals(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    risk_profiles: list[CountryRiskProfile],
    presence: list[SpanishPresence],
) -> list[GeoAlert]:
    """
    Detecta todas las señales geopolíticas relevantes.

    Args:
        events: Eventos ACLED/GDELT/UCDP recientes.
        narratives: Señales narrativas GDELT.
        risk_profiles: Perfiles de riesgo calculados.
        presence: Presencia española en países.

    Returns:
        Lista de GeoAlert (deduplicados por país+tipo).
    """
    alerts: list[GeoAlert] = []
    seen: set[str] = set()  # deduplicación por (country_iso3, alert_type)

    try:
        alerts += _detect_conflict_escalation(events, seen)
    except Exception as exc:
        logger.debug("conflict_escalation detector error: %s", exc)

    try:
        alerts += _detect_fatalities_spike(events, seen)
    except Exception as exc:
        logger.debug("fatalities_spike detector error: %s", exc)

    try:
        alerts += _detect_country_risk_spike(risk_profiles, seen)
    except Exception as exc:
        logger.debug("country_risk_spike detector error: %s", exc)

    try:
        alerts += _detect_negative_tone_spike(narratives, seen)
    except Exception as exc:
        logger.debug("negative_tone_spike detector error: %s", exc)

    try:
        alerts += _detect_spanish_exposure_risk(events, presence, seen)
    except Exception as exc:
        logger.debug("spanish_exposure_risk detector error: %s", exc)

    try:
        alerts += _detect_energy_security_risk(events, narratives, seen)
    except Exception as exc:
        logger.debug("energy_security_risk detector error: %s", exc)

    try:
        alerts += _detect_migration_pressure(events, narratives, seen)
    except Exception as exc:
        logger.debug("migration_pressure detector error: %s", exc)

    try:
        alerts += _detect_defense_mission_risk(events, presence, seen)
    except Exception as exc:
        logger.debug("defense_mission_risk detector error: %s", exc)

    try:
        alerts += _detect_diplomatic_crisis(events, narratives, seen)
    except Exception as exc:
        logger.debug("diplomatic_crisis detector error: %s", exc)

    try:
        alerts += _detect_domestic_narrative_risk(narratives, seen)
    except Exception as exc:
        logger.debug("domestic_narrative_risk detector error: %s", exc)

    logger.info("Señales detectadas: %d alertas", len(alerts))
    return alerts


def save_alerts(alerts: list[GeoAlert]) -> int:
    """Persiste alertas en BD. Retorna número guardadas."""
    if not alerts:
        return 0
    saved = 0
    try:
        import json
        conn = _get_conn()
        if conn is None:
            return 0
        with conn.cursor() as cur:
            for alert in alerts:
                try:
                    cur.execute(
                        """
                        INSERT INTO geo_alerts (
                            alert_id, alert_type, country_iso3, title,
                            description, severity, affected_modules,
                            evidence, created_at, raw_payload
                        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                        ON CONFLICT (alert_id) DO NOTHING
                        """,
                        (
                            alert.alert_id, alert.alert_type, alert.country_iso3,
                            alert.title, alert.description, alert.severity,
                            json.dumps(alert.affected_modules),
                            json.dumps(alert.evidence),
                            alert.created_at,
                            json.dumps(alert.raw_payload),
                        ),
                    )
                    saved += 1
                except Exception as exc:
                    logger.debug("save_alert error: %s", exc)
        conn.commit()
    except Exception as exc:
        logger.warning("save_alerts BD error: %s", exc)
    return saved


# ── Detectores privados ──────────────────────────────────────────────────────

def _make_alert_id() -> str:
    return str(uuid.uuid4())


def _dedup_key(country_iso3: str | None, alert_type: str) -> str:
    return f"{country_iso3 or 'global'}:{alert_type}"


def _detect_conflict_escalation(
    events: list[GeoEvent], seen: set[str]
) -> list[GeoAlert]:
    """Detecta escalada de conflicto: eventos HIGH/CRITICAL en mismo país."""
    from collections import Counter
    country_severity: Counter = Counter()
    for ev in events:
        if ev.severity in ("HIGH", "CRITICAL") and ev.country_iso3:
            country_severity[ev.country_iso3] += 1

    alerts = []
    for iso3, count in country_severity.items():
        if count < 3:
            continue
        key = _dedup_key(iso3, "conflict_escalation")
        if key in seen:
            continue
        seen.add(key)
        severity = "CRITICAL" if count >= 10 else "HIGH"
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="conflict_escalation",
            country_iso3=iso3,
            title=f"Escalada de conflicto en {iso3}",
            description=f"{count} eventos de alta severidad detectados en los últimos días.",
            severity=severity,
            affected_modules=["geopolitics", "defense", "security"],
        ))
    return alerts


def _detect_fatalities_spike(
    events: list[GeoEvent], seen: set[str]
) -> list[GeoAlert]:
    """Detecta pico de bajas por país."""
    from collections import defaultdict
    country_fatalities: dict[str, int] = defaultdict(int)
    for ev in events:
        if ev.fatalities and ev.country_iso3:
            country_fatalities[ev.country_iso3] += ev.fatalities

    alerts = []
    for iso3, total_fat in country_fatalities.items():
        if total_fat < _FATALITY_SPIKE_THRESHOLD:
            continue
        key = _dedup_key(iso3, "country_risk_spike")
        if key in seen:
            continue
        seen.add(key)
        severity = "CRITICAL" if total_fat >= 200 else "HIGH"
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="conflict_escalation",
            country_iso3=iso3,
            title=f"Pico de bajas en {iso3}: {total_fat} víctimas",
            description=f"Total de {total_fat} bajas registradas en eventos recientes.",
            severity=severity,
            affected_modules=["geopolitics", "defense"],
        ))
    return alerts


def _detect_country_risk_spike(
    risk_profiles: list[CountryRiskProfile], seen: set[str]
) -> list[GeoAlert]:
    """Detecta pico de riesgo país."""
    alerts = []
    for profile in risk_profiles:
        if profile.total_score < _RISK_SPIKE_THRESHOLD:
            continue
        key = _dedup_key(profile.country_iso3, "country_risk_spike")
        if key in seen:
            continue
        seen.add(key)
        severity = "CRITICAL" if profile.total_score >= 80 else "HIGH"
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="country_risk_spike",
            country_iso3=profile.country_iso3,
            title=f"Riesgo país elevado: {profile.country_name} ({profile.total_score:.0f}/100)",
            description=profile.explanation or f"Score de riesgo: {profile.total_score:.1f}",
            severity=severity,
            affected_modules=["geopolitics", "risk"],
        ))
    return alerts


def _detect_negative_tone_spike(
    narratives: list[GeoNarrativeSignal], seen: set[str]
) -> list[GeoAlert]:
    """Detecta pico de tono negativo en narrativas GDELT."""
    alerts = []
    for sig in narratives:
        if sig.avg_tone is None or sig.avg_tone > _TONE_SPIKE_THRESHOLD:
            continue
        key = _dedup_key(sig.country_iso3, "narrative_spike")
        if key in seen:
            continue
        seen.add(key)
        severity = "HIGH" if sig.avg_tone < -8 else "MEDIUM"
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="narrative_spike",
            country_iso3=sig.country_iso3,
            title=f"Tono mediático muy negativo: {sig.topic}",
            description=f"Tono promedio {sig.avg_tone:.1f} en {sig.volume_24h} artículos 24h.",
            severity=severity,
            affected_modules=["geopolitics", "media"],
        ))
    return alerts


def _detect_spanish_exposure_risk(
    events: list[GeoEvent], presence: list[SpanishPresence], seen: set[str]
) -> list[GeoAlert]:
    """Detecta riesgo en países con exposición española alta."""
    presence_countries = {p.country_iso3 for p in presence}
    alerts = []
    for ev in events:
        if ev.country_iso3 not in presence_countries:
            continue
        if ev.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(ev.country_iso3, "spanish_exposure")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="spanish_exposure",
            country_iso3=ev.country_iso3,
            title=f"Riesgo para presencia española en {ev.country}",
            description=f"Evento {ev.severity}: {ev.event_type} en {ev.location_name or ev.country}.",
            severity=ev.severity,
            affected_modules=["geopolitics", "corporate_exposure", "defense"],
        ))
    return alerts


def _detect_energy_security_risk(
    events: list[GeoEvent], narratives: list[GeoNarrativeSignal], seen: set[str]
) -> list[GeoAlert]:
    """Detecta riesgo energético en países críticos para España."""
    alerts = []
    for ev in events:
        if ev.country_iso3 not in ENERGY_CRITICAL_ISO3:
            continue
        if ev.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(ev.country_iso3, "energy_security")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="energy_security",
            country_iso3=ev.country_iso3,
            title=f"Riesgo energético: inestabilidad en {ev.country}",
            description=f"Evento {ev.severity} en país con dependencia energética española.",
            severity="HIGH",
            affected_modules=["geopolitics", "energy", "economy"],
        ))

    for sig in narratives:
        if sig.country_iso3 not in ENERGY_CRITICAL_ISO3:
            continue
        if "energy" not in sig.topic.lower() and "gas" not in sig.topic.lower():
            continue
        key = _dedup_key(sig.country_iso3, "energy_security_narrative")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="energy_security",
            country_iso3=sig.country_iso3,
            title=f"Narrativa energética: {sig.topic}",
            description=f"Volumen 24h: {sig.volume_24h}. Tono: {sig.avg_tone}.",
            severity="MEDIUM",
            affected_modules=["geopolitics", "energy"],
        ))
    return alerts


def _detect_migration_pressure(
    events: list[GeoEvent], narratives: list[GeoNarrativeSignal], seen: set[str]
) -> list[GeoAlert]:
    """Detecta presión migratoria desde países de origen."""
    alerts = []
    for ev in events:
        if ev.country_iso3 not in MIGRATION_PRESSURE_ISO3:
            continue
        if ev.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(ev.country_iso3, "migration_pressure")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="migration_pressure",
            country_iso3=ev.country_iso3,
            title=f"Presión migratoria: inestabilidad en {ev.country}",
            description=f"Evento {ev.severity} puede incrementar flujos migratorios hacia España.",
            severity="MEDIUM",
            affected_modules=["geopolitics", "migration", "security"],
        ))
    return alerts


def _detect_defense_mission_risk(
    events: list[GeoEvent], presence: list[SpanishPresence], seen: set[str]
) -> list[GeoAlert]:
    """Detecta riesgo en zonas con misiones militares españolas."""
    military_countries = {p.country_iso3 for p in presence if p.category == "military"}
    alerts = []
    for ev in events:
        if ev.country_iso3 not in military_countries:
            continue
        if ev.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(ev.country_iso3, "defense_mission_risk")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="defense_mission_risk",
            country_iso3=ev.country_iso3,
            title=f"Riesgo misión militar española en {ev.country}",
            description=f"Evento {ev.severity}: {ev.event_type}. Revisar seguridad personal.",
            severity=ev.severity,
            affected_modules=["defense", "geopolitics", "security"],
        ))
    return alerts


def _detect_diplomatic_crisis(
    events: list[GeoEvent], narratives: list[GeoNarrativeSignal], seen: set[str]
) -> list[GeoAlert]:
    """Detecta crisis diplomáticas relevantes para España."""
    DIPLOMATIC_KEYWORDS = {"diplomati", "embargo", "sancion", "expulsión", "embajad", "relaciones bilaterales"}
    alerts = []
    for sig in narratives:
        topic_lower = sig.topic.lower()
        if not any(kw in topic_lower for kw in DIPLOMATIC_KEYWORDS):
            continue
        if sig.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(sig.country_iso3, "diplomatic_crisis")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="diplomatic_crisis",
            country_iso3=sig.country_iso3,
            title=f"Crisis diplomática: {sig.topic}",
            description=sig.explanation or f"Narrativa diplomática de alta intensidad detectada.",
            severity="HIGH",
            affected_modules=["geopolitics", "diplomacy"],
        ))
    return alerts


def _detect_domestic_narrative_risk(
    narratives: list[GeoNarrativeSignal], seen: set[str]
) -> list[GeoAlert]:
    """Detecta narrativas con impacto político doméstico en España."""
    alerts = []
    for sig in narratives:
        if not sig.affected_modules:
            continue
        domestic_modules = {"party_politics", "public_opinion", "electoral"}
        if not set(sig.affected_modules) & domestic_modules:
            continue
        if sig.severity not in ("HIGH", "CRITICAL"):
            continue
        key = _dedup_key(sig.country_iso3, "domestic_political_impact")
        if key in seen:
            continue
        seen.add(key)
        alerts.append(GeoAlert(
            alert_id=_make_alert_id(),
            alert_type="domestic_political_impact",
            country_iso3=sig.country_iso3,
            title=f"Impacto político doméstico: {sig.topic}",
            description=sig.explanation or "Narrativa geopolítica con impacto en política doméstica española.",
            severity=sig.severity,
            affected_modules=list(set(sig.affected_modules) | {"geopolitics"}),
        ))
    return alerts


def _get_conn() -> Any:
    try:
        from db.database import get_db_connection
        return get_db_connection()
    except Exception:
        return None
