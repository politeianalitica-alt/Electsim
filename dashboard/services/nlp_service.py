"""
NLP Service — Análisis de texto político en español.

Integra:
  - pysentimiento: sentiment, hate_speech, emotion, NER (transformers español)
  - YAKE: extracción de keywords sin entrenamiento (yake-master)
  - Detección de entidades políticas con spacy / regex fallback
  - Clasificación IPTC de temas de noticias

Todos los importes son opcionales (graceful degradation si no hay GPU o las
bibliotecas no están instaladas).
"""
from __future__ import annotations

import re
import sys
from functools import lru_cache
from pathlib import Path
from typing import Optional

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

# ─── Optional heavy imports ──────────────────────────────────────────────────

try:
    from pysentimiento import create_analyzer as _create_analyzer  # type: ignore
    _PYSENTIMIENTO_OK = True
except ImportError:
    _PYSENTIMIENTO_OK = False

try:
    import yake  # type: ignore
    _YAKE_OK = True
except ImportError:
    _YAKE_OK = False

try:
    import spacy  # type: ignore
    _SPACY_OK = True
except ImportError:
    _SPACY_OK = False

# ─── Party + entity patterns ─────────────────────────────────────────────────

_PARTY_PATTERNS: dict[str, list[str]] = {
    "PP":      ["partido popular", r"\bpp\b", "populares", "feijóo", "feijoo"],
    "PSOE":    ["psoe", "socialistas", "partido socialista", "pedro sánchez", "sánchez"],
    "VOX":     [r"\bvox\b", "abascal", "santiago abascal"],
    "SUMAR":   ["sumar", "yolanda díaz", "yolanda diaz"],
    "PODEMOS": ["podemos", "pablo iglesias", "irene montero"],
    "JUNTS":   ["junts", "puigdemont"],
    "ERC":     [r"\berc\b", "esquerra"],
    "PNV":     [r"\bpnv\b", "partido nacionalista vasco"],
    "EH Bildu":["bildu", "eh bildu"],
    "BNG":     [r"\bbng\b"],
}

_POLITICIAN_NAMES = {
    "Feijóo": "PP",
    "Feijoo": "PP",
    "Pedro Sánchez": "PSOE",
    "Sánchez": "PSOE",
    "Abascal": "VOX",
    "Yolanda Díaz": "SUMAR",
    "Pablo Iglesias": "PODEMOS",
    "Irene Montero": "PODEMOS",
    "Puigdemont": "JUNTS",
    "Aragonès": "ERC",
    "Ortuzar": "PNV",
    "Otegi": "EH Bildu",
}

_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "Economía": ["inflación", "pib", "desempleo", "paro", "salario", "pensiones", "presupuesto", "deuda", "impuestos"],
    "Sanidad": ["sanidad", "hospital", "médico", "medicamento", "salud", "covid", "pandemia", "snc"],
    "Vivienda": ["vivienda", "alquiler", "hipoteca", "piso", "casa", "habitación", "arrendamiento"],
    "Educación": ["educación", "universidad", "escuela", "colegio", "becas", "profesores"],
    "Seguridad": ["seguridad", "policía", "crimen", "delito", "terrorismo", "violencia"],
    "Migración": ["migración", "inmigrante", "refugiado", "fronteras", "asilo", "extranjero"],
    "Cataluña": ["cataluña", "catalán", "independencia", "independentismo", "1-o", "referéndum"],
    "Exterior": ["otan", "ue", "europa", "ucrania", "israel", "gaza", "trump"],
    "Clima": ["clima", "cambio climático", "co2", "energía", "renovable", "sequía"],
    "Corrupción": ["corrupción", "caso", "imputado", "juicio", "trama", "fraude"],
}

_EMOTION_LABELS_ES = {
    "joy": "Alegría",
    "sadness": "Tristeza",
    "anger": "Enfado",
    "fear": "Miedo",
    "surprise": "Sorpresa",
    "disgust": "Asco",
}

_SENTIMENT_COLORS = {
    "POS": "#10B981",
    "NEG": "#EF4444",
    "NEU": "#94A3B8",
    "positive": "#10B981",
    "negative": "#EF4444",
    "neutral": "#94A3B8",
}


# ─── Cached model loaders ────────────────────────────────────────────────────

@lru_cache(maxsize=4)
def _get_analyzer(task: str):
    """Carga y cachea un analizador de pysentimiento."""
    if not _PYSENTIMIENTO_OK:
        return None
    try:
        return _create_analyzer(task=task, lang="es")
    except Exception:
        return None


