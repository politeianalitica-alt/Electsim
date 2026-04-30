"""Tablas para la Intelligence Layer (Bloque 4).

Crea:
  risk_snapshots       — serie temporal de risk_index por cliente (TimescaleDB hypertable)
  intelligence_briefings — briefings matutinos generados
  impact_assessments   — evaluaciones de impacto por objeto+cliente
  narrative_clusters   — metadatos de clusters etiquetados (espejo de ontologia)

Revision ID: 0024_intelligence_layer
Revises: 0023_market_code_clientes
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0024_intelligence_layer"
down_revision: Union[str, None] = "0023_market_code_clientes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(name: str) -> bool:
    conn = op.get_bind()
    return conn.dialect.has_table(conn, name)


def upgrade() -> None:
    # -----------------------------------------------------------------------
    # risk_snapshots — serie temporal de riesgo por cliente
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS risk_snapshots (
            id              BIGSERIAL,
            client_id       TEXT        NOT NULL,
            risk_index      FLOAT       NOT NULL CHECK (risk_index >= 0 AND risk_index <= 100),
            components      JSONB       NOT NULL DEFAULT '{}',
            narrative       TEXT,
            computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (id, computed_at)
        )
    """)

    # Convertir a hypertable TimescaleDB si esta disponible
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
            ) AND NOT EXISTS (
                SELECT 1 FROM timescaledb_information.hypertables
                WHERE hypertable_name = 'risk_snapshots'
            ) THEN
                PERFORM create_hypertable(
                    'risk_snapshots', 'computed_at',
                    if_not_exists => TRUE,
                    migrate_data   => TRUE
                );
            END IF;
        END
        $$;
    """)

    # Indices para queries frecuentes
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_risk_snapshots_client_time
        ON risk_snapshots (client_id, computed_at DESC)
    """)

    # -----------------------------------------------------------------------
    # intelligence_briefings — briefings matutinos
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS intelligence_briefings (
            id              BIGSERIAL PRIMARY KEY,
            client_id       TEXT        NOT NULL,
            market_code     TEXT        NOT NULL DEFAULT 'spain',
            date            DATE        NOT NULL,
            executive_summary TEXT,
            key_changes     JSONB       NOT NULL DEFAULT '[]',
            sections        JSONB       NOT NULL DEFAULT '[]',
            risk_delta      FLOAT,
            generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (client_id, date)
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_intelligence_briefings_client_date
        ON intelligence_briefings (client_id, date DESC)
    """)

    # -----------------------------------------------------------------------
    # impact_assessments — evaluaciones de impacto
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS impact_assessments (
            id              BIGSERIAL PRIMARY KEY,
            client_id       TEXT        NOT NULL,
            object_type     TEXT        NOT NULL,
            object_id       TEXT        NOT NULL,
            impact_score    FLOAT       NOT NULL CHECK (impact_score >= 0 AND impact_score <= 1),
            impact_dimension JSONB      NOT NULL DEFAULT '{}',
            rationale_markdown TEXT     NOT NULL DEFAULT '',
            assessed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (client_id, object_type, object_id)
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_impact_assessments_client
        ON impact_assessments (client_id, impact_score DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_impact_assessments_object
        ON impact_assessments (object_type, object_id)
    """)

    # -----------------------------------------------------------------------
    # narrative_clusters — metadatos de narrativas etiquetadas
    # (complementa a la tabla en la ontologia)
    # -----------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS narrative_clusters (
            id              BIGSERIAL PRIMARY KEY,
            cluster_id      TEXT        NOT NULL UNIQUE,
            label           TEXT        NOT NULL,
            description     TEXT        NOT NULL DEFAULT '',
            threat_level    TEXT        NOT NULL DEFAULT 'ruido'
                            CHECK (threat_level IN ('ruido', 'emergente', 'crisis')),
            supporting_examples JSONB   NOT NULL DEFAULT '[]',
            entity_mentions JSONB       NOT NULL DEFAULT '[]',
            labeled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_narrative_clusters_threat
        ON narrative_clusters (threat_level, updated_at DESC)
    """)

    # -----------------------------------------------------------------------
    # Columna activo en clientes (si no existe)
    # -----------------------------------------------------------------------
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clientes')
            AND NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'clientes' AND column_name = 'activo'
            ) THEN
                ALTER TABLE clientes ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
            END IF;
        END
        $$;
    """)

    # -----------------------------------------------------------------------
    # Nuevo tipo de objeto en ontologia (si la tabla existe)
    # -----------------------------------------------------------------------
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'ontology_object_type'
            ) THEN
                INSERT INTO ontology_object_type (code, display_name, description)
                VALUES
                    ('analysis_result', 'Resultado de Analisis',
                     'Output de los servicios de intelligence: briefing, riesgo, impacto'),
                    ('risk_snapshot', 'Snapshot de Riesgo',
                     'Instantanea del risk index de un cliente')
                ON CONFLICT (code) DO NOTHING;
            END IF;
        END
        $$;
    """)

    # Nuevos tipos de relacion para intelligence
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'ontology_relation_type'
            ) THEN
                INSERT INTO ontology_relation_type (code, display_name, description, is_directed)
                VALUES
                    ('AFFECTS_CLIENT', 'Afecta a cliente',
                     'Un objeto del grafo tiene impacto sobre un cliente', TRUE),
                    ('HAS_ANALYSIS', 'Tiene analisis',
                     'Un objeto tiene un resultado de analisis asociado', TRUE),
                    ('HAS_NARRATIVE', 'Pertenece a narrativa',
                     'Un documento pertenece a un cluster de narrativa', TRUE)
                ON CONFLICT (code) DO NOTHING;
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS narrative_clusters CASCADE")
    op.execute("DROP TABLE IF EXISTS impact_assessments CASCADE")
    op.execute("DROP TABLE IF EXISTS intelligence_briefings CASCADE")
    op.execute("DROP TABLE IF EXISTS risk_snapshots CASCADE")
    # No eliminar columna activo de clientes ni tipos de ontologia (no-destructivo)
