"""
Deteccion de narrativas nuevas y actualizacion de existentes con BERTopic.

Pipeline por batch:
  1. Cargar articulos procesados de spain_articles + raw_articles (processed=TRUE)
  2. Generar embeddings (reutiliza embed() del Bloque 2)
  3. BERTopic online con UMAP + HDBSCAN
  4. Para cada cluster: comparar centroide contra narrativas en BD (similitud coseno)
     - Si similitud > 0.85 con narrativa existente → actualizar
     - Si no → crear narrativa nueva (si cluster >= 5 articulos)
  5. Retornar listas de narrativas nuevas y actualizadas
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

import numpy as np

log = logging.getLogger(__name__)

# Umbral de similitud coseno para considerar que es la misma narrativa
_SIM_THRESHOLD = 0.85
# Minimo de articulos para crear una narrativa nueva
_MIN_ARTICLES  = 5
# Dimensiones de reduccion UMAP
_UMAP_COMPONENTS = 5
# Configuracion HDBSCAN
_HDBSCAN_MIN_CLUSTER = 5


def _load_model():
    """Carga BERTopic con UMAP y HDBSCAN; retorna None si no disponible."""
    try:
        from bertopic import BERTopic  # type: ignore
        from umap import UMAP          # type: ignore
        from hdbscan import HDBSCAN    # type: ignore
        from sentence_transformers import SentenceTransformer  # type: ignore

        umap_model = UMAP(
            n_neighbors=15,
            n_components=_UMAP_COMPONENTS,
            min_dist=0.0,
            metric="cosine",
            random_state=42,
        )
        hdbscan_model = HDBSCAN(
            min_cluster_size=_HDBSCAN_MIN_CLUSTER,
            metric="euclidean",
            cluster_selection_method="eom",
            prediction_data=True,
        )
        embedding_model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
        topic_model = BERTopic(
            embedding_model=embedding_model,
            umap_model=umap_model,
            hdbscan_model=hdbscan_model,
            nr_topics="auto",
            verbose=False,
        )
        return topic_model
    except ImportError as exc:
        log.warning("BERTopic/UMAP/HDBSCAN no disponible: %s", exc)
        return None
    except Exception as exc:
        log.warning("Error cargando BERTopic: %s", exc)
        return None


def _embed_texts(texts: list[str]) -> Optional[np.ndarray]:
    """Genera embeddings reutilizando el EmbeddingStore del Bloque 2."""
    try:
        from agents.resolution.embedding_store import embed  # type: ignore
        return embed(texts)
    except Exception as exc:
        log.warning("Error importando embed del Bloque 2: %s", exc)
        # Fallback: intentar cargar el modelo directamente
        try:
            from sentence_transformers import SentenceTransformer  # type: ignore
            model = SentenceTransformer("paraphrase-multilingual-mpnet-base-v2")
            vecs = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.array(vecs, dtype=np.float32)
        except Exception as exc2:
            log.error("Error generando embeddings en detector: %s", exc2)
            return None


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    """Similitud coseno entre dos vectores ya normalizados."""
    return float(np.clip(np.dot(a, b), -1.0, 1.0))


def _load_existing_narrative_embeddings(conn) -> list[tuple[str, np.ndarray]]:
    """
    Carga los embeddings de narrativas existentes en BD.

    Retorna lista de (narrative_id, embedding_vector).
    """
    results: list[tuple[str, np.ndarray]] = []
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT narrative_id, frame_embedding
                FROM narratives
                WHERE frame_embedding IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 500
                """
            )
            for narrative_id, emb_raw in cur.fetchall():
                try:
                    if isinstance(emb_raw, list):
                        vec = np.array(emb_raw, dtype=np.float32)
                    elif isinstance(emb_raw, str):
                        import json
                        vec = np.array(json.loads(emb_raw), dtype=np.float32)
                    else:
                        vec = np.frombuffer(bytes(emb_raw), dtype=np.float32)
                    results.append((str(narrative_id), vec))
                except Exception as exc:
                    log.debug("Error parseando embedding de narrativa %s: %s", narrative_id, exc)
    except Exception as exc:
        log.error("Error cargando embeddings de narrativas: %s", exc)
    return results


def _find_matching_narrative(
    centroid: np.ndarray,
    existing: list[tuple[str, np.ndarray]],
) -> Optional[str]:
    """
    Compara el centroide del cluster contra narrativas existentes.

    Retorna el narrative_id mas similar si supera el umbral, o None.
    """
    if not existing:
        return None
    best_id:  Optional[str] = None
    best_sim: float = 0.0
    for nid, vec in existing:
        sim = _cosine_sim(centroid, vec)
        if sim > best_sim:
            best_sim = sim
            best_id  = nid
    if best_sim >= _SIM_THRESHOLD:
        return best_id
    return None


