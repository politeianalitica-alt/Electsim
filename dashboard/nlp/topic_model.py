"""Clasificación temática ligera para contenido político."""

from __future__ import annotations

import pandas as pd

TOPIC_MAP: dict[str, list[str]] = {
    "vivienda": ["vivienda", "alquiler", "hipoteca", "piso", "inmobiliaria", "vpo"],
    "economia": ["inflacion", "paro", "empleo", "pib", "deficit", "deuda", "salario", "pensiones"],
    "seguridad": ["terrorismo", "crimen", "delito", "policia", "guardia civil", "violencia"],
    "sanidad": ["sanidad", "hospital", "medico", "medica", "salud", "vacuna"],
    "educacion": ["educacion", "universidad", "colegio", "escuela", "beca", "profesor"],
    "corrupcion": ["corrupcion", "trama", "soborno", "malversacion", "cohecho", "comision"],
    "inmigracion": ["inmigracion", "migrante", "frontera", "refugiado", "patera", "mena"],
    "territorial": ["cataluna", "independencia", "proces", "autonomia", "federal", "territorial"],
    "energia": ["energia", "renovable", "nuclear", "electricidad", "luz", "gas"],
    "igualdad": ["feminismo", "igualdad", "lgtbi", "machismo", "violencia de genero"],
}


def clasificar_topicos(texto: str, umbral_matches: int = 1) -> list[str]:
    low = (texto or "").lower()
    if not low:
        return []
    return [
        topic
        for topic, kws in TOPIC_MAP.items()
        if sum(1 for kw in kws if kw in low) >= umbral_matches
    ]


def extract_topics(documents: list[str]) -> pd.DataFrame:
    """
    Compat legacy: resume frecuencias de tópicos en una colección de textos.
    """
    if not documents:
        return pd.DataFrame(columns=["topic", "count"])
    counts: dict[str, int] = {}
    for doc in documents:
        for topic in clasificar_topicos(doc):
            counts[topic] = counts.get(topic, 0) + 1
    if not counts:
        return pd.DataFrame(columns=["topic", "count"])
    rows = [{"topic": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]
    return pd.DataFrame(rows)
