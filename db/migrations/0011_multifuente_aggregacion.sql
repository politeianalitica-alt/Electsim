-- ElectSim España — Migración 0011: Agregación multi-fuente ponderada por accuracy histórica.
-- Ejecutar: psql $DATABASE_URL -f db/migrations/0011_multifuente_aggregacion.sql

-- ── Catálogo maestro de casas encuestadoras ─────────────────────────────────
CREATE TABLE IF NOT EXISTS casa_encuestadora (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) UNIQUE NOT NULL,
    nombre_normalizado  VARCHAR(100) UNIQUE,
    pais                VARCHAR(3) DEFAULT 'ESP',
    metodologia         VARCHAR(50),             -- CATI, CAWI, MIXTO, PANEL, IVR
    n_min_tipico        INTEGER,
    ambito              VARCHAR(30) DEFAULT 'nacional',  -- nacional, autonomica, municipal
    fecha_alta          DATE,
    activa              BOOLEAN DEFAULT TRUE,
    url_canonica        TEXT,
    notas               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_casa_nombre_norm ON casa_encuestadora(nombre_normalizado);

-- ── Accuracy histórica por casa y elección (backtest) ──────────────────────
CREATE TABLE IF NOT EXISTS casa_accuracy_historica (
    id                  SERIAL PRIMARY KEY,
    casa_id             INTEGER REFERENCES casa_encuestadora(id) ON DELETE CASCADE,
    eleccion_id         INTEGER REFERENCES elecciones(id) ON DELETE CASCADE,
    dias_antes          INTEGER,                 -- horizonte del campo respecto a la votación
    n_encuestas         INTEGER DEFAULT 0,
    mae_global          NUMERIC(6,3),            -- Mean Abs Error en puntos porcentuales
    rmse_global         NUMERIC(6,3),
    bias_medio          NUMERIC(6,3),            -- sesgo medio (signed) en pp
    bias_por_partido    JSONB,                   -- {"PP":+0.8,"PSOE":-0.4,...}
    sd_error            NUMERIC(6,3),            -- desviación típica de los errores
    n_partidos          INTEGER,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE(casa_id, eleccion_id, dias_antes)
);

CREATE INDEX IF NOT EXISTS idx_accuracy_casa ON casa_accuracy_historica(casa_id);
CREATE INDEX IF NOT EXISTS idx_accuracy_eleccion ON casa_accuracy_historica(eleccion_id);

-- ── Peso efectivo dinámico (recalculado tras cada elección / semana) ───────
CREATE TABLE IF NOT EXISTS casa_peso_vigente (
    casa_id             INTEGER PRIMARY KEY REFERENCES casa_encuestadora(id) ON DELETE CASCADE,
    rating              NUMERIC(4,2) DEFAULT 3.0,    -- 1..5
    mae_ewma            NUMERIC(6,3),                -- MAE con EWMA recencia
    bias_corr_json      JSONB DEFAULT '{}'::jsonb,   -- sesgo corriente por partido
    decay_half_life     INTEGER DEFAULT 14,          -- días
    n_elecciones_bt     INTEGER DEFAULT 0,
    metodo              VARCHAR(40) DEFAULT 'backtest_v1',
    last_updated        TIMESTAMP DEFAULT NOW()
);

-- ── Metadatos de fuente macro (accuracy ≠ encuestas: latencia vs. revisión)─
CREATE TABLE IF NOT EXISTS fuente_macro (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(40) UNIQUE NOT NULL,  -- INE_EPA, BDE_TIPOS, EUROSTAT_PIB, OCDE_MEI
    proveedor           VARCHAR(60),
    dataset             VARCHAR(120),
    categoria           VARCHAR(30),                  -- MACRO, MERCADO, SOCIAL, ENERGIA
    frecuencia          VARCHAR(20),                  -- DIARIA, SEMANAL, MENSUAL, TRIMESTRAL
    latencia_dias       INTEGER,                      -- demora típica respecto al hecho
    volatilidad_revision NUMERIC(5,3),                -- MAE revisiones vs. final
    peso_base           NUMERIC(4,2) DEFAULT 1.0,
    url_endpoint        TEXT,
    activa              BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT NOW()
);

