-- 0015_data_observability.sql
-- Observabilidad de ingesta y calidad de datos para dashboard.

CREATE TABLE IF NOT EXISTS etl_ingestas (
    id BIGSERIAL PRIMARY KEY,
    pipeline VARCHAR(64) NOT NULL,
    tabla_destino VARCHAR(64) NOT NULL,
    run_id UUID DEFAULT gen_random_uuid(),
    estado VARCHAR(16) NOT NULL,
    registros_nuevos INTEGER,
    registros_totales INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    error_mensaje TEXT,
    extra JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_etl_ingestas_tabla_finished
    ON etl_ingestas (tabla_destino, finished_at DESC);

CREATE INDEX IF NOT EXISTS idx_etl_ingestas_pipeline_started
    ON etl_ingestas (pipeline, started_at DESC);

CREATE TABLE IF NOT EXISTS data_quality_checks (
    id BIGSERIAL PRIMARY KEY,
    tabla VARCHAR(64) NOT NULL,
    check_name VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    detalle TEXT,
    metric_value NUMERIC,
    threshold NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_quality_tabla_created
    ON data_quality_checks (tabla, created_at DESC);

CREATE TABLE IF NOT EXISTS etl_sla (
    tabla VARCHAR(64) PRIMARY KEY,
    descripcion TEXT,
    cadencia VARCHAR(16) NOT NULL,
    max_delay_min INTEGER NOT NULL,
    owner VARCHAR(64),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO etl_sla (tabla, descripcion, cadencia, max_delay_min, owner, activo) VALUES
    ('sentimiento_prensa_diario', 'Sentimiento diario por entidad', 'daily', 1440, 'data_ops', TRUE),
    ('noticias_prensa', 'Noticias con enriquecimiento', 'hourly', 120, 'scraping', TRUE),
    ('agenda_mediatica', 'Agenda mediática agregada', 'daily', 1440, 'data_ops', TRUE),
    ('indices_politeia', 'Índices compuestos Politeia', 'daily', 1440, 'modeling', TRUE),
    ('informes_riesgo_politico', 'Informe de riesgo político', 'weekly', 10080, 'modeling', TRUE),
    ('perfiles_votante', 'Perfiles de microdatos', 'weekly', 10080, 'modeling', TRUE)
ON CONFLICT (tabla) DO NOTHING;

CREATE TABLE IF NOT EXISTS perfiles_metadata (
    fecha_calculo DATE NOT NULL,
    encuesta_origen VARCHAR(32) NOT NULL,
    version_modelo VARCHAR(32) NOT NULL,
    n_clusters INTEGER,
    features_json JSONB DEFAULT '{}'::jsonb,
    n_entrevistas INTEGER,
    tasa_respuesta NUMERIC,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (fecha_calculo, encuesta_origen, version_modelo)
);
