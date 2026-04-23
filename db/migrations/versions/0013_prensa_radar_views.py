"""prensa_radar_views

Revision ID: 0013_prensa_radar_views
Revises: 0012_multicliente
Create Date: 2026-04-23
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "0013_prensa_radar_views"
down_revision = "0012_multicliente"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.article') IS NOT NULL THEN
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_agenda_tema_partido AS
                    WITH base AS (
                        SELECT
                            published_at::date AS fecha,
                            COALESCE(NULLIF(categoria, ''), 'general') AS tema,
                            BTRIM(UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))) AS partido,
                            COALESCE(sentimiento_score, 0.0) AS sentimiento
                        FROM article
                        WHERE COALESCE(partidos_mencionados, '') <> ''
                    )
                    SELECT
                        fecha,
                        tema,
                        partido,
                        COUNT(*) AS n_noticias,
                        ROUND(AVG(sentimiento)::numeric, 3) AS sentimiento_medio
                    FROM base
                    WHERE partido <> ''
                    GROUP BY fecha, tema, partido
                $v$;
            ELSIF to_regclass('public.noticias_prensa') IS NOT NULL THEN
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_agenda_tema_partido AS
                    WITH base AS (
                        SELECT
                            fecha_publicacion::date AS fecha,
                            COALESCE(NULLIF(categoria, ''), 'general') AS tema,
                            BTRIM(UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))) AS partido,
                            COALESCE(sentimiento_score, 0.0) AS sentimiento
                        FROM noticias_prensa
                        WHERE COALESCE(partidos_mencionados, '') <> ''
                    )
                    SELECT
                        fecha,
                        tema,
                        partido,
                        COUNT(*) AS n_noticias,
                        ROUND(AVG(sentimiento)::numeric, 3) AS sentimiento_medio
                    FROM base
                    WHERE partido <> ''
                    GROUP BY fecha, tema, partido
                $v$;
            ELSE
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_agenda_tema_partido AS
                    SELECT
                        NULL::date AS fecha,
                        NULL::text AS tema,
                        NULL::text AS partido,
                        0::bigint AS n_noticias,
                        0.0::numeric AS sentimiento_medio
                    WHERE FALSE
                $v$;
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('public.article') IS NOT NULL THEN
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_sesgo_fuente_partido AS
                    WITH base AS (
                        SELECT
                            COALESCE(NULLIF(TRIM(source_id), ''), 'desconocida') AS fuente_id,
                            BTRIM(UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))) AS partido,
                            COALESCE(sentimiento_score, 0.0) AS sentimiento
                        FROM article
                        WHERE COALESCE(partidos_mencionados, '') <> ''
                    ),
                    global_partido AS (
                        SELECT partido, AVG(sentimiento) AS sentimiento_global_partido
                        FROM base
                        WHERE partido <> ''
                        GROUP BY partido
                    ),
                    fuente_partido AS (
                        SELECT
                            fuente_id,
                            partido,
                            AVG(sentimiento) AS sentimiento_fuente_partido,
                            COUNT(*) AS n_noticias
                        FROM base
                        WHERE partido <> ''
                        GROUP BY fuente_id, partido
                    )
                    SELECT
                        fp.fuente_id,
                        fp.partido,
                        ROUND(fp.sentimiento_fuente_partido::numeric, 3) AS sentimiento_fuente_partido,
                        ROUND(gp.sentimiento_global_partido::numeric, 3) AS sentimiento_global_partido,
                        ROUND((fp.sentimiento_fuente_partido - gp.sentimiento_global_partido)::numeric, 3) AS sesgo_vs_global,
                        fp.n_noticias
                    FROM fuente_partido fp
                    JOIN global_partido gp ON gp.partido = fp.partido
                $v$;
            ELSIF to_regclass('public.noticias_prensa') IS NOT NULL THEN
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_sesgo_fuente_partido AS
                    WITH base AS (
                        SELECT
                            COALESCE(NULLIF(TRIM(fuente), ''), 'desconocida') AS fuente_id,
                            BTRIM(UNNEST(STRING_TO_ARRAY(COALESCE(partidos_mencionados, ''), ','))) AS partido,
                            COALESCE(sentimiento_score, 0.0) AS sentimiento
                        FROM noticias_prensa
                        WHERE COALESCE(partidos_mencionados, '') <> ''
                    ),
                    global_partido AS (
                        SELECT partido, AVG(sentimiento) AS sentimiento_global_partido
                        FROM base
                        WHERE partido <> ''
                        GROUP BY partido
                    ),
                    fuente_partido AS (
                        SELECT
                            fuente_id,
                            partido,
                            AVG(sentimiento) AS sentimiento_fuente_partido,
                            COUNT(*) AS n_noticias
                        FROM base
                        WHERE partido <> ''
                        GROUP BY fuente_id, partido
                    )
                    SELECT
                        fp.fuente_id,
                        fp.partido,
                        ROUND(fp.sentimiento_fuente_partido::numeric, 3) AS sentimiento_fuente_partido,
                        ROUND(gp.sentimiento_global_partido::numeric, 3) AS sentimiento_global_partido,
                        ROUND((fp.sentimiento_fuente_partido - gp.sentimiento_global_partido)::numeric, 3) AS sesgo_vs_global,
                        fp.n_noticias
                    FROM fuente_partido fp
                    JOIN global_partido gp ON gp.partido = fp.partido
                $v$;
            ELSE
                EXECUTE $v$
                    CREATE OR REPLACE VIEW v_sesgo_fuente_partido AS
                    SELECT
                        NULL::text AS fuente_id,
                        NULL::text AS partido,
                        0.0::numeric AS sentimiento_fuente_partido,
                        0.0::numeric AS sentimiento_global_partido,
                        0.0::numeric AS sesgo_vs_global,
                        0::bigint AS n_noticias
                    WHERE FALSE
                $v$;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS v_sesgo_fuente_partido")
    op.execute("DROP VIEW IF EXISTS v_agenda_tema_partido")
