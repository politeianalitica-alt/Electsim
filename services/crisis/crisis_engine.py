"""Crisis Room engine: detection, escalation y playbooks.

Modo "war room when things go wrong" para situaciones de alto riesgo.
Almacenamiento en memoria (degradación elegante si no hay BD).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CrisisLevel(str, Enum):
    """Nivel de criticidad de una sala de crisis."""

    monitor = "monitor"
    elevated = "elevated"
    crisis = "crisis"
    severe_crisis = "severe_crisis"


class CrisisRoom(BaseModel):
    """Sala de crisis activa o cerrada."""

    model_config = ConfigDict(use_enum_values=False)

    id: str
    tenant_id: str
    workspace_id: str = "default"
    name: str
    level: CrisisLevel
    description: str
    opened_at: datetime
    opened_by: str
    closed_at: datetime | None = None
    participants: list[str] = Field(default_factory=list)
    key_facts: list[str] = Field(default_factory=list)
    decisions_made: list[dict[str, Any]] = Field(default_factory=list)
    pending_actions: list[dict[str, Any]] = Field(default_factory=list)
    media_references: list[dict[str, Any]] = Field(default_factory=list)
    recommended_messages: list[str] = Field(default_factory=list)
    risk_assessment: dict[str, Any] = Field(default_factory=dict)
    status: str = "active"


_CRISIS_ROOMS: dict[str, CrisisRoom] = {}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


def open_crisis_room(
    tenant_id: str,
    name: str,
    description: str,
    level: CrisisLevel,
    opened_by: str,
    workspace_id: str = "default",
) -> CrisisRoom:
    """Abre una sala de crisis nueva."""

    room = CrisisRoom(
        id=_gen_id(),
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        name=name,
        level=level,
        description=description,
        opened_at=_now(),
        opened_by=opened_by,
        participants=[opened_by],
        status="active",
    )
    _CRISIS_ROOMS[room.id] = room
    return room


def close_crisis_room(room_id: str, closed_by: str, summary: str) -> CrisisRoom:
    """Cierra una sala de crisis y guarda resumen final."""

    room = _CRISIS_ROOMS[room_id]
    room.closed_at = _now()
    room.status = "closed"
    room.decisions_made.append(
        {
            "title": "Cierre de sala",
            "decision": summary,
            "decided_by": closed_by,
            "rationale": "Cierre formal de la sala de crisis.",
            "at": _now().isoformat(),
        }
    )
    return room


def add_fact_to_crisis(room_id: str, fact: str, added_by: str) -> CrisisRoom:
    room = _CRISIS_ROOMS[room_id]
    timestamp = _now().strftime("%H:%M")
    room.key_facts.append(f"[{timestamp}] {added_by}: {fact}")
    return room


def add_participant(room_id: str, user_id: str) -> CrisisRoom:
    room = _CRISIS_ROOMS[room_id]
    if user_id not in room.participants:
        room.participants.append(user_id)
    return room


def record_crisis_decision(
    room_id: str,
    title: str,
    decision: str,
    decided_by: str,
    rationale: str,
) -> CrisisRoom:
    room = _CRISIS_ROOMS[room_id]
    room.decisions_made.append(
        {
            "title": title,
            "decision": decision,
            "decided_by": decided_by,
            "rationale": rationale,
            "at": _now().isoformat(),
        }
    )
    return room


def escalate_crisis(room_id: str, new_level: CrisisLevel, reason: str) -> CrisisRoom:
    room = _CRISIS_ROOMS[room_id]
    old_level = room.level
    room.level = new_level
    room.decisions_made.append(
        {
            "title": "Escalada de nivel",
            "decision": (
                f"Nivel pasa de {old_level.value if isinstance(old_level, CrisisLevel) else old_level} "
                f"a {new_level.value}"
            ),
            "decided_by": "system",
            "rationale": reason,
            "at": _now().isoformat(),
        }
    )
    return room


def list_active_crises(tenant_id: str) -> list[CrisisRoom]:
    return [
        r
        for r in _CRISIS_ROOMS.values()
        if r.tenant_id == tenant_id and r.status == "active"
    ]


def auto_detect_crisis(tenant_id: str) -> list[dict[str, Any]]:
    """Sugiere apertura de sala de crisis a partir de señales detectadas.

    Hace best-effort lookup en alert_engine / narrative_tracker / risk_scorer.
    Si no están disponibles, devuelve una lista vacía silenciosamente.
    """

    suggestions: list[dict[str, Any]] = []

    # Señal 1: alertas críticas activas
    try:
        from services.intelligence import alert_engine  # type: ignore

        if hasattr(alert_engine, "list_active_alerts"):
            alerts = alert_engine.list_active_alerts(tenant_id)  # type: ignore[attr-defined]
            critical = [a for a in alerts if getattr(a, "severity", "") in ("critical", "high")]
            if len(critical) >= 3:
                suggestions.append(
                    {
                        "trigger_type": "alert_cluster",
                        "severity": "high",
                        "evidence": [getattr(a, "title", str(a)) for a in critical[:5]],
                        "recommended_level": CrisisLevel.crisis.value,
                    }
                )
    except Exception:
        pass

    # Señal 2: narrativas hostiles trending
    try:
        from services.intelligence import narrative_tracker  # type: ignore

        if hasattr(narrative_tracker, "list_hostile_narratives"):
            hostile = narrative_tracker.list_hostile_narratives(tenant_id)  # type: ignore[attr-defined]
            if hostile and len(hostile) >= 2:
                suggestions.append(
                    {
                        "trigger_type": "narrative_attack",
                        "severity": "elevated",
                        "evidence": [getattr(n, "title", str(n)) for n in hostile[:3]],
                        "recommended_level": CrisisLevel.elevated.value,
                    }
                )
    except Exception:
        pass

    # Señal 3: pico de riesgo
    try:
        from services.intelligence import risk_scorer  # type: ignore

        if hasattr(risk_scorer, "current_risk_score"):
            score = risk_scorer.current_risk_score(tenant_id)  # type: ignore[attr-defined]
            if isinstance(score, (int, float)) and score >= 0.8:
                suggestions.append(
                    {
                        "trigger_type": "risk_spike",
                        "severity": "high",
                        "evidence": [f"Risk score actual: {score:.2f}"],
                        "recommended_level": CrisisLevel.severe_crisis.value,
                    }
                )
    except Exception:
        pass

    return suggestions


_PLAYBOOKS: dict[str, dict[str, Any]] = {
    "communicational_crisis": {
        "first_30min_actions": [
            "Convocar al portavoz y al jefe de comunicación.",
            "Congelar publicaciones programadas en redes sociales.",
            "Recopilar todos los hechos verificados en una sola nota.",
            "Definir un único portavoz autorizado.",
            "Preparar declaración inicial de 3 frases.",
        ],
        "key_messages": [
            "Reconocer la situación sin admitir culpabilidad indebida.",
            "Mostrar empatía hacia los afectados.",
            "Comprometer una próxima actualización en plazo concreto.",
        ],
        "do_not_say": [
            "Sin comentarios.",
            "No es nuestro problema.",
            "Especular sobre causas no confirmadas.",
        ],
        "escalation_triggers": [
            "Cobertura en medios nacionales en menos de 1 hora.",
            "Tendencia en redes sociales con sentimiento negativo > 70%.",
            "Implicación de instituciones públicas.",
        ],
        "debrief_questions": [
            "¿Detectamos la señal a tiempo?",
            "¿Funcionó la cadena de mando?",
            "¿Qué mensaje funcionó mejor y peor?",
        ],
    },
    "electoral_setback": {
        "first_30min_actions": [
            "Reunir comité electoral.",
            "Revisar datos por circunscripción.",
            "Preparar mensaje de reconocimiento al adversario si procede.",
            "Coordinar con candidatos provinciales.",
        ],
        "key_messages": [
            "Respetar la voluntad de la ciudadanía.",
            "Agradecer al equipo y a la militancia.",
            "Anunciar análisis interno y próximos pasos.",
        ],
        "do_not_say": [
            "Atribuir la derrota a fraude sin evidencia.",
            "Atacar a votantes propios.",
        ],
        "escalation_triggers": [
            "Pérdida superior al pronóstico en 5+ puntos.",
            "Movimientos internos de cuestionamiento del liderazgo.",
        ],
        "debrief_questions": [
            "¿Qué falló en el pronóstico interno?",
            "¿Dónde caímos más respecto a lo previsto?",
            "¿Qué hizo el adversario que no anticipamos?",
        ],
    },
    "internal_dissent": {
        "first_30min_actions": [
            "Identificar a los disidentes y sus demandas exactas.",
            "Bloquear filtraciones a medios.",
            "Organizar reunión privada con los implicados.",
        ],
        "key_messages": [
            "El partido escucha y dialoga internamente.",
            "Las diferencias se resuelven en los órganos competentes.",
        ],
        "do_not_say": [
            "Negar la existencia del conflicto.",
            "Descalificar públicamente a los disidentes.",
        ],
        "escalation_triggers": [
            "Filtraciones a prensa en menos de 24h.",
            "Anuncio público de baja del partido.",
        ],
        "debrief_questions": [
            "¿Qué señales internas ignoramos?",
            "¿Qué cauces de diálogo fallaron?",
        ],
    },
    "external_attack": {
        "first_30min_actions": [
            "Documentar el ataque (capturas, fuentes, alcance).",
            "Verificar la veracidad de las acusaciones.",
            "Preparar respuesta basada en hechos.",
            "Notificar al equipo legal.",
        ],
        "key_messages": [
            "Defensa clara y basada en hechos.",
            "Disposición a responder ante quien corresponda.",
        ],
        "do_not_say": [
            "Ataques personales al emisor sin evidencia.",
            "Negar lo que pueda ser fácilmente desmentido.",
        ],
        "escalation_triggers": [
            "Eco en grandes medios.",
            "Implicación judicial.",
        ],
        "debrief_questions": [
            "¿Quién originó el ataque y por qué?",
            "¿Cuánto tardamos en responder?",
        ],
    },
    "scandal": {
        "first_30min_actions": [
            "Activar comité de crisis con dirección, comunicación y legal.",
            "Aislar al implicado de funciones públicas si procede.",
            "Recopilar todos los hechos verificables.",
        ],
        "key_messages": [
            "Cero tolerancia con conductas inaceptables.",
            "Investigación interna inmediata.",
            "Cooperación con las autoridades competentes.",
        ],
        "do_not_say": [
            "Minimizar los hechos.",
            "Sugerir conspiración sin pruebas.",
        ],
        "escalation_triggers": [
            "Apertura de causa judicial.",
            "Aparición de nuevas víctimas o pruebas.",
        ],
        "debrief_questions": [
            "¿Existían señales previas?",
            "¿Funcionaron los protocolos internos?",
        ],
    },
    "leak": {
        "first_30min_actions": [
            "Identificar el alcance exacto de lo filtrado.",
            "Determinar si la filtración es auténtica o manipulada.",
            "Notificar a personas afectadas en el documento.",
            "Activar protocolo legal y forense.",
        ],
        "key_messages": [
            "Reconocer lo verificable, contextualizar lo malinterpretado.",
            "Compromiso con la transparencia dentro de la legalidad.",
        ],
        "do_not_say": [
            "Negar de forma categórica algo verificable.",
            "Atacar al filtrador antes de identificar el origen.",
        ],
        "escalation_triggers": [
            "Publicación en cabeceras nacionales.",
            "Aparición de más documentos en oleadas.",
        ],
        "debrief_questions": [
            "¿Cómo se produjo la filtración?",
            "¿Qué controles de información fallaron?",
        ],
    },
    "accident": {
        "first_30min_actions": [
            "Confirmar hechos con servicios de emergencia.",
            "Coordinar con responsables institucionales.",
            "Suspender comunicación promocional.",
        ],
        "key_messages": [
            "Solidaridad con afectados y familias.",
            "Reconocimiento al trabajo de los servicios de emergencia.",
        ],
        "do_not_say": [
            "Especular sobre causas o responsabilidades.",
            "Aprovechar políticamente la situación.",
        ],
        "escalation_triggers": [
            "Víctimas mortales.",
            "Implicación directa de la organización.",
        ],
        "debrief_questions": [
            "¿Respondimos con el tono adecuado?",
            "¿Coordinamos bien con instituciones?",
        ],
    },
}


def get_crisis_playbook(crisis_type: str) -> dict[str, Any]:
    """Devuelve el playbook para un tipo de crisis. Si no existe, devuelve uno vacío seguro."""

    return _PLAYBOOKS.get(
        crisis_type,
        {
            "first_30min_actions": [],
            "key_messages": [],
            "do_not_say": [],
            "escalation_triggers": [],
            "debrief_questions": [],
        },
    )
