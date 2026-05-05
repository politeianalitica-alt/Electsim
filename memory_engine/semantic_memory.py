"""Semantic memory — stores facts and learned patterns."""

from __future__ import annotations

import uuid
from datetime import datetime

from .schemas import MemoryEntry

_SEMANTIC: dict[str, dict[str, MemoryEntry]] = {}


def learn_fact(
    tenant_id: str,
    fact_key: str,
    content: str,
    confidence: float = 1.0,
    entities: list[str] | None = None,
    source: str = "",
) -> MemoryEntry:
    """Learn a new fact (or update existing fact)."""

    now = datetime.utcnow()
    bucket = _SEMANTIC.setdefault(tenant_id, {})
    existing = bucket.get(fact_key)
    if existing is not None:
        existing.content = content
        existing.metadata["confidence"] = max(0.0, min(1.0, confidence))
        existing.entities = entities or existing.entities
        existing.accessed_at = now
        if source:
            existing.source_module = source
        return existing

    entry = MemoryEntry(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        entry_type="semantic",
        title=fact_key,
        content=content,
        entities=entities or [],
        source_module=source,
        importance=confidence,
        created_at=now,
        accessed_at=now,
        metadata={"fact_key": fact_key, "confidence": max(0.0, min(1.0, confidence))},
    )
    bucket[fact_key] = entry
    return entry


def recall_fact(tenant_id: str, fact_key: str) -> MemoryEntry | None:
    """Recall a single fact by key."""

    return _SEMANTIC.get(tenant_id, {}).get(fact_key)


def list_facts(tenant_id: str, prefix: str = "") -> list[MemoryEntry]:
    """List all facts; optionally filter by key prefix."""

    bucket = _SEMANTIC.get(tenant_id, {})
    items = [e for k, e in bucket.items() if k.startswith(prefix)]
    items.sort(key=lambda e: e.title)
    return items


def update_fact_confidence(tenant_id: str, fact_key: str, new_confidence: float) -> bool:
    """Update the confidence of a fact."""

    entry = recall_fact(tenant_id, fact_key)
    if entry is None:
        return False
    entry.metadata["confidence"] = max(0.0, min(1.0, new_confidence))
    entry.importance = entry.metadata["confidence"]
    return True


def forget_fact(tenant_id: str, fact_key: str) -> bool:
    """Remove a fact."""

    bucket = _SEMANTIC.get(tenant_id, {})
    if fact_key in bucket:
        del bucket[fact_key]
        return True
    return False


def _seed_demo_facts(tenant_id: str) -> None:
    """Seed 15 Spanish political facts."""

    facts = [
        ("gobierno.presidente", "Pedro Sánchez es el actual presidente del Gobierno de España.", ["Pedro Sánchez"]),
        ("congreso.mayoria_absoluta", "Las elecciones generales requieren mayoría absoluta de 176 escaños.", []),
        ("congreso.composicion", "El Congreso de los Diputados tiene 350 escaños distribuidos por circunscripciones provinciales.", []),
        ("senado.composicion", "El Senado tiene 265 senadores: 208 elegidos y 57 designados por las CCAA.", []),
        ("partidos.psoe", "PSOE: socialdemócrata, líder Pedro Sánchez, en el Gobierno desde 2018.", ["PSOE", "Pedro Sánchez"]),
        ("partidos.pp", "PP: centroderecha, líder Alberto Núñez Feijóo, principal partido de la oposición.", ["PP", "Feijoo"]),
        ("partidos.vox", "VOX: derecha radical, líder Santiago Abascal, fundado en 2013.", ["VOX", "Santiago Abascal"]),
        ("partidos.sumar", "Sumar: izquierda, líder Yolanda Díaz, socio de coalición del PSOE.", ["Sumar", "Yolanda Diaz"]),
        ("partidos.junts", "Junts per Catalunya: independentista, líder Carles Puigdemont.", ["Junts", "Puigdemont"]),
        ("partidos.erc", "Esquerra Republicana: independentista catalán de izquierdas.", ["ERC"]),
        ("electoral.dhondt", "El sistema electoral español usa la fórmula D'Hondt para repartir escaños.", []),
        ("ccaa.numero", "España tiene 17 comunidades autónomas y 2 ciudades autónomas (Ceuta y Melilla).", []),
        ("ue.miembro", "España es miembro de la Unión Europea desde 1986.", ["UE"]),
        ("euro.adopcion", "España adoptó el euro como moneda oficial el 1 de enero de 2002.", []),
        ("constitucion.fecha", "La Constitución española fue aprobada el 6 de diciembre de 1978.", []),
    ]
    for key, content, entities in facts:
        learn_fact(tenant_id, key, content, confidence=0.95, entities=entities, source="seed")
