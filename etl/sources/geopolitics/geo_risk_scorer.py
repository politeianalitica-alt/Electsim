"""
Geo Risk Scorer — Bloque 14.

Calcula perfiles de riesgo país (CountryRiskProfile) combinando
eventos geopolíticos, señales narrativas y presencia española.

Umbrales configurables vía variables de entorno.
Nunca lanza excepciones — siempre try/except con retorno vacío o valor por defecto.
"""
from __future__ import annotations

import logging
import os
from collections import defaultdict
from datetime import date
from typing import Any

from etl.sources.geopolitics.schemas import (
    CountryRiskProfile,
    GeoEvent,
    GeoNarrativeSignal,
    SpanishPresence,
)

logger = logging.getLogger(__name__)

# ── Umbrales de riesgo (configurables por entorno) ─────────────────────────────

UMBRAL_CRITICO: float = float(os.getenv("GEOPOLITICO_UMBRAL_CRITICO", "71"))
UMBRAL_MUY_ALTO: float = float(os.getenv("GEOPOLITICO_UMBRAL_MUY_ALTO", "56"))
UMBRAL_ALTO: float = float(os.getenv("GEOPOLITICO_UMBRAL_ALTO", "41"))
UMBRAL_MODERADO: float = float(os.getenv("GEOPOLITICO_UMBRAL_MODERADO", "26"))

# ── Pesos del modelo de scoring ────────────────────────────────────────────────

WEIGHTS: dict[str, float] = {
    "conflict": 0.25,
    "fatality_trend": 0.15,
    "political_instability": 0.15,
    "energy": 0.10,
    "migration": 0.10,
    "spanish_exposure": 0.10,
    "media_tone": 0.10,
    "eu_nato_proximity": 0.05,
}

# ── Proximidad UE/OTAN por región geográfica (heurística) ─────────────────────

_EU_NATO_PROXIMITY: dict[str, float] = {
    # Europa: máxima
    "ESP": 95.0, "FRA": 95.0, "DEU": 95.0, "ITA": 95.0, "GBR": 90.0,
    "PRT": 95.0, "GRC": 90.0, "TUR": 75.0, "UKR": 70.0, "MDA": 55.0,
    "GEO": 50.0, "ARM": 45.0, "AZE": 40.0, "BLR": 20.0, "RUS": 10.0,
    # MENA: media-alta (por vecindad Mediterráneo)
    "MAR": 65.0, "DZA": 55.0, "TUN": 60.0, "LBY": 40.0, "EGY": 50.0,
    "ISR": 70.0, "PSE": 35.0, "LBN": 45.0, "JOR": 50.0, "SYR": 25.0,
    "IRQ": 30.0, "IRN": 15.0, "SAU": 40.0, "YEM": 20.0,
    # África subsahariana: baja-media
    "MLI": 35.0, "NER": 30.0, "NGA": 35.0, "TCD": 30.0, "BFA": 30.0,
    "SEN": 40.0, "GNB": 35.0, "MRT": 35.0, "AGO": 30.0, "MOZ": 25.0,
    "ETH": 25.0, "SOM": 20.0, "SDN": 20.0, "SSD": 15.0, "CAF": 20.0,
    "COD": 20.0, "CMR": 25.0,
    # América Latina: media
    "VEN": 35.0, "COL": 45.0, "MEX": 40.0, "BRA": 40.0, "ARG": 40.0,
    "CUB": 20.0, "HTI": 25.0, "PER": 40.0, "ECU": 40.0, "BOL": 35.0,
    # Asia: baja
    "AFG": 20.0, "PAK": 25.0, "MMR": 20.0, "CHN": 15.0, "IND": 30.0,
    "IDN": 25.0,
}

# Valor por defecto si no hay entrada
_DEFAULT_EU_NATO_PROXIMITY = 25.0


