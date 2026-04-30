-- ============================================================
-- Migracion 005: Noticias-Actores con pgvector y RAG
-- Nuevas tablas: actores, noticias_actores, actor_relaciones,
--                actor_briefings
-- ALTER TABLE articulos_prensa: resumen_ollama, entidades_ollama,
--                               embedding vector(768), procesado_ollama
-- ============================================================

-- Requiere: pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- Para busqueda por similitud en nombres

-- ------------------------------------------------------------
-- ALTER TABLE articulos_prensa — campos Ollama
-- ------------------------------------------------------------
ALTER TABLE articulos_prensa
    ADD COLUMN IF NOT EXISTS resumen_ollama    TEXT,
    ADD COLUMN IF NOT EXISTS entidades_ollama  JSONB,
    ADD COLUMN IF NOT EXISTS embedding         vector(768),
    ADD COLUMN IF NOT EXISTS procesado_ollama  BOOLEAN NOT NULL DEFAULT false;

-- Indice HNSW para busqueda ANN por coseno
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_embedding_hnsw
    ON articulos_prensa
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Indice para filtrar no procesados rapidamente
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_no_procesado
    ON articulos_prensa (creado_en DESC)
    WHERE procesado_ollama = false;


-- ------------------------------------------------------------
-- Tabla actores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actores (
    id                  SERIAL PRIMARY KEY,
    nombre              TEXT NOT NULL,
    nombre_normalizado  TEXT NOT NULL UNIQUE,   -- lowercase, sin acentos
    aliases             TEXT[] NOT NULL DEFAULT '{}',
    partido             TEXT,
    cargo               TEXT,
    nivel               TEXT CHECK (nivel IN ('nacional','autonomico','local','europeo','internacional')),
    biografia           TEXT,
    relevancia          NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (relevancia BETWEEN 0 AND 1),

    -- Metricas calculadas por el pipeline
    n_menciones_7d      INTEGER NOT NULL DEFAULT 0,
    n_menciones_30d     INTEGER NOT NULL DEFAULT 0,
    sentimiento_medio   NUMERIC(5,4),

    -- Timestamps
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ
);

-- Indice GIN para busqueda en array aliases
CREATE INDEX IF NOT EXISTS idx_actores_aliases ON actores USING gin (aliases);
-- Indice GIN para similitud pg_trgm
CREATE INDEX IF NOT EXISTS idx_actores_nombre_trgm ON actores USING gin (nombre_normalizado gin_trgm_ops);

-- Seed: actores politicos espanoles principales (2026)
INSERT INTO actores (nombre, nombre_normalizado, partido, cargo, nivel, relevancia, aliases)
VALUES
    ('Pedro Sanchez',    'pedro sanchez',    'PSOE', 'Presidente del Gobierno',              'nacional', 1.0, ARRAY['sanchez', 'pedro sanchez perez-castejon']),
    ('Alberto Nunez Feijoo', 'alberto nunez feijoo', 'PP', 'Lider del Partido Popular', 'nacional', 0.95, ARRAY['feijoo', 'alberto feijoo']),
    ('Santiago Abascal',  'santiago abascal', 'VOX', 'Lider de Vox',                         'nacional', 0.90, ARRAY['abascal']),
    ('Yolanda Diaz',      'yolanda diaz',     'Sumar', 'Lider de Sumar, Ministra de Trabajo', 'nacional', 0.85, ARRAY['yolanda', 'diaz rechenthal']),
    ('Teresa Ribera',     'teresa ribera',    'PSOE', 'Vicepresidenta / Comisaria EU',         'europeo',  0.80, ARRAY['ribera', 'teresa ribera rodriguez']),
    ('Isabel Diaz Ayuso', 'isabel diaz ayuso','PP',   'Presidenta Comunidad de Madrid',        'autonomico', 0.88, ARRAY['ayuso', 'diaz ayuso']),
    ('Carles Puigdemont', 'carles puigdemont','Junts', 'Lider de Junts per Catalunya',         'autonomico', 0.82, ARRAY['puigdemont', 'el president']),
    ('Oriol Junqueras',   'oriol junqueras',  'ERC',  'Lider de ERC',                          'autonomico', 0.75, ARRAY['junqueras']),
    ('Ione Belarra',      'ione belarra',     'Podemos', 'Secretaria General de Podemos',      'nacional', 0.72, ARRAY['belarra'])
