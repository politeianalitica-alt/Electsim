-- 0016_geopolitica_enhanced.sql
-- Módulo Geopolítica & RRII v2 — Schema completo
-- Ejecutar: psql $DATABASE_URL < db/migrations/0016_geopolitica_enhanced.sql

-- ── eventos_acled ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos_acled (
    id              BIGSERIAL PRIMARY KEY,
    acled_id        INTEGER UNIQUE,
    pais            VARCHAR(3),                    -- ISO 3166-1 alpha-3
    pais_nombre     VARCHAR(100),
    region          VARCHAR(100),
    fecha           DATE NOT NULL,
    tipo_evento     VARCHAR(100),
    subtipo         VARCHAR(100),
    actor1          TEXT,
    actor2          TEXT,
    latitud         FLOAT,
    longitud        FLOAT,
    fatalities      INTEGER NOT NULL DEFAULT 0,
    relevancia_es   FLOAT NOT NULL DEFAULT 0.0,   -- 0.0-1.0 calculado
    notas           TEXT,
    fuente          VARCHAR(50) NOT NULL DEFAULT 'ACLED',
    scrapeado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acled_pais_fecha   ON eventos_acled(pais, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_acled_relevancia   ON eventos_acled(relevancia_es DESC);
CREATE INDEX IF NOT EXISTS idx_acled_fatalities   ON eventos_acled(fatalities DESC);

-- ── riesgo_pais ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS riesgo_pais (
    id                          BIGSERIAL PRIMARY KEY,
    pais                        VARCHAR(3) UNIQUE NOT NULL,
    nombre                      VARCHAR(100),
    score_acled                 FLOAT NOT NULL DEFAULT 0.0,
    score_gobernanza            FLOAT NOT NULL DEFAULT 0.0,
    score_economico             FLOAT NOT NULL DEFAULT 0.0,
    score_social                FLOAT NOT NULL DEFAULT 0.0,
    score_total                 FLOAT NOT NULL DEFAULT 0.0,
    interes_espana              FLOAT NOT NULL DEFAULT 0.0,   -- 0.0-1.0
    tipo_interes                TEXT[],
    empresas_espanolas          TEXT[],
    resumen_ollama              TEXT,
    riesgo_tendencia            VARCHAR(20) DEFAULT 'estable',
    lat_capital                 FLOAT,
    lon_capital                 FLOAT,
    flag_emoji                  VARCHAR(10),
    poblacion                   BIGINT,
    pib_per_capita              FLOAT,
    ultima_actualizacion        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_riesgo_total       ON riesgo_pais(score_total DESC);
CREATE INDEX IF NOT EXISTS idx_riesgo_interes     ON riesgo_pais(interes_espana DESC);

-- ── osint_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS osint_items (
    id                      BIGSERIAL PRIMARY KEY,
    titulo                  TEXT NOT NULL,
    contenido               TEXT,
    resumen_ollama          TEXT,
    url                     TEXT UNIQUE,
    fuente                  VARCHAR(200),
    fuente_tipo             VARCHAR(50),
    idioma_original         VARCHAR(10) NOT NULL DEFAULT 'en',
    paises_mencionados      TEXT[],
    actores_mencionados     TEXT[],
    temas                   TEXT[],
    relevancia_espana       FLOAT NOT NULL DEFAULT 0.0,
    urgencia                SMALLINT NOT NULL DEFAULT 1 CHECK (urgencia BETWEEN 1 AND 5),
    sentimiento             VARCHAR(20) DEFAULT 'neutro',
    categoria               VARCHAR(100),
    subcategoria            VARCHAR(100),
    fecha_publicacion       TIMESTAMPTZ,
    fecha_scraping          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    procesado_llm           BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_osint_fecha        ON osint_items(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_osint_urgencia     ON osint_items(urgencia DESC, fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_osint_relevancia   ON osint_items(relevancia_espana DESC);
CREATE INDEX IF NOT EXISTS idx_osint_procesado    ON osint_items(procesado_llm) WHERE procesado_llm = FALSE;
CREATE INDEX IF NOT EXISTS idx_osint_categoria    ON osint_items(categoria);

-- ── impacto_domestico ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS impacto_domestico (
    id                      BIGSERIAL PRIMARY KEY,
    evento_origen_id        BIGINT,
    evento_origen_tipo      VARCHAR(20) DEFAULT 'osint',
    titulo                  TEXT NOT NULL,
    descripcion             TEXT,
    dimension               VARCHAR(50) NOT NULL,
    severidad               SMALLINT NOT NULL DEFAULT 2 CHECK (severidad BETWEEN 1 AND 5),
    horizonte               VARCHAR(20) DEFAULT 'medio_plazo',
    probabilidad            FLOAT NOT NULL DEFAULT 0.5,
    analisis_ollama         TEXT,
    recomendacion           TEXT,
    sectores_afectados      TEXT[],
    empresas_afectadas      TEXT[],
    partidos_implicados     TEXT[],
    confianza               FLOAT NOT NULL DEFAULT 0.7,
    revisado_humano         BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impacto_dimension  ON impacto_domestico(dimension, severidad DESC);
CREATE INDEX IF NOT EXISTS idx_impacto_severidad  ON impacto_domestico(severidad DESC);

-- ── alertas_geo ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alertas_geo (
    id                      BIGSERIAL PRIMARY KEY,
    tipo                    VARCHAR(50) NOT NULL,
    titulo                  TEXT NOT NULL,
    descripcion             TEXT,
    nivel                   VARCHAR(20) NOT NULL CHECK (nivel IN ('CRITICO','ALTO','MEDIO','BAJO')),
    paises                  TEXT[],
    items_osint_ids         BIGINT[],
    eventos_acled_ids       BIGINT[],
    enviado_telegram        BOOLEAN NOT NULL DEFAULT FALSE,
    leida                   BOOLEAN NOT NULL DEFAULT FALSE,
    valida_hasta            TIMESTAMPTZ,
    fuente_alerta           VARCHAR(50) DEFAULT 'sistema',
    creada_en               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_nivel      ON alertas_geo(nivel, creada_en DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_leida      ON alertas_geo(leida) WHERE leida = FALSE;

-- ── espana_mundo ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS espana_mundo (
    id                      BIGSERIAL PRIMARY KEY,
    pais                    VARCHAR(3) NOT NULL,
    tipo_presencia          VARCHAR(50),
    descripcion             TEXT,
    actor_espanol           TEXT,
    relevancia              FLOAT NOT NULL DEFAULT 0.5,
    lat                     FLOAT,
    lon                     FLOAT,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_verificacion     DATE,
    fuente                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_espana_pais        ON espana_mundo(pais);
CREATE INDEX IF NOT EXISTS idx_espana_tipo        ON espana_mundo(tipo_presencia);

-- ── Datos iniciales de riesgo y presencia española ───────────────────────────
INSERT INTO riesgo_pais
    (pais, nombre, interes_espana, tipo_interes, empresas_espanolas,
     lat_capital, lon_capital, flag_emoji, score_total, riesgo_tendencia)
VALUES
    ('DZA','Argelia',    0.95, ARRAY['energia','gas','migracion'],       ARRAY['Repsol','Naturgy','Enagas'],           36.7,  3.0,  '🇩🇿', 6.5, 'estable'),
    ('MAR','Marruecos',  0.92, ARRAY['migracion','energia','comercio'],  ARRAY['OCP','ONCF','IAG-Iberia'],            33.9, -6.9,  '🇲🇦', 5.5, 'estable'),
    ('UKR','Ucrania',    0.88, ARRAY['seguridad','otan','energia'],      ARRAY['Iberdrola','Repsol'],                 50.4, 30.5,  '🇺🇦', 9.0, 'subiendo'),
    ('LBY','Libia',      0.85, ARRAY['migracion','petroleo'],            ARRAY['Repsol'],                             32.9, 13.2,  '🇱🇾', 8.0, 'subiendo'),
    ('VEN','Venezuela',  0.80, ARRAY['diaspora','energia'],              ARRAY['Repsol','BBVA','Santander'],           8.0,-66.0,  '🇻🇪', 7.5, 'estable'),
    ('MEX','Mexico',     0.78, ARRAY['comercio','empresarial','diaspora'],ARRAY['BBVA','Santander','Telefonica','IAG'],19.4,-99.1, '🇲🇽', 4.5, 'subiendo'),
    ('RUS','Rusia',      0.85, ARRAY['energia','seguridad'],             ARRAY['Naturgy','Repsol'],                   55.7, 37.6,  '🇷🇺', 9.5, 'subiendo'),
    ('TUR','Turquía',    0.75, ARRAY['otan','comercio','energia'],       ARRAY['Santander','Inditex','IAG'],          39.9, 32.9,  '🇹🇷', 6.5, 'estable'),
    ('MLI','Mali',       0.75, ARRAY['seguridad','defensa','sahel'],     ARRAY['EUTM-Mali'],                          12.7, -8.0,  '🇲🇱', 8.5, 'subiendo'),
    ('IRQ','Iraq',       0.65, ARRAY['petroleo','energia'],              ARRAY['Repsol','Técnicas Reunidas'],          33.3, 44.4, '🇮🇶', 7.0, 'estable'),
    ('BRA','Brasil',     0.72, ARRAY['comercio','empresarial','diaspora'],ARRAY['Santander','Telefonica','Iberdrola'], -15.8,-47.9,'🇧🇷', 4.0, 'estable'),
    ('COL','Colombia',   0.70, ARRAY['comercio','empresarial'],          ARRAY['Telefonica','ISS'],                    4.7,-74.1, '🇨🇴', 5.5, 'subiendo'),
    ('IRN','Iran',       0.70, ARRAY['energia','nuclear'],               ARRAY[],                                     35.7, 51.4, '🇮🇷', 8.0, 'subiendo'),
    ('PSE','Palestina',  0.75, ARRAY['diplomacia','derechos_humanos'],   ARRAY[],                                     31.9, 35.2, '🇵🇸', 9.0, 'subiendo'),
    ('SAU','Arabia Saudí',0.65,ARRAY['energia','comercio','inversion'],  ARRAY['OHL','Indra','Técnicas Reunidas'],    24.7, 46.7, '🇸🇦', 5.0, 'estable'),
    ('NER','Niger',      0.70, ARRAY['migracion','sahel'],               ARRAY[],                                     13.5, 2.1,  '🇳🇪', 8.5, 'subiendo'),
    ('BFA','Burkina Faso',0.65,ARRAY['sahel','migracion'],               ARRAY[],                                     12.4, -1.5, '🇧🇫', 8.0, 'subiendo')
ON CONFLICT (pais) DO NOTHING;

INSERT INTO espana_mundo (pais, tipo_presencia, descripcion, actor_espanol, lat, lon, relevancia)
VALUES
    ('MLI','militar',     'Misión EUTM Mali — entrenamiento FFAA malienses',  'Ejército Tierra', 12.7, -8.0,  0.9),
    ('IRQ','militar',     'Misión Resolute Support OTAN Iraq',                'Ejército Tierra', 33.3, 44.4,  0.8),
    ('LBN','militar',     'Misión UNIFIL ONU Líbano — ~650 efectivos',        'Ejército Tierra', 33.3, 35.5,  0.9),
    ('LVA','militar',     'Batallón multinacional OTAN — Letonia',            'Ejército Tierra', 56.9, 24.1,  0.85),
    ('DZA','energetica',  'Gasoducto Medgaz — 10 bcm/año gas argelino',       'Naturgy/Enagas',  36.7, 3.0,   0.95),
    ('DZA','energetica',  'Gasoducto TransMed (vía Italia)',                  'Enagas',          36.5, 5.0,   0.9),
    ('MEX','empresarial', 'BBVA México — mayor filial del grupo',             'BBVA',            19.4,-99.1,  0.85),
    ('BRA','empresarial', 'Santander Brasil — ~25% beneficio grupo',         'Santander',       -15.8,-47.9, 0.85),
    ('GBR','diplomatica', 'Cuestión de Gibraltar — negociación UE-UK',        'MAEC',            36.1, -5.4,  0.85),
    ('MAR','diplomatica', 'Relación bilateral normalizada 2022-',             'MAEC',            33.9, -6.9,  0.9),
    ('ARG','diaspora',    'Mayor comunidad española en Latinoamérica',        'MAEC',           -34.6,-58.4, 0.8),
    ('FRA','diaspora',    '~330.000 españoles residentes en Francia',         'MAEC',            48.9, 2.3,   0.8),
    ('QAT','energetica',  'Contratos GNL Qatar — diversificación gas',        'Naturgy/Repsol',  25.3, 51.5,  0.8)
ON CONFLICT DO NOTHING;
