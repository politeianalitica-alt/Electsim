-- ============================================================
-- Migracion 004: Radar Mediatico
-- Tablas: articulos_prensa, medios_config, topics_bertopic,
--         nlp_resultados, fimi_alertas, spike_eventos
-- ============================================================

-- ------------------------------------------------------------
-- Tabla de medios configurados (seed data incluido)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medios_config (
    id              SERIAL PRIMARY KEY,
    clave           TEXT NOT NULL UNIQUE,
    nombre          TEXT NOT NULL,
    tendencia       TEXT NOT NULL CHECK (tendencia IN (
                        'izquierda','centro_izquierda','centro',
                        'centro_derecha','derecha','economico','regional'
                    )),
    establishment   BOOLEAN NOT NULL DEFAULT false,
    credibilidad    NUMERIC(4,3) NOT NULL CHECK (credibilidad BETWEEN 0 AND 1),
    rss_urls        JSONB NOT NULL DEFAULT '[]',
    activo          BOOLEAN NOT NULL DEFAULT true,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ
);

-- Seed: 19 medios espanoles
INSERT INTO medios_config (clave, nombre, tendencia, establishment, credibilidad, rss_urls)
VALUES
    ('elpais',       'El Pais',           'centro',          true,  0.850, '["https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada"]'),
    ('elmundo',      'El Mundo',          'centro_derecha',  true,  0.800, '["https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml"]'),
    ('abc',          'ABC',               'derecha',         true,  0.750, '["https://www.abc.es/rss/feeds/abc_Portada.xml"]'),
    ('lavanguardia', 'La Vanguardia',     'centro',          true,  0.820, '["https://www.lavanguardia.com/mvc/feed/rss/home"]'),
    ('elconfidencial','El Confidencial',  'centro',          false, 0.780, '["https://rss.elconfidencial.com/espana/"]'),
    ('elespanol',    'El Espanol',        'centro_derecha',  false, 0.700, '["https://www.elespanol.com/rss/"]'),
    ('larazon',      'La Razon',          'derecha',         true,  0.720, '["https://www.larazon.es/rss/"]'),
    ('20minutos',    '20 Minutos',        'centro',          true,  0.720, '["https://www.20minutos.es/rss/"]'),
    ('publico',      'Publico',           'izquierda',       false, 0.700, '["https://www.publico.es/rss.xml"]'),
    ('eldiario',     'elDiario.es',       'izquierda',       false, 0.750, '["https://www.eldiario.es/rss/"]'),
    ('expansion',    'Expansion',         'economico',       true,  0.820, '["https://e00-expansion.uecdn.es/rss/portada.xml"]'),
    ('cincodias',    'Cinco Dias',        'economico',       true,  0.800, '["https://feeds.elpais.com/mrss-s/pages/ep/site/cincodias.elpais.com/portada"]'),
    ('eleconomista', 'El Economista',     'economico',       true,  0.780, '["https://www.eleconomista.es/rss/rss-seleccion-ee.php"]'),
    ('elperiodico',  'El Periodico',      'centro_izquierda',true,  0.760, '["https://www.elperiodico.com/es/rss/rss_portada.xml"]'),
    ('lavozdegalicia','La Voz de Galicia','centro',          true,  0.780, '["https://www.lavozdegalicia.es/rss/galicia.xml"]'),
    ('heraldo',      'Heraldo de Aragon', 'centro',          true,  0.760, '["https://www.heraldo.es/rss/portada.xml"]'),
    ('sur',          'Sur',               'centro',          true,  0.740, '["https://www.diariosur.es/rss/feeds/andalucia.xml"]'),
    ('laverdad',     'La Verdad',         'centro',          true,  0.740, '["https://www.laverdad.es/rss/feeds/portada.xml"]'),
    ('levante',      'Levante',           'centro',          true,  0.740, '["https://www.levante-emv.com/rss/feeds/portada.xml"]')
ON CONFLICT (clave) DO UPDATE SET
    nombre         = EXCLUDED.nombre,
    tendencia      = EXCLUDED.tendencia,
    credibilidad   = EXCLUDED.credibilidad,
    actualizado_en = NOW();


