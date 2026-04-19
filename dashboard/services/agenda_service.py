"""
Servicio de Agenda Institucional — lógica de dominio para agenda de decisores.
Normaliza, clasifica y puntúa eventos de agenda para la UI.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ── Taxonomía de tipos de acto ────────────────────────────────────────────────

EVENT_TYPE_COLORS = {
    "GOV_COUNCIL":           "#3B82F6",  # Consejo de Ministros
    "PLENARY_SESSION":       "#8B5CF6",  # Pleno
    "COMMISSION_SESSION":    "#6366F1",  # Comisión
    "PRESS_CONFERENCE":      "#06B6D4",  # Rueda de prensa
    "BILATERAL_MEETING":     "#F59E0B",  # Reunión bilateral
    "INTERNATIONAL_SUMMIT":  "#EC4899",  # Cumbre
    "PARTY_RALLY":           "#EF4444",  # Acto de partido
    "INSTITUTIONAL":         "#22D3EE",  # Acto institucional
    "SOCIAL_EVENT":          "#22C55E",  # Foro / evento social
    "OTHER":                 "#6B7280",
}

_TYPE_KEYWORDS: dict[str, list[str]] = {
    "GOV_COUNCIL":           ["consejo de ministros", "consejo de gobierno"],
    "PLENARY_SESSION":       ["pleno", "sesión plenaria", "sesion plenaria", "sesión de control"],
    "COMMISSION_SESSION":    ["comisión", "comision", "ponencia", "subcomisión"],
    "PRESS_CONFERENCE":      ["rueda de prensa", "conferencia de prensa", "comparecencia ante los medios"],
    "BILATERAL_MEETING":     ["reunión bilateral", "reunion bilateral", "despacho", "audiencia con", "reunión con el presidente", "visita de"],
    "INTERNATIONAL_SUMMIT":  ["cumbre", "summit", "reunión de la ue", "consejo europeo", "foro europeo", "visita oficial"],
    "PARTY_RALLY":           ["mitin", "acto del partido", "congreso del partido", "junta directiva", "ejecutiva del partido"],
    "SOCIAL_EVENT":          ["foro", "jornada", "conferencia", "congreso", "inauguración"],
}

# Jerarquía de actores (cuanto más alto, más relevante el evento)
ACTOR_HIERARCHY: dict[str, int] = {
    "pedro sánchez":           10,
    "presidente del gobierno": 10,
    "rey":                     9,
    "rey felipe":              9,
    "vicepresidenta":          8,
    "yolanda díaz":            8,
    "yolanda diaz":            8,
    "ministro":                7,
    "ministra":                7,
    "feijóo":                  7,
    "feijoo":                  7,
    "abascal":                 6,
    "portavoz":                5,
}

# Pesos por tipo de acto para importance_score
_TYPE_WEIGHTS: dict[str, int] = {
    "GOV_COUNCIL":          90,
    "INTERNATIONAL_SUMMIT": 85,
    "PLENARY_SESSION":      75,
    "COMMISSION_SESSION":   60,
    "BILATERAL_MEETING":    70,
    "PRESS_CONFERENCE":     55,
    "PARTY_RALLY":          40,
    "SOCIAL_EVENT":         35,
    "INSTITUTIONAL":        50,
    "OTHER":                30,
}


@dataclass
class AgendaEvent:
    title: str
    date: str
    time_start: str
    actor: str
    institution: str
    event_type: str
    topic: str
    location: str
    source: str
    source_url: str
    importance_score: int = 50
    certainty_score: float = 0.9
    description: str = ""
    color: str = "#6B7280"


# ── Funciones de clasificación ────────────────────────────────────────────────

def infer_event_type(title: str, description: str = "") -> str:
    """Clasifica el tipo de acto a partir del título."""
    t = f"{title} {description}".lower()
    for etype, kws in _TYPE_KEYWORDS.items():
        if any(k in t for k in kws):
            return etype
    return "OTHER"


def compute_importance(event_type: str, actor: str, institution: str = "") -> int:
    """
    Calcula importance_score (0–100) combinando tipo de acto y jerarquía del actor.
    """
    base = _TYPE_WEIGHTS.get(event_type, 30)
    actor_l = actor.lower()
    actor_bonus = max((v for k, v in ACTOR_HIERARCHY.items() if k in actor_l), default=3)
    # Normalizar: base 30-90, actor bonus 3-10, total max ~100
    score = min(100, base + actor_bonus * 1.5)
    return int(score)


def normalize_agenda_event(raw: dict) -> AgendaEvent:
    """Convierte un dict de agenda (de fetch_all_agendas o BD) a AgendaEvent."""
    title = str(raw.get("titulo") or raw.get("title") or "").strip()
    actor = str(raw.get("actor") or raw.get("main_actor") or raw.get("fuente") or "").strip()
    institution = str(raw.get("fuente") or raw.get("institution") or "").strip()
    etype = infer_event_type(title, str(raw.get("cita") or ""))

    return AgendaEvent(
        title=title,
        date=str(raw.get("fecha") or raw.get("date") or "")[:16],
        time_start=str(raw.get("hora") or raw.get("time_start") or "")[:5],
        actor=actor,
        institution=institution,
        event_type=etype,
        topic=str(raw.get("tema") or raw.get("topic") or ""),
        location=str(raw.get("lugar") or raw.get("location") or ""),
        source=institution or "agenda",
        source_url=str(raw.get("enlace") or raw.get("url") or ""),
        importance_score=compute_importance(etype, actor, institution),
        description=str(raw.get("cita") or raw.get("description") or "")[:400],
        color=EVENT_TYPE_COLORS.get(etype, EVENT_TYPE_COLORS["OTHER"]),
    )


def build_timeline_data(events: list[AgendaEvent]) -> list[dict]:
    """
    Prepara datos para el timeline de Plotly: list de dicts con
    x (fecha+hora), y (actor), color, hover.
    """
    rows = []
    for ev in sorted(events, key=lambda e: (e.date, e.time_start or "00:00")):
        rows.append({
            "x":          f"{ev.date} {ev.time_start}".strip(),
            "y":          ev.actor or ev.institution,
            "color":      ev.color,
            "importance": ev.importance_score,
            "tipo":       ev.event_type,
            "titulo":     ev.title,
            "lugar":      ev.location,
            "fuente":     ev.source,
            "url":        ev.source_url,
        })
    return rows


def sort_by_importance(events: list[AgendaEvent]) -> list[AgendaEvent]:
    return sorted(events, key=lambda e: e.importance_score, reverse=True)
