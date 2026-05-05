"""Episodic memory — stores discrete events and observations."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta

from .schemas import MemoryEntry

_EPISODIC: dict[str, list[MemoryEntry]] = {}


def record_episode(
    tenant_id: str,
    title: str,
    content: str,
    entities: list[str] | None = None,
    tags: list[str] | None = None,
    importance: float = 0.5,
    user_id: str = "",
    workspace_id: str = "default",
    source_module: str = "",
) -> MemoryEntry:
    """Record a new episode in episodic memory."""

    now = datetime.utcnow()
    entry = MemoryEntry(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        workspace_id=workspace_id,
        user_id=user_id,
        entry_type="episodic",
        title=title,
        content=content,
        tags=tags or [],
        entities=entities or [],
        source_module=source_module,
        importance=max(0.0, min(1.0, importance)),
        created_at=now,
        accessed_at=now,
    )
    _EPISODIC.setdefault(tenant_id, []).append(entry)
    return entry


def recall_recent(tenant_id: str, limit: int = 10, days: int = 30) -> list[MemoryEntry]:
    """Recall the most recent episodes within the given window."""

    cutoff = datetime.utcnow() - timedelta(days=days)
    items = [e for e in _EPISODIC.get(tenant_id, []) if e.created_at >= cutoff]
    items.sort(key=lambda e: e.created_at, reverse=True)
    return items[:limit]


def recall_by_entity(tenant_id: str, entity: str, limit: int = 20) -> list[MemoryEntry]:
    """Recall episodes mentioning a specific entity."""

    needle = entity.lower()
    matches = []
    for entry in _EPISODIC.get(tenant_id, []):
        joined = " ".join(entry.entities).lower()
        if needle in joined or needle in entry.content.lower() or needle in entry.title.lower():
            matches.append(entry)
    matches.sort(key=lambda e: e.created_at, reverse=True)
    return matches[:limit]


def recall_by_tag(tenant_id: str, tag: str, limit: int = 20) -> list[MemoryEntry]:
    """Recall episodes by tag."""

    needle = tag.lower()
    matches = [
        e
        for e in _EPISODIC.get(tenant_id, [])
        if any(needle == t.lower() for t in e.tags)
    ]
    matches.sort(key=lambda e: e.created_at, reverse=True)
    return matches[:limit]


def recall_important(
    tenant_id: str, min_importance: float = 0.7, limit: int = 20
) -> list[MemoryEntry]:
    """Recall most important episodes."""

    matches = [e for e in _EPISODIC.get(tenant_id, []) if e.importance >= min_importance]
    matches.sort(key=lambda e: (e.importance, e.created_at), reverse=True)
    return matches[:limit]


def mark_accessed(memory_id: str) -> None:
    """Increment access count and update accessed_at."""

    for entries in _EPISODIC.values():
        for entry in entries:
            if entry.id == memory_id:
                entry.access_count += 1
                entry.accessed_at = datetime.utcnow()
                return


def count_episodes(tenant_id: str) -> int:
    """Count episodes for a tenant."""

    return len(_EPISODIC.get(tenant_id, []))


def prune_expired(tenant_id: str) -> int:
    """Remove expired episodes; returns count removed."""

    now = datetime.utcnow()
    entries = _EPISODIC.get(tenant_id, [])
    before = len(entries)
    _EPISODIC[tenant_id] = [
        e for e in entries if e.expires_at is None or e.expires_at > now
    ]
    return before - len(_EPISODIC[tenant_id])


def _seed_demo_episodes(tenant_id: str) -> None:
    """Seed 12 realistic Spanish political demo episodes."""

    seeds = [
        (
            "Sondeo CIS confirma caída del PSOE",
            "El barómetro del CIS muestra al PSOE perdiendo 2.3 puntos respecto al mes anterior, situándose en el 27.1%.",
            ["PSOE", "CIS", "Pedro Sánchez"],
            ["sondeo", "demoscopia"],
            0.8,
        ),
        (
            "Negociación coalición PP-VOX en Galicia",
            "Reunión a puerta cerrada entre Alfonso Rueda y Santiago Abascal para explorar un pacto autonómico.",
            ["PP", "VOX", "Galicia", "Alfonso Rueda", "Santiago Abascal"],
            ["coalicion", "autonomico"],
            0.85,
        ),
        (
            "Crisis vivienda alcanza pico mediático",
            "El precio del alquiler en Madrid sube un 14% interanual y domina las portadas de los principales medios.",
            ["vivienda", "Madrid"],
            ["mediatico", "vivienda"],
            0.75,
        ),
        (
            "Yolanda Diaz presenta nuevo plan laboral",
            "Sumar propone reducción de jornada a 37.5 horas y subida del SMI vinculada al IPC.",
            ["Yolanda Diaz", "Sumar"],
            ["laboral", "smi"],
            0.7,
        ),
        (
            "Feijoo replica en sesión de control",
            "El líder de la oposición acusa al Gobierno de inacción en política fiscal durante el pleno del Congreso.",
            ["Feijoo", "PP", "Congreso"],
            ["sesion-control", "fiscal"],
            0.6,
        ),
        (
            "Cumbre europea sobre Ucrania",
            "Sánchez asiste a la cumbre extraordinaria del Consejo Europeo donde se debate ayuda militar adicional.",
            ["Pedro Sánchez", "UE", "Ucrania"],
            ["internacional", "ue"],
            0.7,
        ),
        (
            "ERC condiciona apoyo a presupuestos",
            "Republicans pide compromiso explícito sobre financiación singular antes de votar las cuentas.",
            ["ERC", "presupuestos"],
            ["legislativo", "cataluna"],
            0.8,
        ),
        (
            "Junts retira apoyo a decreto omnibus",
            "La formación de Puigdemont se descuelga del bloque de investidura en una votación clave.",
            ["Junts", "Carles Puigdemont"],
            ["legislativo", "ruptura"],
            0.9,
        ),
        (
            "Aumenta tensión en negociación PSOE-Junts",
            "Las conversaciones en Bruselas con Zapatero como mediador atraviesan momentos de máxima dificultad.",
            ["PSOE", "Junts", "Zapatero"],
            ["negociacion"],
            0.85,
        ),
        (
            "Congreso aprueba ley de amnistía",
            "Pleno aprueba en votación final la ley de amnistía con 178 votos a favor y 172 en contra.",
            ["Congreso", "amnistia"],
            ["legislativo", "hito"],
            0.95,
        ),
        (
            "Pedro Sánchez visita Bruselas",
            "Reunión bilateral con Ursula von der Leyen para tratar fondos Next Generation y agenda climática.",
            ["Pedro Sánchez", "Ursula von der Leyen", "UE"],
            ["internacional"],
            0.6,
        ),
        (
            "VOX rompe gobiernos autonómicos",
            "Abascal anuncia salida de cinco ejecutivos autonómicos en protesta por reparto de menores migrantes.",
            ["VOX", "Santiago Abascal"],
            ["ruptura", "autonomico"],
            0.85,
        ),
    ]
    base = datetime.utcnow()
    for i, (title, content, entities, tags, importance) in enumerate(seeds):
        entry = MemoryEntry(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            entry_type="episodic",
            title=title,
            content=content,
            tags=tags,
            entities=entities,
            importance=importance,
            created_at=base - timedelta(days=i),
            accessed_at=base - timedelta(days=i),
            source_module="seed",
        )
        _EPISODIC.setdefault(tenant_id, []).append(entry)
