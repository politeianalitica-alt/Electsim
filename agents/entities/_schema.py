"""SQL declarativo de las tablas de ontología + investigations.

Idéntico al de la migración 0063 (CREATE TABLE IF NOT EXISTS · idempotente).
Compartido entre la migración Alembic y la función `ensure_tables()` que
el repositorio invoca en su primer uso, evitando que el operador tenga
que correr `alembic upgrade head` manualmente.

Patrón replicado del módulo `fichas` que ya funciona en producción.
"""
from __future__ import annotations

import logging
import threading
from typing import Any

from sqlalchemy import text as sql_text

logger = logging.getLogger(__name__)


_DDL_ENTITIES = """
CREATE TABLE IF NOT EXISTS entities (
    id           BIGSERIAL PRIMARY KEY,
    kind         TEXT NOT NULL,
    slug         TEXT NOT NULL,
    qid          TEXT,
    display_name TEXT NOT NULL,
    aliases      TEXT[] DEFAULT ARRAY[]::TEXT[],
    payload      JSONB DEFAULT '{}'::jsonb,
    tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
    confidence   REAL DEFAULT 1.0,
    source       TEXT DEFAULT 'curated',
    valid_from   TIMESTAMPTZ,
    valid_to     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT entities_kind_slug_unique UNIQUE (kind, slug)
)
"""

_DDL_ENTITY_LINKS = """
CREATE TABLE IF NOT EXISTS entity_links (
    id           BIGSERIAL PRIMARY KEY,
    src_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    dst_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    link_kind    TEXT NOT NULL,
    confidence   REAL DEFAULT 1.0,
    evidence_url TEXT,
    evidence_id  BIGINT REFERENCES entities(id) ON DELETE SET NULL,
    payload      JSONB DEFAULT '{}'::jsonb,
    valid_from   TIMESTAMPTZ,
    valid_to     TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT entity_links_unique UNIQUE (src_id, dst_id, link_kind, valid_from)
)
"""

_DDL_INVESTIGATIONS = """
CREATE TABLE IF NOT EXISTS investigations (
    id           BIGSERIAL PRIMARY KEY,
    slug         TEXT NOT NULL UNIQUE,
    title        TEXT NOT NULL,
    description  TEXT DEFAULT '',
    owner_id     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'active',
    tags         TEXT[] DEFAULT ARRAY[]::TEXT[],
    payload      JSONB DEFAULT '{}'::jsonb,
    collaborators TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    archived_at  TIMESTAMPTZ
)
"""

_DDL_INV_PINNED = """
CREATE TABLE IF NOT EXISTS inv_pinned (
    id              BIGSERIAL PRIMARY KEY,
    investigation_id BIGINT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    entity_id       BIGINT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    position        INTEGER NOT NULL DEFAULT 0,
    note            TEXT DEFAULT '',
    pinned_by       TEXT NOT NULL,
    pinned_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT inv_pinned_unique UNIQUE (investigation_id, entity_id)
)
"""

_DDL_INV_ARTIFACTS = """
CREATE TABLE IF NOT EXISTS inv_artifacts (
    id               BIGSERIAL PRIMARY KEY,
    investigation_id BIGINT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    artifact_kind    TEXT NOT NULL,
    title            TEXT DEFAULT '',
    payload          JSONB NOT NULL DEFAULT '{}'::jsonb,
    position         INTEGER NOT NULL DEFAULT 0,
    entity_refs      BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    author_id        TEXT NOT NULL,
    version          INTEGER NOT NULL DEFAULT 1,
    parent_id        BIGINT REFERENCES inv_artifacts(id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    archived_at      TIMESTAMPTZ
)
"""

_DDL_ANALYST_EVENTS = """
CREATE TABLE IF NOT EXISTS analyst_events (
    id               BIGSERIAL PRIMARY KEY,
    investigation_id BIGINT REFERENCES investigations(id) ON DELETE CASCADE,
    actor_id         TEXT NOT NULL,
    verb             TEXT NOT NULL,
    target_kind      TEXT,
    target_id        BIGINT,
    entity_id        BIGINT REFERENCES entities(id) ON DELETE SET NULL,
    payload          JSONB DEFAULT '{}'::jsonb,
    ts               TIMESTAMPTZ DEFAULT NOW()
)
"""

