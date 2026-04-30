-- ElectSim España — Schema sin TimescaleDB (PostgreSQL estándar)
-- Este fichero se ejecuta automáticamente al crear el contenedor.

-- Ignorar el CREATE EXTENSION timescaledb si no está instalado
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS timescaledb;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TimescaleDB no disponible, continuando sin ella';
END $$;
