"""
Pipeline de narrativas mediáticas.

Envuelve analytics/narrative_engine.py con:
- graceful degradation si las librerías no están disponibles
- persistencia en memoria / DB
- narrativas reales con frames, actores, contranarrativas

Nota sobre las firmas reales de narrative_engine.py:
  build_narrative_corpus(df) -> pd.DataFrame
  embed_corpus(texts: list[str]) -> np.ndarray   (retorna zeros si sin modelo)
  cluster_narratives(embeddings, texts) -> np.ndarray  (labels array, -1 = ruido)
  extract_frame_with_llm(cluster_df: pd.DataFrame) -> dict
  compute_narrative_lifecycle(cluster_df: pd.DataFrame) -> dict
"""
from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Any

import pandas as pd

log = logging.getLogger(__name__)

# Caché de narrativas en memoria (persiste entre llamadas en el mismo proceso)
_NARRATIVE_CLUSTERS: list[dict] = []


def run_narrative_pipeline(
    articles: list[dict],
    hours: int = 24,
    tenant_id: str = "default",
) -> list[dict]:
    """
    Ejecuta el pipeline completo de detección de narrativas.

    Retorna lista de narrative clusters con:
    - cluster_id, frame_label, frame_description, central_claim,
      promoters, affected_actors, diffuser_sources, representative_titles,
      dominant_emotion, frame_type, lifecycle, velocity, article_count,
      possible_coordination, counter_narrative, recommended_action

    Si el corpus es insuficiente o las librerías no están disponibles,
    retorna la caché anterior o narrativas demo marcadas con is_demo=True.
    """
    if not articles:
        return _NARRATIVE_CLUSTERS or _demo_narratives()

    try:
        return _run_real_pipeline(articles, hours, tenant_id)
    except Exception as exc:
        log.warning("narrative_pipeline failed, usando caché/demo: %s", exc)
        return _NARRATIVE_CLUSTERS or _demo_narratives()


def _run_real_pipeline(
    articles: list[dict], hours: int, tenant_id: str
) -> list[dict]:
    """Intenta correr analytics/narrative_engine con graceful degradation."""
    try:
        from analytics.narrative_engine import (
            build_narrative_corpus,
            cluster_narratives,
            compute_narrative_lifecycle,
            embed_corpus,
            extract_frame_with_llm,
        )
    except ImportError as exc:
        log.info("narrative_engine no disponible (%s), usando caché/demo", exc)
        return _NARRATIVE_CLUSTERS or _demo_narratives()

    # Construir DataFrame compatible con narrative_engine
    rows: list[dict] = []
    for art in articles:
        title = art.get("translated_title") or art.get("title") or ""
        summary = art.get("summary") or ""
        rows.append(
            {
                "id": art.get("article_id") or art.get("id") or "",
                "title": title,
                "text": f"{title} {summary}",
                "source": art.get("source_name", ""),
                # narrative_engine usa 'source_label' como fuente alternativa
                "source_label": art.get("source_name", ""),
                "published_at": art.get("published_at") or art.get("pub_date") or "",
                "record_type": art.get("record_type", "rss_item"),
                "lang": art.get("lang", "es"),
                "fulltext": f"{title} {summary}",
            }
        )

    df = pd.DataFrame(rows)

    corpus = build_narrative_corpus(df)
    if corpus.empty or len(corpus) < 5:
        log.info(
            "narrative_pipeline: corpus insuficiente (%d artículos)",
            len(corpus),
        )
        return _NARRATIVE_CLUSTERS or _demo_narratives()

    # embed_corpus espera lista de strings
    texts = corpus["fulltext"].tolist() if "fulltext" in corpus.columns else []
    if not texts:
        texts = (corpus.get("title", pd.Series(dtype=str)).fillna("")).tolist()

    embeddings = embed_corpus(texts)

    # cluster_narratives retorna ndarray de labels (int), -1 = ruido
    import numpy as np

    labels = cluster_narratives(embeddings, texts)
    corpus = corpus.copy()
    corpus["_cluster"] = labels

    unique_labels = [lbl for lbl in np.unique(labels) if lbl != -1]
    if not unique_labels:
        log.info("narrative_pipeline: ningún cluster válido detectado")
        return _NARRATIVE_CLUSTERS or _demo_narratives()

    results: list[dict] = []
    for label in unique_labels:
        cluster_df = corpus[corpus["_cluster"] == label].copy()
        if len(cluster_df) < 3:
            continue

        try:
            frame = extract_frame_with_llm(cluster_df)
        except Exception as exc:
            log.debug("extract_frame_with_llm failed for cluster %d: %s", label, exc)
            frame = {"frame_label": f"Narrativa {label}", "central_claim": ""}

        try:
            lifecycle = compute_narrative_lifecycle(cluster_df)
        except Exception as exc:
            log.debug("compute_narrative_lifecycle failed: %s", exc)
            lifecycle = {}

        narrative = _build_narrative_dict(cluster_df, frame, lifecycle, tenant_id)
        results.append(narrative)

    results = [n for n in results if n.get("article_count", 0) >= 3]
    results = _discard_topic_only_clusters(results)

    if results:
        _set_narrative_cache(results)
        _persist_narratives(results, tenant_id)

    return results or _demo_narratives()