ON CONFLICT (nombre_normalizado) DO UPDATE SET
    aliases     = EXCLUDED.aliases,
    partido     = EXCLUDED.partido,
    cargo       = EXCLUDED.cargo,
    relevancia  = EXCLUDED.relevancia,
    actualizado_en = NOW();


-- ------------------------------------------------------------
-- Tabla junction noticias_actores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS noticias_actores (
    id              BIGSERIAL PRIMARY KEY,
    articulo_id     BIGINT NOT NULL REFERENCES articulos_prensa (id) ON DELETE CASCADE,
    actor_id        INTEGER NOT NULL REFERENCES actores (id) ON DELETE CASCADE,
    rol_en_noticia  TEXT,                   -- 'protagonista' | 'mencionado' | 'citado'
    es_protagonista BOOLEAN NOT NULL DEFAULT false,
    confianza       NUMERIC(4,3) DEFAULT 1.0,   -- confianza del linking (1.0=exacto, <1=pg_trgm)
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (articulo_id, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_noticias_actores_actor   ON noticias_actores (actor_id);
CREATE INDEX IF NOT EXISTS idx_noticias_actores_articulo ON noticias_actores (articulo_id);
CREATE INDEX IF NOT EXISTS idx_noticias_actores_creado   ON noticias_actores (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_actores_protagn  ON noticias_actores (actor_id, es_protagonista)
    WHERE es_protagonista = true;


-- ------------------------------------------------------------
-- Tabla actor_relaciones (grafo co-menciones con decay)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actor_relaciones (
    id                  BIGSERIAL PRIMARY KEY,
    actor_a_id          INTEGER NOT NULL REFERENCES actores (id) ON DELETE CASCADE,
    actor_b_id          INTEGER NOT NULL REFERENCES actores (id) ON DELETE CASCADE,
    n_co_menciones      INTEGER NOT NULL DEFAULT 1,
    ultima_co_mencion   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo_relacion       TEXT,   -- 'alianza' | 'oposicion' | 'neutral' | NULL
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (actor_a_id, actor_b_id),
    CHECK (actor_a_id < actor_b_id)   -- Canonico: a < b siempre
);

CREATE INDEX IF NOT EXISTS idx_actor_relaciones_a       ON actor_relaciones (actor_a_id);
CREATE INDEX IF NOT EXISTS idx_actor_relaciones_b       ON actor_relaciones (actor_b_id);
CREATE INDEX IF NOT EXISTS idx_actor_relaciones_ultima  ON actor_relaciones (ultima_co_mencion DESC);


-- ------------------------------------------------------------
-- Tabla actor_briefings (briefings LLM automaticos)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS actor_briefings (
    id              BIGSERIAL PRIMARY KEY,
    actor_id        INTEGER NOT NULL REFERENCES actores (id) ON DELETE CASCADE,
    contenido       TEXT NOT NULL,
    n_noticias_base INTEGER NOT NULL DEFAULT 0,
    modelo_llm      TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_actor_briefings_actor  ON actor_briefings (actor_id);
CREATE INDEX IF NOT EXISTS idx_actor_briefings_creado ON actor_briefings (creado_en DESC);


-- ------------------------------------------------------------
-- Vistas
-- ------------------------------------------------------------

-- Dashboard por actor: menciones + sentimiento + relaciones top
CREATE OR REPLACE VIEW v_actor_dashboard AS
SELECT
    a.id,
    a.nombre,
    a.partido,
    a.cargo,
    a.nivel,
    a.relevancia,
    a.n_menciones_7d,
    a.n_menciones_30d,
    a.sentimiento_medio,
    (
        SELECT COUNT(*) FROM actor_relaciones ar
        WHERE ar.actor_a_id = a.id OR ar.actor_b_id = a.id
    ) AS n_relaciones,
    (
        SELECT ab.contenido FROM actor_briefings ab
        WHERE ab.actor_id = a.id
        ORDER BY ab.creado_en DESC LIMIT 1
    ) AS ultimo_briefing
FROM actores a
ORDER BY a.n_menciones_7d DESC;


-- Feed de noticias de un actor (para consulta parametrizada)
CREATE OR REPLACE VIEW v_noticias_actor_feed AS
SELECT
    na.actor_id,
    ap.url_hash,
    ap.titulo,
    COALESCE(ap.resumen_ollama, ap.resumen) AS resumen,
    ap.medio,
    ap.fecha_pub,
    ap.score_sentimiento,
    ap.frame_dominante,
    ap.fimi_score,
    na.es_protagonista,
    na.confianza
FROM noticias_actores na
JOIN articulos_prensa ap ON ap.id = na.articulo_id
ORDER BY ap.fecha_pub DESC;


-- Grafo de relaciones (para visualizacion networkx/pyvis)
CREATE OR REPLACE VIEW v_grafo_relaciones AS
SELECT
    ar.actor_a_id                           AS source,
    a_a.nombre                              AS source_nombre,
    a_a.partido                             AS source_partido,
    ar.actor_b_id                           AS target,
    a_b.nombre                              AS target_nombre,
    a_b.partido                             AS target_partido,
    ar.n_co_menciones                       AS peso,
    CASE
        WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '7 days'  THEN 1.0
        WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '30 days' THEN 0.8
        WHEN ar.ultima_co_mencion >= NOW() - INTERVAL '90 days' THEN 0.6
        ELSE 0.3
    END                                     AS peso_decay,
    ar.tipo_relacion,
    ar.ultima_co_mencion
FROM actor_relaciones ar
JOIN actores a_a ON a_a.id = ar.actor_a_id
JOIN actores a_b ON a_b.id = ar.actor_b_id
WHERE ar.n_co_menciones >= 2
ORDER BY ar.n_co_menciones DESC;


-- ------------------------------------------------------------
-- Funciones de utilidad
-- ------------------------------------------------------------

-- Busqueda semantica de actores similares (por nombre, pg_trgm)
CREATE OR REPLACE FUNCTION fn_buscar_actores_similares(
    query_nombre TEXT,
    umbral FLOAT DEFAULT 0.3,
    limite INTEGER DEFAULT 5
)
RETURNS TABLE (
    id        INTEGER,
    nombre    TEXT,
    partido   TEXT,
    sim       FLOAT
)
LANGUAGE SQL STABLE AS $$
    SELECT
        a.id,
        a.nombre,
        a.partido,
        similarity(a.nombre_normalizado, LOWER(query_nombre)) AS sim
    FROM actores a
    WHERE similarity(a.nombre_normalizado, LOWER(query_nombre)) > umbral
    ORDER BY sim DESC
    LIMIT limite;
$$;


-- Funcion para obtener contexto de actor para RAG (JSON compacto)
CREATE OR REPLACE FUNCTION fn_contexto_actor_rag(
    p_actor_id INTEGER,
    p_dias      INTEGER DEFAULT 30,
    p_max_noticias INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_actor      JSONB;
    v_noticias   JSONB;
BEGIN
    SELECT to_jsonb(a) INTO v_actor
    FROM actores a WHERE a.id = p_actor_id;

    SELECT jsonb_agg(row_to_json(n)) INTO v_noticias
    FROM (
        SELECT ap.titulo, COALESCE(ap.resumen_ollama, ap.resumen) AS resumen,
               ap.medio, ap.fecha_pub, ap.score_sentimiento
        FROM articulos_prensa ap
        JOIN noticias_actores na ON na.articulo_id = ap.id
        WHERE na.actor_id = p_actor_id
          AND ap.fecha_pub >= NOW() - (p_dias || ' days')::INTERVAL
        ORDER BY ap.fecha_pub DESC
        LIMIT p_max_noticias
    ) n;

    RETURN jsonb_build_object(
        'actor',    v_actor,
        'noticias', COALESCE(v_noticias, '[]'::jsonb)
    );
END;
$$;
