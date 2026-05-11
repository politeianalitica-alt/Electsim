"""Media Intelligence v2 — expand noticias_prensa with classification + NLP.

Revision ID: 0062
Revises: 0061
Create Date: 2026-05-11

IMPORTANT: Idempotent migration. The `noticias_prensa` table already exists
with 2,163 rows from prior ETL. We only ADD new columns without renaming
existing ones (`titular`, `fuente`, `fecha_publicacion`, `sentimiento_*`).

New columns:
  - Classification: fuente_id, tier, ideologia, pais, ccaa, tags, idioma
  - Article metadata: imagen_url, autor, word_count, url_hash
  - Processing: procesado, titulo_clean, resumen_clean, slug, duplicado_de,
                spike_score, fecha_procesado
  - NLP: sentiment_score (numeric, separate from legacy 'sentimiento_score'),
         entidades, topicos, nlp_procesado, fecha_nlp, embedding (text repr)

Indices for the new fields.
"""

from alembic import op

revision = "0062"
down_revision = "0061"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        -- ── Classification metadata (catalog-driven) ──
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS fuente_id      VARCHAR(80);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS fuente_nombre  VARCHAR(200);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS tier           VARCHAR(40);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS ideologia      VARCHAR(40);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS pais           VARCHAR(10);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS ccaa           VARCHAR(10);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS tags           TEXT[];
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS idioma         VARCHAR(10);

        -- ── Article metadata ──
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS imagen_url     TEXT;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS autor          TEXT;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS word_count     INTEGER;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS url_hash       CHAR(64);

        -- ── Processing pipeline (Capa 2) ──
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS procesado       BOOLEAN DEFAULT FALSE;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS titulo_clean    TEXT;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS resumen_clean   TEXT;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS slug            VARCHAR(200);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS duplicado_de    BIGINT;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS spike_score     DOUBLE PRECISION;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS fecha_procesado TIMESTAMP;

        -- ── NLP (Capa 3) — new dedicated columns ──
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS sentiment_score DOUBLE PRECISION;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(20);
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS entidades       JSONB;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS topicos         TEXT[];
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS nlp_procesado   BOOLEAN DEFAULT FALSE;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS fecha_nlp       TIMESTAMP;
        ALTER TABLE noticias_prensa ADD COLUMN IF NOT EXISTS embedding       TEXT;
        """
    )

    # Backfill url_hash for existing rows so dedup works retroactively
    op.execute(
        """
        UPDATE noticias_prensa
        SET url_hash = encode(sha256(url::bytea), 'hex')
        WHERE url_hash IS NULL AND url IS NOT NULL;
        """
    )

    # ── INDICES ──
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_np_url_hash
            ON noticias_prensa (url_hash) WHERE url_hash IS NOT NULL;

        CREATE INDEX IF NOT EXISTS ix_np_fuente_id      ON noticias_prensa (fuente_id);
        CREATE INDEX IF NOT EXISTS ix_np_fecha_pub_new  ON noticias_prensa (fecha_publicacion DESC);
        CREATE INDEX IF NOT EXISTS ix_np_tier           ON noticias_prensa (tier);
        CREATE INDEX IF NOT EXISTS ix_np_ideologia      ON noticias_prensa (ideologia);
        CREATE INDEX IF NOT EXISTS ix_np_pais           ON noticias_prensa (pais);
        CREATE INDEX IF NOT EXISTS ix_np_ccaa           ON noticias_prensa (ccaa);
        CREATE INDEX IF NOT EXISTS ix_np_procesado      ON noticias_prensa (procesado) WHERE procesado = FALSE;
        CREATE INDEX IF NOT EXISTS ix_np_nlp_procesado  ON noticias_prensa (nlp_procesado) WHERE nlp_procesado = FALSE;
        CREATE INDEX IF NOT EXISTS ix_np_duplicado_de   ON noticias_prensa (duplicado_de) WHERE duplicado_de IS NOT NULL;
        CREATE INDEX IF NOT EXISTS ix_np_spike_score    ON noticias_prensa (spike_score DESC) WHERE spike_score IS NOT NULL;
        CREATE INDEX IF NOT EXISTS ix_np_slug           ON noticias_prensa (slug);
        CREATE INDEX IF NOT EXISTS ix_np_sentiment_label ON noticias_prensa (sentiment_label);
        CREATE INDEX IF NOT EXISTS ix_np_entidades_gin  ON noticias_prensa USING GIN (entidades);
        CREATE INDEX IF NOT EXISTS ix_np_topicos_gin    ON noticias_prensa USING GIN (topicos);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS ix_np_url_hash;
        DROP INDEX IF EXISTS ix_np_fuente_id;
        DROP INDEX IF EXISTS ix_np_fecha_pub_new;
        DROP INDEX IF EXISTS ix_np_tier;
        DROP INDEX IF EXISTS ix_np_ideologia;
        DROP INDEX IF EXISTS ix_np_pais;
        DROP INDEX IF EXISTS ix_np_ccaa;
        DROP INDEX IF EXISTS ix_np_procesado;
        DROP INDEX IF EXISTS ix_np_nlp_procesado;
        DROP INDEX IF EXISTS ix_np_duplicado_de;
        DROP INDEX IF EXISTS ix_np_spike_score;
        DROP INDEX IF EXISTS ix_np_slug;
        DROP INDEX IF EXISTS ix_np_sentiment_label;
        DROP INDEX IF EXISTS ix_np_entidades_gin;
        DROP INDEX IF EXISTS ix_np_topicos_gin;
        """
    )
    for col in [
        "fuente_id","fuente_nombre","tier","ideologia","pais","ccaa","tags","idioma",
        "imagen_url","autor","word_count","url_hash",
        "procesado","titulo_clean","resumen_clean","slug","duplicado_de","spike_score","fecha_procesado",
        "sentiment_score","sentiment_label","entidades","topicos","nlp_procesado","fecha_nlp","embedding",
    ]:
        op.execute(f"ALTER TABLE noticias_prensa DROP COLUMN IF EXISTS {col};")
