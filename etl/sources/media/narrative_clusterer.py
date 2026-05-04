"""
Agrupador de narrativas para artículos de medios.

Dos estrategias:
  - fingerprint: asignación por léxico ponderado (siempre disponible)
  - bertopic: clustering ML (opcional, ELECTSIM_MEDIA_USE_BERTOPIC=true)

Los fingerprints son extraídos de D7_Medios.py para mantener coherencia.
"""
from __future__ import annotations

import logging
import os
from typing import Any

from .schemas import MediaItem, NarrativeCluster, NarrativeClusterItem

logger = logging.getLogger(__name__)

_USE_BERTOPIC = os.getenv("ELECTSIM_MEDIA_USE_BERTOPIC", "false").lower() == "true"

# ── Fingerprints de narrativa (extraídos de D7_Medios.py) ────────────────────

NARRATIVA_FINGERPRINTS: list[dict[str, Any]] = [
    {
        "id": "crisis_economica",
        "nombre": "Crisis economica y coste de vida",
        "marco": "economico", "tension": "alta",
        "target": "Clase media asalariada", "ideologia_dominante": "transversal",
        "keywords": {
            "inflacion": 3, "precio": 2, "ipc": 3, "coste": 2, "cesta": 2,
            "paro": 3, "desempleo": 3, "pib": 2, "recesion": 3, "prima": 2,
            "deuda": 2, "deficit": 2, "bce": 2, "tipos": 2, "economia": 1,
            "salario": 2, "sueldo": 2, "poder adquisitivo": 3, "factura": 2,
            "hipoteca": 2, "euribor": 3, "aranceles": 3, "trump": 1,
        },
    },
    {
        "id": "corrupcion",
        "nombre": "Corrupcion e integridad institucional",
        "marco": "moralidad", "tension": "alta",
        "target": "Votantes desencantados", "ideologia_dominante": "transversal",
        "keywords": {
            "corrupcion": 4, "imputado": 3, "investigado": 3, "juicio": 2,
            "tribunal": 2, "fiscal": 2, "caso": 1, "trama": 3, "fraude": 3,
            "malversacion": 4, "soborno": 4, "contrato": 1, "adjudicacion": 2,
            "prevaricacion": 4, "financiacion ilegal": 4, "cuentas": 1,
            "koldo": 3, "mediador": 2, "comision": 2,
        },
    },
    {
        "id": "independentismo",
        "nombre": "Independentismo y tension territorial",
        "marco": "conflicto", "tension": "alta",
        "target": "Ciudadania catalana y vasca", "ideologia_dominante": "izquierda",
        "keywords": {
            "independencia": 4, "independentismo": 4, "catalu": 3, "referendum": 4,
            "generalitat": 3, "puigdemont": 3, "junts": 2, "erc": 2, "bildu": 2,
            "pnv": 2, "pais vasco": 2, "euskadi": 2, "singular": 2,
            "fiscal": 1, "competencia": 1, "estatut": 3, "transferencia": 2,
        },
    },
    {
        "id": "inmigracion",
        "nombre": "Inmigracion y asilo",
        "marco": "conflicto", "tension": "alta",
        "target": "Electores de clase trabajadora", "ideologia_dominante": "derecha",
        "keywords": {
            "inmigracion": 4, "inmigrante": 3, "migracion": 3, "migrante": 3,
            "patera": 4, "cayuco": 4, "mena": 4, "canarias": 2, "ceuta": 3,
            "melilla": 3, "frontera": 2, "asilo": 2, "solicitante": 2,
            "refugiado": 2, "expulsion": 3, "retorno": 2, "llegadas": 2,
        },
    },
    {
        "id": "vivienda_alquiler",
        "nombre": "Vivienda y acceso al alquiler",
        "marco": "interes_humano", "tension": "media",
        "target": "Jovenes 25-40 en ciudades", "ideologia_dominante": "izquierda",
        "keywords": {
            "vivienda": 4, "alquiler": 4, "precio": 1, "piso": 2, "hipoteca": 2,
            "emancipacion": 3, "joven": 2, "compra": 1, "oferta": 1,
            "promotor": 2, "especulacion": 3, "turistica": 2, "airbnb": 3,
            "desahucio": 3, "parque publico": 3, "ley de vivienda": 4,
        },
    },
    {
        "id": "polarizacion",
        "nombre": "Polarizacion politica y bloqueo",
        "marco": "conflicto", "tension": "media",
        "target": "Ciudadania general", "ideologia_dominante": "transversal",
        "keywords": {
            "polarizacion": 4, "crispacion": 3, "bloqueo": 3, "acuerdo": 1,
            "negociacion": 2, "dialogo": 2, "ruptura": 2, "tension": 1,
            "enfrentamiento": 2, "bronca": 2, "insulto": 2, "congreso": 1,
            "gobierno": 1, "oposicion": 1, "sanchez": 2, "feijoo": 2,
            "mocion": 3, "confianza": 2, "investidura": 3,
        },
    },
    {
        "id": "reforma_fiscal",
        "nombre": "Reforma fiscal y presupuestos",
        "marco": "economico", "tension": "media",
        "target": "Contribuyentes y empresas", "ideologia_dominante": "centroderecha",
        "keywords": {
            "presupuesto": 4, "fiscal": 2, "irpf": 4, "impuesto": 3, "reforma": 2,
            "grandes fortunas": 4, "patrimonio": 3, "hacienda": 3, "tributo": 3,
            "recaudacion": 3, "tipo marginal": 4, "renta": 2, "sociedad": 1,
            "amnistia fiscal": 4, "fraude fiscal": 3,
        },
    },
    {
        "id": "sanidad_publica",
        "nombre": "Sanidad publica y listas de espera",
        "marco": "interes_humano", "tension": "baja",
        "target": "Pacientes y trabajadores sanitarios", "ideologia_dominante": "izquierda",
        "keywords": {
            "sanidad": 4, "sanitario": 3, "hospital": 2, "medico": 2, "enfermero": 2,
            "lista de espera": 4, "urgencias": 3, "atencion primaria": 4,
            "medecina": 2, "privatizacion": 3, "concierto": 2, "nss": 3,
            "colapso": 2, "camas": 2, "huelga medicos": 3,
        },
    },
    {
        "id": "politica_exterior",
        "nombre": "Politica exterior y geopolitica",
        "marco": "estrategia_politica", "tension": "media",
        "target": "Opinion publica europeista", "ideologia_dominante": "transversal",
        "keywords": {
            "otan": 3, "ue": 1, "europa": 1, "trump": 2, "ucrania": 3,
            "rusia": 2, "gaza": 3, "israel": 2, "palestina": 2, "china": 2,
            "aranceles": 3, "diplomacia": 2, "cumbre": 2, "tratado": 2,
            "defensa": 2, "seguridad": 1, "alianza": 2,
        },
    },
    {
        "id": "derechos_laborales",
        "nombre": "Derechos sociales y laborales",
        "marco": "moralidad", "tension": "baja",
        "target": "Trabajadores y sindicatos", "ideologia_dominante": "izquierda",
        "keywords": {
            "jornada": 3, "reduccion jornada": 4, "smi": 4, "salario minimo": 4,
            "sindicato": 3, "ccoo": 3, "ugt": 3, "huelga": 3, "convenio": 2,
            "negociacion colectiva": 4, "despido": 3, "precariedad": 3,
            "feminismo": 2, "igualdad": 2, "brecha salarial": 3,
        },
    },
    {
        "id": "clima_energia",
        "nombre": "Clima y transicion energetica",
        "marco": "interes_humano", "tension": "baja",
        "target": "Jovenes y activistas", "ideologia_dominante": "izquierda",
        "keywords": {
            "clima": 3, "climatico": 3, "energia": 2, "renovable": 3, "solar": 2,
            "eolica": 2, "hidrogeno": 2, "emision": 3, "co2": 3, "temperatura": 2,
            "sequi": 3, "inundacion": 2, "dana": 3, "transicion": 2,
            "cop": 2, "verde": 1, "contaminacion": 2,
        },
    },
    {
        "id": "seguridad_orden",
        "nombre": "Seguridad y orden publico",
        "marco": "conflicto", "tension": "media",
        "target": "Ciudadania preocupada por la seguridad", "ideologia_dominante": "derecha",
        "keywords": {
            "seguridad": 2, "delito": 3, "crimen": 3, "policia": 2, "guardia civil": 2,
            "detenido": 2, "robo": 3, "violencia": 2, "agresion": 2, "homicidio": 3,
            "terrorismo": 4, "yihadismo": 4, "banda": 3, "narcotrafic": 4,
            "orden publico": 3, "manifestacion": 1,
        },
    },
]


