"""Backfill ontology_object desde tablas existentes.

Revision ID: 0022_ontology_backfill
Revises: 0021_ontology_graph
"""

from typing import Sequence, Union

from alembic import op

revision: str = "0022_ontology_backfill"
down_revision: Union[str, None] = "0021_ontology_graph"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(connection, name: str) -> bool:
    from sqlalchemy import text
    row = connection.execute(
        text(f"SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :name"),
        {"name": name}
    ).fetchone()
    return row is not None


def upgrade() -> None:
    conn = op.get_bind()

    # ------------------------------------------------------------------
    # 1. actores  ->  object_type 'actor'
    # ------------------------------------------------------------------
    if _table_exists(conn, "actores"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'actores',
                a.id::text,
                jsonb_build_object(
                    'name',          a.nombre,
                    'partido',       a.partido,
                    'cargo',         a.cargo,
                    'nivel',         a.nivel,
                    'relevancia',    a.relevancia,
                    'n_menciones_7d', a.n_menciones_7d
                )
            FROM actores a
            JOIN ontology_object_type ot ON ot.code = 'actor'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 2. partidos  ->  object_type 'party'
    # ------------------------------------------------------------------
    if _table_exists(conn, "partidos"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'partidos',
                p.id::text,
                jsonb_build_object(
                    'name',           p.nombre_completo,
                    'siglas',         p.siglas,
                    'ideologia',      p.ideologia,
                    'eje_izda_dcha',  p.eje_izda_dcha,
                    'activo',         p.activo
                )
            FROM partidos p
            JOIN ontology_object_type ot ON ot.code = 'party'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 3. articulos_prensa  ->  object_type 'media_item'
    # ------------------------------------------------------------------
    if _table_exists(conn, "articulos_prensa"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'articulos_prensa',
                ap.id::text,
                jsonb_build_object(
                    'title',           ap.titulo,
                    'url',             ap.url,
                    'medio',           ap.medio,
                    'published_at',    ap.fecha_pub,
                    'tendencia',       ap.tendencia,
                    'credibilidad',    ap.credibilidad
                )
            FROM articulos_prensa ap
            JOIN ontology_object_type ot ON ot.code = 'media_item'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 4. topics_bertopic  ->  object_type 'narrative_cluster'
    # ------------------------------------------------------------------
    if _table_exists(conn, "topics_bertopic"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'topics_bertopic',
                tb.id::text,
                jsonb_build_object(
                    'label',           COALESCE(tb.label, tb.topic_id::text),
                    'topic_id',        tb.topic_id,
                    'n_articulos',     tb.n_articulos,
                    'fecha_inicio',    tb.fecha_inicio,
                    'fecha_fin',       tb.fecha_fin,
                    'keywords',        tb.keywords_representativos
                )
            FROM topics_bertopic tb
            JOIN ontology_object_type ot ON ot.code = 'narrative_cluster'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 5. encuestas  ->  object_type 'poll_snapshot' (kind=poll)
    # ------------------------------------------------------------------
    if _table_exists(conn, "encuestas"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'encuestas',
                e.id::text,
                jsonb_build_object(
                    'kind',            'poll',
                    'titulo',          e.titulo,
                    'fecha_inicio',    e.fecha_inicio,
                    'fecha_fin',       e.fecha_fin,
                    'fecha_publicacion', e.fecha_publicacion,
                    'n_entrevistas',   e.n_entrevistas,
                    'metodologia',     e.metodologia,
                    'error_muestral',  e.error_muestral
                )
            FROM encuestas e
            JOIN ontology_object_type ot ON ot.code = 'poll_snapshot'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 6. escenarios_generados  ->  object_type 'poll_snapshot' (kind=nowcasting)
    # ------------------------------------------------------------------
    if _table_exists(conn, "escenarios_generados"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'escenarios_generados',
                eg.id::text,
                jsonb_build_object(
                    'kind',          'nowcasting',
                    'nombre',        eg.nombre,
                    'descripcion',   eg.descripcion,
                    'fecha',         eg.fecha_generacion,
                    'modelo',        eg.modelo
                )
            FROM escenarios_generados eg
            JOIN ontology_object_type ot ON ot.code = 'poll_snapshot'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 7. alertas_sistema  ->  object_type 'alert'
    # ------------------------------------------------------------------
    if _table_exists(conn, "alertas_sistema"):
        op.execute(
            """
            INSERT INTO ontology_object (object_type_id, external_table, external_id, properties)
            SELECT
                ot.id,
                'alertas_sistema',
                al.id::text,
                jsonb_build_object(
                    'severidad',   al.severidad,
                    'tipo',        al.tipo,
                    'titulo',      al.titulo,
                    'descripcion', al.descripcion,
                    'leida',       al.leida,
                    'created_at',  al.created_at
                )
            FROM alertas_sistema al
            JOIN ontology_object_type ot ON ot.code = 'alert'
            ON CONFLICT (external_table, external_id) DO NOTHING
            """
        )

    # ------------------------------------------------------------------
    # 8. Relaciones iniciales
    # ------------------------------------------------------------------

    # actor -> party (MEMBER_OF) via actores.partido (texto) cruzado con partidos.siglas
    if _table_exists(conn, "actores") and _table_exists(conn, "partidos"):
        op.execute(
            """
            INSERT INTO ontology_relation (relation_type_id, source_object_id, target_object_id)
            SELECT
                rt.id,
                ao.id AS source_object_id,
                po.id AS target_object_id
            FROM actores a
            JOIN partidos p ON p.siglas = a.partido
            JOIN ontology_object ao
                ON ao.external_table = 'actores' AND ao.external_id = a.id::text
            JOIN ontology_object po
                ON po.external_table = 'partidos' AND po.external_id = p.id::text
            JOIN ontology_relation_type rt ON rt.code = 'MEMBER_OF'
            ON CONFLICT (relation_type_id, source_object_id, target_object_id) DO NOTHING
            """
        )

    # media_item -> narrative_cluster (BELONGS_TO_NARRATIVE)
    # articulos_prensa no tiene cluster_id directo; se une via topics_bertopic si existe
    # la relacion se crea solo si hay una columna topic_id en articulos_prensa
    if _table_exists(conn, "articulos_prensa") and _table_exists(conn, "topics_bertopic"):
        col_check = conn.execute(
            """
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'articulos_prensa'
              AND column_name = 'topic_id'
            """
        ).fetchone()
        if col_check:
            op.execute(
                """
                INSERT INTO ontology_relation (relation_type_id, source_object_id, target_object_id)
                SELECT
                    rt.id,
                    mo.id AS source_object_id,
                    to_.id AS target_object_id
                FROM articulos_prensa ap
                JOIN topics_bertopic tb ON tb.topic_id = ap.topic_id
                JOIN ontology_object mo
                    ON mo.external_table = 'articulos_prensa' AND mo.external_id = ap.id::text
                JOIN ontology_object to_
                    ON to_.external_table = 'topics_bertopic' AND to_.external_id = tb.id::text
                JOIN ontology_relation_type rt ON rt.code = 'BELONGS_TO_NARRATIVE'
                ON CONFLICT (relation_type_id, source_object_id, target_object_id) DO NOTHING
                """
            )

    # actor co-menciones via noticias_actores (pares dentro del mismo articulo)
    if _table_exists(conn, "noticias_actores"):
        op.execute(
            """
            INSERT INTO ontology_relation (relation_type_id, source_object_id, target_object_id, weight)
            SELECT
                rt.id,
                ao1.id AS source_object_id,
                ao2.id AS target_object_id,
                COUNT(*)::real AS weight
            FROM noticias_actores na1
            JOIN noticias_actores na2
                ON na2.articulo_id = na1.articulo_id
               AND na2.actor_id > na1.actor_id
            JOIN ontology_object ao1
                ON ao1.external_table = 'actores' AND ao1.external_id = na1.actor_id::text
            JOIN ontology_object ao2
                ON ao2.external_table = 'actores' AND ao2.external_id = na2.actor_id::text
            JOIN ontology_relation_type rt ON rt.code = 'CO_MENTIONS'
            GROUP BY rt.id, ao1.id, ao2.id
            ON CONFLICT (relation_type_id, source_object_id, target_object_id) DO NOTHING
            """
        )


def downgrade() -> None:
    op.execute("DELETE FROM ontology_relation")
    op.execute("DELETE FROM ontology_object")
