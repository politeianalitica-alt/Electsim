"""
Wrapper NER para el pipeline event-driven.

Delega en TransformerMediatico.extraer_entidades() (que usa spaCy con fallback regex)
y convierte los resultados al modelo EntityAnnotation del pipeline.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


def extract_entities(text: str) -> list[dict]:
    """
    Extrae entidades del texto.

    Retorna lista de dicts con las claves:
        text, label, start, end, score
    """
    if not text or not text.strip():
        return []

    try:
        from etl.transformers.mediatico import TransformerMediatico
        entidades = TransformerMediatico.extraer_entidades(text)
        return [
            {
                "text": e.texto,
                "label": e.tipo,
                "start": e.inicio,
                "end": e.fin,
                "score": 1.0,
            }
            for e in entidades
        ]
    except Exception as exc:
        logger.warning("NER fallido: %s", exc)
        return _extract_entities_simple(text)


def _extract_entities_simple(text: str) -> list[dict]:
    """Heuristica minima si todo lo demas falla: busca palabras capitalizadas."""
    import re
    results = []
    # Nombres propios simples: palabras de >= 3 letras que empiezan por mayuscula
    # y no son inicio de frase
    pattern = re.compile(r'(?<=[.!?]\s)([A-Z][a-zá-ú]{2,}(?:\s[A-Z][a-zá-ú]{2,})?)|(?<=\s)([A-Z][a-zá-ú]{2,}(?:\s[A-Z][a-zá-ú]{2,})?)')
    for m in pattern.finditer(text):
        token = (m.group(1) or m.group(2) or "").strip()
        if token:
            results.append({
                "text": token,
                "label": "MISC",
                "start": m.start(),
                "end": m.end(),
                "score": 0.5,
            })
    return results[:20]  # limite razonable
