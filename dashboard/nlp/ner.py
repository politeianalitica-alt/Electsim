"""NER político en español con fallback regex."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

PARTIDOS: dict[str, list[str]] = {
    "PP": ["pp", "partido popular", "feijoo", "genova"],
    "PSOE": ["psoe", "partido socialista", "pedro sanchez", "moncloa"],
    "VOX": ["vox", "abascal", "santiago abascal"],
    "SUMAR": ["sumar", "yolanda diaz"],
    "PODEMOS": ["podemos", "belarra", "ione belarra"],
    "JUNTS": ["junts", "puigdemont"],
    "ERC": ["erc", "esquerra", "junqueras"],
    "PNV": ["pnv", "partido nacionalista vasco"],
    "EH Bildu": ["eh bildu", "bildu", "otegi"],
    "CC": ["coalicion canaria", "coalición canaria"],
}

GRUPOS_SOCIALES = [
    "jovenes",
    "mayores",
    "trabajadores",
    "autonomos",
    "pensionistas",
    "mujeres",
    "inmigrantes",
    "clase media",
    "estudiantes",
    "funcionarios",
]

_USE_SPACY = False
_nlp = None
try:
    import spacy  # type: ignore

    _nlp = spacy.load("es_core_news_sm")
    _USE_SPACY = True
except Exception:
    logger.info("spaCy no disponible para NER; usando regex.")


def _extraer_regex(texto: str) -> list[dict[str, Any]]:
    low = (texto or "").lower()
    out: list[dict[str, Any]] = []

    for partido, kws in PARTIDOS.items():
        if any(kw in low for kw in kws):
            out.append({"tipo_objeto": "partido", "valor": partido, "confianza": 0.92})

    for grupo in GRUPOS_SOCIALES:
        if grupo in low:
            out.append({"tipo_objeto": "grupo_social", "valor": grupo, "confianza": 0.8})

    return out


def _extraer_spacy(texto: str) -> list[dict[str, Any]]:
    if not _USE_SPACY or _nlp is None:
        return []
    doc = _nlp(texto)
    out: list[dict[str, Any]] = []
    for ent in doc.ents:
        label = str(ent.label_)
        tipo: str | None = None
        if label == "PER":
            tipo = "persona"
        elif label in {"ORG", "MISC"}:
            tipo = "organizacion"
        elif label == "LOC":
            tipo = "lugar"
        if tipo:
            out.append({"tipo_objeto": tipo, "valor": ent.text.strip(), "confianza": 0.85})
    return out


def extraer_entidades(texto: str) -> list[dict[str, Any]]:
    """Devuelve entidades deduplicadas con esquema tags_contenido."""
    entities = _extraer_regex(texto) + _extraer_spacy(texto)
    dedup: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for e in entities:
        tipo = str(e.get("tipo_objeto", "")).strip()
        valor = str(e.get("valor", "")).strip()
        if not tipo or not valor:
            continue
        key = (tipo, valor.lower())
        if key in seen:
            continue
        seen.add(key)
        dedup.append(
            {
                "tipo_objeto": tipo,
                "valor": valor,
                "confianza": float(e.get("confianza", 1.0) or 1.0),
            }
        )
    return dedup

