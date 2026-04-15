"""Baseline: esquema aplicado vía db/schema.sql (Docker init).

Tras ``docker compose up`` y crear la BD, marque esta revisión sin ejecutar SQL:

    alembic stamp 0001_baseline

Para cambios futuros: edite ``db/models.py`` y ejecute
``alembic revision --autogenerate -m "..."`` seguido de ``alembic upgrade head``.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-04-12
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Vacío: el DDL vive en ``db/schema.sql``."""
    pass


def downgrade() -> None:
    raise NotImplementedError("No revertir baseline; usar backup o recrear volumen Docker.")
