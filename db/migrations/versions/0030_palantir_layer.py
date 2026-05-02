"""
Migracion 0030 — Capa de inteligencia tipo Palantir/NationBuilder.

Crea:
  persona_publica       — perfil rico de actores (politicos, empresarios, diplomaticos)
  organizacion          — partidos, empresas, think tanks, ministerios
  relacion_politeia     — grafo de relaciones tipadas entre cualquier entidad
  propensity_score      — scores de propension electoral por seccion censal (NationBuilder)
  signal_politeia       — senales unificadas del sistema (Palantir Gotham alerts)
  sentiment_history     — serie temporal de sentimiento mediatico por persona
  data_lake_staging     — tabla de ingesta para las 100 fuentes del data lake
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade() -> None:

    # ------------------------------------------------------------------
    # Extensions
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ------------------------------------------------------------------
    # persona_publica
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS persona_publica (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre_completo TEXT        NOT NULL,
            nombre_norm     TEXT,
            tipo            TEXT        DEFAULT 'politico',
            activo          BOOLEAN     NOT NULL DEFAULT TRUE,

            -- Identidad estructurada
            cargo_actual    TEXT,
            partido         TEXT,
            circunscripcion TEXT,
            ambito          TEXT        DEFAULT 'nacional',
            pais_origen     CHAR(3)     DEFAULT 'ESP',
            fecha_nac       DATE,
            foto_url        TEXT,
            wikidata_id     TEXT,
            congreso_id     TEXT,
            opensanctions_id TEXT,

            -- Scores dinamicos (actualizados por pipelines)
            score_influencia        FLOAT   NOT NULL DEFAULT 0.0,
            score_riesgo            FLOAT   NOT NULL DEFAULT 0.0,
            sentimiento_actual      FLOAT   NOT NULL DEFAULT 0.0,
            tendencia_sentimiento   TEXT,

            ultima_mencion_media    TIMESTAMPTZ,

            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_nombre_norm ON persona_publica(nombre_norm)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_partido     ON persona_publica(partido)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_ambito      ON persona_publica(ambito)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_tipo        ON persona_publica(tipo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_influencia  ON persona_publica(score_influencia DESC NULLS LAST)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_pp_trgm        ON persona_publica USING GIN(nombre_norm gin_trgm_ops)")

    # ------------------------------------------------------------------
    # organizacion
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS organizacion (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre          TEXT        NOT NULL,
            nombre_norm     TEXT,
            tipo            TEXT        DEFAULT 'empresa',
            cif             TEXT,
            pais            CHAR(3)     DEFAULT 'ESP',
            sector          TEXT,
            ibex35          BOOLEAN     NOT NULL DEFAULT FALSE,
            activa          BOOLEAN     NOT NULL DEFAULT TRUE,

            score_influencia FLOAT      NOT NULL DEFAULT 0.0,
            n_personas_clave INTEGER    NOT NULL DEFAULT 0,
            sede_ccaa       TEXT,
            facturacion_m   FLOAT,
            empleados       INTEGER,

            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            UNIQUE (nombre_norm, cif)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_org_nombre_norm ON organizacion(nombre_norm)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_org_tipo        ON organizacion(tipo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_org_cif         ON organizacion(cif) WHERE cif IS NOT NULL")
    op.execute("CREATE INDEX IF NOT EXISTS idx_org_trgm        ON organizacion USING GIN(nombre_norm gin_trgm_ops)")

    # ------------------------------------------------------------------
    # relacion_politeia (grafo tipado — evita colision con relacion_ontologica)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS relacion_politeia (
            id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            elemento_a_id   TEXT        NOT NULL,
            elemento_a_tipo TEXT        NOT NULL,
            tipo_relacion   TEXT        NOT NULL,
            elemento_b_id   TEXT        NOT NULL,
            elemento_b_tipo TEXT        NOT NULL,
            peso            FLOAT       NOT NULL DEFAULT 1.0,
            confianza       FLOAT       NOT NULL DEFAULT 1.0,
            fecha_inicio    DATE,
            fecha_fin       DATE,
            fuente_url      TEXT,
            activa          BOOLEAN     NOT NULL DEFAULT TRUE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            UNIQUE (elemento_a_id, tipo_relacion, elemento_b_id)
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_rel_a    ON relacion_politeia(elemento_a_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_rel_b    ON relacion_politeia(elemento_b_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_rel_tipo ON relacion_politeia(tipo_relacion)")

    # ------------------------------------------------------------------
    # propensity_score
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS propensity_score (
            id              BIGSERIAL   PRIMARY KEY,
            seccion_censal  TEXT        NOT NULL UNIQUE,
            municipio_cod   TEXT,
            provincia_cod   TEXT,
            ccaa            TEXT,

            -- Scores por partido [0-1]
            score_pp        FLOAT,
            score_psoe      FLOAT,
            score_vox       FLOAT,
            score_sumar     FLOAT,
            score_pnv       FLOAT,
            score_junts     FLOAT,
            score_otros     FLOAT,

            -- Features socieconomicas (INE)
            renta_media             FLOAT,
            edad_media              FLOAT,
            pct_universitarios      FLOAT,
            pct_extranjeros         FLOAT,
            tasa_desempleo          FLOAT,
            densidad_pop            FLOAT,
            indice_urbanizacion     FLOAT,
            pct_pensionistas        FLOAT,
            pct_jovenes_18_35       FLOAT,
            valor_catastral_medio   FLOAT,
            pct_vivienda_alquiler   FLOAT,
            pct_sector_primario     FLOAT,
            pct_sector_servicios    FLOAT,
            pct_sector_industria    FLOAT,

            -- Resultado historico
            ultimo_resultado    JSONB   NOT NULL DEFAULT '{}',
            voto_util_riesgo    FLOAT,

            modelo_version  TEXT,
            calculado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_prop_prov ON propensity_score(provincia_cod)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_prop_ccaa ON propensity_score(ccaa)")

    # ------------------------------------------------------------------
    # signal_politeia (senales unificadas — evita colision con tabla signal existente)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS signal_politeia (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            tipo        TEXT        NOT NULL,
            urgencia    SMALLINT    NOT NULL DEFAULT 3
                                    CHECK (urgencia BETWEEN 1 AND 5),
            titulo      TEXT        NOT NULL,
            resumen     TEXT,

            -- Entidades implicadas (arrays de UUIDs como texto)
            personas    TEXT[]      NOT NULL DEFAULT '{}',
            orgs        TEXT[]      NOT NULL DEFAULT '{}',

            modulo_origen   TEXT,
            url_fuente      TEXT,
            leida           BOOLEAN NOT NULL DEFAULT FALSE,
            activa          BOOLEAN NOT NULL DEFAULT TRUE,

            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_sp_urgencia ON signal_politeia(urgencia DESC, created_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sp_tipo     ON signal_politeia(tipo)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_sp_activa   ON signal_politeia(activa, leida)")

    # ------------------------------------------------------------------
    # sentiment_history
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS sentiment_history (
            id          BIGSERIAL   PRIMARY KEY,
            persona_id  UUID        NOT NULL REFERENCES persona_publica(id) ON DELETE CASCADE,
            score       FLOAT       NOT NULL,
            n_articulos INTEGER     NOT NULL DEFAULT 0,
            tendencia   TEXT,
            ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sh_persona_ts
            ON sentiment_history(persona_id, ts DESC)
    """)

    # ------------------------------------------------------------------
    # entity_review_queue (entidades ambiguas pendientes de revision manual)
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS entity_review_queue (
            id              SERIAL      PRIMARY KEY,
            nombre_norm     TEXT        NOT NULL,
            candidate_id    UUID,
            score           FLOAT,
            revisado        BOOLEAN     NOT NULL DEFAULT FALSE,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (nombre_norm, candidate_id)
        )
    """)

    # ------------------------------------------------------------------
    # data_lake_staging
    # ------------------------------------------------------------------
    op.execute("""
        CREATE TABLE IF NOT EXISTS data_lake_staging (
            id          BIGSERIAL   PRIMARY KEY,
            source      TEXT        NOT NULL,
            payload     JSONB       NOT NULL,
            processed   BOOLEAN     NOT NULL DEFAULT FALSE,
            ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS idx_dls_source    ON data_lake_staging(source)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_dls_processed ON data_lake_staging(processed, ingested_at DESC)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_dls_payload   ON data_lake_staging USING GIN(payload)")

    # ------------------------------------------------------------------
    # Columnas de geocodificacion en legislation (para mapa Command Center)
    # ------------------------------------------------------------------
    op.execute("ALTER TABLE legislation ADD COLUMN IF NOT EXISTS map_lat   FLOAT")
    op.execute("ALTER TABLE legislation ADD COLUMN IF NOT EXISTS map_lon   FLOAT")
    op.execute("ALTER TABLE legislation ADD COLUMN IF NOT EXISTS map_place TEXT")

    # ------------------------------------------------------------------
    # Vista de sparklines de sentimiento
    # ------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE VIEW sentiment_sparklines_v AS
        SELECT
            p.partido,
            DATE_TRUNC('hour', sh.ts) AS hora,
            AVG(sh.score)             AS score_medio,
            COUNT(DISTINCT sh.persona_id) AS n_personas
        FROM sentiment_history sh
        JOIN persona_publica p ON p.id = sh.persona_id
        WHERE sh.ts >= NOW() - INTERVAL '7 days'
          AND p.partido IS NOT NULL
          AND p.tipo = 'politico'
        GROUP BY p.partido, DATE_TRUNC('hour', sh.ts)
        ORDER BY p.partido, hora
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS sentiment_sparklines_v")
    op.execute("ALTER TABLE legislation DROP COLUMN IF EXISTS map_place")
    op.execute("ALTER TABLE legislation DROP COLUMN IF EXISTS map_lon")
    op.execute("ALTER TABLE legislation DROP COLUMN IF EXISTS map_lat")
    op.execute("DROP TABLE IF EXISTS data_lake_staging CASCADE")
    op.execute("DROP TABLE IF EXISTS entity_review_queue CASCADE")
    op.execute("DROP TABLE IF EXISTS sentiment_history CASCADE")
    op.execute("DROP TABLE IF EXISTS signal_politeia CASCADE")
    op.execute("DROP TABLE IF EXISTS propensity_score CASCADE")
    op.execute("DROP TABLE IF EXISTS relacion_politeia CASCADE")
    op.execute("DROP TABLE IF EXISTS organizacion CASCADE")
    op.execute("DROP TABLE IF EXISTS persona_publica CASCADE")
