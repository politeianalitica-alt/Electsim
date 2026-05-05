"""Pipeline de enriquecimiento de artículos/posts."""

from __future__ import annotations

import re
from typing import List

from etl.ingestion.normalization import normalize_text

_PARTY_KEYWORDS = {
    "PSOE",
    "PP",
    "VOX",
    "SUMAR",
    "PODEMOS",
    "ERC",
    "JUNTS",
    "PNV",
    "EH BILDU",
    "BNG",
    "CUP",
    "CIUDADANOS",
}

_INSTITUTIONS = {
    "Congreso",
    "Senado",
    "Moncloa",
    "Gobierno",
    "Tribunal Supremo",
    "Tribunal Constitucional",
    "Comisión Europea",
    "Parlamento Europeo",
    "INE",
    "Banco de España",
    "CIS",
}

_KNOWN_ACTORS = {
    "Pedro Sánchez",
    "Alberto Núñez Feijóo",
    "Santiago Abascal",
    "Yolanda Díaz",
    "Íñigo Errejón",
    "Gabriel Rufián",
    "Cuca Gamarra",
    "Patxi López",
}

_TOPIC_KEYWORDS = {
    "economia": ["economía", "ipc", "inflación", "paro", "empleo", "salario", "pib"],
    "sanidad": ["sanidad", "sanitario", "hospital", "médic", "atención primaria"],
    "vivienda": ["vivienda", "alquiler", "hipoteca", "okupa"],
    "educacion": ["educación", "lomloe", "universidad", "escuela"],
    "inmigracion": ["inmigración", "migrant", "frontera", "frontex"],
    "justicia": ["justicia", "tribunal", "fiscal", "amnistía"],
    "exterior": ["ucrania", "otan", "ue", "union europea", "bruselas"],
}

_POLITICAL_KEYWORDS = [
    "gobierno",
    "oposición",
    "congreso",
    "senado",
    "elecciones",
    "ley",
    "decreto",
    "moción",
    "presupuestos",
    "parlamento",
    "ministro",
    "ministerio",
    "diputado",
    "senador",
]

_POSITIVE = {"avance", "logro", "récord", "mejora", "acuerdo", "éxito", "histórico"}
_NEGATIVE = {
    "crisis",
    "fracaso",
    "escándalo",
    "polémica",
    "denuncia",
    "corrupción",
    "ruptura",
    "rechazo",
    "bloqueo",
}


def _detect_entities(text: str) -> list[str]:
    found: list[str] = []
    for actor in _KNOWN_ACTORS:
        if actor.lower() in text.lower():
            found.append(actor)
    for party in _PARTY_KEYWORDS:
        if re.search(rf"\b{re.escape(party)}\b", text):
            found.append(party)
    for inst in _INSTITUTIONS:
        if inst.lower() in text.lower():
            found.append(inst)
    seen: list[str] = []
    for e in found:
        if e not in seen:
            seen.append(e)
    return seen


def _detect_topics(text: str) -> list[str]:
    lower = text.lower()
    topics = []
    for topic, kws in _TOPIC_KEYWORDS.items():
        if any(kw in lower for kw in kws):
            topics.append(topic)
    return topics


def _sentiment_score(text: str) -> float:
    lower = text.lower()
    pos = sum(1 for w in _POSITIVE if w in lower)
    neg = sum(1 for w in _NEGATIVE if w in lower)
    if pos + neg == 0:
        return 0.0
    return round((pos - neg) / max(pos + neg, 1), 3)


def compute_political_relevance(text: str) -> float:
    """Score 0-1 basado en keywords políticas y entidades detectadas."""

    if not text:
        return 0.0
    lower = text.lower()
    kw_hits = sum(1 for kw in _POLITICAL_KEYWORDS if kw in lower)
    entity_hits = len(_detect_entities(text))
    score = min(1.0, (kw_hits * 0.08) + (entity_hits * 0.15))
    return round(score, 3)


def _quality_score(text: str) -> float:
    if not text:
        return 0.0
    length = len(text)
    if length < 80:
        return 0.2
    if length < 250:
        return 0.5
    if length < 800:
        return 0.75
    return 0.9


def _has_quantitative_claim(text: str) -> bool:
    return bool(re.search(r"\b\d+(?:[.,]\d+)?\s*(?:%|millon|mil millon|euros|€)", text, re.IGNORECASE))


def extract_quotes(text: str) -> List[dict]:
    """Extrae citas entre «...» o "..." con intento de atribución de hablante."""

    if not text:
        return []
    quotes: List[dict] = []
    patterns = [r"«([^»]+)»", r"\"([^\"]{8,})\""]
    for pat in patterns:
        for m in re.finditer(pat, text):
            quote = m.group(1).strip()
            if len(quote) < 8:
                continue
            tail = text[m.end() : m.end() + 80]
            speaker = None
            speaker_match = re.search(
                r",?\s*(?:según|asegur[óa]|afirm[óa]|señal[óa]|declar[óa]|dijo|expres[óa])\s+([A-ZÁÉÍÓÚÑ][\w\sÁÉÍÓÚÑáéíóúñ\.-]{2,40})",
                tail,
            )
            if speaker_match:
                speaker = speaker_match.group(1).strip().rstrip(".,")
            quotes.append({"quote": quote, "speaker": speaker})
    return quotes


def enrich_article(article: dict) -> dict:
    """Añade campos de enriquecimiento a un artículo."""

    out = dict(article)
    raw = (
        article.get("text")
        or article.get("content")
        or article.get("body")
        or article.get("summary")
        or article.get("title")
        or ""
    )
    cleaned = normalize_text(raw)
    out["cleaned_text"] = cleaned
    out["language"] = article.get("language") or "es"
    out["sentiment_score"] = _sentiment_score(cleaned)
    out["entities"] = _detect_entities(cleaned)
    out["topics"] = _detect_topics(cleaned)
    rel = compute_political_relevance(cleaned)
    out["political_relevance"] = rel
    out["is_political"] = rel >= 0.2 or bool(out["entities"])
    out["quality_score"] = _quality_score(cleaned)
    out["has_quantitative_claim"] = _has_quantitative_claim(cleaned)
    return out


def enrich_batch(articles: List[dict]) -> List[dict]:
    """Aplica enrich_article a una lista, con degradación por elemento."""

    out: List[dict] = []
    for art in articles:
        try:
            out.append(enrich_article(art))
        except Exception:
            out.append(art)
    return out


__all__ = [
    "enrich_article",
    "enrich_batch",
    "extract_quotes",
    "compute_political_relevance",
]
