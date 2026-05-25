"""dosieres + dossier_apartados + dossier_items · BD para dosieres de personas

Tres tablas relacionadas para almacenar dosieres estructurados de personas
políticas (líderes, ministros, presidentes autonómicos, etc.).

  - dosieres            · 1 fila por persona · slug único, foto, bio corta
  - dossier_apartados   · apartados estructurados por tipo (identidad,
                          trayectoria, posiciones, redes, declaraciones,
                          controversias, evidencia)
  - dossier_items       · items concretos dentro de cada apartado, con
                          contenido, fuente, fecha opcional y tags

RLS habilitada en las tres tablas con política `tenant_isolation_*`
que filtra por `tenant_id = current_setting('app.tenant_id', true)`.

Revision ID: 0081_dosieres_personas
Revises: 0080_port_intel_v2
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0081_dosieres_personas"
down_revision = "0080_port_intel_v2"
branch_labels = None
depends_on = None


# ENUMs PostgreSQL · creados con `if_not_exists` para idempotencia
TIPO_APARTADO_VALUES = (
    "identidad",       # datos personales, formación, lugar de nacimiento
    "trayectoria",     # cargos pasados y carrera política
    "posiciones",      # posicionamiento ideológico en temas concretos
    "redes",           # red de contactos, alianzas, mentores
    "declaraciones",   # citas públicas y posicionamientos verbales
    "controversias",   # casos judiciales, polémicas, escándalos
    "evidencia",       # documentos verificables, papers, sentencias
)

TIPO_ITEM_VALUES = (
    "dato",            # hecho factual sin más
    "declaracion",     # cita textual con su fecha
    "evento",          # suceso con fecha (juicio, elección, etc.)
    "contacto",        # otra persona/organización con relación
    "documento",       # enlace a documento externo (BOE, sentencia)
)


def upgrade() -> None:
    # ────────────────────────────────────────────────────────────────
    # ENUMs
    # ────────────────────────────────────────────────────────────────
    tipo_apartado = postgresql.ENUM(*TIPO_APARTADO_VALUES, name="tipo_apartado")
    tipo_item = postgresql.ENUM(*TIPO_ITEM_VALUES, name="tipo_item")
    tipo_apartado.create(op.get_bind(), checkfirst=True)
    tipo_item.create(op.get_bind(), checkfirst=True)

    # ────────────────────────────────────────────────────────────────
    # 1. dosieres · 1 fila por persona
    # ────────────────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "dosieres",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("slug", sa.String(length=120), nullable=False, unique=True,
                  comment="Slug único, ej. 'pedro-sanchez'"),
        sa.Column("nombre_completo", sa.String(length=200), nullable=False),
        sa.Column("alias", sa.String(length=120), nullable=True,
                  comment="Cómo aparece en titulares, ej. 'Sánchez'"),
        sa.Column("cargo_actual", sa.String(length=300), nullable=True),
        sa.Column("partido", sa.String(length=80), nullable=True),
        sa.Column("foto_url", sa.Text, nullable=True),
        sa.Column("bio_corta", sa.Text, nullable=True,
                  comment="1-2 líneas que resumen quién es"),
        sa.Column("tags", postgresql.JSONB, server_default=sa.text("'[]'::jsonb"),
                  nullable=False),
        sa.Column("fuente_principal", sa.Text, nullable=True,
                  comment="URL principal de referencia, ej. Wikipedia"),
        sa.Column("tenant_id", sa.String(length=40), nullable=False,
                  server_default="default"),
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_dosieres_slug", "dosieres", ["slug"])
    op.create_index("idx_dosieres_tenant", "dosieres", ["tenant_id"])
    op.create_index("idx_dosieres_partido", "dosieres", ["partido"])

    op.execute("ALTER TABLE dosieres ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_dosieres ON dosieres
        USING (tenant_id = current_setting('app.tenant_id', true))
    """)

    # ────────────────────────────────────────────────────────────────
    # 2. dossier_apartados · estructura tipificada
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "dossier_apartados",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("dossier_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("dosieres.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo", postgresql.ENUM(*TIPO_APARTADO_VALUES, name="tipo_apartado",
                                          create_type=False), nullable=False),
        sa.Column("titulo", sa.String(length=200), nullable=True,
                  comment="Override del display name (opcional)"),
        sa.Column("resumen", sa.Text, nullable=True,
                  comment="1-2 párrafos overview del apartado"),
        sa.Column("orden", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tenant_id", sa.String(length=40), nullable=False,
                  server_default="default"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("dossier_id", "tipo", name="uq_dossier_apartado_tipo"),
    )
    op.create_index("idx_dossier_apartados_dossier", "dossier_apartados", ["dossier_id"])
    op.create_index("idx_dossier_apartados_tenant", "dossier_apartados", ["tenant_id"])

    op.execute("ALTER TABLE dossier_apartados ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_dossier_apartados ON dossier_apartados
        USING (tenant_id = current_setting('app.tenant_id', true))
    """)

    # ────────────────────────────────────────────────────────────────
    # 3. dossier_items · items concretos
    # ────────────────────────────────────────────────────────────────
    op.create_table(
        "dossier_items",
        sa.Column("id", postgresql.UUID(as_uuid=True),
                  server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("apartado_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("dossier_apartados.id", ondelete="CASCADE"),
                  nullable=False),
        sa.Column("tipo", postgresql.ENUM(*TIPO_ITEM_VALUES, name="tipo_item",
                                          create_type=False),
                  nullable=False, server_default="dato"),
        sa.Column("titulo", sa.String(length=300), nullable=True),
        sa.Column("contenido", sa.Text, nullable=False),
        sa.Column("fecha", sa.Date, nullable=True,
                  comment="Cuándo ocurrió (opcional)"),
        sa.Column("fuente_url", sa.Text, nullable=True),
        sa.Column("fuente_titulo", sa.String(length=200), nullable=True),
        sa.Column("tags", postgresql.JSONB, server_default=sa.text("'[]'::jsonb"),
                  nullable=False),
        sa.Column("orden", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tenant_id", sa.String(length=40), nullable=False,
                  server_default="default"),
        sa.Column("created_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_dossier_items_apartado", "dossier_items", ["apartado_id"])
    op.create_index("idx_dossier_items_tenant", "dossier_items", ["tenant_id"])
    op.create_index("idx_dossier_items_fecha", "dossier_items", ["fecha"])

    op.execute("ALTER TABLE dossier_items ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation_dossier_items ON dossier_items
        USING (tenant_id = current_setting('app.tenant_id', true))
    """)


