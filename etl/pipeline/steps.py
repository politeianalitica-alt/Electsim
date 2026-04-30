"""
9 pasos del pipeline event-driven.

Cada funcion recibe un PipelineResult parcialmente completado,
muta el objeto en su lugar y retorna el mismo objeto.
El runner ensambla los pasos en orden y los ejecuta secuencialmente.

Pasos:
  1. deduplicate        — marca si el item ya fue procesado (Redis o in-memory TTL)
  2. extract_text       — HTML→texto plano, limpieza
  3. annotate_ner       — NER con spaCy / TransformerMediatico
  4. resolve_entities   — match entidades a ontologia
  5. classify_topics    — IPTC con XLM-RoBERTa / reglas
  6. compute_sentiment  — XLM-RoBERTa Cardiff / keywords
  7. compute_embedding  — nomic-embed-text / SBERT / hash
  8. update_cluster     — asignacion de cluster por centroide
  9. evaluate_alerts    — watchlist checks → AlertTriggered
"""
from __future__ import annotations

import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from etl.pipeline.models import (
    AlertTriggered,
    ClusterInfo,
    EntityAnnotation,
    NLPAnnotations,
    PipelineResult,
    SentimentAnnotation,
    TopicAnnotation,
    VectorInfo,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cache de deduplicacion in-memory (fallback cuando Redis no esta disponible)
# TTL: 7 dias en segundos
# ---------------------------------------------------------------------------
_DEDUP_TTL = 7 * 24 * 3600
_dedup_cache: dict[str, float] = {}  # clave -> timestamp de insercion


def _dedup_key(result: PipelineResult) -> str:
    doc = result.normalized
    content = f"{doc.market_code}:{doc.source_id}:{doc.external_id or doc.url or ''}"
    return hashlib.sha256(content.encode()).hexdigest()


def _dedup_in_memory(key: str) -> bool:
    """Retorna True si la clave ya existe y el TTL no ha expirado."""
    now = time.time()
    # Limpieza de entradas expiradas cada ~100 calls (no necesita ser exacto)
    if len(_dedup_cache) % 100 == 0:
        expired = [k for k, ts in _dedup_cache.items() if now - ts > _DEDUP_TTL]
        for k in expired:
            _dedup_cache.pop(k, None)
    if key in _dedup_cache:
        if now - _dedup_cache[key] <= _DEDUP_TTL:
            return True
        del _dedup_cache[key]
    _dedup_cache[key] = now
    return False


def _dedup_redis(key: str) -> bool:
    """Retorna True si la clave ya existe en Redis; la inserta si no existe."""
    try:
        import redis as _redis
        from config.settings import get_settings
        r = _redis.from_url(get_settings().redis_url, socket_connect_timeout=2)
        full_key = f"pipeline:dedup:{key}"
        if r.exists(full_key):
            return True
        r.setex(full_key, _DEDUP_TTL, "1")
        return False
    except Exception:
        return _dedup_in_memory(key)


# ---------------------------------------------------------------------------
# Paso 1: Deduplicacion
# ---------------------------------------------------------------------------

def deduplicate(result: PipelineResult) -> tuple[PipelineResult, bool]:
    """
    Retorna (result, is_duplicate).
    Si is_duplicate=True el runner debe abortar el pipeline.
    """
    key = _dedup_key(result)
    is_dup = _dedup_redis(key)
    if not is_dup:
        result.steps_completed.append("deduplicate")
    return result, is_dup


# ---------------------------------------------------------------------------
# Paso 2: Extraccion de texto
# ---------------------------------------------------------------------------

def _html_to_text(html: str) -> str:
    """Elimina tags HTML sin dependencias externas."""
    # Elimina scripts y styles primero
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Convierte <br> y <p> en saltos de linea
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'</p>', '\n\n', html, flags=re.IGNORECASE)
    # Elimina todos los tags restantes
    html = re.sub(r'<[^>]+>', ' ', html)
    # Decodifica entidades HTML basicas
    replacements = {
        '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
        '&apos;': "'", '&nbsp;': ' ', '&#160;': ' ',
    }
    for ent, char in replacements.items():
        html = html.replace(ent, char)
    # Normaliza espacios
    html = re.sub(r'\n{3,}', '\n\n', html)
    html = re.sub(r'[ \t]+', ' ', html)
    return html.strip()


def _try_trafilatura(html: str) -> str | None:
    try:
        import trafilatura
        text = trafilatura.extract(html, include_comments=False, include_tables=False)
        return text or None
    except Exception:
        return None


