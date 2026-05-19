"""Analyst persistent memory · tabla analyst_memory con pg_trgm para retrieval.

Revision ID: 0064
Revises: 0063
Create Date: 2026-05-18

Memoria persistente del analista (Pilar 3 de VISION_2027.md §7.3):

  analyst_memory · cada interacción significativa del analista con el brain
                   o cada nota relevante del workspace se guarda como una
                   memoria recuperable.

Diseño sin pgvector (extensión opcional · puede no estar disponible en
todos los Postgres de cliente). Retrieval híbrido:

  1. Filtros exactos: user_id + kind + tags overlap
  2. Trigram similarity (extensión pg_trgm · estándar Postgres)
  3. Recency boost · sort por (similarity * 0.7 + recency * 0.3)

Cuando los embeddings reales (pgvector + sentence-transformers) sean
viables, se añade una columna `embedding vector(384)` sin romper el
modelo · ambos métodos pueden coexistir.
"""

from alembic import op

revision = "0064"
down_revision = "0063"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1) Extensión pg_trgm para similarity search (estándar Postgres)
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2) Tabla analyst_memory
    op.execute("""
        CREATE TABLE IF NOT EXISTS analyst_memory (
            id              BIGSERIAL PRIMARY KEY,
            user_id         TEXT NOT NULL,
            kind            TEXT NOT NULL DEFAULT 'note',
                            -- note · brain_query · brain_response · investigation_event
                            -- artifact_snapshot · workflow_output · external_doc
            title           TEXT NOT NULL DEFAULT '',
            content         TEXT NOT NULL,
            content_summary TEXT DEFAULT '',
            tags            TEXT[] DEFAULT ARRAY[]::TEXT[],
            entity_refs     BIGINT[] DEFAULT ARRAY[]::BIGINT[],
            investigation_id BIGINT REFERENCES investigations(id) ON DELETE SET NULL,
            source          TEXT DEFAULT 'manual',
            confidence      REAL DEFAULT 1.0,
            payload         JSONB DEFAULT '{}'::jsonb,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            last_accessed   TIMESTAMPTZ DEFAULT NOW(),
            access_count    INTEGER DEFAULT 0,
            -- Reserva para pgvector cuando esté disponible
            embedding_text  TEXT  -- versión normalizada para embeddings futuros
        )
    """)

    # 3) Índices
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_user ON analyst_memory(user_id, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_kind ON analyst_memory(kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_tags ON analyst_memory USING GIN (tags)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_entity_refs ON analyst_memory USING GIN (entity_refs)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_investigation ON analyst_memory(investigation_id) WHERE investigation_id IS NOT NULL")
    # Trigram index sobre content para búsqueda por similitud rápida
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_content_trgm ON analyst_memory USING GIN (content gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_analyst_memory_title_trgm ON analyst_memory USING GIN (title gin_trgm_ops)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS analyst_memory CASCADE")
    # No tocamos pg_trgm porque otras tablas (potencialmente) lo usan
