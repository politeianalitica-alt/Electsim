"""Añadir market_code a tabla clientes para preparar multi-mercado.

Revision ID: 0023_market_code_clientes
Revises: 0022_ontology_backfill
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0023_market_code_clientes"
down_revision: Union[str, None] = "0022_ontology_backfill"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Añadir market_code a clientes (si la tabla existe y la columna no)
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'clientes'
            ) THEN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'clientes'
                      AND column_name = 'market_code'
                ) THEN
                    ALTER TABLE clientes
                        ADD COLUMN market_code TEXT NOT NULL DEFAULT 'spain';
                END IF;
            END IF;
        END $$
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'clientes'
            ) AND NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public'
                  AND tablename = 'clientes'
                  AND indexname = 'ix_clientes_market_code'
            ) THEN
                CREATE INDEX ix_clientes_market_code ON clientes (market_code);
            END IF;
        END $$
        """
    )

    # Tabla de mercados disponibles — registro ligero, la fuente de verdad
    # sigue siendo el YAML pero esto permite joins y FK future
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS markets (
            code        TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            locale      TEXT NOT NULL DEFAULT 'es-ES',
            timezone    TEXT NOT NULL DEFAULT 'Europe/Madrid',
            active      BOOLEAN NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    op.execute(
        """
        INSERT INTO markets (code, name, locale, timezone) VALUES
          ('spain',   'España',                'es-ES',  'Europe/Madrid'),
          ('demo-eu', 'Union Europea (demo)',  'en-EU',  'Europe/Brussels')
        ON CONFLICT (code) DO NOTHING
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS markets")
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'clientes'
                  AND column_name = 'market_code'
            ) THEN
                ALTER TABLE clientes DROP COLUMN market_code;
            END IF;
        END $$
        """
    )
