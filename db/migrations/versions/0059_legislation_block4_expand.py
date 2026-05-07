"""0059 — Expand legislation table for Block 4 Legislative Monitor.

Adds political-intelligence columns (BOE numbering, parliamentary state,
voting data, sector impact scores) to the existing legislation table,
and creates legislation_estado_historia for full lifecycle tracking.

Revision ID: 0059
Revises: 0058
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0059"
down_revision = "0058"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Expand legislation with Block 4 columns ────────────────────────
    # Using ADD COLUMN IF NOT EXISTS for idempotency
    cols = [
        # Identification (Spanish naming)
        ("titulo",              "TEXT"),
        ("titulo_corto",        "VARCHAR(200)"),
        ("numero_boe",          "VARCHAR(50)"),
        ("numero_eur_lex",      "VARCHAR(50)"),
        ("numero_expediente",   "VARCHAR(100)"),
        ("fuente",              "VARCHAR(50)  DEFAULT 'BOE'"),
        ("url_fuente",          "TEXT"),
        ("rango",               "VARCHAR(100)"),
        ("ministerio",          "VARCHAR(200)"),
        ("ccaa",                "VARCHAR(100)"),
        # Parliamentary state machine
        ("estado",              "VARCHAR(50)  DEFAULT 'publicado'"),
        ("fecha_publicacion",   "TIMESTAMPTZ"),
        ("fecha_entrada_vigor", "TIMESTAMPTZ"),
        ("fecha_presentacion",  "DATE"),
        ("fecha_comision",      "DATE"),
        ("fecha_pleno",         "DATE"),
        # Content
        ("resumen_llm",         "TEXT"),
        ("resumen_ejecutivo",   "TEXT"),
        ("texto_completo",      "TEXT"),
        ("temas",               "JSONB  DEFAULT '[]'"),
        ("sectores_afectados",  "JSONB  DEFAULT '[]'"),
        # Impact scores (0-10)
        ("score_impacto_economico",  "FLOAT  DEFAULT 0"),
        ("score_impacto_social",     "FLOAT  DEFAULT 0"),
        ("score_impacto_empresas",   "FLOAT  DEFAULT 0"),
        ("score_urgencia_cliente",   "FLOAT  DEFAULT 0"),
        # Voting data
        ("votos_favor",       "INTEGER"),
        ("votos_contra",      "INTEGER"),
        ("votos_abstencion",  "INTEGER"),
        ("grupos_favor",      "JSONB  DEFAULT '[]'"),
        ("grupos_contra",     "JSONB  DEFAULT '[]'"),
        # Vector embedding (768d nomic-embed-text)
        ("embedding",         "vector(768)"),
        # Audit
        ("actualizado_en",    "TIMESTAMPTZ  DEFAULT NOW()"),
    ]

    for col_name, col_def in cols:
        op.execute(
            f"ALTER TABLE legislation ADD COLUMN IF NOT EXISTS {col_name} {col_def}"
        )

    # Populate titulo from existing title column for existing rows
    op.execute("""
        UPDATE legislation
        SET titulo       = title,
            titulo_corto = LEFT(title, 120),
            fuente       = CASE WHEN level = 'european' THEN 'EUR-LEX'
                                WHEN level = 'regional' THEN 'CCAA'
                                ELSE 'BOE' END,
            estado       = CASE WHEN status = 'published'  THEN 'publicado'
                                WHEN status = 'derogated'  THEN 'derogado'
                                WHEN status = 'amended'    THEN 'publicado'
                                ELSE 'publicado' END,
            fecha_publicacion = published_at,
            resumen_llm       = ai_summary,
            resumen_ejecutivo = LEFT(COALESCE(ai_summary, summary, ''), 500),
            temas             = COALESCE(ai_topics, '[]'::jsonb),
            actualizado_en    = NOW()
        WHERE titulo IS NULL
    """)

    op.create_index("ix_leg_estado",   "legislation", ["estado"])
    op.create_index("ix_leg_fuente",   "legislation", ["fuente"])
    op.create_index("ix_leg_urgencia", "legislation", ["score_urgencia_cliente"])

    # ── legislation_estado_historia ────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS legislation_estado_historia (
            id                  BIGSERIAL   PRIMARY KEY,
            legislation_id      BIGINT      NOT NULL REFERENCES legislation(id) ON DELETE CASCADE,
            estado_anterior     VARCHAR(50),
            estado_nuevo        VARCHAR(50) NOT NULL,
            fecha               DATE        NOT NULL,
            descripcion         TEXT,
            votos_favor         INTEGER,
            votos_contra        INTEGER,
            votos_abstencion    INTEGER,
            grupos_favor        JSONB       DEFAULT '[]',
            grupos_contra       JSONB       DEFAULT '[]',
            creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_leg_hist_leg_id ON legislation_estado_historia (legislation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_leg_hist_fecha  ON legislation_estado_historia (fecha DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS legislation_estado_historia CASCADE")

    drop_cols = [
        "titulo", "titulo_corto", "numero_boe", "numero_eur_lex",
        "numero_expediente", "fuente", "url_fuente", "rango",
        "ministerio", "ccaa", "estado",
        "fecha_publicacion", "fecha_entrada_vigor",
        "fecha_presentacion", "fecha_comision", "fecha_pleno",
        "resumen_llm", "resumen_ejecutivo", "texto_completo",
        "temas", "sectores_afectados",
        "score_impacto_economico", "score_impacto_social",
        "score_impacto_empresas", "score_urgencia_cliente",
        "votos_favor", "votos_contra", "votos_abstencion",
        "grupos_favor", "grupos_contra",
        "embedding", "actualizado_en",
    ]
    for col in drop_cols:
        op.execute(f"ALTER TABLE legislation DROP COLUMN IF EXISTS {col}")