def compute_country_risk_profile(
    country_iso3: str,
    country_name: str,
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    presence: list[SpanishPresence],
    reference_date: date | None = None,
) -> CountryRiskProfile:
    """
    Calcula el perfil de riesgo completo para un país.

    Componentes (todos en escala 0-100):
    - conflict_risk: % eventos CRITICAL+HIGH del país.
    - political_risk: eventos de "political violence" o "riots".
    - energy_risk: presencia energética + narrativas de energía.
    - migration_risk: eventos "civilian" + narrativas de migración.
    - defense_risk: presencia militar + eventos de conflicto.
    - reputation_risk: tono narrativo negativo.
    - interest_for_spain: SPAIN_RELEVANCE del país.
    - interest_for_eu: proximidad geográfica/política UE.
    - interest_for_nato: similar, con énfasis defensa.
    - total_score: suma ponderada por WEIGHTS.

    Args:
        country_iso3: Código ISO3 del país.
        country_name: Nombre legible del país.
        events: Eventos geopolíticos del país (ya filtrados por ISO3).
        narratives: Señales narrativas del país.
        presence: Presencia española en el país.
        reference_date: Fecha de referencia para el perfil. None = hoy.

    Returns:
        CountryRiskProfile completo.
    """
    try:
        ref_date = reference_date or date.today()

        # ── 1. Conflict risk ──────────────────────────────────────────────────
        conflict_risk = _compute_conflict_risk(events)

        # ── 2. Political instability ──────────────────────────────────────────
        political_risk = _compute_political_risk(events)

        # ── 3. Energy risk ────────────────────────────────────────────────────
        energy_risk = _compute_energy_risk(presence, narratives)

        # ── 4. Migration risk ─────────────────────────────────────────────────
        migration_risk = _compute_migration_risk(events, narratives)

        # ── 5. Defense risk ───────────────────────────────────────────────────
        defense_risk = _compute_defense_risk(presence, events)

        # ── 6. Reputation risk (tono negativo en medios) ──────────────────────
        reputation_risk = _compute_reputation_risk(narratives)

        # ── 7. Interest for Spain ─────────────────────────────────────────────
        interest_for_spain = _compute_spain_interest(country_iso3)

        # ── 8. Interest for EU / NATO ─────────────────────────────────────────
        interest_for_eu = _compute_eu_interest(country_iso3)
        interest_for_nato = _compute_nato_interest(country_iso3, events)

        # ── 9. Fatality trend (últimos 15d vs anteriores) ─────────────────────
        fatality_trend_score = _compute_fatality_trend_score(events, ref_date)

        # ── 10. Total score ponderado ─────────────────────────────────────────
        # spanish_exposure: promedio presencia española
        spanish_exposure = _compute_spanish_exposure(presence)

        # media_tone: inverso de reputation_risk (para separar el concepto)
        media_tone_score = reputation_risk

        total_score = (
            conflict_risk * WEIGHTS["conflict"]
            + fatality_trend_score * WEIGHTS["fatality_trend"]
            + political_risk * WEIGHTS["political_instability"]
            + energy_risk * WEIGHTS["energy"]
            + migration_risk * WEIGHTS["migration"]
            + spanish_exposure * WEIGHTS["spanish_exposure"]
            + media_tone_score * WEIGHTS["media_tone"]
            + interest_for_eu * WEIGHTS["eu_nato_proximity"]
        )
        total_score = max(0.0, min(100.0, total_score))

        # ── 11. Trend ─────────────────────────────────────────────────────────
        trend = _compute_trend(events, ref_date)

        # ── 12. Explanation ───────────────────────────────────────────────────
        explanation = (
            f"Score {total_score:.0f}/100. "
            f"Conflicto: {conflict_risk:.0f}, "
            f"Energía: {energy_risk:.0f}, "
            f"Exposición España: {spanish_exposure:.0f}, "
            f"Migración: {migration_risk:.0f}, "
            f"Reputación: {reputation_risk:.0f}."
        )

        return CountryRiskProfile(
            country_iso3=country_iso3,
            country_name=country_name,
            date=ref_date,
            conflict_risk=conflict_risk,
            political_risk=political_risk,
            economic_risk=0.0,  # no calculado en este scorer (requiere datos económicos)
            energy_risk=energy_risk,
            migration_risk=migration_risk,
            defense_risk=defense_risk,
            reputation_risk=reputation_risk,
            total_score=total_score,
            trend=trend,
            interest_for_spain=interest_for_spain,
            interest_for_eu=interest_for_eu,
            interest_for_nato=interest_for_nato,
            explanation=explanation,
            raw_payload={
                "conflict_risk": conflict_risk,
                "political_risk": political_risk,
                "energy_risk": energy_risk,
                "migration_risk": migration_risk,
                "defense_risk": defense_risk,
                "reputation_risk": reputation_risk,
                "spanish_exposure": spanish_exposure,
                "fatality_trend_score": fatality_trend_score,
                "n_events": len(events),
                "n_narratives": len(narratives),
                "n_presence": len(presence),
            },
        )

    except Exception as exc:
        logger.warning("compute_country_risk_profile error (%s): %s", country_iso3, exc)
        return CountryRiskProfile(
            country_iso3=country_iso3,
            country_name=country_name,
            date=reference_date or date.today(),
            explanation=f"Error calculando perfil: {exc}",
        )


