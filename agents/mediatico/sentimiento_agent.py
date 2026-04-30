"""
Sentimiento Agent — Analisis de sentimiento sobre corpus de prensa espanola.

Modelos:
  - pysentimiento RoBERTuito: sentiment / hate_speech / emotion / irony en espanol
  - sentiment-elecciones: sentimiento dirigido hacia partidos politicos espanoles
  - Fallback VADER/TextBlob si pysentimiento no disponible

Umbral HATE_ALERTA: 15% articulos con hate_speech HIGH

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

HATE_ALERTA_THRESHOLD = 0.15    # Fraccion de articulos con hate HIGH que genera alerta
SENTIMIENTO_ELECCIONES_PARTIDOS = ["psoe", "pp", "vox", "podemos", "sumar", "cs"]

# Etiquetas canonicas de sentimiento
SENTIMIENTO_LABELS = {
    "POS": "positivo",
    "NEG": "negativo",
    "NEU": "neutral",
    "positivo": "positivo",
    "negativo": "negativo",
    "neutral": "neutral",
    "positive": "positivo",
    "negative": "negativo",
}


# ---------------------------------------------------------------------------
# Carga lazy de analyzers
# ---------------------------------------------------------------------------

_analyzers: dict[str, Any] = {}


def _cargar_analyzer(task: str) -> Any:
    """Carga un analyzer de pysentimiento de forma lazy."""
    if task in _analyzers:
        return _analyzers[task]

    try:
        from pysentimiento import create_analyzer
        analyzer = create_analyzer(task=task, lang="es")
        _analyzers[task] = analyzer
        logger.info("pysentimiento analyzer cargado: %s", task)
        return analyzer
    except ImportError:
        logger.info("pysentimiento no instalado — task %s desactivado", task)
        _analyzers[task] = None
        return None
    except Exception as exc:
        logger.warning("pysentimiento create_analyzer '%s': %s", task, exc)
        _analyzers[task] = None
        return None


def _cargar_analyzer_elecciones() -> Any:
    """Carga el modelo sentiment-elecciones si disponible."""
    task_key = "elecciones"
    if task_key in _analyzers:
        return _analyzers[task_key]

    try:
        from pysentimiento import create_analyzer
        # Modelo especializado en sentiment hacia partidos espanoles
        analyzer = create_analyzer(
            task="sentiment",
            lang="es",
            model_name="pysentimiento/bertweet-sentiment-elecciones",
        )
        _analyzers[task_key] = analyzer
        logger.info("pysentimiento sentiment-elecciones cargado")
        return analyzer
    except Exception as exc:
        logger.info("sentiment-elecciones no disponible (%s) — usando modelo base", exc)
        # Fallback al analyzer de sentiment estandar
        _analyzers[task_key] = _cargar_analyzer("sentiment")
        return _analyzers[task_key]


# ---------------------------------------------------------------------------
# Clase principal
# ---------------------------------------------------------------------------

class SentimientoAgent:
    """
    Analiza sentimiento, odio, emociones e ironia en corpus de prensa espanola.

    Uso:
        agent = SentimientoAgent()
        resultado = agent.analizar_articulo(texto)
        lote = agent.analizar_lote(textos)
    """

    # ------------------------------------------------------------------
    # Analisis individual
    # ------------------------------------------------------------------

    @staticmethod
    def analizar_sentimiento(texto: str) -> dict:
        """
        Analiza sentimiento general del texto.
        Retorna {label, score, probas}.
        """
        if not texto or len(texto.strip()) < 10:
            return {"label": "neutral", "score": 0.0, "probas": {}}

        analyzer = _cargar_analyzer("sentiment")
        if analyzer is not None:
            try:
                resultado = analyzer.predict(texto[:512])
                label = SENTIMIENTO_LABELS.get(resultado.output, resultado.output)
                return {
                    "label": label,
                    "score": float(max(resultado.probas.values()) if resultado.probas else 0.0),
                    "probas": {SENTIMIENTO_LABELS.get(k, k): round(float(v), 4)
                               for k, v in resultado.probas.items()},
                }
            except Exception as exc:
                logger.debug("pysentimiento sentiment error: %s", exc)

        # Fallback basico por palabras clave
        return SentimientoAgent._fallback_sentimiento(texto)

    @staticmethod
    def analizar_hate_speech(texto: str) -> dict:
        """
        Detecta discurso de odio en el texto.
        Retorna {label: "hateful"|"targeted"|"aggressive"|"none", score}.
        """
        if not texto or len(texto.strip()) < 10:
            return {"label": "none", "score": 0.0, "hateful": False}

        analyzer = _cargar_analyzer("hate_speech")
        if analyzer is not None:
            try:
                resultado = analyzer.predict(texto[:512])
                label = str(resultado.output).lower()
                score = float(max(resultado.probas.values()) if resultado.probas else 0.0)
                return {
                    "label": label,
                    "score": score,
                    "hateful": label in ("hateful", "targeted"),
                }
            except Exception as exc:
                logger.debug("pysentimiento hate_speech error: %s", exc)

        return {"label": "none", "score": 0.0, "hateful": False}

    @staticmethod
    def analizar_emocion(texto: str) -> dict:
        """
        Detecta la emocion dominante del texto.
        Retorna {label: "joy"|"sadness"|"anger"|"fear"|"disgust"|"surprise"|"others", score}.
        """
        if not texto or len(texto.strip()) < 10:
            return {"label": "others", "score": 0.0}

        analyzer = _cargar_analyzer("emotion")
        if analyzer is not None:
            try:
                resultado = analyzer.predict(texto[:512])
                return {
                    "label": str(resultado.output).lower(),
                    "score": float(max(resultado.probas.values()) if resultado.probas else 0.0),
                }
            except Exception as exc:
                logger.debug("pysentimiento emotion error: %s", exc)

        return {"label": "others", "score": 0.0}

    @staticmethod
    def analizar_ironia(texto: str) -> dict:
        """Detecta ironia/sarcasmo. Retorna {ironic: bool, score}."""
        if not texto or len(texto.strip()) < 10:
            return {"ironic": False, "score": 0.0}

        analyzer = _cargar_analyzer("irony")
        if analyzer is not None:
            try:
                resultado = analyzer.predict(texto[:512])
                label = str(resultado.output).lower()
                return {
                    "ironic": label == "ironic",
                    "score": float(max(resultado.probas.values()) if resultado.probas else 0.0),
                }
            except Exception as exc:
                logger.debug("pysentimiento irony error: %s", exc)

        return {"ironic": False, "score": 0.0}

    @staticmethod
    def analizar_sentimiento_elecciones(texto: str) -> dict:
        """
        Analiza sentimiento dirigido hacia partidos politicos espanoles.
        Retorna {partido: label} para cada partido mencionado.
        """
        if not texto:
            return {}

        analyzer = _cargar_analyzer_elecciones()
        if analyzer is None:
            return {}

        texto_lower = texto.lower()
        resultado_partidos: dict[str, str] = {}

        for partido in SENTIMIENTO_ELECCIONES_PARTIDOS:
            if partido not in texto_lower:
                continue
            # Extraer fragmento con contexto del partido
            idx = texto_lower.find(partido)
            inicio = max(0, idx - 100)
            fin = min(len(texto), idx + 200)
            fragmento = texto[inicio:fin]

            try:
                pred = analyzer.predict(fragmento)
                label = SENTIMIENTO_LABELS.get(pred.output, pred.output)
                resultado_partidos[partido] = label
            except Exception as exc:
                logger.debug("sentiment_elecciones %s: %s", partido, exc)

        return resultado_partidos

    # ------------------------------------------------------------------
    # Analisis completo de un articulo
    # ------------------------------------------------------------------

    @staticmethod
    def analizar_articulo(texto: str, titulo: str = "") -> dict:
        """
        Analisis completo de un articulo: sentimiento + hate + emocion + ironia.
        Retorna dict consolidado.
        """
        texto_analisis = (titulo + " " + texto).strip()[:1000]

        sentimiento = SentimientoAgent.analizar_sentimiento(texto_analisis)
        hate = SentimientoAgent.analizar_hate_speech(texto_analisis)
        emocion = SentimientoAgent.analizar_emocion(texto_analisis)
        ironia = SentimientoAgent.analizar_ironia(texto_analisis)

        return {
            "sentimiento_label": sentimiento["label"],
            "sentimiento_score": sentimiento["score"],
            "sentimiento_probas": sentimiento.get("probas", {}),
            "hate_label": hate["label"],
            "hate_score": hate["score"],
            "hateful": hate["hateful"],
            "emocion_label": emocion["label"],
            "emocion_score": emocion["score"],
            "ironica": ironia["ironic"],
            "ironia_score": ironia["score"],
        }

    # ------------------------------------------------------------------
    # Analisis por lotes
    # ------------------------------------------------------------------

    @staticmethod
    def analizar_lote(
        articulos: list[dict],
        max_texto: int = 1000,
    ) -> list[dict]:
        """
        Procesa un lote de articulos con analisis de sentimiento.
        Cada dict debe tener 'url_hash', 'titulo', 'texto_completo'/'resumen'.
        Retorna lista enriquecida con campos de sentimiento.
        """
        resultado: list[dict] = []
        for art in articulos:
            try:
                titulo = art.get("titulo", "")
                texto = art.get("texto_completo", "") or art.get("resumen", "")
                texto = texto[:max_texto]

                analisis = SentimientoAgent.analizar_articulo(texto, titulo)

                art_enriquecido = dict(art)
                art_enriquecido.update(analisis)
                resultado.append(art_enriquecido)
            except Exception as exc:
                logger.debug("SentimientoAgent lote error: %s", exc)
                resultado.append(dict(art))

        n_hateful = sum(1 for a in resultado if a.get("hateful"))
        if resultado:
            ratio_hate = n_hateful / len(resultado)
            if ratio_hate >= HATE_ALERTA_THRESHOLD:
                logger.warning(
                    "HATE_ALERTA: %.1f%% de articulos con hate_speech en lote de %d",
                    ratio_hate * 100, len(resultado),
                )

        logger.info("SentimientoAgent: %d articulos analizados", len(resultado))
        return resultado

    # ------------------------------------------------------------------
    # Metricas agregadas
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_tono_por_tema(
        articulos_analizados: list[dict],
        campo_tema: str = "categoria_iptc",
    ) -> dict[str, dict]:
        """
        Calcula metricas de sentimiento por tema/categoria.
        Retorna {tema: {n_articulos, pct_positivo, pct_negativo, pct_hateful, emocion_top}}.
        """
        grupos: dict[str, list[dict]] = {}
        for art in articulos_analizados:
            tema = str(art.get(campo_tema, "unknown"))
            grupos.setdefault(tema, []).append(art)

        resultado: dict[str, dict] = {}
        for tema, arts in grupos.items():
            n = len(arts)
            n_pos = sum(1 for a in arts if a.get("sentimiento_label") == "positivo")
            n_neg = sum(1 for a in arts if a.get("sentimiento_label") == "negativo")
            n_hate = sum(1 for a in arts if a.get("hateful"))

            # Emocion mas frecuente
            from collections import Counter
            emo_counter = Counter(a.get("emocion_label", "others") for a in arts)
            emocion_top = emo_counter.most_common(1)[0][0] if emo_counter else "others"

            resultado[tema] = {
                "n_articulos": n,
                "pct_positivo": round(n_pos / n, 3) if n else 0.0,
                "pct_negativo": round(n_neg / n, 3) if n else 0.0,
                "pct_hateful": round(n_hate / n, 3) if n else 0.0,
                "emocion_top": emocion_top,
                "alerta_hate": (n_hate / n) >= HATE_ALERTA_THRESHOLD if n else False,
            }

        return resultado

    @staticmethod
    def calcular_tono_por_medio(articulos_analizados: list[dict]) -> dict[str, dict]:
        """Calcula el tono medio por medio de comunicacion."""
        return SentimientoAgent.calcular_tono_por_tema(articulos_analizados, campo_tema="medio")

    @staticmethod
    def calcular_polarizacion(articulos_analizados: list[dict]) -> float:
        """
        Indice de polarizacion del corpus: promedio de |score_positivo - score_negativo|.
        Rango 0.0 (sin polarizacion) a 1.0 (maxima).
        """
        scores: list[float] = []
        for art in articulos_analizados:
            probas = art.get("sentimiento_probas", {})
            p_pos = float(probas.get("positivo", 0.0))
            p_neg = float(probas.get("negativo", 0.0))
            scores.append(abs(p_pos - p_neg))
        if not scores:
            return 0.0
        return round(sum(scores) / len(scores), 3)

    # ------------------------------------------------------------------
    # Fallback sin pysentimiento
    # ------------------------------------------------------------------

    @staticmethod
    def _fallback_sentimiento(texto: str) -> dict:
        """Sentimiento por polaridad de palabras clave cuando pysentimiento no esta disponible."""
        palabras_pos = [
            "bien", "bueno", "exito", "acuerdo", "avance", "mejora", "positivo",
            "crecimiento", "victoria", "logro", "apoyo", "confianza", "solucion",
        ]
        palabras_neg = [
            "mal", "malo", "crisis", "fracaso", "rechazo", "caida", "negativo",
            "deuda", "problema", "conflicto", "ataque", "corruption", "escandalo",
        ]
        texto_lower = texto.lower()
        score_pos = sum(1 for w in palabras_pos if w in texto_lower)
        score_neg = sum(1 for w in palabras_neg if w in texto_lower)

        if score_pos > score_neg * 1.2:
            label, score = "positivo", round(score_pos / (score_pos + score_neg + 1), 3)
        elif score_neg > score_pos * 1.2:
            label, score = "negativo", round(score_neg / (score_pos + score_neg + 1), 3)
        else:
            label, score = "neutral", 0.0

        return {
            "label": label,
            "score": score,
            "probas": {
                "positivo": round(score_pos / max(score_pos + score_neg, 1), 3),
                "negativo": round(score_neg / max(score_pos + score_neg, 1), 3),
                "neutral": round(1.0 - score, 3),
            },
        }
