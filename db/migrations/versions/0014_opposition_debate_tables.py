"""Tablas complementarias de bloque 2 para simulacion y posicionamiento.

Revision ID: 0014_opposition_debate_tables
Revises: 0013_prensa_radar_views
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0014_opposition_debate_tables"
down_revision: Union[str, None] = "0013_prensa_radar_views"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS simulaciones_debate (
            id BIGSERIAL PRIMARY KEY,
            cliente_id INTEGER NULL,
            partido_propio TEXT NOT NULL,
            partido_rival TEXT NOT NULL,
            tema TEXT NOT NULL,
            formato TEXT DEFAULT 'debate_televisivo',
            prompt_contexto JSONB DEFAULT '{}'::jsonb,
            resultado_llm TEXT,
            tipo_output TEXT DEFAULT 'guion',
            tokens_usados INTEGER,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_sim_debate_cliente ON simulaciones_debate (cliente_id, creado_en DESC);"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS posicionamiento_rival (
            id BIGSERIAL PRIMARY KEY,
            partido TEXT NOT NULL,
            tema TEXT NOT NULL,
            fecha_inicio DATE,
            fecha_fin DATE,
            posicion_texto TEXT,
            eje_x FLOAT,
            eje_y FLOAT,
            confianza FLOAT,
            n_declaraciones INTEGER,
            cliente_id INTEGER NULL,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_pos_rival_partido_tema
        ON posicionamiento_rival (partido, tema, fecha_fin DESC);
        """
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS posicionamiento_rival;")
    op.execute("DROP TABLE IF EXISTS simulaciones_debate;")

