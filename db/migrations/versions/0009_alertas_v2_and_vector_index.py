"""Alertas v2 + índice vectorial condicional post-ingesta.

Revision ID: 0009_alertas_v2_and_vector_index
Revises: 0008_ontology_aip_foundations
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0009_alertas_v2_and_vector_index"
down_revision: Union[str, None] = "0008_ontology_aip_foundations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE alertas_sistema ADD COLUMN IF NOT EXISTS pagina_relevante VARCHAR(64)")
    op.execute("ALTER TABLE alertas_sistema ADD COLUMN IF NOT EXISTS valor_actual NUMERIC(12,4)")
    op.execute("ALTER TABLE alertas_sistema ADD COLUMN IF NOT EXISTS valor_anterior NUMERIC(12,4)")
    op.execute("ALTER TABLE alertas_sistema ADD COLUMN IF NOT EXISTS fuente VARCHAR(128)")

    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alertas_sistema_pagina_leida "
        "ON alertas_sistema (pagina_relevante, leida)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_alertas_sistema_severidad_leida "
        "ON alertas_sistema (severidad, leida)"
    )

    # Evitar índices IVFFlat creados en tablas vacías.
    op.execute("DROP INDEX IF EXISTS idx_posts_embedding_ivfflat")
    op.execute("DROP INDEX IF EXISTS idx_posts_redes_embedding_ivfflat")
    op.execute(
        """
        DO $$
        BEGIN
            IF (SELECT COUNT(*) FROM posts_redes_sociales) > 5000 THEN
                CREATE INDEX IF NOT EXISTS idx_posts_embedding_ivfflat
                ON posts_redes_sociales USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100);
            ELSE
                RAISE NOTICE 'IVFFlat index skipped: posts_redes_sociales insuficiente para centroides';
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_alertas_sistema_severidad_leida")
    op.execute("DROP INDEX IF EXISTS ix_alertas_sistema_pagina_leida")
    op.execute("ALTER TABLE alertas_sistema DROP COLUMN IF EXISTS fuente")
    op.execute("ALTER TABLE alertas_sistema DROP COLUMN IF EXISTS valor_anterior")
    op.execute("ALTER TABLE alertas_sistema DROP COLUMN IF EXISTS valor_actual")
    op.execute("ALTER TABLE alertas_sistema DROP COLUMN IF EXISTS pagina_relevante")