@lru_cache(maxsize=1)
def _get_yake_extractor(n: int = 2, top: int = 15):
    """Carga y cachea un extractor YAKE para español."""
    if not _YAKE_OK:
        return None
    try:
        return yake.KeywordExtractor(lan="es", n=n, top=top, dedupLim=0.7)
    except Exception:
        return None


@lru_cache(maxsize=1)
def _get_spacy_nlp():
    if not _SPACY_OK:
        return None
    for model in ("es_core_news_md", "es_core_news_sm", "xx_ent_wiki_sm"):
        try:
            return spacy.load(model)
        except Exception:
            continue
    return None


# ─── Public functions ────────────────────────────────────────────────────────

def analizar_sentimiento(text: str) -> dict:
    """
    Analiza el sentimiento de un texto en español.

    Returns
    -------
    {
      "label": "POS" | "NEG" | "NEU",
      "score": float,
      "probas": {"POS": float, "NEG": float, "NEU": float},
      "color": str,
      "emoji": str,
      "fuente": "pysentimiento" | "reglas"
    }
    """
    analyzer = _get_analyzer("sentiment")
    if analyzer is not None:
        try:
            result = analyzer.predict(text[:512])
            label = result.output
            probas = result.probas
            return {
                "label": label,
                "score": probas.get(label, 0.5),
                "probas": probas,
                "color": _SENTIMENT_COLORS.get(label, "#94A3B8"),
                "emoji": "😊" if label == "POS" else ("😠" if label == "NEG" else "😐"),
                "fuente": "pysentimiento",
            }
        except Exception:
            pass

    # Fallback: reglas simples
    text_lower = text.lower()
    pos_words = ["bien", "bueno", "excelente", "victoria", "logro", "apoyo", "progreso", "éxito"]
    neg_words = ["mal", "malo", "escándalo", "crisis", "fracaso", "corrupción", "caída", "problema"]
    pos_score = sum(1 for w in pos_words if w in text_lower)
    neg_score = sum(1 for w in neg_words if w in text_lower)
    if pos_score > neg_score:
        label = "POS"
    elif neg_score > pos_score:
        label = "NEG"
    else:
        label = "NEU"
    return {
        "label": label,
        "score": 0.5 + abs(pos_score - neg_score) * 0.1,
        "probas": {"POS": pos_score / max(pos_score + neg_score + 1, 1),
                   "NEG": neg_score / max(pos_score + neg_score + 1, 1),
                   "NEU": 0.3},
        "color": _SENTIMENT_COLORS[label],
        "emoji": "😊" if label == "POS" else ("😠" if label == "NEG" else "😐"),
        "fuente": "reglas",
    }


def analizar_emocion(text: str) -> dict:
    """
    Detecta emociones en texto político (joy, sadness, anger, fear, surprise, disgust).
    Returns {"dominant": str, "label_es": str, "probas": dict, "fuente": str}
    """
    analyzer = _get_analyzer("emotion")
    if analyzer is not None:
        try:
            result = analyzer.predict(text[:512])
            dominant = result.output
            return {
                "dominant": dominant,
                "label_es": _EMOTION_LABELS_ES.get(dominant, dominant),
                "probas": {_EMOTION_LABELS_ES.get(k, k): v for k, v in result.probas.items()},
                "fuente": "pysentimiento",
            }
        except Exception:
            pass
    return {"dominant": "neutral", "label_es": "Neutral", "probas": {}, "fuente": "fallback"}


def detectar_odio(text: str) -> dict:
    """
    Detecta discurso de odio / contenido agresivo.
    Returns {"label": str, "targeted": bool, "aggressive": bool, "score": float}
    """
    analyzer = _get_analyzer("hate_speech")
    if analyzer is not None:
        try:
            result = analyzer.predict(text[:512])
            output = result.output
            return {
                "label": output,
                "targeted": "targeted" in output.lower() if isinstance(output, str) else False,
                "aggressive": result.probas.get("aggressive", 0) > 0.5,
                "score": max(result.probas.values()) if result.probas else 0.0,
                "fuente": "pysentimiento",
            }
        except Exception:
            pass
    return {"label": "OK", "targeted": False, "aggressive": False, "score": 0.0, "fuente": "fallback"}


