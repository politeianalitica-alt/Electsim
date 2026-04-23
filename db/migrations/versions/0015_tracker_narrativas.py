"""tracker_narrativas tables.

Revision ID: 0015_tracker_narrativas
Revises: 0014_opposition_debate_tables
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0015_tracker_narrativas"
down_revision: Union[str, None] = "0014_opposition_debate_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='tags_contenido'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='tags_contenido' AND column_name='objeto_id'
                ) THEN
                    ALTER TABLE tags_contenido ADD COLUMN objeto_id INTEGER;
                END IF;
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='tags_contenido'
            ) AND EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema='public' AND table_name='objetos_seguimiento'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints
                    WHERE table_schema='public'
                      AND table_name='tags_contenido'
                      AND constraint_name='fk_tags_contenido_objeto_id'
                ) THEN
                    ALTER TABLE tags_contenido
                    ADD CONSTRAINT fk_tags_contenido_objeto_id
                    FOREIGN KEY (objeto_id) REFERENCES objetos_seguimiento(id)
                    ON DELETE SET NULL;
                END IF;
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_tags_contenido_objeto_id
        ON tags_contenido (objeto_id);
        """
    )

    op.create_table(
        "serie_temporal_objeto",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("objeto_id", sa.Integer(), sa.ForeignKey("objetos_seguimiento.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("canal", sa.Text(), nullable=False),
        sa.Column("n_menciones", sa.Integer(), server_default=sa.text("0")),
        sa.Column("sentiment_medio", sa.Float(), nullable=True),
        sa.Column("sentiment_min", sa.Float(), nullable=True),
        sa.Column("sentiment_max", sa.Float(), nullable=True),
        sa.Column("alcance_total", sa.BigInteger(), server_default=sa.text("0")),
        sa.Column("tono_ataque", sa.Integer(), server_default=sa.text("0")),
        sa.Column("tono_defensa", sa.Integer(), server_default=sa.text("0")),
        sa.Column("tono_propuesta", sa.Integer(), server_default=sa.text("0")),
        sa.Column("actualizado_en", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
        sa.UniqueConstraint("objeto_id", "fecha", "canal", name="uq_serie_objeto_fecha_canal"),
    )
    op.create_index(
        "idx_serie_objeto_fecha",
        "serie_temporal_objeto",
        ["objeto_id", "fecha", "canal"],
    )

    op.create_table(
        "alertas_tracker",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("objeto_id", sa.Integer(), sa.ForeignKey("objetos_seguimiento.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo_alerta", sa.Text(), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=False),
        sa.Column("valor_detectado", sa.Float(), nullable=True),
        sa.Column("umbral", sa.Float(), nullable=True),
        sa.Column("canal", sa.Text(), nullable=True),
        sa.Column("leida", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("fecha_alerta", sa.DateTime(timezone=True), server_default=sa.text("NOW()")),
    )
    op.create_index(
        "idx_alertas_tracker_obj_leida",
        "alertas_tracker",
        ["objeto_id", "leida", "fecha_alerta"],
    )


def downgrade() -> None:
    op.drop_index("idx_alertas_tracker_obj_leida", table_name="alertas_tracker")
    op.drop_table("alertas_tracker")

    op.drop_index("idx_serie_objeto_fecha", table_name="serie_temporal_objeto")
    op.drop_table("serie_temporal_objeto")

    op.execute("DROP INDEX IF EXISTS idx_tags_contenido_objeto_id")

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE table_schema='public'
                  AND table_name='tags_contenido'
                  AND constraint_name='fk_tags_contenido_objeto_id'
            ) THEN
                ALTER TABLE tags_contenido
                DROP CONSTRAINT fk_tags_contenido_objeto_id;
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='tags_contenido' AND column_name='objeto_id'
            ) THEN
                ALTER TABLE tags_contenido DROP COLUMN objeto_id;
            END IF;
        END $$;
        """
    )
