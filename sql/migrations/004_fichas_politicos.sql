-- ══════════════════════════════════════════════════════════════
-- TABLA PRINCIPAL: datos estáticos del político
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS politicos (
    politico_id         TEXT        PRIMARY KEY,  -- slug: "pedro_sanchez"
    nombre_completo     TEXT        NOT NULL,
    nombre_corto        TEXT        NOT NULL,
    partido_actual      TEXT        NOT NULL,
    cargo_actual        TEXT        NOT NULL,
    cargo_institucional TEXT,
    grupo_parlamentario TEXT,
    circunscripcion     TEXT,
    es_diputado         BOOLEAN     DEFAULT FALSE,
    es_senador          BOOLEAN     DEFAULT FALSE,
    es_ministro         BOOLEAN     DEFAULT FALSE,
    es_lider_partido    BOOLEAN     DEFAULT FALSE,
    fecha_nacimiento    DATE,
    lugar_nacimiento    TEXT,
    nacionalidad        TEXT        DEFAULT 'española',
    formacion           TEXT[],
    sueldo_bruto_anual  NUMERIC(12,2),
    sueldo_fuente       TEXT,
    complementos        JSONB,
    url_congreso        TEXT,
    url_partido         TEXT,
    url_wikipedia_es    TEXT,
    twitter_handle      TEXT,
    foto_url            TEXT,
    fecha_ingesta       TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- TABLA: trayectoria política (timeline de cargos)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS politicos_trayectoria (
    id              BIGSERIAL   PRIMARY KEY,
    politico_id     TEXT        NOT NULL REFERENCES politicos(politico_id),
    cargo           TEXT        NOT NULL,
    organizacion    TEXT        NOT NULL,
    tipo_cargo      TEXT        NOT NULL,
    ambito          TEXT,
    fecha_inicio    DATE,
    fecha_fin       DATE,
    es_cargo_actual BOOLEAN     DEFAULT FALSE,
    descripcion     TEXT,
    UNIQUE (politico_id, cargo, organizacion, fecha_inicio)
);

-- ══════════════════════════════════════════════════════════════
-- TABLA: declaraciones patrimoniales y bienes
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS politicos_patrimonio (
    id                  BIGSERIAL   PRIMARY KEY,
    politico_id         TEXT        NOT NULL REFERENCES politicos(politico_id),
    anio_declaracion    INTEGER     NOT NULL,
    tipo_declaracion    TEXT,
    bienes_inmuebles    NUMERIC(14,2),
    depositos_cuentas   NUMERIC(14,2),
    valores_mobiliarios NUMERIC(14,2),
    otros_activos       NUMERIC(14,2),
    total_activos       NUMERIC(14,2),
    prestamos           NUMERIC(14,2),
    total_pasivos       NUMERIC(14,2),
    ingresos_cargo      NUMERIC(12,2),
    otros_ingresos      NUMERIC(12,2),
    url_declaracion     TEXT,
    fecha_ingesta       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (politico_id, anio_declaracion, tipo_declaracion)
);

-- ══════════════════════════════════════════════════════════════
-- TABLA: votos parlamentarios del político (para diputados)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS politicos_votos (
    id              BIGSERIAL   PRIMARY KEY,
    politico_id     TEXT        NOT NULL REFERENCES politicos(politico_id),
    fecha_votacion  DATE        NOT NULL,
    titulo_votacion TEXT        NOT NULL,
    resultado_voto  TEXT        NOT NULL,  -- "si"|"no"|"abstención"|"ausente"
    resultado_final TEXT,
    url_votacion    TEXT,
    UNIQUE (politico_id, fecha_votacion, titulo_votacion)
);

-- ══════════════════════════════════════════════════════════════
-- TABLA: noticias vinculadas al político
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS politicos_noticias (
    politico_id     TEXT    NOT NULL REFERENCES politicos(politico_id),
    noticia_url     TEXT    NOT NULL,
    fecha_pub       DATE,
    relevancia      REAL    DEFAULT 1.0,
    PRIMARY KEY (politico_id, noticia_url)
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_politicos_partido   ON politicos (partido_actual);
CREATE INDEX IF NOT EXISTS idx_trayectoria_pid     ON politicos_trayectoria (politico_id);
CREATE INDEX IF NOT EXISTS idx_trayectoria_actual  ON politicos_trayectoria (politico_id) WHERE es_cargo_actual;
CREATE INDEX IF NOT EXISTS idx_patrimonio_pid      ON politicos_patrimonio (politico_id, anio_declaracion DESC);
CREATE INDEX IF NOT EXISTS idx_votos_pid_fecha     ON politicos_votos (politico_id, fecha_votacion DESC);
CREATE INDEX IF NOT EXISTS idx_pnoticias_pid_fecha ON politicos_noticias (politico_id, fecha_pub DESC);
