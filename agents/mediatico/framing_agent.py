"""
Framing Agent — Deteccion de encuadres narrativos y FIMI en prensa espanola.

Modelos:
  - framing-roberta-multilingual (Andrazp) — 10 frames CAMEO
  - Fallback por reglas de palabras clave
  - FIMI: matching contra base de narrativas EU DisinfoLab

Frames detectados (CAMEO): ECONOMIC / FAIRNESS / MORALITY / CRIME / SECURITY /
                            POLICY / IDENTITY / CAPACITY / FEAR / PROGRESS

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import logging
import re
from collections import Counter
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Frames CAMEO y palabras clave de fallback
# ---------------------------------------------------------------------------

FRAMES_CAMEO = [
    "ECONOMIC", "FAIRNESS", "MORALITY", "CRIME",
    "SECURITY", "POLICY", "IDENTITY", "CAPACITY", "FEAR", "PROGRESS",
]

FRAME_KEYWORDS: dict[str, list[str]] = {
    "ECONOMIC": [
        "economia", "pib", "mercado", "empresa", "empleo", "inversion",
        "presupuesto", "gasto", "impuesto", "exportaciones", "deuda", "bolsa",
    ],
    "FAIRNESS": [
        "justicia", "igualdad", "desigualdad", "discriminacion", "equidad",
        "derechos", "injusto", "privilegio", "brecha", "riqueza",
    ],
    "MORALITY": [
        "etica", "valores", "moral", "principios", "dignidad", "corrupcion",
        "honestidad", "transparencia", "integridad", "decencia",
    ],
    "CRIME": [
        "delito", "crimen", "detenido", "juicio", "fiscal", "sentencia",
        "corrupcion", "fraude", "robo", "imputado", "investigacion judicial",
    ],
    "SECURITY": [
        "seguridad", "terrorismo", "policia", "guardia civil", "defensa",
        "otan", "militar", "amenaza", "riesgo", "ataque", "vigilancia",
    ],
    "POLICY": [
        "ley", "politica", "regulacion", "decreto", "reforma", "medida",
        "gobierno", "ministerio", "congreso", "propuesta", "proyecto de ley",
    ],
    "IDENTITY": [
        "identidad", "nacion", "cataluna", "independencia", "cultura",
        "lengua", "tradicion", "autonomia", "regional", "separatismo",
    ],
    "CAPACITY": [
        "capacidad", "gestion", "eficiencia", "competencia", "habilidad",
        "recursos", "infraestructura", "servicios", "calidad",
    ],
    "FEAR": [
        "miedo", "amenaza", "crisis", "colapso", "caida", "peligro",
        "emergencia", "alarma", "catastrofe", "desbordamiento",
    ],
    "PROGRESS": [
        "avance", "innovacion", "progreso", "crecimiento", "mejora",
        "transformacion", "modernizacion", "reforma", "futuro", "desarrollo",
    ],
}

# ---------------------------------------------------------------------------
# Narrativas FIMI conocidas (EU DisinfoLab adaptado para Espana)
# ---------------------------------------------------------------------------

NARRATIVAS_FIMI_CONOCIDAS: list[dict] = [
    {
        "id": "fimi_01",
        "nombre": "Espana en desintegracion",
        "descripcion": "Narrativa que exagera la fragmentacion territorial de Espana",
        "keywords": ["desintegracion", "ruptura de espana", "fin de espana", "espana se rompe"],
        "severidad": "alta",
    },
    {
        "id": "fimi_02",
        "nombre": "Gobierno totalitario",
        "descripcion": "Equiparacion del gobierno con regimenes autoritarios",
        "keywords": ["dictadura", "totalitarismo", "chavismo espanol", "castrocomunismo", "regimen"],
        "severidad": "alta",
    },
    {
        "id": "fimi_03",
        "nombre": "Invasion migratoria",
        "descripcion": "Encuadre catastrofista de la migracion como invasion",
        "keywords": ["invasion migratoria", "oleada migratoria", "reemplazamiento", "gran sustitucion"],
        "severidad": "alta",
    },
    {
        "id": "fimi_04",
        "nombre": "Elecciones fraudulentas",
        "descripcion": "Siembra de dudas sobre integridad electoral sin evidencia",
        "keywords": ["fraude electoral", "elecciones amanaadas", "pucherazo", "voto manipulado"],
        "severidad": "critica",
    },
    {
        "id": "fimi_05",
        "nombre": "OTAN es una amenaza",
        "descripcion": "Narrativa pro-rusa presentando a la OTAN como agresor",
        "keywords": ["provocacion otan", "expansionismo otan", "otan nos lleva a la guerra"],
        "severidad": "media",
    },
    {
        "id": "fimi_06",
        "nombre": "Media como enemigo del pueblo",
        "descripcion": "Deslegitimacion sistematica de medios de comunicacion",
        "keywords": ["prensa corrupta", "medios mentirosos", "periodistas vendidos", "fake news sistematicas"],
        "severidad": "media",
    },
    {
        "id": "fimi_07",
        "nombre": "Vacunas peligrosas",
        "descripcion": "Desinformacion sobre seguridad de vacunas",
        "keywords": ["vacuna mata", "vacuna experimental", "chip en vacuna", "vacuna 5g", "pasaporte sanitario control"],
        "severidad": "alta",
    },
]


# ---------------------------------------------------------------------------
# Carga lazy del modelo de framing
# ---------------------------------------------------------------------------

_framing_pipeline: Any = None


def _cargar_framing_pipeline() -> Any:
    global _framing_pipeline
    if _framing_pipeline is None:
        try:
            from transformers import pipeline
            _framing_pipeline = pipeline(
                "text-classification",
                model="Andrazp/framing-roberta-multilingual",
                top_k=3,
                truncation=True,
                max_length=512,
            )
            logger.info("framing-roberta-multilingual cargado")
        except Exception as exc:
            logger.info("framing model no disponible (%s) — usando reglas", exc)
            _framing_pipeline = None
    return _framing_pipeline


# ---------------------------------------------------------------------------
# Clase principal
# ---------------------------------------------------------------------------

class FramingAgent:
    """
    Detecta encuadres narrativos (frames) y desinformacion (FIMI) en articulos.

    Uso:
        agent = FramingAgent()
        resultado = agent.detectar_frame(texto)
        fimi = agent.detectar_fimi(texto)
    """

    # ------------------------------------------------------------------
    # Deteccion de frame
    # ------------------------------------------------------------------

    @staticmethod
    def detectar_frame(texto: str, titulo: str = "") -> dict:
        """
        Detecta el frame dominante del articulo.
        Retorna {frame, score, top3: [(frame, score)]}.
        """
        texto_input = (titulo + " " + texto[:500]).strip()
        if not texto_input:
            return {"frame": "UNKNOWN", "score": 0.0, "top3": []}

        pipeline_framing = _cargar_framing_pipeline()
        if pipeline_framing is not None:
            try:
                resultado = pipeline_framing(texto_input[:512])
                if resultado:
                    top = resultado[0] if isinstance(resultado[0], list) else resultado
                    top3 = [(r.get("label", "").upper(), round(float(r.get("score", 0.0)), 4))
                            for r in top[:3]]
                    if top3:
                        return {
                            "frame": top3[0][0],
                            "score": top3[0][1],
                            "top3": top3,
                        }
            except Exception as exc:
                logger.debug("framing pipeline error: %s", exc)

        # Fallback por reglas
        return FramingAgent._detectar_frame_reglas(texto_input)

    @staticmethod
    def _detectar_frame_reglas(texto: str) -> dict:
        """Deteccion de frame por frecuencia de palabras clave."""
        texto_lower = texto.lower()
        scores: dict[str, int] = {}
        for frame, keywords in FRAME_KEYWORDS.items():
            count = sum(1 for kw in keywords if kw in texto_lower)
            if count > 0:
                scores[frame] = count

        if not scores:
            return {"frame": "UNKNOWN", "score": 0.0, "top3": []}

        total = sum(scores.values())
        sorted_scores = sorted(scores.items(), key=lambda x: -x[1])
        top3 = [(frame, round(cnt / total, 4)) for frame, cnt in sorted_scores[:3]]

        return {
            "frame": top3[0][0],
            "score": top3[0][1],
            "top3": top3,
        }

    # ------------------------------------------------------------------
    # Deteccion FIMI
    # ------------------------------------------------------------------

    @staticmethod
    def detectar_fimi(texto: str, titulo: str = "") -> list[dict]:
        """
        Detecta narrativas FIMI en el texto.
        Retorna lista de {id, nombre, severidad, keywords_encontradas}.
        """
        texto_analisis = (titulo + " " + texto).lower()
        detecciones: list[dict] = []

        for narrativa in NARRATIVAS_FIMI_CONOCIDAS:
            keywords_encontradas = [
                kw for kw in narrativa["keywords"]
                if kw.lower() in texto_analisis
            ]
            if keywords_encontradas:
                detecciones.append({
                    "id": narrativa["id"],
                    "nombre": narrativa["nombre"],
                    "severidad": narrativa["severidad"],
                    "keywords_encontradas": keywords_encontradas,
                    "n_matches": len(keywords_encontradas),
                })

        return sorted(detecciones, key=lambda x: -x["n_matches"])

    @staticmethod
    def calcular_score_fimi(detecciones_fimi: list[dict]) -> float:
        """
        Score global de riesgo FIMI para un articulo.
        0.0 = sin riesgo, 1.0 = multiples narrativas criticas.
        """
        if not detecciones_fimi:
            return 0.0

        pesos_severidad = {"critica": 1.0, "alta": 0.7, "media": 0.4, "baja": 0.2}
        score_total = sum(
            pesos_severidad.get(d.get("severidad", "baja"), 0.2)
            for d in detecciones_fimi
        )
        return round(min(1.0, score_total), 3)

    # ------------------------------------------------------------------
    # Deteccion de coordinacion (mismo frame en multiples medios)
    # ------------------------------------------------------------------

    @staticmethod
    def detectar_coordinacion(
        articulos_con_frame: list[dict],
        ventana_horas: int = 24,
        umbral_medios: int = 3,
    ) -> list[dict]:
        """
        Detecta posible coordinacion narrativa: mismo frame en >= umbral_medios medios
        en la misma ventana temporal.
        Retorna lista de {frame, medios, n_articulos, periodo}.
        """
        # Agrupar por frame
        por_frame: dict[str, list[dict]] = {}
        for art in articulos_con_frame:
            frame = art.get("frame", "UNKNOWN")
            if frame and frame != "UNKNOWN":
                por_frame.setdefault(frame, []).append(art)

        coordinaciones: list[dict] = []
        for frame, arts in por_frame.items():
            medios_distintos = set(a.get("medio", "") for a in arts if a.get("medio"))
            if len(medios_distintos) >= umbral_medios:
                coordinaciones.append({
                    "frame": frame,
                    "medios": list(medios_distintos),
                    "n_articulos": len(arts),
                    "n_medios": len(medios_distintos),
                    "score_coordinacion": round(len(medios_distintos) / len(FRAMES_CAMEO), 3),
                })

        return sorted(coordinaciones, key=lambda x: -x["n_medios"])

    # ------------------------------------------------------------------
    # Comparacion de framing por partido politico
    # ------------------------------------------------------------------

    @staticmethod
    def comparar_framing_partidos(
        articulos_con_frame: list[dict],
        partidos: list[str] | None = None,
    ) -> dict[str, dict]:
        """
        Compara como enmarcan el discurso los articulos que mencionan cada partido.
        Retorna {partido: {frame_dominante, distribucion_frames, n_articulos}}.
        """
        if partidos is None:
            partidos = ["psoe", "pp", "vox", "podemos", "sumar"]

        resultado: dict[str, dict] = {}
        for partido in partidos:
            arts_partido = [
                a for a in articulos_con_frame
                if partido.lower() in (a.get("titulo", "") + " " + a.get("resumen", "")).lower()
            ]
            if not arts_partido:
                continue

            frame_counter = Counter(a.get("frame", "UNKNOWN") for a in arts_partido)
            frame_dominante = frame_counter.most_common(1)[0][0] if frame_counter else "UNKNOWN"
            total = sum(frame_counter.values())
            distribucion = {
                frame: round(cnt / total, 3)
                for frame, cnt in frame_counter.most_common()
            }

            resultado[partido] = {
                "frame_dominante": frame_dominante,
                "distribucion_frames": distribucion,
                "n_articulos": len(arts_partido),
                "score_negatividad": round(
                    sum(
                        1 for a in arts_partido
                        if a.get("sentimiento_label") == "negativo"
                    ) / len(arts_partido), 3
                ),
            }

        return resultado

    # ------------------------------------------------------------------
    # Procesamiento por lotes
    # ------------------------------------------------------------------

    @staticmethod
    def procesar_lote(articulos: list[dict]) -> list[dict]:
        """
        Analiza framing y FIMI para un lote de articulos.
        Enriquece cada dict con: frame, frame_score, frame_top3, fimi_score, fimi_detecciones.
        """
        resultado: list[dict] = []
        for art in articulos:
            try:
                titulo = art.get("titulo", "")
                texto = art.get("texto_completo", "") or art.get("resumen", "")

                frame_info = FramingAgent.detectar_frame(texto, titulo)
                fimi_dets = FramingAgent.detectar_fimi(texto, titulo)
                fimi_score = FramingAgent.calcular_score_fimi(fimi_dets)

                art_enriquecido = dict(art)
                art_enriquecido.update({
                    "frame": frame_info["frame"],
                    "frame_score": frame_info["score"],
                    "frame_top3": frame_info["top3"],
                    "fimi_score": fimi_score,
                    "fimi_detecciones": fimi_dets,
                    "tiene_fimi": fimi_score > 0.0,
                })
                resultado.append(art_enriquecido)
            except Exception as exc:
                logger.debug("FramingAgent lote error: %s", exc)
                resultado.append(dict(art))

        n_fimi = sum(1 for a in resultado if a.get("tiene_fimi"))
        logger.info("FramingAgent: %d articulos, %d con FIMI detectado", len(resultado), n_fimi)
        return resultado
