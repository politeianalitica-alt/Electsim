-- 0060_platform_consolidation_views.sql
-- Capa canónica mínima para la nueva plataforma ElectSim.
--
-- Objetivo:
--   1. Mantener PostgreSQL/Timescale como fuente única relacional.
--   2. Unificar tablas históricas y nuevas mediante vistas `core.*`.
--   3. Evitar migraciones destructivas hasta que la API consuma solo esta capa.
--
-- Almacenes mínimos recomendados:
--   - PostgreSQL/Timescale: datos estructurados, series temporales, entidades, eventos.
--   - MinIO: blobs grandes, exports, documentos brutos.
--   - Vector index: pgvector a medio plazo; Chroma solo como índice local temporal.

CREATE SCHEMA IF NOT EXISTS core;

-- Workspaces/clientes canónicos. La app ya prioriza `clientes`; si está vacío,
-- dejamos unos workspaces operativos para que el Centro de Operaciones no arranque vacío.
INSERT INTO public.clientes (nombre, tipo, ambito, config_json, activo)
SELECT *
FROM (
    VALUES
        ('España 2026', 'politico', 'nacional', '{"terms":["España","Gobierno","Congreso","PP","PSOE","VOX","Sumar"]}'::jsonb, true),
        ('Energía & Utilities', 'sector', 'nacional', '{"terms":["energía","electricidad","renovables","Iberdrola","Endesa","Repsol"]}'::jsonb, true),
        ('Banca & Seguros', 'sector', 'nacional', '{"terms":["banca","seguros","Banco Santander","BBVA","CaixaBank","DORA"]}'::jsonb, true),
        ('Digital & Telecom', 'sector', 'europeo', '{"terms":["telecomunicaciones","IA","AI Act","datos","ciberseguridad","NIS2"]}'::jsonb, true)
) AS seed(nombre, tipo, ambito, config_json, activo)
WHERE NOT EXISTS (SELECT 1 FROM public.clientes);

CREATE OR REPLACE VIEW core.workspaces AS
SELECT
    ('cliente-' || id::text) AS workspace_id,
    id AS cliente_id,
    nombre,
    tipo,
    ambito,
    config_json,
    activo,
    creado_en
FROM public.clientes
WHERE activo IS TRUE;

-- Feed canónico: prensa española, news_articles internacional y contenido mediático.
CREATE OR REPLACE VIEW core.content_items AS
SELECT
    'news_articles'::text AS source_table,
    ('news_articles:' || id::text) AS item_id,
    id::bigint AS source_pk,
    title AS title,
    content AS body,
    COALESCE(ai_summary, left(content, 280), title) AS summary,
    url,
    source_name,
    published_at,
    scraped_at AS ingested_at,
    COALESCE(ai_category, 'general') AS category,
    ai_sentiment AS sentiment_label,
    NULL::numeric AS sentiment_score,
    ai_relevance::numeric AS relevance_score,
    source_region AS region,
    source_country AS country,
    ai_geo_location AS geo_location,
    ai_geo_lat AS geo_lat,
    ai_geo_lon AS geo_lon,
    ai_entities AS entities,
    to_jsonb(ai_topics) AS topics,
    NULL::integer AS cliente_id,
    jsonb_build_object(
        'ai_analysis', ai_analysis,
        'ai_urgency', ai_urgency,
        'ai_spain_impact', ai_spain_impact,
        'ai_impact_areas', ai_impact_areas
    ) AS metadata
FROM public.news_articles

UNION ALL

SELECT
    'noticias_prensa'::text AS source_table,
    ('noticias_prensa:' || id::text) AS item_id,
    id::bigint AS source_pk,
    titular AS title,
    COALESCE(resumen, subtitular, titular) AS body,
    COALESCE(resumen, subtitular, titular) AS summary,
    url,
    fuente AS source_name,
    fecha_publicacion::timestamptz AS published_at,
    COALESCE(created_at, fecha_scraping)::timestamptz AS ingested_at,
    COALESCE(categoria, 'general') AS category,
    sentimiento_label AS sentiment_label,
    sentimiento_score AS sentiment_score,
    relevancia_score AS relevance_score,
    NULL::text AS region,
    'ES'::text AS country,
    NULL::text AS geo_location,
    NULL::double precision AS geo_lat,
    NULL::double precision AS geo_lon,
    jsonb_build_object(
        'partidos', string_to_array(COALESCE(partidos_mencionados, ''), ',')
    ) AS entities,
    to_jsonb(temas_json) AS topics,
    NULL::integer AS cliente_id,
    '{}'::jsonb AS metadata
FROM public.noticias_prensa

UNION ALL