def get_severity_label(score: float) -> str:
    """
    Convierte un score numérico (0-100) en etiqueta de severidad.

    Umbrales:
    - ≥ UMBRAL_CRITICO  → "CRÍTICO"
    - ≥ UMBRAL_MUY_ALTO → "MUY ALTO"
    - ≥ UMBRAL_ALTO     → "ALTO"
    - ≥ UMBRAL_MODERADO → "MODERADO"
    - resto             → "BAJO"

    Args:
        score: Puntuación numérica 0-100.

    Returns:
        Etiqueta en español.
    """
    try:
        if score >= UMBRAL_CRITICO:
            return "CRÍTICO"
        if score >= UMBRAL_MUY_ALTO:
            return "MUY ALTO"
        if score >= UMBRAL_ALTO:
            return "ALTO"
        if score >= UMBRAL_MODERADO:
            return "MODERADO"
        return "BAJO"
    except Exception:
        return "BAJO"


def score_all_countries(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
    presence: list[SpanishPresence],
) -> list[CountryRiskProfile]:
    """
    Calcula perfiles de riesgo para todos los países presentes en los eventos.

    Agrupa eventos por country_iso3, llama a compute_country_risk_profile
    para cada grupo y devuelve la lista ordenada por total_score desc.

    Args:
        events: Lista global de GeoEvent (todas las fuentes).
        narratives: Lista global de GeoNarrativeSignal.
        presence: Lista global de SpanishPresence.

    Returns:
        Lista de CountryRiskProfile ordenada por total_score descendente.
    """
    try:
        # Agrupar por ISO3
        events_by_country: dict[str, list[GeoEvent]] = defaultdict(list)
        names_by_country: dict[str, str] = {}

        for ev in events:
            iso3 = ev.country_iso3 or _guess_iso3_from_name(ev.country)
            if not iso3:
                continue
            events_by_country[iso3].append(ev)
            if iso3 not in names_by_country and ev.country:
                names_by_country[iso3] = ev.country

        # Añadir países de presencia española aunque no haya eventos
        for pres in presence:
            iso3 = pres.country_iso3
            if iso3 and iso3 not in events_by_country:
                events_by_country[iso3] = []
                if iso3 not in names_by_country:
                    names_by_country[iso3] = pres.country_name

        if not events_by_country:
            logger.debug("score_all_countries: no hay países a puntuar")
            return []

        # Agrupar narratives y presence por ISO3
        narratives_by_country: dict[str, list[GeoNarrativeSignal]] = defaultdict(list)
        for narr in narratives:
            if narr.country_iso3:
                narratives_by_country[narr.country_iso3].append(narr)

        presence_by_country: dict[str, list[SpanishPresence]] = defaultdict(list)
        for pres in presence:
            if pres.country_iso3:
                presence_by_country[pres.country_iso3].append(pres)

        profiles: list[CountryRiskProfile] = []
        for iso3, country_events in events_by_country.items():
            country_name = names_by_country.get(iso3, iso3)
            profile = compute_country_risk_profile(
                country_iso3=iso3,
                country_name=country_name,
                events=country_events,
                narratives=narratives_by_country.get(iso3, []),
                presence=presence_by_country.get(iso3, []),
            )
            profiles.append(profile)

        profiles.sort(key=lambda p: p.total_score, reverse=True)
        logger.info("score_all_countries: %d perfiles calculados", len(profiles))
        return profiles

    except Exception as exc:
        logger.warning("score_all_countries error: %s", exc)
        return []


