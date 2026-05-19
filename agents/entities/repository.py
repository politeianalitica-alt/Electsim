"""EntityRepository · acceso a la capa entities + entity_links.

Implementación con SQL directo via SQLAlchemy text(). No usamos ORM porque:
  1. La tabla `entities.payload` es jsonb libre — el ORM aporta poco.
  2. Queremos control fino sobre los índices que se usan.
  3. La migración es separada · los modelos viven solo aquí.

El repositorio es thread-safe (cada llamada abre/cierra su propia conexión
via context manager) y opera sobre el engine global del proyecto.

Idempotencia:
  - `upsert` por (kind, slug): si existe, actualiza display_name/payload/tags;
    si no, inserta. Útil para backfill desde catálogos curados.
  - `add_link` por (src, dst, link_kind, valid_from): mismo principio.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy import text as sql_text

from agents.entities.schemas import (
    Entity, EntityCreate, EntityUpdate, EntityLink, EntityLinkCreate,
    EntitySummary, EntitySearchResult, EntityKind, LinkKind,
)
from agents.entities.resolver import slugify, normalize_aliases

logger = logging.getLogger(__name__)


def _get_engine():
    """Obtiene el engine global · None si no hay BD configurada (tests)."""
    try:
        from db.session import get_engine
        return get_engine()
    except Exception as exc:
        logger.debug("entities.repository: get_engine failed: %s", exc)
        return None


# ─────────────────────────────────────────────────────────────────
# Repository
# ─────────────────────────────────────────────────────────────────

class EntityRepository:
    """Acceso CRUD + búsqueda a entities + entity_links."""

    def __init__(self, engine=None) -> None:
        self.engine = engine or _get_engine()

    # ── helpers ──────────────────────────────────────────────────
    def _ensure_engine(self):
        if self.engine is None:
            self.engine = _get_engine()
        if self.engine is None:
            raise RuntimeError("EntityRepository: no engine (DATABASE_URL?)")
        return self.engine

    @staticmethod
    def _row_to_entity(row: Any) -> Entity:
        m = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        # aliases / tags llegan como list[str] de Postgres
        m["aliases"] = list(m.get("aliases") or [])
        m["tags"] = list(m.get("tags") or [])
        m["payload"] = dict(m.get("payload") or {})
        return Entity.model_validate(m)

    @staticmethod
    def _row_to_summary(row: Any) -> EntitySummary:
        m = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        m["tags"] = list(m.get("tags") or [])
        return EntitySummary.model_validate(m)

    @staticmethod
    def _row_to_link(row: Any) -> EntityLink:
        m = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        m["payload"] = dict(m.get("payload") or {})
        return EntityLink.model_validate(m)

    # ── CRUD ────────────────────────────────────────────────────
    def upsert(self, data: EntityCreate) -> Entity:
        """Crea o actualiza una entity por (kind, slug). Devuelve la entity final."""
        engine = self._ensure_engine()
        aliases = normalize_aliases(data.aliases)
        with engine.begin() as conn:
            row = conn.execute(
                sql_text("""
                    INSERT INTO entities
                        (kind, slug, qid, display_name, aliases, payload, tags,
                         confidence, source, valid_from, valid_to)
                    VALUES (:kind, :slug, :qid, :display_name, :aliases, CAST(:payload AS JSONB), :tags,
                            :confidence, :source, :valid_from, :valid_to)
                    ON CONFLICT (kind, slug) DO UPDATE SET
                        qid          = COALESCE(EXCLUDED.qid, entities.qid),
                        display_name = EXCLUDED.display_name,
                        aliases      = EXCLUDED.aliases,
                        payload      = entities.payload || EXCLUDED.payload,
                        tags         = (
                            SELECT array_agg(DISTINCT t)
                            FROM unnest(entities.tags || EXCLUDED.tags) AS t
                        ),
                        confidence   = GREATEST(entities.confidence, EXCLUDED.confidence),
                        valid_from   = COALESCE(EXCLUDED.valid_from, entities.valid_from),
                        valid_to     = COALESCE(EXCLUDED.valid_to, entities.valid_to),
                        updated_at   = NOW()
                    RETURNING *
                """),
                {
                    "kind": data.kind,
                    "slug": data.slug,
                    "qid": data.qid,
                    "display_name": data.display_name,
                    "aliases": aliases,
                    "payload": _json_dumps(data.payload or {}),
                    "tags": list(data.tags or []),
                    "confidence": data.confidence,
                    "source": data.source,
                    "valid_from": data.valid_from,
                    "valid_to": data.valid_to,
                },
            ).first()
        return self._row_to_entity(row)

    def update(self, entity_id: int, patch: EntityUpdate) -> Entity | None:
        engine = self._ensure_engine()
        sets: list[str] = []
        params: dict[str, Any] = {"id": entity_id}
        for field, value in patch.model_dump(exclude_unset=True).items():
            if field == "payload" and value is not None:
                sets.append("payload = entities.payload || CAST(:payload AS JSONB)")
                params["payload"] = _json_dumps(value)
                continue
            sets.append(f"{field} = :{field}")
            params[field] = value
        if not sets:
            return self.get(entity_id)
        sets.append("updated_at = NOW()")
        sql = f"UPDATE entities SET {', '.join(sets)} WHERE id = :id RETURNING *"
        with engine.begin() as conn:
            row = conn.execute(sql_text(sql), params).first()
        return self._row_to_entity(row) if row else None

    def delete(self, entity_id: int) -> bool:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            r = conn.execute(
                sql_text("DELETE FROM entities WHERE id = :id"),
                {"id": entity_id},
            )
        return bool(r.rowcount)

    def get(self, entity_id: int) -> Entity | None:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            row = conn.execute(
                sql_text("SELECT * FROM entities WHERE id = :id"),
                {"id": entity_id},
            ).first()
        return self._row_to_entity(row) if row else None

    def get_by_qid(self, qid: str) -> Entity | None:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            row = conn.execute(
                sql_text("SELECT * FROM entities WHERE qid = :qid LIMIT 1"),
                {"qid": qid},
            ).first()
        return self._row_to_entity(row) if row else None

    def get_by_kind_slug(self, kind: str, slug: str) -> Entity | None:
        engine = self._ensure_engine()
        with engine.connect() as conn:
            row = conn.execute(
                sql_text("SELECT * FROM entities WHERE kind = :kind AND slug = :slug"),
                {"kind": kind, "slug": slug},
            ).first()
        return self._row_to_entity(row) if row else None

    # ── List + search ────────────────────────────────────────────
    def list_by_kind(
        self,
        kind: str,
        *,
        limit: int = 50,
        offset: int = 0,
        tags: Iterable[str] | None = None,
    ) -> list[EntitySummary]:
        engine = self._ensure_engine()
        params: dict[str, Any] = {"kind": kind, "limit": limit, "offset": offset}
        sql = "SELECT id, kind, slug, qid, display_name, tags FROM entities WHERE kind = :kind"
        tag_list = list(tags or [])
        if tag_list:
            sql += " AND tags && CAST(:tags AS TEXT[])"
            params["tags"] = tag_list
        sql += " ORDER BY display_name ASC LIMIT :limit OFFSET :offset"
        with engine.connect() as conn:
            rows = conn.execute(sql_text(sql), params).all()
        return [self._row_to_summary(r) for r in rows]

    def search(
        self,
        q: str,
        *,
        kind: str | None = None,
        limit: int = 20,
    ) -> list[EntitySearchResult]:
        """Búsqueda híbrida con scoring simple:
          1.0  match exacto en slug o qid
          0.9  match exacto en display_name (case-insensitive)
          0.7  prefijo en display_name
          0.5  substring en display_name
          0.4  match exacto en alias
          0.3  substring en aliases
        """
        engine = self._ensure_engine()
        if not q or not q.strip():
            return []
        q_norm = q.strip()
        q_lower = q_norm.lower()
        q_slug = slugify(q_norm)
        params: dict[str, Any] = {
            "q_lower": q_lower,
            "q_like": f"%{q_lower}%",
            "q_prefix": f"{q_lower}%",
            "q_slug": q_slug,
            "q_qid": q_norm.upper() if q_norm.upper().startswith("Q") else None,
            "limit": limit,
        }
        kind_filter = ""
        if kind:
            kind_filter = " AND kind = :kind"
            params["kind"] = kind
        sql = f"""
            SELECT id, kind, slug, qid, display_name, tags, aliases,
                   CASE
                     WHEN slug = :q_slug THEN 1.00
                     WHEN qid IS NOT NULL AND qid = :q_qid THEN 1.00
                     WHEN LOWER(display_name) = :q_lower THEN 0.90
                     WHEN LOWER(display_name) LIKE :q_prefix THEN 0.70
                     WHEN LOWER(display_name) LIKE :q_like THEN 0.50
                     WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE LOWER(a) = :q_lower) THEN 0.40
                     WHEN EXISTS (SELECT 1 FROM unnest(aliases) a WHERE LOWER(a) LIKE :q_like) THEN 0.30
                     ELSE 0.10
                   END AS score
            FROM entities
            WHERE (
                slug = :q_slug OR
                (qid IS NOT NULL AND qid = :q_qid) OR
                LOWER(display_name) LIKE :q_like OR
                EXISTS (SELECT 1 FROM unnest(aliases) a WHERE LOWER(a) LIKE :q_like)
            ){kind_filter}
            ORDER BY score DESC, display_name ASC
            LIMIT :limit
        """
        with engine.connect() as conn:
            rows = conn.execute(sql_text(sql), params).all()

        results: list[EntitySearchResult] = []
        for r in rows:
            m = dict(r._mapping)
            score = float(m.pop("score", 0.0))
            matched_via = self._infer_match_kind(m, q_lower, q_slug, params.get("q_qid"))
            summary = self._row_to_summary(r)
            results.append(EntitySearchResult(
                entity=summary, score=score, matched_via=matched_via,
            ))
        return results

    @staticmethod
    def _infer_match_kind(m: dict, q_lower: str, q_slug: str, q_qid: str | None) -> str:
        if m.get("slug") == q_slug:
            return "slug"
        if q_qid and m.get("qid") == q_qid:
            return "qid"
        if (m.get("display_name") or "").lower() == q_lower:
            return "display_name"
        if q_lower in (m.get("display_name") or "").lower():
            return "display_name"
        aliases = [a.lower() for a in (m.get("aliases") or [])]
        if q_lower in aliases:
            return "alias"
        if any(q_lower in a for a in aliases):
            return "alias"
        return "display_name"

    # ── Links ───────────────────────────────────────────────────
    def add_link(self, link: EntityLinkCreate) -> EntityLink:
        engine = self._ensure_engine()
        with engine.begin() as conn:
            row = conn.execute(
                sql_text("""
                    INSERT INTO entity_links
                        (src_id, dst_id, link_kind, confidence, evidence_url,
                         evidence_id, payload, valid_from, valid_to)
                    VALUES (:src, :dst, :kind, :conf, :url, :eid,
                            CAST(:payload AS JSONB), :vf, :vt)
                    ON CONFLICT (src_id, dst_id, link_kind, valid_from) DO UPDATE SET
                        confidence   = GREATEST(entity_links.confidence, EXCLUDED.confidence),
                        evidence_url = COALESCE(EXCLUDED.evidence_url, entity_links.evidence_url),
                        payload      = entity_links.payload || EXCLUDED.payload,
                        valid_to     = COALESCE(EXCLUDED.valid_to, entity_links.valid_to)
                    RETURNING *
                """),
                {
                    "src": link.src_id, "dst": link.dst_id,
                    "kind": link.link_kind, "conf": link.confidence,
                    "url": link.evidence_url, "eid": link.evidence_id,
                    "payload": _json_dumps(link.payload or {}),
                    "vf": link.valid_from, "vt": link.valid_to,
                },
            ).first()
        return self._row_to_link(row)

    def get_links(
        self,
        entity_id: int,
        *,
        direction: str = "outgoing",  # "outgoing" | "incoming" | "both"
        link_kind: str | None = None,
        active_only: bool = False,
    ) -> list[EntityLink]:
        engine = self._ensure_engine()
        clauses: list[str] = []
        params: dict[str, Any] = {"id": entity_id}
        if direction == "outgoing":
            clauses.append("src_id = :id")
        elif direction == "incoming":
            clauses.append("dst_id = :id")
        else:
            clauses.append("(src_id = :id OR dst_id = :id)")
        if link_kind:
            clauses.append("link_kind = :kind")
            params["kind"] = link_kind
        if active_only:
            clauses.append("(valid_to IS NULL OR valid_to > NOW())")
        sql = f"SELECT * FROM entity_links WHERE {' AND '.join(clauses)} ORDER BY created_at DESC LIMIT 500"
        with engine.connect() as conn:
            rows = conn.execute(sql_text(sql), params).all()
        return [self._row_to_link(r) for r in rows]


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────

def _json_dumps(d: dict[str, Any]) -> str:
    import json
    return json.dumps(d, ensure_ascii=False)


# Singleton conveniente
_REPO_SINGLETON: EntityRepository | None = None


def get_entity_repository() -> EntityRepository:
    """Devuelve un EntityRepository singleton (lazy)."""
    global _REPO_SINGLETON
    if _REPO_SINGLETON is None:
        _REPO_SINGLETON = EntityRepository()
    return _REPO_SINGLETON


def reset_entity_repository() -> None:
    """Reset · útil para tests."""
    global _REPO_SINGLETON
    _REPO_SINGLETON = None
