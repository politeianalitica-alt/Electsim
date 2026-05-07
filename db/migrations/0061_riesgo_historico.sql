-- Migración 0061: tabla riesgo_historico para snapshots del Politeia Risk Index
--
-- Almacena el score compuesto y los componentes calculados, con soporte
-- multi-tenant (workspace_id). Si TimescaleDB está disponible, se crea como
-- hypertable particionada por fecha para queries eficientes en series largas.

CREATE TABLE IF NOT EXISTS riesgo_historico (
    fecha        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score        FLOAT NOT NULL CHECK (score BETWEEN 0 AND 100),
    banda        TEXT NOT NULL,
    confianza    FLOAT NOT NULL DEFAULT 1.0,
    componentes  JSONB NOT NULL DEFAULT '{}'::jsonb,
    workspace_id TEXT NOT NULL DEFAULT 'default',
    PRIMARY KEY (fecha, workspace_id)
);

CREATE INDEX IF NOT EXISTS idx_riesgo_historico_workspace_fecha
  ON riesgo_historico (workspace_id, fecha DESC);

-- Hypertable de TimescaleDB (sólo si la extensión está disponible)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('riesgo_historico', 'fecha',
                                   if_not_exists => TRUE,
                                   migrate_data => TRUE);
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END$$;

-- Sembrar 14 días de historial sintético si la tabla está vacía
INSERT INTO riesgo_historico (fecha, score, banda, confianza, componentes, workspace_id)
SELECT
    NOW() - (n || ' days')::interval,
    25.0 + (n % 7) * 2.5,
    CASE WHEN 25.0 + (n % 7) * 2.5 >= 60 THEN 'Elevado'
         WHEN 25.0 + (n % 7) * 2.5 >= 40 THEN 'Moderado'
         WHEN 25.0 + (n % 7) * 2.5 >= 20 THEN 'Bajo'
         ELSE 'Mínimo'
    END,
    0.7,
    '{"seed": true}'::jsonb,
    'default'
FROM generate_series(0, 13) AS n
WHERE NOT EXISTS (SELECT 1 FROM riesgo_historico WHERE workspace_id = 'default')
ON CONFLICT (fecha, workspace_id) DO NOTHING;
