"""
Evidence Pack — construcción de paquetes de evidencia para respuestas del Brain.

Helpers para construir EvidenceItem desde resultados RAG, tools y BD.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from .schemas import EvidenceItem, EvidencePack

logger = logging.getLogger(__name__)


# ── Builders ──────────────────────────────────────────────────────────────────

def evidence_from_rag_result(result: dict[str, Any]) -> EvidenceItem:
    """
    Construye un EvidenceItem desde un resultado de AIEngine.semantic_search.

    El resultado tiene: id, text, metadata, distance (opcional).
    """
    meta = result.get("metadata") or {}
    # Normalizar score: distance → relevance (menor distancia = más relevante)
    distance = result.get("distance")
    score = max(0.0, 1.0 - float(distance or 0)) if distance is not None else None

    return EvidenceItem(
        id=str(result.get("id", ""))[:8] or _short_hash(result.get("text", "")),
        object_type=meta.get("object_type", "rag_document"),
        object_id=meta.get("object_id", meta.get("source_id", "")),
        title=meta.get("title", result.get("text", "")[:80]),
        source=meta.get("source", meta.get("domain", "rag")),
        url=meta.get("url"),
        published_at=_parse_dt(meta.get("published_at")),
        snippet=(result.get("text") or "")[:200],
        score=round(score, 3) if score is not None else None,
        domain=meta.get("domain"),
        metadata={k: v for k, v in meta.items() if k not in ("text",)},
    )


def evidence_from_legal_item(item: dict[str, Any]) -> EvidenceItem:
    """Construye EvidenceItem desde un registro de legal_items (BOE/Congreso)."""
    return EvidenceItem(
        object_type="legal_item",
        object_id=item.get("source_id") or item.get("id", ""),
        title=item.get("title") or item.get("titulo", "—"),
        source=item.get("source", "boe"),
        url=item.get("url_html") or item.get("url"),
        published_at=_parse_dt(item.get("publication_date") or item.get("fecha")),
        snippet=item.get("summary") or "",
        domain="legislativo",
        metadata={
            "impact_level": item.get("impact_level"),
            "legal_rank": item.get("legal_rank"),
            "sectors": item.get("sectors", []),
        },
    )


def evidence_from_media_item(item: dict[str, Any]) -> EvidenceItem:
    """Construye EvidenceItem desde un registro de media_items."""
    return EvidenceItem(
        object_type="media_item",
        object_id=item.get("content_hash") or str(item.get("id", "")),
        title=item.get("title") or item.get("titulo", "—"),
        source=item.get("source", "media"),
        url=item.get("url"),
        published_at=_parse_dt(item.get("published_at")),
        snippet=item.get("summary") or "",
        domain="medios",
        metadata={
            "sentiment_label": item.get("sentiment_label"),
            "narrative_cluster_id": item.get("narrative_cluster_id"),
            "topics": item.get("topics", []),
        },
    )


def evidence_from_narrative(cluster: dict[str, Any]) -> EvidenceItem:
    """Construye EvidenceItem desde un cluster narrativo."""
    return EvidenceItem(
        object_type="narrative_cluster",
        object_id=cluster.get("cluster_id") or cluster.get("id", ""),
        title=cluster.get("nombre") or cluster.get("label", "—"),
        source="narrative_engine",
        url=None,
        snippet=f"Volumen: {cluster.get('volume', 0)} · Tensión: {cluster.get('tension', '—')}",
        domain="medios",
        metadata={
            "marco": cluster.get("marco"),
            "tension": cluster.get("tension"),
            "volume": cluster.get("volume"),
            "sentiment_avg": cluster.get("sentiment_avg"),
        },
    )


def build_evidence_pack(
    query: str,
    rag_results: list[dict[str, Any]] | None = None,
    legal_items: list[dict[str, Any]] | None = None,
    media_items: list[dict[str, Any]] | None = None,
    narrative_clusters: list[dict[str, Any]] | None = None,
    tools_used: list[str] | None = None,
    model_used: str = "",
    provider: str = "",
    confidence: float = 0.0,
    warnings: list[str] | None = None,
) -> EvidencePack:
    """
    Construye un EvidencePack completo desde múltiples fuentes de datos.

    Args:
        query: pregunta del usuario o tarea.
        rag_results: resultados de AIEngine.semantic_search.
        legal_items: ítems BOE/Congreso.
        media_items: artículos de medios.
        narrative_clusters: clusters narrativos activos.
        tools_used: herramientas llamadas en la sesión.
        model_used: modelo LLM utilizado.
        provider: proveedor del modelo.
        confidence: confianza estimada [0,1].
        warnings: avisos para el usuario.

    Returns:
        EvidencePack con todas las evidencias.
    """
    evidence: list[EvidenceItem] = []

    for r in (rag_results or []):
        try:
            evidence.append(evidence_from_rag_result(r))
        except Exception as exc:
            logger.debug("evidence_from_rag_result: %s", exc)

    for li in (legal_items or []):
        try:
            evidence.append(evidence_from_legal_item(li))
        except Exception as exc:
            logger.debug("evidence_from_legal_item: %s", exc)

    for mi in (media_items or []):
        try:
            evidence.append(evidence_from_media_item(mi))
        except Exception as exc:
            logger.debug("evidence_from_media_item: %s", exc)

    for nc in (narrative_clusters or []):
        try:
            evidence.append(evidence_from_narrative(nc))
        except Exception as exc:
            logger.debug("evidence_from_narrative: %s", exc)

    return EvidencePack(
        query=query,
        evidence=evidence,
        tools_used=tools_used or [],
        model_used=model_used,
        provider=provider,
        confidence=min(max(confidence, 0.0), 1.0),
        warnings=warnings or [],
    )


# ── Helpers internos ──────────────────────────────────────────────────────────

def _short_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="ignore")).hexdigest()[:8]


def _parse_dt(raw: Any) -> datetime | None:
    if raw is None:
        return None
    if isinstance(raw, datetime):
        return raw
    try:
        import pandas as pd
        dt = pd.to_datetime(raw, errors="coerce")
        if pd.isna(dt):
            return None
        return dt.to_pydatetime()
    except Exception:
        return None
