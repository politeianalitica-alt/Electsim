"""Enriquecimiento NLP ligero para tracker de narrativas."""

from __future__ import annotations

import re
from typing import Any

POSITIVE_RE = re.compile(
    r"\b(acuerdo|mejora|avance|exito|logro|crece|sube|estable)\w*\b",
    re.IGNORECASE,
)
NEGATIVE_RE = re.compile(
    r"\b(crisis|cae|caida|escandalo|corrupcion|ataque|conflicto|fracaso|problema)\w*\b",
    re.IGNORECASE,
)

PARTIDOS_MAP = {
    "PP": ["pp", "partido popular", "feijoo", "feijóo"],
    "PSOE": ["psoe", "partido socialista", "pedro sanchez", "pedro sánchez"],
    "VOX": ["vox", "abascal", "santiago abascal"],
    "SUMAR": ["sumar", "yolanda diaz", "yolanda díaz"],
    "PODEMOS": ["podemos", "belarra"],
    "ERC": ["erc", "esquerra"],
    "JUNTS": ["junts", "puigdemont"],
    "PNV": ["pnv"],
    "BILDU": ["bildu", "eh bildu"],
}

PERSONAS = [
    "Pedro Sanchez",
    "Alberto Nunez Feijoo",
    "Santiago Abascal",
    "Yolanda Diaz",
    "Carles Puigdemont",
    "Gabriel Rufian",
]

TOPIC_MAP: dict[str, list[str]] = {
    "vivienda": ["vivienda", "alquiler", "hipoteca", "desahucio"],
    "economia": ["inflacion", "paro", "empleo", "pib", "deficit", "salario"],
    "seguridad": ["seguridad", "delito", "policia", "terrorismo"],
    "sanidad": ["sanidad", "hospital", "medico", "salud"],
    "educacion": ["educacion", "universidad", "colegio"],
    "migracion": ["inmigracion", "frontera", "migrantes", "refugiados"],
    "energia": ["energia", "gas", "electricidad", "nuclear", "renovable"],
}

TONO_ATAQUE_RE = re.compile(
    r"\b(critica|ataca|acusa|denuncia|señala|senala|arremete)\w*\b",
    re.IGNORECASE,
)
TONO_DEFENSA_RE = re.compile(
    r"\b(defiende|aclara|desmiente|responde|rechaza|niega)\w*\b",
    re.IGNORECASE,
)
TONO_PROPUESTA_RE = re.compile(
    r"\b(propone|anuncia|presenta|plantea|impulsa|apuesta)\w*\b",
    re.IGNORECASE,
)



def _score_sentiment(text: str) -> float:
    pos = len(POSITIVE_RE.findall(text))
    neg = len(NEGATIVE_RE.findall(text))
    total = pos + neg
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 3)



def _label_sentiment(score: float) -> str:
    if score > 0.15:
        return "POS"
    if score < -0.15:
        return "NEG"
    return "NEU"



def _infer_tono(text: str) -> str:
    ataque = len(TONO_ATAQUE_RE.findall(text))
    defensa = len(TONO_DEFENSA_RE.findall(text))
    propuesta = len(TONO_PROPUESTA_RE.findall(text))
    top = max(ataque, defensa, propuesta)
    if top == 0:
        return "neutro"
    if top == ataque:
        return "ataque"
    if top == defensa:
        return "defensa"
    return "propuesta"



def _extract_topics(text: str) -> list[str]:
    low = text.lower()
    topics = [
        topic
        for topic, kws in TOPIC_MAP.items()
        if any(kw in low for kw in kws)
    ]
    return topics



def _extract_entities(text: str) -> list[dict[str, Any]]:
    low = text.lower()
    tags: list[dict[str, Any]] = []

    for partido, kws in PARTIDOS_MAP.items():
        if any(kw in low for kw in kws):
            tags.append(
                {
                    "tipo_objeto": "partido",
                    "valor": partido,
                    "confianza": 0.9,
                }
            )

    for persona in PERSONAS:
        if persona.lower() in low:
            tags.append(
                {
                    "tipo_objeto": "persona",
                    "valor": persona,
                    "confianza": 0.8,
                }
            )

    for topic in _extract_topics(text):
        tags.append(
            {
                "tipo_objeto": "tema",
                "valor": topic,
                "confianza": 0.75,
            }
        )

    dedup: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for tag in tags:
        key = (str(tag["tipo_objeto"]), str(tag["valor"]).lower())
        if key in seen:
            continue
        seen.add(key)
        dedup.append(tag)
    return dedup



def enriquecer_registro(record: dict[str, Any]) -> dict[str, Any]:
    text = f"{record.get('titular', '')} {record.get('resumen', '')} {record.get('texto_completo', '')}".strip()
    score = _score_sentiment(text)
    label = _label_sentiment(score)
    tono = _infer_tono(text)
    topics = _extract_topics(text)
    tags = _extract_entities(text)

    partidos = sorted({t["valor"] for t in tags if t["tipo_objeto"] == "partido"})
    personas = sorted({t["valor"] for t in tags if t["tipo_objeto"] == "persona"})

    record["sentimiento_score"] = score
    record["sentimiento_label"] = label
    record["tono"] = tono
    record["categoria"] = topics[0] if topics else "general"
    record["categorias_json"] = topics
    record["partidos_mencionados"] = ", ".join(partidos)
    record["personas_mencionadas"] = ", ".join(personas)
    record["tags"] = tags
    record["procesado"] = True
    return record



def enriquecer_registros(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [enriquecer_registro(r) for r in records]