# ── Componentes de scoring ─────────────────────────────────────────────────────

def _compute_conflict_risk(events: list[GeoEvent]) -> float:
    """% eventos HIGH+CRITICAL respecto al total * 100."""
    try:
        if not events:
            return 0.0
        severe = sum(1 for ev in events if ev.severity in ("HIGH", "CRITICAL"))
        return min(100.0, (severe / len(events)) * 100.0)
    except Exception:
        return 0.0


def _compute_political_risk(events: list[GeoEvent]) -> float:
    """Riesgo basado en eventos de violencia política y disturbios."""
    try:
        if not events:
            return 0.0
        political_keywords = ("political violence", "riot", "protest", "civil unrest", "coup")
        political_events = [
            ev for ev in events
            if any(kw in ev.event_type.lower() for kw in political_keywords)
        ]
        if not political_events:
            return 0.0
        # Base: proporción de eventos políticos * 100, cap 80
        ratio_score = min(80.0, (len(political_events) / len(events)) * 100.0)
        # Bonus por severidad
        severe_political = sum(1 for ev in political_events if ev.severity in ("HIGH", "CRITICAL"))
        severity_bonus = min(20.0, severe_political * 5.0)
        return min(100.0, ratio_score + severity_bonus)
    except Exception:
        return 0.0


def _compute_energy_risk(
    presence: list[SpanishPresence],
    narratives: list[GeoNarrativeSignal],
) -> float:
    """Riesgo energético: presencia de actores energéticos + narrativas."""
    try:
        energy_presence = [p for p in presence if p.category == "energy"]
        energy_narratives = [n for n in narratives if n.topic == "energy"]

        presence_score = min(60.0, len(energy_presence) * 15.0)
        narrative_score = 0.0
        for narr in energy_narratives:
            if narr.severity == "HIGH":
                narrative_score += 25.0
            elif narr.severity == "MEDIUM":
                narrative_score += 12.0
            else:
                narrative_score += 5.0

        return min(100.0, presence_score + narrative_score)
    except Exception:
        return 0.0


def _compute_migration_risk(
    events: list[GeoEvent],
    narratives: list[GeoNarrativeSignal],
) -> float:
    """Riesgo migratorio: eventos 'civilian' + narrativas de migración."""
    try:
        civilian_events = [
            ev for ev in events
            if "civilian" in ev.event_type.lower()
        ]
        migration_narratives = [n for n in narratives if n.topic == "migration"]

        event_score = min(50.0, len(civilian_events) * 5.0)
        narrative_score = 0.0
        for narr in migration_narratives:
            if narr.severity == "HIGH":
                narrative_score += 30.0
            elif narr.severity == "MEDIUM":
                narrative_score += 15.0
            else:
                narrative_score += 5.0

        return min(100.0, event_score + narrative_score)
    except Exception:
        return 0.0


def _compute_defense_risk(
    presence: list[SpanishPresence],
    events: list[GeoEvent],
) -> float:
    """Riesgo de misiones de defensa: presencia militar + conflictos activos."""
    try:
        military_presence = [p for p in presence if p.category == "military"]
        conflict_events = [
            ev for ev in events
            if ev.severity in ("HIGH", "CRITICAL")
        ]
        military_score = min(50.0, len(military_presence) * 20.0)
        conflict_score = min(50.0, len(conflict_events) * 3.0)
        return min(100.0, military_score + conflict_score)
    except Exception:
        return 0.0


def _compute_reputation_risk(narratives: list[GeoNarrativeSignal]) -> float:
    """
    Riesgo reputacional: cuanto más negativo el tono, mayor el riesgo.
    avg_tone GDELT: valores negativos = cobertura negativa.
    """
    try:
        tones = [n.avg_tone for n in narratives if n.avg_tone is not None]
        if not tones:
            # Sin datos de tono, penalización moderada por falta de info
            return 30.0
        avg = sum(tones) / len(tones)
        # avg_tone típico en GDELT: -10 a +10; convertimos a 0-100 (más neg = más riesgo)
        # tone -10 → 100, tone 0 → 50, tone +10 → 0
        risk = max(0.0, min(100.0, ((-avg + 10) / 20.0) * 100.0))
        return risk
    except Exception:
        return 30.0


