"""party_positions table (Manifesto Project · Sprint 4 · S4.3)

Tabla con posiciones programáticas comparables de partidos políticos
siguiendo la metodología del Manifesto Project (MARPOR · WZB Berlin).

El Manifesto Project codifica los programas electorales en 56 dimensiones
ideológicas para 1000+ partidos en 50+ países desde 1945. Es la base de
datos académica más usada para comparar posiciones partidarias.

Ejes principales codificados (subset relevante para Politeia):
  - rile: left-right scale (-100 ↔ +100)
  - planeco: planned economy emphasis (0-100)
  - markeco: market economy emphasis (0-100)
  - welfare: welfare state expansion (0-100)
  - eu_pos: pro-EU emphasis (0-100)
  - eu_neg: anti-EU emphasis (0-100)
  - environment: environmental protection (0-100)
  - traditional_morality: traditional values (0-100)
  - law_order: law and order emphasis (0-100)

Dataset oficial: https://manifesto-project.wzb.eu/
API requiere clave gratuita (registro académico).

Politeia carga posiciones seed para 8 partidos ES principales (PP, PSOE, VOX,
Sumar, Podemos, Junts, ERC, PNV) basadas en valores públicos del Manifesto
Project + revisión académica (Polk et al 2017, Bakker et al CHES 2024).

Cuando se obtenga API key, el loader puede descargar el dataset completo
con todos los partidos europeos · `python -m scripts.load_manifesto`.

Revision ID: 0066_party_positions
Revises: 0065_media_reliability
"""
from alembic import op
import sqlalchemy as sa


revision = "0066_party_positions"
down_revision = "0065_media_reliability"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "party_positions",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "party_slug",
            sa.String(length=80),
            nullable=False,
            comment="Slug del partido (ej. 'psoe', 'pp', 'vox', 'sumar')",
        ),
        sa.Column(
            "party_name",
            sa.String(length=240),
            nullable=False,
            comment="Nombre canónico del partido",
        ),
        sa.Column(
            "country",
            sa.String(length=4),
            nullable=False,
            server_default="ESP",
            comment="ISO 3166-1 alpha-3 (ESP/FRA/DEU…)",
        ),
        sa.Column(
            "election_year",
            sa.Integer,
            nullable=False,
            comment="Año de la elección codificada (Manifesto Project · 'edate')",
        ),
        sa.Column(
            "rile",
            sa.Float,
            nullable=True,
            comment="Left-Right scale [-100, +100] · +100=derecha, -100=izquierda",
        ),
        sa.Column(
            "planeco",
            sa.Float,
            nullable=True,
            comment="Planned economy emphasis (0-100)",
        ),
        sa.Column(
            "markeco",
            sa.Float,
            nullable=True,
            comment="Market economy emphasis (0-100)",
        ),
        sa.Column(
            "welfare",
            sa.Float,
            nullable=True,
            comment="Welfare state expansion (0-100)",
        ),
        sa.Column(
            "eu_pos",
            sa.Float,
            nullable=True,
            comment="Pro-EU emphasis (0-100)",
        ),
        sa.Column(
            "eu_neg",
            sa.Float,
            nullable=True,
            comment="Anti-EU emphasis (0-100)",
        ),
        sa.Column(
            "environment",
            sa.Float,
            nullable=True,
            comment="Environmental protection (0-100)",
        ),
        sa.Column(
            "traditional_morality",
            sa.Float,
            nullable=True,
            comment="Traditional values emphasis (0-100)",
        ),
        sa.Column(
            "law_order",
            sa.Float,
            nullable=True,
            comment="Law and order emphasis (0-100)",
        ),
        sa.Column(
            "payload",
            sa.JSON,
            nullable=True,
            comment="Otros codificadores adicionales en JSON · permite añadir ejes sin migrar",
        ),
        sa.Column(
            "source",
            sa.String(length=80),
            nullable=False,
            server_default="manifesto_project",
            comment="Fuente del dato · 'manifesto_project' / 'ches' / 'politeia_seed'",
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint(
            "party_slug", "country", "election_year",
            name="uq_party_positions_party_country_year",
        ),
    )
    op.create_index(
        "ix_party_positions_party",
        "party_positions",
        ["party_slug", "country"],
    )


def downgrade() -> None:
    op.drop_index("ix_party_positions_party", table_name="party_positions")
    op.drop_table("party_positions")
