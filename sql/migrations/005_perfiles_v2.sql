-- ══════════════════════════════════════════════════════════════
-- PERFIL PRINCIPAL (ampliado respecto a la versión anterior)
-- ══════════════════════════════════════════════════════════════
ALTER TABLE perfiles_votante
    ADD COLUMN IF NOT EXISTS nombre_perfil        TEXT,
    ADD COLUMN IF NOT EXISTS color                TEXT DEFAULT '#666666',
    ADD COLUMN IF NOT EXISTS tipo_perfil          TEXT    DEFAULT 'predefinido',  -- 'predefinido'|'personalizado'|'lca'
    ADD COLUMN IF NOT EXISTS fuente_datos         TEXT    DEFAULT 'sintetico',    -- 'sintetico'|'microdatos_cis'|'microdatos_propio'
    ADD COLUMN IF NOT EXISTS n_respondentes       INTEGER,
    ADD COLUMN IF NOT EXISTS confianza_perfil     REAL,        -- 0-1: qué fracción del subconjunto encaja bien
    ADD COLUMN IF NOT EXISTS cohorte_generacional TEXT,        -- 'GenZ'|'Millennial'|'GenX'|'Boomer'|'Silent'
    ADD COLUMN IF NOT EXISTS habitat_dominante    TEXT,        -- 'Rural'|'Semirural'|'Urbano'|'GranUrbe'
    ADD COLUMN IF NOT EXISTS clase_social_modal   TEXT,
    ADD COLUMN IF NOT EXISTS estudios_modal       TEXT,
    ADD COLUMN IF NOT EXISTS situacion_laboral_modal TEXT,
    -- Ejes valoricos agregados (media ponderada del subconjunto)
    ADD COLUMN IF NOT EXISTS eje_redistribucion   REAL,        -- 1=max privado, 10=max público
    ADD COLUMN IF NOT EXISTS eje_inmigracion      REAL,        -- 1=aperturista, 10=restrictivo
    ADD COLUMN IF NOT EXISTS eje_territorial      REAL,        -- 1=centralista, 10=autonomista/independentista
    ADD COLUMN IF NOT EXISTS eje_valores          REAL,        -- 1=progresista, 10=conservador
    ADD COLUMN IF NOT EXISTS satisfaccion_demo_media REAL,     -- 1-4
    ADD COLUMN IF NOT EXISTS confianza_partidos_media REAL,    -- 0-10
    ADD COLUMN IF NOT EXISTS interes_politica_media REAL,      -- 1-4
    -- Situación económica subjetiva
    ADD COLUMN IF NOT EXISTS eco_personal_media   REAL,        -- 1=muy mala, 5=muy buena
    ADD COLUMN IF NOT EXISTS eco_espana_media     REAL,
    ADD COLUMN IF NOT EXISTS pct_pesimistas_eco   REAL,        -- % que cree que irá peor
    -- Microdatos económicos (cruzados con datos estructurales de INE/Eurostat por perfil sociodemográfico)
    ADD COLUMN IF NOT EXISTS renta_media_anual    NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pct_alquiler         REAL,
    ADD COLUMN IF NOT EXISTS pct_paro             REAL,
    ADD COLUMN IF NOT EXISTS tasa_emancipacion    REAL,        -- % emancipados <35 en el segmento
    ADD COLUMN IF NOT EXISTS version_modelo       TEXT    DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS fecha_calculo        TIMESTAMPTZ DEFAULT NOW();

-- Compatibilidad con schema legacy (label -> nombre_perfil)
UPDATE perfiles_votante
SET nombre_perfil = COALESCE(nombre_perfil, label)
WHERE nombre_perfil IS NULL;

-- ══════════════════════════════════════════════════════════════
-- DISTRIBUCIÓN DE PROBLEMAS PRINCIPALES POR PERFIL
-- (desnormaliza el JSON actual en tabla propia para queries eficientes)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS perfil_problemas (
    cluster_id      INTEGER NOT NULL,
    problema        TEXT    NOT NULL,
    pct             REAL    NOT NULL,   -- porcentaje ponderado en ese subconjunto
    ranking         INTEGER,            -- posición 1=más citado
    PRIMARY KEY (cluster_id, problema)
);

-- ══════════════════════════════════════════════════════════════
-- DISTRIBUCIÓN GEOGRÁFICA POR PERFIL (desnormalizada)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS perfil_ccaa (
    cluster_id  INTEGER NOT NULL,
    ccaa        TEXT    NOT NULL,
    pct         REAL    NOT NULL,
    PRIMARY KEY (cluster_id, ccaa)
);

-- ══════════════════════════════════════════════════════════════
-- DISTRIBUCIÓN DE VOTO POR PERFIL (desnormalizada, por partido)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS perfil_voto (
    cluster_id  INTEGER NOT NULL,
    partido     TEXT    NOT NULL,
    pct_intencion REAL,     -- intención de voto actual
    pct_recuerdo  REAL,     -- recuerdo de voto (elección anterior)
    PRIMARY KEY (cluster_id, partido)
);

-- ══════════════════════════════════════════════════════════════
-- EJES IDEOLÓGICOS POR PERFIL (distribución, no sólo media)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS perfil_ejes (
    cluster_id  INTEGER NOT NULL,
    eje         TEXT    NOT NULL,   -- 'ideologia'|'redistribucion'|'inmigracion'|'territorial'|'valores'
    media       REAL,
    mediana     REAL,
    sd          REAL,
    pct_izq     REAL,   -- % en posiciones 1-4
    pct_centro  REAL,   -- % en posiciones 5-6
    pct_der     REAL,   -- % en posiciones 7-10
    PRIMARY KEY (cluster_id, eje)
);

-- ══════════════════════════════════════════════════════════════
-- PERFILES PERSONALIZADOS GUARDADOS POR USUARIO
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS perfiles_personalizados (
    perfil_id       BIGSERIAL   PRIMARY KEY,
    usuario         TEXT        NOT NULL DEFAULT 'default',
    nombre          TEXT        NOT NULL,
    notas           TEXT,
    -- Filtros aplicados (guardamos exactamente lo que el usuario seleccionó)
    filtros_json    JSONB       NOT NULL DEFAULT '{}',
    -- Resultados calculados del subconjunto de microdatos
    n_respondentes  INTEGER,
    pct_poblacion   REAL,               -- peso poblacional estimado
    resultado_json  JSONB,              -- snapshot completo del análisis
    -- Similitud con perfiles predefinidos (top 3)
    cluster_mas_cercano INTEGER,
    similitud_cluster   REAL,           -- cosine similarity 0-1
    -- Timestamps
    creado_en       TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario, nombre)
);

-- ══════════════════════════════════════════════════════════════
-- ÍNDICES
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_perfil_problemas_cluster ON perfil_problemas (cluster_id, ranking);
CREATE INDEX IF NOT EXISTS idx_perfil_voto_cluster      ON perfil_voto (cluster_id);
CREATE INDEX IF NOT EXISTS idx_perfil_ccaa_cluster      ON perfil_ccaa (cluster_id);
CREATE INDEX IF NOT EXISTS idx_perfil_ejes_cluster      ON perfil_ejes (cluster_id);
CREATE INDEX IF NOT EXISTS idx_pp_usuario               ON perfiles_personalizados (usuario, actualizado_en DESC);
