"""
Clasificacion de topicos IPTC para el pipeline event-driven.

Delega en TransformerMediatico.clasificar_iptc() cuando esta disponible,
con fallback a reglas de palabras clave.

Retorna lista de dicts {"label": str, "score": float}.
"""
from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def classify_topics(text: str, top_k: int = 3) -> list[dict]:
    """
    Clasifica el texto segun categorias IPTC.

    Retorna hasta `top_k` categorias con su score, ordenadas por score desc.
    Ej: [{"label": "politics", "score": 0.91}, {"label": "economy_business_finance", "score": 0.45}]
    """
    if not text or not text.strip():
        return []

    try:
        result = _classify_with_transformer(text, top_k)
        if result:
            return result
    except Exception as exc:
        logger.debug("IPTC transformer error: %s", exc)

    return _classify_with_rules(text, top_k)


def _classify_with_transformer(text: str, top_k: int) -> list[dict]:
    """Intenta usar el TransformerMediatico interno."""
    from etl.transformers.mediatico import _cargar_iptc_pipeline, IPTC_CATEGORIAS

    pipe = _cargar_iptc_pipeline()
    if pipe is None:
        return []

    res = pipe(text[:512])
    if not res:
        return []

    # El modelo devuelve lista de listas (top_k activado) o lista plana
    if isinstance(res[0], list):
        items = res[0]
    else:
        items = res

    results = []
    for item in items[:top_k]:
        label = item.get("label", "").lower().replace("-", "_").replace(" ", "_")
        # Normalizar al catalogo IPTC
        if label not in IPTC_CATEGORIAS:
            label = _match_iptc_label(label)
        score = float(item.get("score", 0.0))
        if label:
            results.append({"label": label, "score": round(score, 4)})

    return results


def _match_iptc_label(raw: str) -> str:
    """Intenta hacer match flexible al catalogo IPTC."""
    from etl.transformers.mediatico import IPTC_CATEGORIAS
    for cat in IPTC_CATEGORIAS:
        if cat.split("_")[0] in raw or raw in cat:
            return cat
    return ""


def _classify_with_rules(text: str, top_k: int) -> list[dict]:
    """Clasificacion por conteo de palabras clave del catalogo IPTC_REGLAS."""
    from etl.transformers.mediatico import IPTC_REGLAS

    text_lower = text.lower()
    scores: dict[str, float] = {}
    for category, keywords in IPTC_REGLAS.items():
        hits = sum(1 for kw in keywords if kw in text_lower)
        if hits > 0:
            # Score normalizado por numero de keywords de la categoria
            scores[category] = round(hits / len(keywords), 4)

    if not scores:
        return [{"label": "society", "score": 0.3}]

    sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [{"label": cat, "score": score} for cat, score in sorted_cats[:top_k]]
