-- 0010_microdatos_pipeline.sql
-- Tablas soporte para microdatos propios, cohortes y pool IA.

CREATE TABLE IF NOT EXISTS microdatos_cis_raw (
  id BIGSERIAL PRIMARY KEY,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE SET NULL,
  source_file TEXT NOT NULL,
  dataset_grupo TEXT,
  row_hash VARCHAR(40) NOT NULL,
  payload_json JSONB NOT NULL,
  source_labels JSONB,
  has_vote BOOLEAN DEFAULT FALSE,
  has_ideology BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_file, row_hash)
);

CREATE TABLE IF NOT EXISTS microdatos_cohortes (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(32) NOT NULL,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
  cohorte_key TEXT NOT NULL,
  sexo CHAR(1),
  grupo_edad VARCHAR(20),
  estudios VARCHAR(80),
  sitlab VARCHAR(80),
  clase_subjetiva VARCHAR(40),
  ccaa VARCHAR(80),
  ideologia_tramo VARCHAR(20),
  recuerdo_voto VARCHAR(80),
  cercania VARCHAR(80),
  n_obs INTEGER NOT NULL,
  peso_total NUMERIC(14,4) NOT NULL,
  ideologia_media NUMERIC(6,3),
  voto_dist_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(run_id, encuesta_id, cohorte_key)
);

CREATE INDEX IF NOT EXISTS idx_microdatos_cohortes_run_id ON microdatos_cohortes(run_id);
CREATE INDEX IF NOT EXISTS idx_microdatos_cohortes_encuesta_id ON microdatos_cohortes(encuesta_id);

CREATE TABLE IF NOT EXISTS microdatos_asociaciones (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(32) NOT NULL,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
  predictor VARCHAR(80) NOT NULL,
  target VARCHAR(80) DEFAULT 'INTENCIONG',
  n_obs INTEGER NOT NULL,
  chi2 NUMERIC(18,4),
  cramers_v NUMERIC(10,6),
  n_levels_pred INTEGER,
  n_levels_target INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_microdatos_asociaciones_run_id ON microdatos_asociaciones(run_id);

CREATE TABLE IF NOT EXISTS microdatos_ai_pool (
  id BIGSERIAL PRIMARY KEY,
  run_id VARCHAR(32) NOT NULL,
  encuesta_id INTEGER REFERENCES encuestas(id) ON DELETE CASCADE,
  respondent_hash VARCHAR(40) NOT NULL,
  cohorte_key TEXT,
  prompt_perfil TEXT NOT NULL,
  label_voto VARCHAR(80),
  escala_ideologica NUMERIC(4,1),
  peso NUMERIC(12,4),
  metadata_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(encuesta_id, respondent_hash)
);

CREATE INDEX IF NOT EXISTS idx_microdatos_ai_pool_run_id ON microdatos_ai_pool(run_id);

CREATE TABLE IF NOT EXISTS perfil_usuario_custom (
  id SERIAL PRIMARY KEY,
  usuario_id VARCHAR(80) NOT NULL DEFAULT 'default',
  nombre_perfil VARCHAR(120) NOT NULL,
  sexo CHAR(1),
  edad INTEGER,
  estudios VARCHAR(80),
  sitlab VARCHAR(80),
  clasesub VARCHAR(40),
  ccaa VARCHAR(80),
  escideol NUMERIC(4,1),
  cercania VARCHAR(80),
  recuerdo VARCHAR(80),
  p12 VARCHAR(40),
  p13 VARCHAR(40),
  valor_lider_1 NUMERIC(4,1),
  valor_lider_2 NUMERIC(4,1),
  valor_lider_3 NUMERIC(4,1),
  valor_lider_4 NUMERIC(4,1),
  valor_lider_5 NUMERIC(4,1),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, nombre_perfil)
);