def _compute_spain_interest(country_iso3: str) -> float:
    """Interest for Spain en escala 0-100 desde SPAIN_RELEVANCE."""
    try:
        from etl.sources.geopolitics.acled_client import SPAIN_RELEVANCE
        return SPAIN_RELEVANCE.get(country_iso3, 0.3) * 100.0
    except Exception:
        return 30.0


def _compute_eu_interest(country_iso3: str) -> float:
    """Interest for EU: proximidad geográfica/política a la UE."""
    try:
        return _EU_NATO_PROXIMITY.get(country_iso3, _DEFAULT_EU_NATO_PROXIMITY)
    except Exception:
        return _DEFAULT_EU_NATO_PROXIMITY


def _compute_nato_interest(country_iso3: str, events: list[GeoEvent]) -> float:
    """
    Interest for NATO: proximidad + factor defensa.
    Países con operaciones OTAN activas o amenazas directas suman extra.
    """
    try:
        base = _EU_NATO_PROXIMITY.get(country_iso3, _DEFAULT_EU_NATO_PROXIMITY)
        defense_events = [
            ev for ev in events
            if any(kw in ev.event_type.lower() for kw in ("battle", "armed", "military"))
        ]
        defense_bonus = min(20.0, len(defense_events) * 2.0)
        return min(100.0, base + defense_bonus)
    except Exception:
        return _DEFAULT_EU_NATO_PROXIMITY


def _compute_spanish_exposure(presence: list[SpanishPresence]) -> float:
    """Exposición española basada en número y relevancia de presencias."""
    try:
        if not presence:
            return 0.0
        total_relevance = sum(p.relevance_score for p in presence)
        # Normalizar: 10 presencias con relevancia 1.0 cada una → 100
        return min(100.0, total_relevance * 10.0)
    except Exception:
        return 0.0


def _compute_fatality_trend_score(events: list[GeoEvent], ref_date: date) -> float:
    """
    Tendencia de víctimas: últimos 15 días vs 15-30 días anteriores.

    Retorna 0-100: 100 = crecimiento explosivo, 50 = estable, 0 = bajando.
    """
    try:
        from datetime import timedelta

        cutoff_recent = ref_date - timedelta(days=15)
        cutoff_old = ref_date - timedelta(days=30)

        recent_fat = sum(
            (ev.fatalities or 0) for ev in events
            if ev.event_date >= cutoff_recent
        )
        old_fat = sum(
            (ev.fatalities or 0) for ev in events
            if cutoff_old <= ev.event_date < cutoff_recent
        )

        if old_fat == 0 and recent_fat == 0:
            return 30.0
        if old_fat == 0:
            return min(100.0, 70.0 + recent_fat * 0.5)
        ratio = recent_fat / old_fat
        # ratio > 1.5 → alto; ratio < 0.5 → bajo
        if ratio >= 2.0:
            return 90.0
        if ratio >= 1.5:
            return 70.0
        if ratio >= 1.0:
            return 50.0
        if ratio >= 0.5:
            return 30.0
        return 10.0
    except Exception:
        return 30.0


def _compute_trend(
    events: list[GeoEvent],
    ref_date: date,
) -> str:
    """
    Calcula tendencia comparando eventos recientes vs anteriores.

    Returns "rising", "stable" o "falling".
    """
    try:
        from datetime import timedelta

        cutoff = ref_date - timedelta(days=15)
        recent = [ev for ev in events if ev.event_date >= cutoff]
        older = [ev for ev in events if ev.event_date < cutoff]

        recent_severe = sum(1 for ev in recent if ev.severity in ("HIGH", "CRITICAL"))
        older_severe = sum(1 for ev in older if ev.severity in ("HIGH", "CRITICAL"))

        if recent_severe > older_severe * 1.3:
            return "rising"
        if recent_severe < older_severe * 0.7:
            return "falling"
        return "stable"
    except Exception:
        return "stable"


def _guess_iso3_from_name(country_name: str) -> str | None:
    """Intenta mapear nombre de país a ISO3 usando geo_event_adapter."""
    try:
        from etl.sources.geopolitics.geo_event_adapter import map_country_to_iso3
        return map_country_to_iso3(country_name)
    except Exception:
        return None