def extraer_keywords(text: str, n_keywords: int = 10) -> list[tuple[str, float]]:
    """
    Extrae keywords de un texto usando YAKE (sin necesidad de modelos).
    Returns [(keyword, score)] — menor score = más relevante en YAKE.
    """
    extractor = _get_yake_extractor(n=2, top=n_keywords)
    if extractor is not None:
        try:
            kws = extractor.extract_keywords(text)
            return [(kw, round(score, 4)) for kw, score in kws]
        except Exception:
            pass

    # Fallback: tf simple
    words = re.findall(r'\b[a-záéíóúüñ]{4,}\b', text.lower())
    stopwords = {"para", "como", "pero", "este", "esta", "esto", "que",
                 "los", "las", "por", "con", "del", "una", "sus", "más"}
    freq: dict[str, int] = {}
    for w in words:
        if w not in stopwords:
            freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    total = max(sum(freq.values()), 1)
    return [(w, round(1 - c / total, 4)) for w, c in sorted_words[:n_keywords]]


def detectar_partidos(texto: str) -> list[str]:
    """Detecta partidos mencionados en un texto (case-insensitive)."""
    texto_lower = texto.lower()
    encontrados = []
    for partido, patrones in _PARTY_PATTERNS.items():
        for patron in patrones:
            if re.search(patron, texto_lower, re.IGNORECASE):
                if partido not in encontrados:
                    encontrados.append(partido)
                break
    return encontrados


def detectar_politicos(texto: str) -> list[tuple[str, str]]:
    """Detecta nombres de políticos conocidos y su partido. Returns [(nombre, partido)]."""
    encontrados = []
    for nombre, partido in _POLITICIAN_NAMES.items():
        if nombre.lower() in texto.lower():
            encontrados.append((nombre, partido))
    return encontrados


def clasificar_tema(texto: str) -> tuple[str, float]:
    """
    Clasifica el tema principal de un texto político.
    Returns (tema, score_confianza).
    """
    texto_lower = texto.lower()
    scores: dict[str, int] = {}
    for tema, keywords in _TOPIC_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in texto_lower)
        if score > 0:
            scores[tema] = score
    if not scores:
        return ("General", 0.3)
    best = max(scores, key=lambda k: scores[k])
    conf = min(1.0, scores[best] / 3.0)
    return (best, round(conf, 2))


def analizar_batch(textos: list[str]) -> list[dict]:
    """
    Analiza una lista de textos: sentimiento + emoción + keywords + tema + partidos.
    Usa pysentimiento en batch si disponible.
    """
    resultados = []
    for texto in textos:
        sentimiento = analizar_sentimiento(texto)
        tema, conf = clasificar_tema(texto)
        partidos = detectar_partidos(texto)
        keywords = extraer_keywords(texto, n_keywords=5)
        resultados.append({
            "texto": texto[:200],
            "sentimiento": sentimiento["label"],
            "sentimiento_score": sentimiento["score"],
            "sentimiento_color": sentimiento["color"],
            "tema": tema,
            "tema_confianza": conf,
            "partidos": partidos,
            "keywords": [kw for kw, _ in keywords[:5]],
        })
    return resultados


def resumen_sentimiento_partidos(noticias: list[dict]) -> dict[str, dict]:
    """
    Calcula sentimiento medio por partido a partir de una lista de noticias
    (cada una con campo 'texto' y 'partidos').
    Returns {partido: {"positivo": float, "negativo": float, "neutral": float, "total": int}}
    """
    conteos: dict[str, dict] = {}
    for noticia in noticias:
        texto = noticia.get("texto", "") or noticia.get("titulo", "")
        partidos = noticia.get("partidos", []) or detectar_partidos(texto)
        if not partidos:
            continue
        sent = analizar_sentimiento(texto)
        label = sent["label"]
        for partido in partidos:
            if partido not in conteos:
                conteos[partido] = {"POS": 0, "NEG": 0, "NEU": 0, "total": 0}
            conteos[partido][label] = conteos[partido].get(label, 0) + 1
            conteos[partido]["total"] += 1

    result = {}
    for partido, c in conteos.items():
        total = max(c["total"], 1)
        result[partido] = {
            "positivo": round(c["POS"] / total * 100, 1),
            "negativo": round(c["NEG"] / total * 100, 1),
            "neutral": round(c["NEU"] / total * 100, 1),
            "total": c["total"],
        }
    return result


def disponible() -> dict[str, bool]:
    """Devuelve qué módulos NLP están disponibles."""
    return {
        "pysentimiento": _PYSENTIMIENTO_OK and _get_analyzer("sentiment") is not None,
        "yake": _YAKE_OK,
        "spacy": _SPACY_OK and _get_spacy_nlp() is not None,
    }