def extract_text(result: PipelineResult) -> PipelineResult:
    """
    Rellena raw_text si esta vacio o contiene HTML.
    Intenta trafilatura primero, luego regex.
    """
    doc = result.normalized
    raw = doc.raw_text or ""

    # Detecta si parece HTML
    if '<html' in raw.lower() or '<body' in raw.lower() or raw.count('<') > 5:
        trafilatura_text = _try_trafilatura(raw)
        if trafilatura_text:
            doc.raw_text = trafilatura_text
        else:
            doc.raw_text = _html_to_text(raw)
    elif not raw and doc.metadata.get("content"):
        # Toma de metadata si raw_text esta vacio
        doc.raw_text = str(doc.metadata["content"])

    # Limpieza final de espacios
    doc.raw_text = re.sub(r'\s+', ' ', doc.raw_text).strip()

    result.steps_completed.append("extract_text")
    return result


# ---------------------------------------------------------------------------
# Paso 3: NER
# ---------------------------------------------------------------------------

def annotate_ner(result: PipelineResult) -> PipelineResult:
    """Extrae entidades con spaCy / regex y las guarda en result.nlp.entities."""
    from etl.nlp.ner import extract_entities

    text = result.normalized.raw_text
    if not text:
        result.steps_completed.append("annotate_ner")
        return result

    raw_entities = extract_entities(text)
    result.nlp.entities = [
        EntityAnnotation(
            text=e["text"],
            label=e["label"],
            start=e.get("start", 0),
            end=e.get("end", 0),
            score=e.get("score", 1.0),
        )
        for e in raw_entities
    ]
    result.steps_completed.append("annotate_ner")
    return result


# ---------------------------------------------------------------------------
# Paso 4: Resolucion de entidades en la ontologia
# ---------------------------------------------------------------------------

def resolve_entities(result: PipelineResult, session: Optional[Any] = None) -> PipelineResult:
    """
    Para cada entidad PER/ORG intenta hacer match en la ontologia (actores/partidos).
    Rellena entity.resolved_object_id cuando encuentra un match.
    No falla si la BD no esta disponible.
    """
    if not result.nlp.entities:
        result.steps_completed.append("resolve_entities")
        return result

    if session is None:
        # Sin sesion de BD no podemos resolver, no es error
        result.steps_completed.append("resolve_entities")
        return result

    try:
        from api.ontology.repository import OntologyGraphRepository
        repo = OntologyGraphRepository(session)
        for ent in result.nlp.entities:
            if ent.label not in ("PER", "ORG", "PERSON", "ORGANIZATION"):
                continue
            # Busqueda por nombre en properties->name
            obj = _find_ontology_object_by_name(session, ent.text)
            if obj:
                ent.resolved_object_id = str(obj["id"])
    except Exception as exc:
        logger.warning("resolve_entities: error accediendo ontologia: %s", exc)

    result.steps_completed.append("resolve_entities")
    return result


def _find_ontology_object_by_name(session: Any, name: str) -> dict | None:
    """Busqueda simple por properties->>'name' ILIKE."""
    try:
        from sqlalchemy import text as sa_text
        row = session.execute(
            sa_text(
                "SELECT id FROM ontology_object "
                "WHERE properties->>'name' ILIKE :name LIMIT 1"
            ),
            {"name": name},
        ).first()
        if row:
            return {"id": row[0]}
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Paso 5: Clasificacion de topicos
# ---------------------------------------------------------------------------

def classify_topics(result: PipelineResult) -> PipelineResult:
    """Clasifica el texto con IPTC y guarda en result.nlp.topics."""
    from etl.nlp.topic_classification import classify_topics as _classify

    text = result.normalized.raw_text
    if not text:
        result.steps_completed.append("classify_topics")
        return result

    topics_raw = _classify(text, top_k=3)
    result.nlp.topics = [
        TopicAnnotation(label=t["label"], score=t["score"])
        for t in topics_raw
    ]
    result.steps_completed.append("classify_topics")
    return result


# ---------------------------------------------------------------------------
# Paso 6: Sentimiento
# ---------------------------------------------------------------------------

def compute_sentiment(result: PipelineResult) -> PipelineResult:
    """Calcula sentimiento global y por entidad."""
    from etl.nlp.sentiment import analyze_sentiment

    text = result.normalized.raw_text
    if not text:
        result.steps_completed.append("compute_sentiment")
        return result

    entities_raw = [{"text": e.text, "label": e.label} for e in result.nlp.entities]
    sentiments_raw = analyze_sentiment(text, entities_raw)
    result.nlp.sentiment = [
        SentimentAnnotation(
            target=s["target"],
            label=s["label"],
            score=s["score"],
        )
        for s in sentiments_raw
    ]
    result.steps_completed.append("compute_sentiment")
    return result


# ---------------------------------------------------------------------------
# Paso 7: Embedding
# ---------------------------------------------------------------------------

