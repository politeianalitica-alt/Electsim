"""
Transformer Mediatico — NER, clasificacion IPTC y scoring de sesgo mediático.

Procesamiento:
  1. NER con spaCy es_core_news_lg (PER, ORG, LOC, GPE)
  2. Clasificacion IPTC via XLM-RoBERTa (TajaKuzman/IPTC-Media-Topic-Classification)
     o fallback por reglas si el modelo no esta disponible
  3. Score de sesgo = credibilidad del medio + ajuste por tendencia politica

Sin emojis. Compatible con git amigos.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Categorias IPTC (17 temas principales)
# ---------------------------------------------------------------------------

IPTC_CATEGORIAS: list[str] = [
    "arts_culture_entertainment_media",
    "crime_law_justice",
    "disaster_accident_emergency",
    "economy_business_finance",
    "education",
    "environment",
    "health",
    "human_interest",
    "labour",
    "lifestyle_leisure",
    "politics",
    "religion_belief",
    "science_technology",
    "society",
    "sport",
    "conflict_war_peace",
    "weather",
]

# Reglas de fallback por palabras clave (cuando IPTC model no disponible)
IPTC_REGLAS: dict[str, list[str]] = {
    "politics": [
        "gobierno", "congreso", "partido", "elecciones", "psoe", "pp", "vox",
        "podemos", "sumar", "ciudadanos", "ministro", "presidente", "sanchez",
        "feijoo", "abascal", "diputado", "senado", "oposicion", "coalition",
    ],
    "economy_business_finance": [
        "pib", "inflacion", "bolsa", "ibex", "banco", "presupuesto", "deuda",
        "deficit", "empleo", "paro", "empresa", "inversion", "exportaciones",
        "erte", "autónomo", "hacienda", "tributario",
    ],
    "conflict_war_peace": [
        "guerra", "ucrania", "rusia", "otan", "ejercito", "militar", "armas",
        "ataque", "bomba", "misil", "conflicto", "paz", "ceasefire", "tropas",
    ],
    "crime_law_justice": [
        "tribunal", "juicio", "sentencia", "delito", "corrupcion", "detenido",
        "imputado", "fiscal", "juez", "policia", "guardia civil", "ley",
    ],
    "health": [
        "salud", "hospital", "medico", "enfermedad", "vacuna", "sanidad",
        "cancer", "covid", "pandemia", "farmaco", "tratamiento",
    ],
    "environment": [
        "clima", "calentamiento", "co2", "medioambiente", "renovables",
        "contaminacion", "sequía", "inundaciones", "biodiversidad",
    ],
    "science_technology": [
        "inteligencia artificial", "ia", "tecnologia", "investigacion",
        "innovacion", "startup", "digital", "ciberseguridad", "datos",
    ],
    "society": [
        "vivienda", "migracion", "inmigracion", "feminismo", "igualdad",
        "derechos", "educacion", "familia", "juventud", "desigualdad",
    ],
}


# ---------------------------------------------------------------------------
# Dataclasses de salida
# ---------------------------------------------------------------------------

@dataclass
class EntidadExtraida:
    texto: str
    tipo: str     # PER | ORG | LOC | GPE | MISC
    inicio: int
    fin: int


@dataclass
class ArticuloProcesado:
    url_hash: str
    titulo: str
    medio: str
    tendencia: str
    credibilidad: float
    fecha_pub: str
    texto_completo: str
    resumen: str
    entidades: list[EntidadExtraida] = field(default_factory=list)
    categoria_iptc: str = "unknown"
    score_iptc: float = 0.0
    score_sesgo: float = 0.0   # -1.0 (izq) a +1.0 (der)
    score_credibilidad: float = 0.0   # 0.0 - 1.0 ponderado


# ---------------------------------------------------------------------------
# Modelos lazy (cargados al primer uso)
# ---------------------------------------------------------------------------

_spacy_nlp: Any = None
_iptc_pipeline: Any = None

TENDENCIA_SCORE: dict[str, float] = {
    "izquierda":       -0.8,
    "centro_izquierda": -0.4,
    "centro":           0.0,
    "centro_derecha":   0.4,
    "derecha":          0.8,
    "economico":        0.1,  # Ligero sesgo pro-mercado
    "regional":         0.0,
}


def _cargar_spacy() -> Any:
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            _spacy_nlp = spacy.load("es_core_news_lg")
            logger.info("spaCy es_core_news_lg cargado")
        except (ImportError, OSError):
            try:
                import spacy
                _spacy_nlp = spacy.load("es_core_news_sm")
                logger.info("spaCy es_core_news_sm cargado (fallback)")
            except (ImportError, OSError):
                logger.warning("spaCy no disponible — NER desactivado")
                _spacy_nlp = None
    return _spacy_nlp


def _cargar_iptc_pipeline() -> Any:
    global _iptc_pipeline
    if _iptc_pipeline is None:
        try:
            from transformers import pipeline
            _iptc_pipeline = pipeline(
                "text-classification",
                model="TajaKuzman/IPTC-Media-Topic-Classification",
                top_k=1,
                truncation=True,
                max_length=512,
            )
            logger.info("IPTC XLM-RoBERTa cargado")
        except Exception as exc:
            logger.info("IPTC model no disponible (%s) — usando reglas de fallback", exc)
            _iptc_pipeline = None
    return _iptc_pipeline


# ---------------------------------------------------------------------------
# Clase principal
# ---------------------------------------------------------------------------

class TransformerMediatico:
    """
    Transforma ArticuloNormalizado en ArticuloProcesado con NER, IPTC y sesgo.
    """

    # ------------------------------------------------------------------
    # NER con spaCy
    # ------------------------------------------------------------------

    @staticmethod
    def extraer_entidades(texto: str) -> list[EntidadExtraida]:
        """
        Extrae entidades nombradas del texto usando spaCy.
        Retorna lista de EntidadExtraida con tipo normalizado.
        """
        if not texto:
            return []

        nlp = _cargar_spacy()
        if nlp is None:
            return TransformerMediatico._extraer_entidades_regex(texto)

        try:
            doc = nlp(texto[:10_000])  # Limite para rendimiento
            resultado: list[EntidadExtraida] = []
            for ent in doc.ents:
                tipo = ent.label_
                # Normalizar etiquetas de spaCy a esquema comun
                if tipo in ("PER", "PERSON"):
                    tipo = "PER"
                elif tipo in ("ORG", "ORGANIZATION"):
                    tipo = "ORG"
                elif tipo in ("LOC", "LOCATION"):
                    tipo = "LOC"
                elif tipo in ("GPE",):
                    tipo = "GPE"
                else:
                    tipo = "MISC"

                resultado.append(EntidadExtraida(
                    texto=ent.text.strip(),
                    tipo=tipo,
                    inicio=ent.start_char,
                    fin=ent.end_char,
                ))
            return resultado
        except Exception as exc:
            logger.debug("spaCy NER error: %s", exc)
            return []

    @staticmethod
    def _extraer_entidades_regex(texto: str) -> list[EntidadExtraida]:
        """Extraccion de entidades muy basica sin spaCy (nombres propios capitalizados)."""
        resultado: list[EntidadExtraida] = []
        for m in re.finditer(r"\b[A-ZÑÁÉÍÓÚ][a-záéíóúñ]+(?:\s+[A-ZÑÁÉÍÓÚ][a-záéíóúñ]+){0,3}\b", texto):
            texto_ent = m.group(0)
            if len(texto_ent) < 3:
                continue
            resultado.append(EntidadExtraida(
                texto=texto_ent,
                tipo="MISC",
                inicio=m.start(),
                fin=m.end(),
            ))
        return resultado[:50]   # Limite

    # ------------------------------------------------------------------
    # Clasificacion IPTC
    # ------------------------------------------------------------------

    @staticmethod
    def clasificar_iptc(titulo: str, texto: str = "") -> tuple[str, float]:
        """
        Clasifica el articulo en una categoria IPTC.
        Retorna (categoria, score_confianza).
        """
        texto_input = (titulo + " " + texto[:500]).strip()
        if not texto_input:
            return "unknown", 0.0

        pipeline_iptc = _cargar_iptc_pipeline()
        if pipeline_iptc is not None:
            try:
                resultado = pipeline_iptc(texto_input[:512])
                if resultado and resultado[0]:
                    top = resultado[0][0] if isinstance(resultado[0], list) else resultado[0]
                    return str(top.get("label", "unknown")).lower(), float(top.get("score", 0.0))
            except Exception as exc:
                logger.debug("IPTC pipeline error: %s", exc)

        # Fallback por reglas
        return TransformerMediatico._clasificar_iptc_reglas(texto_input)

    @staticmethod
    def _clasificar_iptc_reglas(texto: str) -> tuple[str, float]:
        """Clasificacion IPTC por frecuencia de palabras clave."""
        texto_lower = texto.lower()
        scores: dict[str, int] = {}
        for categoria, keywords in IPTC_REGLAS.items():
            count = sum(1 for kw in keywords if kw in texto_lower)
            if count > 0:
                scores[categoria] = count

        if not scores:
            return "unknown", 0.0

        mejor = max(scores, key=lambda k: scores[k])
        total = sum(scores.values())
        confianza = scores[mejor] / total if total > 0 else 0.0
        return mejor, round(confianza, 3)

    # ------------------------------------------------------------------
    # Score de sesgo
    # ------------------------------------------------------------------

    @staticmethod
    def calcular_score_sesgo(tendencia: str, credibilidad: float) -> tuple[float, float]:
        """
        Calcula (score_sesgo, score_credibilidad_ponderado).
        score_sesgo: -1.0 (izquierda) a +1.0 (derecha)
        """
        score_sesgo = TENDENCIA_SCORE.get(tendencia, 0.0)
        # Credibilidad ponderada: medios con alta credibilidad tienen menos sesgo efectivo
        score_cred = round(credibilidad, 3)
        return round(score_sesgo, 3), score_cred

    # ------------------------------------------------------------------
    # Procesamiento completo
    # ------------------------------------------------------------------

    @staticmethod
    def procesar_articulo(
        url_hash: str,
        titulo: str,
        medio: str,
        tendencia: str,
        credibilidad: float,
        fecha_pub: str,
        texto_completo: str = "",
        resumen: str = "",
    ) -> ArticuloProcesado:
        """Procesa un articulo completo: NER + IPTC + sesgo."""
        texto_ner = texto_completo or resumen or titulo
        entidades = TransformerMediatico.extraer_entidades(texto_ner)

        texto_iptc = titulo + " " + (resumen or texto_completo[:300])
        categoria, score_iptc = TransformerMediatico.clasificar_iptc(titulo, texto_iptc)

        score_sesgo, score_cred = TransformerMediatico.calcular_score_sesgo(tendencia, credibilidad)

        return ArticuloProcesado(
            url_hash=url_hash,
            titulo=titulo,
            medio=medio,
            tendencia=tendencia,
            credibilidad=credibilidad,
            fecha_pub=fecha_pub,
            texto_completo=texto_completo,
            resumen=resumen,
            entidades=entidades,
            categoria_iptc=categoria,
            score_iptc=score_iptc,
            score_sesgo=score_sesgo,
            score_credibilidad=score_cred,
        )

    @staticmethod
    def procesar_lote(
        articulos: list[dict],
        max_texto: int = 5_000,
    ) -> list[ArticuloProcesado]:
        """
        Procesa un lote de articulos (dicts o ArticuloNormalizado).
        Acepta tanto dict como dataclass ArticuloNormalizado.
        """
        resultado: list[ArticuloProcesado] = []
        for art in articulos:
            try:
                if isinstance(art, dict):
                    url_hash = art.get("url_hash", "")
                    titulo = art.get("titulo", "")
                    medio = art.get("medio", "")
                    tendencia = art.get("tendencia", "centro")
                    credibilidad = float(art.get("credibilidad", 0.7))
                    fecha_pub = art.get("fecha_pub", "")
                    texto = art.get("texto_completo", "")[:max_texto]
                    resumen = art.get("resumen", "")[:1000]
                else:
                    url_hash = art.url_hash
                    titulo = art.titulo
                    medio = art.medio
                    tendencia = art.tendencia
                    credibilidad = art.credibilidad
                    fecha_pub = art.fecha_pub
                    texto = art.texto_completo[:max_texto]
                    resumen = art.resumen[:1000]

                procesado = TransformerMediatico.procesar_articulo(
                    url_hash=url_hash,
                    titulo=titulo,
                    medio=medio,
                    tendencia=tendencia,
                    credibilidad=credibilidad,
                    fecha_pub=fecha_pub,
                    texto_completo=texto,
                    resumen=resumen,
                )
                resultado.append(procesado)
            except Exception as exc:
                logger.debug("TransformerMediatico error en articulo: %s", exc)

        logger.info("TransformerMediatico: %d/%d articulos procesados", len(resultado), len(articulos))
        return resultado

    # ------------------------------------------------------------------
    # Agregacion de entidades por medio
    # ------------------------------------------------------------------

    @staticmethod
    def contar_entidades_por_medio(
        articulos_procesados: list[ArticuloProcesado],
    ) -> dict[str, dict[str, int]]:
        """
        Agrega frecuencia de entidades por medio.
        Retorna {medio: {entidad: count}}.
        """
        conteos: dict[str, dict[str, int]] = {}
        for art in articulos_procesados:
            if art.medio not in conteos:
                conteos[art.medio] = {}
            for ent in art.entidades:
                if ent.tipo in ("PER", "ORG"):
                    texto_norm = ent.texto.strip().lower()
                    conteos[art.medio][texto_norm] = conteos[art.medio].get(texto_norm, 0) + 1
        return conteos

    @staticmethod
    def detectar_spike_cobertura(
        articulos_recientes: list[ArticuloProcesado],
        articulos_historico: list[ArticuloProcesado],
        ventana_horas: int = 2,
        umbral_multiplo: float = 3.0,
    ) -> list[dict]:
        """
        Detecta spikes de cobertura: comparar volumen 2h vs media 14-dias.
        Retorna lista de {medio, categoria, articulos_recientes, ratio_vs_historico}.
        """
        from collections import Counter

        # Contar por categoria en recientes
        cats_recientes = Counter(a.categoria_iptc for a in articulos_recientes)
        cats_historico = Counter(a.categoria_iptc for a in articulos_historico)

        spikes: list[dict] = []
        n_dias_historico = max(1, 14)  # Ventana historica asumida = 14 dias
        factor_normalizacion = 24 / ventana_horas / n_dias_historico  # Normalizar a "por ventana"

        for cat, count_rec in cats_recientes.items():
            count_hist = cats_historico.get(cat, 0)
            media_hist = count_hist * factor_normalizacion if count_hist > 0 else 1.0
            ratio = count_rec / media_hist
            if ratio >= umbral_multiplo:
                spikes.append({
                    "categoria": cat,
                    "articulos_ventana": count_rec,
                    "media_historica_ventana": round(media_hist, 2),
                    "ratio": round(ratio, 2),
                })

        return sorted(spikes, key=lambda x: x["ratio"], reverse=True)
