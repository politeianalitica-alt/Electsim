"""Ontology graph: object types, objects, relation types, relations.

Revision ID: 0021_ontology_graph
Revises: 0020_data_sources_oleadas
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

revision: str = "0021_ontology_graph"
down_revision: Union[str, None] = "0020_data_sources_oleadas"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. ontology_object_type
    # ------------------------------------------------------------------
    op.create_table(
        "ontology_object_type",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.Text, nullable=False, unique=True),
        sa.Column("display_name", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
    )

    op.execute(
        """
        INSERT INTO ontology_object_type (code, display_name, description) VALUES
          ('actor',             'Actor',                    'Persona fisica: lider, diputado, empresario, periodista'),
          ('party',             'Partido/Organizacion',     'Organizacion politica o similar'),
          ('norm',              'Norma',                    'Ley, Real Decreto, enmienda u otro acto juridico'),
          ('media_item',        'Noticia/Pieza mediatica',  'Articulo, noticia o post relevante'),
          ('narrative_cluster', 'Narrativa',                'Cluster de piezas mediaticas (BERTopic)'),
          ('poll_snapshot',     'Encuesta/Nowcasting',      'Encuesta o snapshot de nowcasting'),
          ('alert',             'Alerta',                   'Alerta generada por el sistema'),
          ('workspace_object',  'Objeto de Workspace',      'Canvas, drafts, notas, saved searches')
        ON CONFLICT (code) DO NOTHING
        """
    )

    # ------------------------------------------------------------------
    # 2. ontology_object
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")  # gen_random_uuid() fallback

    op.create_table(
        "ontology_object",
        sa.Column(
            "id",
            UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "object_type_id",
            sa.Integer,
            sa.ForeignKey("ontology_object_type.id"),
            nullable=False,
        ),
        sa.Column("external_table", sa.Text, nullable=False),
        sa.Column("external_id", sa.Text, nullable=False),
        sa.Column("properties", JSONB, nullable=False, server_default=sa.text("'{}'::jsonb")),
        # embedding opcional (nomic-embed-text = 768 dims)
        # Se agrega con ADD COLUMN IF NOT EXISTS para evitar error si pgvector no esta activo
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_unique_constraint(
        "uq_ontology_object_source",
        "ontology_object",
        ["external_table", "external_id"],
    )
    op.create_index("ix_ontology_object_type_id", "ontology_object", ["object_type_id"])

    # Columna embedding solo si pgvector esta disponible
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
                ALTER TABLE ontology_object
                    ADD COLUMN IF NOT EXISTS embedding vector(768);
                CREATE INDEX IF NOT EXISTS ix_ontology_object_embedding_hnsw
                    ON ontology_object USING hnsw (embedding vector_cosine_ops)
                    WITH (m = 16, ef_construction = 64);
            END IF;
        END $$
        """
    )

    # Trigger para updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION fn_ontology_object_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_ontology_object_updated_at
        BEFORE UPDATE ON ontology_object
        FOR EACH ROW EXECUTE FUNCTION fn_ontology_object_updated_at()
        """
    )

    # ------------------------------------------------------------------
    # 3. ontology_relation_type
    # ------------------------------------------------------------------
    op.create_table(
        "ontology_relation_type",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("code", sa.Text, nullable=False, unique=True),
        sa.Column("display_name", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("source_type_id", sa.Integer, sa.ForeignKey("ontology_object_type.id")),
        sa.Column("target_type_id", sa.Integer, sa.ForeignKey("ontology_object_type.id")),
    )

    op.execute(
        """
        INSERT INTO ontology_relation_type (code, display_name, description, source_type_id, target_type_id)
        SELECT
            rel.code,
            rel.display_name,
            rel.description,
            s.id AS source_type_id,
            t.id AS target_type_id
        FROM (VALUES
            ('MEMBER_OF',          'Es miembro de',        'Actor es miembro de partido u organizacion',      'actor',             'party'),
            ('MENTIONED_IN',       'Mencionado en',        'Actor mencionado en noticia',                      'actor',             'media_item'),
            ('ORG_MENTIONED_IN',   'Org. mencionada en',   'Partido/org. mencionado en noticia',               'party',             'media_item'),
            ('VOTED_FOR',          'Voto a favor de',      'Actor vota a favor de una norma',                  'actor',             'norm'),
            ('VOTED_AGAINST',      'Voto en contra de',    'Actor vota en contra de una norma',                'actor',             'norm'),
            ('BELONGS_TO_NARRATIVE','Pertenece a narrativa','Noticia pertenece a cluster de narrativa',        'media_item',        'narrative_cluster'),
            ('RELATED_TO_POLL',    'Relacionado con encuesta','Noticia relacionada con encuesta',              'media_item',        'poll_snapshot'),
            ('HAS_ALERT',          'Tiene alerta',         'Objeto de workspace tiene alerta asociada',        'workspace_object',  'alert'),
            ('TRACKED_BY',         'Monitoreado por',      'Actor/partido monitoreado por objeto workspace',   'actor',             'workspace_object'),
            ('CO_MENTIONS',        'Co-mencionado con',    'Actor co-mencionado con otro actor en noticias',   'actor',             'actor')
        ) AS rel(code, display_name, description, source_code, target_code)
        JOIN ontology_object_type s ON s.code = rel.source_code
        JOIN ontology_object_type t ON t.code = rel.target_code
        ON CONFLICT (code) DO NOTHING
        """
    )

    # ------------------------------------------------------------------
    # 4. ontology_relation
    # ------------------------------------------------------------------
    op.create_table(
        "ontology_relation",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "relation_type_id",
            sa.Integer,
            sa.ForeignKey("ontology_relation_type.id"),
            nullable=False,
        ),
        sa.Column(
            "source_object_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ontology_object.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_object_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ontology_object.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("weight", sa.Float),
        sa.Column(
            "evidence_object_id",
            UUID(as_uuid=True),
            sa.ForeignKey("ontology_object.id", ondelete="SET NULL"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
    )

    op.create_unique_constraint(
        "uq_ontology_relation",
        "ontology_relation",
        ["relation_type_id", "source_object_id", "target_object_id"],
    )
    op.create_index("ix_ontology_relation_source", "ontology_relation", ["source_object_id"])
    op.create_index("ix_ontology_relation_target", "ontology_relation", ["target_object_id"])
    op.create_index("ix_ontology_relation_type", "ontology_relation", ["relation_type_id"])


def downgrade() -> None:
    op.drop_table("ontology_relation")
    op.execute("DROP TRIGGER IF EXISTS trg_ontology_object_updated_at ON ontology_object")
    op.execute("DROP FUNCTION IF EXISTS fn_ontology_object_updated_at()")
    op.drop_table("ontology_object")
    op.drop_table("ontology_relation_type")
    op.drop_table("ontology_object_type")
