"""SQL declarativo de analyst_memory · idempotente.

Mismo patrón que `agents/entities/_schema.py` · permite auto-init en
primer uso sin depender de `alembic upgrade head`.
"""
from __future__ import annotations

import logging
import threading
from typing import Any

from sqlalchemy import text as sql_text

logger = logging.getLogger(__name__)


_DDL_ANALYST_MEMORY = """
CREATE TABLE IF NOT EXISTS analyst_memory (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    kind            TEXT NOT NULL DEFAULT 'note',
    title           TEXT NOT NULL DEFAULT '',
    content         TEXT NOT NULL,
    content_summary TEXT DEFAULT '',
    tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
    entity_refs     BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    investigation_id BIGINT,
    source          TEXT DEFAULT 'manual',
    confidence      REAL DEFAULT 1.0,
    payload         JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_accessed   TIMESTAMPTZ DEFAULT NOW(),
    access_count    INTEGER DEFAULT 0,
    embedding_text  TEXT
)
"""

_INDEXES_BASE = [
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_user ON analyst_memory(user_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_kind ON analyst_memory(kind)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_tags ON analyst_memory USING GIN (tags)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_entity_refs ON analyst_memory USING GIN (entity_refs)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_investigation ON analyst_memory(investigation_id) WHERE investigation_id IS NOT NULL",
]

_INDEXES_TRIGRAM = [
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_content_trgm ON analyst_memory USING GIN (content gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS ix_analyst_memory_title_trgm ON analyst_memory USING GIN (title gin_trgm_ops)",
]


_INITIALIZED = False
_LOCK = threading.Lock()


def ensure_memory_tables(engine: Any) -> dict[str, Any]:
    """Crea la tabla analyst_memory + extensión pg_trgm si es posible.

    pg_trgm puede requerir superuser · si falla, la tabla se crea
    igualmente pero los índices trigram se omiten (búsqueda sigue
    funcionando con ILIKE, solo más lenta).
    """
    global _INITIALIZED
    if _INITIALIZED:
        return {"ok": True, "already_initialized": True}
    if engine is None:
        return {"ok": False, "error": "no_engine"}

    with _LOCK:
        if _INITIALIZED:
            return {"ok": True, "already_initialized": True}

        trgm_available = False
        with engine.begin() as conn:
            # 1) Tabla (siempre)
            try:
                conn.execute(sql_text(_DDL_ANALYST_MEMORY))
            except Exception as exc:
                logger.warning("analyst_memory: create table falló · %s", exc)
                return {"ok": False, "error": str(exc)[:300]}
            # 2) Extensión pg_trgm · best-effort
            try:
                conn.execute(sql_text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                trgm_available = True
            except Exception as exc:
                logger.info("pg_trgm no disponible (continuamos sin trigram): %s", exc)
            # 3) Índices base
            for idx_sql in _INDEXES_BASE:
                try:
                    conn.execute(sql_text(idx_sql))
                except Exception as exc:
                    logger.debug("index skip: %s", exc)
            # 4) Índices trigram (solo si pg_trgm está)
            if trgm_available:
                for idx_sql in _INDEXES_TRIGRAM:
                    try:
                        conn.execute(sql_text(idx_sql))
                    except Exception as exc:
                        logger.debug("trgm index skip: %s", exc)

        _INITIALIZED = True
        logger.info("analyst_memory listo · trigram=%s", trgm_available)
        return {
            "ok": True,
            "table": "analyst_memory",
            "trigram_available": trgm_available,
        }


def reset_init_flag() -> None:
    global _INITIALIZED
    _INITIALIZED = False
