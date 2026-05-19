"""AnalystMemoryRepository · CRUD + hybrid retrieval sobre analyst_memory.

Scoring híbrido cuando se busca por texto:
  - trigram similarity sobre content + title (extensión pg_trgm)
  - bonus por tags compartidos
  - bonus por entity_refs compartidos
  - bonus por mismo investigation_id
  - recency decay · memorias más recientes pesan más

Score final = w_trigram * sim + w_tags * tag_overlap + w_ent * ent_overlap
            + w_inv * same_inv + w_recency * recency_decay

Pesos elegidos para que ningún factor domine en exceso · iterables.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text as sql_text

from agents.memory.schemas import (
    MemoryEntry, MemoryCreate, MemorySearchResult, MemoryStats, MemoryKind,
)

logger = logging.getLogger(__name__)


# Pesos de scoring · sum = 1.0
W_TRIGRAM = 0.40
W_TAGS = 0.20
W_ENT = 0.20
W_INV = 0.10
W_RECENCY = 0.10


def _get_engine():
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


class AnalystMemoryRepository:
    """CRUD + retrieval para analyst_memory."""

    def __init__(self, engine=None):
        self.engine = engine or _get_engine()

    def _ensure_engine(self):
        if self.engine is None:
            self.engine = _get_engine()
        if self.engine is None:
            raise RuntimeError("AnalystMemoryRepository: no engine")
        # Auto-init de tabla en primer uso (incluye pg_trgm best-effort)
        try:
            from agents.memory._schema import ensure_memory_tables
            ensure_memory_tables(self.engine)
        except Exception as exc:
            logger.debug("auto-init memory: %s", exc)
        return self.engine

    # ─────────────────────────────────────────────────────────────
    # Persist
    # ─────────────────────────────────────────────────────────────
    def store(self, data: MemoryCreate) -> MemoryEntry | None:
        """Guarda una memoria. Devuelve None si tabla no existe (BD fresca)."""
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return None
        try:
            with engine.begin() as conn:
                # Truncado de content para evitar entradas gigantes
                content = data.content[:20000]
                content_summary = data.content_summary[:600] if data.content_summary else (
                    content.split("\n")[0][:200]  # primera línea como fallback
                )
                row = conn.execute(
                    sql_text("""
                        INSERT INTO analyst_memory
                            (user_id, kind, title, content, content_summary,
                             tags, entity_refs, investigation_id, source,
                             confidence, payload, embedding_text)
                        VALUES (:uid, :kind, :title, :content, :summary,
                                :tags, :refs, :inv, :source,
                                :conf, CAST(:payload AS JSONB), :emb_text)
                        RETURNING *
                    """),
                    {
                        "uid": data.user_id,
                        "kind": data.kind,
                        "title": data.title[:240] if data.title else "",
                        "content": content,
                        "summary": content_summary,
                        "tags": list(data.tags or []),
                        "refs": list(data.entity_refs or []),
                        "inv": data.investigation_id,
                        "source": data.source,
                        "conf": data.confidence,
                        "payload": _json_dumps(data.payload or {}),
                        "emb_text": content_summary,  # reservado para embeddings futuros
                    },
                ).first()
        except Exception as exc:
            logger.debug("AnalystMemory.store falló (tabla inexistente?): %s", exc)
            return None
        return _row_to_entry(row)

    # ─────────────────────────────────────────────────────────────
    # Retrieve · search híbrido
    # ─────────────────────────────────────────────────────────────
    def search(
        self,
        *,
        user_id: str,
        query: str = "",
        tags: list[str] | None = None,
        entity_refs: list[int] | None = None,
        investigation_id: int | None = None,
        kinds: list[MemoryKind] | None = None,
        limit: int = 10,
        min_score: float = 0.10,
    ) -> list[MemorySearchResult]:
        """Búsqueda híbrida.

        Resiliente: si pg_trgm no está disponible o la tabla no existe,
        devuelve lista vacía.
        """
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return []

        params: dict[str, Any] = {"uid": user_id, "limit": limit * 3}
        # Cláusulas WHERE
        wheres = ["user_id = :uid"]
        if kinds:
            wheres.append("kind = ANY(:kinds)")
            params["kinds"] = kinds

        # Subquery scoring
        score_parts: list[str] = []
        if query:
            params["q"] = query[:500]
            # similarity es 0-1, pg_trgm función
            score_parts.append(
                f"GREATEST(similarity(content, :q), similarity(COALESCE(title,''), :q)) * {W_TRIGRAM}"
            )
        if tags:
            params["tags"] = list(tags)
            score_parts.append(
                f"(CASE WHEN tags && CAST(:tags AS TEXT[]) "
                f"THEN cardinality(tags & CAST(:tags AS TEXT[]))::float / GREATEST(cardinality(CAST(:tags AS TEXT[])), 1) "
                f"ELSE 0 END) * {W_TAGS}"
            )
        if entity_refs:
            params["refs"] = list(entity_refs)
            score_parts.append(
                f"(CASE WHEN entity_refs && CAST(:refs AS BIGINT[]) "
                f"THEN cardinality(entity_refs & CAST(:refs AS BIGINT[]))::float / GREATEST(cardinality(CAST(:refs AS BIGINT[])), 1) "
                f"ELSE 0 END) * {W_ENT}"
            )
        if investigation_id is not None:
            params["inv"] = investigation_id
            score_parts.append(
                f"(CASE WHEN investigation_id = :inv THEN 1.0 ELSE 0 END) * {W_INV}"
            )
        # Recency decay: e^(-days_old / 60) · memorias <60d siguen pesando
        score_parts.append(
            f"EXP(-1.0 * EXTRACT(EPOCH FROM (NOW() - created_at)) / (60.0 * 86400)) * {W_RECENCY}"
        )

        score_sql = " + ".join(score_parts) if score_parts else "0.0"
        sql = f"""
            SELECT *, ({score_sql}) AS score
            FROM analyst_memory
            WHERE {' AND '.join(wheres)}
            ORDER BY score DESC, created_at DESC
            LIMIT :limit
        """

        try:
            with engine.connect() as conn:
                rows = conn.execute(sql_text(sql), params).all()
        except Exception as exc:
            logger.debug("AnalystMemory.search falló: %s", exc)
            return []

        results: list[MemorySearchResult] = []
        for r in rows:
            m = dict(r._mapping)
            score = float(m.pop("score", 0.0))
            if score < min_score:
                continue
            entry = _row_to_entry_dict(m)
            matched: list[str] = []
            if query and entry:
                matched.append("trigram")
            if tags and set(entry.tags) & set(tags):
                matched.append("tags")
            if entity_refs and set(entry.entity_refs) & set(entity_refs):
                matched.append("entity_refs")
            if investigation_id and entry.investigation_id == investigation_id:
                matched.append("investigation")
            if score > 0:
                matched.append("recency")
            results.append(MemorySearchResult(entry=entry, score=min(1.0, score), matched_via=matched))
            if len(results) >= limit:
                break
        return results

    # ─────────────────────────────────────────────────────────────
    # Recall · helper de alto nivel para el copiloto
    # ─────────────────────────────────────────────────────────────
    def recall_for_query(
        self,
        *,
        user_id: str,
        prompt: str,
        pinned_entity_ids: list[int] | None = None,
        investigation_id: int | None = None,
        limit: int = 5,
    ) -> list[MemorySearchResult]:
        """Devuelve las memorias más relevantes para una consulta del usuario."""
        return self.search(
            user_id=user_id,
            query=prompt,
            entity_refs=pinned_entity_ids,
            investigation_id=investigation_id,
            limit=limit,
            min_score=0.15,
        )

    # ─────────────────────────────────────────────────────────────
    # Lectura simple + actualizaciones de access
    # ─────────────────────────────────────────────────────────────
    def get(self, mem_id: int) -> MemoryEntry | None:
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return None
        try:
            with engine.begin() as conn:
                row = conn.execute(
                    sql_text("""
                        UPDATE analyst_memory
                        SET last_accessed = NOW(), access_count = access_count + 1
                        WHERE id = :id
                        RETURNING *
                    """),
                    {"id": mem_id},
                ).first()
        except Exception:
            return None
        return _row_to_entry(row) if row else None

    def delete(self, mem_id: int, *, user_id: str) -> bool:
        """Solo el owner puede borrar."""
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return False
        try:
            with engine.begin() as conn:
                r = conn.execute(
                    sql_text("DELETE FROM analyst_memory WHERE id = :id AND user_id = :uid"),
                    {"id": mem_id, "uid": user_id},
                )
            return bool(r.rowcount)
        except Exception:
            return False

    def stats(self, user_id: str) -> MemoryStats:
        try:
            engine = self._ensure_engine()
        except RuntimeError:
            return MemoryStats(user_id=user_id, total_memories=0, by_kind={})
        try:
            with engine.connect() as conn:
                rows = conn.execute(
                    sql_text("""
                        SELECT kind, COUNT(*) AS n,
                               MIN(created_at) AS oldest, MAX(created_at) AS newest
                        FROM analyst_memory
                        WHERE user_id = :uid
                        GROUP BY kind
                    """),
                    {"uid": user_id},
                ).all()
        except Exception:
            return MemoryStats(user_id=user_id, total_memories=0, by_kind={})
        total = 0
        by_kind: dict[str, int] = {}
        oldest = newest = None
        for r in rows:
            m = dict(r._mapping)
            kind = m["kind"]
            n = int(m["n"])
            by_kind[kind] = n
            total += n
            if m["oldest"] and (oldest is None or m["oldest"] < oldest):
                oldest = m["oldest"]
            if m["newest"] and (newest is None or m["newest"] > newest):
                newest = m["newest"]
        return MemoryStats(
            user_id=user_id, total_memories=total, by_kind=by_kind,
            oldest=oldest, newest=newest,
        )


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _json_dumps(d: dict[str, Any]) -> str:
    import json
    return json.dumps(d, ensure_ascii=False)


def _row_to_entry(row: Any) -> MemoryEntry:
    m = dict(row._mapping)
    return _row_to_entry_dict(m)


def _row_to_entry_dict(m: dict[str, Any]) -> MemoryEntry:
    m["tags"] = list(m.get("tags") or [])
    m["entity_refs"] = list(m.get("entity_refs") or [])
    m["payload"] = dict(m.get("payload") or {})
    return MemoryEntry.model_validate(m)


_REPO: AnalystMemoryRepository | None = None


def get_memory_repository() -> AnalystMemoryRepository:
    global _REPO
    if _REPO is None:
        _REPO = AnalystMemoryRepository()
    return _REPO


def reset_memory_repository() -> None:
    global _REPO
    _REPO = None
