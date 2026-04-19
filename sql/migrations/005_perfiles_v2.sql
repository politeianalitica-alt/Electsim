-- ══════════════════════════════════════════════════════════════
-- 005_perfiles_v2.sql — Schema ampliado para perfiles electorales
-- Idempotente: se puede ejecutar múltiples veces.
-- ══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'perfiles_votante_pkey'
          AND conrelid = 'perfiles_votante'::regclass
    ) THEN
        DELETE FROM perfiles_votante a
        USING perfiles_votante b
        WHERE a.ctid < b.ctid
          AND a.cluster_id = b.cluster_id;

        ALTER TABLE perfiles_votante ADD PRIMARY KEY (cluster_id);
    END IF;
EXCEPTION WHEN undefined_table THEN
    CREATE TABLE perfiles_votante (
        cluster_id              INTEGER PRIMARY KEY,
        label                   TEXT,
        nombre_perfil           TEXT NOT NULL,
        color                   TEXT DEFAULT '#6B7280',
        ideologia_media         REAL,
        edad_media              REAL,
        peso_demografico_pct    REAL,
        descripcion_perfil_llm  TEXT,
        distribucion_voto_json  JSONB,
        tipo_perfil             TEXT DEFAULT 'predefinido',
        fuente_datos            TEXT DEFAULT 'sintetico',
        version_modelo          TEXT DEFAULT 'v1',
        fecha_calculo           TIMESTAMPTZ DEFAULT NOW()
    );
END $$;

ALTER TABLE perfiles_votante
    ADD COLUMN IF NOT EXISTS label                      TEXT,
    ADD COLUMN IF NOT EXISTS nombre_perfil              TEXT,
    ADD COLUMN IF NOT EXISTS color                      TEXT DEFAULT '#6B7280',
    ADD COLUMN IF NOT EXISTS tipo_perfil                TEXT DEFAULT 'predefinido',
    ADD COLUMN IF NOT EXISTS fuente_datos               TEXT DEFAULT 'sintetico',
    ADD COLUMN IF NOT EXISTS n_respondentes             INTEGER,
    ADD COLUMN IF NOT EXISTS confianza_perfil           REAL,
    ADD COLUMN IF NOT EXISTS cohorte_generacional       TEXT,
    ADD COLUMN IF NOT EXISTS habitat_dominante          TEXT,
    ADD COLUMN IF NOT EXISTS clase_social_modal         TEXT,
    ADD COLUMN IF NOT EXISTS estudios_modal             TEXT,
    ADD COLUMN IF NOT EXISTS situacion_laboral_modal    TEXT,
    ADD COLUMN IF NOT EXISTS eje_redistribucion         REAL,
    ADD COLUMN IF NOT EXISTS eje_inmigracion            REAL,
    ADD COLUMN IF NOT EXISTS eje_territorial            REAL,
    ADD COLUMN IF NOT EXISTS eje_valores                REAL,
    ADD COLUMN IF NOT EXISTS satisfaccion_demo_media    REAL,
    ADD COLUMN IF NOT EXISTS confianza_partidos_media   REAL,
    ADD COLUMN IF NOT EXISTS interes_politica_media     REAL,
    ADD COLUMN IF NOT EXISTS eco_personal_media         REAL,
    ADD COLUMN IF NOT EXISTS eco_espana_media           REAL,
    ADD COLUMN IF NOT EXISTS pct_pesimistas_eco         REAL,
    ADD COLUMN IF NOT EXISTS renta_media_anual          NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS pct_alquiler               REAL,
    ADD COLUMN IF NOT EXISTS pct_paro                   REAL,
    ADD COLUMN IF NOT EXISTS version_modelo             TEXT DEFAULT 'v1',
    ADD COLUMN IF NOT EXISTS fecha_calculo              TIMESTAMPTZ DEFAULT NOW();

UPDATE perfiles_votante
SET nombre_perfil = COALESCE(nombre_perfil, label, CONCAT('Perfil ', cluster_id::text))
WHERE nombre_perfil IS NULL;

UPDATE perfiles_votante
SET label = COALESCE(label, nombre_perfil)
WHERE label IS NULL;

CREATE TABLE IF NOT EXISTS perfil_problemas (
    cluster_id  INTEGER NOT NULL REFERENCES perfiles_votante(cluster_id) ON DELETE CASCADE,
    problema    TEXT    NOT NULL,
    pct         REAL    NOT NULL,
    ranking     INTEGER,
    PRIMARY KEY (cluster_id, problema)
);

CREATE TABLE IF NOT EXISTS perfil_ccaa (
    cluster_id  INTEGER NOT NULL REFERENCES perfiles_votante(cluster_id) ON DELETE CASCADE,
    ccaa        TEXT    NOT NULL,
    pct         REAL    NOT NULL,
    PRIMARY KEY (cluster_id, ccaa)
);

CREATE TABLE IF NOT EXISTS perfil_voto (
    cluster_id    INTEGER NOT NULL REFERENCES perfiles_votante(cluster_id) ON DELETE CASCADE,
    partido       TEXT    NOT NULL,
    pct_intencion REAL,
    pct_recuerdo  REAL,
    PRIMARY KEY (cluster_id, partido)
);

CREATE TABLE IF NOT EXISTS perfil_ejes (
    cluster_id  INTEGER NOT NULL REFERENCES perfiles_votante(cluster_id) ON DELETE CASCADE,
    eje         TEXT    NOT NULL,
    media       REAL,
    mediana     REAL,
    sd          REAL,
    pct_izq     REAL,
    pct_centro  REAL,
    pct_der     REAL,
    PRIMARY KEY (cluster_id, eje)
);

CREATE TABLE IF NOT EXISTS perfiles_personalizados (
    perfil_id           BIGSERIAL   PRIMARY KEY,
    usuario             TEXT        NOT NULL DEFAULT 'default',
    nombre              TEXT        NOT NULL,
    notas               TEXT,
    filtros_json        JSONB       NOT NULL DEFAULT '{}',
    n_respondentes      INTEGER,
    pct_poblacion       REAL,
    resultado_json      JSONB,
    cluster_mas_cercano INTEGER,
    similitud_cluster   REAL,
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario, nombre)
);

CREATE INDEX IF NOT EXISTS idx_perfil_problemas_rank ON perfil_problemas (cluster_id, ranking);
CREATE INDEX IF NOT EXISTS idx_perfil_voto_cluster   ON perfil_voto (cluster_id);
CREATE INDEX IF NOT EXISTS idx_perfil_ccaa_cluster   ON perfil_ccaa (cluster_id);
CREATE INDEX IF NOT EXISTS idx_perfil_ejes_cluster   ON perfil_ejes (cluster_id);
CREATE INDEX IF NOT EXISTS idx_pp_usuario            ON perfiles_personalizados (usuario, actualizado_en DESC);
