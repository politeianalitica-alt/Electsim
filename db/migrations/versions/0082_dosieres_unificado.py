"""dosieres_unificado · tabla plana única para todos los dossieres

Crea la tabla `dosieres_unificado` que reemplazará progresivamente a las
4 fuentes actuales de dossieres del sistema:

  1. dosieres + dossier_apartados + dossier_items  (políticos normalizados)
  2. brain_fichas_politicos                        (fichas brain auto-generadas)
  3. brain_fichas_territoriales                    (ficha de municipios/CCAA)
  4. brain_actor_dossiers + brain_issue_dossiers   (actores e issues)
  5. apps/visual-oscar/data/dosieres-fixture.ts    (fixture hardcoded ~8 MB)

Estrategia · FASE EXPAND (esta migración):
  - Crea la tabla NUEVA vacía.
  - NO toca las tablas existentes (`dosieres`, `dossier_*`, `brain_*`).
  - NO toca endpoints. Producción sigue funcionando idéntica.

Una vez cargados los datos (ver scripts/migrate_dossieres_to_unified.py)
y refactorizados los endpoints en una sesión posterior, una migración
0083_* CONTRACT podrá eliminar las tablas viejas.

Schema · diseño plano + JSONB:
  - Campos indexables (slug, tipo, nombre, partido, ccaa, qid…) como
    columnas reales para queries rápidas y filtros frecuentes.
  - Todo el contenido rico (apartados, items, bloques brain) en una
    única columna JSONB `contenido` con shape estable:

        {
          "apartados": [
            { "tipo": "identidad|trayectoria|…",
              "titulo": str|null, "resumen": str|null, "orden": int,
              "items": [
                 { "tipo": "dato|declaracion|evento|contacto|documento",
                   "titulo": str|null, "contenido": str, "fecha": str|null,
                   "fuente_url": str|null, "fuente_titulo": str|null,
                   "tags": list[str], "orden": int }
              ]
            }
          ],
          "bloques_brain": { ... },   # 12 bloques cuando origen=brain_*
          "raw_extra":     { ... }    # metadata adicional no mapeada
        }

RLS habilitada con política tenant_isolation_dosieres_unificado.

Revision ID: 0082_dosieres_unificado
Revises:    0081_dosieres_personas
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0082_dosieres_unificado"
down_revision = "0081_dosieres_personas"
branch_labels = None
depends_on = None


# Tipos válidos para la columna `tipo`. No usamos ENUM Postgres para
# permitir extensión futura sin migración (los tipos crecen con el dominio:
# politico, territorio, actor, issue, medio, organizacion, evento…).
TIPOS_DOSSIER = (
    "politico",       # persona política (líder, ministro, diputado, presidente CCAA…)
    "territorio",     # municipio o CCAA
    "actor",          # organización, grupo de interés, lobby, asociación
    "issue",          # tema o asunto político (vivienda, energía, etc.)
    "medio",          # medio de comunicación
    "evento",         # evento concreto (elección, juicio, manifestación)
)


def upgrade() -> None:
    # Extensiones requeridas (idempotente · seguro re-aplicar):
    #   · pgcrypto → gen_random_uuid()
    #   · pg_trgm  → operator class gin_trgm_ops para idx_*_nombre_trgm
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "dosieres_unificado",
        # ─── Identidad ────────────────────────────────────────────────
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            primary_key=True,
        ),
        sa.Column(
            "slug",
            sa.String(length=200),
            nullable=False,
            comment="Slug único dentro de (tenant, tipo). Ej: 'pedro-sanchez-perez-castejon'",
        ),
        sa.Column(
            "tipo",
            sa.String(length=40),
            nullable=False,
            server_default="politico",
            comment=(
                "Tipo de dossier. Valores conocidos: politico, territorio, "
                "actor, issue, medio, evento (no ENUM para permitir extensión)"
            ),
        ),
        # ─── Display ──────────────────────────────────────────────────
        sa.Column(
            "nombre",
            sa.String(length=300),
            nullable=False,
            comment="Nombre completo / oficial",
        ),
        sa.Column(
            "alias",
            sa.String(length=200),
            nullable=True,
            comment="Cómo aparece en titulares (ej. 'Sánchez')",
        ),
        # ─── Metadata indexable ──────────────────────────────────────
        sa.Column("cargo", sa.Text, nullable=True),
        sa.Column("partido", sa.String(length=80), nullable=True),
        sa.Column("ccaa", sa.String(length=80), nullable=True),
        sa.Column("provincia", sa.String(length=80), nullable=True),
        sa.Column(
            "qid",
            sa.String(length=40),
            nullable=True,
            comment="Wikidata QID (Q123456) si está mapeado",
        ),
        sa.Column("foto_url", sa.Text, nullable=True),
        sa.Column("bio_corta", sa.Text, nullable=True),
        # ─── Contenido rico ───────────────────────────────────────────
        sa.Column(
            "contenido",
            postgresql.JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
            comment="Apartados, items, bloques brain. Ver docstring del módulo.",
        ),
        sa.Column(
            "tags",
            postgresql.JSONB,
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        # ─── Calidad ──────────────────────────────────────────────────
        sa.Column("completeness", sa.Float, nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("score_influencia", sa.Float, nullable=True),
        # ─── Procedencia ──────────────────────────────────────────────
        sa.Column("fuente_principal", sa.Text, nullable=True),
        sa.Column(
            "origen",
            sa.String(length=40),
            nullable=True,
            comment=(
                "De dónde vino esta fila durante la migración: "
                "'dosieres', 'brain_fichas_politicos', "
                "'brain_fichas_territoriales', 'brain_actor_dossiers', "
                "'brain_issue_dossiers', 'fixture_ts', 'manual'"
            ),
        ),
        # ─── Multi-tenant ─────────────────────────────────────────────
        sa.Column(
            "tenant_id",
            sa.String(length=40),
            nullable=False,
            server_default="default",
        ),
        # ─── Audit ────────────────────────────────────────────────────
        sa.Column("created_by", sa.String(length=80), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        # ─── Uniqueness ───────────────────────────────────────────────
        sa.UniqueConstraint(
            "tenant_id", "tipo", "slug", name="uq_dosieres_unif_tenant_tipo_slug"
        ),
    )

    # ─── Índices ──────────────────────────────────────────────────────
    op.create_index("idx_dosieres_unif_slug", "dosieres_unificado", ["slug"])
    op.create_index("idx_dosieres_unif_tipo", "dosieres_unificado", ["tipo"])
    op.create_index("idx_dosieres_unif_tenant", "dosieres_unificado", ["tenant_id"])
    op.create_index("idx_dosieres_unif_partido", "dosieres_unificado", ["partido"])
    op.create_index("idx_dosieres_unif_ccaa", "dosieres_unificado", ["ccaa"])
    op.create_index("idx_dosieres_unif_qid", "dosieres_unificado", ["qid"])
    op.create_index(
        "idx_dosieres_unif_nombre_trgm",
        "dosieres_unificado",
        ["nombre"],
        postgresql_using="gin",
        postgresql_ops={"nombre": "gin_trgm_ops"},
    )
    # GIN sobre JSONB para filtros tipo `contenido @> '{"apartados":[…]}'`
    op.execute(
        "CREATE INDEX idx_dosieres_unif_contenido ON dosieres_unificado "
        "USING GIN (contenido jsonb_path_ops)"
    )
    op.execute(
        "CREATE INDEX idx_dosieres_unif_tags ON dosieres_unificado USING GIN (tags)"
    )

    # ─── RLS ──────────────────────────────────────────────────────────
    op.execute("ALTER TABLE dosieres_unificado ENABLE ROW LEVEL SECURITY")
    op.execute(
        """
        CREATE POLICY tenant_isolation_dosieres_unificado ON dosieres_unificado
        USING (tenant_id = current_setting('app.tenant_id', true))
        """
    )

    # ─── CHECK constraint sobre tipo (sin ENUM, pero validado) ────────
    tipos_csv = ", ".join(f"'{t}'" for t in TIPOS_DOSSIER)
    op.execute(
        f"ALTER TABLE dosieres_unificado "
        f"ADD CONSTRAINT chk_dosieres_unif_tipo CHECK (tipo IN ({tipos_csv}))"
    )


def downgrade() -> None:
    op.execute(
        "DROP POLICY IF EXISTS tenant_isolation_dosieres_unificado "
        "ON dosieres_unificado"
    )
    op.execute("DROP INDEX IF EXISTS idx_dosieres_unif_tags")
    op.execute("DROP INDEX IF EXISTS idx_dosieres_unif_contenido")
    op.drop_index("idx_dosieres_unif_nombre_trgm", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_qid", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_ccaa", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_partido", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_tenant", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_tipo", table_name="dosieres_unificado")
    op.drop_index("idx_dosieres_unif_slug", table_name="dosieres_unificado")
    op.drop_table("dosieres_unificado")
