-- ElectSim España — Migración 0008: Noticias, Índices Politeia, Congreso
-- Ejecutar: psql postgresql://electsim:electsim@localhost:5432/electsim_espana -f db/migrations/0008_nuevas_tablas.sql

-- ── Noticias de prensa (RSS + scrapers) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS noticias_prensa (
    id                  BIGSERIAL PRIMARY KEY,
    fuente              VARCHAR(100) NOT NULL,
    titular             TEXT NOT NULL,
    subtitular          TEXT,
    url                 TEXT UNIQUE NOT NULL,
    fecha_publicacion   DATE,
    fecha_scraping      TIMESTAMP DEFAULT NOW(),
    categoria           VARCHAR(100),
    partidos_mencionados TEXT,
    sentimiento_score   NUMERIC(5,4),
    sentimiento_label   VARCHAR(20),
    temas_json          TEXT,
    relevancia_score    NUMERIC(5,4),
    resumen             TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- ── Sentimiento prensa diario por entidad ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sentimiento_prensa_diario (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    entidad         VARCHAR(100) NOT NULL,
    tipo_entidad    VARCHAR(30),
    n_noticias      INTEGER DEFAULT 0,
    sentimiento_medio NUMERIC(5,4),
    pct_positivo    NUMERIC(5,2),
    pct_negativo    NUMERIC(5,2),
    pct_neutro      NUMERIC(5,2),
    fuentes_json    TEXT,
    temas_top_json  TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, entidad)
);

-- ── Agenda mediática (temas trending) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda_mediatica (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    tema            VARCHAR(200) NOT NULL,
    n_noticias      INTEGER DEFAULT 0,
    tendencia       VARCHAR(20),
    partidos_relacionados TEXT,
    sentimiento_medio NUMERIC(5,4),
    peso_agenda     NUMERIC(5,4),
    categoria       VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, tema)
);

-- ── Índices Politeia propios ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indices_politeia (
    id              SERIAL PRIMARY KEY,
    fecha_calculo   DATE NOT NULL,
    indice_codigo   VARCHAR(20) NOT NULL,
    indice_nombre   VARCHAR(200) NOT NULL,
    valor           NUMERIC(7,4),
    valor_raw       NUMERIC(10,4),
    semaforo        VARCHAR(20),
    variacion_7d    NUMERIC(6,3),
    variacion_30d   NUMERIC(6,3),
    componentes_json TEXT,
    interpretacion  TEXT,
    metodologia     TEXT,
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha_calculo, indice_codigo)
);

-- ── Actividad del Congreso de los Diputados ──────────────────────────────────
CREATE TABLE IF NOT EXISTS actividad_congreso (
    id              SERIAL PRIMARY KEY,
    legislatura     SMALLINT,
    fecha           DATE,
    partido_siglas  VARCHAR(30),
    tipo_acto       VARCHAR(80),
    titulo          TEXT,
    resultado       VARCHAR(50),
    url_congreso    TEXT,
    n_firmantes     INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── Stats legislativas agregadas por partido/periodo ─────────────────────────
CREATE TABLE IF NOT EXISTS stats_legislativas (
    id              SERIAL PRIMARY KEY,
    legislatura     SMALLINT,
    partido_siglas  VARCHAR(30),
    periodo         VARCHAR(10),
    n_proposiciones INTEGER DEFAULT 0,
    n_preguntas_orales INTEGER DEFAULT 0,
    n_preguntas_escritas INTEGER DEFAULT 0,
    n_enmiendas     INTEGER DEFAULT 0,
    n_interpelaciones INTEGER DEFAULT 0,
    n_mociones      INTEGER DEFAULT 0,
    tasa_exito_pct  NUMERIC(5,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(legislatura, partido_siglas, periodo)
);

-- ── Indicadores sociales extendidos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indicadores_sociales (
    id              SERIAL PRIMARY KEY,
    indicador       VARCHAR(200) NOT NULL,
    codigo_ine      VARCHAR(50),
    valor           NUMERIC(12,4),
    unidad          VARCHAR(50),
    fecha           DATE NOT NULL,
    ccaa_id         INTEGER,
    fuente          VARCHAR(100),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(indicador, fecha, ccaa_id)
);

-- ── Encuestas tracking (scraped from press) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS encuestas_tracking (
    id              SERIAL PRIMARY KEY,
    url_fuente      TEXT UNIQUE NOT NULL,
    titular         TEXT,
    casa_encuestadora VARCHAR(100),
    fecha_publicacion DATE,
    n_entrevistas   INTEGER,
    partido_datos_json TEXT,
    confianza_parseo NUMERIC(4,3),
    procesada       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- ── Índices económico-corporativos ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datos_ibex_empresas (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    ticker          VARCHAR(10) NOT NULL,
    empresa         VARCHAR(100),
    sector          VARCHAR(100),
    cotizacion      NUMERIC(10,4),
    variacion_pct   NUMERIC(6,3),
    volumen         BIGINT,
    market_cap_M    NUMERIC(15,2),
    per             NUMERIC(8,2),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, ticker)
);

-- ── Índices de confianza del consumidor / empresarial ────────────────────────
CREATE TABLE IF NOT EXISTS indices_confianza (
    id              SERIAL PRIMARY KEY,
    fecha           DATE NOT NULL,
    indice          VARCHAR(100) NOT NULL,
    valor           NUMERIC(8,3),
    variacion_mensual NUMERIC(6,3),
    fuente          VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE(fecha, indice)
);
