-- ElectSim — Tabla de usuarios para autenticación web
-- Ejecutar después de 01_schema.sql

CREATE TABLE IF NOT EXISTS usuarios (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nombre        TEXT,
    rol           TEXT NOT NULL DEFAULT 'viewer'
                    CHECK (rol IN ('viewer', 'analyst', 'admin')),
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- Trigger: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION _set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS usuarios_updated_at ON usuarios;
CREATE TRIGGER usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION _set_updated_at();

-- Usuario admin por defecto  (contraseña: "changeme" — CAMBIAR en producción)
-- Hash generado con: python -c "from passlib.context import CryptContext; print(CryptContext(['bcrypt']).hash('changeme'))"
INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES (
    'admin@electsim.es',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
    'Administrador',
    'admin'
) ON CONFLICT (email) DO NOTHING;