def _build_narrative_dict(
    cluster_df: pd.DataFrame,
    frame: dict,
    lifecycle: dict,
    tenant_id: str,
) -> dict:
    """
    Construye dict estándar de narrativa a partir de los resultados de clustering.

    Adapta los nombres de campos de narrative_engine.py al esquema de pipeline.
    """
    # Títulos representativos
    if "title" in cluster_df.columns:
        titles = cluster_df["title"].dropna().tolist()[:3]
    else:
        titles = []

    # Fuentes únicas
    src_col = (
        "source_key"
        if "source_key" in cluster_df.columns
        else "source_label"
        if "source_label" in cluster_df.columns
        else None
    )
    sources: list[str] = []
    if src_col:
        sources = cluster_df[src_col].dropna().unique().tolist()[:5]

    # Campos del frame (narrative_engine usa snake_case diferente)
    label = (
        frame.get("frame_label")
        or frame.get("label")
        or "Narrativa sin título"
    )
    claim = (
        frame.get("frame_description")        # narrative_engine usa frame_description
        or frame.get("central_claim")
        or ""
    )
    promoters = []
    if frame.get("actor_principal"):
        promoters = [frame["actor_principal"]]
    affected = []
    if frame.get("actor_objetivo"):
        affected = [frame["actor_objetivo"]]

    # Emoción — narrative_engine usa 'emocion_dominante'
    engine_emotion = frame.get("emocion_dominante", "")
    _emotion_map = {
        "indignacion": "anger",
        "miedo": "fear",
        "esperanza": "hope",
        "orgullo": "pride",
        "desprecio": "contempt",
        "desconfianza": "distrust",
        "solidaridad": "solidarity",
        "urgencia": "urgency",
    }
    emotion = _emotion_map.get(engine_emotion, engine_emotion or "neutral")

    # Si no hay emoción del LLM, inferir por keywords de los títulos
    if not engine_emotion:
        all_text = " ".join(titles).lower()
        if any(w in all_text for w in ["crisis", "colapso", "desastre", "catástrofe"]):
            emotion = "fear"
        elif any(w in all_text for w in ["acuerdo", "avance", "éxito", "logro"]):
            emotion = "hope"
        elif any(w in all_text for w in ["escándalo", "corrupción", "fraude", "engaño"]):
            emotion = "anger"

    # Ciclo vital — narrative_engine usa 'ciclo_vital'
    stage_map = {
        "emergente": "emerging",
        "creciente": "growing",
        "plateau": "peak",
        "declinante": "declining",
    }
    raw_stage = lifecycle.get("ciclo_vital", "emergente")
    stage = stage_map.get(raw_stage, raw_stage)

    # Velocidad de difusión en horas → etiqueta
    vel_h = lifecycle.get("velocidad_difusion_h", 0.0)
    if vel_h <= 6:
        velocity = "fast"
    elif vel_h <= 24:
        velocity = "normal"
    else:
        velocity = "slow"

    cluster_id = hashlib.md5(label.encode()).hexdigest()[:12]

    return {
        "cluster_id": cluster_id,
        "frame_label": label,
        "frame_description": frame.get("frame_description") or "",
        "central_claim": claim,
        "promoters": promoters,
        "affected_actors": affected,
        "diffuser_sources": list(set(sources))[:5],
        "representative_titles": titles,
        "dominant_emotion": emotion,
        "frame_type": frame.get("tipo_frame") or frame.get("frame_type") or "generic",
        "lifecycle": stage,
        "velocity": velocity,
        "article_count": lifecycle.get("menciones_acumuladas") or len(cluster_df),
        "possible_coordination": lifecycle.get("posible_coordinacion", False),
        "counter_narrative": _suggest_counter(claim),
        "recommended_action": _suggest_action(stage, emotion),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "tenant_id": tenant_id,
    }