# ── Scoring por fingerprint ───────────────────────────────────────────────────

def _score_article(text: str, keywords: dict[str, int]) -> float:
    """Calcula la puntuación de un artículo contra un fingerprint."""
    if not text:
        return 0.0
    text_lower = text.lower()
    score = 0.0
    for kw, weight in keywords.items():
        if kw in text_lower:
            score += weight
    return score


def assign_fingerprint_cluster(
    text: str,
    min_score: float = 2.0,
) -> tuple[str | None, float]:
    """
    Asigna el fingerprint más relevante para un texto.

    Args:
        text: texto del artículo.
        min_score: puntuación mínima para asignar cluster.

    Returns:
        (cluster_id, score) o (None, 0.0) si no hay coincidencia.
    """
    best_id: str | None = None
    best_score = 0.0

    for fp in NARRATIVA_FINGERPRINTS:
        score = _score_article(text, fp["keywords"])
        if score > best_score:
            best_score = score
            best_id = fp["id"]

    if best_score < min_score:
        return None, 0.0
    return best_id, best_score


# ── NarrativeClusterer ────────────────────────────────────────────────────────

class NarrativeClusterer:
    """
    Asigna narrativas a MediaItems y actualiza/construye NarrativeClusters.

    Uso::

        clusterer = NarrativeClusterer()
        items, clusters = clusterer.cluster(media_items)
    """

    def __init__(
        self,
        fingerprints: list[dict[str, Any]] | None = None,
        min_score: float = 2.0,
    ) -> None:
        self.fingerprints = fingerprints or NARRATIVA_FINGERPRINTS
        self.min_score = min_score

    def assign_clusters(
        self, items: list[MediaItem]
    ) -> tuple[list[MediaItem], list[NarrativeClusterItem]]:
        """
        Asigna cluster_id a cada item y genera NarrativeClusterItems.

        Returns:
            (items_actualizados, cluster_items)
        """
        cluster_items: list[NarrativeClusterItem] = []

        for item in items:
            text = " ".join(filter(None, [item.title, item.summary, item.text]))
            cluster_id, score = assign_fingerprint_cluster(text, self.min_score)

            if cluster_id:
                item.narrative_cluster_id = cluster_id
                cluster_items.append(NarrativeClusterItem(
                    cluster_id=cluster_id,
                    content_hash=item.content_hash,
                    score=round(score, 2),
                ))

        return items, cluster_items

    def build_cluster_summaries(
        self,
        items: list[MediaItem],
        cluster_items: list[NarrativeClusterItem],
    ) -> list[NarrativeCluster]:
        """
        Construye NarrativeCluster con estadísticas de volumen y sentimiento
        a partir de los items ya asignados.
        """
        from datetime import datetime, timezone
        from collections import defaultdict

        # Índice cluster_id → items
        cluster_idx: dict[str, list[MediaItem]] = defaultdict(list)
        for ci in cluster_items:
            for item in items:
                if item.content_hash == ci.content_hash:
                    cluster_idx[ci.cluster_id].append(item)
                    break

        # Mapa fingerprint por id
        fp_map = {fp["id"]: fp for fp in self.fingerprints}

        clusters: list[NarrativeCluster] = []
        now = datetime.now(timezone.utc)

        for cluster_id, cluster_articles in cluster_idx.items():
            fp = fp_map.get(cluster_id, {})

            # Estadísticas
            volume = len(cluster_articles)
            sentiments = [
                a.sentiment_score for a in cluster_articles
                if a.sentiment_score is not None
            ]
            sentiment_avg = sum(sentiments) / len(sentiments) if sentiments else 0.0

            # Actores y fuentes
            actors: list[str] = []
            sources: list[str] = []
            for a in cluster_articles:
                actors.extend(a.actors)
                sources.append(a.source)
            actors = list(dict.fromkeys(actors))[:10]
            sources = list(dict.fromkeys(sources))[:10]

            # Riesgo
            tension = fp.get("tension", "baja")
            risk_map = {"alta": "ALTO", "media": "MEDIO", "baja": "BAJO"}
            risk_level = risk_map.get(tension, "BAJO")
            if volume >= 10:
                risk_level = "CRÍTICO" if tension == "alta" else risk_level

            clusters.append(NarrativeCluster(
                id=cluster_id,
                label=fp.get("nombre", cluster_id),
                frame=fp.get("marco"),
                tension=tension,
                target_audience=fp.get("target"),
                ideology_hint=fp.get("ideologia_dominante"),
                top_terms=list(fp.get("keywords", {}).keys())[:8],
                representative_titles=[a.title[:100] for a in cluster_articles[:3]],
                volume_24h=volume,
                volume_7d=volume,  # se actualiza con datos reales desde BD
                sentiment_avg=round(sentiment_avg, 3),
                risk_level=risk_level,
                actors=actors,
                sources=sources,
                first_seen=min((a.published_at for a in cluster_articles if a.published_at), default=now),
                last_seen=max((a.published_at for a in cluster_articles if a.published_at), default=now),
                updated_at=now,
            ))

        return clusters
