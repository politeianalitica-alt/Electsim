"""Tabla data_sources para trazabilidad de oleadas CIS y otras fuentes de datos.

Revision ID: 0020_data_sources_oleadas
Revises: 0019_opposition_core_tables
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0020_data_sources_oleadas"
down_revision: Union[str, None] = "0019_opposition_core_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_sources (
            id              BIGSERIAL PRIMARY KEY,
            fuente          TEXT NOT NULL,
            oleada          TEXT,
            fecha_datos     DATE,
            fecha_carga     TIMESTAMPTZ DEFAULT NOW(),
            n_registros     INTEGER,
            usuario_carga   TEXT,
            hash_fichero    TEXT,
            notas           TEXT,
            activo          BOOLEAN DEFAULT TRUE
        );
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_data_sources_fuente_activo
            ON data_sources (fuente, activo, fecha_carga DESC);
    """)
    op.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_data_sources_fuente_oleada
            ON data_sources (fuente, oleada)
            WHERE oleada IS NOT NULL;
    """)

    # Registro semilla: documenta que los datos actuales son sintéticos
    op.execute("""
        INSERT INTO data_sources (fuente, oleada, fecha_datos, n_registros, usuario_carga, notas, activo)
        VALUES (
            'CIS',
            'sintetico_calibrado',
            '2024-01-01',
            0,
            'sistema',
            'Datos sintéticos calibrados con últimas oleadas publicadas del CIS. Reemplazar con oleada real.',
            TRUE
        )
        ON CONFLICT DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS data_sources;")
