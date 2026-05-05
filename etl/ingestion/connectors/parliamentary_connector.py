"""Conector de datos parlamentarios (Congreso/Senado) en modo demo."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ParliamentaryInitiative(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    type: str  # proposicion_ley | iniciativa | pregunta
    submitter_party: str
    submitter_actor: str
    status: str
    submitted_at: datetime
    last_action: datetime
    summary: str = ""


_DEMO_INITIATIVES = [
    {
        "title": "Proposición de Ley para la mejora del sistema sanitario público",
        "type": "proposicion_ley",
        "submitter_party": "PSOE",
        "submitter_actor": "Patxi López",
        "status": "en_tramite",
        "summary": "Reforma del modelo de financiación sanitaria autonómica.",
    },
    {
        "title": "Pregunta oral al Gobierno sobre la subida del IPC",
        "type": "pregunta",
        "submitter_party": "PP",
        "submitter_actor": "Cuca Gamarra",
        "status": "respondida",
        "summary": "Solicita explicaciones sobre la inflación y su impacto en familias.",
    },
    {
        "title": "Iniciativa para proteger fronteras y reforzar Frontex",
        "type": "iniciativa",
        "submitter_party": "VOX",
        "submitter_actor": "Iván Espinosa de los Monteros",
        "status": "rechazada",
        "summary": "Refuerzo de medios fronterizos en Ceuta y Melilla.",
    },
    {
        "title": "Proposición de Ley para garantía de vivienda asequible",
        "type": "proposicion_ley",
        "submitter_party": "SUMAR",
        "submitter_actor": "Yolanda Díaz",
        "status": "en_tramite",
        "summary": "Crea un parque público de vivienda y limita precios.",
    },
    {
        "title": "Pregunta escrita sobre infraestructuras en Cataluña",
        "type": "pregunta",
        "submitter_party": "ERC",
        "submitter_actor": "Gabriel Rufián",
        "status": "pendiente",
        "summary": "Estado de los corredores ferroviarios mediterráneos.",
    },
]


def fetch_active_initiatives(limit: int = 30) -> List[ParliamentaryInitiative]:
    """Devuelve un set de iniciativas demo activas o recientes."""

    out: List[ParliamentaryInitiative] = []
    now = datetime.utcnow()
    for i in range(min(limit, 60)):
        base = _DEMO_INITIATIVES[i % len(_DEMO_INITIATIVES)]
        submitted = now - timedelta(days=2 + i)
        out.append(
            ParliamentaryInitiative(
                id=f"init_{i}",
                title=base["title"],
                type=base["type"],
                submitter_party=base["submitter_party"],
                submitter_actor=base["submitter_actor"],
                status=base["status"],
                submitted_at=submitted,
                last_action=submitted + timedelta(days=1),
                summary=base["summary"],
            )
        )
    return out


def fetch_voting_records(date: Optional[str] = None) -> list[dict]:
    """Devuelve registros de votación demo agregados por partido."""

    return [
        {
            "bill": "Proposición de Ley sanitaria",
            "date": date or datetime.utcnow().date().isoformat(),
            "results_by_party": {
                "PSOE": "a_favor",
                "PP": "en_contra",
                "VOX": "en_contra",
                "SUMAR": "a_favor",
                "ERC": "abstencion",
                "JUNTS": "abstencion",
            },
            "approved": True,
        },
        {
            "bill": "Reforma del IRPF",
            "date": date or datetime.utcnow().date().isoformat(),
            "results_by_party": {
                "PSOE": "a_favor",
                "PP": "en_contra",
                "VOX": "en_contra",
                "SUMAR": "a_favor",
                "ERC": "a_favor",
                "JUNTS": "en_contra",
            },
            "approved": True,
        },
    ]


def fetch_committee_calendar() -> list[dict]:
    """Devuelve la agenda de comisiones demo de la semana."""

    today = datetime.utcnow()
    out = []
    committees = [
        "Sanidad y Consumo",
        "Hacienda",
        "Interior",
        "Asuntos Exteriores",
        "Igualdad",
    ]
    for i, name in enumerate(committees):
        out.append(
            {
                "committee": name,
                "date": (today + timedelta(days=i)).date().isoformat(),
                "topic": f"Comparecencia sobre {name.lower()}",
                "attendees": ["Gobierno", "Grupos parlamentarios"],
            }
        )
    return out


__all__ = [
    "ParliamentaryInitiative",
    "fetch_active_initiatives",
    "fetch_voting_records",
    "fetch_committee_calendar",
]