def cluster_articles(
    articles: list[dict],
    embeddings: np.ndarray,
) -> list[tuple[list[int], np.ndarray]]:
    """
    Agrupa articulos en clusters usando BERTopic.

    Args:
        articles:   Lista de articulos (con campo 'texto' o 'title').
        embeddings: Matriz (N, 768) de embeddings ya calculados.

    Returns:
        Lista de (indices_del_cluster, centroide_embedding).
        Los articulos con topic=-1 (ruido HDBSCAN) se excluyen.
    """
    if len(articles) < _MIN_ARTICLES:
        log.info("cluster_articles: menos de %d articulos, sin clustering", _MIN_ARTICLES)
        return []

    topic_model = _load_model()
    texts = [
        f"{art.get('title','') or art.get('titulo','')} "
        f"{(art.get('body','') or art.get('texto_completo','') or '')[:500]}"
        for art in articles
    ]

    if topic_model is None:
        # Fallback: un solo cluster con todos los articulos
        centroid = embeddings.mean(axis=0)
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid /= norm
        return [(list(range(len(articles))), centroid)]

    try:
        topics, _ = topic_model.fit_transform(texts, embeddings)
    except Exception as exc:
        log.error("BERTopic fit_transform error: %s", exc)
        return []

    # Agrupar indices por topic (excluir ruido -1)
    from collections import defaultdict
    topic_to_indices: defaultdict[int, list[int]] = defaultdict(list)
    for idx, t in enumerate(topics):
        if t != -1:
            topic_to_indices[t].append(idx)

    clusters: list[tuple[list[int], np.ndarray]] = []
    for topic_id, indices in topic_to_indices.items():
        if len(indices) < _MIN_ARTICLES:
            continue
        cluster_vecs = embeddings[indices]
        centroid = cluster_vecs.mean(axis=0)
        norm = np.linalg.norm(centroid)
        if norm > 0:
            centroid /= norm
        clusters.append((indices, centroid))

    log.info("cluster_articles: %d clusters de %d articulos", len(clusters), len(articles))
    return clusters


def detect_narratives(
    articles: list[dict],
    conn,
) -> tuple[list[dict], list[dict]]:
    """
    Detecta narrativas nuevas y actualiza las existentes.

    Args:
        articles: Articulos procesados (processed=TRUE) con campos:
                  article_id, title/titulo, body, published_at,
                  source_name, scope, ccaa, provincia, nicho.
        conn:     Conexion psycopg activa para consultar narrativas existentes.

    Returns:
        Tupla (nuevas, actualizadas) donde cada elemento es un dict con:
          - narrative_id (solo en actualizadas)
          - cluster_articles: list[dict]
          - centroid: np.ndarray
          - top_headlines: list[str]
          - context_snippets: list[str]
          - similarities: list[float]
          - primera_deteccion: datetime
    """
    if not articles:
        return [], []

    # Textos para embedding
    texts = [
        f"{art.get('title','') or art.get('titulo','')} "
        f"{(art.get('body','') or '')[:300]}"
        for art in articles
    ]

    log.info("detect_narratives: generando embeddings para %d articulos", len(articles))
    embeddings = _embed_texts(texts)
    if embeddings is None:
        log.error("detect_narratives: no se pudieron generar embeddings")
        return [], []

    clusters = cluster_articles(articles, embeddings)
    if not clusters:
        return [], []

    existing = _load_existing_narrative_embeddings(conn)
    nuevas: list[dict]      = []
    actualizadas: list[dict] = []

    for indices, centroid in clusters:
        cluster_arts = [articles[i] for i in indices]
        cluster_vecs = embeddings[indices]

        # Similitud de cada articulo con el centroide
        similarities = [_cosine_sim(cluster_vecs[j], centroid) for j in range(len(indices))]

        # Top headlines y snippets ordenados por similitud
        ranked = sorted(
            zip(cluster_arts, similarities),
            key=lambda x: x[1],
            reverse=True,
        )
        top_headlines = [
            art.get("title") or art.get("titulo") or ""
            for art, _ in ranked[:10]
        ]
        context_snippets = [
            (art.get("body") or art.get("texto_completo") or "")[:400]
            for art, _ in ranked[:3]
        ]

        # Fecha mas antigua del cluster como primera_deteccion
        primera: datetime = datetime.now(timezone.utc)
        for art in cluster_arts:
            pub = art.get("published_at")
            if pub:
                try:
                    if not isinstance(pub, datetime):
                        pub = datetime.fromisoformat(str(pub))
                    if pub.tzinfo is None:
                        pub = pub.replace(tzinfo=timezone.utc)
                    if pub < primera:
                        primera = pub
                except Exception:
                    pass

        cluster_payload = {
            "cluster_articles": cluster_arts,
            "centroid":          centroid,
            "top_headlines":     top_headlines,
            "context_snippets":  context_snippets,
            "similarities":      similarities,
            "primera_deteccion": primera,
        }

        match_id = _find_matching_narrative(centroid, existing)
        if match_id:
            cluster_payload["narrative_id"] = match_id
            actualizadas.append(cluster_payload)
        else:
            nuevas.append(cluster_payload)

    log.info(
        "detect_narratives: %d nuevas, %d actualizadas",
        len(nuevas), len(actualizadas),
    )
    return nuevas, actualizadas