-- ------------------------------------------------------------
-- Tabla principal de articulos de prensa
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS articulos_prensa (
    id                  BIGSERIAL PRIMARY KEY,
    url_hash            TEXT NOT NULL UNIQUE,
    titulo              TEXT NOT NULL,
    url                 TEXT NOT NULL,
    medio               TEXT NOT NULL REFERENCES medios_config (clave) ON UPDATE CASCADE,
    fecha_pub           TIMESTAMPTZ,
    texto_completo      TEXT,
    resumen             TEXT,
    autor               TEXT,
    seccion             TEXT,
    tags                JSONB NOT NULL DEFAULT '[]',
    fuente_ingesta      TEXT NOT NULL DEFAULT 'rss'
                            CHECK (fuente_ingesta IN ('fundus','rss','trafilatura')),

    -- NLP / clasificacion
    categoria_iptc      TEXT,
    score_iptc          NUMERIC(5,4),
    score_sentimiento   NUMERIC(5,4),
    sentimiento_label   TEXT CHECK (sentimiento_label IN ('positivo','negativo','neutral')),
    sentimiento_probas  JSONB,
    hate_label          TEXT,
    hate_score          NUMERIC(5,4),
    hateful             BOOLEAN NOT NULL DEFAULT false,
    emocion_label       TEXT,
    ironica             BOOLEAN NOT NULL DEFAULT false,

    -- Framing
    frame_dominante     TEXT,
    frame_score         NUMERIC(5,4),
    frame_top3          JSONB,

    -- Sesgo y credibilidad
    score_sesgo         NUMERIC(5,3),
    score_credibilidad  NUMERIC(5,3),

    -- BERTopic
    topic_id            INTEGER NOT NULL DEFAULT -1,

    -- FIMI
    fimi_score          NUMERIC(5,3) NOT NULL DEFAULT 0,
    fimi_detecciones    JSONB,

    -- Entidades
    entidades_ner       JSONB,

    -- Timestamps
    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_articulos_prensa_medio       ON articulos_prensa (medio);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_fecha       ON articulos_prensa (fecha_pub DESC);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_categoria   ON articulos_prensa (categoria_iptc);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_topic       ON articulos_prensa (topic_id);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_frame       ON articulos_prensa (frame_dominante);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_creado      ON articulos_prensa (creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_fimi        ON articulos_prensa (fimi_score)
    WHERE fimi_score > 0;
CREATE INDEX IF NOT EXISTS idx_articulos_prensa_hateful     ON articulos_prensa (hateful)
    WHERE hateful = true;


-- ------------------------------------------------------------
-- Topics BERTopic persistidos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS topics_bertopic (
    id              SERIAL PRIMARY KEY,
    topic_id        INTEGER NOT NULL,
    fecha_modelo    DATE NOT NULL DEFAULT CURRENT_DATE,
    label           TEXT NOT NULL,
    palabras_top    JSONB NOT NULL DEFAULT '[]',
    n_articulos     INTEGER NOT NULL DEFAULT 0,
    sesgo_medio     NUMERIC(5,3),
    sentimiento_medio NUMERIC(5,4),
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (topic_id, fecha_modelo)
);

CREATE INDEX IF NOT EXISTS idx_topics_bertopic_fecha ON topics_bertopic (fecha_modelo DESC);


-- ------------------------------------------------------------
-- Alertas FIMI persistidas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fimi_alertas (
    id              BIGSERIAL PRIMARY KEY,
    articulo_id     BIGINT NOT NULL REFERENCES articulos_prensa (id) ON DELETE CASCADE,
    narrativa_id    TEXT NOT NULL,
    narrativa_nombre TEXT NOT NULL,
    severidad       TEXT NOT NULL CHECK (severidad IN ('baja','media','alta','critica')),
    keywords_match  JSONB NOT NULL DEFAULT '[]',
    score_fimi      NUMERIC(5,3) NOT NULL,
    revisado        BOOLEAN NOT NULL DEFAULT false,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fimi_alertas_narrativa  ON fimi_alertas (narrativa_id);
CREATE INDEX IF NOT EXISTS idx_fimi_alertas_severidad  ON fimi_alertas (severidad);
CREATE INDEX IF NOT EXISTS idx_fimi_alertas_creado     ON fimi_alertas (creado_en DESC);


-- ------------------------------------------------------------
-- Eventos de spike de cobertura
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spike_eventos (
    id              BIGSERIAL PRIMARY KEY,
    categoria       TEXT NOT NULL,
    articulos_ventana INTEGER NOT NULL,
    media_historica NUMERIC(8,2),
    ratio_spike     NUMERIC(6,2) NOT NULL,
    ventana_inicio  TIMESTAMPTZ NOT NULL,
    ventana_fin     TIMESTAMPTZ NOT NULL,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spike_eventos_categoria ON spike_eventos (categoria);
CREATE INDEX IF NOT EXISTS idx_spike_eventos_creado    ON spike_eventos (creado_en DESC);


-- ------------------------------------------------------------
-- Metricas diarias por medio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS metricas_medio_diario (
    id              BIGSERIAL PRIMARY KEY,
    medio           TEXT NOT NULL REFERENCES medios_config (clave),
    fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
    n_articulos     INTEGER NOT NULL DEFAULT 0,
    sesgo_medio     NUMERIC(5,3),
    sentimiento_medio NUMERIC(5,4),
    pct_negativo    NUMERIC(5,3),
    pct_hateful     NUMERIC(5,3),
    pct_fimi        NUMERIC(5,3),
    frame_dominante TEXT,
    creado_en       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (medio, fecha)
);


-- ------------------------------------------------------------
-- Vistas
-- ------------------------------------------------------------

-- Cobertura de ultimas 24h con metadatos de medio
CREATE OR REPLACE VIEW v_cobertura_24h AS
SELECT
    ap.url_hash,
    ap.titulo,
    ap.medio,
    m.nombre AS medio_nombre,
    m.tendencia,
    m.credibilidad,
    ap.fecha_pub,
    ap.categoria_iptc,
    ap.sentimiento_label,
    ap.score_sesgo,
    ap.frame_dominante,
    ap.fimi_score,
    ap.topic_id,
    ap.hateful
FROM articulos_prensa ap
JOIN medios_config m ON m.clave = ap.medio
WHERE ap.creado_en >= NOW() - INTERVAL '24 hours'
ORDER BY ap.fecha_pub DESC;

-- Alertas FIMI criticas pendientes de revision
CREATE OR REPLACE VIEW v_fimi_pendientes AS
SELECT
    fa.id,
    fa.narrativa_nombre,
    fa.severidad,
    fa.score_fimi,
    ap.titulo,
    ap.medio,
    ap.url,
    fa.keywords_match,
    fa.creado_en
FROM fimi_alertas fa
JOIN articulos_prensa ap ON ap.id = fa.articulo_id
WHERE fa.revisado = false
  AND fa.severidad IN ('alta', 'critica')
ORDER BY fa.score_fimi DESC, fa.creado_en DESC;

-- Distribucion de topics (ultimas 48h)
CREATE OR REPLACE VIEW v_topics_activos AS
SELECT
    ap.topic_id,
    COALESCE(tb.label, 'topic_' || ap.topic_id) AS label,
    COUNT(*) AS n_articulos,
    AVG(ap.score_sesgo) AS sesgo_medio,
    AVG(ap.score_sentimiento) AS sentimiento_medio,
    MODE() WITHIN GROUP (ORDER BY ap.frame_dominante) AS frame_top
FROM articulos_prensa ap
LEFT JOIN topics_bertopic tb ON tb.topic_id = ap.topic_id
    AND tb.fecha_modelo = CURRENT_DATE
WHERE ap.topic_id >= 0
  AND ap.creado_en >= NOW() - INTERVAL '48 hours'
GROUP BY ap.topic_id, tb.label
ORDER BY n_articulos DESC;


-- ------------------------------------------------------------
-- Funciones de mantenimiento
-- ------------------------------------------------------------

-- Limpieza de articulos con mas de N dias
CREATE OR REPLACE FUNCTION fn_limpiar_articulos_viejos(dias INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER;
BEGIN
    DELETE FROM articulos_prensa
    WHERE creado_en < NOW() - (dias || ' days')::INTERVAL;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Agregar metricas diarias por medio
CREATE OR REPLACE FUNCTION fn_agregar_metricas_diarias(fecha_target DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER;
BEGIN
    INSERT INTO metricas_medio_diario (
        medio, fecha, n_articulos, sesgo_medio, sentimiento_medio,
        pct_negativo, pct_hateful, pct_fimi, frame_dominante
    )
    SELECT
        medio,
        fecha_target,
        COUNT(*),
        AVG(score_sesgo),
        AVG(score_sentimiento),
        AVG(CASE WHEN sentimiento_label = 'negativo' THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN hateful THEN 1.0 ELSE 0.0 END),
        AVG(CASE WHEN fimi_score > 0 THEN 1.0 ELSE 0.0 END),
        MODE() WITHIN GROUP (ORDER BY frame_dominante)
    FROM articulos_prensa
    WHERE fecha_pub::DATE = fecha_target
    GROUP BY medio
    ON CONFLICT (medio, fecha) DO UPDATE SET
        n_articulos      = EXCLUDED.n_articulos,
        sesgo_medio      = EXCLUDED.sesgo_medio,
        sentimiento_medio = EXCLUDED.sentimiento_medio,
        pct_negativo     = EXCLUDED.pct_negativo,
        pct_hateful      = EXCLUDED.pct_hateful,
        pct_fimi         = EXCLUDED.pct_fimi,
        frame_dominante  = EXCLUDED.frame_dominante;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- ------------------------------------------------------------
-- pg_cron jobs (requiere pg_cron extension)
-- ------------------------------------------------------------
-- SELECT cron.schedule('limpiar-articulos-viejos', '0 3 * * 0', 'SELECT fn_limpiar_articulos_viejos(90)');
-- SELECT cron.schedule('agregar-metricas-diarias', '30 1 * * *', 'SELECT fn_agregar_metricas_diarias()');