-- ── Trazabilidad: fuentes que contribuyeron a cada estimación ──────────────
CREATE TABLE IF NOT EXISTS estimacion_fuente_peso (
    id                  BIGSERIAL PRIMARY KEY,
    estimacion_id       BIGINT NOT NULL,             -- FK lógica a estimaciones_voto_agregadas.id
    run_id              UUID,
    fuente_tipo         VARCHAR(20) NOT NULL,        -- ENCUESTA, MICRODATO, MACRO, PRENSA
    fuente_id           BIGINT,                       -- id interno según tabla origen
    fuente_label        VARCHAR(120),
    peso_efectivo       NUMERIC(10,4),
    contribucion_pct    NUMERIC(6,3),
    fecha_dato          DATE,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_est_fuente_runid ON estimacion_fuente_peso(run_id);
CREATE INDEX IF NOT EXISTS idx_est_fuente_estimacion ON estimacion_fuente_peso(estimacion_id);

-- ── Enriquecer estimaciones_voto_agregadas con run_id y calidad ────────────
ALTER TABLE estimaciones_voto_agregadas
    ADD COLUMN IF NOT EXISTS run_id UUID,
    ADD COLUMN IF NOT EXISTS cobertura_pct NUMERIC(5,2),        -- % casas con dato <7d
    ADD COLUMN IF NOT EXISTS consenso_sd NUMERIC(6,3),           -- SD entre fuentes
    ADD COLUMN IF NOT EXISTS confianza_modelo NUMERIC(5,3),      -- 0..1, inverso σ posterior
    ADD COLUMN IF NOT EXISTS n_fuentes_usadas INTEGER,
    ADD COLUMN IF NOT EXISTS tipos_fuente_json JSONB;

-- Borrar la constraint antigua y permitir que distintos runs coexistan
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_estimaciones_voto_fecha_partido_modelo'
    ) THEN
        ALTER TABLE estimaciones_voto_agregadas
            DROP CONSTRAINT uq_estimaciones_voto_fecha_partido_modelo;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_estimaciones_runid_partido
    ON estimaciones_voto_agregadas(run_id, partido_id)
    WHERE run_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_estimaciones_fecha_partido_modelo_runnull
    ON estimaciones_voto_agregadas(fecha_estimacion, partido_id, modelo)
    WHERE run_id IS NULL;

-- ── Vista última estimación multi-fuente por partido ───────────────────────
CREATE OR REPLACE VIEW v_nowcasting_multifuente AS
SELECT DISTINCT ON (p.siglas)
    p.siglas                  AS partido_siglas,
    p.nombre_completo         AS partido_nombre,
    e.estimacion_pct,
    e.ic_95_inf,
    e.ic_95_sup,
    e.n_encuestas,
    e.n_fuentes_usadas,
    e.cobertura_pct,
    e.consenso_sd,
    e.confianza_modelo,
    e.tipos_fuente_json,
    e.fecha_estimacion        AS fecha_calculo,
    e.modelo,
    e.run_id
FROM estimaciones_voto_agregadas e
JOIN partidos p ON p.id = e.partido_id
WHERE e.modelo IN ('bayes_multifuente_v1', 'agregador_ponderado')
ORDER BY p.siglas, e.fecha_estimacion DESC, e.created_at DESC;

-- ── Vista calidad global del último run ────────────────────────────────────
CREATE OR REPLACE VIEW v_nowcasting_calidad AS
SELECT
    run_id,
    fecha_estimacion,
    modelo,
    COUNT(*) AS n_partidos,
    AVG(cobertura_pct)       AS cobertura_media,
    AVG(consenso_sd)         AS consenso_sd_medio,
    AVG(confianza_modelo)    AS confianza_media,
    MAX(n_fuentes_usadas)    AS n_fuentes_max,
    MAX(created_at)          AS created_at
FROM estimaciones_voto_agregadas
WHERE run_id IS NOT NULL
GROUP BY run_id, fecha_estimacion, modelo
ORDER BY created_at DESC;

-- ── Vista cobertura de casas en los últimos N días ─────────────────────────
CREATE OR REPLACE VIEW v_casas_cobertura_reciente AS
SELECT
    ce.id                     AS casa_id,
    ce.nombre                 AS casa_nombre,
    ce.activa,
    cpv.rating,
    cpv.mae_ewma,
    cpv.n_elecciones_bt,
    (SELECT MAX(enc.fecha_publicacion)
       FROM encuestas enc
       JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
      WHERE fe.nombre = ce.nombre) AS ultima_fecha_encuesta,
    (SELECT COUNT(*)
       FROM encuestas enc
       JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
      WHERE fe.nombre = ce.nombre
        AND enc.fecha_publicacion >= CURRENT_DATE - INTERVAL '7 days') AS n_encuestas_7d,
    (SELECT COUNT(*)
       FROM encuestas enc
       JOIN fuentes_encuesta fe ON enc.fuente_id = fe.id
      WHERE fe.nombre = ce.nombre
        AND enc.fecha_publicacion >= CURRENT_DATE - INTERVAL '30 days') AS n_encuestas_30d
FROM casa_encuestadora ce
LEFT JOIN casa_peso_vigente cpv ON cpv.casa_id = ce.id
WHERE ce.activa = TRUE
ORDER BY cpv.rating DESC NULLS LAST;
