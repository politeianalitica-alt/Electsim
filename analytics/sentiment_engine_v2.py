"""Sentiment Engine v2 — Análisis multilenguaje con foco en español político."""

from __future__ import annotations

import re
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SentimentScore(BaseModel):
    """Resultado de análisis de sentimiento."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(max_length=200)
    sentiment: float = Field(ge=-1.0, le=1.0)
    magnitude: float
    label: str
    emotions: dict[str, float]
    entities_mentioned: list[str]
    language: str


_POSITIVE_LEXICON_ES: set[str] = {
    "transparencia", "consenso", "acuerdo", "crecimiento", "progreso", "estabilidad",
    "prosperidad", "éxito", "logro", "victoria", "mejora", "avance", "innovación",
    "diálogo", "cooperación", "solidaridad", "democracia", "libertad", "justicia",
    "equidad", "inversión", "empleo", "creación", "fortaleza", "confianza",
    "esperanza", "optimismo", "bienestar", "recuperación", "expansión", "auge",
    "desarrollo", "competitividad", "modernización", "eficiencia", "calidad",
    "excelencia", "compromiso", "responsabilidad", "honestidad", "integridad",
    "renovación", "sostenibilidad", "inclusión", "igualdad", "respeto",
    "garantía", "protección", "ayuda", "apoyo", "beneficio", "ventaja",
    "favorable", "positivo", "exitoso", "histórico",
}

_NEGATIVE_LEXICON_ES: set[str] = {
    "corrupción", "crisis", "recesión", "polarización", "fracaso", "derrota",
    "escándalo", "denuncia", "irregularidad", "fraude", "mentira", "engaño",
    "decadencia", "deterioro", "caída", "colapso", "ruina", "desastre",
    "tragedia", "catástrofe", "amenaza", "peligro", "riesgo", "conflicto",
    "guerra", "violencia", "agresión", "ataque", "abuso", "represión",
    "censura", "injusticia", "desigualdad", "discriminación", "exclusión",
    "pobreza", "desempleo", "paro", "inflación", "deuda", "déficit",
    "preocupación", "miedo", "incertidumbre", "inestabilidad", "ruptura",
    "división", "enfrentamiento", "confrontación", "bloqueo", "parálisis",
    "ineficiencia", "desorden", "caos", "tensión", "alarma", "denunciar",
    "criticar", "rechazar", "oposición", "negativo", "preocupante", "grave",
    "urgente",
}

_EMOTION_KEYWORDS_ES: dict[str, set[str]] = {
    "anger": {
        "indignación", "ira", "furia", "rabia", "enfado", "cólera", "denunciar",
        "exigir", "rechazar", "intolerable", "inadmisible",
    },
    "fear": {
        "miedo", "temor", "pavor", "terror", "alarma", "amenaza", "peligro",
        "riesgo", "incertidumbre", "preocupación",
    },
    "joy": {
        "alegría", "felicidad", "satisfacción", "éxito", "victoria", "logro",
        "celebrar", "feliz", "contento", "orgullo",
    },
    "sadness": {
        "tristeza", "pena", "dolor", "lamentar", "luto", "pérdida", "decepción",
        "desánimo", "frustración", "abatimiento",
    },
    "surprise": {
        "sorpresa", "asombro", "inesperado", "sorprendente", "increíble",
        "imprevisto", "súbito", "repentino",
    },
    "disgust": {
        "repugnancia", "asco", "rechazo", "vergonzoso", "indecente", "indigno",
        "repudiar", "abominable",
    },
    "hope": {
        "esperanza", "optimismo", "confianza", "ilusión", "futuro", "fe",
        "creer", "expectativa",
    },
    "frustration": {
        "frustración", "decepción", "impotencia", "desilusión", "hartazgo",
        "cansancio", "agotamiento",
    },
}

_INTENSIFIERS: set[str] = {
    "muy", "extremadamente", "absolutamente", "totalmente", "completamente",
    "altamente", "sumamente", "demasiado", "bastante", "increíblemente",
    "tremendamente", "profundamente",
}

_NEGATORS: set[str] = {"no", "nunca", "jamás", "tampoco", "ni", "sin"}


_PARTIES = {"PP", "PSOE", "VOX", "SUMAR", "Podemos", "Cs", "ERC", "Junts", "Bildu", "PNV"}
_POLITICIANS = {
    "Sánchez", "Feijóo", "Abascal", "Yolanda Díaz", "Díaz", "Iglesias",
    "Belarra", "Rufián", "Otegi", "Ayuso", "Mañueco", "Page",
}
_INSTITUTIONS = {
    "Congreso", "Senado", "Moncloa", "La Zarzuela", "Zarzuela", "Tribunal Supremo",
    "Constitucional", "Banco de España", "INE", "AIReF", "CIS",
}


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]+", text)


def analyze_sentiment(text: str, language: str = "es") -> SentimentScore:
    """Análisis de sentimiento basado en reglas con manejo de negación."""

    if not text:
        return SentimentScore(
            text="",
            sentiment=0.0,
            magnitude=0.0,
            label="neutral",
            emotions={},
            entities_mentioned=[],
            language=language,
        )

    tokens = _tokenize(text)
    lower = [t.lower() for t in tokens]

    score = 0.0
    magnitude = 0.0

    for i, tok in enumerate(lower):
        polarity = 0.0
        if tok in _POSITIVE_LEXICON_ES:
            polarity = 1.0
        elif tok in _NEGATIVE_LEXICON_ES:
            polarity = -1.0
        if polarity == 0.0:
            continue
        # Intensificadores y negadores en ventana de 3 palabras previas
        weight = 1.0
        window = lower[max(0, i - 3) : i]
        if any(w in _NEGATORS for w in window):
            polarity = -polarity
        if any(w in _INTENSIFIERS for w in window):
            weight = 1.5
        score += polarity * weight
        magnitude += abs(polarity) * weight

    n = max(1, len(tokens))
    norm = score / max(1.0, magnitude) if magnitude > 0 else 0.0
    norm = max(-1.0, min(1.0, norm))
    mag_norm = min(1.0, magnitude / max(1.0, n / 5))

    if norm > 0.15:
        label = "positive"
    elif norm < -0.15:
        label = "negative"
    else:
        label = "neutral"

    return SentimentScore(
        text=text[:200],
        sentiment=round(norm, 4),
        magnitude=round(mag_norm, 4),
        label=label,
        emotions=detect_emotions(text),
        entities_mentioned=extract_political_entities(text),
        language=language,
    )


def analyze_batch(texts: list[str], language: str = "es") -> list[SentimentScore]:
    return [analyze_sentiment(t, language=language) for t in texts]


def detect_emotions(text: str) -> dict[str, float]:
    """Detecta emociones por keywords (intensidad 0-1)."""

    if not text:
        return {}
    lower_tokens = [t.lower() for t in _tokenize(text)]
    n = max(1, len(lower_tokens))
    emotions: dict[str, float] = {}
    for emotion, keywords in _EMOTION_KEYWORDS_ES.items():
        count = sum(1 for tok in lower_tokens if tok in keywords)
        if count == 0:
            continue
        intensity = min(1.0, count / max(1.0, n / 10))
        emotions[emotion] = round(intensity, 4)
    return emotions


def extract_political_entities(text: str) -> list[str]:
    """Extrae partidos, políticos e instituciones mencionados."""

    if not text:
        return []
    found: list[str] = []
    for party in _PARTIES:
        if re.search(rf"\b{re.escape(party)}\b", text):
            found.append(party)
    for pol in _POLITICIANS:
        if re.search(rf"\b{re.escape(pol)}\b", text):
            found.append(pol)
    for inst in _INSTITUTIONS:
        if re.search(rf"\b{re.escape(inst)}\b", text):
            found.append(inst)
    # Deduplicar manteniendo orden
    seen: set[str] = set()
    uniq: list[str] = []
    for f in found:
        if f not in seen:
            seen.add(f)
            uniq.append(f)
    return uniq


def compute_polarity_distribution(items: list[SentimentScore]) -> dict[str, Any]:
    """Distribución de polaridad."""

    if not items:
        return {
            "positive_pct": 0.0,
            "neutral_pct": 0.0,
            "negative_pct": 0.0,
            "average_sentiment": 0.0,
        }
    n = len(items)
    pos = sum(1 for s in items if s.label == "positive")
    neu = sum(1 for s in items if s.label == "neutral")
    neg = sum(1 for s in items if s.label == "negative")
    avg = sum(s.sentiment for s in items) / n
    return {
        "positive_pct": round(100 * pos / n, 2),
        "neutral_pct": round(100 * neu / n, 2),
        "negative_pct": round(100 * neg / n, 2),
        "average_sentiment": round(avg, 4),
    }