SELECT
    'contenido_mediatico'::text AS source_table,
    ('contenido_mediatico:' || id::text) AS item_id,
    id::bigint AS source_pk,
    titular AS title,
    COALESCE(texto_completo, resumen, titular) AS body,
    COALESCE(resumen, left(texto_completo, 280), titular) AS summary,
    url,
    COALESCE(medio, fuente) AS source_name,
    fecha_publicacion AS published_at,
    fecha_ingesta AS ingested_at,
    COALESCE(categoria, 'general') AS category,
    sentimiento_label AS sentiment_label,
    sentimiento_score::numeric AS sentiment_score,
    NULL::numeric AS relevance_score,
    NULL::text AS region,
    NULL::text AS country,
    NULL::text AS geo_location,
    NULL::double precision AS geo_lat,
    NULL::double precision AS geo_lon,
    jsonb_build_object(
        'partidos', string_to_array(COALESCE(partidos_mencionados, ''), ','),
        'personas', string_to_array(COALESCE(personas_mencionadas, ''), ',')
    ) AS entities,
    categorias_json AS topics,
    cliente_id,
    jsonb_build_object(
        'tipo', tipo,
        'autor', autor,
        'alcance_est', alcance_est,
        'engagement', jsonb_build_object('likes', likes, 'shares', shares, 'comentarios', comentarios)
    ) AS metadata
FROM public.contenido_mediatico;

CREATE OR REPLACE VIEW core.content_recent AS
SELECT *
FROM core.content_items
WHERE ingested_at >= now() - interval '14 days'
ORDER BY COALESCE(relevance_score, 0) DESC, published_at DESC NULLS LAST, ingested_at DESC;

CREATE OR REPLACE VIEW core.media_sentiment_daily AS
SELECT
    fecha,
    entidad,
    tipo_entidad,
    n_noticias,
    sentimiento_medio,
    pct_positivo,
    pct_negativo,
    pct_neutro,
    fuentes_json,
    temas_top_json,
    created_at
FROM public.sentimiento_prensa_diario;

CREATE OR REPLACE VIEW core.electoral_estimates AS
SELECT
    e.id,
    e.fecha_estimacion,
    e.partido_id,
    COALESCE(p.siglas, e.partido_id::text) AS partido,
    p.nombre_completo AS partido_nombre,
    e.estimacion_pct,
    e.ic_95_inf,
    e.ic_95_sup,
    e.n_encuestas,
    e.modelo,
    e.ventana_dias,
    e.run_id,
    e.cobertura_pct,
    e.consenso_sd,
    e.confianza_modelo,
    e.n_fuentes_usadas,
    e.tipos_fuente_json,
    e.created_at
FROM public.estimaciones_voto_agregadas e
LEFT JOIN public.partidos p ON p.id = e.partido_id;

CREATE OR REPLACE VIEW core.social_indicators AS
SELECT
    id,
    indicador,
    codigo_ine,
    valor,
    unidad,
    fecha,
    ccaa_id,
    fuente,
    created_at
FROM public.indicadores_sociales;

CREATE OR REPLACE VIEW core.source_status AS
SELECT
    source_id,
    source_type,
    fecha,
    articles_count,
    errors_count,
    avg_latency_ms,
    freshness_lag_s,
    status,
    checked_at
FROM public.source_health;

-- Preparación para consolidar Chroma dentro de PostgreSQL con pgvector.
-- nomic-embed-text devuelve 768 dimensiones. Si se cambia el modelo, crear
-- una tabla paralela o migración explícita antes de mezclar dimensiones.
CREATE TABLE IF NOT EXISTS core.document_embeddings (
    item_id text PRIMARY KEY,
    source_table text NOT NULL,
    source_pk bigint,
    embedding vector(768),
    embedding_model text NOT NULL DEFAULT 'nomic-embed-text',
    content_hash text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_model
    ON core.document_embeddings (embedding_model);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_source
    ON core.document_embeddings (source_table, source_pk);

-- Resumen de salud para que la API/React pueda comprobar si hay datos vivos.
CREATE OR REPLACE VIEW core.platform_health AS
SELECT 'workspaces' AS area, count(*)::bigint AS records, max(creado_en)::timestamptz AS latest_at FROM public.clientes
UNION ALL
SELECT 'content_items', count(*)::bigint, max(ingested_at) FROM core.content_items
UNION ALL
SELECT 'news_articles', count(*)::bigint, max(scraped_at) FROM public.news_articles
UNION ALL
SELECT 'noticias_prensa', count(*)::bigint, max(created_at)::timestamptz FROM public.noticias_prensa
UNION ALL
SELECT 'contenido_mediatico', count(*)::bigint, max(fecha_ingesta) FROM public.contenido_mediatico
UNION ALL
SELECT 'electoral_estimates', count(*)::bigint, max(created_at)::timestamptz FROM public.estimaciones_voto_agregadas
UNION ALL
SELECT 'social_indicators', count(*)::bigint, max(created_at)::timestamptz FROM public.indicadores_sociales
UNION ALL
SELECT 'media_sentiment_daily', count(*)::bigint, max(created_at)::timestamptz FROM public.sentimiento_prensa_diario;

COMMENT ON SCHEMA core IS 'Capa canónica no destructiva para la nueva plataforma ElectSim.';
COMMENT ON VIEW core.content_items IS 'Feed unificado de contenido mediático/noticias para consumir desde API y RAG.';
COMMENT ON VIEW core.platform_health IS 'Contadores operativos de las tablas/vistas que alimentan la plataforma.';