def compute_embedding(result: PipelineResult) -> PipelineResult:
    """Genera embedding y guarda en result.vector."""
    from etl.nlp.embedding import embed_text

    text = result.normalized.raw_text
    if not text:
        result.steps_completed.append("compute_embedding")
        return result

    vector_info = embed_text(text)
    if vector_info:
        result.vector = VectorInfo(
            embedding=vector_info["embedding"],
            dim=vector_info["dim"],
            model_name=vector_info["model_name"],
        )
    result.steps_completed.append("compute_embedding")
    return result


# ---------------------------------------------------------------------------
# Paso 8: Cluster update (centroide simple sin HDBSCAN)
# ---------------------------------------------------------------------------

# Cache minima de centroides en memoria (no persistente entre workers)
# En produccion esto se leeria de BD/Redis.
_CLUSTER_CENTROIDS: list[dict] = []  # list of {"id": int, "label": str, "centroid": list[float]}
_CLUSTER_THRESHOLD = 0.85  # similitud coseno minima para asignar cluster


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(x * x for x in b) ** 0.5
    return dot / (na * nb) if na * nb else 0.0


def update_cluster(result: PipelineResult) -> PipelineResult:
    """
    Asigna cluster al documento por similitud coseno al centroide mas cercano.
    Si ninguno supera el umbral, el documento queda sin cluster
    (is_new_cluster=True indica que podria iniciar uno nuevo en un batch job).
    """
    if result.vector is None:
        result.cluster = ClusterInfo()
        result.steps_completed.append("update_cluster")
        return result

    vec = result.vector.embedding
    best_id: int | None = None
    best_label: str | None = None
    best_sim = 0.0

    for cluster in _CLUSTER_CENTROIDS:
        sim = _cosine_similarity(vec, cluster["centroid"])
        if sim > best_sim:
            best_sim = sim
            best_id = cluster["id"]
            best_label = cluster["label"]

    if best_sim >= _CLUSTER_THRESHOLD and best_id is not None:
        result.cluster = ClusterInfo(cluster_id=best_id, cluster_label=best_label, is_new_cluster=False)
    else:
        result.cluster = ClusterInfo(is_new_cluster=True)

    result.steps_completed.append("update_cluster")
    return result


# ---------------------------------------------------------------------------
# Paso 9: Evaluacion de alertas
# ---------------------------------------------------------------------------

# Watchlists por defecto (se pueden sobreescribir desde BD en el runner)
_DEFAULT_ENTITY_WATCHLIST: set[str] = {
    "sanchez", "feijoo", "abascal", "yolanda diaz", "puigdemont",
}
_DEFAULT_TOPIC_WATCHLIST: set[str] = {
    "conflict_war_peace", "crime_law_justice",
}


def evaluate_alerts(
    result: PipelineResult,
    entity_watchlist: set[str] | None = None,
    topic_watchlist: set[str] | None = None,
    client_id: int = 0,
) -> PipelineResult:
    """
    Evalua reglas de alerta sobre el documento procesado.

    Genera AlertTriggered para:
    - entity_watch: entidad en watchlist
    - topic_watch: topico en watchlist
    - sentiment_spike: sentimiento negativo con score > 0.85
    - fimi: patron FIMI (entidad politica + sentimiento muy negativo)
    """
    ent_watch = entity_watchlist or _DEFAULT_ENTITY_WATCHLIST
    top_watch = topic_watchlist or _DEFAULT_TOPIC_WATCHLIST
    alerts = []

    # entity_watch
    for ent in result.nlp.entities:
        if ent.text.lower() in ent_watch:
            alerts.append(AlertTriggered(
                client_id=client_id,
                rule_type="entity_watch",
                description=f"Mencion de entidad vigilada: '{ent.text}'",
                severity="medium",
            ))

    # topic_watch
    for topic in result.nlp.topics:
        if topic.label in top_watch:
            alerts.append(AlertTriggered(
                client_id=client_id,
                rule_type="topic_watch",
                description=f"Topico sensible detectado: '{topic.label}'",
                severity="low",
            ))

    # sentiment_spike
    for sent in result.nlp.sentiment:
        if sent.target == "global" and sent.label == "negative" and sent.score >= 0.85:
            alerts.append(AlertTriggered(
                client_id=client_id,
                rule_type="sentiment_spike",
                description=f"Sentimiento muy negativo (score={sent.score:.2f})",
                severity="high",
            ))

    # fimi: entidad politica + sentimiento negativo fuerte
    has_political_entity = any(
        e.text.lower() in ent_watch for e in result.nlp.entities
    )
    global_negative_high = any(
        s.label == "negative" and s.score >= 0.80
        for s in result.nlp.sentiment
        if s.target == "global"
    )
    if has_political_entity and global_negative_high:
        alerts.append(AlertTriggered(
            client_id=client_id,
            rule_type="fimi",
            description="Posible operacion informativa: entidad politica + sentimiento muy negativo",
            severity="critical",
        ))

    result.alerts_triggered.extend(alerts)
    result.steps_completed.append("evaluate_alerts")
    return result