def downgrade() -> None:
    # Borrar en orden inverso (items → apartados → dosieres)
    op.execute("DROP POLICY IF EXISTS tenant_isolation_dossier_items ON dossier_items")
    op.drop_index("idx_dossier_items_fecha", table_name="dossier_items")
    op.drop_index("idx_dossier_items_tenant", table_name="dossier_items")
    op.drop_index("idx_dossier_items_apartado", table_name="dossier_items")
    op.drop_table("dossier_items")

    op.execute("DROP POLICY IF EXISTS tenant_isolation_dossier_apartados ON dossier_apartados")
    op.drop_index("idx_dossier_apartados_tenant", table_name="dossier_apartados")
    op.drop_index("idx_dossier_apartados_dossier", table_name="dossier_apartados")
    op.drop_table("dossier_apartados")

    op.execute("DROP POLICY IF EXISTS tenant_isolation_dosieres ON dosieres")
    op.drop_index("idx_dosieres_partido", table_name="dosieres")
    op.drop_index("idx_dosieres_tenant", table_name="dosieres")
    op.drop_index("idx_dosieres_slug", table_name="dosieres")
    op.drop_table("dosieres")

    # ENUMs
    op.execute("DROP TYPE IF EXISTS tipo_item")
    op.execute("DROP TYPE IF EXISTS tipo_apartado")
