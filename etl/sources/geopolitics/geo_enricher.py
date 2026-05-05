"""
Geo Enricher — Bloque 14.

Enriquece eventos geopolíticos y briefings con LLM (Ollama/Brain).
Fallback determinístico si LLM no disponible.

Nunca rompe — siempre devuelve el objeto enriquecido.
"""
from __future__ import annotations

import logging
from typing import Any

from etl.sources.geopolitics.schemas import GeoBriefing, GeoEvent

logger = logging.getLogger(__name__)


def enrich_event_with_llm(event: GeoEvent) -> GeoEvent:
    """
    Enriquece un GeoEvent con análisis LLM.

    Añade contexto explicativo al raw_payload["llm_analysis"].
    Si LLM no disponible, aplica enriquecimiento determinístico.
    """
    analysis = _try_ollama_event(event) or _deterministic_event_analysis(event)
    enriched_payload = dict(event.raw_payload)
    enriched_payload["llm_analysis"] = analysis
    return event.model_copy(update={"raw_payload": enriched_payload})


def enrich_briefing_with_llm(briefing: GeoBriefing) -> GeoBriefing:
    """
    Enriquece un GeoBriefing con análisis LLM.

    Mejora situacion, riesgos y recomendaciones usando LLM.
    Si LLM no disponible, aplica enriquecimiento determinístico.
    """
    llm_result = _try_ollama_briefing(briefing) or {}
    updates: dict[str, Any] = {}
    if llm_result.get("situacion"):
        updates["situacion"] = llm_result["situacion"]
    if llm_result.get("riesgos"):
        updates["riesgos"] = llm_result["riesgos"]
    if llm_result.get("recomendaciones"):
        updates["recomendaciones"] = llm_result["recomendaciones"]
    if not updates:
        return briefing
    return briefing.model_copy(update=updates)


def batch_enrich_events(events: list[GeoEvent], max_events: int = 20) -> list[GeoEvent]:
    """Enriquece hasta max_events eventos más críticos."""
    priority = sorted(
        events,
        key=lambda e: {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(e.severity, 0),
        reverse=True,
    )
    enriched = []
    for ev in priority[:max_events]:
        try:
            enriched.append(enrich_event_with_llm(ev))
        except Exception as exc:
            logger.debug("enrich_event error: %s", exc)
            enriched.append(ev)
    return enriched + priority[max_events:]


# ── Ollama ───────────────────────────────────────────────────────────────────

def _try_ollama_event(event: GeoEvent) -> dict[str, Any] | None:
    try:
        import requests
        prompt = (
            f"Analiza brevemente este evento geopolítico desde la perspectiva de España:\n"
            f"País: {event.country} | Tipo: {event.event_type} | "
            f"Severidad: {event.severity} | Actores: {event.actor_1} vs {event.actor_2}\n"
            f"Responde en JSON con: impacto_espana (str), riesgo_energetico (bool), "
            f"riesgo_migratorio (bool), riesgo_empresarial (bool), resumen (str, max 50 palabras)."
        )
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "politeia-brain:latest", "prompt": prompt, "stream": False, "format": "json"},
            timeout=15,
        )
        if resp.status_code == 200:
            import json
            data = resp.json()
            response_text = data.get("response", "{}")
            return json.loads(response_text)
    except Exception as exc:
        logger.debug("Ollama event enrichment unavailable: %s", exc)
    return None


def _try_ollama_briefing(briefing: GeoBriefing) -> dict[str, Any] | None:
    try:
        import requests
        events_text = "\n".join(f"- {e}" for e in briefing.eventos_clave[:5])
        prompt = (
            f"Genera un análisis geopolítico conciso para España sobre {briefing.titulo}.\n"
            f"Eventos clave:\n{events_text}\n"
            f"Responde en JSON con: situacion (str, max 100 palabras), "
            f"riesgos (list[str], max 3), recomendaciones (list[str], max 3)."
        )
        resp = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "politeia-brain:latest", "prompt": prompt, "stream": False, "format": "json"},
            timeout=20,
        )
        if resp.status_code == 200:
            import json
            data = resp.json()
            return json.loads(data.get("response", "{}"))
    except Exception as exc:
        logger.debug("Ollama briefing enrichment unavailable: %s", exc)
    return None


# ── Determinístico ────────────────────────────────────────────────────────────

_ENERGY_ISO3 = {"DZA", "NGA", "AGO", "SAU", "NOR", "RUS", "VEN", "LBY"}
_MIGRATION_ISO3 = {"MAR", "DZA", "LBY", "SEN", "MRT", "MLI", "NER", "GNB", "GMB", "SYR"}
_CORPORATE_ISO3 = {"BRA", "MEX", "ARG", "COL", "TUR", "MAR"}


def _deterministic_event_analysis(event: GeoEvent) -> dict[str, Any]:
    """Análisis determinístico cuando LLM no está disponible."""
    iso3 = event.country_iso3 or ""
    riesgo_energetico = iso3 in _ENERGY_ISO3
    riesgo_migratorio = iso3 in _MIGRATION_ISO3
    riesgo_empresarial = iso3 in _CORPORATE_ISO3

    impacts = []
    if riesgo_energetico:
        impacts.append("suministro energético")
    if riesgo_migratorio:
        impacts.append("flujos migratorios")
    if riesgo_empresarial:
        impacts.append("empresas españolas")

    impacto = (
        f"Evento {event.severity} en {event.country} con potencial impacto en: {', '.join(impacts)}."
        if impacts
        else f"Evento {event.severity} en {event.country} de relevancia geopolítica para España."
    )

    return {
        "impacto_espana": impacto,
        "riesgo_energetico": riesgo_energetico,
        "riesgo_migratorio": riesgo_migratorio,
        "riesgo_empresarial": riesgo_empresarial,
        "resumen": f"{event.event_type.title()} en {event.country} ({event.severity}).",
        "method": "deterministic",
    }