def _discard_topic_only_clusters(narratives: list[dict]) -> list[dict]:
    """Descarta clústeres que son solo temas genéricos sin frame real."""
    generic_labels = {
        "política", "economía", "deportes", "tecnología", "sociedad",
        "internacional", "españa", "mundo", "ciencia", "cultura",
        "política española", "economía española", "noticias",
    }
    return [
        n
        for n in narratives
        if n.get("frame_label", "").lower() not in generic_labels
        and n.get("central_claim")
        and n.get("article_count", 0) >= 3
    ]


def _suggest_counter(claim: str) -> str:
    if not claim:
        return ""
    snippet = claim[:50]
    return (
        f"Contra-encuadre: contextualizar '{snippet}...' "
        "con datos y evidencias alternativas"
    )


def _suggest_action(stage: str, emotion: str) -> str:
    actions = {
        "emerging": "Monitorizar. Preparar mensaje proactivo si crece.",
        "growing": "Responder activamente. Reforzar contranarrativa.",
        "peak": "Gestión de crisis. Portavoz y mensajes coordinados.",
        "declining": "Mantener vigilancia. No reanimar con comentarios.",
    }
    return actions.get(stage, "Vigilar evolución")


def _demo_narratives() -> list[dict]:
    """Narrativas demo cuando no hay datos reales. Marcadas explícitamente con is_demo=True."""
    return [
        {
            "cluster_id": "demo_001",
            "frame_label": "DEMO — Crisis de vivienda como fracaso generacional",
            "frame_description": "Narrativa demo: la vivienda como barrera para la emancipación joven",
            "central_claim": "El precio de la vivienda bloquea la independencia de los menores de 35 años",
            "promoters": ["Oposición", "Sindicatos de inquilinos"],
            "affected_actors": ["Jóvenes", "Familias trabajadoras"],
            "diffuser_sources": ["El País", "La Vanguardia"],
            "representative_titles": ["Sin datos reales disponibles"],
            "dominant_emotion": "frustration",
            "frame_type": "social",
            "lifecycle": "growing",
            "velocity": "fast",
            "article_count": 0,
            "possible_coordination": False,
            "counter_narrative": "Iniciar análisis de medios para generar narrativas reales",
            "recommended_action": "Conectar fuentes de medios para activar el motor de narrativas",
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "is_demo": True,
        }
    ]


def _persist_narratives(narratives: list[dict], tenant_id: str) -> None:
    """Persiste narrativas en DB si disponible. Falla silenciosamente."""
    try:
        from db.session import get_raw_conn

        conn = get_raw_conn()
        if conn is None:
            return
        with conn.cursor() as cur:
            for n in narratives:
                cur.execute(
                    """
                    INSERT INTO narrative_clusters
                      (cluster_id, frame_label, frame_description, central_claim,
                       article_count, lifecycle, velocity, dominant_emotion,
                       representative_titles, updated_at, tenant_id)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT (cluster_id) DO UPDATE SET
                      frame_label=EXCLUDED.frame_label,
                      article_count=EXCLUDED.article_count,
                      lifecycle=EXCLUDED.lifecycle,
                      updated_at=EXCLUDED.updated_at
                    """,
                    (
                        n["cluster_id"],
                        n["frame_label"][:200],
                        n.get("frame_description", "")[:500],
                        n.get("central_claim", "")[:500],
                        n.get("article_count", 0),
                        n.get("lifecycle", "emerging"),
                        n.get("velocity", "normal"),
                        n.get("dominant_emotion", "neutral"),
                        json.dumps(n.get("representative_titles", []))[:1000],
                        n.get("updated_at"),
                        tenant_id,
                    ),
                )
            conn.commit()
    except Exception as exc:
        log.debug("persist_narratives DB error: %s", exc)


def _set_narrative_cache(narratives: list[dict]) -> None:
    """Actualiza la caché global de narrativas."""
    global _NARRATIVE_CLUSTERS
    _NARRATIVE_CLUSTERS = narratives


def get_cached_narratives() -> list[dict]:
    """Retorna copia de las narrativas actualmente cacheadas en memoria."""
    return _NARRATIVE_CLUSTERS.copy()


def validate_narrative(n: dict) -> bool:
    """Valida que una narrativa tiene los campos mínimos de calidad."""
    generic_labels = {"política", "economía", "deportes", "noticias"}
    return (
        bool(n.get("frame_label"))
        and bool(n.get("central_claim"))
        and n.get("article_count", 0) >= 3
        and n.get("frame_label", "").lower() not in generic_labels
    )