_INDEXES = [
    "CREATE INDEX IF NOT EXISTS ix_entities_kind ON entities(kind)",
    "CREATE INDEX IF NOT EXISTS ix_entities_qid ON entities(qid) WHERE qid IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS ix_entities_display_lower ON entities(LOWER(display_name))",
    "CREATE INDEX IF NOT EXISTS ix_entities_payload ON entities USING GIN (payload)",
    "CREATE INDEX IF NOT EXISTS ix_entities_tags ON entities USING GIN (tags)",
    "CREATE INDEX IF NOT EXISTS ix_entity_links_src ON entity_links(src_id, link_kind)",
    "CREATE INDEX IF NOT EXISTS ix_entity_links_dst ON entity_links(dst_id, link_kind)",
    "CREATE INDEX IF NOT EXISTS ix_entity_links_kind ON entity_links(link_kind)",
    "CREATE INDEX IF NOT EXISTS ix_entity_links_active ON entity_links(src_id, link_kind) WHERE valid_to IS NULL",
    "CREATE INDEX IF NOT EXISTS ix_investigations_owner ON investigations(owner_id)",
    "CREATE INDEX IF NOT EXISTS ix_investigations_status ON investigations(status)",
    "CREATE INDEX IF NOT EXISTS ix_investigations_tags ON investigations USING GIN (tags)",
    "CREATE INDEX IF NOT EXISTS ix_inv_pinned_inv ON inv_pinned(investigation_id, position)",
    "CREATE INDEX IF NOT EXISTS ix_inv_artifacts_inv_kind ON inv_artifacts(investigation_id, artifact_kind, position)",
    "CREATE INDEX IF NOT EXISTS ix_inv_artifacts_entity_refs ON inv_artifacts USING GIN (entity_refs)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_events_inv_ts ON analyst_events(investigation_id, ts DESC)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_events_actor ON analyst_events(actor_id, ts DESC)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_events_entity ON analyst_events(entity_id) WHERE entity_id IS NOT NULL",
]


_TABLES_INITIALIZED = False
_INIT_LOCK = threading.Lock()


def ensure_ontology_tables(engine: Any) -> dict[str, Any]:
    """Crea las tablas de ontología + investigations si no existen.

    Idempotente · una sola vez por proceso (flag de módulo).
    Devuelve dict con estado · útil para el endpoint admin.

    Si el engine es None o falla, devuelve `{"ok": False, "error": ...}`
    sin propagar excepción (resiliencia).
    """
    global _TABLES_INITIALIZED
    if _TABLES_INITIALIZED:
        return {"ok": True, "already_initialized": True}
    if engine is None:
        return {"ok": False, "error": "no_engine"}

    with _INIT_LOCK:
        if _TABLES_INITIALIZED:
            return {"ok": True, "already_initialized": True}
        created: list[str] = []
        try:
            with engine.begin() as conn:
                for ddl, name in (
                    (_DDL_ENTITIES, "entities"),
                    (_DDL_ENTITY_LINKS, "entity_links"),
                    (_DDL_INVESTIGATIONS, "investigations"),
                    (_DDL_INV_PINNED, "inv_pinned"),
                    (_DDL_INV_ARTIFACTS, "inv_artifacts"),
                    (_DDL_ANALYST_EVENTS, "analyst_events"),
                ):
                    conn.execute(sql_text(ddl))
                    created.append(name)
                for idx_sql in _INDEXES:
                    try:
                        conn.execute(sql_text(idx_sql))
                    except Exception as exc:
                        logger.debug("index skip: %s", exc)
            _TABLES_INITIALIZED = True
            logger.info("ontology · %d tablas + %d índices listos", len(created), len(_INDEXES))
            return {"ok": True, "tables_ensured": created, "indexes_ensured": len(_INDEXES)}
        except Exception as exc:
            logger.warning("ensure_ontology_tables falló: %s", exc)
            return {"ok": False, "error": str(exc)[:300], "tables_attempted": created}


def reset_init_flag() -> None:
    """Útil para tests · resetea el flag."""
    global _TABLES_INITIALIZED
    _TABLES_INITIALIZED = False
